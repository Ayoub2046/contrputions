const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

async function verifyAuth(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization
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

  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${callerAuth.id}&select=id,name,role,student_id,class_id`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
    }
  )

  if (!profileRes.ok) {
    return { ok: false, status: 403, error: 'Forbidden: Profile not found' }
  }

  const profiles = await profileRes.json()
  const callerProfile = profiles?.[0]
  if (!callerProfile) {
    return { ok: false, status: 403, error: 'Forbidden: Profile record does not exist' }
  }

  // If class admin, fetch assigned class ids from class_admins join table
  let adminClassIds = []
  if (callerProfile.role === 'admin') {
    const caRes = await fetch(
      `${SUPABASE_URL}/rest/v1/class_admins?admin_id=eq.${callerProfile.id}&select=class_id`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      }
    )
    if (caRes.ok) {
      const caRows = await caRes.json()
      adminClassIds = caRows.map((r) => r.class_id)
    }
    if (callerProfile.class_id && !adminClassIds.includes(callerProfile.class_id)) {
      adminClassIds.push(callerProfile.class_id)
    }
  }

  return {
    ok: true,
    caller: callerProfile,
    callerId: callerAuth.id,
    adminClassIds,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(204).end()

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error: Missing Supabase environment variables' })
  }

  const auth = await verifyAuth(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const { caller, adminClassIds } = auth

  try {
    // ----------------------------------------------------
    // GET /api/comments?class_id=...
    // ----------------------------------------------------
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost')
      const reqClassId = url.searchParams.get('class_id')

      let filterClassId = null
      if (caller.role === 'super_admin') {
        filterClassId = reqClassId && reqClassId !== 'all' ? reqClassId : null
      } else if (caller.role === 'admin') {
        if (reqClassId && reqClassId !== 'all') {
          if (!adminClassIds.includes(reqClassId)) {
            return res.status(403).json({ error: 'Forbidden: You do not administer this class' })
          }
          filterClassId = reqClassId
        } else if (adminClassIds.length === 1) {
          filterClassId = adminClassIds[0]
        }
      } else {
        // Student: strictly limited to their own class
        filterClassId = caller.class_id
        if (!filterClassId) {
          return res.status(200).json([])
        }
      }

      let queryUrl = `${SUPABASE_URL}/rest/v1/class_comments?select=id,class_id,user_id,content,created_at,classes:class_id(name),profiles:user_id(name,role,student_id)&order=created_at.desc`
      if (filterClassId) {
        queryUrl += `&class_id=eq.${filterClassId}`
      } else if (caller.role === 'admin' && adminClassIds.length > 0) {
        queryUrl += `&class_id=in.(${adminClassIds.join(',')})`
      }

      const commentsRes = await fetch(queryUrl, {
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      })

      if (!commentsRes.ok) {
        const errJson = await commentsRes.json().catch(() => ({}))
        return res.status(500).json({ error: errJson.message || 'Failed to fetch comments' })
      }

      const rows = await commentsRes.json()
      const mapped = rows.map((item) => ({
        id: item.id,
        class_id: item.class_id,
        class_name: item.classes?.name || '',
        user_id: item.user_id,
        content: item.content,
        created_at: item.created_at,
        author_name: item.profiles?.name || (item.user_id === caller.id ? caller.name : 'Class Member'),
        author_role: item.profiles?.role || (item.user_id === caller.id ? caller.role : 'student'),
        author_student_id: item.profiles?.student_id || (item.user_id === caller.id ? caller.student_id : ''),
      }))

      return res.status(200).json(mapped)
    }

    // ----------------------------------------------------
    // POST /api/comments
    // ----------------------------------------------------
    if (req.method === 'POST') {
      const body = req.body || {}
      const { content, class_id } = body

      if (!content || !String(content).trim()) {
        return res.status(400).json({ error: 'Comment content cannot be empty' })
      }

      let targetClassId = class_id
      if (caller.role === 'student') {
        targetClassId = caller.class_id
      } else if (caller.role === 'admin' && !targetClassId) {
        targetClassId = adminClassIds[0] || caller.class_id
      }

      if (!targetClassId) {
        return res.status(400).json({ error: 'Target class_id is required to post a comment' })
      }

      if (caller.role === 'admin' && !adminClassIds.includes(targetClassId)) {
        return res.status(403).json({ error: 'Forbidden: You do not manage this class' })
      }

      const newId = crypto.randomUUID ? crypto.randomUUID() : undefined

      const insertPayload = {
        class_id: targetClassId,
        user_id: caller.id,
        content: String(content).trim(),
      }
      if (newId) insertPayload.id = newId

      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/class_comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(insertPayload),
      })

      if (!insertRes.ok) {
        const errJson = await insertRes.json().catch(() => ({}))
        return res.status(500).json({ error: errJson.message || 'Failed to save comment' })
      }

      const createdRows = await insertRes.json()
      const created = createdRows?.[0] || insertPayload

      return res.status(201).json({
        ok: true,
        comment: {
          id: created.id,
          class_id: created.class_id,
          user_id: created.user_id,
          content: created.content,
          created_at: created.created_at || new Date().toISOString(),
          author_name: caller.name,
          author_role: caller.role,
          author_student_id: caller.student_id,
        },
      })
    }

    // ----------------------------------------------------
    // DELETE /api/comments?id=...
    // ----------------------------------------------------
    if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://localhost')
      const commentId = url.searchParams.get('id') || req.body?.id

      if (!commentId) {
        return res.status(400).json({ error: 'Missing comment id to delete' })
      }

      // Check permissions
      if (caller.role !== 'super_admin') {
        const checkRes = await fetch(
          `${SUPABASE_URL}/rest/v1/class_comments?id=eq.${commentId}&select=id,user_id,class_id`,
          {
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              apikey: SERVICE_ROLE_KEY,
            },
          }
        )
        if (!checkRes.ok) {
          return res.status(404).json({ error: 'Comment not found' })
        }
        const found = await checkRes.json()
        const comment = found?.[0]
        if (!comment) {
          return res.status(404).json({ error: 'Comment not found' })
        }

        const isAuthor = comment.user_id === caller.id
        const isAdminOfClass = caller.role === 'admin' && adminClassIds.includes(comment.class_id)
        if (!isAuthor && !isAdminOfClass) {
          return res.status(403).json({ error: 'Forbidden: You cannot delete this comment' })
        }
      }

      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/class_comments?id=eq.${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      })

      if (!delRes.ok) {
        const errJson = await delRes.json().catch(() => ({}))
        return res.status(500).json({ error: errJson.message || 'Failed to delete comment' })
      }

      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
