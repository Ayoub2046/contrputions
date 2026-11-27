import { createRequire } from 'module'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const webpush = require('web-push')

const __dirname = dirname(fileURLToPath(import.meta.url))
const SUB_STORE_DIR = resolve(__dirname, '..', '.data')
const SUB_STORE_FILE = resolve(SUB_STORE_DIR, 'push_subscriptions.json')

// VAPID credentials for Web Push standard (Chrome Android, Safari iOS PWA, Edge, Firefox)
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
const ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY

function getSupabaseHeaders(req, extra = {}) {
  const callerAuth = req.headers?.authorization || req.headers?.Authorization
  const apiKey = SERVICE_ROLE_KEY || ANON_KEY
  const auth = SERVICE_ROLE_KEY ? `Bearer ${SERVICE_ROLE_KEY}` : callerAuth || (ANON_KEY ? `Bearer ${ANON_KEY}` : '')
  if (!SUPABASE_URL || !apiKey) return null
  return {
    Authorization: auth,
    apikey: apiKey,
    ...extra,
  }
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return req.body
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  try {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const raw = Buffer.concat(chunks).toString('utf-8').trim()
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Local file cache fallback (used when running locally via Vite / Node)
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
  } catch {
    // Expected on read-only serverless filesystems (e.g. Vercel)
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
    user_agent: item.user_agent || null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }
}

async function fetchAppBranding(req) {
  const defaults = {
    appName: 'ClassBank',
    notifIcon: '/icons/notif-logo-192.png',
    notifBadge: '/icons/notif-badge-96.png',
  }
  const headers = getSupabaseHeaders(req)
  if (!headers) return defaults

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/app_settings?select=key,value&key=in.(app_name,app_logo_url)`,
      { headers, signal: controller.signal }
    )
    clearTimeout(timeout)

    if (resp.ok) {
      const rows = await resp.json()
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row.key === 'app_name' && row.value?.trim()) {
            defaults.appName = row.value.trim()
          }
          if (row.key === 'app_logo_url' && row.value?.trim()) {
            const val = row.value.trim()
            // Use fast optimized 192x192 PNG when pointing to bundled /custom-logo.png or /classBankLogo.png
            if (val === '/custom-logo.png') {
              defaults.notifIcon = '/icons/notif-logo-192.png'
            } else if (!val.startsWith('data:') && !val.startsWith('blob:') && val.length < 800) {
              defaults.notifIcon = val
            }
          }
        }
      }
    }
  } catch {}
  return defaults
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    return res.end()
  }

  const url = new URL(req.url || '/api/push', 'http://localhost:5173')
  const pathname = url.pathname
  const action = url.searchParams.get('action')

  // 1. GET /api/push/vapid - Returns the public VAPID key for client subscriptions
  if (req.method === 'GET' && (pathname === '/api/push/vapid' || pathname === '/api/push')) {
    return res.status(200).json({ publicKey: VAPID_PUBLIC_KEY })
  }

  const body = req.method === 'POST' ? await parseJsonBody(req) : {}

  // 2. Subscribe endpoint: supports /api/push?action=subscribe, /api/push/subscribe, or { action: 'subscribe' }
  const isSubscribeRequest =
    req.method === 'POST' &&
    (pathname.endsWith('/subscribe') || action === 'subscribe' || body.action === 'subscribe')

  if (isSubscribeRequest) {
    const rawSub = body.subscription || body
    const normalized = normalizeSubscription(rawSub)

    if (!normalized) {
      return res.status(400).json({ error: 'Invalid push subscription payload. Missing endpoint or keys.' })
    }

    normalized.class_id = body.classId || body.class_id || null
    normalized.user_id = body.userId || body.user_id || null
    normalized.user_agent = req.headers?.['user-agent'] || null
    normalized.updated_at = new Date().toISOString()

    const previousEndpoint = typeof body.previousEndpoint === 'string' && body.previousEndpoint.trim()
      ? body.previousEndpoint.trim()
      : null

    const dbHeaders = getSupabaseHeaders(req, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    })

    // If renewing in background via `pushsubscriptionchange` without auth state, inherit user_id/class_id
    if ((!normalized.user_id || !normalized.class_id) && previousEndpoint && dbHeaders) {
      try {
        const prevResp = await fetch(
          `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(previousEndpoint)}&select=user_id,class_id&limit=1`,
          { headers: dbHeaders }
        )
        if (prevResp.ok) {
          const prevRows = await prevResp.json()
          const prev = Array.isArray(prevRows) ? prevRows[0] : null
          if (prev) {
            normalized.user_id = normalized.user_id || prev.user_id || null
            normalized.class_id = normalized.class_id || prev.class_id || null
          }
        }
      } catch {}
    }

    // Save to local file cache (works in local dev/VPS)
    const currentSubs = getLocalSubscriptions()
    const filtered = currentSubs.filter(
      (s) => s.endpoint !== normalized.endpoint && s.endpoint !== previousEndpoint
    )
    filtered.push(normalized)
    saveLocalSubscriptions(filtered)

    // Persist directly to Supabase push_subscriptions table (CRITICAL for Vercel / multi-device)
    let dbSaved = false
    let dbError = null

    if (dbHeaders) {
      try {
        const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?on_conflict=endpoint`, {
          method: 'POST',
          headers: dbHeaders,
          body: JSON.stringify({
            endpoint: normalized.endpoint,
            p256dh: normalized.p256dh,
            auth: normalized.auth,
            class_id: normalized.class_id,
            user_id: normalized.user_id,
            user_agent: normalized.user_agent,
            updated_at: normalized.updated_at,
          }),
        })
        if (upsertResp.ok) {
          dbSaved = true
        } else {
          dbError = await upsertResp.text()
          console.warn('[Supabase Push Subscription Upsert Error]:', upsertResp.status, dbError)
        }
      } catch (err) {
        dbError = err.message
        console.warn('[Supabase Push Subscription Upsert Warning]:', err.message)
      }
    }

    // Clean up replaced previousEndpoint + stale duplicate rows on the SAME device/UA
    // (preserving subscriptions on other devices like laptop + mobile phone)
    if (dbHeaders) {
      if (previousEndpoint && previousEndpoint !== normalized.endpoint) {
        try {
          await fetch(
            `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(previousEndpoint)}`,
            { method: 'DELETE', headers: dbHeaders }
          )
        } catch {}
      }
      if (normalized.user_id && normalized.user_agent) {
        try {
          await fetch(
            `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(normalized.user_id)}&user_agent=eq.${encodeURIComponent(normalized.user_agent)}&endpoint=neq.${encodeURIComponent(normalized.endpoint)}`,
            { method: 'DELETE', headers: dbHeaders }
          )
        } catch (cleanupErr) {
          console.warn('[Supabase Push Cleanup Warning]:', cleanupErr.message)
        }
      }
    }

    return res.status(200).json({
      ok: true,
      dbSaved,
      dbError,
      message: 'Device push subscription registered',
    })
  }

  // 3. POST /api/push or /api/push/send - Dispatches background push notifications to devices
  if (req.method === 'POST') {
    const branding = await fetchAppBranding(req)
    const title = body.title || `📢 ${branding.appName} Notification`
    const messageBody = body.body || 'New announcement available.'
    const category = body.category || 'announcement'
    const targetClassId = body.classId || body.class_id || null
    const targetEndpoint = body.targetEndpoint || null
    const targetUrl = body.url || '/dashboard'
    const notifId = body.id || `push_${Date.now()}`

    // Collect all subscriptions
    const allSubsMap = new Map()

    // 1. From Supabase database (authoritative cross-device store, newest first)
    const readHeaders = getSupabaseHeaders(req)
    if (readHeaders) {
      try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*&order=updated_at.desc`, {
          headers: readHeaders,
        })
        if (resp.ok) {
          const dbSubs = await resp.json()
          if (Array.isArray(dbSubs)) {
            dbSubs.forEach((s) => {
              const norm = normalizeSubscription(s)
              if (norm) allSubsMap.set(norm.endpoint, norm)
            })
          }
        } else {
          console.warn('[Fetch DB Push Subscriptions Error]:', resp.status, await resp.text())
        }
      } catch (err) {
        console.warn('[Fetch DB Push Subscriptions Warning]:', err.message)
      }
    }

    // 2. Merge local file cache (for local dev environment)
    getLocalSubscriptions().forEach((s) => {
      const norm = normalizeSubscription(s)
      if (norm && !allSubsMap.has(norm.endpoint)) {
        allSubsMap.set(norm.endpoint, norm)
      }
    })

    // Deduplicate by (user_id, user_agent) keeping the newest updated_at per device/browser.
    // Preserves independent delivery to each device (phone + laptop), while eliminating stale duplicate endpoints.
    const deviceLatestMap = new Map()
    const unkeyedSubs = []
    for (const sub of allSubsMap.values()) {
      if (!sub.user_id) {
        unkeyedSubs.push(sub)
        continue
      }
      const deviceKey = `${sub.user_id}::${sub.user_agent || sub.endpoint}`
      const existing = deviceLatestMap.get(deviceKey)
      const subTs = sub.updated_at || sub.created_at || ''
      const existingTs = existing ? (existing.updated_at || existing.created_at || '') : ''
      if (!existing || subTs > existingTs) {
        deviceLatestMap.set(deviceKey, sub)
      }
    }
    const deduplicatedSubs = [...deviceLatestMap.values(), ...unkeyedSubs]
    const allSubs = Array.from(allSubsMap.values())

    // Filter targets:
    // - If targetEndpoint is supplied (e.g. single-device test push), target that endpoint.
    // - Otherwise, if targetClassId is supplied, deliver to matching class AND any global/unscoped subscriptions (!sub.class_id).
    const targetSubs = deduplicatedSubs.filter((sub) => {
      if (targetEndpoint) return sub.endpoint === targetEndpoint
      if (!targetClassId) return true
      return !sub.class_id || sub.class_id === targetClassId
    })

    // Intentionally DO NOT include `tag` or `renotify` in push payload so Android Chrome
    // renders every incoming notification as an independent stacked card.
    const pushData = JSON.stringify({
      id: notifId,
      title,
      body: messageBody,
      appName: branding.appName,
      category,
      classId: targetClassId,
      url: targetUrl,
      icon: branding.notifIcon,
      badge: branding.notifBadge,
      vibrate: [300, 150, 300, 150, 400],
      silent: false,
      requireInteraction: false,
      timestamp: Date.now(),
    })

    let sentCount = 0
    let failedCount = 0
    const staleEndpoints = []
    const errors = []

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
              urgency: 'high', // Forces immediate delivery past Android Doze mode
            }
          )
          sentCount++
        } catch (err) {
          failedCount++
          if (err.statusCode === 410 || err.statusCode === 404) {
            staleEndpoints.push(sub.endpoint)
          } else {
            errors.push({ statusCode: err.statusCode, message: err.message })
            console.warn('[WebPush Dispatch Single Error]:', err.statusCode, err.message)
          }
        }
      })
    )

    // Clean up expired/unsubscribed endpoints
    if (staleEndpoints.length > 0) {
      const remaining = allSubs.filter((s) => !staleEndpoints.includes(s.endpoint))
      saveLocalSubscriptions(remaining)

      if (readHeaders) {
        try {
          for (const ep of staleEndpoints) {
            await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(ep)}`, {
              method: 'DELETE',
              headers: readHeaders,
            })
          }
        } catch {}
      }
    }

    console.log(
      `[WebPush Broadcast Completed]: Sent ${sentCount} notifications (${failedCount} failed, ${targetSubs.length} total targets)`
    )

    return res.status(200).json({
      ok: true,
      sent: sentCount,
      failed: failedCount,
      totalTargets: targetSubs.length,
      errors: errors.slice(0, 3),
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
