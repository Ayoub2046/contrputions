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
  broadcastMarkAllRead,
  broadcastMarkRead,
  broadcastMarkUnread,
  markNotificationReadInDB,
  markNotificationUnreadInDB,
  markAllNotificationsReadInDB,
  loadLocalReadIds,
  saveLocalReadIds,
  isLocalSentNotification,
  markLocalSentNotification,
  wasDeliveredByServiceWorker,
} from './notificationService'
import { subscribeToWebPush, getCurrentPushEndpoint } from './webPushService'
import type { PushNotificationPayload, StoredNotification, NotificationCategory } from './notificationTypes'

interface TestPushResult {
  ok: boolean
  sent: number
  failed: number
  totalTargets: number
  message: string
}

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
  markAllAsRead: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAsUnread: (id: string) => Promise<void>
  testNotification: () => Promise<TestPushResult>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, activeClassId, adminClassIds } = useAuth()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [webPushReady, setWebPushReady] = useState(false)
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [activeBanner, setActiveBanner] = useState<PushNotificationPayload | null>(null)

  const seenIdsRef = useRef<Set<string>>(new Set())
  const swDeliveredIdsRef = useRef<Set<string>>(new Set())
  const pendingFallbackTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const readIdsRef = useRef<Set<string>>(loadLocalReadIds(user?.id))
  const initialSyncDoneRef = useRef(false)
  const userRef = useRef(user)
  const activeClassIdRef = useRef(activeClassId)
  const webPushReadyRef = useRef(webPushReady)

  useEffect(() => {
    webPushReadyRef.current = webPushReady
  }, [webPushReady])

  useEffect(() => {
    userRef.current = user
    activeClassIdRef.current = activeClassId
    readIdsRef.current = loadLocalReadIds(user?.id)
    initialSyncDoneRef.current = false
  }, [user, activeClassId])

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
          status.onchange = () => {
            const newPerm = getNotificationPermission()
            setPermission(newPerm)
            if (newPerm === 'granted') {
              syncPushRegistration()
            } else {
              setWebPushReady(false)
            }
          }
        })
        .catch(() => {})
    }

    return () => {
      if (permStatus) permStatus.onchange = null
    }
  }, [syncPushRegistration])

  // Load notifications from database along with persistent per-user read status
  const refreshNotifications = useCallback(async () => {
    if (!user?.id) {
      initialSyncDoneRef.current = false
      setNotifications([])
      return
    }
    const filterClass =
      user.role === 'student' ? user.class_id || activeClassId : activeClassId || user.class_id
    const list = await fetchNotificationsList(filterClass, user.id)
    for (const item of list) {
      seenIdsRef.current.add(item.id)
      if (item.read) readIdsRef.current.add(item.id)
    }
    initialSyncDoneRef.current = true
    setNotifications(list)
  }, [activeClassId, user?.class_id, user?.id, user?.role])

  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications])

  const handleIncomingNotification = useCallback(async (notif: PushNotificationPayload) => {
    if (!notif || !notif.id) return
    const currUser = userRef.current
    if (!currUser) return

    if (seenIdsRef.current.has(notif.id)) return
    seenIdsRef.current.add(notif.id)

    const currClass =
      currUser.role === 'student'
        ? currUser.class_id || activeClassIdRef.current
        : activeClassIdRef.current || currUser.class_id

    if (notif.classId && currClass && notif.classId !== currClass && currUser.role === 'student') {
      return
    }

    const alreadyRead = readIdsRef.current.has(notif.id)

    if (isLocalSentNotification(notif.id)) {
      setNotifications((prev) => {
        if (prev.some((p) => p.id === notif.id)) return prev
        return [{ ...notif, read: true }, ...prev]
      })
      return
    }

    const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible'
    const deliveredBySw =
      swDeliveredIdsRef.current.has(notif.id) || (await wasDeliveredByServiceWorker(notif.id))

    if (deliveredBySw) {
      swDeliveredIdsRef.current.add(notif.id)
    }

    if (!alreadyRead) {
      setActiveBanner(notif)
      // Only trigger frontend fallback chime/notification when app tab IS visibly open
      // AND Service Worker hasn't already delivered the native push notification.
      if (isVisible && !deliveredBySw) {
        if (webPushReadyRef.current) {
          const fallbackTimer = setTimeout(async () => {
            pendingFallbackTimersRef.current.delete(notif.id)
            const swHandled =
              swDeliveredIdsRef.current.has(notif.id) || (await wasDeliveredByServiceWorker(notif.id))
            if (!swHandled && document.visibilityState === 'visible') {
              triggerSystemNotification(notif)
            }
          }, 5000)
          pendingFallbackTimersRef.current.set(notif.id, fallbackTimer)
        } else {
          await triggerSystemNotification(notif)
        }
      }
    }

    setNotifications((prev) => [
      { ...notif, read: alreadyRead },
      ...prev.filter((p) => p.id !== notif.id),
    ])
  }, [])

  // Listen for Service Worker native push delivery & click events so foreground UI syncs without double sound/popup
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_NOTIFICATION_CLICKED' && event.data?.payload?.id) {
        setActiveBanner((prev) => (prev?.id === event.data.payload.id ? null : prev))
        return
      }
      if (event.data?.type !== 'SW_PUSH_DELIVERED' || !event.data?.payload?.id) return
      const payload = event.data.payload as PushNotificationPayload
      swDeliveredIdsRef.current.add(payload.id)
      const pending = pendingFallbackTimersRef.current.get(payload.id)
      if (pending) {
        clearTimeout(pending)
        pendingFallbackTimersRef.current.delete(payload.id)
      }
      const currUser = userRef.current
      if (!currUser) return
      const currClass =
        currUser.role === 'student'
          ? currUser.class_id || activeClassIdRef.current
          : activeClassIdRef.current || currUser.class_id
      if (payload.classId && currClass && payload.classId !== currClass && currUser.role === 'student') {
        return
      }
      if (!seenIdsRef.current.has(payload.id)) {
        seenIdsRef.current.add(payload.id)
        if (!isLocalSentNotification(payload.id)) {
          setActiveBanner(payload)
          setNotifications((prev) => [
            { ...payload, createdAt: payload.createdAt || new Date().toISOString(), read: false },
            ...prev.filter((p) => p.id !== payload.id),
          ])
        }
      }
    }
    navigator.serviceWorker.addEventListener('message', onSwMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', onSwMessage)
      for (const t of pendingFallbackTimersRef.current.values()) clearTimeout(t)
      pendingFallbackTimersRef.current.clear()
    }
  }, [])

  // Realtime subscription: postgres_changes + WebSocket events
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
      .on('broadcast', { event: 'mark_all_read' }, ({ payload }: any) => {
        if (payload?.userId && userRef.current?.id && payload.userId === userRef.current.id) {
          setNotifications((prev) => {
            prev.forEach((n) => readIdsRef.current.add(n.id))
            saveLocalReadIds(userRef.current?.id, readIdsRef.current)
            return prev.map((n) => ({ ...n, read: true }))
          })
        }
      })
      .on('broadcast', { event: 'mark_read' }, ({ payload }: any) => {
        if (payload?.id && payload?.userId && userRef.current?.id && payload.userId === userRef.current.id) {
          readIdsRef.current.add(payload.id)
          saveLocalReadIds(userRef.current?.id, readIdsRef.current)
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.id ? { ...n, read: true } : n))
          )
        }
      })
      .on('broadcast', { event: 'mark_unread' }, ({ payload }: any) => {
        if (payload?.id && payload?.userId && userRef.current?.id && payload.userId === userRef.current.id) {
          readIdsRef.current.delete(payload.id)
          saveLocalReadIds(userRef.current?.id, readIdsRef.current)
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.id ? { ...n, read: false } : n))
          )
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
        if (!currUser?.id) return
        const userClass =
          currUser.role === 'student'
            ? currUser.class_id || activeClassIdRef.current
            : activeClassIdRef.current || currUser.class_id
        const list = await fetchNotificationsList(userClass, currUser.id)
        if (!isMounted || !list || list.length === 0) return

        const now = Date.now()
        const hadInitialLoad = initialSyncDoneRef.current
        for (const item of list) {
          if (item.read) readIdsRef.current.add(item.id)
          const ageMs = now - new Date(item.createdAt).getTime()
          if (hadInitialLoad && ageMs < 30 * 60 * 1000 && !seenIdsRef.current.has(item.id)) {
            await handleIncomingNotification(item)
          } else {
            seenIdsRef.current.add(item.id)
          }
        }
        initialSyncDoneRef.current = true

        setNotifications((prev) => {
          const prevMap = new Map(prev.map((p) => [p.id, p]))
          let changed = prev.length !== list.length
          const merged = list.map((item) => {
            const existing = prevMap.get(item.id)
            const isRead = item.read || Boolean(existing?.read) || readIdsRef.current.has(item.id)
            if (!existing || existing.read !== isRead) changed = true
            return { ...item, read: isRead }
          })
          return changed ? merged : prev
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
      readIdsRef.current.add(payload.id)
      markLocalSentNotification(payload.id)

      await broadcastPushNotification(payload)
      await markNotificationReadInDB(payload.id, user?.id)

      setNotifications((prev) => [
        { ...payload, read: true },
        ...prev.filter((p) => p.id !== payload.id),
      ])
    },
    [user]
  )

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    unreadIds.forEach((id) => readIdsRef.current.add(id))
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

    await markAllNotificationsReadInDB(unreadIds, user?.id)
    await broadcastMarkAllRead(user?.id)
  }, [user?.id, notifications])

  const markAsRead = useCallback(
    async (id: string) => {
      readIdsRef.current.add(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))

      await markNotificationReadInDB(id, user?.id)
      await broadcastMarkRead(id, user?.id)
    },
    [user?.id]
  )

  const markAsUnread = useCallback(
    async (id: string) => {
      readIdsRef.current.delete(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)))

      await markNotificationUnreadInDB(id, user?.id)
      await broadcastMarkUnread(id, user?.id)
    },
    [user?.id]
  )

  const testNotification = useCallback(async (): Promise<TestPushResult> => {
    const appName = (typeof document !== 'undefined' && document.title) || 'ClassBank'
    const sample: PushNotificationPayload = {
      id: generateUUID(),
      title: `📢 ${appName} Push Test`,
      body: 'Real background push notification is active! Multiple notifications arrive independently with sound even when the app is closed.',
      category: 'announcement',
      senderName: user?.name || appName,
      senderRole: user?.role || 'super_admin',
      createdAt: new Date().toISOString(),
      url: '/dashboard',
    }

    seenIdsRef.current.add(sample.id)
    const ep = await getCurrentPushEndpoint()
    if (!ep) {
      await triggerSystemNotification(sample)
      setActiveBanner(sample)
      setNotifications((prev) => [{ ...sample, read: false }, ...prev])
      return {
        ok: false,
        sent: 0,
        failed: 0,
        totalTargets: 0,
        message: 'No PushManager endpoint active — tap Allow Notifications or reload page.',
      }
    }

    const result = await dispatchWebPushApi({ ...sample, targetEndpoint: ep })
    setActiveBanner(sample)
    setNotifications((prev) => [{ ...sample, read: false }, ...prev.filter((p) => p.id !== sample.id)])

    if (result && result.sent > 0) {
      return {
        ok: true,
        sent: result.sent,
        failed: result.failed,
        totalTargets: result.totalTargets,
        message: `Background push sent (${result.sent}/${result.totalTargets}). If silent, enable Sound in Android App Info → Notifications.`,
      }
    }

    await syncPushRegistration()
    return {
      ok: false,
      sent: result?.sent ?? 0,
      failed: result?.failed ?? 0,
      totalTargets: result?.totalTargets ?? 0,
      message: 'Endpoint synced just now — tap Test Push again to verify live FCM delivery.',
    }
  }, [syncPushRegistration, user])

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
        markAsUnread,
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
