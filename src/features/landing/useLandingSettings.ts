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
  hero_badge: 'ZUST & Baidoa University • Student Class Portal',
  hero_title: 'Transparent Class Contributions & Audited Ledger',
  hero_subtitle: 'A verified, community-powered platform for our university class. Track contributions, inspect itemized course handouts & practical expenses, download official receipts, and reach your class leadership with complete privacy.',
  hero_bg_image: '',
  hero_bg_overlay_opacity: 90,
  cta_primary_text: 'Student Sign In',
  cta_primary_link: '/login',
  cta_secondary_text: 'Class Admin Access',
  cta_secondary_link: '/login',
  show_announcement: false,
  announcement_text: 'Official Semester Contributions: 100% auditable on our class PostgreSQL ledger.',
  announcement_link: '/login',
  features_data: [
    {
      title: 'Personal Contribution Record',
      desc: 'Log in with your Student ID to check weekly and monthly contributions, remaining balances, and verified timestamps.',
      icon: 'ShieldCheck',
    },
    {
      title: 'Itemized Class Expenses',
      desc: 'Complete accounting of class printing, study handouts, practical materials, and events. Every dollar is documented.',
      icon: 'Calculator',
    },
    {
      title: 'Official Clearance Passes',
      desc: 'Instant digital payment receipts that can be printed or saved as PDF for university administrative peace of mind.',
      icon: 'FileSpreadsheet',
    },
    {
      title: 'Private Leadership Line',
      desc: 'Reach your assigned class administrator directly via phone, SMS, WhatsApp, or confidential 1-on-1 private messaging.',
      icon: 'Users',
    },
  ],
  stats_data: [
    { value: '100%', label: 'Audited Records' },
    { value: 'Zero', label: 'Hidden Balances' },
    { value: 'Itemized', label: 'Class Expenses' },
    { value: '1-on-1', label: 'Confidential Admin Line' },
  ],
}

export function useLandingSettings() {
  const [settings, setSettings] = useState<LandingPageSettings>(DEFAULT_LANDING_SETTINGS)
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
      setSaving(false)

      if (err) {
        return `Failed to save: ${err.message}`
      }

      return null
    } catch (e: any) {
      setSaving(false)
      return e.message || 'Failed to save settings'
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
