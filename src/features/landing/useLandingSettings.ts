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
  hero_badge: '✦ Class Contribution Transparency System',
  hero_title: 'Transparent Class Finances, Made Effortless.',
  hero_subtitle: 'Real-time student contribution tracking, audited expense logs, and automated balance reports for universities and student groups.',
  hero_bg_image: '',
  hero_bg_overlay_opacity: 85,
  cta_primary_text: 'Access Portal',
  cta_primary_link: '/login',
  cta_secondary_text: 'Explore Features',
  cta_secondary_link: '#features',
  show_announcement: true,
  announcement_text: '✨ 100% Real-time transparency: All contributions and class expenses tracked with zero hidden balances.',
  announcement_link: '#features',
  features_data: [
    {
      title: 'Real-time Auditing',
      desc: 'Every contribution and expense is instantly recorded with a permanent audit trail. No delayed ledgers or unaccounted funds.',
      icon: 'ShieldCheck',
    },
    {
      title: 'Zero Stored Balances',
      desc: 'All totals, student payment statuses, and remaining funds are derived on-the-fly from raw transaction records.',
      icon: 'Calculator',
    },
    {
      title: 'Role-Based Portals',
      desc: 'Distinct views for students to see personal accounts, class treasurers to log deposits, and super admins to govern.',
      icon: 'Users',
    },
    {
      title: '1-Click PDF Reports',
      desc: 'Export formal, audit-ready financial summaries and contribution statuses formatted for classroom meetings and school reviews.',
      icon: 'FileSpreadsheet',
    },
  ],
  stats_data: [
    { value: '100%', label: 'Raw Data Verifiability' },
    { value: '0', label: 'Hidden Balances' },
    { value: '< 2s', label: 'Instant Real-time Updates' },
    { value: 'Bank-Grade', label: 'Row Level Security' },
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
