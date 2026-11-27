import { createRequire } from 'module'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const webpush = require('web-push')

const __dirname = dirname(fileURLToPath(import.meta.url))
const SUB_STORE_DIR = resolve(__dirname, '..', '.data')
const SUB_STORE_FILE = resolve(SUB_STORE_DIR, 'push_subscriptions.json')

// VAPID credentials for Web Push standard (Chrome Android, Safari iOS, Edge, Firefox)
export const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BIQ74Oz-r2eA4OauixHmwq8IWIGoEynmNUQ65D4cebpBe0p_JKdPkAk6oMjwxnHC1XdG4Z8zk1UzhmznPf8mCvk'
export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'bAJF6SgBdPx7z-nVTN6Qry2p8fUIBUeVLpGlV_nFaj0'
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@classbank.local'

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
} catch (err) {
  console.warn('[WebPush VAPID Init Warning]:', err.message)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

// In-memory fallback subscriptions
function getLocalSubscriptions() {
  try {
    if (existsSync(SUB_STORE_FILE)) {
      const data = JSON.parse(readFileSync(SUB_STORE_FILE, 'utf-8'))
      if (Array.isArray(data)) return data
    }
  } catch {}
  return []
}

function saveLocalSubscriptions(subs) {
  try {
    if (!existsSync(SUB_STORE_DIR)) {
      mkdirSync(SUB_STORE_DIR, { recursive: true })
    }
    writeFileSync(SUB_STORE_FILE, JSON.stringify(subs, null, 2), 'utf-8')
  } catch (err) {
    console.warn('[Push Local Cache Save Error]:', err.message)
  }
}

function normalizeSubscription(item) {
  if (!item) return null
  const endpoint = item.endpoint
  const p256dh = item.p256dh || item.keys?.p256dh
  const auth = item.auth || item.keys?.auth
  if (!endpoint || !p256dh || !auth) return null
  return {
    endpoint,
    p256dh,
    auth,
    class_id: item.class_id || item.classId || null,
    user_id: item.user_id || item.userId || null,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    return res.end()
  }

  const url = new URL(req.url, 'http://localhost:5173')
  const pathname = url.pathname

  // 1. GET /api/push/vapid - Returns the public VAPID key for client subscriptions
  if (req.method === 'GET' && (pathname === '/api/push/vapid' || pathname === '/api/push')) {
    return res.status(200).json({ publicKey: VAPID_PUBLIC_KEY })
  }

  // 2. POST /api/push/subscribe - Registers a mobile device / browser push subscription
  if (req.method === 'POST' && pathname === '/api/push/subscribe') {
    const body = req.body || {}
    const rawSub = body.subscription || body
    const normalized = normalizeSubscription(rawSub)

    if (!normalized) {
      return res.status(400).json({ error: 'Invalid push subscription payload. Missing endpoint or keys.' })
    }

    normalized.class_id = body.classId || body.class_id || null
    normalized.user_id = body.userId || body.user_id || null
    normalized.updated_at = new Date().toISOString()

    // Save to local file cache
    const currentSubs = getLocalSubscriptions()
    const filtered = currentSubs.filter((s) => s.endpoint !== normalized.endpoint)
    filtered.push(normalized)
    saveLocalSubscriptions(filtered)

    // Also persist to Supabase if available
    if (SUPABASE_URL && SERVICE_ROLE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            apikey: SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            endpoint: normalized.endpoint,
            p256dh: normalized.p256dh,
            auth: normalized.auth,
            class_id: normalized.class_id,
            user_id: normalized.user_id,
            updated_at: normalized.updated_at,
          }),
        })
      } catch (err) {
        console.warn('[Supabase Push Subscription Upsert Warning]:', err.message)
      }
    }

    return res.status(200).json({ ok: true, message: 'Device push subscription registered' })
  }

  // 3. POST /api/push or /api/push/send - Dispatches background push notifications to devices
  if (req.method === 'POST') {
    const payload = req.body || {}
    const title = payload.title || '📢 ClassBank Notification'
    const body = payload.body || 'New announcement available.'
    const category = payload.category || 'announcement'
    const targetClassId = payload.classId || payload.class_id || null
    const targetUrl = payload.url || '/dashboard'
    const notifId = payload.id || `push_${Date.now()}`

    // Collect all subscriptions
    const allSubsMap = new Map()

    // 1. From local file cache
    getLocalSubscriptions().forEach((s) => {
      const norm = normalizeSubscription(s)
      if (norm) allSubsMap.set(norm.endpoint, norm)
    })

    // 2. From Supabase table
    if (SUPABASE_URL && SERVICE_ROLE_KEY) {
      try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*`, {
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            apikey: SERVICE_ROLE_KEY,
          },
        })
        if (resp.ok) {
          const dbSubs = await resp.json()
          if (Array.isArray(dbSubs)) {
            dbSubs.forEach((s) => {
              const norm = normalizeSubscription(s)
              if (norm) allSubsMap.set(norm.endpoint, norm)
            })
          }
        }
      } catch (err) {
        console.warn('[Fetch DB Push Subscriptions Warning]:', err.message)
      }
    }

    const allSubs = Array.from(allSubsMap.values())

    // Filter by class if specified: send to this class AND any global (class_id is null) subscriptions
    const targetSubs = allSubs.filter((sub) => {
      if (!targetClassId) return true
      return !sub.class_id || sub.class_id === targetClassId
    })

    const pushData = JSON.stringify({
      id: notifId,
      title,
      body,
      category,
      classId: targetClassId,
      url: targetUrl,
      icon: '/custom-logo.png',
      badge: '/icons/badge-96.png',
      image: '/custom-logo.png',
      timestamp: Date.now(),
    })

    let sentCount = 0
    let failedCount = 0
    const staleEndpoints = []

    await Promise.all(
      targetSubs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushData,
            {
              TTL: 86400, // 24 hours retention on push service
              urgency: 'high',
            }
          )
          sentCount++
        } catch (err) {
          failedCount++
          if (err.statusCode === 410 || err.statusCode === 404) {
            staleEndpoints.push(sub.endpoint)
          } else {
            console.warn('[WebPush Dispatch Single Error]:', err.message)
          }
        }
      })
    )

    // Clean up stale endpoints
    if (staleEndpoints.length > 0) {
      const remaining = allSubs.filter((s) => !staleEndpoints.includes(s.endpoint))
      saveLocalSubscriptions(remaining)

      if (SUPABASE_URL && SERVICE_ROLE_KEY) {
        try {
          for (const ep of staleEndpoints) {
            await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(ep)}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                apikey: SERVICE_ROLE_KEY,
              },
            })
          }
        } catch {}
      }
    }

    console.log(`[WebPush Broadcast Completed]: Sent ${sentCount} notifications (${failedCount} failed, ${targetSubs.length} total targets)`)

    return res.status(200).json({
      ok: true,
      sent: sentCount,
      failed: failedCount,
      totalTargets: targetSubs.length,
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
