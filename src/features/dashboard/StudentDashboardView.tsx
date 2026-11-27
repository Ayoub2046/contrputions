import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useNotifications } from '../notifications/NotificationContext'
import { NotificationBell } from '../notifications/NotificationBell'
import { useStudentDashboard } from './useStudentDashboard'
import { StudentContributionBreakdown } from './StudentContributionBreakdown'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { Modal } from '../../components/ui/Modal'
import { ClassCommentsSection } from './ClassCommentsSection'
import { useAppName, AppLogo } from '../../hooks/useAppLogo'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { PwaInstallButton } from '../../components/pwa/PwaInstallButton'
import { supabase } from '../../lib/supabase'
import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  LogOut,
  Bell,
  Cpu,
  Radio,
  Sparkles,
  TrendingUp,
  Receipt,
  Users,
  AlertTriangle,
  Phone,
  PhoneCall,
  MessageSquare,
} from 'lucide-react'

interface StudentDashboardViewProps {
  userId: string
  classId: string | null
}

export function StudentDashboardView({ userId, classId }: StudentDashboardViewProps) {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const appName = useAppName()
  const { isInstalled } = usePwaInstall()
  const { data, loading } = useStudentDashboard(userId, classId)
  const { notifications, markAsRead } = useNotifications()

  const [copiedId, setCopiedId] = useState(false)
  const [showClearanceModal, setShowClearanceModal] = useState(false)

  // Class leaders (admins/super_admins) for this student's class
  const [classLeaders, setClassLeaders] = useState<{ id: string; name: string; phone: string | null; role: string }[]>([])

  useEffect(() => {
    if (!classId) return
    // 1. First try secure RPC function
    supabase
      .rpc('get_class_leaders_for_student', { p_class_id: classId })
      .then(({ data: rpcData, error }) => {
        if (!error && rpcData && rpcData.length > 0) {
          setClassLeaders(rpcData)
        } else {
          // Fallback to direct relational query
          supabase
            .from('class_admins')
            .select('admin:profiles!class_admins_admin_id_fkey(id, name, phone, role)')
            .eq('class_id', classId)
            .then(({ data: rows }) => {
              if (rows) {
                const leaders = rows
                  .map((r: any) => r.admin)
                  .filter(Boolean) as { id: string; name: string; phone: string | null; role: string }[]
                setClassLeaders(leaders)
              }
            })
        }
      })
  }, [classId])

  const copyStudentId = () => {
    if (!user?.student_id) return
    navigator.clipboard.writeText(user.student_id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-6 w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6 w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <AppLogo className="size-10 rounded-xl object-contain p-1 bg-white dark:bg-slate-800 border border-border shadow-xs" alt={appName} />
            <h1 className="text-2xl font-bold text-text">{t('dashboard.title')}</h1>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={signOut}
            className="flex items-center gap-1.5 border-error/30 text-error hover:bg-error hover:text-white transition-all shadow-xs"
          >
            <LogOut size={15} />
            <span>{t('nav.signOut')}</span>
          </Button>
        </div>
        <Card className="rounded-3xl border border-dashed border-border/80">
          <CardContent className="py-16 text-center space-y-3">
            <div className="size-16 rounded-full bg-bg-elevated mx-auto flex items-center justify-center text-muted">
              <Users size={32} />
            </div>
            <h2 className="text-lg font-bold text-text">{t('dashboard.noClassAssigned')}</h2>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              You are currently registered in {appName}, but your account has not been assigned to a specific batch or class group. Contact your class administrator to assign you.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPaid = data.status === 'paid'
  const isPartial = data.status === 'partial'
  const progressPct = data.target > 0 ? Math.min(100, Math.round((data.personalTotal / data.target) * 100)) : 0
  const remainingNeeded = Math.max(0, data.target - data.personalTotal)

  // Filter notifications relevant to this student
  const classNotifs = notifications.filter(
    (n) => !n.classId || n.classId === classId
  ).slice(0, 3)

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* 1. Header Welcome Bar with Official App Logo & Direct Logout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-white dark:bg-slate-800 p-2 border border-border shadow-xs flex items-center justify-center shrink-0">
            <AppLogo className="size-full object-contain" alt={appName} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {appName} Student Portal
              </span>
              <span className="text-xs text-muted font-medium">📚 {data.className}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight">
              {t('dashboard.welcome', { name: user?.name || 'Student' })}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Prominent Visible Notification Bell */}
          <NotificationBell />

          {/* Copy Student ID Pill */}
          <button
            onClick={copyStudentId}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-bg-card hover:bg-bg-elevated border border-border text-xs font-mono font-semibold text-text transition-all cursor-pointer shadow-2xs"
            title="Click to copy Student ID"
          >
            {copiedId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-muted" />}
            <span>{user?.student_id || 'ID'}</span>
            {copiedId && <span className="text-[10px] text-emerald-600 font-sans font-bold">Copied!</span>}
          </button>

          {/* Direct Sign Out Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={signOut}
            className="flex items-center gap-1.5 border-error/30 text-error hover:bg-error hover:text-white transition-all shadow-xs h-8 text-xs font-semibold px-3"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* 2. THE STUDENT DIGITAL CONTRIBUTION PASS (Fintech Card with Logo & Dynamic Name) */}
      <div className="relative group perspective-[1200px]">
        {/* Ambient Glow behind card */}
        <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-emerald-600/30 via-brand-600/20 to-teal-600/30 blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 border border-emerald-500/30 p-6 sm:p-8 text-white shadow-2xl space-y-6">
          {/* Decorative geometric background accents */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-emerald-500/15 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-radial from-teal-500/10 via-transparent to-transparent pointer-events-none" />

          {/* Top Row: Chip, Official App Logo & Status Badge */}
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              {/* Smart Card Chip Visual */}
              <div className="size-10 rounded-lg bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 p-1 shadow-md border border-amber-400/60 flex items-center justify-center shrink-0">
                <Cpu size={22} className="text-amber-900/80" />
              </div>
              <div className="flex items-center gap-2 pl-2 border-l border-white/20">
                <div className="size-8 rounded-lg bg-white/10 p-1 flex items-center justify-center backdrop-blur-xs">
                  <AppLogo className="size-full object-contain" alt={appName} />
                </div>
                <span className="text-sm font-bold tracking-wider text-white font-serif">{appName}</span>
              </div>
              <Radio size={18} className="text-white/40 rotate-90 hidden sm:block" />
            </div>

            {/* Dynamic Status Badge */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-[11px] uppercase tracking-wider text-white/50 font-medium">
                Pass Status
              </span>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm border ${
                  isPaid
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 ring-1 ring-emerald-400/30'
                    : isPartial
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 ring-1 ring-amber-400/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/40 ring-1 ring-rose-400/30'
                }`}
              >
                {isPaid ? (
                  <>
                    <Sparkles size={13} className="text-emerald-300 animate-pulse" />
                    <span>FULLY PAID</span>
                  </>
                ) : isPartial ? (
                  <>
                    <Clock size={13} className="text-amber-300" />
                    <span>PARTIALLY PAID</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={13} className="text-rose-300" />
                    <span>PAYMENT DUE</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Middle Row: Student Identification & Target Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end relative z-10">
            <div>
              <span className="text-[11px] uppercase tracking-widest text-emerald-400/80 font-semibold block mb-0.5">
                {appName} Member Pass
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white truncate">
                {user?.name}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-white/60 font-mono">
                <span>ID: {user?.student_id}</span>
                <span>&bull;</span>
                <span className="text-emerald-400 font-sans font-medium">{data.className}</span>
              </div>
            </div>

            {/* Contribution Figure */}
            <div className="sm:text-right">
              <span className="text-[11px] uppercase tracking-widest text-white/50 font-medium block mb-0.5">
                Total Contributed
              </span>
              <div className="flex items-baseline sm:justify-end gap-2">
                <span className="text-3xl sm:text-4xl font-serif font-bold text-white tabular-nums tracking-tight">
                  {formatCurrency(data.personalTotal)}
                </span>
                <span className="text-sm font-medium text-white/40">
                  / {formatCurrency(data.target)} Target
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar & Status Text */}
          <div className="space-y-2 relative z-10">
            <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden p-0.5 backdrop-blur-sm border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isPaid
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                    : 'bg-gradient-to-r from-amber-400 to-emerald-400'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="font-semibold text-emerald-400">
                {progressPct}% Completed
              </span>
              <span>
                {isPaid
                  ? '✨ 100% Cleared • No Outstanding Dues'
                  : `${formatCurrency(remainingNeeded)} remaining to reach full clearance`}
              </span>
            </div>
          </div>

          {/* Card Bottom: Clearance Pass Action & Security Seal */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Auditable Ledger Protected &bull; Verified ID</span>
            </div>

            <button
              onClick={() => setShowClearanceModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all cursor-pointer backdrop-blur-md active:scale-98 shadow-sm"
            >
              <QrCode size={14} className="text-emerald-300" />
              <span>View Official Clearance Pass</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2.5. STUDENT 1-CLICK PWA INSTALL WIDGET (Prominently showing App Logo) */}
      {!isInstalled && (
        <div className="rounded-3xl border border-brand-500/30 bg-gradient-to-r from-brand-50/90 via-sky-50/50 to-white dark:from-brand-950/40 dark:via-slate-900 dark:to-bg-card p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-14 sm:size-16 rounded-2xl bg-white dark:bg-slate-800 p-2.5 shadow-md border border-brand-200 dark:border-brand-800/60 flex items-center justify-center shrink-0">
              <AppLogo className="size-full object-contain" alt={appName} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 bg-brand-100 dark:bg-brand-900/60 px-2 py-0.5 rounded-full">
                  Install Application
                </span>
                <span className="text-xs text-muted font-medium">1-Tap Fast Access</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-text">
                Install {appName} on your mobile phone
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                Add {appName} to your home screen with its official logo for instant offline access and real-time updates.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto shrink-0 flex justify-end">
            <PwaInstallButton className="w-full sm:w-auto justify-center" size="md" />
          </div>
        </div>
      )}

      {/* 3. PROFESSIONAL CLASS ANNOUNCEMENTS BULLETIN */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Bell size={14} />
            </div>
            <h2 className="text-base font-bold text-text">Official Class Announcements & Bulletins</h2>
          </div>
          <span className="text-xs text-muted font-medium">Live Updates</span>
        </div>

        {classNotifs.length === 0 ? (
          <Card className="rounded-2xl border-border/70">
            <CardContent className="py-6 px-4 text-center space-y-1 text-muted text-xs">
              <p className="font-semibold text-text">All Caught Up!</p>
              <p>No active broadcasts for your class group right now. Any official news will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {classNotifs.map((n) => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  n.read
                    ? 'bg-bg-card border-border/70 hover:border-border-hover'
                    : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-text">{n.title}</span>
                      {!n.read && (
                        <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.2 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                        {n.category || 'Announcement'}
                      </span>
                    </div>

                    <p className="text-xs text-secondary leading-relaxed whitespace-pre-wrap break-words">
                      {n.body}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-muted">
                      <span className="font-medium text-text">
                        {n.senderName ? `By ${n.senderName}` : 'Class Leadership'}
                      </span>
                      <span>&bull;</span>
                      <span>{formatDate(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. CLASS FINANCIAL SUMMARY POOL (Collective Transparency) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-base font-bold text-text">Class Financial Transparency Pool</h2>
          </div>
          <span className="text-xs text-muted font-medium">
            {data.totalPaidStudents} of {data.totalStudents} classmates cleared
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Card 1: Total Pooled */}
          <Card className="rounded-2xl border-border/80 hover:border-border-hover transition-colors">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted block">
                Total Class Collections
              </span>
              <p className="text-xl sm:text-2xl font-bold font-serif text-text tabular-nums">
                {formatCurrency(data.classTotal)}
              </p>
              <p className="text-[11px] text-muted">
                Pooled from {data.totalStudents} enrolled peers
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Total Spent */}
          <Card className="rounded-2xl border-border/80 hover:border-border-hover transition-colors">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted block">
                Approved Class Expenses
              </span>
              <p className="text-xl sm:text-2xl font-bold font-serif text-error tabular-nums">
                {formatCurrency(data.expenseTotal)}
              </p>
              <p className="text-[11px] text-muted">
                Handouts, materials & exam supplies
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Safe Balance */}
          <Card className="rounded-2xl border-border/80 hover:border-border-hover transition-colors">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted block">
                Net Class Bank Balance
              </span>
              <p
                className={`text-xl sm:text-2xl font-bold font-serif tabular-nums ${
                  data.remainingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error'
                }`}
              >
                {formatCurrency(data.remainingBalance)}
              </p>
              <p className="text-[11px] text-muted">
                Audited & available in class ledger
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. MY PERSONAL CONTRIBUTION RECEIPTS (Ledger Record) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-text">My Official Payment Receipts</h2>
          </div>
          <span className="text-xs font-semibold text-muted">
            {data.contributions.length} {data.contributions.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {data.contributions.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-10 text-center space-y-2 text-muted">
              <Receipt size={32} className="mx-auto opacity-30" />
              <p className="text-xs font-medium text-text">No payment records found</p>
              <p className="text-xs max-w-sm mx-auto">
                Once your class admin verifies and records your contribution, your verified electronic receipt will be logged here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl overflow-hidden">
            <CardContent className="p-0 divide-y divide-border/40">
              {data.contributions.map((c, i) => (
                <div
                  key={c.id}
                  className="p-4 flex items-center justify-between hover:bg-bg-elevated/40 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                      #{data.contributions.length - i}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text truncate">
                        Class Contribution Payment
                      </p>
                      <p className="text-xs text-muted">
                        Receipt Date: {formatDate(c.date)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +{formatCurrency(Number(c.amount))}
                    </span>
                    <span className="block text-[10px] text-muted font-medium">
                      ✓ Recorded
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 5.3. CYCLE & CONTRIBUTION BREAKDOWN + EXPENSES TRANSPARENCY */}
      <StudentContributionBreakdown userId={userId} classId={classId} />

      {/* 5.5. CONTACT YOUR CLASS LEADERS */}
      {classLeaders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <PhoneCall size={14} />
              </div>
              <h2 className="text-base font-bold text-text">Contact Your Class Leaders</h2>
            </div>
            <span className="text-xs text-muted font-medium">{classLeaders.length} {classLeaders.length === 1 ? 'leader' : 'leaders'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {classLeaders.map((leader) => (
              <Card key={leader.id} className="rounded-2xl border-border/80 hover:border-border-hover transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="size-12 rounded-2xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] flex items-center justify-center shrink-0 text-white font-bold text-lg shadow-sm">
                    {leader.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text truncate">{leader.name}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border mt-0.5 ${
                      leader.role === 'super_admin'
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-500/20'
                        : 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border-brand-500/20'
                    }`}>
                      {leader.role === 'super_admin' ? '👑 Super Admin' : '🛡️ Class Admin'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {leader.phone ? (
                      <>
                        <a
                          href={`tel:${leader.phone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors shadow-xs"
                          title={`Call ${leader.name}`}
                        >
                          <Phone size={12} />
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/${leader.phone.replace(/\D/g, '')}?text=Asc ${encodeURIComponent(leader.name)}, waxaan ahay ${encodeURIComponent(user?.name || 'student')} (${user?.student_id || ''}). Waxaan rabnaa in aan kula xiriirno arrimaha fasalka.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe57] text-white text-xs font-semibold transition-colors shadow-xs"
                          title={`WhatsApp ${leader.name}`}
                        >
                          <MessageSquare size={12} />
                          <span>WA</span>
                        </a>
                      </>
                    ) : (
                      <span className="text-[11px] text-muted italic">No phone</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 6. CLASS DISCUSSION & STUDENT FEEDBACK */}
      <ClassCommentsSection classId={classId} />

      {/* 7. DIGITAL CLEARANCE PASS MODAL */}
      <Modal
        open={showClearanceModal}
        onClose={() => setShowClearanceModal(false)}
        title="🎓 Official Contribution Clearance Pass"
      >
        <div className="space-y-6 py-2">
          {/* Printable Ticket Pass Box */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-bg-card to-bg-elevated border-2 border-emerald-500/30 shadow-xl space-y-5 text-center relative overflow-hidden">
            <div className="space-y-1">
              <div className="size-12 rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-xs border border-border mx-auto mb-2 flex items-center justify-center">
                <AppLogo className="size-full object-contain" alt={appName} />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold block">
                {appName} Transparency Network
              </span>
              <h3 className="text-xl font-bold text-text">Student Contribution Clearance</h3>
              <p className="text-xs text-muted">Batch: {data.className}</p>
            </div>

            <div className="py-4 border-y border-border/80 grid grid-cols-2 gap-4 text-left">
              <div>
                <span className="text-[10px] text-muted uppercase font-semibold block">Student Name</span>
                <span className="text-sm font-bold text-text truncate block">{user?.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-semibold block">Student ID</span>
                <span className="text-sm font-mono font-bold text-emerald-600 block">{user?.student_id}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-semibold block">Total Paid</span>
                <span className="text-base font-serif font-bold text-emerald-600 block">
                  {formatCurrency(data.personalTotal)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-semibold block">Status</span>
                <span
                  className={`text-xs font-bold uppercase inline-block px-2 py-0.5 rounded-md ${
                    isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isPaid ? 'Fully Cleared' : 'Pending Clearance'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Verified against {appName} PostgreSQL Ledger</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                window.print()
              }}
            >
              Print / Save PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowClearanceModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
