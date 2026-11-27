import { supabase } from '../../lib/supabase'
import { playWhatsAppChime } from './notificationAudio'
import type { PushNotificationPayload, StoredNotification } from './notificationTypes'

export const NOTIFICATION_CHANNEL = 'classbank_live_notifications'

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function isValidUUID(str?: string | null): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

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
        id: generateUUID(),
        title: '🔔 ClassBank Notifications Enabled',
        body: 'You will now receive alerts for class news, contributions, and reminders in real time.',
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

  // Use custom-logo.png (the app's actual branded icon)
  const iconUrl = '/custom-logo.png'
  const badgeUrl = '/custom-logo.png'
  const targetUrl = payload.url || (typeof window !== 'undefined' ? window.location.origin + '/dashboard' : '/dashboard')

  // Resolve app name for notification title prefix
  const appName = document.title || 'ClassBank'

  // 1. Post to active Service Worker controller
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'PUSH_NOTIFICATION',
        payload: { ...payload, url: targetUrl, appName },
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
          badge: badgeUrl,
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
      badge: badgeUrl,
      tag: payload.id,
    } as NotificationOptions)
    notif.onclick = () => {
      window.focus()
      notif.close()
    }
  } catch (e) {
    console.warn('Window Notification fallback failed:', e)
  }
}

export async function persistNotification(payload: PushNotificationPayload): Promise<StoredNotification> {
  const notifId = isValidUUID(payload.id) ? payload.id! : generateUUID()
  const validClassId = isValidUUID(payload.classId) ? payload.classId : null

  const item: StoredNotification = {
    ...payload,
    id: notifId,
    classId: validClassId,
    read: false,
  }

  // Persist directly to Supabase public.notifications database table
  try {
    const { error } = await supabase.from('notifications').upsert(
      {
        id: notifId,
        title: payload.title,
        body: payload.body,
        type: payload.category || 'announcement',
        sender_name: payload.senderName || null,
        sender_role: payload.senderRole || null,
        class_id: validClassId,
        created_at: payload.createdAt || new Date().toISOString(),
      } as never,
      { onConflict: 'id' }
    )

    if (error) {
      console.warn('[Supabase DB Notification Error]:', error.message)
    } else {
      console.log('[Supabase DB Notification Saved]:', payload.title, notifId)
    }
  } catch (err) {
    console.error('[Supabase DB Notification Exception]:', err)
  }

  return item
}

export async function fetchNotificationsList(classId?: string | null): Promise<StoredNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60)

    if (error) {
      console.warn('[Supabase DB Notifications Fetch Error]:', error.message)
      return []
    }

    if (data && data.length > 0) {
      // Filter in memory for 100% reliable matching across all devices
      const userClass = classId && isValidUUID(classId) ? classId : null
      const filtered = data.filter((d: any) => {
        if (!d.class_id) return true // Global alert (visible to all classes)
        if (!userClass) return true // Admin / Super Admin (sees all classes)
        return d.class_id === userClass // Specific to user's class
      })

      return filtered.map((d: any) => ({
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
  } catch (err) {
    console.error('[Supabase DB Notifications Fetch Exception]:', err)
  }

  return []
}

export async function deleteNotificationFromDB(id: string): Promise<void> {
  if (!id || !isValidUUID(id)) return
  try {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) {
      console.warn('[Database Notifications Delete Error]:', error.message)
    }
  } catch (err) {
    console.error('[Database Notifications Delete Exception]:', err)
  }
}

export async function clearAllNotificationsFromDB(classId?: string | null): Promise<void> {
  try {
    if (classId && isValidUUID(classId)) {
      await supabase.from('notifications').delete().eq('class_id', classId)
    }
    // Also delete any global notifications
    await supabase.from('notifications').delete().is('class_id', null)
  } catch (err) {
    console.error('[Database Notifications Clear Exception]:', err)
  }
}

export async function broadcastClearAll(classId?: string | null): Promise<void> {
  try {
    const existingChannels = supabase.getChannels()
    let channel = existingChannels.find(
      (c: any) => c.topic === `realtime:${NOTIFICATION_CHANNEL}` || c.name === NOTIFICATION_CHANNEL
    )
    if (!channel) {
      channel = supabase.channel(NOTIFICATION_CHANNEL)
      channel.subscribe()
    }
    await channel.send({
      type: 'broadcast',
      event: 'clear_all',
      payload: { classId },
    })
  } catch (err) {
    console.warn('[Broadcast Clear All Notice]:', err)
  }
}

export async function broadcastDeleteNotification(id: string): Promise<void> {
  if (!id) return
  try {
    const existingChannels = supabase.getChannels()
    let channel = existingChannels.find(
      (c: any) => c.topic === `realtime:${NOTIFICATION_CHANNEL}` || c.name === NOTIFICATION_CHANNEL
    )
    if (!channel) {
      channel = supabase.channel(NOTIFICATION_CHANNEL)
      channel.subscribe()
    }
    await channel.send({
      type: 'broadcast',
      event: 'delete_notification',
      payload: { id },
    })
  } catch (err) {
    console.warn('[Broadcast Delete Notice]:', err)
  }
}

export async function broadcastPushNotification(payload: PushNotificationPayload): Promise<void> {
  const notifId = isValidUUID(payload.id) ? payload.id! : generateUUID()
  const validClassId = isValidUUID(payload.classId) ? payload.classId : null

  const cleanPayload: PushNotificationPayload = {
    ...payload,
    id: notifId,
    classId: validClassId,
  }

  // 1. Save directly into Supabase database table
  // This triggers postgres_changes event to all devices subscribed in realtime!
  await persistNotification(cleanPayload)

  // 2. Dispatch Mobile Background Web Push (Delivers popup to phones even when app is closed)
  try {
    fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanPayload),
    }).catch((err) => {
      console.warn('[WebPush Dispatch Notice]:', err.message)
    })
  } catch (err) {
    console.warn('[WebPush Dispatch Warning]:', err)
  }

  // 3. Broadcast to all active users via Supabase Realtime WebSocket for immediate auditory chime
  try {
    const existingChannels = supabase.getChannels()
    let channel = existingChannels.find(
      (c: any) => c.topic === `realtime:${NOTIFICATION_CHANNEL}` || c.name === NOTIFICATION_CHANNEL
    )

    if (!channel) {
      channel = supabase.channel(NOTIFICATION_CHANNEL)
      await new Promise<void>((resolve) => {
        channel!.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve()
        })
        setTimeout(resolve, 1500)
      })
    }

    await channel.send({
      type: 'broadcast',
      event: 'push_event',
      payload: cleanPayload,
    })
    console.log('[Realtime Broadcast Sent]:', cleanPayload.title)
  } catch (err) {
    console.warn('Realtime broadcast transmission notice:', err)
  }
}
