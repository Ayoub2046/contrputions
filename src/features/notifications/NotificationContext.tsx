import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  triggerSystemNotification,
  broadcastPushNotification,
  fetchNotificationsList,
  saveLocalStoredNotifications,
  persistNotification,
} from './notificationService'
import type { PushNotificationPayload, StoredNotification, NotificationCategory } from './notificationTypes'

interface NotificationContextType {
  permission: NotificationPermission
  isSupported: boolean
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
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [activeBanner, setActiveBanner] = useState<PushNotificationPayload | null>(null)

  // Initialize permission status
  useEffect(() => {
    setIsSupported(isNotificationSupported())
    setPermission(getNotificationPermission())
  }, [])

  // Fetch notifications
  const refreshNotifications = useCallback(async () => {
    const list = await fetchNotificationsList(activeClassId)
    setNotifications(list)
  }, [activeClassId])

  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications])

  // Realtime subscription for incoming broadcast notifications
  useEffect(() => {
    const channel = supabase.channel('classbank_push_channel')

    channel
      .on('broadcast', { event: 'push_event' }, async ({ payload }) => {
        const notif = payload as PushNotificationPayload
        if (!notif) return

        // Filter by class if specific target class is set and user is in a class
        if (notif.classId && activeClassId && notif.classId !== activeClassId && user?.role === 'student') {
          return
        }

        // 1. Play sound & show OS push notification
        await triggerSystemNotification(notif)

        // 2. Show in-app WhatsApp popup banner
        setActiveBanner(notif)

        // 3. Save to state and storage
        await persistNotification(notif)
        setNotifications((prev) => [
          { ...notif, read: false },
          ...prev.filter((p) => p.id !== notif.id),
        ])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeClassId, user?.role])

  const dismissBanner = useCallback(() => {
    setActiveBanner(null)
  }, [])

  const handleRequestPermission = useCallback(async () => {
    const perm = await requestNotificationPermission()
    setPermission(perm)
    return perm
  }, [])

  const broadcast = useCallback(
    async (data: { title: string; body: string; category?: NotificationCategory; classId?: string | null }) => {
      const payload: PushNotificationPayload = {
        id: crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}_${Math.random()}`,
        title: data.title,
        body: data.body,
        category: data.category || 'announcement',
        senderName: user?.name || 'Administrator',
        senderRole: user?.role || 'admin',
        classId: data.classId || null,
        createdAt: new Date().toISOString(),
      }

      await broadcastPushNotification(payload)

      // Add to local state & active banner
      setNotifications((prev) => [
        { ...payload, read: false },
        ...prev.filter((p) => p.id !== payload.id),
      ])
      setActiveBanner(payload)
    },
    [user]
  )

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }))
      saveLocalStoredNotifications(updated)
      return updated
    })
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      saveLocalStoredNotifications(updated)
      return updated
    })
  }, [])

  const testNotification = useCallback(async () => {
    const sample: PushNotificationPayload = {
      id: `test_${Date.now()}`,
      title: '📢 ClassBank Notice',
      body: 'This is a WhatsApp-style notification! You will see alerts like this before opening the application.',
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
