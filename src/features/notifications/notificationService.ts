import { supabase } from '../../lib/supabase'
import { playWhatsAppChime } from './notificationAudio'
import type { PushNotificationPayload, StoredNotification } from './notificationTypes'

const STORAGE_KEY = 'classbank_stored_notifications_v1'
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

  // Try service worker showNotification first (essential for mobile & background PWA)
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
    } catch {
      // Fall through to window Notification
    }
  }

  // Fallback to Window Notification API
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

export function getLocalStoredNotifications(): StoredNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalStoredNotifications(items: StoredNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)))
  } catch {}
}

export async function persistNotification(payload: PushNotificationPayload): Promise<StoredNotification> {
  const item: StoredNotification = {
    ...payload,
    read: false,
  }

  // 1. Save to local storage
  const current = getLocalStoredNotifications()
  const updated = [item, ...current.filter((x) => x.id !== payload.id)]
  saveLocalStoredNotifications(updated)

  // 2. Persist to Supabase if table exists
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
  const local = getLocalStoredNotifications()

  try {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30)
    if (classId) {
      query = query.or(`class_id.eq.${classId},class_id.is.null`)
    }
    const { data, error } = await query
    if (!error && data && data.length > 0) {
      const readIds = new Set(local.filter((l) => l.read).map((l) => l.id))
      const fromDb: StoredNotification[] = data.map((d: any) => ({
        id: d.id,
        title: d.title,
        body: d.body,
        category: d.type,
        senderName: d.sender_name,
        senderRole: d.sender_role,
        classId: d.class_id,
        createdAt: d.created_at,
        read: readIds.has(d.id),
      }))

      // Merge avoiding duplicates
      const dbIds = new Set(fromDb.map((x) => x.id))
      const merged = [...fromDb, ...local.filter((l) => !dbIds.has(l.id))]
      saveLocalStoredNotifications(merged)
      return merged
    }
  } catch {}

  if (classId) {
    return local.filter((x) => !x.classId || x.classId === classId)
  }
  return local
}

export async function broadcastPushNotification(payload: PushNotificationPayload): Promise<void> {
  // 1. Save locally and in Supabase
  await persistNotification(payload)

  // 2. Broadcast to all users connected to Supabase Realtime
  try {
    const channel = supabase.channel(CHANNEL_NAME)
    await channel.send({
      type: 'broadcast',
      event: 'push_event',
      payload,
    })
  } catch (err) {
    console.warn('Realtime broadcast notice:', err)
  }

  // 3. Trigger locally on sender device if permitted
  await triggerSystemNotification(payload)
}
