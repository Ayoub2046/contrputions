import * as webpush from 'web-push'
import { randomUUID } from 'crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

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

let vapidConfigured = false
function ensureVapidConfigured() {
  if (vapidConfigured) return
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    vapidConfigured = true
  } catch (err) {
    console.warn('[WebPush VAPID Init Warning]:', err.message)
  }
}
ensureVapidConfigured()

// Bounded server-side duplicate event guard (5 minute window, never collides across distinct event IDs)
const RECENT_EVENT_TTL_MS = 5 * 60 * 1000
const recentDispatchedEvents = new Map()

function isDuplicateEventDispatch(cacheKey) {
  const now = Date.now()
  for (const [k, ts] of recentDispatchedEvents.entries()) {
    if (now - ts > RECENT_EVENT_TTL_MS) {
      recentDispatchedEvents.delete(k)
    }
  }
  if (recentDispatchedEvents.size > 500) {
    const oldestKey = recentDispatchedEvents.keys().next().value
    if (oldestKey) recentDispatchedEvents.delete(oldestKey)
  }
  if (recentDispatchedEvents.has(cacheKey)) return true
  recentDispatchedEvents.set(cacheKey, now)
  return false
}

function getSupabaseEnv() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  return { url, serviceKey, anonKey }
}

function getSupabaseHeaders(req, extra = {}) {
  const { url, serviceKey, anonKey } = getSupabaseEnv()
  const callerAuth = req?.headers?.authorization || req?.headers?.Authorization
  const apiKey = serviceKey || anonKey
  const auth = serviceKey ? `Bearer ${serviceKey}` : callerAuth || (anonKey ? `Bearer ${anonKey}` : '')
  if (!url || !apiKey) return null
  return {
    Authorization: auth,
    apikey: apiKey,
    ...extra,
  }
}

async function fetchCallerMembership(url, headers, userId) {
  let role = null
  let classId = null
  const adminClassIds = []

  try {
    const profResp = await fetch(
      `${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,role,class_id&limit=1`,
      { headers }
    )
    if (profResp.ok) {
      const rows = await profResp.json()
      const prof = Array.isArray(rows) ? rows[0] : null
      if (prof) {
        role = prof.role || null
        classId = prof.class_id || null
      }
    }
  } catch {}

  if (role === 'admin') {
    try {
      const caResp = await fetch(
        `${url}/rest/v1/class_admins?admin_id=eq.${encodeURIComponent(userId)}&select=class_id`,
        { headers }
      )
      if (caResp.ok) {
        const caRows = await caResp.json()
        if (Array.isArray(caRows)) {
          for (const r of caRows) {
            if (r?.class_id && !adminClassIds.includes(r.class_id)) {
              adminClassIds.push(r.class_id)
            }
          }
        }
      }
    } catch {}
    if (classId && !adminClassIds.includes(classId)) {
      adminClassIds.push(classId)
    }
  }

  return { role, classId, adminClassIds }
}

async function resolveVerifiedCaller(req) {
  const { url, serviceKey, anonKey } = getSupabaseEnv()
  const callerAuth = req?.headers?.authorization || req?.headers?.Authorization
  if (!callerAuth || typeof callerAuth !== 'string' || !callerAuth.startsWith('Bearer ')) {
    return { ok: false, userId: null, isServiceRole: false, role: null, classId: null, adminClassIds: [] }
  }
  const token = callerAuth.slice(7).trim()
  if (!token) {
    return { ok: false, userId: null, isServiceRole: false, role: null, classId: null, adminClassIds: [] }
  }
  if (serviceKey && token === serviceKey) {
    return { ok: true, userId: null, isServiceRole: true, role: 'super_admin', classId: null, adminClassIds: [] }
  }
  const apiKey = serviceKey || anonKey
  if (!url || !apiKey) {
    return { ok: false, userId: null, isServiceRole: false, role: null, classId: null, adminClassIds: [] }
  }
  try {
    const resp = await fetch(`${url}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: apiKey,
      },
    })
    if (!resp.ok) {
      return { ok: false, userId: null, isServiceRole: false, role: null, classId: null, adminClassIds: [] }
    }
    const userJson = await resp.json()
    if (userJson?.id) {
      const dbHeaders = getSupabaseHeaders(req) || {
        Authorization: `Bearer ${token}`,
        apikey: apiKey,
      }
      const membership = await fetchCallerMembership(url, dbHeaders, userJson.id)
      return {
        ok: true,
        userId: userJson.id,
        isServiceRole: false,
        role: membership.role,
        classId: membership.classId,
        adminClassIds: membership.adminClassIds,
      }
    }
  } catch {}
  return { ok: false, userId: null, isServiceRole: false, role: null, classId: null, adminClassIds: [] }
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

function maskEndpoint(endpoint) {
  if (!endpoint || typeof endpoint !== 'string') return 'unknown'
  return `...${endpoint.slice(-18)}`
}

function isPermanentGoneError(err) {
  const code = err?.statusCode
  if (code === 404 || code === 410) return true
  const body = String(err?.body || err?.message || '')
  return /NotRegistered|Unregistered|MismatchSenderId/i.test(body)
}

function isTransientPushError(err) {
  const code = err?.statusCode
  if (code === 429 || (code >= 500 && code < 600)) return true
  const msg = String(err?.code || err?.message || '')
  return /ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|Socket timeout|network/i.test(msg)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendWithRetry(sub, pushData, eventId, maxAttempts = 3) {
  ensureVapidConfigured()
  let lastError = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        pushData,
        {
          // 24h retention so offline/locked/Doze devices receive EVERY message when reachable
          TTL: 86400,
          urgency: 'high',
          // Omit `topic` so messages remain strictly non-collapsible in FCM/Web Push queues
        }
      )
      return {
        ok: true,
        attempts: attempt,
        statusCode: response?.statusCode ?? 201,
        endpointHint: maskEndpoint(sub.endpoint),
        userId: sub.user_id || null,
      }
    } catch (err) {
      lastError = err
      const permanent = isPermanentGoneError(err)
      const transient = !permanent && isTransientPushError(err)

      console.warn(
        `[WebPush Attempt ${attempt}/${maxAttempts} Failed] event=${eventId} endpoint=${maskEndpoint(sub.endpoint)} status=${err?.statusCode || 'ERR'} msg=${err?.message}`
      )

      if (!transient || attempt === maxAttempts) {
        return {
          ok: false,
          attempts: attempt,
          statusCode: err?.statusCode || 0,
          permanentGone: permanent,
          message: err?.message || 'Push delivery error',
          body: err?.body ? String(err.body).slice(0, 160) : undefined,
          endpointHint: maskEndpoint(sub.endpoint),
          userId: sub.user_id || null,
        }
      }

      await sleep(attempt === 1 ? 250 : 600)
    }
  }

  return {
    ok: false,
    attempts: maxAttempts,
    statusCode: lastError?.statusCode || 0,
    permanentGone: isPermanentGoneError(lastError),
    message: lastError?.message || 'Unknown push failure',
    endpointHint: maskEndpoint(sub.endpoint),
    userId: sub.user_id || null,
  }
}

async function fetchAppBranding(req) {
  const { url: supabaseUrl } = getSupabaseEnv()
  const defaults = {
    appName: 'ClassBank',
    notifIcon: '/icons/notif-logo-192.png',
    notifBadge: '/icons/notif-badge-96.png',
  }
  const headers = getSupabaseHeaders(req)
  if (!supabaseUrl || !headers) return defaults

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/app_settings?select=key,value&key=in.(app_name,app_logo_url)`,
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

async function fetchRecipientDirectory(req) {
  const { url: supabaseUrl } = getSupabaseEnv()
  const headers = getSupabaseHeaders(req)
  const profileById = new Map()
  const adminClassesByAdminId = new Map()
  if (!supabaseUrl || !headers) {
    return { loaded: false, profileById, adminClassesByAdminId }
  }

  try {
    const [profResp, caResp] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/profiles?select=id,role,class_id`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/class_admins?select=admin_id,class_id`, { headers }),
    ])
    if (!profResp.ok) {
      return { loaded: false, profileById, adminClassesByAdminId }
    }
    const profRows = await profResp.json()
    if (Array.isArray(profRows)) {
      for (const row of profRows) {
        if (row?.id) profileById.set(row.id, row)
      }
    }
    if (caResp.ok) {
      const caRows = await caResp.json()
      if (Array.isArray(caRows)) {
        for (const row of caRows) {
          if (!row?.admin_id || !row?.class_id) continue
          if (!adminClassesByAdminId.has(row.admin_id)) {
            adminClassesByAdminId.set(row.admin_id, new Set())
          }
          adminClassesByAdminId.get(row.admin_id).add(row.class_id)
        }
      }
    }
    return { loaded: true, profileById, adminClassesByAdminId }
  } catch {
    return { loaded: false, profileById, adminClassesByAdminId }
  }
}

export async function dispatchPushNotification(req, body = {}) {
  const { url: supabaseUrl } = getSupabaseEnv()
  const branding = await fetchAppBranding(req)
  const title = body.title || `📢 ${branding.appName} Notification`
  const messageBody = body.body || 'New announcement available.'
  const category = body.category || 'announcement'
  const targetClassId = body.classId || body.class_id || null
  const targetEndpoint = body.targetEndpoint || null
  const targetUserId = body.targetUserId || body.target_user_id || null
  const rawTargetUserIds = Array.isArray(body.targetUserIds) ? body.targetUserIds : []
  const targetUserSet = new Set(
    [targetUserId, ...rawTargetUserIds].filter((id) => typeof id === 'string' && id.trim().length > 0)
  )
  const targetRoles = Array.isArray(body.targetRoles) ? body.targetRoles : null
  const targetUrl = body.url || '/dashboard'
  const eventId = (typeof body.id === 'string' && body.id.trim()) || randomUUID()

  const dedupeCacheKey = `${eventId}::${targetEndpoint || 'all'}`
  if (isDuplicateEventDispatch(dedupeCacheKey)) {
    console.log(`[WebPush Dedupe Skip]: Already dispatched event=${eventId}`)
    return {
      ok: true,
      deduplicated: true,
      eventId,
      sent: 0,
      failed: 0,
      totalTargets: 0,
      deliveries: [],
      errors: [],
    }
  }

  const directory = targetEndpoint
    ? { loaded: false, profileById: new Map(), adminClassesByAdminId: new Map() }
    : await fetchRecipientDirectory(req)

  // Collect all registered device subscriptions (multi-device per user preserved)
  const allSubsMap = new Map()
  const readHeaders = getSupabaseHeaders(req)

  if (supabaseUrl && readHeaders) {
    try {
      const resp = await fetch(
        `${supabaseUrl}/rest/v1/push_subscriptions?select=*&order=updated_at.desc`,
        { headers: readHeaders }
      )
      if (resp.ok) {
        const dbSubs = await resp.json()
        if (Array.isArray(dbSubs)) {
          for (const s of dbSubs) {
            const norm = normalizeSubscription(s)
            if (norm) allSubsMap.set(norm.endpoint, norm)
          }
        }
      } else {
        console.warn('[Fetch DB Push Subscriptions Error]:', resp.status, await resp.text())
      }
    } catch (err) {
      console.warn('[Fetch DB Push Subscriptions Warning]:', err.message)
    }
  }

  // Merge local dev cache
  for (const s of getLocalSubscriptions()) {
    const norm = normalizeSubscription(s)
    if (norm && !allSubsMap.has(norm.endpoint)) {
      allSubsMap.set(norm.endpoint, norm)
    }
  }

  const allSubs = Array.from(allSubsMap.values())

  // Filter eligible recipients strictly across ALL their registered devices:
  // 1) targetEndpoint (single-device self push test)
  // 2) Require known authenticated user profile when directory loaded (never leak private alerts to unbound anonymous endpoints)
  // 3) targetRoles (admin/finance-only notifications)
  // 4) targetUserSet (user-targeted receipts, targets, reminders, congrats)
  // 5) targetClassId (class notifications verified against profile.class_id / class_admins, not trustable stale sub.class_id alone)
  const targetSubs = allSubs.filter((sub) => {
    if (targetEndpoint) return sub.endpoint === targetEndpoint
    if (!sub.user_id) return false

    const profile = directory.loaded ? directory.profileById.get(sub.user_id) : null
    if (directory.loaded && !profile) return false

    if (targetRoles && targetRoles.length > 0) {
      if (!profile || !targetRoles.includes(profile.role)) return false
    }
    if (targetUserSet.size > 0) {
      if (!targetUserSet.has(sub.user_id)) return false
    }
    if (targetClassId && targetUserSet.size === 0 && !(targetRoles && targetRoles.length > 0)) {
      if (profile) {
        if (profile.role === 'super_admin' || profile.role === 'finance_manager') {
          return !sub.class_id || sub.class_id === targetClassId
        }
        if (profile.role === 'admin') {
          const managed = directory.adminClassesByAdminId.get(sub.user_id)
          return Boolean(managed?.has(targetClassId) || profile.class_id === targetClassId)
        }
        return profile.class_id === targetClassId
      }
      return !sub.class_id || sub.class_id === targetClassId
    }
    return true
  })

  const pushTimestamp = Date.now()
  const pushData = JSON.stringify({
    id: eventId,
    tag: `cb-${eventId}`,
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
    timestamp: pushTimestamp,
  })

  console.log(
    `[WebPush Dispatch Start] event=${eventId} category=${category} targets=${targetSubs.length} class=${targetClassId || 'all'}`
  )

  const deliveries = await Promise.all(targetSubs.map((sub) => sendWithRetry(sub, pushData, eventId)))

  let sentCount = 0
  let failedCount = 0
  const staleEndpoints = []
  const errors = []

  deliveries.forEach((result, idx) => {
    if (result.ok) {
      sentCount++
    } else {
      failedCount++
      if (result.permanentGone && targetSubs[idx]?.endpoint) {
        staleEndpoints.push(targetSubs[idx].endpoint)
      }
      errors.push({
        endpoint: result.endpointHint,
        statusCode: result.statusCode,
        message: result.message,
        body: result.body,
      })
    }
  })

  // Remove permanently expired/unregistered tokens safely
  if (staleEndpoints.length > 0) {
    const remaining = allSubs.filter((s) => !staleEndpoints.includes(s.endpoint))
    saveLocalSubscriptions(remaining)

    if (supabaseUrl && readHeaders) {
      for (const ep of staleEndpoints) {
        try {
          await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(ep)}`, {
            method: 'DELETE',
            headers: readHeaders,
          })
        } catch {}
      }
    }
    console.log(`[WebPush Cleanup]: Removed ${staleEndpoints.length} expired/unregistered endpoints`)
  }

  console.log(
    `[WebPush Dispatch Done] event=${eventId} sent=${sentCount} failed=${failedCount} removedStale=${staleEndpoints.length} totalTargets=${targetSubs.length}`
  )

  return {
    ok: targetSubs.length === 0 || sentCount > 0,
    eventId,
    sent: sentCount,
    failed: failedCount,
    removedStale: staleEndpoints.length,
    totalTargets: targetSubs.length,
    deliveries,
    errors: errors.slice(0, 5),
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

  const url = new URL(req.url || '/api/push', 'http://localhost:5173')
  const pathname = url.pathname
  const action = url.searchParams.get('action')

  // 1. GET /api/push/vapid or GET /api/push - Returns public VAPID key
  if (req.method === 'GET' && (pathname === '/api/push/vapid' || pathname === '/api/push' || action === 'vapid')) {
    return res.status(200).json({ ok: true, publicKey: VAPID_PUBLIC_KEY })
  }

  const body = req.method === 'POST' ? await parseJsonBody(req) : {}

  // 2. Subscribe / refresh device endpoint (never overwrites other devices or wipes logged-out owner)
  const isSubscribeRequest =
    req.method === 'POST' &&
    (pathname.endsWith('/subscribe') || action === 'subscribe' || body.action === 'subscribe')

function resolveSubscribedClassId(caller, body) {
  const requested = body.classId || body.class_id || null
  if (caller.isServiceRole) return requested
  if (caller.role === 'student') {
    return caller.classId || null
  }
  if (caller.role === 'admin') {
    if (requested && caller.adminClassIds.includes(requested)) return requested
    return caller.adminClassIds.length === 1 ? caller.adminClassIds[0] : null
  }
  return requested
}

async function authorizeDispatch(req, caller, body) {
  if (!caller.ok) {
    return { allowed: false, status: 401, error: 'Unauthorized: Valid session required to dispatch push notifications' }
  }
  if (caller.isServiceRole) return { allowed: true }

  const targetEndpoint = body.targetEndpoint || null
  const targetClassId = body.classId || body.class_id || null
  const targetRoles = Array.isArray(body.targetRoles) ? body.targetRoles : null
  const targetUserId = body.targetUserId || body.target_user_id || null
  const rawTargetUserIds = Array.isArray(body.targetUserIds) ? body.targetUserIds : []

  if (targetEndpoint) {
    if (caller.role === 'super_admin' || caller.role === 'admin' || caller.role === 'finance_manager') {
      return { allowed: true }
    }
    // Non-admin can only test their own subscribed device endpoint
    const { url: supabaseUrl } = getSupabaseEnv()
    const headers = getSupabaseHeaders(req)
    if (supabaseUrl && headers) {
      try {
        const resp = await fetch(
          `${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(targetEndpoint)}&select=user_id&limit=1`,
          { headers }
        )
        if (resp.ok) {
          const rows = await resp.json()
          if (rows?.[0]?.user_id === caller.userId) return { allowed: true }
        }
      } catch {}
    }
    return { allowed: false, status: 403, error: 'Forbidden: Cannot target another device endpoint' }
  }

  if (caller.role === 'student') {
    const isOwnClassComment =
      body.category === 'news' &&
      Boolean(caller.classId) &&
      targetClassId === caller.classId &&
      !targetRoles?.length &&
      !targetUserId &&
      rawTargetUserIds.length === 0
    if (!isOwnClassComment) {
      return { allowed: false, status: 403, error: 'Forbidden: Students can only trigger own-class comment notifications' }
    }
    return { allowed: true }
  }

  if (caller.role === 'admin') {
    if (targetClassId && !targetRoles?.length && !caller.adminClassIds.includes(targetClassId)) {
      return { allowed: false, status: 403, error: 'Forbidden: You do not administer this class' }
    }
    if (!targetClassId && !targetRoles?.length && !targetUserId && rawTargetUserIds.length === 0) {
      if (caller.adminClassIds.length === 1) {
        body.classId = caller.adminClassIds[0]
      } else {
        return { allowed: false, status: 403, error: 'Forbidden: Class admins must scope broadcasts to an assigned class' }
      }
    }
  }

  return { allowed: true }
}

  if (isSubscribeRequest) {
    const rawSub = body.subscription || body
    const normalized = normalizeSubscription(rawSub)

    if (!normalized) {
      return res.status(400).json({ error: 'Invalid push subscription payload. Missing endpoint or keys.' })
    }

    // Only trust user_id & class_id bindings backed by verified Supabase Auth JWT (or service role).
    // Prevents unauthenticated callers from claiming or snooping another user's/class's private notifications.
    const verifiedCaller = await resolveVerifiedCaller(req)
    const previousEndpoint =
      typeof body.previousEndpoint === 'string' && body.previousEndpoint.trim()
        ? body.previousEndpoint.trim()
        : null

    normalized.user_id = verifiedCaller.isServiceRole
      ? body.userId || body.user_id || null
      : verifiedCaller.ok
      ? verifiedCaller.userId
      : null
    normalized.class_id = verifiedCaller.ok ? resolveSubscribedClassId(verifiedCaller, body) : null
    normalized.user_agent = req.headers?.['user-agent'] || null
    normalized.updated_at = new Date().toISOString()

    const { url: supabaseUrl } = getSupabaseEnv()
    const dbHeaders = getSupabaseHeaders(req, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    })

    // Preserve existing ownership ONLY when unauthenticated (e.g. `pushsubscriptionchange` in SW, logged-out boot).
    // Never inherit a prior user's class_id onto an authenticated caller (e.g. Super Admin signing in after Student).
    if (supabaseUrl && dbHeaders && !verifiedCaller.ok) {
      const lookupEndpoints = [normalized.endpoint, previousEndpoint].filter(
        (ep, i, arr) => Boolean(ep) && arr.indexOf(ep) === i
      )
      for (const lookupEp of lookupEndpoints) {
        try {
          const prevResp = await fetch(
            `${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(lookupEp)}&select=user_id,class_id&limit=1`,
            { headers: dbHeaders }
          )
          if (prevResp.ok) {
            const prevRows = await prevResp.json()
            const prev = Array.isArray(prevRows) ? prevRows[0] : null
            if (prev) {
              normalized.user_id = prev.user_id || null
              normalized.class_id = prev.class_id || null
              if (normalized.user_id) break
            }
          }
        } catch {}
      }
    }

    // Update local file cache (local dev fallback)
    const currentSubs = getLocalSubscriptions()
    const existingLocal = currentSubs.find(
      (s) => s.endpoint === normalized.endpoint || (previousEndpoint && s.endpoint === previousEndpoint)
    )
    if (!verifiedCaller.ok && existingLocal) {
      normalized.user_id = normalized.user_id || existingLocal.user_id || null
      normalized.class_id = normalized.class_id || existingLocal.class_id || null
    }
    const filtered = currentSubs.filter(
      (s) => s.endpoint !== normalized.endpoint && s.endpoint !== previousEndpoint
    )
    filtered.push(normalized)
    saveLocalSubscriptions(filtered)

    let dbSaved = false
    let dbError = null

    if (supabaseUrl && dbHeaders) {
      try {
        const upsertResp = await fetch(
          `${supabaseUrl}/rest/v1/push_subscriptions?on_conflict=endpoint`,
          {
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
          }
        )
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

    // Clean up ONLY the replaced previousEndpoint rotated by this same browser instance
    if (supabaseUrl && dbHeaders && previousEndpoint && previousEndpoint !== normalized.endpoint) {
      try {
        await fetch(
          `${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(previousEndpoint)}`,
          { method: 'DELETE', headers: dbHeaders }
        )
      } catch {}
    }

    return res.status(200).json({
      ok: true,
      dbSaved,
      dbError,
      preservedUserId: normalized.user_id,
      preservedClassId: normalized.class_id,
      message: 'Device push subscription registered',
    })
  }

  // 3. POST /api/push or /api/push/send - Dispatches background push notifications
  if (req.method === 'POST') {
    const { url: supabaseUrl, serviceKey, anonKey } = getSupabaseEnv()
    if (supabaseUrl && (serviceKey || anonKey)) {
      const caller = await resolveVerifiedCaller(req)
      const authz = await authorizeDispatch(req, caller, body)
      if (!authz.allowed) {
        return res.status(authz.status || 403).json({ error: authz.error })
      }
    }
    const result = await dispatchPushNotification(req, body)
    return res.status(result.ok ? 200 : 502).json(result)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
