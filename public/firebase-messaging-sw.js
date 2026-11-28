// Standard Web Push Service Worker fallback with unique per-event notification tags
/* eslint-disable no-undef */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

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

  const now = Date.now()
  const rawEventId =
    (data.id && String(data.id).trim()) ||
    (data.tag && String(data.tag).trim()) ||
    (self.crypto?.randomUUID ? self.crypto.randomUUID() : `${now}-${Math.random().toString(36).slice(2)}`)
  const uniqueTag = rawEventId.startsWith('cb-') ? rawEventId : `cb-${rawEventId}`
  const title = data.title || 'ClassBank Notification'

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

  event.waitUntil(
    self.registration.showNotification(title, options).catch(() =>
      self.registration.showNotification(title, {
        body: options.body,
        tag: uniqueTag,
        renotify: true,
        data: options.data,
      })
    )
  )
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
