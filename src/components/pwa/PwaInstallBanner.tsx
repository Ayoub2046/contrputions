import { useState, useEffect } from 'react'
import { Smartphone, Download, X, Share2 } from 'lucide-react'
import { usePwaInstall } from '../../hooks/usePwaInstall'

export function PwaInstallBanner() {
  const { isInstalled, isIos, promptInstall } = usePwaInstall()
  const [dismissed, setDismissed] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true'
    if (isDismissed) setDismissed(true)
  }, [])

  if (isInstalled || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('pwa_banner_dismissed', 'true')
  }

  const handleInstall = async () => {
    if (isIos) {
      setShowIosGuide(!showIosGuide)
      return
    }
    const success = await promptInstall()
    if (success) {
      setDismissed(true)
    }
  }

  return (
    <aside
      aria-label="Install ClassBank App"
      className="relative z-40 bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 text-white px-4 py-3 shadow-md border-b border-brand-700/50"
    >
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-brand-600/50 flex items-center justify-center shrink-0 border border-brand-400/30">
            <Smartphone size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">
              Install ClassBank PWA App on your phone
            </p>
            <p className="text-slate-300 text-xs hidden sm:block">
              Fast offline access, real-time contribution tracking, and live class ledger updates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={handleInstall}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-btn bg-white text-brand-900 font-semibold text-xs shadow-sm hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
          >
            <Download size={14} /> Install Now
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1.5 rounded-btn text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS Safari Helper Dropdown */}
      {showIosGuide && (
        <div className="mx-auto max-w-7xl mt-2 p-3 bg-brand-950/90 rounded-card border border-brand-600/40 text-xs text-slate-200">
          <p className="flex items-center gap-1.5">
            <Share2 size={14} className="text-brand-400" />
            To install on iPhone/iPad: tap the <strong>Share</strong> icon in Safari, then tap <strong>Add to Home Screen</strong>.
          </p>
        </div>
      )}
    </aside>
  )
}
