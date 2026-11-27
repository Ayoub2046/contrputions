import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const DEFAULT_LOGO = '/classBankLogo.png'
export const DEFAULT_APP_NAME = 'ClassBank'

/**
 * Updates the Web App Manifest link in the DOM.
 * Directs to the dynamic /api/manifest serverless endpoint to safely load custom app name and logo
 * from the database without using blob: URLs.
 */
export function updateDynamicManifest(_appName?: string, _logoUrl?: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  try {
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
    if (!manifestLink) {
      manifestLink = document.createElement('link')
      manifestLink.rel = 'manifest'
      document.head.appendChild(manifestLink)
    }
    if (manifestLink.getAttribute('href') !== '/api/manifest') {
      manifestLink.setAttribute('href', '/api/manifest')
    }
  } catch (err) {
    console.error('Failed to update PWA manifest link:', err)
  }
}

function isSafeIconUrl(url?: string): boolean {
  if (!url) return false
  if (url.startsWith('data:') || url.startsWith('blob:') || url.length > 1000) return false
  return true
}

// -------------------------------------------------------------
// Shared Singleton State for App Branding (Zero duplicate channel conflicts)
// -------------------------------------------------------------
let globalAppName: string = DEFAULT_APP_NAME
let globalLogoUrl: string = DEFAULT_LOGO
let hasLoadedInitial: boolean = false

const nameSubscribers = new Set<(name: string) => void>()
const logoSubscribers = new Set<(logo: string) => void>()
let sharedBrandingChannel: ReturnType<typeof supabase.channel> | null = null

function ensureBrandingSubscription() {
  if (typeof window === 'undefined') return

  // 1. Initial Load from Supabase Database
  if (!hasLoadedInitial) {
    hasLoadedInitial = true
    supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['app_name', 'app_logo_url'])
      .then(({ data }) => {
        if (data) {
          data.forEach((row) => {
            if (row.key === 'app_name' && row.value?.trim()) {
              const val = row.value.trim()
              globalAppName = val
              document.title = val
              const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
              if (meta) meta.setAttribute('content', val)
              nameSubscribers.forEach((cb) => cb(val))
            }
            if (row.key === 'app_logo_url' && row.value?.trim()) {
              const val = row.value.trim()
              globalLogoUrl = val
              const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement
              if (iconLink && isSafeIconUrl(val)) iconLink.href = val
              const appleIconLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
              if (appleIconLink && isSafeIconUrl(val)) appleIconLink.href = val
              logoSubscribers.forEach((cb) => cb(val))
            }
          })
        }
      })
  }

  // 2. Realtime Listener: Exactly ONE shared channel across the entire application
  if (!sharedBrandingChannel) {
    // Check if channel already registered in Supabase client to prevent duplicate errors
    const existing = supabase.getChannels().find((c: any) => c.topic === 'realtime:shared_app_branding' || c.name === 'shared_app_branding')
    if (existing) {
      supabase.removeChannel(existing)
    }

    sharedBrandingChannel = supabase
      .channel('shared_app_branding')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        (payload: any) => {
          const row = payload.new
          if (!row || !row.key) return

          if (row.key === 'app_name' && row.value?.trim()) {
            const val = row.value.trim()
            globalAppName = val
            document.title = val
            const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
            if (meta) meta.setAttribute('content', val)
            nameSubscribers.forEach((cb) => cb(val))
          } else if (row.key === 'app_logo_url' && row.value?.trim()) {
            const val = row.value.trim()
            globalLogoUrl = val
            const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement
            if (iconLink && isSafeIconUrl(val)) iconLink.href = val
            const appleIconLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
            if (appleIconLink && isSafeIconUrl(val)) appleIconLink.href = val
            logoSubscribers.forEach((cb) => cb(val))
          }
        }
      )
      .subscribe()
  }
}

/**
 * Manually notify all branding subscribers when SettingsPage saves a new name or logo
 */
export function notifyAppBrandingChanged(name?: string, logo?: string) {
  if (name && name.trim()) {
    const val = name.trim()
    globalAppName = val
    document.title = val
    const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (meta) meta.setAttribute('content', val)
    nameSubscribers.forEach((cb) => cb(val))
  }
  if (logo && logo.trim()) {
    const val = logo.trim()
    globalLogoUrl = val
    const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (iconLink && isSafeIconUrl(val)) iconLink.href = val
    const appleIconLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
    if (appleIconLink && isSafeIconUrl(val)) appleIconLink.href = val
    logoSubscribers.forEach((cb) => cb(val))
  }
}

/**
 * Hook to retrieve and reactively update the application name.
 * Strictly sources all values from Supabase app_settings in the database (never from localStorage).
 */
export function useAppName(): string {
  const [appName, setAppName] = useState<string>(globalAppName)

  useEffect(() => {
    ensureBrandingSubscription()
    nameSubscribers.add(setAppName)
    // Synchronize state if updated before subscribe
    setAppName(globalAppName)

    return () => {
      nameSubscribers.delete(setAppName)
    }
  }, [])

  return appName
}

/**
 * Hook to retrieve and reactively update the application logo URL.
 * Strictly sources all values from Supabase app_settings in the database (never from localStorage).
 */
export function useAppLogo(): string {
  const [logoUrl, setLogoUrl] = useState<string>(globalLogoUrl)

  useEffect(() => {
    ensureBrandingSubscription()
    logoSubscribers.add(setLogoUrl)
    setLogoUrl(globalLogoUrl)

    return () => {
      logoSubscribers.delete(setLogoUrl)
    }
  }, [])

  return logoUrl
}

/**
 * Combined branding hook for both application name and logo URL.
 */
export function useAppBranding() {
  const appName = useAppName()
  const logoUrl = useAppLogo()
  return { appName, logoUrl }
}

export function AppLogo({
  className = 'h-8 w-auto',
  alt,
}: {
  className?: string
  alt?: string
}) {
  const logo = useAppLogo()
  const appName = useAppName()
  const [src, setSrc] = useState(logo)

  useEffect(() => {
    setSrc(logo)
  }, [logo])

  return (
    <img
      src={src}
      alt={alt || appName}
      className={className}
      onError={() => setSrc(DEFAULT_LOGO)}
    />
  )
}
