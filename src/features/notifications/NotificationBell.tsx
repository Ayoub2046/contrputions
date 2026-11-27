import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNotifications } from './NotificationContext'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import { AppLogo, useAppName } from '../../hooks/useAppLogo'
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
  Clock,
  Sparkles,
  Check,
  CheckCheck,
  RefreshCw,
} from 'lucide-react'
import { BroadcastNotificationModal } from './BroadcastNotificationModal'
import type { StoredNotification } from './notificationTypes'

interface NotificationBellProps {
  placement?: 'sidebar' | 'header'
}

type FilterTab = 'all' | 'unread'
type CategoryFilter = 'all' | 'contribution' | 'expense' | 'news' | 'reminder'

function getCategoryIcon(cat?: string) {
  switch (cat) {
    case 'contribution':
      return <Wallet size={15} className="text-emerald-600 dark:text-emerald-400" />
    case 'expense':
      return <Receipt size={15} className="text-amber-600 dark:text-amber-400" />
    case 'reminder':
      return <Bell size={15} className="text-blue-600 dark:text-blue-400" />
    case 'announcement':
    case 'news':
      return <MessageSquare size={15} className="text-indigo-600 dark:text-indigo-400" />
    default:
      return <Info size={15} className="text-[#1176BC] dark:text-[#38BDF8]" />
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

function getCategoryLabel(cat?: string) {
  switch (cat) {
    case 'contribution':
      return 'Contribution'
    case 'expense':
      return 'Expense'
    case 'reminder':
      return 'Reminder'
    case 'announcement':
    case 'news':
      return 'Announcement'
    case 'system':
      return 'System'
    default:
      return 'Notice'
  }
}

function formatRole(role?: string) {
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'admin') return 'Class Admin'
  if (role === 'finance_manager') return 'Finance'
  if (role === 'student') return 'Student'
  return role || ''
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isTodayDate(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function NotificationBell({ placement = 'header' }: NotificationBellProps) {
  const { user } = useAuth()
  const appName = useAppName()
  const {
    notifications,
    unreadCount,
    permission,
    webPushReady,
    requestPermission,
    markAllAsRead,
    markAsRead,
    markAsUnread,
    testNotification,
    refreshNotifications,
  } = useNotifications()

  const [open, setOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([])
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  useEffect(() => {
    if (isAdmin) {
      supabase
        .from('classes')
        .select('id, name')
        .order('name')
        .then(({ data }) => {
          if (data) setAvailableClasses(data)
        })
    }
  }, [isAdmin])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      if (
        (dropdownRef.current && dropdownRef.current.contains(target)) ||
        (portalRef.current && portalRef.current.contains(target))
      ) {
        return
      }
      setOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    try {
      await refreshNotifications()
    } finally {
      setRefreshing(false)
    }
  }

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'unread' && n.read) return false
      if (categoryFilter === 'all') return true
      if (categoryFilter === 'news') {
        return n.category === 'news' || n.category === 'announcement'
      }
      return n.category === categoryFilter
    })
  }, [notifications, activeTab, categoryFilter])

  const groupedSections = useMemo(() => {
    const today: StoredNotification[] = []
    const earlier: StoredNotification[] = []
    for (const item of filteredNotifications) {
      if (isTodayDate(item.createdAt)) today.push(item)
      else earlier.push(item)
    }
    return { today, earlier }
  }, [filteredNotifications])

  function renderNotificationItem(n: StoredNotification) {
    return (
      <article
        key={n.id}
        className={`p-3.5 sm:p-4 transition-all group relative ${
          n.read
            ? 'bg-white dark:bg-[#132033] hover:bg-[#F8FAFC] dark:hover:bg-[#101c2e]'
            : 'bg-[#EAF4FB]/70 dark:bg-[#1176BC]/12 border-l-[3px] border-l-[#1176BC] hover:bg-[#EAF4FB] dark:hover:bg-[#1176BC]/20'
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
              <div
                onClick={() => {
                  if (!n.read) markAsRead(n.id)
                }}
                className={`min-w-0 space-y-1 flex-1 ${!n.read ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  {!n.read && (
                    <span
                      className="size-2 rounded-full bg-[#1176BC] dark:bg-[#38BDF8] shrink-0 ring-2 ring-[#1176BC]/20"
                      title="Unread"
                    />
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#0d1a2d] text-[#4a5a72] dark:text-[#9FBBDE]">
                    {getCategoryLabel(n.category)}
                  </span>
                </div>
                <p
                  className={`text-xs sm:text-[13px] leading-snug break-words ${
                    n.read
                      ? 'font-medium text-[#4a5a72] dark:text-[#9FBBDE]'
                      : 'font-bold text-[#1a2332] dark:text-[#e8f0f8]'
                  }`}
                >
                  {n.title}
                </p>
              </div>

              {/* Mark as Read / Unread Toggle */}
              <div className="shrink-0 flex items-center pt-0.5">
                {!n.read ? (
                  <button
                    type="button"
                    onClick={() => markAsRead(n.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1176BC]/10 hover:bg-[#1176BC] text-[#1176BC] hover:text-white dark:bg-[#25A8E0]/15 dark:hover:bg-[#25A8E0] dark:text-[#38BDF8] dark:hover:text-slate-950 text-[10px] font-bold transition-all cursor-pointer active:scale-95 touch-manipulation"
                    title="Mark as read"
                  >
                    <Check size={12} />
                    <span>Mark read</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => markAsUnread(n.id)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-[#1176BC] dark:hover:text-[#38BDF8] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-[#EAF4FB] dark:hover:bg-[#1176BC]/20 transition-colors cursor-pointer touch-manipulation"
                    title="Click to mark as unread"
                  >
                    <CheckCheck size={11} />
                    <span>Read</span>
                  </button>
                )}
              </div>
            </div>

            <p
              onClick={() => {
                if (!n.read) markAsRead(n.id)
              }}
              className={`text-xs mt-1.5 leading-relaxed whitespace-pre-line break-words ${
                !n.read ? 'cursor-pointer ' : ''
              }${
                n.read
                  ? 'text-[#6b7a90] dark:text-[#86a2c4]'
                  : 'text-[#334155] dark:text-[#cbd5e1]'
              }`}
            >
              {n.body}
            </p>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] text-[#7c93b0] dark:text-[#88a3c4]">
                <Clock size={10} className="shrink-0" />
                {timeAgo(n.createdAt)}
              </span>
              {n.senderName && (
                <>
                  <span className="text-[#9FBBDE] text-[10px]">&middot;</span>
                  <span className="text-[10px] text-[#4a5a72] dark:text-[#9FBBDE] font-semibold truncate">
                    {n.senderName}
                  </span>
                </>
              )}
              {n.senderRole && (
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#F1F5F9] dark:bg-[#0d1a2d] text-[#64748b] dark:text-[#9FBBDE]">
                  {formatRole(n.senderRole)}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    )
  }

  const drawerContent = (
    <div className="flex flex-col h-full max-h-full">
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
      </div>

      {/* Header */}
      <div className="px-4 pt-3 pb-3 border-b border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-white dark:bg-[#0d1a2d] p-1 border border-[#ECECEC] dark:border-[#1e3550] flex items-center justify-center shadow-sm shrink-0">
              <AppLogo className="size-full object-contain" alt={appName} />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm text-[#1a2332] dark:text-[#e8f0f8] block leading-tight truncate">
                {appName} Notifications
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
                {webPushReady ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#1176BC] dark:text-[#25A8E0]">
                    &middot; <Sparkles size={9} /> Push Ready
                  </span>
                ) : permission === 'granted' ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    &middot; Syncing Push...
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              className="size-8 rounded-lg flex items-center justify-center text-[#64748b] dark:text-[#9FBBDE] hover:text-[#1176BC] dark:hover:text-[#38BDF8] hover:bg-[#EAF4FB] dark:hover:bg-[#1e3550] transition-colors cursor-pointer touch-manipulation"
              title="Refresh notifications"
              aria-label="Refresh notifications"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  markAllAsRead()
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1176BC] dark:text-[#38BDF8] hover:text-white hover:bg-[#1176BC] dark:hover:bg-[#25A8E0] dark:hover:text-slate-950 px-2.5 py-1.5 rounded-lg bg-[#EAF4FB] dark:bg-[#1176BC]/20 transition-all cursor-pointer active:scale-95 touch-manipulation"
                title="Mark all notifications as read"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
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

        {/* All / Unread Segmented Tabs */}
        <div className="flex gap-1 p-0.5 bg-[#F5F8FA] dark:bg-[#0d1a2d] rounded-lg">
          {(
            [
              { id: 'all', label: `All (${notifications.length})` },
              { id: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#132033] text-[#1176BC] dark:text-[#38BDF8] shadow-sm'
                  : 'text-[#6b7a90] dark:text-[#9FBBDE] hover:text-[#1a2332] dark:hover:text-[#e8f0f8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Compact Category Filters */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
            {(
              [
                { id: 'all', label: 'Everything' },
                { id: 'news', label: 'News' },
                { id: 'contribution', label: 'Payments' },
                { id: 'expense', label: 'Expenses' },
                { id: 'reminder', label: 'Reminders' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-[#1176BC] text-white shadow-2xs'
                    : 'bg-[#F1F5F9] dark:bg-[#0d1a2d] text-[#4a5a72] dark:text-[#9FBBDE] hover:bg-[#E2E8F0] dark:hover:bg-[#1a2d42]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Permission Status Banner if not granted */}
      {permission !== 'granted' && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/50 dark:border-amber-900/50 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 min-w-0">
            <ShieldAlert size={15} className="shrink-0 text-amber-600" />
            <span className="leading-snug">
              {permission === 'denied'
                ? 'Push alerts are blocked. Enable notifications in your browser site settings.'
                : 'Allow push alerts to receive messages before opening the app'}
            </span>
          </div>
          {permission !== 'denied' && (
            <button
              onClick={requestPermission}
              className="shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
            >
              Allow
            </button>
          )}
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
            <span>Test Push</span>
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
        {filteredNotifications.length === 0 ? (
          <div className="py-14 text-center space-y-3 px-4">
            <div className="size-16 rounded-2xl bg-[#F5F8FA] dark:bg-[#0d1a2d] p-3 flex items-center justify-center mx-auto border border-[#ECECEC] dark:border-[#1e3550]">
              <AppLogo className="size-full object-contain opacity-70" alt={appName} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8]">
                {activeTab === 'unread' ? 'All caught up!' : 'No notifications matching filter'}
              </p>
              <p className="text-xs text-[#6b7a90] dark:text-[#9FBBDE] mt-0.5 max-w-xs mx-auto">
                {activeTab === 'unread'
                  ? 'Every notification has been read. Switch to "All" to review past messages anytime.'
                  : 'Announcements, contribution alerts, and reminders will stay organized here.'}
              </p>
            </div>
            {activeTab === 'unread' && notifications.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all')
                  setActiveTab('all')
                }}
                className="text-xs font-semibold text-[#1176BC] dark:text-[#38BDF8] hover:underline cursor-pointer"
              >
                View all notifications ({notifications.length}) &rarr;
              </button>
            )}
          </div>
        ) : (
          <div>
            {groupedSections.today.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-[#F8FAFC] dark:bg-[#0d1a2d]/90 border-y border-[#ECECEC]/70 dark:border-[#1e3550]/70 sticky top-0 z-10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] dark:text-[#9FBBDE]">
                    Today
                  </span>
                </div>
                <div className="divide-y divide-[#ECECEC] dark:divide-[#1e3550]">
                  {groupedSections.today.map(renderNotificationItem)}
                </div>
              </div>
            )}

            {groupedSections.earlier.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-[#F8FAFC] dark:bg-[#0d1a2d]/90 border-y border-[#ECECEC]/70 dark:border-[#1e3550]/70 sticky top-0 z-10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] dark:text-[#9FBBDE]">
                    Earlier
                  </span>
                </div>
                <div className="divide-y divide-[#ECECEC] dark:divide-[#1e3550]">
                  {groupedSections.earlier.map(renderNotificationItem)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Professional Read-Status Footer */}
      {notifications.length > 0 && (
        <div className="p-2.5 sm:px-4 border-t border-[#ECECEC] dark:border-[#1e3550] bg-[#F5F8FA] dark:bg-[#0d1a2d] shrink-0 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-[#64748b] dark:text-[#9FBBDE]">
            {unreadCount > 0
              ? `${unreadCount} unread of ${notifications.length} total`
              : `All ${notifications.length} notification${notifications.length === 1 ? '' : 's'} read`}
          </span>

          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                markAllAsRead()
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1176BC] dark:text-[#38BDF8] hover:underline cursor-pointer touch-manipulation"
            >
              <CheckCheck size={13} />
              Mark all as read
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCheck size={13} />
              Caught up
            </span>
          )}
        </div>
      )}
    </div>
  )

  const sidebarFlyoutClasses =
    'hidden lg:flex flex-col absolute z-50 top-0 left-full ml-3 w-96 md:w-[430px] max-h-[85vh] rounded-2xl bg-white dark:bg-[#132033] border border-[#ECECEC] dark:border-[#1e3550] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200'

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
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

      {/* Desktop Sidebar Anchored Flyout */}
      {open && placement === 'sidebar' && (
        <div
          ref={portalRef}
          onClick={(e) => e.stopPropagation()}
          className={sidebarFlyoutClasses}
        >
          {drawerContent}
        </div>
      )}

      {/* Mobile Bottom Sheet / Modal */}
      {open &&
        placement !== 'sidebar' &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-end sm:items-start justify-center sm:pt-14 p-0 sm:px-3 pointer-events-auto animate-in fade-in duration-150">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setOpen(false)}
            />
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
