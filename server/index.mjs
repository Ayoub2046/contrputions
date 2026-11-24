import { createServer } from 'http'
import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env')

let fileEnv = {}
if (existsSync(envPath)) {
  try {
    fileEnv = Object.fromEntries(
      readFileSync(envPath, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map((l) => {
          const i = l.indexOf('=')
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
        }),
    )
  } catch (err) {
    console.warn('Could not read .env file:', err.message)
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || fileEnv.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SECRET_KEY
const AUTH_DOMAIN = 'classbank.local'

const AUTH_URL = `${SUPABASE_URL}/auth/v1/admin`
const port = Number(process.env.ADMIN_API_PORT || fileEnv.ADMIN_API_PORT) || 3001

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

async function verifyAdminAuth(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized: Missing bearer authentication token' }
  }

  const token = authHeader.slice(7).trim()

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SERVICE_ROLE_KEY,
    },
  })

  if (!userRes.ok) {
    return { ok: false, status: 401, error: 'Unauthorized: Invalid or expired session' }
  }

  const callerAuth = await userRes.json()

  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${callerAuth.id}&select=role,class_id`, {
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
  })

  if (!profileRes.ok) {
    return { ok: false, status: 403, error: 'Forbidden: Profile not found' }
  }

  const profiles = await profileRes.json()
  const callerProfile = profiles?.[0]

  if (!callerProfile || (callerProfile.role !== 'super_admin' && callerProfile.role !== 'admin')) {
    return { ok: false, status: 403, error: 'Forbidden: Insufficient privileges (Admin role required)' }
  }

  return { ok: true, caller: callerProfile, callerId: callerAuth.id }
}

async function fetchAdmin(method, path, body) {
  const url = `${AUTH_URL}${path}`
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch(url, opts)
  const data = await r.json()
  return { status: r.status, data }
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url, `http://localhost:${port}`)
  const path = url.pathname

  try {
    if (path.startsWith('/api/users')) {
      const auth = await verifyAdminAuth(req)
      if (!auth.ok) {
        return json(res, auth.status, { error: auth.error })
      }

      if (req.method === 'POST') {
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', async () => {
          const parsed = JSON.parse(body)

          // Batch import support
          if (Array.isArray(parsed.students)) {
            const results = []
            const errors = []
            const targetClassId = parsed.class_id || auth.caller.class_id || null

            for (let i = 0; i < parsed.students.length; i++) {
              const item = parsed.students[i]
              const { student_id, name, password, phone } = item
              if (!student_id || !name) {
                errors.push(`Row ${i + 1}: Missing student_id or name`)
                continue
              }

              const cleanId = String(student_id).trim()
              const cleanName = String(name).trim()
              const rawPassword = password && String(password).trim() ? String(password).trim() : cleanId
              let finalPassword = rawPassword
              if (finalPassword.length < 6) finalPassword = finalPassword.padEnd(6, '0')
              const email = `${cleanId}@${AUTH_DOMAIN}`

              const r = await fetchAdmin('POST', '/users', {
                email,
                password: finalPassword,
                email_confirm: true,
              })

              if (r.status !== 200) {
                errors.push(`Row ${i + 1} (${cleanId}): ${r.data?.msg || r.data?.message || 'Failed to create user'}`)
                continue
              }

              const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                  apikey: SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json',
                  Prefer: 'return=minimal',
                },
                body: JSON.stringify({
                  id: r.data.id,
                  student_id: cleanId,
                  name: cleanName,
                  phone: phone ? String(phone).trim() : null,
                  role: 'student',
                  class_id: targetClassId,
                }),
              })

              if (!pr.ok) {
                const pErr = await pr.json().catch(() => ({}))
                await fetchAdmin('DELETE', `/users/${r.data.id}`)
                errors.push(`Row ${i + 1} (${cleanId}): ${pErr.message || 'Failed to create profile'}`)
              } else {
                results.push({ id: r.data.id, student_id: cleanId, name: cleanName })
              }
            }
            return json(res, 200, { ok: true, createdCount: results.length, errors })
          }

          const { student_id, name, password, class_id, role, phone } = parsed
          const targetRole = role || 'student'

          if (auth.caller.role !== 'super_admin' && targetRole !== 'student') {
            return json(res, 403, { error: 'Forbidden: Only Super Admins can create administrative accounts' })
          }

          const targetClassId = class_id || auth.caller.class_id || null
          const email = `${student_id}@${AUTH_DOMAIN}`

          const r = await fetchAdmin('POST', '/users', {
            email,
            password,
            email_confirm: true,
          })
          if (r.status !== 200) return json(res, 400, { error: r.data.msg || 'Failed to create user' })

          const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              apikey: SERVICE_ROLE_KEY,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              id: r.data.id,
              student_id,
              name,
              phone: phone || null,
              role: targetRole,
              class_id: targetClassId,
            }),
          })

          if (!pr.ok) {
            const pErr = await pr.json().catch(() => ({}))
            await fetchAdmin('DELETE', `/users/${r.data.id}`)
            return json(res, 400, { error: pErr.message || 'Failed to create profile' })
          }

          json(res, 201, { id: r.data.id })
        })
      } else if (req.method === 'DELETE') {
        const id = url.searchParams.get('id') || path.slice(11)
        if (!id) return json(res, 400, { error: 'Missing user id' })

        if (auth.caller.role !== 'super_admin') {
          const targetCheck = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=role`, {
            headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
          })
          const target = (await targetCheck.json())?.[0]
          if (target && target.role !== 'student') {
            return json(res, 403, { error: 'Forbidden: Admins can only remove student accounts' })
          }
        }

        await fetchAdmin('DELETE', `/users/${id}`)
        json(res, 200, { ok: true })
      } else {
        json(res, 405, { error: 'Method not allowed' })
      }
    } else if (req.method === 'POST' && path === '/api/chat') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', async () => {
        const { question, context } = JSON.parse(body)
        const openRouterKey = process.env.OPENROUTER_API_KEY || fileEnv.OPENROUTER_API_KEY
        if (!openRouterKey) {
          return json(res, 500, { error: 'OPENROUTER_API_KEY is not configured' })
        }

        const systemPrompt = 'You are a class contribution assistant. Answer questions using the provided class data. Be concise and use USD formatting. If the data doesn\'t contain the answer, say so.'
        const userPrompt = `Class data:\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${question}`

        try {
          const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              max_tokens: 512,
            }),
          })
          const data = await r.json()
          const answer = data.choices?.[0]?.message?.content ?? 'No response'
          json(res, 200, { answer })
        } catch (e) {
          json(res, 500, { error: e.message })
        }
      })
    } else {
      json(res, 404, { error: 'Not found' })
    }
  } catch (e) {
    json(res, 500, { error: e.message })
  }
})

server.listen(port, () => {
  console.log(`Admin API server running on http://localhost:${port}`)
})
