import { supabase } from '../../lib/supabase'
import { playWhatsAppChime } from './notificationAudio'
import type { PushNotificationPayload, StoredNotification } from './notificationTypes'

export const NOTIFICATION_CHANNEL = 'classbank_live_notifications'

// Track IDs sent from THIS exact browser tab so this tab doesn't double-alert itself,
// while all other users AND other devices receive notifications normally.
const localSentIds = new Set<string>()

export function isLocalSentNotification(id?: string): boolean {
  return Boolean(id && localSentIds.has(id))
}

export function markLocalSentNotification(id: string): void {
  if (id) localSentIds.add(id)
}

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

function resolveNotificationAppLogo(): string {
  if (typeof document !== 'undefined') {
    const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
    const href = iconLink?.getAttribute('href') || ''
    if (
      href &&
      href !== '/custom-logo.png' &&
      href !== '/icons/icon-192.png' &&
      href !== '/classBankLogo.png' &&
      !href.startsWith('data:') &&
      !href.startsWith('blob:')
    ) {
      return href
    }
  }
  // Default fast-loading 192x192 crisp PNG derived from application logo
  return '/icons/notif-logo-192.png'
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied'
  try {
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      const appName = (typeof document !== 'undefined' && document.title) || 'ClassBank'
      await triggerSystemNotification({
        id: generateUUID(),
        title: `🔔 ${appName} Notifications Enabled`,
        body: 'You will now receive instant alerts on this device even before opening the app.',
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
  // Always play chime for instant foreground audio alert
  playWhatsAppChime()

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return
  }

  const iconUrl = resolveNotificationAppLogo()
  const badgeUrl = '/icons/notif-badge-96.png'
  const targetUrl =
    payload.url || (typeof window !== 'undefined' ? window.location.origin + '/dashboard' : '/dashboard')
  const notifTag = payload.id ? `classbank_${payload.id}` : `classbank_${Date.now()}`

  // 1. Post to active Service Worker controller
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'PUSH_NOTIFICATION',
        payload: { ...payload, icon: iconUrl, badge: badgeUrl, url: targetUrl, id: notifTag },
      })
      return
    } catch {}
  }

  // 2. Try service worker ready showNotification
  if ('serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((res) => setTimeout(() => res(null), 2500)),
      ])
      if (reg && reg.showNotification) {
        await reg.showNotification(payload.title, {
          body: payload.body,
          icon: iconUrl,
          badge: badgeUrl,
          tag: notifTag,
          vibrate: [300, 150, 300, 150, 400],
          data: { url: targetUrl, id: payload.id },
          renotify: true,
          requireInteraction: true,
          silent: false,
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
      tag: notifTag,
      requireInteraction: true,
      silent: false,
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
    await supabase.from('notifications').delete().is('class_id', null)
  } catch (err) {
    console.error('[Database Notifications Clear Exception]:', err)
  }
}

export async function broadcastClearAll(classId?: string | null, userId?: string | null): Promise<void> {
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
      payload: { classId, userId },
    })
  } catch (err) {
    console.warn('[Broadcast Clear All Notice]:', err)
  }
}

export async function broadcastDeleteNotification(id: string, userId?: string | null): Promise<void> {
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
      payload: { id, userId },
    })
  } catch (err) {
    console.warn('[Broadcast Delete Notice]:', err)
  }
}

export async function dispatchWebPushApi(
  payload: PushNotificationPayload & { targetEndpoint?: string | null }
): Promise<{ sent: number; totalTargets: number } | null> {
  try {
    let accessToken: string | null = null
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      accessToken = sessionData.session?.access_token || null
    } catch {}

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`

    const resp = await fetch('/api/push', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...payload,
        url: payload.url || '/dashboard',
      }),
    })

    const ct = resp.headers.get('content-type') || ''
    if (resp.ok && ct.includes('application/json')) {
      const resData = await resp.json()
      console.log('[WebPush API Result]:', resData)
      return { sent: resData.sent ?? 0, totalTargets: resData.totalTargets ?? 0 }
    }
  } catch (err: any) {
    console.warn('[WebPush Dispatch Notice]:', err?.message || err)
  }
  return null
}

export async function broadcastPushNotification(payload: PushNotificationPayload): Promise<void> {
  const notifId = isValidUUID(payload.id) ? payload.id! : generateUUID()
  const validClassId = isValidUUID(payload.classId) ? payload.classId : null

  let senderId = payload.senderId
  if (!senderId) {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      senderId = sessionData.session?.user?.id
    } catch {}
  }

  const cleanPayload: PushNotificationPayload = {
    ...payload,
    id: notifId,
    senderId,
    classId: validClassId,
    url: payload.url || '/dashboard',
  }

  // Prevent this exact sender tab from self-popping on its own broadcast
  markLocalSentNotification(notifId)

  // 1. Save directly into Supabase database table (triggers postgres_changes to open tabs)
  await persistNotification(cleanPayload)

  // 2. Dispatch Mobile & Desktop Background Web Push (wakes closed phones BEFORE app opens!)
  await dispatchWebPushApi(cleanPayload)

  // 3. Broadcast via Supabase Realtime WebSocket for instant foreground chime on other open devices
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
