// Custom Service Worker scripts for ClassBank PWA
// Pure W3C Web Push handler — delivers independent, stackable push notifications when app is closed!

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
  const title = data.title || (data.appName ? `${data.appName} Notification` : 'ClassBank Notification')
  // ALWAYS generate a fresh unique tag so Android never collapses/replaces an earlier notification.
  // Using data.tag here would cause reuse of the same tag across pushes → only last one survives.
  const notifTag = `classbank_${data.id || 'msg'}_${now}_${Math.random().toString(36).slice(2, 6)}`

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

// Listen to foreground notification messages from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
    const payload = event.data.payload || {}
    const now = Date.now()
    const title = payload.title || 'ClassBank Notification'
    const notifTag = `classbank_${payload.id || 'msg'}_${now}_${Math.random().toString(36).slice(2, 6)}`
    const options = {
      body: payload.body || 'New class update received.',
      icon: payload.icon || '/icons/notif-logo-192.png',
      badge: payload.badge || '/icons/notif-badge-96.png',
      vibrate: [300, 150, 300, 150, 400],
      data: { url: payload.url || '/dashboard', id: payload.id },
      renotify: true,
      requireInteraction: false,
      silent: false,
      timestamp: now,
      tag: notifTag,
      actions: [{ action: 'open', title: 'Open App' }],
    }
    event.waitUntil(self.registration.showNotification(title, options))
  }
})
