// Custom Service Worker scripts for ClassBank PWA
// Handles background push notifications when browser/app is closed!

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

  const title = data.title || 'ClassBank Notification'
  const notifTag = data.tag || (data.id ? `classbank_${data.id}` : `classbank_${Date.now()}`)

  const options = {
    body: data.body || 'You have a new announcement from ClassBank.',
    icon: data.icon || '/custom-logo.png',
    badge: '/icons/badge-96.png', // Transparent monochrome icon for Android status bar
    image: data.image || '/custom-logo.png',
    vibrate: data.vibrate || [300, 150, 300, 150, 400],
    tag: notifTag,
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      url: data.url || '/dashboard',
      id: data.id,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open ClassBank' }
    ]
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// Listen to messages from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
    const payload = event.data.payload || {}
    const title = payload.title || 'ClassBank Notification'
    const notifTag = payload.id ? `classbank_${payload.id}` : `classbank_${Date.now()}`
    const options = {
      body: payload.body || 'New class announcement received.',
      icon: '/custom-logo.png',
      badge: '/icons/badge-96.png',
      image: '/custom-logo.png',
      vibrate: [300, 150, 300, 150, 400],
      data: { url: payload.url || '/dashboard', id: payload.id },
      renotify: true,
      requireInteraction: true,
      silent: false,
      tag: notifTag,
      actions: [
        { action: 'open', title: 'Open ClassBank' }
      ]
    }
    event.waitUntil(self.registration.showNotification(title, options))
  }
})

// Initialize Firebase messaging compat in service worker if online
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js')
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js')
  firebase.initializeApp({
    apiKey: "AIzaSyCl15fU_i_oe4cln4_P8JYDyMmfAw9sUGk",
    authDomain: "gen-lang-client-0499661664.firebaseapp.com",
    projectId: "gen-lang-client-0499661664",
    storageBucket: "gen-lang-client-0499661664.firebasestorage.app",
    messagingSenderId: "582138858269",
    appId: "1:582138858269:web:8bce82576766298b2a6ff4"
  })
  const messaging = firebase.messaging()
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'ClassBank Notification'
    const notifTag = payload.data?.id || `classbank_fcm_${Date.now()}`
    const options = {
      body: payload.notification?.body || payload.data?.body || 'New message from ClassBank',
      icon: '/custom-logo.png',
      badge: '/icons/badge-96.png',
      image: '/custom-logo.png',
      tag: notifTag,
      data: { url: payload.data?.url || '/dashboard' },
      vibrate: [300, 150, 300, 150, 400],
      renotify: true,
      requireInteraction: true,
      silent: false,
      actions: [
        { action: 'open', title: 'Open ClassBank' }
      ]
    }
    return self.registration.showNotification(title, options)
  })
} catch (e) {
  // Offline or blocked script
}
