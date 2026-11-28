import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Take control immediately so Android/desktop clients never stay stuck on an old SW
self.skipWaiting()

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// SPA navigation: prefer fresh HTML from network so newly deployed Landing Page & UI appear immediately,
// falling back cleanly to the precached shell when offline.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'app-html-shell',
      networkTimeoutSeconds: 3,
      plugins: [new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 86400 })],
    }),
    {
      denylist: [/^\/api\//, /^\/sw\.js$/, /^\/custom-sw\.js$/, /^\/firebase-messaging-sw\.js$/],
    }
  )
)

registerRoute(
  /\.(?:png|jpg|jpeg|webp)$/i,
  new CacheFirst({
    cacheName: 'app-images',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 2592000 })],
  }),
  'GET'
)

registerRoute(
  /^https?:\/\/.*\/rest\/v1\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 })],
  }),
  'GET'
)

// Track recently shown notification UUIDs ONLY to prevent double-showing the exact same alert
// from both foreground postMessage and Web Push within 30s. Never collapses distinct alerts!
const recentlyShownIds = new Map()

function markShownAndCheckDuplicate(id) {
  if (!id || typeof id !== 'string') return false
  const now = Date.now()
  for (const [k, ts] of recentlyShownIds.entries()) {
    if (now - ts > 30000) recentlyShownIds.delete(k)
  }
  if (recentlyShownIds.has(id)) return true
  recentlyShownIds.set(id, now)
  return false
}

const DELIVERED_CACHE_NAME = 'cb-delivered-notifs'

async function recordDeliveredInCache(eventId) {
  if (!eventId || typeof caches === 'undefined') return
  try {
    const cache = await caches.open(DELIVERED_CACHE_NAME)
    await cache.put(
      `/__cb_sw_delivered/${encodeURIComponent(String(eventId))}`,
      new Response(JSON.stringify({ ts: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const keys = await cache.keys()
    if (keys.length > 80) {
      await Promise.all(keys.slice(0, keys.length - 80).map((k) => cache.delete(k)))
    }
  } catch {}
}

async function displayIndependentNotification(payload, isDuplicate = false) {
  const title = payload.title || (payload.appName ? `${payload.appName} Notification` : 'ClassBank Notification')
  const now = Date.now()
  const rawEventId =
    (payload.id && String(payload.id).trim()) ||
    (payload.tag && String(payload.tag).trim()) ||
    (self.crypto?.randomUUID ? self.crypto.randomUUID() : `${now}-${Math.random().toString(36).slice(2)}`)

  // Use a strictly unique tag per event + renotify: true so Android Chrome stacks every
  // distinct notification independently; if exact same ID repeats, replace silently (renotify: false)
  // while ALWAYS calling showNotification() inside `push` to satisfy Chrome's userVisibleOnly policy.
  const uniqueTag = rawEventId.startsWith('cb-') ? rawEventId : `cb-${rawEventId}`

  const options = {
    body: payload.body || 'You have a new update.',
    icon: payload.icon || '/icons/notif-logo-192.png',
    badge: payload.badge || '/icons/notif-badge-96.png',
    vibrate: isDuplicate
      ? undefined
      : Array.isArray(payload.vibrate)
      ? payload.vibrate
      : [300, 150, 300, 150, 400],
    requireInteraction: false,
    silent: Boolean(isDuplicate),
    tag: uniqueTag,
    renotify: !isDuplicate,
    timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : now,
    data: {
      url: payload.url || '/dashboard',
      id: payload.id || rawEventId,
      timestamp: now,
    },
    actions: [{ action: 'open', title: 'Open App' }],
  }

  let shown = false
  try {
    await self.registration.showNotification(title, options)
    shown = true
  } catch {
    // Fallback without remote assets/actions in case an icon fetch fails offline
    try {
      await self.registration.showNotification(title, {
        body: options.body,
        icon: '/icons/notif-logo-192.png',
        badge: '/icons/notif-badge-96.png',
        vibrate: options.vibrate,
        silent: options.silent,
        tag: uniqueTag,
        renotify: options.renotify,
        data: options.data,
      })
      shown = true
    } catch {
      try {
        await self.registration.showNotification(title, {
          body: options.body,
          silent: options.silent,
          tag: uniqueTag,
          renotify: options.renotify,
          data: options.data,
        })
        shown = true
      } catch {}
    }
  }

  if (shown) {
    await recordDeliveredInCache(payload.id || rawEventId)
  }
}

async function notifyOpenClientsPushDelivered(payload) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clients) {
      client.postMessage({ type: 'SW_PUSH_DELIVERED', payload })
    }
  } catch {}
}

self.addEventListener('push', (event) => {
  let data = {
    title: 'ClassBank Alert',
    body: 'New class update available.',
    url: '/dashboard',
  }

  try {
    if (event.data) {
      data = event.data.json()
    }
  } catch {
    if (event.data) {
      data.body = event.data.text()
    }
  }

  const isDuplicate = Boolean(data.id && markShownAndCheckDuplicate(String(data.id)))

  event.waitUntil(
    Promise.all([
      displayIndependentNotification(data, isDuplicate),
      notifyOpenClientsPushDelivered(data),
    ])
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = event.notification.data?.url || '/dashboard'
  const notifId = event.notification.data?.id || null
  const targetUrl = new URL(rawUrl, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          try {
            if ('navigate' in client && !client.url.includes(rawUrl)) {
              const navigated = await client.navigate(targetUrl).catch(() => client)
              await (navigated ? navigated.focus() : client.focus())
              navigated?.postMessage({ type: 'SW_NOTIFICATION_CLICKED', payload: { id: notifId, url: rawUrl } })
              return
            }
          } catch {}
          await client.focus().catch(() => {})
          client.postMessage({ type: 'SW_NOTIFICATION_CLICKED', payload: { id: notifId, url: rawUrl } })
          return
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})

// Automatically renew Web Push subscription if Chrome/FCM rotates it in the background
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keyResp = await fetch('/api/push/vapid')
        if (!keyResp.ok) return
        const { publicKey } = await keyResp.json()
        if (!publicKey) return

        const padding = '='.repeat((4 - (publicKey.length % 4)) % 4)
        const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/')
        const rawData = atob(base64)
        const appServerKey = new Uint8Array(rawData.length)
        for (let i = 0; i < rawData.length; i++) {
          appServerKey[i] = rawData.charCodeAt(i)
        }

        const newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        })

        await fetch('/api/push?action=subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'subscribe',
            subscription: newSub.toJSON(),
            previousEndpoint: event.oldSubscription?.endpoint || null,
          }),
        })
      } catch {}
    })()
  )
})

// Listen to foreground notification messages triggered by the app UI
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
    const payload = event.data.payload || {}
    if (payload.id && markShownAndCheckDuplicate(String(payload.id))) {
      return
    }
    event.waitUntil(displayIndependentNotification(payload))
  } else if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
