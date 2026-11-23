import { getToken, onMessage, type MessagePayload } from 'firebase/messaging'
import { getFirebaseMessaging, VAPID_KEY } from '../../lib/firebase'
import { playWhatsAppChime } from './notificationAudio'
import { triggerSystemNotification } from './notificationService'
import { supabase } from '../../lib/supabase'
import type { PushNotificationPayload } from './notificationTypes'

const FCM_TOKEN_STORAGE_KEY = 'classbank_fcm_device_token'

export async function requestFcmToken(userId?: string | null): Promise<string | null> {
  try {
    const messaging = await getFirebaseMessaging()
    if (!messaging) return null

    // Register firebase service worker if supported
    let swRegistration: ServiceWorkerRegistration | undefined
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      } catch (e) {
        console.warn('Service worker registration error:', e)
      }
    }

    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    })

    if (currentToken) {
      localStorage.setItem(FCM_TOKEN_STORAGE_KEY, currentToken)

      // Optionally save to Supabase user profile
      if (userId) {
        try {
          await supabase.from('profiles').update({ fcm_token: currentToken } as never).eq('id', userId)
        } catch {}
      }
      return currentToken
    } else {
      console.warn('No FCM registration token available. Request permission to generate one.')
      return null
    }
  } catch (err) {
    console.warn('An error occurred while retrieving FCM token:', err)
    return null
  }
}

export function getStoredFcmToken(): string | null {
  try {
    return localStorage.getItem(FCM_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export async function setupFcmForegroundListener(
  onNotificationReceived: (payload: PushNotificationPayload) => void
): Promise<(() => void) | null> {
  const messaging = await getFirebaseMessaging()
  if (!messaging) return null

  const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
    console.log('[FCM Foreground Message]:', payload)

    const notifPayload: PushNotificationPayload = {
      id: payload.messageId || `fcm_${Date.now()}`,
      title: payload.notification?.title || payload.data?.title || '📢 ClassBank Notification',
      body: payload.notification?.body || payload.data?.body || 'New class announcement received.',
      category: 'announcement',
      senderName: payload.data?.senderName || 'ClassBank',
      createdAt: new Date().toISOString(),
      url: payload.data?.url || '/dashboard',
    }

    // Play WhatsApp chime
    playWhatsAppChime()

    // Trigger local system notification popup
    triggerSystemNotification(notifPayload)

    // Call app listener to show WhatsApp floating banner
    onNotificationReceived(notifPayload)
  })

  return unsubscribe
}
