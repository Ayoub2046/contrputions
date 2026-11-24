import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_LOGO = '/classBankLogo.png'
const CACHE_KEY = 'cb_app_logo'

export function useAppLogo() {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    return localStorage.getItem(CACHE_KEY) || DEFAULT_LOGO
  })

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'app_logo_url')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          setLogoUrl(data.value)
          localStorage.setItem(CACHE_KEY, data.value)
        }
      })
  }, [])

  return logoUrl
}

export function AppLogo({
  className = 'h-8 w-auto',
  alt = 'ClassBank',
}: {
  className?: string
  alt?: string
}) {
  const logo = useAppLogo()
  const [src, setSrc] = useState(logo)

  useEffect(() => {
    setSrc(logo)
  }, [logo])

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setSrc(DEFAULT_LOGO)}
    />
  )
}
