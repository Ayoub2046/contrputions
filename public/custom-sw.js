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

async function showStackableNotification(data) {
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
    vibrate: Array.isArray(data.vibrate) ? data.vibrate : [300, 150, 300, 150, 400],
    requireInteraction: false,
    silent: false,
    tag: uniqueTag,
    renotify: true,
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : now,
    data: {
      url: data.url || '/dashboard',
      id: data.id || rawEventId,
      timestamp: now,
    },
    actions: [{ action: 'open', title: 'Open App' }],
  }

  try {
    await self.registration.showNotification(title, options)
  } catch {
    try {
      await self.registration.showNotification(title, {
        body: options.body,
        tag: uniqueTag,
        renotify: true,
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

  event.waitUntil(showStackableNotification(data))
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
