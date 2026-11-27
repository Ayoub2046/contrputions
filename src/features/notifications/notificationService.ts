import { supabase } from '../../lib/supabase'
import { playWhatsAppChime } from './notificationAudio'
import type { PushNotificationPayload, StoredNotification } from './notificationTypes'

const CHANNEL_NAME = 'classbank_push_channel'

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
      console.error('[Supabase DB Notification Error]:', error.message)
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
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (classId && isValidUUID(classId)) {
      query = query.or(`class_id.eq.${classId},class_id.is.null`)
    }

    const { data, error } = await query
    if (error) {
      console.warn('[Supabase DB Notifications Fetch Error]:', error.message)
      return []
    }

    if (data && data.length > 0) {
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
  } catch (err) {
    console.error('[Supabase DB Notifications Fetch Exception]:', err)
  }

  return []
}

export async function deleteNotificationFromDB(id: string): Promise<void> {
  if (!id || !isValidUUID(id)) return
  try {
    await supabase.from('notifications').delete().eq('id', id)
  } catch (err) {
    console.error('[Supabase DB Notification Delete Error]:', err)
  }
}

export async function clearAllNotificationsFromDB(classId?: string | null): Promise<void> {
  try {
    let query = supabase.from('notifications').delete()
    if (classId && isValidUUID(classId)) {
      query = (query as any).or(`class_id.eq.${classId},class_id.is.null`)
    } else {
      query = (query as any).neq('id', '00000000-0000-0000-0000-000000000000') // delete all
    }
    await query
  } catch (err) {
    console.error('[Supabase DB Notifications Clear Error]:', err)
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
  await persistNotification(cleanPayload)

  // 2. Broadcast to all active users via Supabase Realtime WebSocket
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
      payload: cleanPayload,
    })
    console.log('[Realtime Broadcast Delivered]:', sendStatus, cleanPayload.title)
  } catch (err) {
    console.warn('Realtime broadcast transmission notice:', err)
  }
}
