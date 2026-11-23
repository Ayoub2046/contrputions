import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { adminCreateUser } from '../../lib/admin-api'
import { supabase } from '../../lib/supabase'
import { Globe, Shield, KeyRound } from 'lucide-react'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'

  const [sid, setSid] = useState('')
  const [name, setName] = useState('')
  const [pwd, setPwd] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwMessage, setPwMessage] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'so', label: 'Soomaali' },
  ]

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!sid.trim() || !name.trim() || !pwd.trim()) return
    setLoading(true)
    setMsg('')
    const { error } = await adminCreateUser(sid.trim(), name.trim(), pwd.trim(), null, 'admin')
    setMsg(error || t('settings.success'))
    if (!error) { setSid(''); setName(''); setPwd('') }
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">{t('settings.title')}</h1>

      <Card>
        {/* Language */}
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="size-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
              <Globe size={18} className="text-brand-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-text mb-1">{t('settings.language')}</h2>
              <p className="text-xs text-muted mb-3">{t('settings.languageLabel')}</p>
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="block w-full max-w-xs rounded-btn border border-border-hover bg-bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-600/30"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>

        {isSuperAdmin && (
          <div className="border-t border-border/40">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="size-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield size={18} className="text-brand-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-text mb-3">{t('settings.createAdmin')}</h2>
                  <form onSubmit={handleCreateAdmin} className="space-y-3 max-w-md">
                    <Input id="admin-sid" label={t('settings.adminId')} value={sid} onChange={(e) => setSid(e.target.value)} required />
                    <Input id="admin-name" label={t('settings.name')} value={name} onChange={(e) => setName(e.target.value)} required />
                    <Input id="admin-pwd" label={t('settings.password')} type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
                    <Button type="submit" loading={loading}>{t('settings.submit')}</Button>
                    {msg && <p className="text-sm text-secondary">{msg}</p>}
                  </form>
                </div>
              </div>
            </CardContent>
          </div>
        )}

        {/* Password Change */}
        <div className="border-t border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="size-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound size={18} className="text-brand-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-text mb-3">{t('auth.changePassword.title')}</h2>
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
                  {pwError && <p className="text-sm text-error bg-error/10 rounded-btn px-3 py-2 border border-error/20">{pwError}</p>}
                  {pwMessage && <p className="text-sm text-success bg-success/10 rounded-btn px-3 py-2 border border-success/20">{pwMessage}</p>}
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
