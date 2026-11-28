export type NotificationCategory =
  | 'news'
  | 'announcement'
  | 'reminder'
  | 'contribution'
  | 'expense'
  | 'private_message'
  | 'system'

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
  targetUserIds?: string[]
  targetRoles?: string[]
  createdAt: string
  url?: string
}

export interface StoredNotification extends PushNotificationPayload {
  read: boolean
}
