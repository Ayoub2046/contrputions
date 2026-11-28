import { useState } from 'react'
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  MessageCircle,
  Plus,
} from 'lucide-react'
import type { Profile } from '../../lib/types'
import type { ContributionWithStudent } from './useContributions'
import { formatCurrency } from '../../lib/utils'

interface StudentPaymentStatusTableProps {
  students: Profile[]
  contributions: ContributionWithStudent[]
  getTargetForStudent: (studentId: string) => number | null
  periodLabel: string
  periodType: 'weekly' | 'monthly' | 'yearly' | 'all'
  isFinanceManager?: boolean
  onQuickRecord?: (studentId: string, studentName: string, defaultAmount?: number, studentClassId?: string | null) => void
}

export function StudentPaymentStatusTable({
  students,
  contributions,
  getTargetForStudent,
  periodLabel,
  periodType,
  isFinanceManager,
  onQuickRecord,
}: StudentPaymentStatusTableProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all')
  const [search, setSearch] = useState('')

  // Compute student payment records for the period
  const studentRows = students.map((s) => {
    const target = getTargetForStudent(s.id) ?? 0
    const studentContribs = contributions.filter((c) => c.student_id === s.id)
    const totalPaid = studentContribs.reduce((sum, c) => sum + Number(c.amount), 0)
    const remaining = Math.max(0, target - totalPaid)

    let status: 'paid' | 'partial' | 'unpaid' = 'unpaid'
    if (target > 0) {
      if (totalPaid >= target) status = 'paid'
      else if (totalPaid > 0) status = 'partial'
      else status = 'unpaid'
    } else {
      // If no target set, any contribution means paid
      status = totalPaid > 0 ? 'paid' : 'unpaid'
    }

    return {
      student: s,
      target,
      totalPaid,
      remaining,
      status,
      lastPaymentDate: studentContribs[0]?.date || null,
    }
  })

  // Group metrics
  const totalTargetSum = studentRows.reduce((a, b) => a + b.target, 0)
  const totalPaidSum = studentRows.reduce((a, b) => a + b.totalPaid, 0)
  const totalRemainingSum = studentRows.reduce((a, b) => a + b.remaining, 0)
  const collectionRate = totalTargetSum > 0 ? Math.round((totalPaidSum / totalTargetSum) * 100) : 0

  const paidCount = studentRows.filter((r) => r.status === 'paid').length
  const partialCount = studentRows.filter((r) => r.status === 'partial').length
  const unpaidCount = studentRows.filter((r) => r.status === 'unpaid').length

  // Filtered rows
  const filteredRows = studentRows.filter((r) => {
    if (filterTab === 'paid' && r.status !== 'paid') return false
    if (filterTab === 'unpaid' && r.status !== 'unpaid') return false
    if (filterTab === 'partial' && r.status !== 'partial') return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = r.student.name.toLowerCase().includes(q)
      const matchId = r.student.student_id.toLowerCase().includes(q)
      const matchPhone = (r.student.phone || '').includes(q)
      if (!matchName && !matchId && !matchPhone) return false
    }

    return true
  })

  function getWhatsAppUrl(phone?: string, name?: string, status?: 'paid' | 'partial' | 'unpaid', remaining?: number) {
    if (!phone) return null
    const cleanPhone = phone.replace(/[^0-9+]/g, '')
    if (!cleanPhone) return null

    let text = ''
    if (status === 'paid') {
      text = `As-salaamu alaykum ${name || 'Student'},\n\nThis is a confirmation from your Class Treasurer. Congratulations! You have successfully paid your class contribution for (${periodLabel}).\n\nThank you for your timely contribution! Please prepare for the upcoming cycle.\n\nMahadsanid!`
    } else {
      text = `As-salaamu alaykum ${name || 'Student'},\n\nThis is a friendly reminder from your Class Treasurer regarding your contribution for (${periodLabel}).\n\nRemaining Due: $${Number(remaining || 0).toFixed(2)}\n\nPlease complete your contribution before the collection cycle closes. Thank you!\n\nMahadsanid!`
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
  }

  return (
    <div className="space-y-4">
      {/* KPI Overview for this Period */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-3.5">
          <span className="text-[11px] font-medium text-[#9FBBDE] block">Target in Period</span>
          <span className="text-base font-bold text-[#1a2332] dark:text-[#e8f0f8]">
            {formatCurrency(totalTargetSum)}
          </span>
        </div>

        <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-3.5">
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">
            Collected in Period
          </span>
          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalPaidSum)} ({collectionRate}%)
          </span>
        </div>

        <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-3.5">
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block">
            Pending / Outstanding
          </span>
          <span className="text-base font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(totalRemainingSum)}
          </span>
        </div>

        <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-3.5">
          <span className="text-[11px] font-medium text-[#9FBBDE] block">Payment Clearance</span>
          <span className="text-base font-bold text-[#1176BC] dark:text-[#25A8E0]">
            {paidCount} of {students.length} Cleared
          </span>
        </div>
      </div>

      {/* Filter Tabs + Search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterTab === 'all'
                ? 'bg-[#1176BC] text-white shadow-xs'
                : 'bg-white dark:bg-[#132033] border border-[#ECECEC] dark:border-[#1e3550] text-[#4a5a72] dark:text-[#9FBBDE] hover:text-[#1176BC]'
            }`}
          >
            All Students ({students.length})
          </button>

          <button
            onClick={() => setFilterTab('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              filterTab === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#132033] border border-[#ECECEC] dark:border-[#1e3550] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
            }`}
          >
            <CheckCircle2 size={13} />
            Paid ({paidCount})
          </button>

          <button
            onClick={() => setFilterTab('unpaid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              filterTab === 'unpaid'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#132033] border border-[#ECECEC] dark:border-[#1e3550] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
            }`}
          >
            <AlertTriangle size={13} />
            Unpaid ({unpaidCount})
          </button>

          {partialCount > 0 && (
            <button
              onClick={() => setFilterTab('partial')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterTab === 'partial'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#132033] border border-[#ECECEC] dark:border-[#1e3550] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20'
              }`}
            >
              <Clock size={13} />
              Partial ({partialCount})
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9FBBDE]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or ID…"
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#ECECEC] dark:border-[#1e3550] rounded-xl bg-white dark:bg-[#132033] text-[#1a2332] dark:text-[#e8f0f8] focus:outline-none focus:ring-2 focus:ring-[#25A8E0]/30"
          />
        </div>
      </div>

      {/* Students List */}
      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#9FBBDE]/40 bg-white dark:bg-[#132033] py-12 text-center text-[#9FBBDE] text-xs">
          No students match the selected filter.
        </div>
      ) : (
        <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] overflow-hidden divide-y divide-[#ECECEC] dark:divide-[#1e3550]">
          {filteredRows.map((row) => {
            const { student, target, totalPaid, remaining, status } = row
            const waUrl = getWhatsAppUrl(student.phone, student.name, status, remaining)

            return (
              <div
                key={student.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 hover:bg-[#EAF4FB]/30 dark:hover:bg-[#0d2a40]/30 transition-colors"
              >
                {/* Student Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`size-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      status === 'paid'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : status === 'partial'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                    }`}
                  >
                    {student.name[0]?.toUpperCase() || '?'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#1a2332] dark:text-[#e8f0f8] truncate">
                        {student.name}
                      </p>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[#9FBBDE]">
                        #{student.student_id}
                      </span>
                    </div>
                    {student.phone ? (
                      <span className="text-[11px] text-[#9FBBDE] flex items-center gap-1 mt-0.5">
                        <Phone size={10} className="opacity-70" /> {student.phone}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#9FBBDE] italic mt-0.5 block">
                        No phone provided
                      </span>
                    )}
                  </div>
                </div>

                {/* Financial Status & Amounts */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-[#9FBBDE] uppercase font-bold block">
                      Paid in {periodType}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        status === 'paid'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : status === 'partial'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatCurrency(totalPaid)}
                    </span>
                    {target > 0 && (
                      <span className="text-[10px] text-[#9FBBDE] block">
                        Target: {formatCurrency(target)}
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div>
                    {status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 size={12} />
                        Cleared
                      </span>
                    ) : status === 'partial' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <Clock size={12} />
                        Due {formatCurrency(remaining)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                        <AlertTriangle size={12} />
                        {target > 0 ? `Unpaid (${formatCurrency(target)})` : 'Unpaid'}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* WhatsApp Action */}
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-xs font-medium cursor-pointer ${
                          status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                        }`}
                        title={status === 'paid' ? 'Send Congratulations via WhatsApp' : 'Send Reminder via WhatsApp'}
                      >
                        <MessageCircle size={13} />
                        <span className="hidden md:inline">
                          {status === 'paid' ? 'Congratulate' : 'Remind'}
                        </span>
                      </a>
                    )}

                    {/* Quick Record for Admins */}
                    {!isFinanceManager && onQuickRecord && (
                      <button
                        onClick={() => onQuickRecord(student.id, student.name, remaining > 0 ? remaining : target || undefined, student.class_id)}
                        className="p-1.5 rounded-lg border border-[#1176BC]/30 bg-[#1176BC]/10 text-[#1176BC] hover:bg-[#1176BC] hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1"
                        title="Record Payment for this Student"
                      >
                        <Plus size={13} />
                        <span className="hidden md:inline">Pay</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
