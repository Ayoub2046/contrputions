import { useState } from 'react'
import { Download, Smartphone, Check, Share2, MoreVertical } from 'lucide-react'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { Modal } from '../ui/Modal'

interface PwaInstallButtonProps {
  className?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md'
}

export function PwaInstallButton({ className = '', size = 'md' }: PwaInstallButtonProps) {
  const { isInstalled, isIos, promptInstall } = usePwaInstall()
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full">
        <Check size={13} /> Installed
      </span>
    )
  }

  const handleClick = async () => {
    if (isIos) {
      setShowInstructionsModal(true)
      return
    }

    const success = await promptInstall()
    if (success) {
      setInstallSuccess(true)
    } else {
      // If native browser prompt is not immediately triggered, open visual guide
      setShowInstructionsModal(true)
    }
  }

  const sizeClasses = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-2 rounded-btn font-semibold transition-all shadow-sm cursor-pointer bg-brand-600 text-white hover:bg-brand-600/90 active:scale-95 ${sizeClasses} ${className}`}
        title="Install ClassBank PWA App on your device"
      >
        <Smartphone size={size === 'sm' ? 14 : 16} className="text-white" />
        <span>{installSuccess ? 'App Installed!' : 'Install App'}</span>
        <Download size={size === 'sm' ? 13 : 14} className="opacity-80" />
      </button>

      {/* PWA Installation Instructions Modal */}
      {showInstructionsModal && (
        <Modal
          open={showInstructionsModal}
          onClose={() => setShowInstructionsModal(false)}
          title={isIos ? 'Install ClassBank on iPhone / iPad' : 'Install ClassBank on Your Device'}
        >
          <div className="space-y-4 text-sm text-text">
            {isIos ? (
              <>
                <p className="text-secondary">
                  Follow these two quick steps in Safari to add ClassBank to your home screen:
                </p>
                <ol className="space-y-3 list-decimal list-inside bg-bg-elevated p-3.5 rounded-card border border-border">
                  <li className="leading-relaxed">
                    Tap the <strong className="text-brand-600 dark:text-brand-400">Share</strong> button <Share2 size={15} className="inline mx-1 text-brand-600" /> at the bottom of Safari.
                  </li>
                  <li className="leading-relaxed">
                    Scroll down and tap <strong className="text-brand-600 dark:text-brand-400">Add to Home Screen</strong>.
                  </li>
                </ol>
              </>
            ) : (
              <>
                <p className="text-secondary">
                  To install ClassBank as a fast standalone app on Android or PC:
                </p>
                <ol className="space-y-3 list-decimal list-inside bg-bg-elevated p-3.5 rounded-card border border-border">
                  <li className="leading-relaxed">
                    Tap the <strong>3 dots menu</strong> <MoreVertical size={15} className="inline mx-0.5 text-brand-600" /> in the top right corner of Chrome.
                  </li>
                  <li className="leading-relaxed">
                    Select <strong className="text-brand-600 dark:text-brand-400">Install app</strong> or <strong className="text-brand-600 dark:text-brand-400">Add to Home screen</strong>.
                  </li>
                  <li className="leading-relaxed">
                    Tap <strong>Install</strong> to add ClassBank to your phone home screen!
                  </li>
                </ol>
              </>
            )}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-btn bg-brand-600 text-white cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
