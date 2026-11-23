const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS')
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
      const { student_id, name, password, class_id, role, phone } = req.body || {}

      if (!student_id || !name || !password) {
        return res.status(400).json({ error: 'Missing required fields: student_id, name, and password' })
      }

      // Privilege check: Only super_admin can create admins or super_admins
      const targetRole = role || 'student'
      if (auth.caller.role !== 'super_admin' && targetRole !== 'student') {
        return res.status(403).json({ error: 'Forbidden: Only Super Admins can create administrative accounts' })
      }

      // If class admin, ensure target user is assigned to a class
      const targetClassId = class_id || auth.caller.class_id || null

      const email = `${student_id}@${AUTH_DOMAIN}`

      // Create Supabase Auth User with service_role privileges
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, email_confirm: true }),
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
