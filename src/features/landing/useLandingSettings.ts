import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { LandingPageSettings } from '../../lib/types'

export const HERO_BG_PRESETS = [
  {
    id: 'none',
    name: 'Modern Gradient Mesh',
    url: '',
    preview: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0A192F 100%)',
  },
  {
    id: 'campus',
    name: 'University Campus',
    url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop',
    preview: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'classroom',
    name: 'Modern Classroom',
    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop',
    preview: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'abstract_navy',
    name: 'Navy Geometric',
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2074&auto=format&fit=crop',
    preview: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=300&auto=format&fit=crop',
  },
]

export const DEFAULT_LANDING_SETTINGS: LandingPageSettings = {
  id: 'default',
  hero_badge: '✦ Class Mutual Support & Contribution Transparency',
  hero_title: 'Transparent Class Contributions & Student Charity',
  hero_subtitle: 'A student-first mutual aid and contribution platform. Real-time contribution tracking, audited expense logs, and collective peer support so no classmate is left behind.',
  hero_bg_image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop',
  hero_bg_overlay_opacity: 85,
  cta_primary_text: 'Access Class Portal',
  cta_primary_link: '/login',
  cta_secondary_text: 'Student Mercy Pledge',
  cta_secondary_link: '#charity-pledge',
  show_announcement: true,
  announcement_text: '❤️ Stand with your classmates: 100% of class contributions are verified and audited live.',
  announcement_link: '#charity-pledge',
  features_data: [
    {
      title: 'Peer Emergency Lifeline',
      desc: 'Collective class pooling to assist classmates facing sudden financial distress, exam clearance deadlines, or study expenses.',
      icon: 'ShieldCheck',
    },
    {
      title: 'Zero Hidden Balances',
      desc: 'All totals, student payment statuses, and remaining funds are derived on-the-fly directly from verified raw transaction logs.',
      icon: 'Calculator',
    },
    {
      title: 'Shared Graduation Goal',
      desc: 'Ensuring every single brother and sister in the class finishes their semester and walks across the graduation stage together.',
      icon: 'Users',
    },
    {
      title: '1-Click PDF Audits',
      desc: 'Export formal, unalterable financial statements at any moment for class meetings, student body reviews, and administrative peace of mind.',
      icon: 'FileSpreadsheet',
    },
  ],
  stats_data: [
    { value: '100%', label: 'Audited Transparency' },
    { value: '0', label: 'Classmates Left Behind' },
    { value: '< 2s', label: 'Instant Live Updates' },
    { value: 'Bank-Grade', label: 'Row-Level Security' },
  ],
}

const LOCAL_STORAGE_KEY = 'classbank_landing_settings'

function safeSaveToLocalStorage(data: LandingPageSettings) {
  try {
    const toStore: LandingPageSettings = { ...data }
    // If the image is a base64 data URL, avoid blowing up localStorage's 5MB quota
    if (toStore.hero_bg_image && toStore.hero_bg_image.startsWith('data:') && toStore.hero_bg_image.length > 200000) {
      toStore.hero_bg_image = ''
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toStore))
  } catch (err) {
    console.warn('LocalStorage quota exceeded or restricted; skipping local cache:', err)
  }
}

export function useLandingSettings() {
  const [settings, setSettings] = useState<LandingPageSettings>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (cached) return JSON.parse(cached)
    } catch {
      // ignore
    }
    return DEFAULT_LANDING_SETTINGS
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('landing_page_settings')
        .select('*')
        .eq('id', 'default')
        .single()

      if (!err && data) {
        const merged: LandingPageSettings = {
          ...DEFAULT_LANDING_SETTINGS,
          ...data,
          features_data: Array.isArray(data.features_data) && data.features_data.length > 0
            ? data.features_data
            : DEFAULT_LANDING_SETTINGS.features_data,
          stats_data: Array.isArray(data.stats_data) && data.stats_data.length > 0
            ? data.stats_data
            : DEFAULT_LANDING_SETTINGS.stats_data,
        }
        setSettings(merged)
        safeSaveToLocalStorage(merged)
      } else {
        // Fallback to cached or defaults
        try {
          const cached = localStorage.getItem(LOCAL_STORAGE_KEY)
          if (cached) setSettings(JSON.parse(cached))
        } catch {}
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSettings = async (updated: Partial<LandingPageSettings>): Promise<string | null> => {
    setSaving(true)
    setError(null)
    const payload: LandingPageSettings = {
      ...settings,
      ...updated,
      id: 'default',
      updated_at: new Date().toISOString(),
    }

    try {
      const { error: err } = await supabase
        .from('landing_page_settings')
        .upsert(payload as never)

      setSettings(payload)
      safeSaveToLocalStorage(payload)
      setSaving(false)

      if (err) {
        return `Saved locally (Database notice: ${err.message})`
      }

      return null
    } catch (e: any) {
      setSettings(payload)
      safeSaveToLocalStorage(payload)
      setSaving(false)
      return e.message || 'Saved locally with warning'
    }
  }

  const resetDefaults = async (): Promise<string | null> => {
    return saveSettings(DEFAULT_LANDING_SETTINGS)
  }

  return {
    settings,
    loading,
    saving,
    error,
    refetch: fetchSettings,
    saveSettings,
    resetDefaults,
  }
}
