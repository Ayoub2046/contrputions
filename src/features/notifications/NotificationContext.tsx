import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  triggerSystemNotification,
  broadcastPushNotification,
  fetchNotificationsList,
  deleteNotificationFromDB,
  clearAllNotificationsFromDB,
  generateUUID,
  NOTIFICATION_CHANNEL,
  broadcastClearAll,
  broadcastDeleteNotification,
} from './notificationService'
import {
  requestFcmToken,
  getStoredFcmToken,
  setupFcmForegroundListener,
} from './firebaseMessaging'
import { subscribeToWebPush } from './webPushService'
import type { PushNotificationPayload, StoredNotification, NotificationCategory } from './notificationTypes'

interface NotificationContextType {
  permission: NotificationPermission
  isSupported: boolean
  fcmToken: string | null
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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, activeClassId } = useAuth()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [fcmToken, setFcmToken] = useState<string | null>(getStoredFcmToken())
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [activeBanner, setActiveBanner] = useState<PushNotificationPayload | null>(null)

  // Track notifications already shown to avoid duplicate popups/chimes
  const seenIdsRef = useRef<Set<string>>(new Set())
  // Track notifications explicitly dismissed by the user in this session
  const dismissedIdsRef = useRef<Set<string>>(new Set())

  // Initialize permission status & FCM Token if granted
  useEffect(() => {
    setIsSupported(isNotificationSupported())
    const currentPerm = getNotificationPermission()
    setPermission(currentPerm)

    if (currentPerm === 'granted') {
      subscribeToWebPush(user?.id, activeClassId || user?.class_id)
      requestFcmToken(user?.id).then((token) => {
        if (token) setFcmToken(token)
      })
    }
  }, [user?.id, activeClassId, user?.class_id])

  // Setup Firebase foreground listener
  useEffect(() => {
    let unsub: (() => void) | null = null
    setupFcmForegroundListener((notif) => {
      setActiveBanner(notif)
      setNotifications((prev) => [
        { ...notif, read: false },
        ...prev.filter((p) => p.id !== notif.id),
      ])
    }).then((fn) => {
      unsub = fn
    })

    return () => {
      if (unsub) unsub()
    }
  }, [])

  // Fetch notifications initially and populate seen IDs
  const refreshNotifications = useCallback(async () => {
    const list = await fetchNotificationsList(activeClassId || user?.class_id)
    // Filter out any dismissed IDs
    const active = list.filter((n) => !dismissedIdsRef.current.has(n.id))
    setNotifications(active)
    for (const item of active) {
      seenIdsRef.current.add(item.id)
    }
  }, [activeClassId, user?.class_id])

  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications])

  // Helper to process an incoming notification for this user
  const handleIncomingNotification = useCallback(
    async (notif: PushNotificationPayload) => {
      if (!notif || !notif.id) return

      // Don't show if dismissed by user
      if (dismissedIdsRef.current.has(notif.id)) return

      // Don't show duplicate popup if already seen
      if (seenIdsRef.current.has(notif.id)) return
      seenIdsRef.current.add(notif.id)

      // Filter by class if specific target class is set and user is in a class
      const userClass = activeClassId || user?.class_id
      if (notif.classId && userClass && notif.classId !== userClass && user?.role === 'student') {
        return
      }

      // 1. Play chime & trigger native OS notification
      await triggerSystemNotification(notif)

      // 2. Show in-app floating banner
      setActiveBanner(notif)

      // 3. Update in-memory state
      setNotifications((prev) => [
        { ...notif, read: false },
        ...prev.filter((p) => p.id !== notif.id),
      ])
    },
    [activeClassId, user]
  )

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
      // 1. Live Postgres replication for newly inserted notifications
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
      // 2. Live Postgres replication for deleted notifications
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
      // 3. Client-to-client broadcast for instant cross-device notification alerts
      .on('broadcast', { event: 'push_event' }, async ({ payload }: any) => {
        if (payload) {
          await handleIncomingNotification(payload as PushNotificationPayload)
        }
      })
      // 4. Instant Realtime synchronization for clearing all notifications
      .on('broadcast', { event: 'clear_all' }, ({ payload }: any) => {
        const targetClass = payload?.classId
        const userClass = activeClassId || user?.class_id
        if (!targetClass || targetClass === userClass || user?.role === 'super_admin') {
          setNotifications([])
        }
      })
      // 5. Instant Realtime synchronization for individual deleted notification
      .on('broadcast', { event: 'delete_notification' }, ({ payload }: any) => {
        if (payload?.id) {
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
  }, [handleIncomingNotification, refreshNotifications, activeClassId, user])

  // Periodic and Visibility-Change Database Sync (Guaranteed delivery if phone was locked or offline)
  useEffect(() => {
    let isMounted = true

    async function syncDatabaseNotifications() {
      try {
        const userClass = activeClassId || user?.class_id
        const list = await fetchNotificationsList(userClass)
        if (!isMounted || !list || list.length === 0) return

        const now = Date.now()
        for (const item of list) {
          if (dismissedIdsRef.current.has(item.id)) continue

          const ageMs = now - new Date(item.createdAt).getTime()
          // If within last 30 minutes and not yet popped up on this device
          if (ageMs < 30 * 60 * 1000 && !seenIdsRef.current.has(item.id)) {
            await handleIncomingNotification(item)
          }
        }

        // Keep state aligned with database
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((p) => p.id))
          const freshItems = list.filter((l) => !existingIds.has(l.id) && !dismissedIdsRef.current.has(l.id))
          if (freshItems.length === 0) return prev
          return [...freshItems, ...prev]
        })
      } catch {}
    }

    // Sync on tab visibility change (e.g. unlocking phone or switching back to app)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncDatabaseNotifications()
        if (Notification.permission === 'granted') {
          subscribeToWebPush(user?.id, activeClassId || user?.class_id).catch(() => {})
        }
      }
    }
    const onWindowFocus = () => {
      syncDatabaseNotifications()
      if (Notification.permission === 'granted') {
        subscribeToWebPush(user?.id, activeClassId || user?.class_id).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onWindowFocus)

    // Sync every 8 seconds in background for guaranteed delivery
    const timer = setInterval(syncDatabaseNotifications, 8000)

    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onWindowFocus)
      clearInterval(timer)
    }
  }, [activeClassId, user, handleIncomingNotification])

  const dismissBanner = useCallback(() => {
    setActiveBanner(null)
  }, [])

  const handleRequestPermission = useCallback(async () => {
    const perm = await requestNotificationPermission()
    setPermission(perm)
    if (perm === 'granted') {
      await subscribeToWebPush(user?.id, activeClassId || user?.class_id)
      const token = await requestFcmToken(user?.id)
      if (token) setFcmToken(token)
    }
    return perm
  }, [user?.id, activeClassId, user?.class_id])

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
      }

      // Mark as seen on this sender device
      seenIdsRef.current.add(payload.id)

      // Broadcast to all other devices & save to Supabase
      await broadcastPushNotification(payload)

      // Add to sender's notification bell list without triggering disruptive popup
      setNotifications((prev) => [
        { ...payload, read: true },
        ...prev.filter((p) => p.id !== payload.id),
      ])
    },
    [user]
  )

  const markAllAsRead = useCallback(async () => {
    // Collect all notification IDs and register as dismissed in session
    notifications.forEach((n) => dismissedIdsRef.current.add(n.id))
    setNotifications([])

    const targetClass = activeClassId || user?.class_id
    // Delete from Supabase database
    await clearAllNotificationsFromDB(targetClass)
    // Synchronize in real time with all other tabs and devices
    await broadcastClearAll(targetClass)
  }, [activeClassId, user?.class_id, notifications])

  const markAsRead = useCallback(async (id: string) => {
    dismissedIdsRef.current.add(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    // Delete from Supabase database
    await deleteNotificationFromDB(id)
    // Synchronize in real time with all other tabs and devices
    await broadcastDeleteNotification(id)
  }, [])

  const testNotification = useCallback(async () => {
    const sample: PushNotificationPayload = {
      id: generateUUID(),
      title: '📢 ClassBank Notice',
      body: 'Live push notification test! You will see alerts like this in real time across all devices.',
      category: 'announcement',
      senderName: user?.name || 'ClassBank System',
      senderRole: user?.role || 'super_admin',
      createdAt: new Date().toISOString(),
    }
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
        fcmToken,
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
