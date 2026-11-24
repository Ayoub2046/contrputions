import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (window as any).__deferredPwaPrompt || null
  })
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    if ((window as any).__deferredPwaPrompt) {
      setDeferredPrompt((window as any).__deferredPwaPrompt)
    }
    // Check if running in standalone mode (already installed PWA)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    setIsInstalled(isStandaloneMode)

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIos(isAppleDevice && !(window as any).MSStream)

    // Listen for the Chrome / Edge / Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false
    }

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setIsInstalled(true)
        setDeferredPrompt(null)
        return true
      }
    } catch (err) {
      console.warn('Install prompt error:', err)
    }
    return false
  }

  return {
    canInstall: Boolean(deferredPrompt) || (isIos && !isInstalled),
    hasPrompt: Boolean(deferredPrompt),
    isInstalled,
    isIos,
    promptInstall,
  }
}
