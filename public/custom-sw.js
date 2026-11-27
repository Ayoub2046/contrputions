// Custom Service Worker scripts for ClassBank PWA
// Handles notification click and background interactions

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus()
          }
        }
      }
      // If no window is open or focusing specific URL, open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

self.addEventListener('push', (event) => {
  let data = { title: 'ClassBank Alert', body: 'New class update available.', url: '/dashboard' }
  try {
    if (event.data) {
      data = event.data.json()
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: '/custom-logo.png',
    badge: '/custom-logo.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/dashboard' },
    renotify: true,
    tag: data.id || 'classbank_push_' + Date.now(),
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Listen to messages from app to trigger system notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
    const payload = event.data.payload || {}
    const title = payload.title || 'ClassBank Notification'
    const options = {
      body: payload.body || 'New class announcement received.',
      icon: '/custom-logo.png',
      badge: '/custom-logo.png',
      vibrate: [200, 100, 200],
      data: { url: payload.url || '/dashboard' },
      renotify: true,
      tag: payload.id || 'classbank_msg_' + Date.now(),
    }
    event.waitUntil(self.registration.showNotification(title, options))
  }
})
