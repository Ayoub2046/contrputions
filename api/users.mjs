const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
const AUTH_DOMAIN = 'classbank.local'

async function verifyAdminAuth(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized: Missing bearer authentication token' }
  }

  const token = authHeader.slice(7).trim()

  // 1. Verify token with Supabase Auth
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

  // 2. Fetch caller's profile role from PostgreSQL
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

function normalizeAuthPassword(sid, pwd) {
  const p = (pwd || sid || '').trim()
  if (p.length < 6) return p.padEnd(6, '0')
  return p
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(204).end()

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error: Missing Supabase environment variables' })
  }

  // Enforce security verification on all requests
  const auth = await verifyAdminAuth(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  try {
    if (req.method === 'POST') {
      const body = req.body || {}

      // Batch import support for CSV
      if (Array.isArray(body.students)) {
        const results = []
        const errors = []
        const targetClassId = body.class_id || auth.caller.class_id || null

        for (let i = 0; i < body.students.length; i++) {
          const item = body.students[i]
          const { student_id, name, password, phone } = item
          if (!student_id || !name) {
            errors.push(`Row ${i + 1}: Missing student_id or name`)
            continue
          }

          const cleanId = String(student_id).trim()
          const cleanName = String(name).trim()
          const rawPassword = password && String(password).trim() ? String(password).trim() : cleanId
          const finalPassword = normalizeAuthPassword(cleanId, rawPassword)
          const email = `${cleanId}@${AUTH_DOMAIN}`

          // 1. Create or check Auth user
          const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              apikey: SERVICE_ROLE_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password: finalPassword, email_confirm: true }),
          })

          const authData = await authRes.json()
          if (!authRes.ok) {
            errors.push(`Row ${i + 1} (${cleanId}): ${authData.msg || authData.message || 'Failed to create user'}`)
            continue
          }

          // 2. Create Profile
          const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              apikey: SERVICE_ROLE_KEY,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              id: authData.id,
              student_id: cleanId,
              name: cleanName,
              phone: phone ? String(phone).trim() : null,
              role: 'student',
              class_id: targetClassId,
            }),
          })

          if (!profileRes.ok) {
            const pErr = await profileRes.json().catch(() => ({}))
            errors.push(`Row ${i + 1} (${cleanId}): ${pErr.message || 'Failed to create profile'}`)
          } else {
            results.push({ id: authData.id, student_id: cleanId, name: cleanName })
          }
        }
        return res.status(200).json({ ok: true, createdCount: results.length, errors })
      }

      const { student_id, name, password, class_id, role, phone } = body

      if (!student_id || !name) {
        return res.status(400).json({ error: 'Missing required fields: student_id and name' })
      }

      const cleanId = student_id.trim()
      const rawPassword = password && password.trim() ? password.trim() : cleanId
      const finalPassword = normalizeAuthPassword(cleanId, rawPassword)

      // Privilege check: Only super_admin can create admins or super_admins
      const targetRole = role || 'student'
      if (auth.caller.role !== 'super_admin' && targetRole !== 'student') {
        return res.status(403).json({ error: 'Forbidden: Only Super Admins can create administrative accounts' })
      }

      // If class admin, ensure target user is assigned to a class
      const targetClassId = class_id || auth.caller.class_id || null

      const email = `${cleanId}@${AUTH_DOMAIN}`

      // Create Supabase Auth User with service_role privileges
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: finalPassword, email_confirm: true }),
      })

      const authData = await authRes.json()
      if (!authRes.ok) {
        return res.status(400).json({ error: authData.msg || authData.message || 'Failed to create auth user' })
      }

      // Create Profile in public.profiles table
      const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          id: authData.id,
          student_id,
          name,
          phone: phone || null,
          role: targetRole,
          class_id: targetClassId,
        }),
      })

      if (!profileRes.ok) {
        // Rollback created auth user if profile creation fails
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authData.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
        })
        const errJson = await profileRes.json().catch(() => ({}))
        return res.status(400).json({ error: errJson.message || 'Failed to create profile' })
      }

      return res.status(201).json({ id: authData.id })
    }

    if (req.method === 'PUT') {
      const { id, student_id, password, name, phone, class_id } = req.body || {}
      if (!id) return res.status(400).json({ error: 'Missing user id' })

      // Target privilege check
      if (auth.caller.role !== 'super_admin') {
        const targetCheck = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=role`, {
          headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
        })
        const target = (await targetCheck.json())?.[0]
        if (target && target.role !== 'student') {
          return res.status(403).json({ error: 'Forbidden: Admins can only modify student accounts' })
        }
      }

      // 1. Update Auth user (email/password) if provided
      const authUpdates = {}
      if (student_id) {
        authUpdates.email = `${student_id.trim()}@${AUTH_DOMAIN}`
      }
      if (password) {
        authUpdates.password = normalizeAuthPassword(student_id || '', password)
      }

      if (Object.keys(authUpdates).length > 0) {
        const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            apikey: SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(authUpdates),
        })

        if (!authRes.ok) {
          const errData = await authRes.json().catch(() => ({}))
          return res.status(400).json({ error: errData.msg || errData.message || 'Failed to update auth credentials' })
        }
      }

      // 2. Update profile in database
      const profileUpdates = {}
      if (student_id) profileUpdates.student_id = student_id.trim()
      if (name) profileUpdates.name = name.trim()
      if (phone !== undefined) profileUpdates.phone = phone ? phone.trim() : null
      if (class_id !== undefined) profileUpdates.class_id = class_id

      if (Object.keys(profileUpdates).length > 0) {
        const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            apikey: SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(profileUpdates),
        })

        if (!profileRes.ok) {
          const errData = await profileRes.json().catch(() => ({}))
          return res.status(400).json({ error: errData.message || 'Failed to update profile' })
        }
      }

      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const id = req.query.id
      if (!id) return res.status(400).json({ error: 'Missing user id parameter' })

      // Admins cannot delete super_admins
      if (auth.caller.role !== 'super_admin') {
        const targetCheck = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=role`, {
          headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
        })
        const target = (await targetCheck.json())?.[0]
        if (target && target.role !== 'student') {
          return res.status(403).json({ error: 'Forbidden: Admins can only remove student accounts' })
        }
      }

      const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
      })

      if (!delRes.ok) {
        const errJson = await delRes.json().catch(() => ({}))
        return res.status(400).json({ error: errJson.msg || errJson.message || 'Failed to delete auth user' })
      }

      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' })
  }
}
