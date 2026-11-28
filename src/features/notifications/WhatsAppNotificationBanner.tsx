import { useEffect } from 'react'
import { useNotifications } from './NotificationContext'
import { useAuth } from '../auth/AuthContext'
import { AppLogo, useAppName } from '../../hooks/useAppLogo'
import { Bell, X, MessageSquare, Wallet, Receipt, Info, Lock } from 'lucide-react'

function getCategoryBadge(category?: string) {
  switch (category) {
    case 'private_message':
      return (
        <span className="size-5 rounded-full bg-[#1176BC] text-white flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-900">
          <Lock size={10} />
        </span>
      )
    case 'contribution':
      return (
        <span className="size-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-900">
          <Wallet size={10} />
        </span>
      )
    case 'expense':
      return (
        <span className="size-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-900">
          <Receipt size={10} />
        </span>
      )
    case 'reminder':
      return (
        <span className="size-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-900">
          <Bell size={10} />
        </span>
      )
    case 'announcement':
    case 'news':
      return (
        <span className="size-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-900">
          <MessageSquare size={10} />
        </span>
      )
    default:
      return (
        <span className="size-5 rounded-full bg-[#1176BC] text-white flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-900">
          <Info size={10} />
        </span>
      )
  }
}

export function WhatsAppNotificationBanner() {
  const { activeBanner, dismissBanner } = useNotifications()
  const { user } = useAuth()
  const appName = useAppName()

  useEffect(() => {
    if (!activeBanner) return
    const timer = setTimeout(() => {
      dismissBanner()
    }, 6000)
    return () => clearTimeout(timer)
  }, [activeBanner, dismissBanner])

  if (!activeBanner) return null

  const handleBannerClick = () => {
    const targetUrl = activeBanner.url
    dismissBanner()
    if (targetUrl && targetUrl.includes('#')) {
      const hash = targetUrl.split('#')[1]
      window.location.hash = hash
      setTimeout(() => {
        const el = document.getElementById(hash)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 80)
    }
  }

  return (
    <div className="fixed top-4 left-3 right-3 sm:left-auto sm:right-4 z-[110] max-w-sm sm:w-96 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div
        className="rounded-2xl bg-white dark:bg-slate-900 border border-[#1176BC]/30 shadow-2xl overflow-hidden backdrop-blur-md cursor-pointer transition-transform hover:scale-[1.01]"
        onClick={handleBannerClick}
      >
        {/* Top bar with dynamic App Name */}
        <div className="bg-gradient-to-r from-[#1176BC] to-[#0D5A8A] px-3.5 py-1.5 flex items-center justify-between text-white text-xs font-semibold">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="size-2 rounded-full bg-emerald-300 animate-pulse shrink-0" />
            <span className="tracking-wide uppercase truncate">{appName} &middot; Live Notification</span>
          </div>
          <span className="text-[10px] text-sky-100 font-normal shrink-0 ml-2">Just now</span>
        </div>

        {/* Message body featuring Official Application Logo */}
        <div className="p-3.5 flex items-start gap-3">
          <div className="relative size-11 rounded-xl bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center shrink-0">
            <AppLogo className="size-full object-contain" alt={appName} />
            <div className="absolute -bottom-1 -right-1">{getCategoryBadge(activeBanner.category)}</div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {activeBanner.title}
              </h4>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  dismissBanner()
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
              {activeBanner.body}
            </p>

            {activeBanner.senderName && (
              <p className="text-[10px] text-[#1176BC] dark:text-[#38BDF8] font-medium mt-1.5 flex items-center gap-1">
                <span>From: {activeBanner.senderName}</span>
                {activeBanner.senderRole && (
                  <span className="opacity-80">
                    (
                    {activeBanner.senderRole === 'super_admin' && user?.role === 'student'
                      ? 'Administration'
                      : activeBanner.senderRole}
                    )
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
