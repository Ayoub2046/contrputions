import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, TBody, Td, Th, THead } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { useDashboard } from './useDashboard'
import { useStudentDashboard } from './useStudentDashboard'
import { cn, formatCurrency, formatDate } from '../../lib/utils'
import { Skeleton } from '../../components/ui/Skeleton'
import { PiggyBank, Shield, Send } from 'lucide-react'
import { ClassCommentsSection } from './ClassCommentsSection'
import { BroadcastNotificationModal } from '../notifications/BroadcastNotificationModal'
import type { Profile } from '../../lib/types'

function StudentDashboard({ userId, classId }: { userId: string; classId: string | null }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data, loading } = useStudentDashboard(userId, classId)

  if (loading) {
    return (
      <div className="space-y-5 max-w-lg mx-auto">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text">{t('dashboard.title')}</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted">
            {t('dashboard.noClassAssigned')}
          </CardContent>
        </Card>
      </div>
    )
  }

  const badgeVariant = data.status === 'paid' ? 'success' : data.status === 'partial' ? 'warning' : 'danger'
  const isPositive = data.remainingBalance >= 0
  const progressPct = data.target ? Math.min(100, (data.personalTotal / data.target) * 100) : 0

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-text">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted">{t('dashboard.welcome', { name: user?.name || '' })}</p>
      </div>

      <Card className="border-none bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">{t('dashboard.myStatus')}</span>
            </div>
            <Badge variant={badgeVariant} className="capitalize bg-white/10 text-white border border-white/20 text-[11px] px-2.5 py-0.5">
              {t(`dashboard.${data.status}`)}
            </Badge>
          </div>

          <div>
            <span className="text-[11px] text-white/40 font-medium block mb-1">{t('dashboard.myContributions')}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-serif font-bold tracking-tight text-white tabular-nums">
                {formatCurrency(data.personalTotal)}
              </span>
              <span className="text-sm text-white/30">/ {formatCurrency(data.target)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-700 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-white/30">
              <span>{Math.round(progressPct)}%</span>
              <span>{formatCurrency(data.personalTotal)} / {formatCurrency(data.target)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-3 divide-x divide-border/40 text-center py-4">
            <div className="px-2 space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted font-medium block">{t('dashboard.totalContributions')}</span>
              <span className="text-base font-bold text-text tabular-nums block">{formatCurrency(data.classTotal)}</span>
            </div>
            <div className="px-2 space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted font-medium block">{t('dashboard.totalExpenses')}</span>
              <span className="text-base font-bold text-text tabular-nums block">{formatCurrency(data.expenseTotal)}</span>
            </div>
            <div className="px-2 space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted font-medium block">{t('dashboard.remainingBalance')}</span>
              <span className={cn('text-base font-bold tabular-nums block', isPositive ? 'text-success' : 'text-error')}>
                {formatCurrency(data.remainingBalance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-sm font-semibold text-secondary">{t('dashboard.contributionHistory')}</h2>
          <span className="text-[11px] text-muted">{data.contributions.length}</span>
        </div>
        {data.contributions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted text-sm">
              {t('contributions.none')}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y divide-border/40">
              {data.contributions.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                      <PiggyBank size={15} className="text-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{t('contributions.title')}</p>
                      <p className="text-xs text-muted">{formatDate(c.date)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-success tabular-nums shrink-0 ml-3">
                    +{formatCurrency(Number(c.amount))}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Class Student Comments & Discussion Section */}
      <ClassCommentsSection classId={classId} />
    </div>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { user, activeClassId } = useAuth()
  const classId = activeClassId
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    supabase.from('classes').select('id, name').order('name').then(({ data }) => {
      if (data) setAvailableClasses(data)
    })
  }, [])

  if (user?.role === 'student') {
    return <StudentDashboard userId={user.id} classId={classId} />
  }

  const { data, loading } = useDashboard(classId)
  const [admins, setAdmins] = useState<Profile[]>([])
  const [adminClasses, setAdminClasses] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (user?.role !== 'super_admin') return
    supabase.from('profiles').select('*').eq('role', 'admin').order('name').then(({ data }) => {
      if (data) setAdmins(data)
    })
  }, [user?.role])

  useEffect(() => {
    if (admins.length === 0) return
    const ids = admins.map((a) => a.id)
    supabase
      .from('class_admins')
      .select('admin_id, classes!class_admins_class_id_fkey(name)')
      .in('admin_id', ids)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, string[]> = {}
        for (const r of data as any[]) {
          if (!map[r.admin_id]) map[r.admin_id] = []
          map[r.admin_id].push(r.classes?.name || 'Unknown')
        }
        setAdminClasses(map)
      })
  }, [admins])

  if (loading) {
    return (
      <div className="space-y-5 max-w-lg mx-auto lg:max-w-none">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text">{t('dashboard.title')}</h1>
        {user?.role === 'super_admin' ? (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={20} className="text-brand-600" />
                <h2 className="text-lg font-semibold text-text">{t('dashboard.superAdmin.title')}</h2>
              </div>
              {admins.length === 0 ? (
                <p className="text-sm text-muted">{t('dashboard.superAdmin.noAdmins')}</p>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden lg:block">
                    <Table>
                      <THead>
                        <tr>
                          <Th>{t('dashboard.superAdmin.adminId')}</Th>
                          <Th>{t('dashboard.superAdmin.name')}</Th>
                          <Th>{t('dashboard.superAdmin.assignedClasses')}</Th>
                        </tr>
                      </THead>
                      <TBody>
                        {admins.map((a) => (
                          <tr key={a.id}>
                            <Td className="font-mono text-sm text-muted">{a.student_id}</Td>
                            <Td className="font-medium text-text">{a.name}</Td>
                            <Td className="text-secondary">{(adminClasses[a.id] ?? ['—']).join(', ')}</Td>
                          </tr>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                  {/* Mobile */}
                  <div className="lg:hidden divide-y divide-border/40">
                    {admins.map((a) => (
                      <div key={a.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between mb-1.5">
                          <p className="text-sm font-semibold text-text">{a.name}</p>
                          <span className="text-xs font-mono text-muted">{a.student_id}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(adminClasses[a.id] ?? []).map((cn, i) => (
                            <Badge key={i} variant="default" className="text-[10px] px-2 py-0.5">{cn}</Badge>
                          ))}
                          {!(adminClasses[a.id]?.length) && <span className="text-xs text-muted">—</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {/* Class Student Comments & Discussion Section for Super Admin */}
              <ClassCommentsSection classId={classId} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted">
              {t('dashboard.noClassAssigned')}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const isPositive = data.remainingBalance >= 0
  const totalS = data.totalStudents || 1

  return (
    <div className="space-y-5 max-w-lg mx-auto lg:max-w-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted">{t('dashboard.welcome', { name: user?.name })}</p>
        </div>
        <Button
          onClick={() => setShowBroadcast(true)}
          className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm shadow-sm"
        >
          <Send size={15} /> 📢 Broadcast Notification
        </Button>
      </div>

      <Card className="border-none bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">
              {t('dashboard.remainingBalance')}
            </span>
            <p className={cn('text-4xl font-serif font-bold tracking-tight tabular-nums mt-1', isPositive ? 'text-white' : 'text-error')}>
              {formatCurrency(data.remainingBalance)}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-white/10">
            <div>
              <span className="text-[11px] text-white/40 font-medium block mb-0.5">{t('dashboard.totalContributions')}</span>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(data.totalContributions)}</p>
            </div>
            <div>
              <span className="text-[11px] text-white/40 font-medium block mb-0.5">{t('dashboard.totalExpenses')}</span>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(data.totalExpenses)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-secondary">{t('dashboard.paymentStatus')}</h3>
            <span className="text-xs text-muted font-medium">{data.totalStudents} {t('dashboard.students').toLowerCase()}</span>
          </div>
          <div className="h-2 w-full bg-bg-elevated rounded-full flex overflow-hidden">
            <div className="h-full bg-success transition-all duration-500" style={{ width: `${(data.paidCount / totalS) * 100}%` }} />
            <div className="h-full bg-warning transition-all duration-500" style={{ width: `${(data.partialCount / totalS) * 100}%` }} />
            <div className="h-full bg-error transition-all duration-500" style={{ width: `${(data.unpaidCount / totalS) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" /><span className="text-secondary font-medium">{data.paidCount} {t('dashboard.paid')}</span></div>
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" /><span className="text-secondary font-medium">{data.partialCount} {t('dashboard.partial')}</span></div>
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-error" /><span className="text-secondary font-medium">{data.unpaidCount} {t('dashboard.unpaid')}</span></div>
          </div>
        </CardContent>
      </Card>
      {/* Class Student Comments & Discussion Section */}
      <ClassCommentsSection classId={classId} />

      <BroadcastNotificationModal
        open={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        availableClasses={availableClasses}
      />
    </div>
  )
}
