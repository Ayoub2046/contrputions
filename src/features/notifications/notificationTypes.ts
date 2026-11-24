export type NotificationCategory = 'news' | 'announcement' | 'reminder' | 'contribution' | 'expense' | 'system'

export interface PushNotificationPayload {
  id: string
  title: string
  body: string
  category?: NotificationCategory
  senderId?: string
  senderName?: string
  senderRole?: string
  classId?: string | null
  className?: string
  createdAt: string
  url?: string
}

export interface StoredNotification extends PushNotificationPayload {
  read: boolean
}