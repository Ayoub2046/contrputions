import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNotifications } from './NotificationContext'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Bell,
  CheckCheck,
  Send,
  Volume2,
  ShieldAlert,
  X,
  Wallet,
  Receipt,
  MessageSquare,
  Info,
  Trash2,
  Clock,
} from 'lucide-react'
import { BroadcastNotificationModal } from './BroadcastNotificationModal'

interface NotificationBellProps {
  placement?: 'sidebar' | 'header'
}

function getCategoryIcon(cat?: string) {
  switch (cat) {
    case 'contribution':
      return <Wallet size={15} className="text-emerald-500" />
    case 'expense':
      return <Receipt size={15} className="text-amber-500" />
    case 'reminder':
      return <Bell size={15} className="text-blue-500" />
    case 'announcement':
    case 'news':
      return <MessageSquare size={15} className="text-indigo-500" />
    default:
      return <Info size={15} className="text-[#1176BC]" />
  }
}

function getCategoryColor(cat?: string) {
  switch (cat) {
    case 'contribution': return 'bg-emerald-100 dark:bg-emerald-950/60 ring-1 ring-emerald-200 dark:ring-emerald-800'
    case 'expense': return 'bg-amber-100 dark:bg-amber-950/60 ring-1 ring-amber-200 dark:ring-amber-800'
    case 'reminder': return 'bg-blue-100 dark:bg-blue-950/60 ring-1 ring-blue-200 dark:ring-blue-800'
    case 'announcement':
    case 'news': return 'bg-indigo-100 dark:bg-indigo-950/60 ring-1 ring-indigo-200 dark:ring-indigo-800'
    default: return 'bg-[#EAF4FB] dark:bg-[#1176BC]/20 ring-1 ring-[#9FBBDE]/30'
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
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
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  useEffect(() => {
    if (isAdmin) {
      supabase.from('classes').select('id, name').order('name').then(({ data }) => {
        if (data) setAvailableClasses(data)
      })
    }
  }, [isAdmin])

  // Close dropdown on click outside for desktop view
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

  const displayedNotifications = activeTab === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications

  const drawerContent = (
    <>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] flex items-center justify-center shadow-sm">
              <Bell size={15} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-sm text-[#1a2332] dark:text-[#e8f0f8] block leading-tight">Notifications</span>
              {fcmToken && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Push Active
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1176BC] hover:text-[#0D5A8A] px-2.5 py-1 rounded-lg bg-[#EAF4FB] dark:bg-[#0d2a40] hover:bg-[#D0E9F8] dark:hover:bg-[#1176BC]/20 transition-colors cursor-pointer"
                title="Mark all as read (clears inbox)"
              >
                <CheckCheck size={13} />
                Clear All ({unreadCount})
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="size-7 rounded-lg flex items-center justify-center text-[#9FBBDE] hover:text-[#1a2332] dark:hover:text-[#e8f0f8] hover:bg-[#EAF4FB] dark:hover:bg-[#1e3550] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-0.5 bg-[#F5F8FA] dark:bg-[#0d1a2d] rounded-lg">
          {(['unread', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-white dark:bg-[#132033] text-[#1176BC] shadow-sm'
                  : 'text-[#9FBBDE] hover:text-[#1a2332] dark:hover:text-[#e8f0f8]'
              }`}
            >
              {tab === 'unread' ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` : `All (${notifications.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Permission Status Banner if not granted */}
      {permission !== 'granted' && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/50 dark:border-amber-900/50 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 min-w-0">
            <ShieldAlert size={15} className="shrink-0 text-amber-600" />
            <span className="truncate">Enable notifications for real-time class alerts</span>
          </div>
          <button
            onClick={requestPermission}
            className="shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
          >
            Allow
          </button>
        </div>
      )}

      {/* Admin Quick Actions */}
      {isAdmin && (
        <div className="px-3.5 py-2 bg-[#F5F8FA] dark:bg-[#0d1a2d] border-b border-[#ECECEC] dark:border-[#1e3550] flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={testNotification}
            className="flex items-center gap-1.5 text-xs text-[#4a5a72] dark:text-[#9FBBDE] hover:text-[#1a2332] dark:hover:text-[#e8f0f8] px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-[#132033] transition-colors cursor-pointer"
          >
            <Volume2 size={13} className="text-emerald-500" />
            <span>Test Sound</span>
          </button>

          <button
            onClick={() => {
              setOpen(false)
              setShowBroadcastModal(true)
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#1176BC] to-[#25A8E0] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            <Send size={12} />
            <span>Send Push Alert</span>
          </button>
        </div>
      )}

      {/* Notification Items List */}
      <div className="overflow-y-auto flex-1 overscroll-contain">
        {displayedNotifications.length === 0 ? (
          <div className="py-14 text-center space-y-3 px-4">
            <div className="size-16 rounded-2xl bg-[#F5F8FA] dark:bg-[#0d1a2d] flex items-center justify-center mx-auto">
              <Bell size={28} className="text-[#9FBBDE] opacity-50" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8]">
                {activeTab === 'unread' ? 'All caught up! 🎉' : 'No notifications yet'}
              </p>
              <p className="text-xs text-[#9FBBDE] mt-0.5">
                {activeTab === 'unread'
                  ? 'No unread notifications. Switch to "All" to see history.'
                  : 'Class announcements and payment reminders will appear here.'}
              </p>
            </div>
            {activeTab === 'unread' && notifications.length > 0 && (
              <button
                onClick={() => setActiveTab('all')}
                className="text-xs font-semibold text-[#1176BC] hover:underline cursor-pointer"
              >
                View all history →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#ECECEC] dark:divide-[#1e3550]">
            {displayedNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-3.5 transition-all cursor-pointer group ${
                  n.read
                    ? 'hover:bg-[#F5F8FA] dark:hover:bg-[#0d1a2d]'
                    : 'bg-[#EAF4FB]/60 dark:bg-[#1176BC]/8 border-l-2 border-l-[#1176BC] hover:bg-[#EAF4FB] dark:hover:bg-[#1176BC]/15'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${getCategoryColor(n.category)}`}>
                    {getCategoryIcon(n.category)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs leading-snug break-words ${n.read ? 'font-medium text-[#4a5a72] dark:text-[#9FBBDE]' : 'font-bold text-[#1a2332] dark:text-[#e8f0f8]'}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="size-2.5 rounded-full bg-[#1176BC] shrink-0 mt-1 ring-2 ring-[#EAF4FB] dark:ring-[#132033]" />}
                    </div>

                    <p className="text-xs text-[#4a5a72] dark:text-[#9FBBDE] mt-1 leading-relaxed break-words">
                      {n.body}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <Clock size={10} className="text-[#9FBBDE] shrink-0" />
                      <span className="text-[10px] text-[#9FBBDE]">{timeAgo(n.createdAt)}</span>
                      {n.senderName && (
                        <>
                          <span className="text-[#9FBBDE] text-[10px]">·</span>
                          <span className="text-[10px] text-[#9FBBDE] font-medium truncate">{n.senderName}</span>
                        </>
                      )}
                      {!n.read && (
                        <span className="ml-auto text-[10px] font-semibold text-[#1176BC] group-hover:underline">
                          Tap to dismiss
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer — only if there are read notifications to fully clear */}
      {notifications.some((n) => n.read) && (
        <div className="p-3 border-t border-[#ECECEC] dark:border-[#1e3550] bg-[#F5F8FA] dark:bg-[#0d1a2d] shrink-0 flex items-center justify-center">
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9FBBDE] hover:text-red-500 transition-colors cursor-pointer"
          >
            <Trash2 size={12} />
            Clear all read notifications
          </button>
        </div>
      )}
    </>
  )

  // Desktop flyout for sidebar placement (>= lg)
  const sidebarFlyoutClasses =
    'hidden lg:flex flex-col absolute z-50 top-0 left-full ml-3 w-96 md:w-[420px] max-h-[85vh] rounded-2xl bg-white dark:bg-[#132033] border border-[#ECECEC] dark:border-[#1e3550] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200'

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center size-8 sm:size-9 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] hover:bg-[#EAF4FB] dark:hover:bg-[#0d2a40] text-[#4a5a72] dark:text-[#9FBBDE] hover:text-[#1176BC] transition-colors cursor-pointer shadow-sm"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1176BC] px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-[#132033]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 1. Desktop Sidebar Anchored Flyout */}
      {open && placement === 'sidebar' && (
        <div className={sidebarFlyoutClasses}>
          {drawerContent}
        </div>
      )}

      {/* 2. Mobile & Header Centered Overlay (via Body Portal) */}
      {open &&
        placement !== 'sidebar' &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-16 px-3 pointer-events-auto animate-in fade-in duration-150">
            {/* Dimmed Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
              onClick={() => setOpen(false)}
            />

            {/* Floating Notification Panel */}
            <div className="relative w-full max-w-md max-h-[85vh] rounded-2xl bg-white dark:bg-[#132033] border border-[#ECECEC] dark:border-[#1e3550] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 z-10">
              {drawerContent}
            </div>
          </div>,
          document.body
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
