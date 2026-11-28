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
  LogIn, LogOut, Activity, AlertCircle, CheckCircle2,
  Clock, BarChart2, Award, Printer, Filter
} from 'lucide-react'
import { ClassCommentsSection } from './ClassCommentsSection'
import { AdminPrivateMessagesInbox } from './AdminPrivateMessagesInbox'
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
  const { user, activeClassId, setActiveClassId } = useAuth()
  const [selectedClassId, setSelectedClassId] = useState<string | null>(activeClassId || null)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [logLoading, setLogLoading] = useState(false)

  // Keep selectedClassId synced if activeClassId changes
  useEffect(() => {
    if (activeClassId && selectedClassId === null) {
      setSelectedClassId(activeClassId)
    }
  }, [activeClassId])

  useEffect(() => {
    supabase.from('classes').select('id, name').order('name').then(({ data }) => {
      if (data) setAvailableClasses(data)
    })
  }, [])

  // Fetch recent activity log (login/logout events) - ONLY FOR SUPER ADMIN
  useEffect(() => {
    if (user?.role !== 'super_admin') return
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
    return <StudentDashboardView userId={user.id} classId={activeClassId} />
  }

  const canSelectAllClasses = user?.role === 'super_admin' || user?.role === 'finance_manager'
  const classFilter = canSelectAllClasses ? selectedClassId : activeClassId
  const { data, loading } = useDashboard(classFilter)
  const [admins, setAdmins] = useState<Profile[]>([])
  const [adminClasses, setAdminClasses] = useState<Record<string, string[]>>({})
  const [classComparisonTab, setClassComparisonTab] = useState<'top' | 'unpaid'>('top')
  const [studentStatusTab, setStudentStatusTab] = useState<'all' | 'paid' | 'unpaid'>('all')

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

  function handlePrintReport() {
    window.print()
  }

  const isPositive = (data?.remainingBalance ?? 0) >= 0
  const totalS = data?.totalStudents || 1
  const paidPct = data ? (data.paidCount / totalS) * 100 : 0
  const partialPct = data ? (data.partialCount / totalS) * 100 : 0
  const unpaidPct = data ? (data.unpaidCount / totalS) * 100 : 0

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Header Bar with Class Filter & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#ECECEC] dark:border-[#1e3550] pb-4">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] flex items-center justify-center shadow-md">
            <BarChart2 size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[#1a2332] dark:text-[#e8f0f8]">
                {user?.role === 'finance_manager'
                  ? 'Finance Dashboard'
                  : user?.role === 'super_admin'
                  ? 'Executive Dashboard'
                  : t('dashboard.title')}
              </h1>
            </div>
            <p className="text-xs text-[#9FBBDE] mt-0.5">
              {selectedClassId
                ? availableClasses.find((c) => c.id === selectedClassId)?.name || 'Class Group'
                : 'All Classes Overview'} · Real-time Financial Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Class Filter Dropdown for Super Admin & Finance Manager */}
          {canSelectAllClasses && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033]">
              <Filter size={14} className="text-[#1176BC]" />
              <select
                value={selectedClassId || ''}
                onChange={(e) => {
                  const val = e.target.value || null
                  setSelectedClassId(val)
                  setActiveClassId(val)
                }}
                className="text-xs font-semibold text-[#1a2332] dark:text-[#e8f0f8] bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="">🌐 All Classes (Global)</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    📚 {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Print Report Action */}
          <button
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] hover:bg-[#EAF4FB] dark:hover:bg-[#0d2a40] text-xs font-semibold text-[#1176BC] transition-all cursor-pointer shadow-2xs"
            title="Generate and Print Executive Report"
          >
            <Printer size={14} />
            <span>Report</span>
          </button>

          {/* Broadcast Push Notification (Admins only) */}
          {user?.role !== 'finance_manager' && (
            <button
              onClick={() => setShowBroadcast(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1176BC] to-[#25A8E0] text-white text-xs font-semibold shadow-sm hover:shadow-md hover:opacity-95 transition-all cursor-pointer active:scale-95"
            >
              <Send size={13} />
              <span>Broadcast Alert</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-5 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      ) : data ? (
        <>
          {/* Row 1: KPI Stats Grid (Bootstrap / Tailwind Elevated Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Total Collected',
                value: formatCurrency(data.totalContributions),
                icon: DollarSign,
                color: '#1176BC',
                bg: '#EAF4FB',
                sub: `${data.paidCount + data.partialCount} contributing students`,
              },
              {
                label: 'Approved Expenses',
                value: formatCurrency(data.totalExpenses),
                icon: Wallet,
                color: '#d97706',
                bg: '#fffbeb',
                sub: 'Class activities & supplies',
              },
              {
                label: 'Net Balance',
                value: formatCurrency(data.remainingBalance),
                icon: TrendingUp,
                color: isPositive ? '#0C9B5E' : '#DC2626',
                bg: isPositive ? '#f0fdf4' : '#fef2f2',
                sub: isPositive ? 'Surplus in class vault' : 'Deficit / Overdrawn',
              },
              {
                label: 'Total Students',
                value: String(data.totalStudents),
                icon: Users,
                color: '#25A8E0',
                bg: '#EAF4FB',
                sub: `${Math.round(paidPct)}% fully cleared`,
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-4 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#9FBBDE]">{m.label}</span>
                  <div
                    className="size-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: m.bg }}
                  >
                    <m.icon size={16} style={{ color: m.color }} />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-serif text-[#1a2332] dark:text-[#e8f0f8] tabular-nums">
                    {m.value}
                  </p>
                  <p className="text-[10px] text-[#9FBBDE] mt-1 font-medium">{m.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Row 1.5: Confidential Student Inquiries (Private Messages for Class Admin) */}
          <AdminPrivateMessagesInbox classId={classFilter} />

          {/* Row 2: Charts & Visual Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Top Contributing Students (Leaderboard Bar Chart) */}
            <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-[#1176BC]" />
                  <h3 className="text-sm font-bold text-[#1a2332] dark:text-[#e8f0f8]">
                    Top Contributing Students
                  </h3>
                </div>
                <span className="text-[11px] text-[#9FBBDE] font-semibold">Ranked by Paid Amount</span>
              </div>

              {data.topStudents.length === 0 ? (
                <div className="py-12 text-center text-[#9FBBDE] text-xs">
                  No student contributions logged yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.topStudents.map((s, idx) => {
                    const highest = data.topStudents[0]?.total_paid || 1
                    const barPct = Math.min(100, (s.total_paid / highest) * 100)
                    return (
                      <div key={s.id || idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cn(
                                'size-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0',
                                idx === 0
                                  ? 'bg-amber-400 text-amber-950 shadow-xs'
                                  : idx === 1
                                  ? 'bg-slate-300 text-slate-800'
                                  : idx === 2
                                  ? 'bg-amber-700/60 text-white'
                                  : 'bg-[#ECECEC] dark:bg-[#1e3550] text-[#9FBBDE]'
                              )}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-[#1a2332] dark:text-[#e8f0f8] truncate">
                              {s.name}
                            </span>
                            <span className="text-[10px] text-[#9FBBDE] font-mono shrink-0">
                              #{s.student_id}
                            </span>
                            <span className="text-[10px] text-[#1176BC] bg-[#EAF4FB] dark:bg-[#0d2a40] px-1.5 py-0.2 rounded-full hidden sm:inline">
                              {s.class_name}
                            </span>
                          </div>
                          <span className="font-bold text-[#1176BC] tabular-nums shrink-0">
                            {formatCurrency(s.total_paid)}
                          </span>
                        </div>
                        {/* Animated Visual Bar */}
                        <div className="h-2 w-full bg-[#ECECEC] dark:bg-[#1e3550] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#1176BC] to-[#25A8E0] transition-all duration-700"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Chart 2: Top Classes by Income Comparison & Unpaid Classes */}
            <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart2 size={18} className="text-[#25A8E0]" />
                  <h3 className="text-sm font-bold text-[#1a2332] dark:text-[#e8f0f8]">
                    Class Financial Performance
                  </h3>
                </div>
                {/* Comparison Tab Selector */}
                <div className="flex items-center gap-1 bg-[#ECECEC]/60 dark:bg-[#0e1726] p-0.5 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => setClassComparisonTab('top')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      classComparisonTab === 'top'
                        ? 'bg-white dark:bg-[#132033] text-[#0C9B5E] shadow-2xs'
                        : 'text-[#9FBBDE] hover:text-[#1a2332]'
                    }`}
                  >
                    🏆 Top Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassComparisonTab('unpaid')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      classComparisonTab === 'unpaid'
                        ? 'bg-white dark:bg-[#132033] text-[#ef4444] shadow-2xs'
                        : 'text-[#9FBBDE] hover:text-[#1a2332]'
                    }`}
                  >
                    ⚠️ Unpaid Dues
                  </button>
                </div>
              </div>

              {data.topClasses.length === 0 ? (
                <div className="py-12 text-center text-[#9FBBDE] text-xs">
                  No classes found in the registry.
                </div>
              ) : (
                <div className="space-y-4">
                  {(classComparisonTab === 'top'
                    ? [...data.topClasses].sort((a, b) => b.total_income - a.total_income)
                    : [...data.topClasses].sort((a, b) => {
                        const unpaidA = Math.max(0, (a.target * a.student_count) - a.total_income)
                        const unpaidB = Math.max(0, (b.target * b.student_count) - b.total_income)
                        return unpaidB - unpaidA
                      })
                  ).map((cls) => {
                    const expectedTotal = cls.target * cls.student_count
                    const unpaidAmount = Math.max(0, expectedTotal - cls.total_income)
                    const maxClassIncome = Math.max(...data.topClasses.map((c) => c.total_income), 1)
                    const maxUnpaid = Math.max(...data.topClasses.map((c) => Math.max(0, (c.target * c.student_count) - c.total_income)), 1)
                    const barPct = classComparisonTab === 'top'
                      ? (cls.total_income / maxClassIncome) * 100
                      : (unpaidAmount / maxUnpaid) * 100

                    return (
                      <div key={cls.class_id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1a2332] dark:text-[#e8f0f8]">
                              {cls.class_name}
                            </span>
                            <span className="text-[10px] text-[#9FBBDE]">
                              ({cls.student_count} students)
                            </span>
                          </div>
                          <div className="text-right">
                            {classComparisonTab === 'top' ? (
                              <>
                                <span className="font-bold text-[#0C9B5E] tabular-nums">
                                  {formatCurrency(cls.total_income)}
                                </span>
                                {cls.target > 0 && (
                                  <span className="text-[10px] text-[#9FBBDE] ml-1">
                                    / {formatCurrency(expectedTotal)} target
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className={`font-bold tabular-nums ${unpaidAmount > 0 ? 'text-[#ef4444]' : 'text-[#0C9B5E]'}`}>
                                  {unpaidAmount > 0 ? `-${formatCurrency(unpaidAmount)} unpaid` : '✓ Fully Cleared'}
                                </span>
                                <span className="text-[10px] text-[#9FBBDE] ml-1">
                                  ({formatCurrency(cls.total_income)} collected)
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Visual Progress Bar */}
                        <div className="h-2.5 w-full bg-[#ECECEC] dark:bg-[#1e3550] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              classComparisonTab === 'top'
                                ? 'bg-gradient-to-r from-[#25A8E0] to-[#0C9B5E]'
                                : unpaidAmount > 0
                                ? 'bg-gradient-to-r from-amber-500 to-red-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(5, barPct)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Class Clearance Status Breakdown Bar */}
          <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1a2332] dark:text-[#e8f0f8]">
                Student Clearance Status Breakdown
              </h3>
              <span className="text-xs text-[#9FBBDE] font-medium">
                {data.totalStudents} total students
              </span>
            </div>

            {/* Stacked Bar */}
            <div className="h-3 w-full rounded-full flex overflow-hidden gap-0.5">
              <div
                className="h-full bg-[#1176BC] transition-all duration-700 rounded-l-full"
                style={{ width: `${paidPct}%` }}
                title={`Fully Paid: ${data.paidCount}`}
              />
              <div
                className="h-full bg-[#f59e0b] transition-all duration-700"
                style={{ width: `${partialPct}%` }}
                title={`Partially Paid: ${data.partialCount}`}
              />
              <div
                className="h-full bg-[#ef4444] transition-all duration-700 rounded-r-full"
                style={{ width: `${unpaidPct}%` }}
                title={`Unpaid: ${data.unpaidCount}`}
              />
            </div>

            {/* Metric Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: 'Fully Paid & Cleared',
                  count: data.paidCount,
                  pct: paidPct,
                  color: '#1176BC',
                  icon: CheckCircle2,
                  bg: '#EAF4FB',
                },
                {
                  label: 'Partially Contributed',
                  count: data.partialCount,
                  pct: partialPct,
                  color: '#f59e0b',
                  icon: Clock,
                  bg: '#fffbeb',
                },
                {
                  label: 'Unpaid / Pending',
                  count: data.unpaidCount,
                  pct: unpaidPct,
                  color: '#ef4444',
                  icon: AlertCircle,
                  bg: '#fef2f2',
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-[#ECECEC] dark:border-[#1e3550] p-3 space-y-1.5 bg-white dark:bg-[#132033]"
                >
                  <div className="flex items-center gap-1.5">
                    <row.icon size={13} style={{ color: row.color }} />
                    <span className="text-xs font-semibold text-[#4a5a72] dark:text-[#9FBBDE]">
                      {row.label}
                    </span>
                  </div>
                  <p className="text-xl font-bold tabular-nums" style={{ color: row.color }}>
                    {row.count}
                  </p>
                  <MiniBar pct={row.pct} color={row.color} />
                  <p className="text-[10px] text-[#9FBBDE] font-medium">
                    {Math.round(row.pct)}% of student pool
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3.5: Students Paid vs Unpaid Audit Directory (Read-Only) */}
          {data.studentsStatusList.length > 0 && (
            <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[#1176BC]" />
                  <h3 className="text-sm font-bold text-[#1a2332] dark:text-[#e8f0f8]">
                    Students Payment Status Directory
                  </h3>
                </div>
                <div className="flex items-center gap-1 bg-[#ECECEC]/60 dark:bg-[#0e1726] p-0.5 rounded-lg self-start">
                  {[
                    { id: 'all', label: `All (${data.totalStudents})` },
                    { id: 'paid', label: `✅ Paid (${data.paidCount})` },
                    { id: 'unpaid', label: `⚠️ Unpaid / Partial (${data.unpaidCount + data.partialCount})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStudentStatusTab(tab.id as 'all' | 'paid' | 'unpaid')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        studentStatusTab === tab.id
                          ? 'bg-white dark:bg-[#132033] text-[#1176BC] shadow-2xs'
                          : 'text-[#9FBBDE] hover:text-[#1a2332]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#ECECEC] dark:divide-[#1e3550] pr-1">
                {data.studentsStatusList
                  .filter((st) =>
                    studentStatusTab === 'all'
                      ? true
                      : studentStatusTab === 'paid'
                      ? st.status === 'paid'
                      : st.status !== 'paid'
                  )
                  .slice(0, 50)
                  .map((st) => {
                    const remaining = Math.max(0, st.target - st.total_paid)
                    return (
                      <div key={st.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[#1a2332] dark:text-[#e8f0f8] truncate">
                              {st.name}
                            </span>
                            <span className="text-[10px] font-mono text-[#9FBBDE]">#{st.student_id}</span>
                            <span className="text-[10px] text-[#1176BC] bg-[#EAF4FB] dark:bg-[#0d2a40] px-1.5 py-0.2 rounded-full">
                              {st.class_name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="font-bold text-[#1a2332] dark:text-[#e8f0f8] tabular-nums">
                              {formatCurrency(st.total_paid)}
                            </span>
                            {st.target > 0 && (
                              <span className="text-[10px] text-[#9FBBDE] ml-1">
                                / {formatCurrency(st.target)}
                              </span>
                            )}
                            {st.status !== 'paid' && remaining > 0 && (
                              <span className="block text-[10px] text-amber-600 dark:text-amber-400">
                                {formatCurrency(remaining)} due
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              st.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : st.status === 'partial'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                            }`}
                          >
                            {st.status}
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Row 4: Super Admin Class Leadership Roster */}
          {user?.role === 'super_admin' && admins.length > 0 && (
            <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#1176BC]" />
                <h3 className="text-sm font-bold text-[#1a2332] dark:text-[#e8f0f8]">
                  Appointed Class Administrators
                </h3>
              </div>
              <div className="divide-y divide-[#ECECEC] dark:divide-[#1e3550]">
                {admins.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="size-9 rounded-full bg-gradient-to-br from-[#1176BC] to-[#25A8E0] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {a.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8] truncate">
                        {a.name}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {(adminClasses[a.id] ?? []).map((cn, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-semibold bg-[#EAF4FB] dark:bg-[#0d2a40] text-[#1176BC] px-2 py-0.5 rounded-full border border-[#9FBBDE]/30"
                          >
                            📚 {cn}
                          </span>
                        ))}
                        {!(adminClasses[a.id]?.length) && (
                          <span className="text-xs text-[#9FBBDE]">No classes assigned</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#9FBBDE]">{a.student_id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 5: Activity Log (Login / Logout Tracking) - ONLY FOR SUPER ADMIN */}
          {user?.role === 'super_admin' && (
            <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-[#25A8E0]" />
                  <h3 className="text-sm font-bold text-[#1a2332] dark:text-[#e8f0f8]">
                    Audit & Security Activity Log
                  </h3>
                </div>
                <span className="text-xs text-[#9FBBDE]">Live Auth Events</span>
              </div>

              {logLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
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
                <p className="text-xs text-[#9FBBDE] py-4 text-center">
                  No activity logged yet. Login/logout events will appear here automatically.
                </p>
              ) : (
                <div className="divide-y divide-[#ECECEC] dark:divide-[#1e3550]">
                  {activityLog.map((log) => {
                    const isLogin =
                      log.action?.toLowerCase().includes('login') || log.event_type === 'login'
                    const isLogout =
                      log.action?.toLowerCase().includes('logout') || log.event_type === 'logout'
                    return (
                      <div
                        key={log.id}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div
                          className={cn(
                            'size-7 rounded-full flex items-center justify-center shrink-0',
                            isLogin
                              ? 'bg-[#EAF4FB] dark:bg-[#0d2a40]'
                              : isLogout
                              ? 'bg-red-50 dark:bg-red-950/30'
                              : 'bg-[#ECECEC] dark:bg-[#1a2d42]'
                          )}
                        >
                          {isLogin ? (
                            <LogIn size={13} className="text-[#1176BC]" />
                          ) : isLogout ? (
                            <LogOut size={13} className="text-red-500" />
                          ) : (
                            <Activity size={13} className="text-[#9FBBDE]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#1a2332] dark:text-[#e8f0f8] truncate">
                            {log.profiles?.name || 'Unknown User'}
                            <span className="font-normal text-[#9FBBDE] ml-1">
                              · {log.action}
                            </span>
                          </p>
                          <p className="text-[10px] text-[#9FBBDE]">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {log.profiles?.role && (
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                              log.profiles.role === 'super_admin'
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400'
                                : log.profiles.role === 'admin'
                                ? 'bg-[#EAF4FB] text-[#1176BC] border-[#9FBBDE]/30'
                                : 'bg-[#ECECEC] text-[#9FBBDE] border-[#C6CACB]/30'
                            )}
                          >
                            {log.profiles.role}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : null}

      {/* Class Comments & Student Feedback Section */}
      <ClassCommentsSection classId={classFilter} />

      {/* Broadcast Notification Modal */}
      <BroadcastNotificationModal
        open={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        availableClasses={availableClasses}
      />
    </div>
  )
}
