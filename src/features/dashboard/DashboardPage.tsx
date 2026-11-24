import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { useDashboard } from './useDashboard'
import { StudentDashboardView } from './StudentDashboardView'
import { cn, formatCurrency } from '../../lib/utils'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  Shield, Send, TrendingUp, Users, DollarSign, Wallet,
  LogIn, LogOut, Activity, GraduationCap, AlertCircle, CheckCircle2,
  Clock, BarChart2
} from 'lucide-react'
import { ClassCommentsSection } from './ClassCommentsSection'
import { BroadcastNotificationModal } from '../notifications/BroadcastNotificationModal'
import type { Profile } from '../../lib/types'

interface ActivityLogEntry {
  id: string
  user_id: string
  action: string
  event_type: string
  timestamp: string
  profiles?: { name: string; student_id: string; role: string }
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full bg-[#ECECEC] dark:bg-[#1e3550] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
      />
    </div>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { user, activeClassId } = useAuth()
  const classId = activeClassId
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [logLoading, setLogLoading] = useState(false)

  useEffect(() => {
    supabase.from('classes').select('id, name').order('name').then(({ data }) => {
      if (data) setAvailableClasses(data)
    })
  }, [])

  // Fetch recent activity log (login/logout events)
  useEffect(() => {
    if (user?.role !== 'super_admin' && user?.role !== 'admin') return
    setLogLoading(true)
    supabase
      .from('activity_logs')
      .select('*, profiles!activity_logs_user_id_fkey(name, student_id, role)')
      .order('timestamp', { ascending: false })
      .limit(15)
      .then(({ data }) => {
        if (data) setActivityLog(data as ActivityLogEntry[])
        setLogLoading(false)
      })
  }, [user?.role])

  if (user?.role === 'student') {
    return <StudentDashboardView userId={user.id} classId={classId} />
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
      <div className="space-y-5 w-full max-w-6xl mx-auto">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6 w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] flex items-center justify-center">
            <BarChart2 size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a2332] dark:text-[#e8f0f8]">{t('dashboard.title')}</h1>
        </div>

        {user?.role === 'super_admin' ? (
          <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-[#1176BC]" />
              <h2 className="text-base font-bold text-[#1a2332] dark:text-[#e8f0f8]">{t('dashboard.superAdmin.title')}</h2>
            </div>
            {admins.length === 0 ? (
              <p className="text-sm text-[#9FBBDE]">{t('dashboard.superAdmin.noAdmins')}</p>
            ) : (
              <div className="space-y-2">
                {admins.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#EAF4FB]/40 dark:bg-[#0d2a40]/40">
                    <div className="size-8 rounded-full bg-[#1176BC] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {a.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8]">{a.name}</p>
                      <p className="text-xs text-[#9FBBDE]">{(adminClasses[a.id] ?? ['—']).join(', ')}</p>
                    </div>
                    <span className="text-xs font-mono text-[#9FBBDE]">{a.student_id}</span>
                  </div>
                ))}
              </div>
            )}
            <ClassCommentsSection classId={classId} />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#9FBBDE]/40 bg-white dark:bg-[#132033] py-16 text-center text-[#9FBBDE]">
            <GraduationCap size={44} className="mx-auto opacity-30 mb-3" />
            <p className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8]">{t('dashboard.noClassAssigned')}</p>
          </div>
        )}
      </div>
    )
  }

  const isPositive = data.remainingBalance >= 0
  const totalS = data.totalStudents || 1
  const paidPct = (data.paidCount / totalS) * 100
  const partialPct = (data.partialCount / totalS) * 100
  const unpaidPct = (data.unpaidCount / totalS) * 100

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] flex items-center justify-center shadow-sm">
            <BarChart2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a2332] dark:text-[#e8f0f8]">{t('dashboard.title')}</h1>
            <p className="text-xs text-[#9FBBDE]">{t('dashboard.welcome', { name: user?.name })}</p>
          </div>
        </div>
        <button
          onClick={() => setShowBroadcast(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1176BC] to-[#25A8E0] text-white text-sm font-semibold shadow-sm hover:shadow-md hover:opacity-95 transition-all cursor-pointer active:scale-95 w-full sm:w-auto justify-center"
        >
          <Send size={15} />
          Broadcast Notification
        </button>
      </div>

      {/* Key Metrics — 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: t('dashboard.totalContributions'),
            value: formatCurrency(data.totalContributions),
            icon: DollarSign,
            color: '#1176BC',
            bg: '#EAF4FB',
            trend: '+' + data.totalStudents + ' contributors',
          },
          {
            label: t('dashboard.totalExpenses'),
            value: formatCurrency(data.totalExpenses),
            icon: Wallet,
            color: '#d97706',
            bg: '#fffbeb',
            trend: 'Total spent',
          },
          {
            label: t('dashboard.remainingBalance'),
            value: formatCurrency(data.remainingBalance),
            icon: TrendingUp,
            color: isPositive ? '#0C9B5E' : '#DC2626',
            bg: isPositive ? '#f0fdf4' : '#fef2f2',
            trend: isPositive ? 'Surplus' : 'Deficit',
          },
          {
            label: t('dashboard.students'),
            value: String(data.totalStudents),
            icon: Users,
            color: '#25A8E0',
            bg: '#EAF4FB',
            trend: `${data.paidCount} fully paid`,
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: m.bg }}>
                <m.icon size={18} style={{ color: m.color }} />
              </div>
            </div>
            <div>
              <p className="text-xs text-[#9FBBDE] font-medium">{m.label}</p>
              <p className="text-lg font-bold text-[#1a2332] dark:text-[#e8f0f8] tabular-nums mt-0.5">{m.value}</p>
              <p className="text-[10px] text-[#9FBBDE] mt-0.5">{m.trend}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Status Chart */}
      <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-[#1176BC]" />
            <h3 className="text-sm font-bold text-[#1a2332] dark:text-[#e8f0f8]">{t('dashboard.paymentStatus')}</h3>
          </div>
          <span className="text-xs text-[#9FBBDE] font-medium">{data.totalStudents} students</span>
        </div>

        {/* Stacked bar */}
        <div className="h-3 w-full rounded-full flex overflow-hidden gap-0.5">
          <div className="h-full bg-[#1176BC] transition-all duration-700 rounded-l-full" style={{ width: `${paidPct}%` }} />
          <div className="h-full bg-[#f59e0b] transition-all duration-700" style={{ width: `${partialPct}%` }} />
          <div className="h-full bg-[#ef4444] transition-all duration-700 rounded-r-full" style={{ width: `${unpaidPct}%` }} />
        </div>

        {/* Detailed rows */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: t('dashboard.paid'), count: data.paidCount, pct: paidPct, color: '#1176BC', icon: CheckCircle2 },
            { label: t('dashboard.partial'), count: data.partialCount, pct: partialPct, color: '#f59e0b', icon: Clock },
            { label: t('dashboard.unpaid'), count: data.unpaidCount, pct: unpaidPct, color: '#ef4444', icon: AlertCircle },
          ].map((row) => (
            <div key={row.label} className="rounded-xl bg-[#ECECEC]/40 dark:bg-[#1a2d42]/60 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <row.icon size={13} style={{ color: row.color }} />
                <span className="text-xs font-semibold text-[#4a5a72] dark:text-[#9FBBDE]">{row.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: row.color }}>{row.count}</p>
              <MiniBar pct={row.pct} color={row.color} />
              <p className="text-[10px] text-[#9FBBDE]">{Math.round(row.pct)}% of class</p>
            </div>
          ))}
        </div>
      </div>

      {/* Admin List (super admin) */}
      {user?.role === 'super_admin' && admins.length > 0 && (
        <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#1176BC]" />
            <h3 className="text-sm font-bold text-[#1a2332] dark:text-[#e8f0f8]">{t('dashboard.superAdmin.title')}</h3>
          </div>
          <div className="divide-y divide-[#ECECEC] dark:divide-[#1e3550]">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="size-9 rounded-full bg-gradient-to-br from-[#1176BC] to-[#25A8E0] text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {a.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8] truncate">{a.name}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {(adminClasses[a.id] ?? []).map((cn, i) => (
                      <span key={i} className="text-[10px] font-semibold bg-[#EAF4FB] dark:bg-[#0d2a40] text-[#1176BC] px-2 py-0.5 rounded-full border border-[#9FBBDE]/30">
                        {cn}
                      </span>
                    ))}
                    {!(adminClasses[a.id]?.length) && <span className="text-xs text-[#9FBBDE]">No classes</span>}
                  </div>
                </div>
                <span className="text-xs font-mono text-[#9FBBDE]">{a.student_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#25A8E0]" />
            <h3 className="text-sm font-bold text-[#1a2332] dark:text-[#e8f0f8]">Recent Activity</h3>
          </div>
          <span className="text-xs text-[#9FBBDE]">Last 15 events</span>
        </div>
        {logLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="size-7 rounded-full bg-[#ECECEC] dark:bg-[#1e3550]" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-32 bg-[#ECECEC] dark:bg-[#1e3550] rounded" />
                  <div className="h-2.5 w-20 bg-[#ECECEC] dark:bg-[#1e3550] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activityLog.length === 0 ? (
          <p className="text-xs text-[#9FBBDE] py-4 text-center">No activity logged yet. Login/logout events will appear here.</p>
        ) : (
          <div className="divide-y divide-[#ECECEC] dark:divide-[#1e3550]">
            {activityLog.map((log) => {
              const isLogin = log.action?.toLowerCase().includes('login') || log.event_type === 'login'
              const isLogout = log.action?.toLowerCase().includes('logout') || log.event_type === 'logout'
              return (
                <div key={log.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className={cn(
                    'size-7 rounded-full flex items-center justify-center shrink-0',
                    isLogin ? 'bg-[#EAF4FB] dark:bg-[#0d2a40]' : isLogout ? 'bg-red-50 dark:bg-red-950/30' : 'bg-[#ECECEC] dark:bg-[#1a2d42]'
                  )}>
                    {isLogin ? <LogIn size={13} className="text-[#1176BC]" /> : isLogout ? <LogOut size={13} className="text-red-500" /> : <Activity size={13} className="text-[#9FBBDE]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1a2332] dark:text-[#e8f0f8] truncate">
                      {log.profiles?.name || 'Unknown User'}
                      <span className="font-normal text-[#9FBBDE] ml-1">· {log.action}</span>
                    </p>
                    <p className="text-[10px] text-[#9FBBDE]">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  {log.profiles?.role && (
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                      log.profiles.role === 'super_admin'
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400'
                        : log.profiles.role === 'admin'
                        ? 'bg-[#EAF4FB] text-[#1176BC] border-[#9FBBDE]/30'
                        : 'bg-[#ECECEC] text-[#9FBBDE] border-[#C6CACB]/30'
                    )}>
                      {log.profiles.role}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Class Discussion */}
      <ClassCommentsSection classId={classId} />

      <BroadcastNotificationModal
        open={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        availableClasses={availableClasses}
      />
    </div>
  )
}
