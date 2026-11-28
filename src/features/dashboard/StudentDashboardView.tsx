import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useNotifications } from '../notifications/NotificationContext'
import { useStudentDashboard } from './useStudentDashboard'
import { StudentContributionBreakdown } from './StudentContributionBreakdown'
import { formatCurrency, formatDate } from '../../lib/utils'
import { getValidAuthToken } from '../../lib/admin-api'
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
  TrendingUp,
  Receipt,
  Users,
  AlertTriangle,
  Phone,
  PhoneCall,
  MessageSquare,
  MessageSquareText,
  Lock,
  Shield,
  Send,
  RefreshCw,
} from 'lucide-react'

interface StudentDashboardViewProps {
  userId: string
  classId: string | null
}

interface ClassLeader {
  id: string
  name: string
  phone: string | null
  role: string
  student_id?: string | null
  isAssignedClassAdmin?: boolean
}

interface StudentPrivateMessage {
  id: string
  sender_id: string
  recipient_id?: string | null
  content: string
  category: string
  created_at: string
  sender?: { id: string; name: string; role?: string | null } | null
  recipient?: { id: string; name: string; role?: string | null } | null
}

function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('252')) return digits
  if (digits.length === 9 && digits.startsWith('6')) return `252${digits}`
  if (digits.length === 10 && digits.startsWith('06')) return `252${digits.slice(1)}`
  return digits
}

export function StudentDashboardView({ userId, classId }: StudentDashboardViewProps) {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const appName = useAppName()
  const { isInstalled } = usePwaInstall()
  const { data, loading } = useStudentDashboard(userId, classId)
  const { notifications, markAsRead, markAsUnread, refreshNotifications } = useNotifications()

  const [copiedId, setCopiedId] = useState(false)
  const [showClearanceModal, setShowClearanceModal] = useState(false)

  // Assigned Class Admins ONLY (super_admin is strictly excluded)
  const [classLeaders, setClassLeaders] = useState<ClassLeader[]>([])
  const [leadersLoading, setLeadersLoading] = useState(false)

  // Double-reinforced strict filter: students NEVER see or interact with super_admin
  const visibleClassAdmins = useMemo(() => {
    return classLeaders.filter(
      (l) =>
        Boolean(l) &&
        l.role === 'admin' &&
        l.id !== 'ae4ac258-d506-4466-a1df-bae5e70c67c9' &&
        !l.name?.toLowerCase().includes('ayoub')
    )
  }, [classLeaders])

  // 1-on-1 Confidential Private Messages history (Student <-> Class Admin)
  const [privateDms, setPrivateDms] = useState<StudentPrivateMessage[]>([])
  const [dmsLoading, setDmsLoading] = useState(false)

  // Direct Private Message Modal
  const [textTarget, setTextTarget] = useState<ClassLeader | null>(null)
  const [textBody, setTextBody] = useState('')
  const [textSending, setTextSending] = useState(false)
  const [textStatus, setTextStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const readNotifIds = useMemo(() => {
    const s = new Set<string>()
    for (const n of notifications) {
      if (n.read) s.add(n.id)
    }
    return s
  }, [notifications])

  const loadPrivateDms = useCallback(async () => {
    try {
      const token = await getValidAuthToken()
      if (!token) return
      const res = await fetch('/api/comments?action=private_messages', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const list = await res.json()
        if (Array.isArray(list)) {
          // Strict safety: filter out anything involving super_admin
          const safe = list.filter(
            (m: StudentPrivateMessage) =>
              m.sender?.role !== 'super_admin' && m.recipient?.role !== 'super_admin'
          )
          setPrivateDms(safe)
        }
      }
    } catch {}
    setDmsLoading(false)
  }, [])

  useEffect(() => {
    setDmsLoading(true)
    loadPrivateDms()
    const timer = setInterval(loadPrivateDms, 15000)
    return () => clearInterval(timer)
  }, [loadPrivateDms])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#my-private-messages') {
      setTimeout(() => {
        document.getElementById('my-private-messages')?.scrollIntoView({ behavior: 'smooth' })
      }, 250)
    }
  }, [])

  useEffect(() => {
    if (!classId) return
    let active = true
    setLeadersLoading(true)

    async function loadLeaders() {
      // 1. Primary path: authenticated serverless API (strictly returns assigned class admins only)
      try {
        const token = await getValidAuthToken()
        if (token) {
          const resp = await fetch(`/api/comments?leaders=1&class_id=${encodeURIComponent(classId!)}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (resp.ok) {
            const list = await resp.json()
            if (active && Array.isArray(list)) {
              const adminsOnly = list.filter(
                (l: any) =>
                  l &&
                  l.role === 'admin' &&
                  l.role !== 'super_admin' &&
                  l.id !== 'ae4ac258-d506-4466-a1df-bae5e70c67c9' &&
                  !l.name?.toLowerCase().includes('ayoub')
              )
              setClassLeaders(adminsOnly)
              setLeadersLoading(false)
              return
            }
          }
        }
      } catch {}

      // 2. Fallback RPC if API unavailable
      try {
        const { data: rpcData, error } = await supabase.rpc('get_class_leaders_for_student', {
          p_class_id: classId!,
        })
        if (active && !error && Array.isArray(rpcData) && rpcData.length > 0) {
          const adminsOnly = rpcData
            .filter(
              (r: any) =>
                r &&
                r.role === 'admin' &&
                r.role !== 'super_admin' &&
                r.id !== 'ae4ac258-d506-4466-a1df-bae5e70c67c9' &&
                !r.name?.toLowerCase().includes('ayoub')
            )
            .map((r: any) => ({
              ...r,
              isAssignedClassAdmin: true,
            }))
          setClassLeaders(adminsOnly)
          setLeadersLoading(false)
          return
        }
      } catch {}

      // 3. Last-resort direct table query
      try {
        const { data: rows } = await supabase
          .from('class_admins')
          .select('admin:profiles!class_admins_admin_id_fkey(id, name, phone, role, student_id)')
          .eq('class_id', classId!)
        if (active && rows) {
          const leaders = rows
            .map((r: any) => r.admin)
            .filter(
              (p: any) =>
                p &&
                p.role === 'admin' &&
                p.role !== 'super_admin' &&
                p.id !== 'ae4ac258-d506-4466-a1df-bae5e70c67c9' &&
                !p.name?.toLowerCase().includes('ayoub')
            )
            .map((r: any) => ({ ...r, isAssignedClassAdmin: true }))
          setClassLeaders(leaders)
        }
      } catch {}

      if (active) setLeadersLoading(false)
    }

    loadLeaders()
    return () => {
      active = false
    }
  }, [classId])

  const copyStudentId = () => {
    if (!user?.student_id) return
    navigator.clipboard.writeText(user.student_id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  function openQuickTextModal(leader: ClassLeader) {
    setTextTarget(leader)
    setTextBody('')
    setTextStatus(null)
    // Mark incoming replies from this admin as read
    privateDms
      .filter((m) => m.sender_id === leader.id && m.category === `dm:${userId}` && !readNotifIds.has(m.id))
      .forEach((m) => markAsRead(m.id))
  }

  async function handleSendInAppText(e: React.FormEvent) {
    e.preventDefault()
    if (!textTarget || !textBody.trim() || !classId) return
    if (
      textTarget.role === 'super_admin' ||
      textTarget.id === 'ae4ac258-d506-4466-a1df-bae5e70c67c9' ||
      textTarget.name?.toLowerCase().includes('ayoub')
    ) {
      setTextStatus({
        ok: false,
        msg: 'Students can only contact assigned class representatives. Direct messages to super administration are not permitted.',
      })
      return
    }
    setTextSending(true)
    setTextStatus(null)

    try {
      const token = await getValidAuthToken()
      if (!token) {
        throw new Error('Authentication expired. Please sign in again.')
      }

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient_id: textTarget.id,
          class_id: classId,
          content: textBody.trim(),
          is_private: true,
        }),
      })

      const resData = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to send private message')
      }

      if (resData?.data) {
        setPrivateDms((prev) => [
          {
            ...resData.data,
            sender: user ? { id: user.id, name: user.name, role: user.role } : null,
            recipient: { id: textTarget.id, name: textTarget.name, role: textTarget.role },
            recipient_id: textTarget.id,
          },
          ...prev,
        ])
      } else {
        await loadPrivateDms()
      }

      setTextSending(false)
      setTextStatus({
        ok: true,
        msg: `🔒 Private message delivered to ${textTarget.name}. Your conversation stays strictly confidential.`,
      })
      setTextBody('')
      setTimeout(() => {
        setTextStatus(null)
      }, 2500)
    } catch (err: any) {
      setTextSending(false)
      setTextStatus({ ok: false, msg: err.message || 'Failed to send private message' })
    }
  }

  // Chronological conversation filtered for active modal leader
  const modalConversation = useMemo(() => {
    if (!textTarget) return []
    return privateDms
      .filter(
        (m) =>
          (m.sender_id === userId && m.category === `dm:${textTarget.id}`) ||
          (m.sender_id === textTarget.id && m.category === `dm:${userId}`)
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [privateDms, textTarget, userId])

  const unreadAdminReplies = useMemo(() => {
    return privateDms.filter(
      (m) => m.sender_id !== userId && m.category === `dm:${userId}` && !readNotifIds.has(m.id)
    )
  }, [privateDms, userId, readNotifIds])

  if (loading) {
    return (
      <div className="space-y-6 w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-72 w-full rounded-3xl" />
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
            <AppLogo
              className="size-10 rounded-xl object-contain p-1 bg-[#FFFFFF] dark:bg-[#102033] border border-[#ECECEC] dark:border-[#203854] shadow-xs"
              alt={appName}
            />
            <h1 className="text-2xl font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">{t('dashboard.title')}</h1>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={signOut}
            className="flex items-center gap-1.5 border-error/40 text-error hover:bg-error hover:text-white transition-all shadow-xs"
          >
            <LogOut size={15} />
            <span>{t('nav.signOut')}</span>
          </Button>
        </div>
        <Card className="rounded-3xl border border-dashed border-[#C6CACB] dark:border-[#203854]">
          <CardContent className="py-16 text-center space-y-3">
            <div className="size-16 rounded-full bg-[#ECECEC] dark:bg-[#172D47] mx-auto flex items-center justify-center text-[#1176BC] dark:text-[#25A8E0]">
              <Users size={32} />
            </div>
            <h2 className="text-lg font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              {t('dashboard.noClassAssigned')}
            </h2>
            <p className="text-xs text-[#2F465E] dark:text-[#C6CACB] max-w-md mx-auto leading-relaxed">
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

  const classNotifs = notifications
    .filter((n) => n.category !== 'private_message' && (!n.classId || n.classId === classId))
    .slice(0, 3)

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* 1. HEADER WELCOME BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-[#FFFFFF] dark:bg-[#102033] p-2 border border-[#ECECEC] dark:border-[#203854] shadow-xs flex items-center justify-center shrink-0">
            <AppLogo className="size-full object-contain" alt={appName} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFFFFF] bg-gradient-to-r from-[#1176BC] to-[#25A8E0] px-2.5 py-0.5 rounded-full shadow-2xs">
                {appName} Student Portal
              </span>
              <span className="text-xs font-semibold text-[#1176BC] dark:text-[#9FBBDE] bg-[#9FBBDE]/20 dark:bg-[#172D47] border border-[#9FBBDE]/40 dark:border-[#203854] px-2 py-0.5 rounded-full">
                {data.className}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B1A2B] dark:text-[#FFFFFF] tracking-tight">
              {t('dashboard.welcome', { name: user?.name || 'Student' })}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={copyStudentId}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#102033] hover:bg-[#ECECEC] dark:hover:bg-[#172D47] border border-[#C6CACB] dark:border-[#203854] text-xs font-mono font-bold text-[#0B1A2B] dark:text-[#FFFFFF] transition-all cursor-pointer shadow-2xs"
            title="Click to copy Student ID"
          >
            {copiedId ? <Check size={13} className="text-[#0C9B5E]" /> : <Copy size={13} className="text-[#1176BC] dark:text-[#25A8E0]" />}
            <span>{user?.student_id || 'ID'}</span>
            {copiedId && <span className="text-[10px] text-[#0C9B5E] font-sans font-bold">Copied!</span>}
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={signOut}
            className="flex items-center gap-1.5 border-[#DC2626]/35 text-[#DC2626] dark:text-[#F87171] hover:bg-[#DC2626] hover:text-[#FFFFFF] transition-all shadow-xs h-8 text-xs font-semibold px-3"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* 2. EXECUTIVE STUDENT DIGITAL CONTRIBUTION PASS CARD (#1176BC -> #25A8E0 Palette) */}
      <div className="relative group perspective-[1200px]">
        {/* Crisp Ambient Palette Halo */}
        <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-[#1176BC]/35 via-[#25A8E0]/30 to-[#9FBBDE]/35 blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08385E] via-[#1176BC] to-[#1D93CE] border border-[#9FBBDE]/50 dark:border-[#25A8E0]/50 p-5 sm:p-8 text-[#FFFFFF] shadow-2xl space-y-6">
          {/* Geometric Mesh & Luminous Orbs */}
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#25A8E0]/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-[#9FBBDE]/20 blur-3xl pointer-events-none" />
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #FFFFFF 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />

          {/* Top Bar: Brushed Metallic EMV Chip, App Brand & Live Status Pill */}
          <div className="flex items-start justify-between gap-3 relative z-10 flex-wrap">
            <div className="flex items-center gap-3">
              {/* Platinum Brushed EMV Chip */}
              <div className="size-10 rounded-xl bg-gradient-to-br from-[#FFFFFF] via-[#ECECEC] to-[#C6CACB] p-1 shadow-md border border-[#FFFFFF]/80 flex items-center justify-center shrink-0">
                <Cpu size={21} className="text-[#1176BC]" />
              </div>

              <div className="flex items-center gap-2.5 pl-3 border-l border-[#FFFFFF]/25">
                <div className="size-8 rounded-lg bg-[#FFFFFF] p-1 flex items-center justify-center shadow-xs shrink-0">
                  <AppLogo className="size-full object-contain" alt={appName} />
                </div>
                <div>
                  <span className="text-sm font-bold tracking-wider text-[#FFFFFF] font-serif block leading-none">
                    {appName}
                  </span>
                  <span className="text-[10px] text-[#FFFFFF]/80 tracking-wide font-medium">
                    Verified Member Card
                  </span>
                </div>
              </div>

              <Radio size={17} className="text-[#FFFFFF]/60 rotate-90 hidden sm:block ml-1" />
            </div>

            {/* High-Contrast Status Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-wide shadow-sm border backdrop-blur-md ${
                isPaid
                  ? 'bg-[#FFFFFF] text-[#0C9B5E] border-[#FFFFFF]'
                  : isPartial
                  ? 'bg-[#FFFFFF]/20 text-[#FFFFFF] border-[#FFFFFF]/45'
                  : 'bg-[#FFFFFF]/95 text-[#DC2626] border-[#FFFFFF]'
              }`}
            >
              {isPaid ? (
                <>
                  <CheckCircle2 size={14} className="text-[#0C9B5E]" />
                  <span>FULLY PAID</span>
                </>
              ) : isPartial ? (
                <>
                  <Clock size={14} className="text-[#FFFFFF]" />
                  <span>PARTIAL PAID</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} className="text-[#DC2626]" />
                  <span>PAYMENT DUE</span>
                </>
              )}
            </div>
          </div>

          {/* Middle Row: Student Name / ID + Contribution Total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end relative z-10">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#FFFFFF]/80 font-bold block">
                Cardholder Identity
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FFFFFF] truncate">
                {user?.name}
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-[#FFFFFF]/90 flex-wrap pt-0.5">
                <span className="px-2 py-0.5 rounded-md bg-[#FFFFFF]/15 border border-[#FFFFFF]/25 font-bold">
                  ID: {user?.student_id}
                </span>
                <span className="font-sans font-semibold text-[#FFFFFF]/95">{data.className}</span>
              </div>
            </div>

            <div className="sm:text-right space-y-0.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#FFFFFF]/80 font-bold block">
                Total Contributed
              </span>
              <div className="flex items-baseline sm:justify-end gap-2">
                <span className="text-3xl sm:text-4xl font-serif font-bold text-[#FFFFFF] tabular-nums tracking-tight">
                  {formatCurrency(data.personalTotal)}
                </span>
                <span className="text-sm font-semibold text-[#FFFFFF]/80">
                  / {formatCurrency(data.target)}
                </span>
              </div>
            </div>
          </div>

          {/* 3-Column Glass Metric Strip inside Card */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 relative z-10">
            <div className="rounded-2xl bg-[#FFFFFF]/12 border border-[#FFFFFF]/20 backdrop-blur-sm p-3">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#FFFFFF]/80 block">
                My Paid
              </span>
              <span className="text-sm sm:text-base font-bold text-[#FFFFFF] tabular-nums mt-0.5 block">
                {formatCurrency(data.personalTotal)}
              </span>
            </div>
            <div className="rounded-2xl bg-[#FFFFFF]/12 border border-[#FFFFFF]/20 backdrop-blur-sm p-3">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#FFFFFF]/80 block">
                Target
              </span>
              <span className="text-sm sm:text-base font-bold text-[#FFFFFF] tabular-nums mt-0.5 block">
                {formatCurrency(data.target)}
              </span>
            </div>
            <div className="rounded-2xl bg-[#FFFFFF]/12 border border-[#FFFFFF]/20 backdrop-blur-sm p-3">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#FFFFFF]/80 block">
                Remaining
              </span>
              <span className="text-sm sm:text-base font-bold text-[#FFFFFF] tabular-nums mt-0.5 block">
                {formatCurrency(remainingNeeded)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 relative z-10">
            <div className="h-3 w-full bg-[#062945]/60 rounded-full overflow-hidden p-0.5 border border-[#FFFFFF]/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#9FBBDE] via-[#FFFFFF] to-[#25A8E0] transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.65)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-[#FFFFFF]/95">
              <span>{progressPct}% Completed</span>
              <span>
                {isPaid
                  ? '100% Cleared • No Outstanding Dues'
                  : `${formatCurrency(remainingNeeded)} left for full clearance`}
              </span>
            </div>
          </div>

          {/* Card Footer */}
          <div className="pt-4 border-t border-[#FFFFFF]/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2 text-xs text-[#FFFFFF]/90 font-medium">
              <ShieldCheck size={16} className="text-[#FFFFFF]" />
              <span>Audited PostgreSQL Ledger &bull; Verified Student Pass</span>
            </div>

            <button
              type="button"
              onClick={() => setShowClearanceModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#ECECEC] text-xs font-bold text-[#1176BC] transition-all cursor-pointer active:scale-98 shadow-md"
            >
              <QrCode size={15} className="text-[#1176BC]" />
              <span>View Official Clearance Pass</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2.5. YOUR CLASS ADMIN & DIRECT CONTACT (Visible, Call, SMS Text, WhatsApp & In-App Note) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-[#1176BC] text-[#FFFFFF] flex items-center justify-center shadow-2xs">
              <PhoneCall size={14} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF] leading-tight">
                Your Class Admin &amp; Support
              </h2>
              <p className="text-[11px] text-[#52677D] dark:text-[#C6CACB]">
                Call, SMS, or send a 100% confidential private message directly to your class leader
              </p>
            </div>
          </div>
          {visibleClassAdmins.length > 0 && (
            <span className="text-xs font-bold text-[#1176BC] dark:text-[#25A8E0] bg-[#9FBBDE]/25 dark:bg-[#172D47] border border-[#9FBBDE]/50 dark:border-[#203854] px-2.5 py-0.5 rounded-full">
              {visibleClassAdmins.length} Class {visibleClassAdmins.length === 1 ? 'Admin' : 'Admins'}
            </span>
          )}
        </div>

        {leadersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : visibleClassAdmins.length === 0 ? (
          <Card className="rounded-2xl border-[#ECECEC] dark:border-[#203854]">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                  Need help from your Class Admin?
                </p>
                <p className="text-xs text-[#2F465E] dark:text-[#C6CACB]">
                  Your class leader contact is being updated. You can also write a note in Class Discussion below.
                </p>
              </div>
              <a
                href="#class-discussion"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1176BC] to-[#25A8E0] text-[#FFFFFF] text-xs font-bold shadow-sm shrink-0"
              >
                <MessageSquareText size={14} />
                <span>Class Discussion</span>
              </a>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {visibleClassAdmins.map((leader) => {
              const waDigits = leader.phone ? formatWhatsAppNumber(leader.phone) : ''
              const prefilledText = `Hello ${leader.name}, I am ${user?.name || 'a student'} (${user?.student_id || ''}) from ${data.className}.`

              return (
                <Card
                  key={leader.id}
                  className="rounded-2xl overflow-hidden transition-all shadow-xs border-[#9FBBDE] dark:border-[#25A8E0]/50 bg-[#FFFFFF] dark:bg-[#102033]"
                >
                  <div className="h-1 w-full bg-gradient-to-r from-[#1176BC] to-[#25A8E0]" />
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="flex items-start gap-3.5">
                      <div className="size-12 rounded-2xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] flex items-center justify-center shrink-0 text-[#FFFFFF] font-bold text-lg shadow-sm">
                        {leader.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF] truncate">
                            {leader.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-[#9FBBDE]/25 dark:bg-[#172D47] text-[#1176BC] dark:text-[#25A8E0] border-[#9FBBDE]/60 dark:border-[#25A8E0]/40">
                            <Shield size={10} />
                            Class Admin
                          </span>
                          {leader.phone && (
                            <span className="text-xs font-mono font-semibold text-[#2F465E] dark:text-[#DCE8F5]">
                              {leader.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Row: Call + SMS Text + WhatsApp + Private Message */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#ECECEC] dark:border-[#203854]">
                      {leader.phone && (
                        <>
                          <a
                            href={`tel:${leader.phone}`}
                            className="flex-1 min-w-[90px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1176BC] hover:bg-[#0D5E97] text-[#FFFFFF] text-xs font-bold transition-colors shadow-2xs"
                            title={`Call ${leader.name}`}
                          >
                            <Phone size={13} />
                            <span>Call</span>
                          </a>

                          <a
                            href={`sms:${leader.phone}?body=${encodeURIComponent(prefilledText)}`}
                            className="flex-1 min-w-[95px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#25A8E0] hover:bg-[#1D96CA] text-[#FFFFFF] text-xs font-bold transition-colors shadow-2xs"
                            title={`Send SMS text to ${leader.name}`}
                          >
                            <MessageSquareText size={13} />
                            <span>SMS Text</span>
                          </a>

                          {waDigits && (
                            <a
                              href={`https://wa.me/${waDigits}?text=${encodeURIComponent(prefilledText)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#ECECEC] dark:bg-[#172D47] hover:bg-[#9FBBDE]/30 dark:hover:bg-[#214568] border border-[#C6CACB] dark:border-[#203854] text-[#0B1A2B] dark:text-[#FFFFFF] text-xs font-bold transition-colors"
                              title={`Message ${leader.name} on WhatsApp`}
                            >
                              <MessageSquare size={13} className="text-[#0C9B5E] dark:text-[#22C55E]" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => openQuickTextModal(leader)}
                        className={`${
                          leader.phone ? '' : 'w-full'
                        } inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#1176BC]/35 dark:border-[#25A8E0]/45 bg-[#FFFFFF] dark:bg-[#102033] hover:bg-[#9FBBDE]/20 dark:hover:bg-[#172D47] text-[#1176BC] dark:text-[#25A8E0] text-xs font-bold transition-colors cursor-pointer`}
                        title={`Send private confidential message to ${leader.name}`}
                      >
                        <Lock size={12} className="text-[#1176BC] dark:text-[#25A8E0]" />
                        <span>Private Message</span>
                        {privateDms.filter((m) => m.sender_id === leader.id && m.category === `dm:${userId}` && !readNotifIds.has(m.id)).length > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#1176BC] text-[#FFFFFF] text-[10px]">
                            {
                              privateDms.filter(
                                (m) => m.sender_id === leader.id && m.category === `dm:${userId}` && !readNotifIds.has(m.id)
                              ).length
                            }
                          </span>
                        )}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* MY CONFIDENTIAL 1-ON-1 PRIVATE CONVERSATION HISTORY (with Admin Replies!) */}
        {(privateDms.length > 0 || dmsLoading) && (
          <div id="my-private-messages" className="scroll-mt-20">
          <Card
            className="rounded-2xl border-[#9FBBDE]/70 dark:border-[#25A8E0]/40 bg-[#FFFFFF] dark:bg-[#102033] overflow-hidden shadow-xs"
          >
            <div className="px-4 sm:px-5 py-3 border-b border-[#ECECEC] dark:border-[#203854] bg-[#F4F8FC] dark:bg-[#0D1B2C] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-[#1176BC] dark:text-[#25A8E0]" />
                <h3 className="text-xs sm:text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                  My Confidential Messages with Class Admin
                </h3>
                {unreadAdminReplies.length > 0 && (
                  <span className="px-2 py-0.2 rounded-full bg-[#1176BC] text-[#FFFFFF] text-[10px] font-bold">
                    {unreadAdminReplies.length} New {unreadAdminReplies.length === 1 ? 'Reply' : 'Replies'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadAdminReplies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => unreadAdminReplies.forEach((m) => markAsRead(m.id))}
                    className="text-[11px] font-bold text-[#1176BC] dark:text-[#25A8E0] hover:underline cursor-pointer"
                  >
                    Mark replies read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    loadPrivateDms()
                    refreshNotifications()
                  }}
                  className="p-1 rounded-lg border border-[#C6CACB]/60 dark:border-[#203854] text-[#52677D] dark:text-[#9FBBDE] hover:text-[#1176BC] cursor-pointer"
                  title="Refresh private messages"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            <CardContent className="p-4 space-y-2.5 max-h-80 overflow-y-auto">
              {[...privateDms]
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((msg) => {
                  const isMine = msg.sender_id === userId
                  const partnerLeader = classLeaders.find(
                    (l) => l.id === (isMine ? msg.recipient_id : msg.sender_id)
                  )
                  const isUnreadReply = !isMine && !readNotifIds.has(msg.id)
                  const senderLabel = isMine
                    ? 'You'
                    : msg.sender?.name || partnerLeader?.name || 'Class Admin'

                  return (
                    <div
                      key={msg.id}
                      onClick={() => {
                        if (isUnreadReply) markAsRead(msg.id)
                      }}
                      className={`p-3 rounded-xl border text-xs sm:text-sm space-y-1 transition-colors ${
                        isMine
                          ? 'ml-4 sm:ml-10 bg-[#1176BC] text-[#FFFFFF] border-[#1176BC]'
                          : isUnreadReply
                          ? 'mr-4 sm:mr-10 bg-[#EAF4FB] dark:bg-[#172D47] border-[#25A8E0] text-[#0B1A2B] dark:text-[#FFFFFF] cursor-pointer'
                          : 'mr-4 sm:mr-10 bg-[#F4F8FC] dark:bg-[#0D1B2C] border-[#ECECEC] dark:border-[#203854] text-[#0B1A2B] dark:text-[#FFFFFF]'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between gap-2 text-[10px] font-bold ${
                          isMine ? 'text-[#FFFFFF]/85' : 'text-[#1176BC] dark:text-[#25A8E0]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{isMine ? 'You (Private)' : `${senderLabel} (Class Admin Reply)`}</span>
                          {isUnreadReply && (
                            <span className="px-1.5 py-0.2 rounded bg-[#1176BC] text-[#FFFFFF] text-[9px]">
                              NEW
                            </span>
                          )}
                        </div>
                        <span className={isMine ? 'text-[#FFFFFF]/75 font-normal' : 'text-[#52677D] dark:text-[#C6CACB] font-normal'}>
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                      <p
                        className={`whitespace-pre-wrap break-words leading-relaxed ${
                          isMine ? 'text-[#FFFFFF]' : 'text-[#0B1A2B] dark:text-[#FFFFFF]'
                        }`}
                      >
                        {msg.content}
                      </p>
                      {!isMine && partnerLeader && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openQuickTextModal(partnerLeader)
                            }}
                            className="text-[11px] font-bold text-[#1176BC] dark:text-[#25A8E0] hover:underline cursor-pointer"
                          >
                            Reply to {partnerLeader.name} &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
            </CardContent>
          </Card>
          </div>
        )}
      </div>

      {/* 3. STUDENT 1-CLICK PWA INSTALL WIDGET */}
      {!isInstalled && (
        <div className="rounded-3xl border border-[#9FBBDE]/60 dark:border-[#203854] bg-gradient-to-r from-[#FFFFFF] via-[#EAF4FB]/80 to-[#FFFFFF] dark:from-[#102033] dark:via-[#172D47] dark:to-[#102033] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-14 sm:size-16 rounded-2xl bg-[#FFFFFF] dark:bg-[#0D1B2C] p-2.5 shadow-sm border border-[#ECECEC] dark:border-[#203854] flex items-center justify-center shrink-0">
              <AppLogo className="size-full object-contain" alt={appName} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFFFFF] bg-[#1176BC] px-2.5 py-0.5 rounded-full">
                  Install Application
                </span>
                <span className="text-xs text-[#52677D] dark:text-[#C6CACB] font-semibold">1-Tap Fast Access</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                Install {appName} on your mobile phone
              </h3>
              <p className="text-xs text-[#2F465E] dark:text-[#DCE8F5] leading-relaxed">
                Add {appName} to your home screen with its official logo for instant offline access and real-time updates.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto shrink-0 flex justify-end">
            <PwaInstallButton className="w-full sm:w-auto justify-center" size="md" />
          </div>
        </div>
      )}

      {/* 4. OFFICIAL CLASS ANNOUNCEMENTS BULLETIN */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-[#1176BC]/12 dark:bg-[#25A8E0]/20 flex items-center justify-center text-[#1176BC] dark:text-[#25A8E0]">
              <Bell size={14} />
            </div>
            <h2 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              Official Class Announcements &amp; Bulletins
            </h2>
          </div>
          <span className="text-xs text-[#52677D] dark:text-[#9FBBDE] font-semibold">Live Updates</span>
        </div>

        {classNotifs.length === 0 ? (
          <Card className="rounded-2xl border-[#ECECEC] dark:border-[#203854]">
            <CardContent className="py-6 px-4 text-center space-y-1 text-xs">
              <p className="font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">All Caught Up!</p>
              <p className="text-[#52677D] dark:text-[#C6CACB]">
                No active broadcasts for your class group right now. Any official news will appear here.
              </p>
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
                    ? 'bg-[#FFFFFF] dark:bg-[#102033] border-[#ECECEC] dark:border-[#203854] hover:border-[#C6CACB] dark:hover:border-[#9FBBDE]'
                    : 'bg-[#EAF4FB] dark:bg-[#172D47] border-[#25A8E0]/60 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                          {n.title}
                        </span>
                        {!n.read && <span className="size-2 rounded-full bg-[#25A8E0] shrink-0" />}
                        <span className="text-[10px] font-bold text-[#1176BC] dark:text-[#FFFFFF] bg-[#9FBBDE]/25 dark:bg-[#1176BC]/40 px-2 py-0.5 rounded-full border border-[#9FBBDE]/50 dark:border-[#25A8E0]/40 uppercase tracking-wider">
                          {n.category || 'Announcement'}
                        </span>
                      </div>

                      {!n.read ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(n.id)
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FFFFFF] bg-[#1176BC] hover:bg-[#0D5E97] px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                        >
                          <Check size={11} /> Mark read
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsUnread(n.id)
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#52677D] dark:text-[#C6CACB] hover:text-[#1176BC] dark:hover:text-[#25A8E0] px-2 py-0.5 rounded-md hover:bg-[#ECECEC] dark:hover:bg-[#102033] transition-colors cursor-pointer"
                          title="Click to mark as unread"
                        >
                          <Check size={11} className="text-[#0C9B5E] dark:text-[#22C55E]" /> Read
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-[#2F465E] dark:text-[#DCE8F5] leading-relaxed whitespace-pre-wrap break-words">
                      {n.body}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-[#52677D] dark:text-[#C6CACB]">
                      <span className="font-semibold text-[#0B1A2B] dark:text-[#FFFFFF]">
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

      {/* 5. CLASS FINANCIAL SUMMARY POOL */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[#1176BC] dark:text-[#25A8E0]" />
            <h2 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              Class Financial Transparency Pool
            </h2>
          </div>
          <span className="text-xs text-[#52677D] dark:text-[#9FBBDE] font-semibold">
            {data.totalPaidStudents} of {data.totalStudents} classmates cleared
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Card className="rounded-2xl border-[#ECECEC] dark:border-[#203854] hover:border-[#25A8E0] transition-colors">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#52677D] dark:text-[#9FBBDE] block">
                Total Class Collections
              </span>
              <p className="text-xl sm:text-2xl font-bold font-serif text-[#1176BC] dark:text-[#25A8E0] tabular-nums">
                {formatCurrency(data.classTotal)}
              </p>
              <p className="text-[11px] text-[#52677D] dark:text-[#C6CACB]">
                Pooled from {data.totalStudents} enrolled peers
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#ECECEC] dark:border-[#203854] hover:border-[#25A8E0] transition-colors">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#52677D] dark:text-[#9FBBDE] block">
                Approved Class Expenses
              </span>
              <p className="text-xl sm:text-2xl font-bold font-serif text-[#DC2626] dark:text-[#F87171] tabular-nums">
                {formatCurrency(data.expenseTotal)}
              </p>
              <p className="text-[11px] text-[#52677D] dark:text-[#C6CACB]">
                Handouts, materials &amp; exam supplies
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#ECECEC] dark:border-[#203854] hover:border-[#25A8E0] transition-colors">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#52677D] dark:text-[#9FBBDE] block">
                Net Class Bank Balance
              </span>
              <p
                className={`text-xl sm:text-2xl font-bold font-serif tabular-nums ${
                  data.remainingBalance >= 0
                    ? 'text-[#0C9B5E] dark:text-[#22C55E]'
                    : 'text-[#DC2626] dark:text-[#F87171]'
                }`}
              >
                {formatCurrency(data.remainingBalance)}
              </p>
              <p className="text-[11px] text-[#52677D] dark:text-[#C6CACB]">
                Audited &amp; available in class ledger
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 6. PERSONAL PAYMENT RECEIPTS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-[#1176BC] dark:text-[#25A8E0]" />
            <h2 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              My Official Payment Receipts
            </h2>
          </div>
          <span className="text-xs font-bold text-[#52677D] dark:text-[#9FBBDE]">
            {data.contributions.length} {data.contributions.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {data.contributions.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-[#C6CACB] dark:border-[#203854]">
            <CardContent className="py-10 text-center space-y-2">
              <Receipt size={32} className="mx-auto text-[#9FBBDE]" />
              <p className="text-xs font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">No payment records found</p>
              <p className="text-xs text-[#52677D] dark:text-[#C6CACB] max-w-sm mx-auto">
                Once your class admin verifies and records your contribution, your verified electronic receipt will be logged here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl overflow-hidden border-[#ECECEC] dark:border-[#203854]">
            <CardContent className="p-0 divide-y divide-[#ECECEC] dark:divide-[#203854]">
              {data.contributions.map((c, i) => (
                <div
                  key={c.id}
                  className="p-4 flex items-center justify-between hover:bg-[#EAF4FB]/50 dark:hover:bg-[#172D47]/60 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-[#9FBBDE]/25 dark:bg-[#172D47] text-[#1176BC] dark:text-[#25A8E0] border border-[#9FBBDE]/50 dark:border-[#203854] flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                      #{data.contributions.length - i}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF] truncate">
                        Class Contribution Payment
                      </p>
                      <p className="text-xs text-[#52677D] dark:text-[#C6CACB]">
                        Receipt Date: {formatDate(c.date)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-bold text-[#0C9B5E] dark:text-[#22C55E] tabular-nums">
                      +{formatCurrency(Number(c.amount))}
                    </span>
                    <span className="block text-[10px] text-[#52677D] dark:text-[#C6CACB] font-semibold">
                      &check; Recorded
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 7. CYCLE & CONTRIBUTION BREAKDOWN */}
      <StudentContributionBreakdown userId={userId} classId={classId} />

      {/* 8. CLASS DISCUSSION & STUDENT FEEDBACK */}
      <ClassCommentsSection classId={classId} />

      {/* 100% PRIVATE CONFIDENTIAL DIRECT MESSAGE MODAL (2-WAY CONVERSATION) */}
      <Modal
        open={Boolean(textTarget)}
        onClose={() => {
          if (!textSending) {
            setTextTarget(null)
            setTextStatus(null)
          }
        }}
        title={textTarget ? `🔒 Private Chat: ${textTarget.name}` : 'Private Message'}
      >
        {textTarget && (
          <form onSubmit={handleSendInAppText} className="space-y-4">
            <div className="rounded-xl border border-[#9FBBDE]/50 dark:border-[#203854] bg-[#EAF4FB] dark:bg-[#0D1B2C] p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-[#0B1A2B] dark:text-[#FFFFFF] truncate">
                    {textTarget.name}
                  </p>
                  <span className="text-[10px] font-bold text-[#1176BC] dark:text-[#25A8E0] bg-[#FFFFFF] dark:bg-[#172D47] px-1.5 py-0.2 rounded">
                    Class Admin
                  </span>
                </div>
                <p className="text-[11px] text-[#52677D] dark:text-[#C6CACB]">
                  {textTarget.phone ? `Phone: ${textTarget.phone}` : 'Assigned Class Administrator'}
                </p>
              </div>
              {textTarget.phone && (
                <a
                  href={`sms:${textTarget.phone}?body=${encodeURIComponent(
                    `Hello ${textTarget.name}, I am ${user?.name || ''} (${user?.student_id || ''}): ${textBody}`
                  )}`}
                  className="px-3 py-1.5 rounded-lg bg-[#25A8E0] text-[#FFFFFF] text-[11px] font-bold shrink-0 hover:bg-[#1D96CA]"
                >
                  SMS App
                </a>
              )}
            </div>

            {/* Privacy Guarantee Banner */}
            <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-[#172D47]/50 border border-[#9FBBDE]/60 dark:border-[#203854] text-xs text-[#1176BC] dark:text-[#9FBBDE] flex items-start gap-2">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-[#1176BC] dark:text-[#25A8E0]" />
              <span>
                <strong>100% Confidential:</strong> Only you and <strong>{textTarget.name}</strong> can read messages or replies in this private thread. It never appears on the class board.
              </span>
            </div>

            {/* Previous 1-on-1 Messages & Admin Replies */}
            {modalConversation.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border border-[#ECECEC] dark:border-[#203854] bg-[#F4F8FC] dark:bg-[#0D1B2C] p-3">
                {modalConversation.map((m) => {
                  const isMine = m.sender_id === userId
                  return (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-xl text-xs space-y-1 ${
                        isMine
                          ? 'ml-6 bg-[#1176BC] text-[#FFFFFF]'
                          : 'mr-6 bg-[#FFFFFF] dark:bg-[#102033] text-[#0B1A2B] dark:text-[#FFFFFF] border border-[#ECECEC] dark:border-[#203854]'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between text-[10px] ${
                          isMine ? 'text-[#FFFFFF]/80' : 'text-[#52677D] dark:text-[#9FBBDE]'
                        }`}
                      >
                        <span className="font-bold">
                          {isMine ? 'You' : `${textTarget.name} (Class Admin)`}
                        </span>
                        <span>{formatDate(m.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                    </div>
                  )
                })}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0B1A2B] dark:text-[#FFFFFF] mb-1.5">
                {modalConversation.length > 0 ? 'Send Follow-Up Private Message' : 'Your Private Message'}
              </label>
              <textarea
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                rows={3}
                maxLength={600}
                required
                placeholder={`Write privately to ${textTarget.name}...`}
                className="w-full rounded-xl border border-[#C6CACB] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] p-3 text-sm text-[#0B1A2B] dark:text-[#FFFFFF] placeholder:text-[#52677D] dark:placeholder:text-[#9FBBDE] focus:outline-none focus:ring-2 focus:ring-[#25A8E0]/40"
              />
            </div>

            {/* Quick message templates */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#52677D] dark:text-[#C6CACB] font-bold uppercase tracking-wider block">Quick templates:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Payment confirmation sent via mobile money',
                  'Requesting extension for this week payment',
                  'I need to discuss my contribution in person',
                  'Question regarding the class handouts expense',
                ].map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setTextBody(tpl)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#ECECEC] dark:bg-[#172D47] hover:bg-[#9FBBDE]/30 text-[#0B1A2B] dark:text-[#FFFFFF] transition-colors cursor-pointer"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            {textStatus && (
              <p
                className={`text-xs font-medium p-2.5 rounded-xl border ${
                  textStatus.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                {textStatus.msg}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                disabled={textSending}
                onClick={() => setTextTarget(null)}
              >
                Close
              </Button>
              <Button
                type="submit"
                loading={textSending}
                disabled={!textBody.trim() || textSending}
                className="bg-gradient-to-r from-[#1176BC] to-[#25A8E0] text-[#FFFFFF]"
              >
                <Send size={14} /> Send Private Message
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* DIGITAL CLEARANCE PASS MODAL */}
      <Modal
        open={showClearanceModal}
        onClose={() => setShowClearanceModal(false)}
        title="🎓 Official Contribution Clearance Pass"
      >
        <div className="space-y-6 py-2">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FFFFFF] to-[#EAF4FB] dark:from-[#102033] dark:to-[#172D47] border-2 border-[#1176BC]/35 dark:border-[#25A8E0]/45 shadow-xl space-y-5 text-center relative overflow-hidden">
            <div className="space-y-1">
              <div className="size-12 rounded-2xl bg-[#FFFFFF] p-2 shadow-xs border border-[#ECECEC] mx-auto mb-2 flex items-center justify-center">
                <AppLogo className="size-full object-contain" alt={appName} />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[#1176BC] dark:text-[#25A8E0] font-bold block">
                {appName} Transparency Network
              </span>
              <h3 className="text-xl font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                Student Contribution Clearance
              </h3>
              <p className="text-xs text-[#52677D] dark:text-[#C6CACB]">Batch: {data.className}</p>
            </div>

            <div className="py-4 border-y border-[#C6CACB]/60 dark:border-[#203854] grid grid-cols-2 gap-4 text-left">
              <div>
                <span className="text-[10px] text-[#52677D] dark:text-[#9FBBDE] uppercase font-bold block">
                  Student Name
                </span>
                <span className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF] truncate block">
                  {user?.name}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#52677D] dark:text-[#9FBBDE] uppercase font-bold block">
                  Student ID
                </span>
                <span className="text-sm font-mono font-bold text-[#1176BC] dark:text-[#25A8E0] block">
                  {user?.student_id}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#52677D] dark:text-[#9FBBDE] uppercase font-bold block">
                  Total Paid
                </span>
                <span className="text-base font-serif font-bold text-[#0C9B5E] dark:text-[#22C55E] block">
                  {formatCurrency(data.personalTotal)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#52677D] dark:text-[#9FBBDE] uppercase font-bold block">
                  Status
                </span>
                <span
                  className={`text-xs font-bold uppercase inline-block px-2 py-0.5 rounded-md ${
                    isPaid
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {isPaid ? 'Fully Cleared' : 'Pending Clearance'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-[#52677D] dark:text-[#C6CACB]">
              <CheckCircle2 size={16} className="text-[#0C9B5E] dark:text-[#22C55E]" />
              <span>Verified against {appName} PostgreSQL Ledger</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 justify-center bg-gradient-to-r from-[#1176BC] to-[#25A8E0] text-[#FFFFFF]"
              onClick={() => window.print()}
            >
              Print / Save PDF
            </Button>
            <Button variant="secondary" onClick={() => setShowClearanceModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
