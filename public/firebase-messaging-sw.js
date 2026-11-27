// Firebase Cloud Messaging & Web Push Service Worker for background push notifications
/* eslint-disable no-undef */

// Handle standard Web Push events directly
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

// Handle notification clicks
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

// Try to initialize Firebase messaging compat if reachable
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js')
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js')

  const firebaseConfig = {
    apiKey: "AIzaSyCl15fU_i_oe4cln4_P8JYDyMmfAw9sUGk",
    authDomain: "gen-lang-client-0499661664.firebaseapp.com",
    projectId: "gen-lang-client-0499661664",
    storageBucket: "gen-lang-client-0499661664.firebasestorage.app",
    messagingSenderId: "582138858269",
    appId: "1:582138858269:web:8bce82576766298b2a6ff4"
  }

  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || payload.data?.title || 'ClassBank Notification'
    const notifTag = payload.data?.id || `classbank_fcm_${Date.now()}`
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'New message from ClassBank',
      icon: '/custom-logo.png',
      badge: '/icons/badge-96.png',
      image: '/custom-logo.png',
      tag: notifTag,
      data: {
        url: payload.data?.url || '/dashboard'
      },
      vibrate: [300, 150, 300, 150, 400],
      renotify: true,
      requireInteraction: true,
      silent: false,
      actions: [
        { action: 'open', title: 'Open ClassBank' }
      ]
    }

    return self.registration.showNotification(notificationTitle, notificationOptions)
  })
} catch (e) {
  // Offline
}
