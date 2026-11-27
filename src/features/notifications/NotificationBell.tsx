import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNotifications } from './NotificationContext'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Bell,
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
  Sparkles,
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
    case 'contribution':
      return 'bg-emerald-100 dark:bg-emerald-950/60 ring-1 ring-emerald-200 dark:ring-emerald-800'
    case 'expense':
      return 'bg-amber-100 dark:bg-amber-950/60 ring-1 ring-amber-200 dark:ring-amber-800'
    case 'reminder':
      return 'bg-blue-100 dark:bg-blue-950/60 ring-1 ring-blue-200 dark:ring-blue-800'
    case 'announcement':
    case 'news':
      return 'bg-indigo-100 dark:bg-indigo-950/60 ring-1 ring-indigo-200 dark:ring-indigo-800'
    default:
      return 'bg-[#EAF4FB] dark:bg-[#1176BC]/20 ring-1 ring-[#9FBBDE]/30'
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
  const portalRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  useEffect(() => {
    if (isAdmin) {
      supabase.from('classes').select('id, name').order('name').then(({ data }) => {
        if (data) setAvailableClasses(data)
      })
    }
  }, [isAdmin])

  // Close dropdown on click outside for desktop and mobile
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      // If click/touch is inside the bell trigger button or inside the drawer, do not close
      if (
        (dropdownRef.current && dropdownRef.current.contains(target)) ||
        (portalRef.current && portalRef.current.contains(target))
      ) {
        return
      }
      setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open])

  const displayedNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.read) : notifications

  const drawerContent = (
    <div className="flex flex-col h-full max-h-full">
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
      </div>

      {/* Header */}
      <div className="px-4 pt-3 pb-3 border-b border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] flex items-center justify-center shadow-sm shrink-0">
              <Bell size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm text-[#1a2332] dark:text-[#e8f0f8] block leading-tight truncate">
                Notifications
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Realtime Active
                </span>
                {fcmToken && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#1176BC] dark:text-[#25A8E0]">
                    · <Sparkles size={9} /> Push Ready
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Always visible Clear All button when notifications exist */}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  markAllAsRead()
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 transition-colors cursor-pointer active:scale-95 touch-manipulation"
                title="Clear all notifications"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
              }}
              className="size-8 rounded-lg flex items-center justify-center text-[#9FBBDE] hover:text-[#1a2332] dark:hover:text-[#e8f0f8] hover:bg-[#EAF4FB] dark:hover:bg-[#1e3550] transition-colors cursor-pointer touch-manipulation"
              title="Close notifications"
            >
              <X size={18} />
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
              {tab === 'unread'
                ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`
                : `All (${notifications.length})`}
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
            className="flex items-center gap-1.5 text-xs text-[#4a5a72] dark:text-[#9FBBDE] hover:text-[#1a2332] dark:hover:text-[#e8f0f8] px-2.5 py-1.5 rounded-lg hover:bg-white dark:hover:bg-[#132033] transition-colors cursor-pointer"
          >
            <Volume2 size={13} className="text-emerald-500" />
            <span>Test Sound</span>
          </button>

          <button
            onClick={() => {
              setOpen(false)
              setShowBroadcastModal(true)
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#1176BC] to-[#25A8E0] hover:opacity-90 transition-opacity cursor-pointer shadow-sm active:scale-95"
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
                  ? 'No unread notifications. Switch to "All" to view history.'
                  : 'Announcements, contribution alerts, and reminders will appear here.'}
              </p>
            </div>
            {activeTab === 'unread' && notifications.length > 0 && (
              <button
                onClick={() => setActiveTab('all')}
                className="text-xs font-semibold text-[#1176BC] hover:underline cursor-pointer"
              >
                View all notifications ({notifications.length}) →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#ECECEC] dark:divide-[#1e3550]">
            {displayedNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 transition-all group ${
                  n.read
                    ? 'hover:bg-[#F5F8FA] dark:hover:bg-[#0d1a2d]'
                    : 'bg-[#EAF4FB]/60 dark:bg-[#1176BC]/8 border-l-2 border-l-[#1176BC] hover:bg-[#EAF4FB] dark:hover:bg-[#1176BC]/15'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Category Icon */}
                  <div
                    className={`size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${getCategoryColor(
                      n.category
                    )}`}
                  >
                    {getCategoryIcon(n.category)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs leading-snug break-words ${
                          n.read
                            ? 'font-medium text-[#4a5a72] dark:text-[#9FBBDE]'
                            : 'font-bold text-[#1a2332] dark:text-[#e8f0f8]'
                        }`}
                      >
                        {n.title}
                      </p>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!n.read && (
                          <span className="size-2 rounded-full bg-[#1176BC] ring-2 ring-[#EAF4FB] dark:ring-[#132033]" />
                        )}
                        {/* Individual Delete / Dismiss Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(n.id)
                          }}
                          className="size-6 rounded-md flex items-center justify-center text-[#9FBBDE] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer touch-manipulation"
                          title="Dismiss notification"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
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
                          <span className="text-[10px] text-[#9FBBDE] font-medium truncate">
                            {n.senderName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer for quick dismissal when multiple items exist */}
      {notifications.length > 0 && (
        <div className="p-2.5 border-t border-[#ECECEC] dark:border-[#1e3550] bg-[#F5F8FA] dark:bg-[#0d1a2d] shrink-0 flex items-center justify-between px-4">
          <span className="text-[11px] text-[#9FBBDE]">
            {notifications.length} notification{notifications.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              markAllAsRead()
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1176BC] hover:text-red-500 transition-colors cursor-pointer touch-manipulation"
          >
            <Trash2 size={12} />
            Clear all
          </button>
        </div>
      )}
    </div>
  )

  // Desktop flyout for sidebar placement (>= lg)
  const sidebarFlyoutClasses =
    'hidden lg:flex flex-col absolute z-50 top-0 left-full ml-3 w-96 md:w-[420px] max-h-[85vh] rounded-2xl bg-white dark:bg-[#132033] border border-[#ECECEC] dark:border-[#1e3550] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200'

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button - High Visibility & Modern Styling */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative flex items-center justify-center size-9 sm:size-10 rounded-xl sm:rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95 touch-manipulation group ${
          unreadCount > 0
            ? 'bg-gradient-to-br from-[#EAF4FB] to-[#D5E9F8] dark:from-[#132c48] dark:to-[#0f233a] border-2 border-[#1176BC] dark:border-[#25A8E0] text-[#1176BC] dark:text-[#38BDF8] shadow-md ring-2 ring-[#1176BC]/20'
            : 'bg-white dark:bg-[#132033] hover:bg-[#EAF4FB] dark:hover:bg-[#1c2e47] border border-[#CCDCEE] dark:border-[#223956] text-[#1176BC] dark:text-[#60A5FA]'
        }`}
        title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'Notifications'}
        aria-label="Notifications"
      >
        <Bell
          size={19}
          className={`transition-transform group-hover:scale-110 ${
            unreadCount > 0 ? 'text-[#1176BC] dark:text-[#38BDF8]' : ''
          }`}
        />
        {unreadCount > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-rose-500 px-1.5 text-[10px] font-extrabold text-white shadow-md ring-2 ring-white dark:ring-[#132033] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : (
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-emerald-500/80 ring-1 ring-white dark:ring-[#132033]" />
        )}
      </button>

      {/* 1. Desktop Sidebar Anchored Flyout */}
      {open && placement === 'sidebar' && (
        <div
          ref={portalRef}
          onClick={(e) => e.stopPropagation()}
          className={sidebarFlyoutClasses}
        >
          {drawerContent}
        </div>
      )}

      {/* 2. Responsive Bottom Sheet for Mobile & Modal for Desktop/Tablet */}
      {open &&
        placement !== 'sidebar' &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-end sm:items-start justify-center sm:pt-14 p-0 sm:px-3 pointer-events-auto animate-in fade-in duration-150">
            {/* Dimmed Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setOpen(false)}
            />

            {/* Mobile Bottom Sheet (< sm) or Centered Modal (>= sm) */}
            <div
              ref={portalRef}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="relative w-full sm:max-w-md h-[88vh] sm:h-auto sm:max-h-[82vh] rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#132033] border border-[#ECECEC] dark:border-[#1e3550] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-top-4 duration-200 z-10 pb-safe"
            >
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
