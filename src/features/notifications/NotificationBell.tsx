import { useState, useRef, useEffect } from 'react'
import { useNotifications } from './NotificationContext'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import { Bell, CheckCheck, Send, Volume2, ShieldAlert, X, Wallet, Receipt, MessageSquare, Info } from 'lucide-react'
import { BroadcastNotificationModal } from './BroadcastNotificationModal'
import { formatDate } from '../../lib/utils'

interface NotificationBellProps {
  placement?: 'sidebar' | 'header'
}

function getCategoryIcon(cat?: string) {
  switch (cat) {
    case 'contribution':
      return <Wallet size={14} className="text-emerald-500" />
    case 'expense':
      return <Receipt size={14} className="text-amber-500" />
    case 'reminder':
      return <Bell size={14} className="text-blue-500" />
    case 'announcement':
    case 'news':
      return <MessageSquare size={14} className="text-emerald-500" />
    default:
      return <Info size={14} className="text-brand-500" />
  }
}

export function NotificationBell({ placement = 'header' }: NotificationBellProps) {
  const { user } = useAuth()
  const {
    notifications,
    unreadCount,
    permission,
    fcmToken,
    requestPermission,
    markAllAsRead,
    markAsRead,
    testNotification,
  } = useNotifications()

  const [open, setOpen] = useState(false)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  useEffect(() => {
    if (isAdmin) {
      supabase.from('classes').select('id, name').order('name').then(({ data }) => {
        if (data) setAvailableClasses(data)
      })
    }
  }, [isAdmin])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Positioning classes: If in sidebar, open to the right (flyout) on desktop so it never clips off-screen
  const dropdownPositionClasses =
    placement === 'sidebar'
      ? 'absolute z-[100] right-0 top-full mt-2 lg:top-0 lg:left-full lg:right-auto lg:ml-3 lg:mt-0 w-[calc(100vw-2rem)] sm:w-96 md:w-[420px] rounded-2xl bg-bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200'
      : 'absolute z-[100] right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 md:w-[420px] rounded-2xl bg-bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200'

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center size-9 rounded-btn border border-border bg-bg-card hover:bg-bg-elevated text-secondary hover:text-text transition-colors cursor-pointer"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-bg-main animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Drawer */}
      {open && (
        <div className={dropdownPositionClasses}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-bg-elevated/40">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-text">Notifications</span>
              {fcmToken && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full"
                  title="Firebase Cloud Messaging active"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> FCM Live
                </span>
              )}
              {unreadCount > 0 && (
                <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} /> Mark read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-text p-1 rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Permission Status Banner if not granted */}
          {permission !== 'granted' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/50 dark:border-amber-900/50 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <ShieldAlert size={16} className="shrink-0 text-amber-600" />
                <span>Allow push alerts to get notifications like WhatsApp</span>
              </div>
              <button
                onClick={requestPermission}
                className="shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-btn text-[11px] font-bold transition-colors cursor-pointer"
              >
                Allow
              </button>
            </div>
          )}

          {/* Quick Action Bar */}
          <div className="px-3 py-2 bg-bg-card border-b border-border/50 flex items-center justify-between gap-2">
            <button
              onClick={testNotification}
              className="flex items-center gap-1.5 text-xs text-secondary hover:text-text px-2 py-1 rounded-btn hover:bg-bg-elevated transition-colors cursor-pointer"
            >
              <Volume2 size={13} className="text-emerald-500" />
              <span>Test Alert</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setOpen(false)
                  setShowBroadcastModal(true)
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 px-2.5 py-1 rounded-btn bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <Send size={12} />
                <span>Send Push Alert</span>
              </button>
            )}
          </div>

          {/* Notification Items List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-muted space-y-1">
                <Bell size={24} className="mx-auto opacity-30 mb-2" />
                <p className="text-xs font-medium">No notifications yet</p>
                <p className="text-[11px] text-muted">You will see class news and reminders here.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                    n.read ? 'hover:bg-bg-elevated/50' : 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70'
                  }`}
                >
                  <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(n.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs break-words leading-snug ${n.read ? 'font-medium text-text' : 'font-bold text-text'}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="size-2 rounded-full bg-emerald-500 shrink-0 mt-1" />}
                    </div>

                    {/* Full notification body with text wrapping */}
                    <p className="text-xs text-secondary mt-1 leading-relaxed break-words whitespace-pre-wrap">
                      {n.body}
                    </p>

                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted">
                      <span>{n.senderName ? `By ${n.senderName}` : 'ClassBank'}</span>
                      <span>{formatDate(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Broadcast Modal for Admins */}
      <BroadcastNotificationModal
        open={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        availableClasses={availableClasses}
      />
    </div>
  )
}
