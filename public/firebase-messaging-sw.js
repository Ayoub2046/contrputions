// Firebase Cloud Messaging Service Worker for background push notifications
/* eslint-disable no-undef */
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

// Background message handler - triggers OS popup when app is closed or in background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background push received:', payload)

  const notificationTitle = payload.notification?.title || payload.data?.title || 'ClassBank Notification'
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New message from ClassBank',
    icon: '/custom-logo.png',
    badge: '/custom-logo.png',
    tag: payload.data?.id || 'classbank_fcm_' + Date.now(),
    data: {
      url: payload.data?.url || '/dashboard'
    },
    vibrate: [200, 100, 200],
    renotify: true
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
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
