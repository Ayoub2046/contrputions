// Custom Service Worker fallback script for ClassBank PWA
// Pure W3C Web Push handler — delivers independent, stackable push notifications when app is closed!

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

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

async function showStackableNotification(data, isDuplicate = false) {
  const now = Date.now()
  const title = data.title || (data.appName ? `${data.appName} Notification` : 'ClassBank Notification')
  const rawEventId =
    (data.id && String(data.id).trim()) ||
    (data.tag && String(data.tag).trim()) ||
    (self.crypto?.randomUUID ? self.crypto.randomUUID() : `${now}-${Math.random().toString(36).slice(2)}`)
  const uniqueTag = rawEventId.startsWith('cb-') ? rawEventId : `cb-${rawEventId}`

  const options = {
    body: data.body || 'You have a new update.',
    icon: data.icon || '/icons/notif-logo-192.png',
    badge: data.badge || '/icons/notif-badge-96.png',
    vibrate: isDuplicate
      ? undefined
      : Array.isArray(data.vibrate)
      ? data.vibrate
      : [300, 150, 300, 150, 400],
    requireInteraction: false,
    silent: Boolean(isDuplicate),
    tag: uniqueTag,
    renotify: !isDuplicate,
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : now,
    data: {
      url: data.url || '/dashboard',
      id: data.id || rawEventId,
      timestamp: now,
    },
    actions: [{ action: 'open', title: 'Open App' }],
  }

  let shown = false
  try {
    await self.registration.showNotification(title, options)
    shown = true
  } catch {
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
    await recordDeliveredInCache(data.id || rawEventId)
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
      showStackableNotification(data, isDuplicate),
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
    const payload = event.data.payload || {}
    if (payload.id && markShownAndCheckDuplicate(String(payload.id))) {
      return
    }
    event.waitUntil(showStackableNotification(payload))
  }
})
