import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent } from '../../components/ui/Card'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { t } = useTranslation()
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, signIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

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
          <div className="flex flex-col items-center gap-4 mb-8">
            <Link to="/" className="group" title="Back to Home">
              <img src="/classBankLogo.png" alt={t('app.name')} className="h-10 w-auto transition-transform group-hover:scale-105" />
            </Link>
            <div className="text-center">
              <h1 className="text-3xl font-serif font-bold text-text">{t('auth.signIn.title')}</h1>
              <p className="text-sm text-muted mt-1">{t('auth.signIn.subtitle')}</p>
            </div>
          </div>
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
