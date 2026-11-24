import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent } from '../../components/ui/Card'
import { useAuth } from './AuthContext'
import { AppLogo, useAppName } from '../../hooks/useAppLogo'

export function LoginPage() {
  const { t } = useTranslation()
  const appName = useAppName()
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, signIn, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await signIn(studentId, password)
    if (err) setError(err)
    else navigate('/dashboard', { replace: true })
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main p-4">
      <Card className="w-full max-w-sm border-0 shadow-none sm:border sm:shadow-sm">
        <CardContent className="px-6 py-10 sm:px-8">
          <div className="flex flex-col items-center gap-4 mb-6">
            <Link to="/" className="group" title="Back to Home">
              <AppLogo className="h-10 w-auto transition-transform group-hover:scale-105" alt={appName} />
            </Link>
            <div className="text-center">
              <h1 className="text-3xl font-serif font-bold text-text">{appName}</h1>
              <p className="text-sm text-muted mt-1">{t('auth.signIn.subtitle')}</p>
            </div>
          </div>

          {/* Active Session Notice if already logged in */}
          {user && (
            <div className="mb-6 rounded-card border border-brand-600/30 bg-brand-50/70 dark:bg-brand-900/25 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary font-medium">Active Session:</span>
                <span className="font-bold text-brand-600 dark:text-brand-900 capitalize">{user.role}</span>
              </div>
              <p className="text-sm font-semibold text-text truncate">{user.name}</p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 rounded-btn bg-brand-600 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-600/90 transition-all cursor-pointer"
                >
                  Go to Dashboard
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="px-3 rounded-btn border border-error/30 text-xs font-semibold text-error hover:bg-error/10 transition-all cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="studentId"
              label={t('auth.signIn.studentId')}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder={t('auth.signIn.studentIdPlaceholder')}
              required
            />
            <Input
              id="password"
              label={t('auth.signIn.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.signIn.passwordPlaceholder')}
              required
            />
            {error && (
              <p className="text-sm text-error bg-error/10 rounded-btn px-3 py-2 border border-error/20">{error}</p>
            )}
            <Button type="submit" loading={loading} className="w-full">
              {t('auth.signIn.signIn')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-text transition-colors"
            >
              <ArrowLeft size={14} /> Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
