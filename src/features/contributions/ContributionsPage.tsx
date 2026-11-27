import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import { useStudents } from '../students/useStudents'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { useContributions, useContributionTotals } from './useContributions'
import { useStudentTargets } from './useStudentTargets'
import type { ContributionWithStudent } from './useContributions'
import { formatCurrency, formatDate } from '../../lib/utils'
import {
  Plus,
  Pencil,
  Trash2,
  PiggyBank,
  Search,
  Target,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  Users,
  Receipt,
} from 'lucide-react'
import {
  getCurrentWeekCycle,
  getRecentWeekCycles,
  getMonthOptions,
  getYearOptions,
  isDateInCycle,
  isDateInMonth,
  isDateInYear,
} from '../../lib/weekCycle'
import { WeeklyCutoffBanner } from './WeeklyCutoffBanner'
import { StudentPaymentStatusTable } from './StudentPaymentStatusTable'

// Tiny inline bar chart component
function MiniBar({ pct, color = '#1176BC' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full bg-[#ECECEC] dark:bg-[#1e3550] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
      />
    </div>
  )
}

export function ContributionsPage() {
  const { t } = useTranslation()
  const { user, activeClassId, setActiveClassId } = useAuth()
  const isFinanceManager = user?.role === 'finance_manager'
  const isSuperAdmin = user?.role === 'super_admin'
  const canViewAllClasses = isSuperAdmin || isFinanceManager
  const [selectedClass, setSelectedClass] = useState<string>(activeClassId || '')
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (!canViewAllClasses) return
    supabase
      .from('classes')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setClasses(data)
      })
  }, [canViewAllClasses])

  useEffect(() => {
    setSelectedClass(activeClassId || '')
  }, [activeClassId])

  const classId = canViewAllClasses ? (selectedClass || null) : activeClassId
  const { contributions, loading, create, update, remove, clearAll } = useContributions(classId)
  const { total } = useContributionTotals(classId, canViewAllClasses)
  const { students } = useStudents(classId)
  const { upsertTarget, removeTarget, getTargetForStudent } = useStudentTargets(classId)

  // Period filter states (Saturday-Friday cycle, Monthly, Yearly, All)
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly' | 'yearly' | 'all'>('weekly')
  const currentCycle = useMemo(() => getCurrentWeekCycle(), [])
  const weekCycles = useMemo(() => getRecentWeekCycles(16), [])
  const [selectedCycleId, setSelectedCycleId] = useState<string>(() => currentCycle.id)
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear())

  // Active view tab: Status audit table (Who paid vs unpaid) vs Transaction Ledger
  const [activeViewTab, setActiveViewTab] = useState<'status' | 'ledger'>('status')

  const selectedCycle = useMemo(() => {
    return weekCycles.find((c) => c.id === selectedCycleId) || currentCycle
  }, [weekCycles, selectedCycleId, currentCycle])

  // Filter contributions by period
  const periodContributions = useMemo(() => {
    return contributions.filter((c) => {
      if (!c.date) return false
      if (periodType === 'weekly') {
        return isDateInCycle(c.date, selectedCycle)
      }
      if (periodType === 'monthly') {
        return isDateInMonth(c.date, selectedYear, selectedMonth)
      }
      if (periodType === 'yearly') {
        return isDateInYear(c.date, selectedYear)
      }
      return true // 'all'
    })
  }, [contributions, periodType, selectedCycle, selectedYear, selectedMonth])

  // Period descriptive label
  const periodLabel = useMemo(() => {
    if (periodType === 'weekly') return selectedCycle.label
    if (periodType === 'monthly') {
      const monthObj = getMonthOptions().find((m) => m.value === selectedMonth)
      return `${monthObj?.label || 'Month'} ${selectedYear}`
    }
    if (periodType === 'yearly') return `Year ${selectedYear}`
    return 'All Time'
  }, [periodType, selectedCycle, selectedMonth, selectedYear])

  // Current week statistics for the WeeklyCutoffBanner (Saturday to Friday)
  const currentWeekContributions = useMemo(() => {
    return contributions.filter((c) => c.date && isDateInCycle(c.date, currentCycle))
  }, [contributions, currentCycle])

  const currentWeekPaidStudents = useMemo(() => {
    return students
      .filter((s) => {
        const target = getTargetForStudent(s.id) ?? 0
        const paid = currentWeekContributions
          .filter((c) => c.student_id === s.id)
          .reduce((sum, c) => sum + Number(c.amount), 0)
        return target > 0 ? paid >= target : paid > 0
      })
      .map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        student_id: s.student_id,
      }))
  }, [students, currentWeekContributions, getTargetForStudent])

  const currentWeekUnpaidStudents = useMemo(() => {
    return students
      .filter((s) => {
        const target = getTargetForStudent(s.id) ?? 0
        const paid = currentWeekContributions
          .filter((c) => c.student_id === s.id)
          .reduce((sum, c) => sum + Number(c.amount), 0)
        return target > 0 ? paid < target : paid === 0
      })
      .map((s) => {
        const target = getTargetForStudent(s.id) ?? 0
        const paid = currentWeekContributions
          .filter((c) => c.student_id === s.id)
          .reduce((sum, c) => sum + Number(c.amount), 0)
        return {
          id: s.id,
          name: s.name,
          phone: s.phone,
          student_id: s.student_id,
          target,
          paid,
        }
      })
  }, [students, currentWeekContributions, getTargetForStudent])

  const currentWeekTotalCollected = useMemo(() => {
    return currentWeekContributions.reduce((sum, c) => sum + Number(c.amount), 0)
  }, [currentWeekContributions])

  const currentWeekTotalTarget = useMemo(() => {
    return students.reduce((sum, s) => sum + (getTargetForStudent(s.id) ?? 0), 0)
  }, [students, getTargetForStudent])

  const currentClassName = useMemo(() => {
    return classes.find((c) => c.id === classId)?.name || 'Class'
  }, [classes, classId])

  // Contribution form state
  const [showForm, setShowForm] = useState(false)
  const [editingContribution, setEditingContribution] = useState<ContributionWithStudent | null>(null)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Target assignment form state
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [targetStudentId, setTargetStudentId] = useState('')
  const [targetStudentName, setTargetStudentName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetNote, setTargetNote] = useState('')
  const [targetError, setTargetError] = useState('')
  const [targetSubmitting, setTargetSubmitting] = useState(false)
  const [targetSearch, setTargetSearch] = useState('')

  // Bulk target assignment
  const [bulkTargetAmount, setBulkTargetAmount] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')

  // Clear confirm
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearText, setClearText] = useState('')
  const [clearing, setClearing] = useState(false)

  // Search & view toggle
  const [search, setSearch] = useState('')
  const [showTargetPanel, setShowTargetPanel] = useState(false)

  // Period stats
  const periodTotal = useMemo(() => {
    return periodContributions.reduce((a, c) => a + Number(c.amount), 0)
  }, [periodContributions])

  const periodPaidCount = useMemo(() => {
    return students.filter((s) => {
      const t = getTargetForStudent(s.id)
      if (!t) return false
      const paid = periodContributions
        .filter((c) => c.student_id === s.id)
        .reduce((a, c) => a + Number(c.amount), 0)
      return paid >= t
    }).length
  }, [students, periodContributions, getTargetForStudent])

  const periodPartialCount = useMemo(() => {
    return students.filter((s) => {
      const t = getTargetForStudent(s.id)
      if (!t) return false
      const paid = periodContributions
        .filter((c) => c.student_id === s.id)
        .reduce((a, c) => a + Number(c.amount), 0)
      return paid > 0 && paid < t
    }).length
  }, [students, periodContributions, getTargetForStudent])

  const periodUnpaidCount = Math.max(0, students.length - periodPaidCount - periodPartialCount)

  // Filtered period contributions by search
  const filtered = periodContributions.filter((c) => {
    const q = search.toLowerCase()
    return (
      !q ||
      c.profiles?.name?.toLowerCase().includes(q) ||
      c.profiles?.student_id?.toLowerCase().includes(q)
    )
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent || !amount || !date) {
      setFormError('All fields are required.')
      return
    }
    setSubmitting(true)
    const err = editingContribution
      ? await update(editingContribution.id, parseFloat(amount), date)
      : await create(selectedStudent, parseFloat(amount), date)
    if (err) setFormError(err)
    else {
      setShowForm(false)
      setEditingContribution(null)
      setSelectedStudent('')
      setStudentSearch('')
      setAmount('')
      setFormError('')
    }
    setSubmitting(false)
  }

  function openEdit(c: ContributionWithStudent) {
    setEditingContribution(c)
    setSelectedStudent(c.student_id)
    setStudentSearch(`${c.profiles?.name} (${c.profiles?.student_id})`)
    setAmount(String(c.amount))
    setDate(c.date)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingContribution(null)
    setStudentSearch('')
    setSelectedStudent('')
    setAmount('')
    setFormError('')
  }

  function handleQuickRecord(studentId: string, studentName: string, defaultAmount?: number) {
    setSelectedStudent(studentId)
    setStudentSearch(studentName)
    if (defaultAmount && defaultAmount > 0) {
      setAmount(String(defaultAmount))
    }
    setDate(new Date().toISOString().split('T')[0])
    setEditingContribution(null)
    setShowForm(true)
  }

  async function handleTargetSave(e: React.FormEvent) {
    e.preventDefault()
    if (!targetStudentId || !targetAmount) {
      setTargetError('Select a student and enter an amount.')
      return
    }
    setTargetSubmitting(true)
    const err = await upsertTarget(targetStudentId, parseFloat(targetAmount), targetNote || undefined)
    if (err) setTargetError(err)
    else {
      setShowTargetModal(false)
      setTargetStudentId('')
      setTargetStudentName('')
      setTargetAmount('')
      setTargetNote('')
      setTargetSearch('')
    }
    setTargetSubmitting(false)
  }

  async function handleBulkTarget() {
    if (!bulkTargetAmount || isNaN(parseFloat(bulkTargetAmount))) {
      setBulkMsg('Enter a valid amount.')
      return
    }
    setBulkSubmitting(true)
    setBulkMsg('')
    let success = 0
    for (const s of students) {
      await upsertTarget(s.id, parseFloat(bulkTargetAmount))
      success++
    }
    setBulkMsg(`✓ Assigned $${bulkTargetAmount} to ${success} students.`)
    setBulkTargetAmount('')
    setBulkSubmitting(false)
  }

  async function handleClearAll() {
    setClearing(true)
    const err = await clearAll()
    if (err) setFormError(err)
    else {
      setShowClearConfirm(false)
      setClearText('')
    }
    setClearing(false)
  }

  const filteredForSearch = students.filter(
    (s) =>
      !targetSearch ||
      s.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
      s.student_id.toLowerCase().includes(targetSearch.toLowerCase())
  )

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] flex items-center justify-center shadow-sm">
            <PiggyBank size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a2332] dark:text-[#e8f0f8]">
              {t('contributions.title')}
            </h1>
            <p className="text-xs text-[#9FBBDE]">
              {contributions.length} total records · Overall: {formatCurrency(total)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {canViewAllClasses && classes.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033]">
              <Filter size={14} className="text-[#1176BC]" />
              <select
                value={selectedClass}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedClass(val)
                  setActiveClassId(val || null)
                }}
                className="text-xs font-semibold text-[#1a2332] dark:text-[#e8f0f8] bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="">🌐 All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    📚 {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!isFinanceManager && (
            <>
              <button
                onClick={() => setShowTargetPanel((v) => !v)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] text-sm font-semibold text-[#1176BC] hover:bg-[#EAF4FB] dark:hover:bg-[#0d2a40] transition-colors cursor-pointer"
              >
                <Target size={15} />
                Manage Targets
                {showTargetPanel ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {contributions.length > 0 && isSuperAdmin && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                  {t('contributions.clearAll')}
                </button>
              )}
              <button
                onClick={() => {
                  setEditingContribution(null)
                  setShowForm(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1176BC] to-[#25A8E0] text-white text-sm font-semibold shadow-sm hover:shadow-md hover:opacity-95 transition-all cursor-pointer active:scale-95"
              >
                <Plus size={16} />
                {t('contributions.record')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Weekly Saturday-to-Friday Cutoff Banner & Actions */}
      <WeeklyCutoffBanner
        classId={classId}
        classNameStr={currentClassName}
        paidStudents={currentWeekPaidStudents}
        unpaidStudents={currentWeekUnpaidStudents}
        totalCollected={currentWeekTotalCollected}
        totalTarget={currentWeekTotalTarget}
        canSendNotification={!isFinanceManager}
      />

      {/* Target Management Panel (Expandable) */}
      {showTargetPanel && (
        <div className="rounded-2xl border border-[#9FBBDE]/30 bg-[#EAF4FB]/40 dark:bg-[#0d2a40]/60 dark:border-[#1176BC]/30 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-[#1176BC]" />
            <h2 className="text-base font-bold text-[#1a2332] dark:text-[#e8f0f8]">
              Student Contribution Targets
            </h2>
          </div>
          <p className="text-xs text-[#9FBBDE]">
            Assign a fixed contribution amount per student individually, or set the same target amount for all students at once.
          </p>

          {/* Bulk assign */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-white dark:bg-[#132033] border border-[#ECECEC] dark:border-[#1e3550]">
            <div className="flex-1">
              <label className="text-xs font-semibold text-[#9FBBDE] block mb-1">
                Assign Same Target to All Students
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 10"
                value={bulkTargetAmount}
                onChange={(e) => setBulkTargetAmount(e.target.value)}
                className="w-full border border-[#ECECEC] dark:border-[#1e3550] rounded-xl px-3 py-2 text-sm text-[#1a2332] dark:text-[#e8f0f8] bg-transparent focus:outline-none focus:ring-2 focus:ring-[#25A8E0]/30"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleBulkTarget}
                disabled={bulkSubmitting}
                className="px-4 py-2 rounded-xl bg-[#1176BC] text-white text-sm font-semibold hover:bg-[#0D5A8A] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {bulkSubmitting ? 'Saving…' : 'Set for All'}
              </button>
            </div>
          </div>
          {bulkMsg && <p className="text-xs text-[#0C9B5E] font-semibold">{bulkMsg}</p>}

          {/* Per-student list */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9FBBDE]" />
                <input
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  placeholder="Search student…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#ECECEC] dark:border-[#1e3550] rounded-xl bg-white dark:bg-[#132033] text-[#1a2332] dark:text-[#e8f0f8] focus:outline-none focus:ring-2 focus:ring-[#25A8E0]/30"
                />
              </div>
              <button
                onClick={() => {
                  setShowTargetModal(true)
                  setTargetStudentId('')
                  setTargetStudentName('')
                  setTargetAmount('')
                  setTargetNote('')
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1176BC] text-white text-xs font-semibold hover:bg-[#0D5A8A] transition-colors cursor-pointer"
              >
                <Plus size={13} /> Set Individual Target
              </button>
            </div>

            {filteredForSearch.length === 0 && (
              <p className="text-xs text-[#9FBBDE] py-4 text-center">No students found.</p>
            )}

            <div className="rounded-xl border border-[#ECECEC] dark:border-[#1e3550] overflow-hidden divide-y divide-[#ECECEC] dark:divide-[#1e3550]">
              {filteredForSearch.slice(0, 10).map((s) => {
                const tgt = getTargetForStudent(s.id)
                const paid = contributions
                  .filter((c) => c.student_id === s.id)
                  .reduce((a, c) => a + Number(c.amount), 0)
                const pct = tgt && tgt > 0 ? Math.min(100, (paid / tgt) * 100) : 0
                const statusColor =
                  !tgt ? '#C6CACB' : paid >= tgt ? '#0C9B5E' : paid > 0 ? '#d97706' : '#DC2626'
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#132033] hover:bg-[#EAF4FB]/40 dark:hover:bg-[#0d2a40]/40 transition-colors"
                  >
                    <div className="size-8 rounded-full bg-[#EAF4FB] dark:bg-[#1176BC]/20 text-[#1176BC] flex items-center justify-center text-xs font-bold shrink-0">
                      {s.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8] truncate">
                        {s.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <MiniBar pct={pct} color={statusColor} />
                        <span className="text-[10px] font-semibold shrink-0" style={{ color: statusColor }}>
                          {tgt ? `${formatCurrency(paid)} / ${formatCurrency(tgt)}` : 'No target set'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setTargetStudentId(s.id)
                          setTargetStudentName(s.name)
                          setTargetAmount(tgt ? String(tgt) : '')
                          setShowTargetModal(true)
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#EAF4FB] dark:hover:bg-[#0d2a40] text-[#9FBBDE] hover:text-[#1176BC] transition-colors cursor-pointer"
                        title="Edit Target"
                      >
                        <Pencil size={13} />
                      </button>
                      {tgt !== null && (
                        <button
                          onClick={() => removeTarget(s.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[#9FBBDE] hover:text-red-500 transition-colors cursor-pointer"
                          title="Remove Target"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {filteredForSearch.length > 10 && (
              <p className="text-xs text-[#9FBBDE] text-center">
                Showing 10 of {filteredForSearch.length}. Use search to narrow down.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Period Selection & Filter Controls */}
      <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Period Type Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F5F8FA] dark:bg-[#0d1a2d] border border-[#ECECEC] dark:border-[#1e3550] overflow-x-auto">
            {(
              [
                { id: 'weekly', label: '📅 Weekly (Sat–Fri)' },
                { id: 'monthly', label: '🗓️ Monthly' },
                { id: 'yearly', label: '📆 Yearly' },
                { id: 'all', label: '🌐 All Time' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                onClick={() => setPeriodType(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  periodType === btn.id
                    ? 'bg-[#1176BC] text-white shadow-sm'
                    : 'text-[#4a5a72] dark:text-[#9FBBDE] hover:text-[#1176BC] hover:bg-[#EAF4FB] dark:hover:bg-[#132033]'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Period Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {periodType === 'weekly' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-[#F5F8FA] dark:bg-[#0d1a2d]">
                <Calendar size={14} className="text-[#1176BC]" />
                <select
                  value={selectedCycleId}
                  onChange={(e) => setSelectedCycleId(e.target.value)}
                  className="text-xs font-semibold text-[#1a2332] dark:text-[#e8f0f8] bg-transparent focus:outline-none cursor-pointer"
                >
                  {weekCycles.map((cyc) => (
                    <option key={cyc.id} value={cyc.id}>
                      {cyc.isCurrent ? '⚡ Current Week: ' : 'Cycle: '}
                      {cyc.shortLabel} ({cyc.dayIndex === 7 ? 'Cutoff' : `Day ${cyc.dayIndex}`})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periodType === 'monthly' && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-[#F5F8FA] dark:bg-[#0d1a2d]">
                  <Calendar size={14} className="text-[#1176BC]" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="text-xs font-semibold text-[#1a2332] dark:text-[#e8f0f8] bg-transparent focus:outline-none cursor-pointer"
                  >
                    {getMonthOptions().map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-[#F5F8FA] dark:bg-[#0d1a2d]">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="text-xs font-semibold text-[#1a2332] dark:text-[#e8f0f8] bg-transparent focus:outline-none cursor-pointer"
                  >
                    {getYearOptions().map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {periodType === 'yearly' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-[#F5F8FA] dark:bg-[#0d1a2d]">
                <Calendar size={14} className="text-[#1176BC]" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-semibold text-[#1a2332] dark:text-[#e8f0f8] bg-transparent focus:outline-none cursor-pointer"
                >
                  {getYearOptions().map((yr) => (
                    <option key={yr} value={yr}>
                      Year {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Selected Period Stats Mini-Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#ECECEC] dark:border-[#1e3550]">
          <div className="p-3 rounded-xl bg-[#F5F8FA] dark:bg-[#0d1a2d]">
            <p className="text-[11px] text-[#9FBBDE] font-medium">Period Total</p>
            <p className="text-base font-bold text-[#1176BC]">{formatCurrency(periodTotal)}</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F5F8FA] dark:bg-[#0d1a2d]">
            <p className="text-[11px] text-[#9FBBDE] font-medium">Fully Paid</p>
            <p className="text-base font-bold text-[#0C9B5E]">{periodPaidCount} students</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F5F8FA] dark:bg-[#0d1a2d]">
            <p className="text-[11px] text-[#9FBBDE] font-medium">Partial Paid</p>
            <p className="text-base font-bold text-[#d97706]">{periodPartialCount} students</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F5F8FA] dark:bg-[#0d1a2d]">
            <p className="text-[11px] text-[#9FBBDE] font-medium">Not Paid</p>
            <p className="text-base font-bold text-[#DC2626]">{periodUnpaidCount} students</p>
          </div>
        </div>
      </div>

      {/* View Switcher: Paid vs Unpaid Status Table VS Ledger */}
      <div className="flex items-center gap-2 border-b border-[#ECECEC] dark:border-[#1e3550] pb-2">
        <button
          onClick={() => setActiveViewTab('status')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeViewTab === 'status'
              ? 'bg-[#1176BC] text-white shadow-sm'
              : 'text-[#4a5a72] dark:text-[#9FBBDE] hover:bg-[#EAF4FB] dark:hover:bg-[#132033]'
          }`}
        >
          <Users size={16} />
          Student Payment Status (Who Paid & Who Didn't)
        </button>
        <button
          onClick={() => setActiveViewTab('ledger')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeViewTab === 'ledger'
              ? 'bg-[#1176BC] text-white shadow-sm'
              : 'text-[#4a5a72] dark:text-[#9FBBDE] hover:bg-[#EAF4FB] dark:hover:bg-[#132033]'
          }`}
        >
          <Receipt size={16} />
          Transactions Ledger ({periodContributions.length})
        </button>
      </div>

      {/* TAB 1: Student Payment Status (Paid vs Unpaid) */}
      {activeViewTab === 'status' && (
        <StudentPaymentStatusTable
          students={students}
          contributions={periodContributions}
          getTargetForStudent={getTargetForStudent}
          periodLabel={periodLabel}
          periodType={periodType}
          isFinanceManager={isFinanceManager}
          onQuickRecord={handleQuickRecord}
        />
      )}

      {/* TAB 2: Transaction Ledger */}
      {activeViewTab === 'ledger' && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9FBBDE]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or ID…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#ECECEC] dark:border-[#1e3550] rounded-xl bg-white dark:bg-[#132033] text-[#1a2332] dark:text-[#e8f0f8] focus:outline-none focus:ring-2 focus:ring-[#25A8E0]/30"
            />
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-6 space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-[#ECECEC] dark:bg-[#1e3550]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 bg-[#ECECEC] dark:bg-[#1e3550] rounded" />
                    <div className="h-2.5 w-24 bg-[#ECECEC] dark:bg-[#1e3550] rounded" />
                  </div>
                  <div className="h-5 w-16 bg-[#ECECEC] dark:bg-[#1e3550] rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#9FBBDE]/40 bg-white dark:bg-[#132033] py-16 flex flex-col items-center gap-3 text-[#9FBBDE]">
              <PiggyBank size={44} className="opacity-30" />
              <p className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8]">
                No contributions found for {periodLabel}
              </p>
              {!isFinanceManager && (
                <>
                  <p className="text-xs">Click "Record Contribution" to add the first entry for this period.</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1176BC] text-white text-sm font-semibold hover:bg-[#0D5A8A] transition-colors cursor-pointer"
                  >
                    <Plus size={15} /> Record Contribution
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] overflow-hidden divide-y divide-[#ECECEC] dark:divide-[#1e3550]">
              {filtered.map((c) => {
                const tgt = getTargetForStudent(c.student_id)
                const totalForStudentInPeriod = periodContributions
                  .filter((x) => x.student_id === c.student_id)
                  .reduce((a, x) => a + Number(x.amount), 0)
                const statusColor = !tgt ? '#9FBBDE' : totalForStudentInPeriod >= tgt ? '#0C9B5E' : '#d97706'
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#EAF4FB]/30 dark:hover:bg-[#0d2a40]/30 transition-colors"
                  >
                    <div className="size-9 rounded-full bg-[#EAF4FB] dark:bg-[#1176BC]/20 text-[#1176BC] font-bold text-xs flex items-center justify-center shrink-0">
                      {c.profiles?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8] truncate">
                          {c.profiles?.name}
                        </p>
                        <span className="text-[10px] font-mono text-[#9FBBDE]">#{c.profiles?.student_id}</span>
                      </div>
                      <p className="text-xs text-[#9FBBDE]">
                        {formatDate(c.date)}
                        {tgt
                          ? ` · Period Total: ${formatCurrency(totalForStudentInPeriod)} / ${formatCurrency(tgt)}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-base font-bold tabular-nums" style={{ color: statusColor }}>
                        +{formatCurrency(Number(c.amount))}
                      </span>
                      {!isFinanceManager && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg hover:bg-[#EAF4FB] dark:hover:bg-[#0d2a40] text-[#9FBBDE] hover:text-[#1176BC] transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => remove(c.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[#9FBBDE] hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Record / Edit Contribution Modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editingContribution ? t('contributions.edit') : t('contributions.record')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingContribution && (
            <div>
              <label className="text-xs font-semibold text-[#9FBBDE] block mb-1">Student</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9FBBDE]" />
                <input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search student name or ID…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#ECECEC] dark:border-[#1e3550] rounded-xl bg-white dark:bg-[#132033] text-[#1a2332] dark:text-[#e8f0f8] focus:outline-none focus:ring-2 focus:ring-[#25A8E0]/30"
                />
              </div>
              {studentSearch && (
                <div className="mt-1 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] overflow-hidden max-h-40 overflow-y-auto bg-white dark:bg-[#132033]">
                  {students
                    .filter(
                      (s) =>
                        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        s.student_id.toLowerCase().includes(studentSearch.toLowerCase())
                    )
                    .slice(0, 8)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(s.id)
                          setStudentSearch(`${s.name} (${s.student_id})`)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-[#EAF4FB] dark:hover:bg-[#0d2a40] transition-colors ${
                          selectedStudent === s.id
                            ? 'bg-[#EAF4FB] dark:bg-[#0d2a40] text-[#1176BC]'
                            : 'text-[#1a2332] dark:text-[#e8f0f8]'
                        }`}
                      >
                        {s.name} <span className="text-[#9FBBDE] text-xs">#{s.student_id}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
          <Input
            id="amount"
            label="Amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter contribution amount"
            required
          />
          <Input
            id="date"
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingContribution ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Set Individual Student Target Modal */}
      <Modal
        open={showTargetModal}
        onClose={() => setShowTargetModal(false)}
        title="Set Student Contribution Target"
      >
        <form onSubmit={handleTargetSave} className="space-y-4">
          {!targetStudentId && (
            <div>
              <label className="text-xs font-semibold text-[#9FBBDE] block mb-1">Select Student</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9FBBDE]" />
                <input
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  placeholder="Search student…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#ECECEC] dark:border-[#1e3550] rounded-xl bg-white dark:bg-[#132033] text-[#1a2332] dark:text-[#e8f0f8] focus:outline-none focus:ring-2 focus:ring-[#25A8E0]/30"
                />
              </div>
              {targetSearch && (
                <div className="mt-1 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] overflow-hidden max-h-40 overflow-y-auto bg-white dark:bg-[#132033]">
                  {students
                    .filter(
                      (s) =>
                        s.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
                        s.student_id.toLowerCase().includes(targetSearch.toLowerCase())
                    )
                    .slice(0, 8)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setTargetStudentId(s.id)
                          setTargetStudentName(s.name)
                          setTargetSearch(s.name)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#EAF4FB] dark:hover:bg-[#0d2a40] text-[#1a2332] dark:text-[#e8f0f8] transition-colors"
                      >
                        {s.name} <span className="text-[#9FBBDE] text-xs">#{s.student_id}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
          {targetStudentId && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EAF4FB] dark:bg-[#0d2a40] border border-[#9FBBDE]/30">
              <div className="size-7 rounded-full bg-[#1176BC] text-white text-xs font-bold flex items-center justify-center">
                {targetStudentName?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-[#1176BC]">{targetStudentName}</span>
              <button
                type="button"
                onClick={() => {
                  setTargetStudentId('')
                  setTargetStudentName('')
                  setTargetSearch('')
                }}
                className="ml-auto text-xs text-[#9FBBDE] hover:text-red-500 cursor-pointer"
              >
                Change
              </button>
            </div>
          )}
          <Input
            id="targetAmount"
            label="Target Amount"
            type="number"
            step="0.01"
            min="0"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="e.g. 5000"
            required
          />
          <div>
            <label className="text-xs font-semibold text-[#9FBBDE] block mb-1">Note (optional)</label>
            <input
              value={targetNote}
              onChange={(e) => setTargetNote(e.target.value)}
              placeholder="e.g. Special arrangement"
              className="w-full border border-[#ECECEC] dark:border-[#1e3550] rounded-xl px-3 py-2 text-sm text-[#1a2332] dark:text-[#e8f0f8] bg-transparent focus:outline-none focus:ring-2 focus:ring-[#25A8E0]/30"
            />
          </div>
          {targetError && <p className="text-xs text-red-500">{targetError}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowTargetModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={targetSubmitting}>
              Save Target
            </Button>
          </div>
        </form>
      </Modal>

      {/* Clear All Confirm */}
      <Modal open={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="Clear All Contributions">
        <div className="space-y-4">
          <p className="text-sm text-[#4a5a72] dark:text-[#9FBBDE]">
            This will permanently delete all contribution records for this class. Type{' '}
            <strong className="text-red-500">DELETE</strong> to confirm.
          </p>
          <Input
            id="clearConfirm"
            label=""
            value={clearText}
            onChange={(e) => setClearText(e.target.value)}
            placeholder="Type DELETE to confirm"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={clearing}
              onClick={handleClearAll}
              disabled={clearText !== 'DELETE'}
            >
              Clear All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
