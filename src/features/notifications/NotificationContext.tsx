import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  triggerSystemNotification,
  broadcastPushNotification,
  dispatchWebPushApi,
  fetchNotificationsList,
  generateUUID,
  NOTIFICATION_CHANNEL,
  broadcastClearAll,
  broadcastDeleteNotification,
  isLocalSentNotification,
  markLocalSentNotification,
} from './notificationService'
import { subscribeToWebPush, getCurrentPushEndpoint } from './webPushService'
import type { PushNotificationPayload, StoredNotification, NotificationCategory } from './notificationTypes'

interface NotificationContextType {
  permission: NotificationPermission
  isSupported: boolean
  webPushReady: boolean
  notifications: StoredNotification[]
  unreadCount: number
  activeBanner: PushNotificationPayload | null
  dismissBanner: () => void
  requestPermission: () => Promise<NotificationPermission>
  broadcast: (data: { title: string; body: string; category?: NotificationCategory; classId?: string | null }) => Promise<void>
  markAllAsRead: () => void
  markAsRead: (id: string) => void
  testNotification: () => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

function getDismissedStorageKey(userId?: string | null) {
  return `classbank_dismissed_notifs_${userId || 'guest'}`
}

function loadDismissedIds(userId?: string | null): Set<string> {
  try {
    const raw = localStorage.getItem(getDismissedStorageKey(userId))
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return new Set(parsed)
    }
  } catch {}
  return new Set()
}

function saveDismissedIds(userId: string | null | undefined, ids: Set<string>) {
  try {
    // Keep only most recent 200 dismissed IDs to stay compact
    const arr = Array.from(ids).slice(-200)
    localStorage.setItem(getDismissedStorageKey(userId), JSON.stringify(arr))
  } catch {}
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, activeClassId, adminClassIds } = useAuth()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [webPushReady, setWebPushReady] = useState(false)
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [activeBanner, setActiveBanner] = useState<PushNotificationPayload | null>(null)

  const seenIdsRef = useRef<Set<string>>(new Set())
  const dismissedIdsRef = useRef<Set<string>>(loadDismissedIds(user?.id))
  const userRef = useRef(user)
  const activeClassIdRef = useRef(activeClassId)

  useEffect(() => {
    userRef.current = user
    activeClassIdRef.current = activeClassId
    dismissedIdsRef.current = loadDismissedIds(user?.id)
  }, [user, activeClassId])

  // Compute the appropriate push subscription class scope:
  // - Super admins & finance managers receive alerts from ALL classes (null).
  // - Multi-class admins receive alerts from ALL classes (null); single-class admin gets their class.
  // - Students receive alerts for their assigned class (or null if unassigned yet).
  const pushScopeClassId =
    user?.role === 'super_admin' || user?.role === 'finance_manager'
      ? null
      : user?.role === 'admin'
      ? adminClassIds.length === 1
        ? adminClassIds[0]
        : null
      : user?.class_id || activeClassId || null

  const syncPushRegistration = useCallback(async () => {
    if (getNotificationPermission() !== 'granted') return
    const sub = await subscribeToWebPush(user?.id, pushScopeClassId)
    setWebPushReady(Boolean(sub))
  }, [user?.id, pushScopeClassId])

  // Initialize permission status, subscribe to Web Push, and watch browser permission changes
  useEffect(() => {
    setIsSupported(isNotificationSupported())
    const currentPerm = getNotificationPermission()
    setPermission(currentPerm)

    if (currentPerm === 'granted') {
      syncPushRegistration()
    } else {
      setWebPushReady(false)
    }

    let permStatus: PermissionStatus | null = null
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((status) => {
          permStatus = status
          const onChange = () => {
            const newPerm = getNotificationPermission()
            setPermission(newPerm)
            if (newPerm === 'granted') {
              syncPushRegistration()
            } else {
              setWebPushReady(false)
            }
          }
          status.addEventListener('change', onChange)
        })
        .catch(() => {})
    }

    return () => {
      if (permStatus) {
        permStatus.onchange = null
      }
    }
  }, [syncPushRegistration])

  // Fetch notifications initially and populate seen IDs
  const refreshNotifications = useCallback(async () => {
    const filterClass =
      user?.role === 'student' ? user?.class_id || activeClassId : activeClassId || user?.class_id
    const list = await fetchNotificationsList(filterClass)
    const active = list.filter((n) => !dismissedIdsRef.current.has(n.id))
    setNotifications(active)
    for (const item of active) {
      seenIdsRef.current.add(item.id)
    }
  }, [activeClassId, user?.class_id, user?.role])

  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications])

  // Process an incoming notification from realtime or DB sync
  const handleIncomingNotification = useCallback(async (notif: PushNotificationPayload) => {
    if (!notif || !notif.id) return

    // Skip if user already dismissed this notification
    if (dismissedIdsRef.current.has(notif.id)) return

    // Skip if already seen in this tab
    if (seenIdsRef.current.has(notif.id)) return
    seenIdsRef.current.add(notif.id)

    const currUser = userRef.current
    const currClass = currUser?.role === 'student' ? currUser?.class_id || activeClassIdRef.current : activeClassIdRef.current || currUser?.class_id

    // Filter out notifications meant strictly for another class (for students)
    if (notif.classId && currClass && notif.classId !== currClass && currUser?.role === 'student') {
      return
    }

    // If this exact browser tab triggered the notification, add quietly without self-chime
    if (isLocalSentNotification(notif.id)) {
      return
    }

    // 1. Trigger auditory chime & OS notification
    await triggerSystemNotification(notif)

    // 2. Show in-app floating banner
    setActiveBanner(notif)

    // 3. Add to notification bell list
    setNotifications((prev) => [
      { ...notif, read: false },
      ...prev.filter((p) => p.id !== notif.id),
    ])
  }, [])

  // Realtime subscription: postgres_changes on notifications table + WebSocket broadcast
  useEffect(() => {
    const existing = supabase
      .getChannels()
      .find((c: any) => c.topic === `realtime:${NOTIFICATION_CHANNEL}` || c.name === NOTIFICATION_CHANNEL)
    if (existing) {
      supabase.removeChannel(existing)
    }

    const channel = supabase
      .channel(NOTIFICATION_CHANNEL)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        async (payload: any) => {
          const row = payload.new
          if (row && row.id) {
            const notif: PushNotificationPayload = {
              id: row.id,
              title: row.title,
              body: row.body,
              category: row.type || 'announcement',
              senderName: row.sender_name,
              senderRole: row.sender_role,
              classId: row.class_id,
              createdAt: row.created_at,
            }
            await handleIncomingNotification(notif)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload: any) => {
          const deletedId = payload.old?.id
          if (deletedId) {
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
          } else {
            refreshNotifications()
          }
        }
      )
      .on('broadcast', { event: 'push_event' }, async ({ payload }: any) => {
        if (payload) {
          await handleIncomingNotification(payload as PushNotificationPayload)
        }
      })
      .on('broadcast', { event: 'clear_all' }, ({ payload }: any) => {
        // Only clear across tabs/devices belonging to the same user
        if (payload?.userId && userRef.current?.id && payload.userId === userRef.current.id) {
          setNotifications((prev) => {
            prev.forEach((n) => dismissedIdsRef.current.add(n.id))
            saveDismissedIds(userRef.current?.id, dismissedIdsRef.current)
            return []
          })
        }
      })
      .on('broadcast', { event: 'delete_notification' }, ({ payload }: any) => {
        if (payload?.id && payload?.userId && userRef.current?.id && payload.userId === userRef.current.id) {
          dismissedIdsRef.current.add(payload.id)
          saveDismissedIds(userRef.current?.id, dismissedIdsRef.current)
          setNotifications((prev) => prev.filter((n) => n.id !== payload.id))
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime Channel Active]: notifications hub subscribed on', NOTIFICATION_CHANNEL)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [handleIncomingNotification, refreshNotifications])

  // Periodic & Visibility-Change Sync + Subscription Refresh
  useEffect(() => {
    let isMounted = true

    async function syncDatabaseNotifications() {
      try {
        const currUser = userRef.current
        const userClass = currUser?.role === 'student' ? currUser?.class_id || activeClassIdRef.current : activeClassIdRef.current || currUser?.class_id
        const list = await fetchNotificationsList(userClass)
        if (!isMounted || !list || list.length === 0) return

        const now = Date.now()
        for (const item of list) {
          if (dismissedIdsRef.current.has(item.id)) continue

          const ageMs = now - new Date(item.createdAt).getTime()
          if (ageMs < 30 * 60 * 1000 && !seenIdsRef.current.has(item.id)) {
            await handleIncomingNotification(item)
          }
        }

        setNotifications((prev) => {
          const existingIds = new Set(prev.map((p) => p.id))
          const freshItems = list.filter((l) => !existingIds.has(l.id) && !dismissedIdsRef.current.has(l.id))
          if (freshItems.length === 0) return prev
          return [...freshItems, ...prev]
        })
      } catch {}
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncDatabaseNotifications()
        syncPushRegistration()
      }
    }
    const onWindowFocus = () => {
      syncDatabaseNotifications()
      syncPushRegistration()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onWindowFocus)

    const timer = setInterval(syncDatabaseNotifications, 8000)

    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onWindowFocus)
      clearInterval(timer)
    }
  }, [handleIncomingNotification, syncPushRegistration])

  const dismissBanner = useCallback(() => {
    setActiveBanner(null)
  }, [])

  const handleRequestPermission = useCallback(async () => {
    const perm = await requestNotificationPermission()
    setPermission(perm)
    if (perm === 'granted') {
      await syncPushRegistration()
    }
    return perm
  }, [syncPushRegistration])

  const broadcast = useCallback(
    async (data: { title: string; body: string; category?: NotificationCategory; classId?: string | null }) => {
      const payload: PushNotificationPayload = {
        id: generateUUID(),
        title: data.title,
        body: data.body,
        category: data.category || 'announcement',
        senderId: user?.id,
        senderName: user?.name || 'Administrator',
        senderRole: user?.role || 'admin',
        classId: data.classId || null,
        createdAt: new Date().toISOString(),
        url: '/dashboard',
      }

      seenIdsRef.current.add(payload.id)
      markLocalSentNotification(payload.id)

      // Persist in database + send Web Push to all subscribed devices + send Realtime WebSocket
      await broadcastPushNotification(payload)

      setNotifications((prev) => [
        { ...payload, read: true },
        ...prev.filter((p) => p.id !== payload.id),
      ])
    },
    [user]
  )

  const markAllAsRead = useCallback(async () => {
    notifications.forEach((n) => dismissedIdsRef.current.add(n.id))
    saveDismissedIds(user?.id, dismissedIdsRef.current)
    setNotifications([])

    // Sync clear state across other tabs/devices belonging to THIS user without wiping other students' announcements
    await broadcastClearAll(activeClassId || user?.class_id, user?.id)
  }, [activeClassId, user?.class_id, user?.id, notifications])

  const markAsRead = useCallback(
    async (id: string) => {
      dismissedIdsRef.current.add(id)
      saveDismissedIds(user?.id, dismissedIdsRef.current)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      await broadcastDeleteNotification(id, user?.id)
    },
    [user?.id]
  )

  const testNotification = useCallback(async () => {
    const appName = (typeof document !== 'undefined' && document.title) || 'ClassBank'
    const sample: PushNotificationPayload = {
      id: generateUUID(),
      title: `📢 ${appName} Push Test`,
      body: 'Real background push notification is active! Even when the app is closed, alerts appear like WhatsApp.',
      category: 'announcement',
      senderName: user?.name || appName,
      senderRole: user?.role || 'super_admin',
      createdAt: new Date().toISOString(),
      url: '/dashboard',
    }

    // Attempt a real server-to-device Web Push for THIS device if subscribed
    const ep = await getCurrentPushEndpoint()
    if (ep) {
      const result = await dispatchWebPushApi({ ...sample, targetEndpoint: ep })
      if (result && result.sent > 0) {
        setActiveBanner(sample)
        setNotifications((prev) => [{ ...sample, read: false }, ...prev])
        return
      }
    }

    // Fallback to foreground/SW system notification
    await triggerSystemNotification(sample)
    setActiveBanner(sample)
    setNotifications((prev) => [{ ...sample, read: false }, ...prev])
  }, [user])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        permission,
        isSupported,
        webPushReady,
        notifications,
        unreadCount,
        activeBanner,
        dismissBanner,
        requestPermission: handleRequestPermission,
        broadcast,
        markAllAsRead,
        markAsRead,
        testNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return ctx
}
