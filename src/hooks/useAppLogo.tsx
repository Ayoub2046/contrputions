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

/**
 * Hook to retrieve and reactively update the application name.
 * Strictly sources all values from Supabase app_settings in the database (never from localStorage).
 */
export function useAppName(): string {
  const [appName, setAppName] = useState<string>(DEFAULT_APP_NAME)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'app_name')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && data.value.trim().length > 0) {
          const val = data.value.trim()
          setAppName(val)
          document.title = val
          const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
          if (meta) meta.setAttribute('content', val)
        }
      })

    // Listen for realtime database changes to app_name
    const channel = supabase
      .channel('realtime_app_name')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.app_name' },
        (payload: any) => {
          const newVal = payload.new?.value
          if (newVal && newVal.trim().length > 0) {
            const val = newVal.trim()
            setAppName(val)
            document.title = val
            const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
            if (meta) meta.setAttribute('content', val)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return appName
}

/**
 * Hook to retrieve and reactively update the application logo URL.
 * Strictly sources all values from Supabase app_settings in the database (never from localStorage).
 */
export function useAppLogo(): string {
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'app_logo_url')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const val = data.value.trim()
          setLogoUrl(val)
          const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement
          if (iconLink && isSafeIconUrl(val)) iconLink.href = val
          const appleIconLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
          if (appleIconLink && isSafeIconUrl(val)) appleIconLink.href = val
        }
      })

    // Listen for realtime database changes to app_logo_url
    const channel = supabase
      .channel('realtime_app_logo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.app_logo_url' },
        (payload: any) => {
          const newVal = payload.new?.value
          if (newVal) {
            const val = newVal.trim()
            setLogoUrl(val)
            const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement
            if (iconLink && isSafeIconUrl(val)) iconLink.href = val
            const appleIconLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
            if (appleIconLink && isSafeIconUrl(val)) appleIconLink.href = val
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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
