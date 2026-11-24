import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { adminCreateUser } from '../../lib/admin-api'
import { supabase } from '../../lib/supabase'
import { Globe, Shield, KeyRound, Image as ImageIcon, Upload, CheckCircle2, Type, Sparkles } from 'lucide-react'
import { DEFAULT_APP_NAME, DEFAULT_LOGO } from '../../hooks/useAppLogo'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'

  const [sid, setSid] = useState('')
  const [name, setName] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [pwd, setPwd] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwMessage, setPwMessage] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  // App Identity & Branding state (super_admin only)
  const [appNameInput, setAppNameInput] = useState<string>(() => {
    return localStorage.getItem('cb_app_name') || DEFAULT_APP_NAME
  })
  const [appNameSaving, setAppNameSaving] = useState(false)
  const [appNameMsg, setAppNameMsg] = useState('')

  const [currentLogo, setCurrentLogo] = useState<string>(() => {
    return localStorage.getItem('cb_app_logo') || DEFAULT_LOGO
  })
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoMsg, setLogoMsg] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load current app name and logo URL from app_settings
    supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['app_logo_url', 'app_name'])
      .then(({ data }) => {
        if (data) {
          data.forEach((row) => {
            if (row.key === 'app_logo_url' && row.value) {
              setCurrentLogo(row.value)
              localStorage.setItem('cb_app_logo', row.value)
            }
            if (row.key === 'app_name' && row.value) {
              setAppNameInput(row.value)
              localStorage.setItem('cb_app_name', row.value)
            }
          })
        }
      })
  }, [])

  async function handleSaveAppName(e: React.FormEvent) {
    e.preventDefault()
    if (!appNameInput.trim()) return
    setAppNameSaving(true)
    setAppNameMsg('')

    const val = appNameInput.trim()
    const { error: settingsError } = await supabase
      .from('app_settings')
      .upsert(
        { key: 'app_name', value: val, updated_by: user?.id, updated_at: new Date().toISOString() } as never,
        { onConflict: 'key' }
      )

    if (!settingsError) {
      localStorage.setItem('cb_app_name', val)
      document.title = val
      const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
      if (meta) meta.setAttribute('content', val)
      setAppNameMsg(`✓ Application name updated to "${val}"!`)
      window.dispatchEvent(new Event('storage'))
    } else {
      setAppNameMsg('Failed to update name: ' + settingsError.message)
    }
    setAppNameSaving(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setLogoMsg('Please select an image file (PNG, JPG, SVG).'); return }
    if (file.size > 2 * 1024 * 1024) { setLogoMsg('File must be smaller than 2 MB.'); return }

    setLogoUploading(true)
    setLogoMsg('')

    // Upload to Supabase storage bucket "app-assets"
    const ext = file.name.split('.').pop()
    const path = `logo/classbank-logo-${Date.now()}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('app-assets')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      // Fallback: store as base64 data URL in app_settings
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string
        const { error: settingsError } = await supabase
          .from('app_settings')
          .upsert({ key: 'app_logo_url', value: dataUrl, updated_by: user?.id, updated_at: new Date().toISOString() } as never, { onConflict: 'key' })
        if (!settingsError) {
          setCurrentLogo(dataUrl)
          localStorage.setItem('cb_app_logo', dataUrl)
          window.dispatchEvent(new Event('storage'))
          setLogoMsg('✓ Logo updated successfully.')
        } else {
          setLogoMsg('Failed to save logo: ' + settingsError.message)
        }
        setLogoUploading(false)
      }
      reader.readAsDataURL(file)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from('app-assets').getPublicUrl(uploadData.path)

    // Save URL to app_settings
    const { error: settingsError } = await supabase
      .from('app_settings')
      .upsert({ key: 'app_logo_url', value: publicUrl, updated_by: user?.id, updated_at: new Date().toISOString() } as never, { onConflict: 'key' })

    if (!settingsError) {
      setCurrentLogo(publicUrl)
      localStorage.setItem('cb_app_logo', publicUrl)
      window.dispatchEvent(new Event('storage'))
      setLogoMsg('✓ Logo updated successfully across all dashboards and student install screens!')
    } else {
      setLogoMsg('Failed to save logo URL: ' + settingsError.message)
    }
    setLogoUploading(false)
  }

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'so', label: 'Soomaali' },
  ]

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!sid.trim() || !name.trim() || !pwd.trim()) return
    setLoading(true)
    setMsg('')
    const { error } = await adminCreateUser(sid.trim(), name.trim(), pwd.trim(), null, 'admin', adminPhone.trim() || null)
    setMsg(error || t('settings.success'))
    if (!error) { setSid(''); setName(''); setAdminPhone(''); setPwd('') }
    setLoading(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwMessage('')
    setPwError('')
    setPwLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: (await supabase.auth.getUser()).data.user?.email ?? '',
      password: currentPassword,
    })
    if (signInError) {
      setPwError(t('auth.changePassword.incorrect'))
      setPwLoading(false)
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) setPwError(updateError.message)
    else { setPwMessage(t('auth.changePassword.success')); setCurrentPassword(''); setNewPassword('') }
    setPwLoading(false)
  }

  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] flex items-center justify-center shadow-sm">
          <Globe size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332] dark:text-[#e8f0f8]">{t('settings.title')}</h1>
          <p className="text-xs text-[#9FBBDE]">Application preferences and account settings</p>
        </div>
      </div>

      <Card className="border-[#ECECEC] dark:border-[#1e3550] shadow-sm">
        {/* Language */}
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="size-9 rounded-lg bg-[#EAF4FB] dark:bg-[#0d2a40] flex items-center justify-center shrink-0 mt-0.5">
              <Globe size={18} className="text-[#1176BC]" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8] mb-1">{t('settings.language')}</h2>
              <p className="text-xs text-[#9FBBDE] mb-3">{t('settings.languageLabel')}</p>
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="block w-full max-w-xs rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-[#EAF4FB]/40 dark:bg-[#0d2a40]/40 px-3 py-2 text-sm text-[#1a2332] dark:text-[#e8f0f8] focus:outline-none focus:ring-2 focus:ring-[#25A8E0]/30"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>

        {/* Application Identity & Branding — SUPER ADMIN ONLY */}
        {isSuperAdmin && (
          <div className="border-t border-[#ECECEC] dark:border-[#1e3550]">
            <CardContent className="p-5 space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="size-9 rounded-lg bg-[#EAF4FB] dark:bg-[#0d2a40] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={18} className="text-[#1176BC]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8]">
                      Application Identity & Branding
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-xs text-[#9FBBDE] mt-0.5">
                    Configure the platform title and logo. These appear on the header, login page, student digital pass, and home screen install prompts.
                  </p>
                </div>
              </div>

              {/* 1. Application Name Configuration */}
              <div className="pl-0 sm:pl-13 space-y-3">
                <form onSubmit={handleSaveAppName} className="space-y-3 max-w-lg">
                  <div className="space-y-1.5">
                    <label htmlFor="app-name-input" className="block text-xs font-semibold text-text flex items-center gap-1.5">
                      <Type size={13} className="text-[#1176BC]" /> Application Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="app-name-input"
                        type="text"
                        value={appNameInput}
                        onChange={(e) => setAppNameInput(e.target.value)}
                        placeholder="e.g. ClassBank or University Batch 4"
                        required
                        className="flex-1 rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-600/30 font-medium"
                      />
                      <button
                        type="submit"
                        disabled={appNameSaving || !appNameInput.trim()}
                        className="px-4 py-2 rounded-xl bg-[#1176BC] text-white text-xs sm:text-sm font-semibold hover:bg-[#0D5A8A] transition-colors cursor-pointer disabled:opacity-60 shrink-0"
                      >
                        {appNameSaving ? 'Saving…' : 'Save Name'}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted">
                      Changes the site title, PWA header, and student portal title dynamically.
                    </p>
                  </div>
                  {appNameMsg && (
                    <p className={`text-xs font-medium flex items-center gap-1.5 p-2 rounded-xl border ${
                      appNameMsg.startsWith('✓')
                        ? 'text-[#0C9B5E] bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                        : 'text-red-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                    }`}>
                      {appNameMsg.startsWith('✓') && <CheckCircle2 size={13} />}
                      {appNameMsg}
                    </p>
                  )}
                </form>
              </div>

              {/* 2. Application Logo Configuration */}
              <div className="pl-0 sm:pl-13 pt-4 border-t border-[#ECECEC] dark:border-[#1e3550] space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-text flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-[#1176BC]" /> Application Logo
                  </label>
                  <p className="text-xs text-secondary">
                    Shown to all students, administrators, and when installing the app on mobile devices.
                    Max size: 2 MB · PNG or SVG recommended.
                  </p>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Current logo preview */}
                  <div className="size-16 rounded-2xl border-2 border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] flex items-center justify-center overflow-hidden p-2 shadow-sm">
                    <img
                      src={currentLogo}
                      alt="Current Logo"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/classBankLogo.png' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1176BC] text-white text-xs sm:text-sm font-semibold hover:bg-[#0D5A8A] transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {logoUploading ? (
                        <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Upload size={15} />
                      )}
                      {logoUploading ? 'Uploading…' : 'Upload New Logo'}
                    </button>
                    {logoMsg && (
                      <p className={`text-xs font-medium flex items-center gap-1 ${logoMsg.startsWith('✓') ? 'text-[#0C9B5E]' : 'text-red-500'}`}>
                        {logoMsg.startsWith('✓') && <CheckCircle2 size={12} />}
                        {logoMsg}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        )}

        {/* Create Admin — super admin only */}
        {isSuperAdmin && (
          <div className="border-t border-[#ECECEC] dark:border-[#1e3550]">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="size-9 rounded-lg bg-[#EAF4FB] dark:bg-[#0d2a40] flex items-center justify-center shrink-0 mt-0.5">
                  <Shield size={18} className="text-[#1176BC]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8] mb-3">{t('settings.createAdmin')}</h2>
                  <form onSubmit={handleCreateAdmin} className="space-y-3 max-w-md">
                    <Input id="admin-sid" label={t('settings.adminId')} value={sid} onChange={(e) => setSid(e.target.value)} required />
                    <Input id="admin-name" label={t('settings.name')} value={name} onChange={(e) => setName(e.target.value)} required />
                    <Input id="admin-phone" label="Phone Number (For Students to Call)" type="tel" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} placeholder="e.g. +252 61 5000000" />
                    <Input id="admin-pwd" label={t('settings.password')} type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
                    <Button type="submit" loading={loading}>{t('settings.submit')}</Button>
                    {msg && <p className={`text-sm ${msg.includes('error') || msg.includes('Error') ? 'text-red-500' : 'text-[#0C9B5E]'}`}>{msg}</p>}
                  </form>
                </div>
              </div>
            </CardContent>
          </div>
        )}

        {/* Password Change */}
        <div className="border-t border-[#ECECEC] dark:border-[#1e3550]">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="size-9 rounded-lg bg-[#EAF4FB] dark:bg-[#0d2a40] flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound size={18} className="text-[#1176BC]" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8] mb-3">{t('auth.changePassword.title')}</h2>
                <form onSubmit={handlePasswordChange} className="space-y-3 max-w-md">
                  <Input
                    id="currentPassword"
                    label={t('auth.changePassword.currentPassword')}
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <Input
                    id="newPassword"
                    label={t('auth.changePassword.newPassword')}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  {pwError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2 border border-red-200 dark:border-red-900">{pwError}</p>}
                  {pwMessage && <p className="text-sm text-[#0C9B5E] bg-green-50 dark:bg-green-950/30 rounded-xl px-3 py-2 border border-green-200 dark:border-green-900">{pwMessage}</p>}
                  <Button type="submit" loading={pwLoading}>{t('auth.changePassword.submit')}</Button>
                </form>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  )
}
