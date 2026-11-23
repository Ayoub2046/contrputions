import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useLandingSettings, HERO_BG_PRESETS } from '../landing/useLandingSettings'
import type { FeatureItem, StatItem, LandingPageSettings } from '../../lib/types'
import {
  Globe,
  Save,
  RotateCcw,
  ExternalLink,
  Image as ImageIcon,
  Sliders,
  Type,
  Bell,
  Sparkles,
  Layers,
  BarChart3,
  CheckCircle2,
  Upload,
} from 'lucide-react'

const ICON_OPTIONS = [
  'ShieldCheck',
  'Calculator',
  'Users',
  'FileSpreadsheet',
  'Wallet',
  'Lock',
  'PieChart',
  'Receipt',
  'Scale',
  'Sparkles',
  'CheckCircle',
]

export function LandingCmsPage() {
  const { t } = useTranslation()
  const { settings, loading, saving, saveSettings, resetDefaults } = useLandingSettings()

  const [form, setForm] = useState<LandingPageSettings>(settings)
  const [bgMode, setBgMode] = useState<'preset' | 'custom' | 'upload'>('preset')
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'hero' | 'announcement' | 'features' | 'stats'>('hero')

  useEffect(() => {
    setForm(settings)
    if (settings.hero_bg_image?.startsWith('data:')) {
      setBgMode('upload')
    } else if (HERO_BG_PRESETS.some(p => p.url === settings.hero_bg_image)) {
      setBgMode('preset')
    } else if (settings.hero_bg_image) {
      setBgMode('custom')
    } else {
      setBgMode('preset')
    }
  }, [settings])

  const handleSave = async () => {
    setSaveMessage(null)
    const err = await saveSettings(form)
    if (err) {
      setSaveMessage({ type: err.startsWith('Saved locally') ? 'success' : 'error', text: err })
    } else {
      setSaveMessage({ type: 'success', text: 'Landing page content updated successfully!' })
    }
    setTimeout(() => setSaveMessage(null), 5000)
  }

  const handleReset = async () => {
    if (!window.confirm('Reset all landing page settings back to default?')) return
    await resetDefaults()
    setSaveMessage({ type: 'success', text: 'Settings reset to default.' })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).')
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('Image file size should be less than 3MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setForm(prev => ({ ...prev, hero_bg_image: result }))
    }
    reader.readAsDataURL(file)
  }

  const updateFeature = (index: number, field: keyof FeatureItem, value: string) => {
    setForm(prev => {
      const updated = [...prev.features_data]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, features_data: updated }
    })
  }

  const updateStat = (index: number, field: keyof StatItem, value: string) => {
    setForm(prev => {
      const updated = [...prev.stats_data]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, stats_data: updated }
    })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-btn bg-brand-50 dark:bg-brand-900/40 text-brand-600">
              <Globe size={18} />
            </span>
            <h1 className="text-2xl font-bold text-text">Landing Page CMS</h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            Control all public visitor content, hero background image, announcements, and feature cards.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-btn border border-border bg-bg-card text-secondary hover:text-text hover:bg-bg-elevated transition-colors"
          >
            <ExternalLink size={14} /> Preview Live Page
          </a>
          <Button variant="secondary" size="sm" onClick={handleReset}>
            <RotateCcw size={14} /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} loading={saving}>
            <Save size={14} /> Save Changes
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {saveMessage && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-btn text-sm font-medium border ${
            saveMessage.type === 'success'
              ? 'bg-success/10 text-success border-success/30'
              : 'bg-error/10 text-error border-error/30'
          }`}
        >
          <CheckCircle2 size={16} />
          <span>{saveMessage.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-1 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('hero')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-btn transition-colors cursor-pointer ${
            activeTab === 'hero'
              ? 'bg-brand-600 text-white'
              : 'text-secondary hover:text-text hover:bg-bg-elevated'
          }`}
        >
          <ImageIcon size={15} /> Hero & Background
        </button>
        <button
          onClick={() => setActiveTab('announcement')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-btn transition-colors cursor-pointer ${
            activeTab === 'announcement'
              ? 'bg-brand-600 text-white'
              : 'text-secondary hover:text-text hover:bg-bg-elevated'
          }`}
        >
          <Bell size={15} /> Announcement Bar
        </button>
        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-btn transition-colors cursor-pointer ${
            activeTab === 'features'
              ? 'bg-brand-600 text-white'
              : 'text-secondary hover:text-text hover:bg-bg-elevated'
          }`}
        >
          <Layers size={15} /> Feature Cards
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-btn transition-colors cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-brand-600 text-white'
              : 'text-secondary hover:text-text hover:bg-bg-elevated'
          }`}
        >
          <BarChart3 size={15} /> Stats & Numbers
        </button>
      </div>

      {/* TAB 1: HERO & BACKGROUND IMAGE */}
      {activeTab === 'hero' && (
        <div className="space-y-6">
          {/* Background Image Settings Card */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon size={18} className="text-brand-600" />
                  <h2 className="text-base font-bold text-text">Hero Background Image</h2>
                </div>
                <span className="text-xs text-muted">Visitors will see this on the landing page</span>
              </div>

              {/* Source Mode Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBgMode('preset')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-btn border transition-colors cursor-pointer ${
                    bgMode === 'preset'
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-bg-card text-secondary border-border hover:bg-bg-elevated'
                  }`}
                >
                  Choose Preset
                </button>
                <button
                  type="button"
                  onClick={() => setBgMode('custom')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-btn border transition-colors cursor-pointer ${
                    bgMode === 'custom'
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-bg-card text-secondary border-border hover:bg-bg-elevated'
                  }`}
                >
                  Custom Image URL
                </button>
                <button
                  type="button"
                  onClick={() => setBgMode('upload')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-btn border transition-colors cursor-pointer ${
                    bgMode === 'upload'
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-bg-card text-secondary border-border hover:bg-bg-elevated'
                  }`}
                >
                  Upload Image
                </button>
              </div>

              {/* Preset Selector */}
              {bgMode === 'preset' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {HERO_BG_PRESETS.map((p) => {
                    const isSelected = form.hero_bg_image === p.url
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, hero_bg_image: p.url }))}
                        className={`group relative overflow-hidden rounded-card border-2 p-1 text-left transition-all cursor-pointer ${
                          isSelected ? 'border-brand-600 shadow-md ring-2 ring-brand-600/20' : 'border-border hover:border-border-hover'
                        }`}
                      >
                        <div
                          className="h-20 w-full rounded-btn bg-cover bg-center"
                          style={{
                            background: p.url ? `url(${p.preview}) center/cover no-repeat` : p.preview,
                          }}
                        />
                        <div className="pt-2 px-1">
                          <p className="text-xs font-semibold text-text truncate">{p.name}</p>
                          <p className="text-[10px] text-muted">{p.url ? 'Photo' : 'Mesh Gradient'}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Custom URL Input */}
              {bgMode === 'custom' && (
                <div className="space-y-2 pt-2">
                  <Input
                    id="customUrl"
                    label="Image URL"
                    value={form.hero_bg_image}
                    onChange={(e) => setForm(prev => ({ ...prev, hero_bg_image: e.target.value }))}
                    placeholder="https://images.unsplash.com/... or direct image link"
                  />
                  <p className="text-[11px] text-muted">
                    Supports HTTPS links from Unsplash, Imgur, Supabase Storage, or any CDN.
                  </p>
                </div>
              )}

              {/* Upload Input */}
              {bgMode === 'upload' && (
                <div className="space-y-2 pt-2">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-card cursor-pointer hover:bg-bg-elevated/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                      <Upload size={24} className="text-muted mb-2" />
                      <p className="text-xs font-medium text-text">Click to choose image or drag & drop</p>
                      <p className="text-[10px] text-muted mt-1">PNG, JPG, WebP up to 3MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {form.hero_bg_image?.startsWith('data:') && (
                    <p className="text-xs text-success flex items-center gap-1 font-medium">
                      <CheckCircle2 size={13} /> Custom image uploaded and ready to save.
                    </p>
                  )}
                </div>
              )}

              {/* Overlay Opacity Slider */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-text flex items-center gap-1.5">
                    <Sliders size={14} className="text-brand-600" /> Adaptive Theme Overlay Opacity
                  </span>
                  <span className="text-brand-600 font-mono">{form.hero_bg_overlay_opacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  step="5"
                  value={form.hero_bg_overlay_opacity}
                  onChange={(e) => setForm(prev => ({ ...prev, hero_bg_overlay_opacity: Number(e.target.value) }))}
                  className="w-full accent-brand-600 cursor-pointer"
                />
                <p className="text-[11px] text-muted">
                  Higher values (80-90%) ensure text is ultra-readable across light and dark modes regardless of image brightness.
                </p>
              </div>

              {/* Live Preview Box */}
              <div className="space-y-2 pt-4 border-t border-border">
                <p className="text-xs font-bold text-text uppercase tracking-wider">Live Preview</p>
                <div className="relative rounded-card overflow-hidden border border-border h-48 flex items-center justify-center p-6 text-center">
                  {form.hero_bg_image ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${form.hero_bg_image})` }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-bg-main via-brand-50/50 to-bg-main dark:from-bg-main dark:via-brand-900/20 dark:to-bg-main" />
                  )}
                  {form.hero_bg_image && (
                    <div
                      className="absolute inset-0 bg-bg-main backdrop-blur-[1px]"
                      style={{ opacity: form.hero_bg_overlay_opacity / 100 }}
                    />
                  )}
                  <div className="relative z-10 max-w-md space-y-2">
                    <span className="inline-block text-[11px] font-semibold text-brand-600 dark:text-brand-900 bg-brand-50 dark:bg-brand-900/40 px-2.5 py-0.5 rounded-full border border-brand-600/30">
                      {form.hero_badge || 'Preview Badge'}
                    </span>
                    <h3 className="text-xl font-serif font-bold text-text leading-tight truncate">
                      {form.hero_title || 'Hero Title Preview'}
                    </h3>
                    <p className="text-xs text-secondary line-clamp-2">
                      {form.hero_subtitle || 'Hero Subtitle Preview'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hero Typography & CTA Controls */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Type size={18} className="text-brand-600" />
                <h2 className="text-base font-bold text-text">Hero Copywriting & Buttons</h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Input
                  id="badge"
                  label="Hero Badge Text"
                  value={form.hero_badge}
                  onChange={(e) => setForm(prev => ({ ...prev, hero_badge: e.target.value }))}
                  placeholder="e.g. ✦ Class Contribution Transparency System"
                />

                <Input
                  id="title"
                  label="Main Headline (Title)"
                  value={form.hero_title}
                  onChange={(e) => setForm(prev => ({ ...prev, hero_title: e.target.value }))}
                  placeholder="e.g. Transparent Class Finances, Made Effortless."
                />

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Subtitle / Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.hero_subtitle}
                    onChange={(e) => setForm(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                    className="w-full rounded-btn border border-border-hover bg-bg-card p-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-600/30"
                    placeholder="Describe the platform in 1-2 sentences..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <Input
                    id="ctaPrimaryText"
                    label="Primary Button Text"
                    value={form.cta_primary_text}
                    onChange={(e) => setForm(prev => ({ ...prev, cta_primary_text: e.target.value }))}
                    placeholder="e.g. Access Portal"
                  />
                  <Input
                    id="ctaPrimaryLink"
                    label="Primary Button Link"
                    value={form.cta_primary_link}
                    onChange={(e) => setForm(prev => ({ ...prev, cta_primary_link: e.target.value }))}
                    placeholder="e.g. /login"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id="ctaSecondaryText"
                    label="Secondary Button Text"
                    value={form.cta_secondary_text}
                    onChange={(e) => setForm(prev => ({ ...prev, cta_secondary_text: e.target.value }))}
                    placeholder="e.g. Explore Features"
                  />
                  <Input
                    id="ctaSecondaryLink"
                    label="Secondary Button Link"
                    value={form.cta_secondary_link}
                    onChange={(e) => setForm(prev => ({ ...prev, cta_secondary_link: e.target.value }))}
                    placeholder="e.g. #features"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: ANNOUNCEMENT BAR */}
      {activeTab === 'announcement' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-brand-600" />
                <h2 className="text-base font-bold text-text">Top Announcement Banner</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.show_announcement}
                  onChange={(e) => setForm(prev => ({ ...prev, show_announcement: e.target.checked }))}
                  className="rounded text-brand-600 h-4 w-4"
                />
                <span className="text-xs font-semibold text-text">Enable Banner</span>
              </label>
            </div>

            <div className="space-y-4 pt-2">
              <Input
                id="announcementText"
                label="Banner Message"
                value={form.announcement_text}
                onChange={(e) => setForm(prev => ({ ...prev, announcement_text: e.target.value }))}
                placeholder="e.g. ✨ Real-time transparency: All contributions and expenses tracked live."
              />

              <Input
                id="announcementLink"
                label="Optional Clickable URL / Anchor"
                value={form.announcement_link}
                onChange={(e) => setForm(prev => ({ ...prev, announcement_link: e.target.value }))}
                placeholder="e.g. #features or /login"
              />

              {form.show_announcement && (
                <div className="pt-2">
                  <p className="text-xs text-muted mb-1 font-medium">Banner Preview:</p>
                  <div className="bg-brand-600 text-white px-4 py-2 rounded-btn text-xs font-semibold text-center flex items-center justify-center gap-2">
                    <Sparkles size={14} />
                    <span>{form.announcement_text || 'Your announcement will appear here'}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: FEATURE CARDS */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-bold text-text">Feature Cards (4 Highlights)</h2>
                <p className="text-xs text-secondary mt-0.5">
                  Customize the 4 core capability cards shown on the public landing page.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {form.features_data.map((feat, idx) => (
                  <div key={idx} className="rounded-card border border-border bg-bg-elevated/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-600">Card #{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-muted">Icon:</label>
                        <select
                          value={feat.icon}
                          onChange={(e) => updateFeature(idx, 'icon', e.target.value)}
                          className="rounded-btn border border-border bg-bg-card px-2 py-1 text-xs text-text focus:outline-none"
                        >
                          {ICON_OPTIONS.map((ico) => (
                            <option key={ico} value={ico}>{ico}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Input
                      id={`feat-title-${idx}`}
                      label="Feature Title"
                      value={feat.title}
                      onChange={(e) => updateFeature(idx, 'title', e.target.value)}
                    />

                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">
                        Feature Description
                      </label>
                      <textarea
                        rows={3}
                        value={feat.desc}
                        onChange={(e) => updateFeature(idx, 'desc', e.target.value)}
                        className="w-full rounded-btn border border-border-hover bg-bg-card p-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-brand-600/30"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: STATS & NUMBERS */}
      {activeTab === 'stats' && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-text">Statistics Bar (4 Metrics)</h2>
              <p className="text-xs text-secondary mt-0.5">
                High-impact metrics displayed directly beneath the hero section.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {form.stats_data.map((stat, idx) => (
                <div key={idx} className="rounded-card border border-border bg-bg-elevated/40 p-4 space-y-3">
                  <span className="text-xs font-bold text-brand-600">Stat #{idx + 1}</span>
                  <Input
                    id={`stat-val-${idx}`}
                    label="Value / Metric"
                    value={stat.value}
                    onChange={(e) => updateStat(idx, 'value', e.target.value)}
                    placeholder="e.g. 100%"
                  />
                  <Input
                    id={`stat-lbl-${idx}`}
                    label="Label"
                    value={stat.label}
                    onChange={(e) => updateStat(idx, 'label', e.target.value)}
                    placeholder="e.g. Financial Transparency"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating Save Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-card border border-border bg-bg-card/95 p-4 shadow-xl backdrop-blur-md">
        <span className="text-xs text-secondary">
          Remember to save changes to make them live on the public landing page.
        </span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleReset}>
            <RotateCcw size={14} /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} loading={saving}>
            <Save size={14} /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
