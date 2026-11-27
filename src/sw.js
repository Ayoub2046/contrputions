import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
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

// SPA navigation fallback (exclude /api/* and static icons/files)
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//, /^\/sw\.js$/, /^\/custom-sw\.js$/, /^\/firebase-messaging-sw\.js$/],
  })
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

async function displayIndependentNotification(payload) {
  const title = payload.title || (payload.appName ? `${payload.appName} Notification` : 'ClassBank Notification')
  const now = Date.now()

  // IMPORTANT: Intentionally DO NOT set `tag` or `renotify`!
  // On Android Chrome, omitting `tag` guarantees every push creates a brand-new,
  // independent stacked notification card (never replacing or blocking earlier ones).
  const options = {
    body: payload.body || 'You have a new update.',
    icon: payload.icon || '/icons/notif-logo-192.png',
    badge: payload.badge || '/icons/notif-badge-96.png',
    vibrate: Array.isArray(payload.vibrate) ? payload.vibrate : [300, 150, 300, 150, 400],
    requireInteraction: false,
    silent: false,
    timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : now,
    data: {
      url: payload.url || '/dashboard',
      id: payload.id,
      timestamp: now,
    },
    actions: [{ action: 'open', title: 'Open App' }],
  }

  try {
    await self.registration.showNotification(title, options)
  } catch {
    // Fallback without remote assets/actions in case an icon fetch fails offline
    try {
      await self.registration.showNotification(title, {
        body: options.body,
        data: options.data,
      })
    } catch {}
  }
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

  if (data.id && markShownAndCheckDuplicate(String(data.id))) {
    return
  }

  event.waitUntil(displayIndependentNotification(data))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = event.notification.data?.url || '/dashboard'
  const targetUrl = new URL(rawUrl, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && !client.url.includes(rawUrl)) {
            return client.navigate(targetUrl).then((c) => (c ? c.focus() : client.focus()))
          }
          return client.focus()
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
