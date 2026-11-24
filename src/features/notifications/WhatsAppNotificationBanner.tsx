import { useEffect } from 'react'
import { useNotifications } from './NotificationContext'
import { Bell, X, MessageSquare, Wallet, Receipt, Info } from 'lucide-react'

function getCategoryIcon(category?: string) {
  switch (category) {
    case 'contribution':
      return <Wallet size={16} className="text-emerald-500" />
    case 'expense':
      return <Receipt size={16} className="text-amber-500" />
    case 'reminder':
      return <Bell size={16} className="text-blue-500" />
    case 'announcement':
    case 'news':
      return <MessageSquare size={16} className="text-emerald-500" />
    default:
      return <Info size={16} className="text-brand-500" />
  }
}

export function WhatsAppNotificationBanner() {
  const { activeBanner, dismissBanner } = useNotifications()

  useEffect(() => {
    if (!activeBanner) return
    const timer = setTimeout(() => {
      dismissBanner()
    }, 6000)
    return () => clearTimeout(timer)
  }, [activeBanner, dismissBanner])

  if (!activeBanner) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-96 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div
        className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-2xl overflow-hidden backdrop-blur-md cursor-pointer transition-transform hover:scale-[1.01]"
        onClick={dismissBanner}
      >
        {/* Professional top header bar */}
        <div className="bg-emerald-600 px-3.5 py-1.5 flex items-center justify-between text-white text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-300 animate-pulse" />
            <span className="tracking-wide">CLASSBANK &middot; LIVE NOTIFICATION</span>
          </div>
          <span className="text-[10px] text-emerald-100 font-normal">Just now</span>
        </div>

        {/* Message body */}
        <div className="p-3.5 flex items-start gap-3">
          <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center shrink-0">
            {getCategoryIcon(activeBanner.category)}
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
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 flex items-center gap-1">
                <span>From: {activeBanner.senderName}</span>
                {activeBanner.senderRole && (
                  <span className="opacity-80">({activeBanner.senderRole})</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
