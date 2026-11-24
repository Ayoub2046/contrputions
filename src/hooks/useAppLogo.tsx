import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const DEFAULT_LOGO = '/classBankLogo.png'
export const DEFAULT_APP_NAME = 'ClassBank'
const LOGO_CACHE_KEY = 'cb_app_logo'
const NAME_CACHE_KEY = 'cb_app_name'

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
        }
      })
  }, [appName])

  return appName
}

/**
 * Hook to retrieve and reactively update the application logo URL.
 * Automatically updates browser favicon and apple-touch-icon.
 */
export function useAppLogo(): string {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    return localStorage.getItem(LOGO_CACHE_KEY) || DEFAULT_LOGO
  })

  useEffect(() => {
    // Update favicon & apple-touch-icon link tags in DOM
    const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (iconLink && logoUrl) {
      iconLink.href = logoUrl
    }
    const appleIconLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
    if (appleIconLink && logoUrl) {
      appleIconLink.href = logoUrl
    }

    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'app_logo_url')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          setLogoUrl(data.value)
          localStorage.setItem(LOGO_CACHE_KEY, data.value)
          if (iconLink) iconLink.href = data.value
          if (appleIconLink) appleIconLink.href = data.value
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
