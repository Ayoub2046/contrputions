import { supabase } from '../../lib/supabase'
import { playWhatsAppChime } from './notificationAudio'
import type { PushNotificationPayload, StoredNotification } from './notificationTypes'

const CHANNEL_NAME = 'classbank_push_channel'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied'
  try {
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      // Show confirmation push notification
      await triggerSystemNotification({
        id: 'welcome_' + Date.now(),
        title: '🔔 ClassBank Notifications Enabled',
        body: 'You will now receive WhatsApp-style alerts for class news, contributions, and reminders before opening the app.',
        category: 'system',
        createdAt: new Date().toISOString(),
      })
    }
    return perm
  } catch (err) {
    console.warn('Failed to request notification permission:', err)
    return Notification.permission
  }
}

export async function triggerSystemNotification(payload: PushNotificationPayload): Promise<void> {
  // Always play WhatsApp chime for instant auditory notification
  playWhatsAppChime()

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return
  }

  const iconUrl = '/icons/icon-192.png'
  const targetUrl = payload.url || (typeof window !== 'undefined' ? window.location.origin + '/dashboard' : '/dashboard')

  // 1. Post to active Service Worker controller
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'PUSH_NOTIFICATION',
        payload: { ...payload, url: targetUrl },
      })
      return
    } catch {}
  }

  // 2. Try service worker ready showNotification
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      if (reg && reg.showNotification) {
        await reg.showNotification(payload.title, {
          body: payload.body,
          icon: iconUrl,
          badge: iconUrl,
          tag: payload.id,
          vibrate: [200, 100, 200],
          data: { url: targetUrl },
          renotify: true,
        } as NotificationOptions)
        return
      }
    } catch {}
  }

  // 3. Fallback to Window Notification API
  try {
    const notif = new Notification(payload.title, {
      body: payload.body,
      icon: iconUrl,
      tag: payload.id,
    })
    notif.onclick = () => {
      window.focus()
      notif.close()
    }
  } catch (e) {
    console.warn('Window Notification fallback failed:', e)
  }
}

export async function persistNotification(payload: PushNotificationPayload): Promise<StoredNotification> {
  const item: StoredNotification = {
    ...payload,
    read: false,
  }

  // Persist directly to Supabase notifications database table
  try {
    await supabase.from('notifications').insert({
      id: payload.id,
      title: payload.title,
      body: payload.body,
      type: payload.category || 'announcement',
      sender_name: payload.senderName || null,
      sender_role: payload.senderRole || null,
      class_id: payload.classId || null,
      created_at: payload.createdAt,
    } as never)
  } catch {}

  return item
}

export async function fetchNotificationsList(classId?: string | null): Promise<StoredNotification[]> {
  try {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(40)
    if (classId) {
      query = query.or(`class_id.eq.${classId},class_id.is.null`)
    }
    const { data, error } = await query
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        title: d.title,
        body: d.body,
        category: d.type,
        senderName: d.sender_name,
        senderRole: d.sender_role,
        classId: d.class_id,
        createdAt: d.created_at,
        read: false,
      }))
    }
  } catch {}

  return []
}

export async function broadcastPushNotification(payload: PushNotificationPayload): Promise<void> {
  // 1. Save directly in Supabase database
  await persistNotification(payload)

  // 2. Broadcast publicly to all connected users via Supabase Realtime
  try {
    const existingChannels = supabase.getChannels()
    let channel = existingChannels.find(
      (c: any) => c.topic === `realtime:${CHANNEL_NAME}` || c.name === CHANNEL_NAME
    )

    if (!channel) {
      channel = supabase.channel(CHANNEL_NAME)
      await new Promise<void>((resolve) => {
        channel!.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve()
        })
        setTimeout(resolve, 2000)
      })
    }

    const sendStatus = await channel.send({
      type: 'broadcast',
      event: 'push_event',
      payload,
    })
    console.log('[Realtime Broadcast Delivered]:', sendStatus, payload.title)
  } catch (err) {
    console.warn('Realtime broadcast transmission notice:', err)
  }
}
