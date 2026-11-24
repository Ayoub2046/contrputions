import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const DEFAULT_LOGO = '/classBankLogo.png'
export const DEFAULT_APP_NAME = 'ClassBank'
const LOGO_CACHE_KEY = 'cb_app_logo'
const NAME_CACHE_KEY = 'cb_app_name'

/**
 * Updates the Web App Manifest link in the DOM.
 * Directs to the dynamic /api/manifest serverless endpoint to safely load custom app name and logo
 * without using blob: URLs (which trigger Chrome RESULT_CODE_KILLED_BAD_MESSAGE IPC process termination).
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
    manifestLink.href = '/api/manifest'
  } catch (err) {
    console.error('Failed to update PWA manifest link:', err)
  }
}

function isSafeIconUrl(url?: string): boolean {
  if (!url) return false
  if (url.startsWith('data:') && url.length > 50000) return false // prevent Mojo IPC overflow
  return true
}

/**
 * Hook to retrieve and reactively update the application name.
 * Caches in localStorage for instant rendering and syncs with Supabase app_settings.
 */
export function useAppName(): string {
  const [appName, setAppName] = useState<string>(() => {
    return localStorage.getItem(NAME_CACHE_KEY) || DEFAULT_APP_NAME
  })

  useEffect(() => {
    // Sync document title and meta tag initially from cached state
    if (appName) {
      document.title = appName
      const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
      if (meta) meta.setAttribute('content', appName)
      const currentLogo = localStorage.getItem(LOGO_CACHE_KEY) || DEFAULT_LOGO
      updateDynamicManifest(appName, currentLogo)
    }

    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'app_name')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && data.value.trim().length > 0) {
          const val = data.value.trim()
          setAppName(val)
          localStorage.setItem(NAME_CACHE_KEY, val)
          document.title = val
          const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
          if (meta) meta.setAttribute('content', val)
          const currentLogo = localStorage.getItem(LOGO_CACHE_KEY) || DEFAULT_LOGO
          updateDynamicManifest(val, currentLogo)
        }
      })
  }, [appName])

  return appName
}

/**
 * Hook to retrieve and reactively update the application logo URL.
 * Automatically updates browser favicon, apple-touch-icon, and PWA manifest.
 */
export function useAppLogo(): string {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    return localStorage.getItem(LOGO_CACHE_KEY) || DEFAULT_LOGO
  })

  useEffect(() => {
    // Update favicon & apple-touch-icon link tags in DOM safely
    const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (iconLink && isSafeIconUrl(logoUrl)) {
      iconLink.href = logoUrl
    }
    const appleIconLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
    if (appleIconLink && isSafeIconUrl(logoUrl)) {
      appleIconLink.href = logoUrl
    }
    updateDynamicManifest()

    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'app_logo_url')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          setLogoUrl(data.value)
          localStorage.setItem(LOGO_CACHE_KEY, data.value)
          if (iconLink && isSafeIconUrl(data.value)) iconLink.href = data.value
          if (appleIconLink && isSafeIconUrl(data.value)) appleIconLink.href = data.value
          updateDynamicManifest()
        }
      })
  }, [logoUrl])

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
