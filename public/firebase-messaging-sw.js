// Standard Web Push Service Worker fallback
/* eslint-disable no-undef */

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
  } catch (e) {
    if (event.data) {
      data.body = event.data.text()
    }
  }

  const now = Date.now()
  const title = data.title || 'ClassBank Notification'
  const notifTag =
    data.tag ||
    `classbank_${data.id || 'msg'}_${now}_${Math.random().toString(36).slice(2, 6)}`

  const options = {
    body: data.body || 'You have a new update.',
    icon: data.icon || '/icons/notif-logo-192.png',
    badge: data.badge || '/icons/notif-badge-96.png',
    vibrate: data.vibrate || [300, 150, 300, 150, 400],
    tag: notifTag,
    renotify: true,
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

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = event.notification.data?.url || '/dashboard'
  const targetUrl = new URL(rawUrl, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
