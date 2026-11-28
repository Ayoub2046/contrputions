import { randomUUID } from 'crypto'
import { dispatchPushNotification } from './push.mjs'

function getEnv() {
  return {
    SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
  }
}

async function verifyAuth(req) {
  const { SUPABASE_URL, SERVICE_ROLE_KEY } = getEnv()
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
  const { SUPABASE_URL, SERVICE_ROLE_KEY } = getEnv()
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
    // GET /api/comments?leaders=1&class_id=... (Class Leaders Directory)
    // OR GET /api/comments?class_id=... (Class Discussion Comments)
    // ----------------------------------------------------
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost')
      const reqClassId = url.searchParams.get('class_id')

      if (url.searchParams.get('leaders') === '1') {
        const targetClassId =
          caller.role === 'student'
            ? caller.class_id
            : reqClassId && reqClassId !== 'all'
            ? reqClassId
            : adminClassIds[0] || caller.class_id

        if (caller.role === 'admin' && targetClassId && !adminClassIds.includes(targetClassId)) {
          return res.status(403).json({ error: 'Forbidden: You do not administer this class' })
        }

        const leadersMap = new Map()

        if (targetClassId) {
          const caRes = await fetch(
            `${SUPABASE_URL}/rest/v1/class_admins?class_id=eq.${encodeURIComponent(targetClassId)}&select=admin_id,profiles!class_admins_admin_id_fkey(id,name,phone,role,student_id)`,
            {
              headers: {
                Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                apikey: SERVICE_ROLE_KEY,
              },
            }
          )
          if (caRes.ok) {
            const caRows = await caRes.json()
            for (const row of caRows || []) {
              const p = row?.profiles
              // Strict requirement: Only assigned class admins (role 'admin') are shown to students.
              // NEVER include or expose super_admin!
              if (p?.id && p.role === 'admin') {
                leadersMap.set(p.id, {
                  id: p.id,
                  name: p.name,
                  phone: p.phone || null,
                  role: p.role,
                  student_id: p.student_id || null,
                  isAssignedClassAdmin: true,
                })
              }
            }
          }
        }

        // Return only legitimate assigned class admins - NO super admins
        const leaders = Array.from(leadersMap.values()).sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''))
        )

        return res.status(200).json(leaders)
      }

      // ----------------------------------------------------
      // GET /api/comments?action=private_messages
      // Retrieve private direct messages between student & admin
      // ----------------------------------------------------
      if (url.searchParams.get('action') === 'private_messages') {
        const adminId = url.searchParams.get('admin_id')
        const selectCols = 'id,sender_id,content,category,created_at,sender:profiles!admin_messages_sender_id_fkey(id,name,phone,student_id,class_id,classes:class_id(name))'
        let dmQuery = `${SUPABASE_URL}/rest/v1/admin_messages?select=${encodeURIComponent(selectCols)}&order=created_at.desc`

        if (caller.role === 'student') {
          if (adminId) {
            dmQuery += `&or=(and(sender_id.eq.${caller.id},category.eq.dm:${adminId}),and(sender_id.eq.${adminId},category.eq.dm:${caller.id}))`
          } else {
            dmQuery += `&or=(sender_id.eq.${caller.id},category.eq.dm:${caller.id})`
          }
        } else if (caller.role === 'admin' || caller.role === 'super_admin' || caller.role === 'finance_manager') {
          const studentId = url.searchParams.get('student_id')
          if (studentId) {
            dmQuery += `&or=(and(sender_id.eq.${caller.id},category.eq.dm:${studentId}),and(sender_id.eq.${studentId},category.eq.dm:${caller.id}))`
          } else {
            // Fetch all private messages directed to this admin, or sent by this admin
            dmQuery += `&or=(sender_id.eq.${caller.id},category.eq.dm:${caller.id})`
          }
        }

        const dmRes = await fetch(dmQuery, {
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            apikey: SERVICE_ROLE_KEY,
          },
        })
        if (!dmRes.ok) {
          return res.status(200).json([])
        }
        const dms = await dmRes.json()
        return res.status(200).json(dms)
      }

      let filterClassId = null
      if (caller.role === 'super_admin' || caller.role === 'finance_manager') {
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
    // Supports:
    // 1. Private 1-on-1 Messages (Student -> Assigned Class Admin)
    // 2. Class Discussion Board Comments (Public to class)
    // ----------------------------------------------------
    if (req.method === 'POST') {
      const body = req.body || {}
      const { content, class_id, id: requestedId, is_private, recipient_id } = body

      if (!content || !String(content).trim()) {
        return res.status(400).json({ error: 'Message content cannot be empty' })
      }

      // Handle 100% PRIVATE Direct Message (Student -> Class Admin)
      // NEVER posts to class_comments! Stored confidentially with push notification.
      if (is_private || recipient_id) {
        if (!recipient_id) {
          return res.status(400).json({ error: 'Recipient is required for private messages' })
        }

        const isUuid = typeof requestedId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId)
        const msgId = isUuid ? requestedId : randomUUID()

        const dmPayload = {
          id: msgId,
          sender_id: caller.id,
          content: String(content).trim(),
          category: `dm:${recipient_id}`,
        }

        const insertDmRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            apikey: SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(dmPayload),
        })

        if (!insertDmRes.ok) {
          const errJson = await insertDmRes.json().catch(() => ({}))
          return res.status(500).json({ error: errJson.message || 'Failed to send private message' })
        }

        // Dispatch background Web Push directly to the class admin's device
        try {
          await dispatchPushNotification(req, {
            id: msgId,
            title: `🔒 Private Message from ${caller.name}`,
            body: String(content).trim().slice(0, 100),
            category: 'reminder',
            targetUserIds: [recipient_id],
            url: '/dashboard',
            senderName: caller.name,
            senderRole: caller.role,
          })
        } catch (pushErr) {
          console.warn('[Private DM Push Warning]:', pushErr.message)
        }

        return res.status(201).json({
          ok: true,
          is_private: true,
          message: 'Private message sent confidentially to class leader.',
          data: dmPayload,
        })
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

      const isUuid = typeof requestedId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId)
      const newId = isUuid ? requestedId : randomUUID()

      const insertPayload = {
        id: newId,
        class_id: targetClassId,
        user_id: caller.id,
        content: String(content).trim(),
      }

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

      // Persist notification + dispatch independent background Web Push directly from backend
      const commentId = created.id || newId
      const notifTitle = `💬 ${caller.name} commented in class`
      const notifBody = String(content).trim()
      const notifCreatedAt = created.created_at || new Date().toISOString()

      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          id: commentId,
          title: notifTitle,
          body: notifBody,
          type: 'news',
          sender_name: caller.name || null,
          sender_role: caller.role || null,
          class_id: created.class_id || targetClassId,
          created_at: notifCreatedAt,
        }),
      }).catch(() => {})

      let pushResult = null
      try {
        pushResult = await dispatchPushNotification(req, {
          id: commentId,
          title: notifTitle,
          body: notifBody,
          category: 'news',
          classId: created.class_id || targetClassId,
          url: '/dashboard',
          senderName: caller.name,
          senderRole: caller.role,
        })
      } catch (pushErr) {
        console.warn('[Comments Backend Push Warning]:', pushErr.message)
      }

      return res.status(201).json({
        ok: true,
        notificationDispatched: Boolean(pushResult),
        comment: {
          id: commentId,
          class_id: created.class_id,
          user_id: created.user_id,
          content: created.content,
          created_at: notifCreatedAt,
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

      // Handle private direct message deletion
      if (url.searchParams.get('action') === 'private_message' || url.searchParams.get('is_private') === 'true') {
        const delDmRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_messages?id=eq.${commentId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            apikey: SERVICE_ROLE_KEY,
          },
        })
        if (!delDmRes.ok) {
          const errJson = await delDmRes.json().catch(() => ({}))
          return res.status(500).json({ error: errJson.message || 'Failed to delete private message' })
        }
        return res.status(200).json({ ok: true })
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
