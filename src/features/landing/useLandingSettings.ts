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
  hero_title: 'Clear class contributions. Honest records. Respect for every student.',
  hero_subtitle: 'No lost notebooks, no confusing group chats, and no public payment shaming. Check your contribution balance, review itemized class expenses for handouts and exams, print official receipts, and reach your class representative in complete 1-on-1 privacy.',
  hero_bg_image: '',
  hero_bg_overlay_opacity: 85,
  cta_primary_text: 'Student Sign In',
  cta_primary_link: '/login',
  cta_secondary_text: 'Class Admin Portal',
  cta_secondary_link: '/login',
  show_announcement: false,
  announcement_text: '',
  announcement_link: '/login',
  features_data: [
    {
      title: 'Private & Dignified Records',
      desc: 'Only you and your class leader see your contribution status. Your personal financial circumstances stay completely confidential.',
      icon: 'Lock',
    },
    {
      title: 'Open Class Expenses',
      desc: 'Every dollar collected is accounted for: exam booklet printing, laboratory equipment, study handouts, and lecture hall reservations.',
      icon: 'Receipt',
    },
    {
      title: 'Confidential 1-on-1 Messaging',
      desc: 'Message your class representative privately about payment confirmations or personal delays without group chat exposure.',
      icon: 'MessageSquareText',
    },
    {
      title: 'Official Clearance Pass',
      desc: 'Instant digital and printable PDF contribution passes for exam clearance and university administration verification.',
      icon: 'FileCheck',
    },
  ],
  stats_data: [
    { value: '100% Private', label: 'Student-to-Admin Line' },
    { value: 'Zero', label: 'Public Payment Shaming' },
    { value: 'Itemized', label: 'Exam & Lab Expenses' },
    { value: 'Verified', label: 'PDF Semester Passes' },
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
