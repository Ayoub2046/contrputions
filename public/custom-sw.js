// Custom Service Worker fallback script for ClassBank PWA
// Pure W3C Web Push handler — delivers independent, stackable push notifications when app is closed!

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

async function showStackableNotification(data) {
  const now = Date.now()
  const title = data.title || (data.appName ? `${data.appName} Notification` : 'ClassBank Notification')

  // Intentionally omit `tag` and `renotify` so Android Chrome always stacks every notification independently.
  const options = {
    body: data.body || 'You have a new update.',
    icon: data.icon || '/icons/notif-logo-192.png',
    badge: data.badge || '/icons/notif-badge-96.png',
    vibrate: Array.isArray(data.vibrate) ? data.vibrate : [300, 150, 300, 150, 400],
    requireInteraction: false,
    silent: false,
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : now,
    data: {
      url: data.url || '/dashboard',
      id: data.id,
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

  event.waitUntil(showStackableNotification(data))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = event.notification.data?.url || '/dashboard'
  const targetUrl = new URL(rawUrl, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && !client.url.includes(rawUrl)) {
            return client.navigate(targetUrl).then((c) => (c ? c.focus() : client.focus()))
          }
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
    const payload = event.data.payload || {}
    event.waitUntil(showStackableNotification(payload))
  }
})
