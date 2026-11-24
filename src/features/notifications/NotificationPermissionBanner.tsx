import { useState, useEffect } from 'react'
import { useNotifications } from './NotificationContext'
import { Bell, X, Sparkles } from 'lucide-react'

export function NotificationPermissionBanner() {
  const { permission, isSupported, requestPermission } = useNotifications()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const isDismissed = localStorage.getItem('classbank_notif_banner_dismissed') === 'true'
    if (isDismissed) setDismissed(true)
  }, [])

  if (!isSupported || permission !== 'default' || dismissed) {
    return null
  }

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem('classbank_notif_banner_dismissed', 'true')
  }

  async function handleEnable() {
    const res = await requestPermission()
    if (res !== 'default') {
      setDismissed(true)
    }
  }

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white p-4 sm:p-5 shadow-lg relative overflow-hidden">
      {/* Background ambient accent */}
      <div className="absolute -right-6 -bottom-6 size-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="size-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
            <Bell size={20} className="text-white animate-bounce" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={11} /> Live Push Alerts
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold">
              Get News & Contribution Alerts Before Opening the App
            </h3>
            <p className="text-xs text-emerald-100 max-w-xl leading-relaxed">
              Enable push notifications to receive real-time popup alerts on your device whenever an announcement, payment reminder, or contribution is made.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs text-emerald-100 hover:text-white rounded-btn transition-colors cursor-pointer"
          >
            Later
          </button>
          <button
            onClick={handleEnable}
            className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-btn text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Bell size={14} /> Enable Notifications
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-emerald-200 hover:text-white rounded-btn transition-colors cursor-pointer sm:hidden"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
