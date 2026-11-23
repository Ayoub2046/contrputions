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
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/dashboard' },
    renotify: true,
    tag: data.id || 'classbank_push_' + Date.now(),
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})
