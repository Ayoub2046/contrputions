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
  persistNotification,
} from './notificationService'
import {
  requestFcmToken,
  getStoredFcmToken,
  setupFcmForegroundListener,
} from './firebaseMessaging'
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

  // Initialize permission status & FCM Token if granted
  useEffect(() => {
    setIsSupported(isNotificationSupported())
    const currentPerm = getNotificationPermission()
    setPermission(currentPerm)

    if (currentPerm === 'granted') {
      requestFcmToken(user?.id).then((token) => {
        if (token) setFcmToken(token)
      })
    }
  }, [user?.id])

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
    setNotifications(list)
    for (const item of list) {
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

      // Don't show duplicate popup if already seen
      if (seenIdsRef.current.has(notif.id)) return
      seenIdsRef.current.add(notif.id)

      // If user is the author who sent it, don't popup on their own device
      if (notif.senderId && user?.id && notif.senderId === user.id) {
        return
      }

      // Filter by class if specific target class is set and user is in a class
      const userClass = activeClassId || user?.class_id
      if (notif.classId && userClass && notif.classId !== userClass && user?.role === 'student') {
        return
      }

      // 1. Play chime & trigger native OS notification
      await triggerSystemNotification(notif)

      // 2. Show in-app floating banner
      setActiveBanner(notif)

      // 3. Save to storage & state
      await persistNotification(notif)
      setNotifications((prev) => [
        { ...notif, read: false },
        ...prev.filter((p) => p.id !== notif.id),
      ])
    },
    [activeClassId, user]
  )

  // Realtime subscription for incoming broadcast notifications (Immediate WebSocket delivery)
  useEffect(() => {
    const existing = supabase
      .getChannels()
      .find((c: any) => c.topic === 'realtime:classbank_push_channel' || c.name === 'classbank_push_channel')
    if (existing) {
      supabase.removeChannel(existing)
    }

    const channel = supabase.channel('classbank_push_channel')

    channel
      .on('broadcast', { event: 'push_event' }, async ({ payload }) => {
        const notif = payload as PushNotificationPayload
        if (notif) {
          await handleIncomingNotification(notif)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime Channel Active]: classbank_push_channel ready')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [handleIncomingNotification])

  // Periodic and Visibility-Change Database Sync (Guaranteed delivery if phone was locked or offline)
  useEffect(() => {
    let isMounted = true

    async function syncDatabaseNotifications() {
      try {
        const userClass = activeClassId || user?.class_id
        let query = supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        if (userClass) {
          query = query.or(`class_id.eq.${userClass},class_id.is.null`)
        }

        const { data, error } = await query
        if (!error && data && data.length > 0 && isMounted) {
          const now = Date.now()
          for (const row of data) {
            // Check if created within last 20 minutes and not yet seen
            const ageMs = now - new Date(row.created_at).getTime()
            if (ageMs < 20 * 60 * 1000 && !seenIdsRef.current.has(row.id)) {
              const payload: PushNotificationPayload = {
                id: row.id,
                title: row.title,
                body: row.body,
                category: row.type || 'announcement',
                senderName: row.sender_name,
                senderRole: row.sender_role,
                classId: row.class_id,
                createdAt: row.created_at,
              }
              await handleIncomingNotification(payload)
            }
          }
        }
      } catch {}
    }

    // Sync on tab visibility change (e.g. unlocking phone or switching back to app)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncDatabaseNotifications()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', syncDatabaseNotifications)

    // Sync every 12 seconds in background
    const timer = setInterval(syncDatabaseNotifications, 12000)

    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', syncDatabaseNotifications)
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
      const token = await requestFcmToken(user?.id)
      if (token) setFcmToken(token)
    }
    return perm
  }, [user?.id])

  const broadcast = useCallback(
    async (data: { title: string; body: string; category?: NotificationCategory; classId?: string | null }) => {
      const payload: PushNotificationPayload = {
        id: crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}_${Math.random()}`,
        title: data.title,
        body: data.body,
        category: data.category || 'announcement',
        senderId: user?.id,
        senderName: user?.name || 'Administrator',
        senderRole: user?.role || 'admin',
        classId: data.classId || null,
        createdAt: new Date().toISOString(),
      }

      // Mark as seen on sender device so sender doesn't get duplicate alert
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
    // Remove all notifications from local state (inbox becomes empty)
    setNotifications([])
    // Also delete them from Supabase so they don't reload
    try {
      const userClass = activeClassId || user?.class_id
      let query = supabase.from('notifications').delete()
      if (userClass) {
        query = (query as any).or(`class_id.eq.${userClass},class_id.is.null`)
      }
      await query
    } catch {}
  }, [activeClassId, user?.class_id])

  const markAsRead = useCallback(async (id: string) => {
    // Remove just this notification from local state
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    // Delete from Supabase
    try {
      await supabase.from('notifications').delete().eq('id', id)
    } catch {}
  }, [])

  const testNotification = useCallback(async () => {
    const sample: PushNotificationPayload = {
      id: `test_${Date.now()}`,
      title: '📢 ClassBank Notice',
      body: 'Live push notification test! You will see alerts like this before opening the application.',
      category: 'announcement',
      senderName: 'ClassBank System',
      senderRole: 'super_admin',
      createdAt: new Date().toISOString(),
    }
    await triggerSystemNotification(sample)
    setActiveBanner(sample)
    setNotifications((prev) => [{ ...sample, read: false }, ...prev])
  }, [])

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
