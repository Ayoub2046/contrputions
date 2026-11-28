/**
 * StudentContributionBreakdown
 *
 * Shows students:
 *  1. Current week cycle (Sat → Fri) with a progress bar and next-cycle countdown
 *  2. Weekly breakdown table (last 12 weeks) with filter tabs
 *  3. Monthly breakdown table (rolling 12 months)
 *  4. Yearly breakdown
 *  5. Class expenses transparency (what money was spent on)
 */
import { useState } from 'react'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Card, CardContent } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { useStudentContributionBreakdown } from './useStudentContributionBreakdown'
import {
  Calendar,
  CalendarDays,
  TrendingUp,
  Receipt,
  ChevronDown,
  ChevronRight,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react'

interface Props {
  userId: string
  classId: string | null
}

type PeriodTab = 'weekly' | 'monthly' | 'yearly'

const DAY_STEPS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export function StudentContributionBreakdown({ userId, classId }: Props) {
  const { data, loading } = useStudentContributionBreakdown(userId, classId)
  const [tab, setTab] = useState<PeriodTab>('weekly')
  const [showExpenses, setShowExpenses] = useState(false)

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48 rounded-lg" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (!data) return null

  const { currentCycle, nextCycleStart, daysUntilNextCycle, weekBreakdowns, monthBreakdowns, yearBreakdowns, classExpenses } = data

  // ── 7-step progress inside current cycle ──────────────────────────
  const isFriday = currentCycle.isFriday

  // ── Paid in current week (from weekBreakdowns[0]) ─────────────────
  const thisWeekPaid = weekBreakdowns[0]?.paid ?? 0

  return (
    <div className="space-y-5">

      {/* ── A. CURRENT CYCLE BANNER ───────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="size-6 rounded-full bg-[#1176BC]/15 dark:bg-[#25A8E0]/20 flex items-center justify-center">
            <Calendar size={14} className="text-[#1176BC] dark:text-[#25A8E0]" />
          </div>
          <h2 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">Current Weekly Cycle</h2>
          {isFriday && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-500/30 animate-pulse">
              🔔 Cutoff Day
            </span>
          )}
        </div>

        <Card className="rounded-2xl overflow-hidden border-[#9FBBDE]/60 dark:border-[#203854] bg-gradient-to-br from-[#FFFFFF] via-[#EAF4FB]/60 to-[#FFFFFF] dark:from-[#102033] dark:via-[#172D47] dark:to-[#102033]">
          <CardContent className="p-5 space-y-4">
            {/* Cycle label */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#52677D] dark:text-[#9FBBDE] uppercase tracking-wider mb-0.5">
                  Active Cycle
                </p>
                <p className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">{currentCycle.label}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-[#52677D] dark:text-[#9FBBDE] uppercase tracking-wider mb-0.5">
                  Paid This Week
                </p>
                <p
                  className={`text-lg font-bold font-serif tabular-nums ${
                    thisWeekPaid > 0
                      ? 'text-[#0C9B5E] dark:text-[#22C55E]'
                      : 'text-[#52677D] dark:text-[#C6CACB]'
                  }`}
                >
                  {thisWeekPaid > 0 ? formatCurrency(thisWeekPaid) : '—'}
                </p>
              </div>
            </div>

            {/* 7-day step progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-[#52677D] dark:text-[#C6CACB] font-semibold">
                {DAY_STEPS.map((day, i) => (
                  <span
                    key={day}
                    className={`flex-1 text-center ${
                      i < currentCycle.dayIndex ? 'text-[#1176BC] dark:text-[#25A8E0] font-bold' : ''
                    } ${i === currentCycle.dayIndex - 1 ? 'underline underline-offset-2' : ''}`}
                  >
                    {day}
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                {DAY_STEPS.map((day, i) => (
                  <div
                    key={day}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      i < currentCycle.dayIndex
                        ? isFriday && i === 6
                          ? 'bg-rose-500'
                          : 'bg-gradient-to-r from-[#1176BC] to-[#25A8E0]'
                        : 'bg-[#ECECEC] dark:bg-[#203854]'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#52677D] dark:text-[#C6CACB] font-medium">
                <span>Starts Saturday</span>
                <span className="font-bold text-[#1176BC] dark:text-[#25A8E0]">
                  {currentCycle.daysRemaining === 0
                    ? 'Ends today (Friday)'
                    : `${currentCycle.daysRemaining} day${currentCycle.daysRemaining !== 1 ? 's' : ''} remaining`}
                </span>
              </div>
            </div>

            {/* Next cycle info */}
            <div
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${
                daysUntilNextCycle === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                  : 'bg-[#FFFFFF] dark:bg-[#0D1B2C] border-[#9FBBDE]/50 dark:border-[#203854] text-[#1176BC] dark:text-[#9FBBDE]'
              }`}
            >
              {daysUntilNextCycle === 0 ? (
                <Sparkles size={13} className="shrink-0" />
              ) : (
                <Clock size={13} className="shrink-0" />
              )}
              <span className="font-semibold">
                {daysUntilNextCycle === 0
                  ? `Next cycle begins today! (${nextCycleStart})`
                  : `Next cycle begins ${nextCycleStart} — in ${daysUntilNextCycle} day${daysUntilNextCycle !== 1 ? 's' : ''}`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── B. PERIOD FILTER TABS + BREAKDOWN ───────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <CalendarDays size={16} className="text-[#1176BC] dark:text-[#25A8E0]" />
          <h2 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">My Contribution History</h2>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-[#ECECEC] dark:bg-[#0D1B2C] rounded-xl border border-[#C6CACB]/40 dark:border-[#203854]">
          {(['weekly', 'monthly', 'yearly'] as PeriodTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer touch-manipulation ${
                tab === t
                  ? 'bg-[#FFFFFF] dark:bg-[#172D47] text-[#1176BC] dark:text-[#FFFFFF] shadow-sm'
                  : 'text-[#52677D] dark:text-[#C6CACB] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Weekly */}
        {tab === 'weekly' && (
          <Card className="rounded-2xl overflow-hidden">
            <CardContent className="p-0 divide-y divide-border/40">
              {weekBreakdowns.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#52677D] dark:text-[#C6CACB]">No contribution records yet.</div>
              ) : (
                weekBreakdowns.map((w) => (
                  <div
                    key={w.cycleId}
                    className={`flex items-center justify-between gap-3 px-4 py-3 ${
                      w.isCurrent ? 'bg-[#EAF4FB]/60 dark:bg-[#172D47]' : 'hover:bg-[#ECECEC]/30 dark:hover:bg-[#172D47]/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-[#0B1A2B] dark:text-[#FFFFFF] truncate">{w.shortLabel}</span>
                        {w.isCurrent && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#1176BC] bg-[#9FBBDE]/30 dark:bg-[#1176BC]/40 px-1.5 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#52677D] dark:text-[#C6CACB]">Sat → Fri</span>
                    </div>
                    <span className={`text-sm font-bold font-serif tabular-nums shrink-0 ${
                      w.paid > 0 ? 'text-[#0C9B5E] dark:text-[#22C55E]' : 'text-[#52677D] dark:text-[#C6CACB]'
                    }`}>
                      {w.paid > 0 ? `+${formatCurrency(w.paid)}` : '—'}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Monthly */}
        {tab === 'monthly' && (
          <Card className="rounded-2xl overflow-hidden">
            <CardContent className="p-0 divide-y divide-border/40">
              {monthBreakdowns.every(m => m.paid === 0) ? (
                <div className="py-10 text-center text-xs text-[#52677D] dark:text-[#C6CACB]">No contribution records yet.</div>
              ) : (
                monthBreakdowns
                  .filter((m, i) => m.paid > 0 || i === 0)
                  .map((m) => (
                    <div
                      key={`${m.year}-${m.month}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#ECECEC]/30 dark:hover:bg-[#172D47]/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-[#0B1A2B] dark:text-[#FFFFFF]">{m.label}</span>
                      </div>
                      <span className={`text-sm font-bold font-serif tabular-nums shrink-0 ${
                        m.paid > 0 ? 'text-[#0C9B5E] dark:text-[#22C55E]' : 'text-[#52677D] dark:text-[#C6CACB]'
                      }`}>
                        {m.paid > 0 ? `+${formatCurrency(m.paid)}` : '—'}
                      </span>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Yearly */}
        {tab === 'yearly' && (
          <Card className="rounded-2xl overflow-hidden">
            <CardContent className="p-0 divide-y divide-border/40">
              {yearBreakdowns.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#52677D] dark:text-[#C6CACB]">No contribution records yet.</div>
              ) : (
                yearBreakdowns.map((y) => (
                  <div
                    key={y.year}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[#ECECEC]/30 dark:hover:bg-[#172D47]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-[#1176BC]/10 flex items-center justify-center shrink-0">
                        <TrendingUp size={15} className="text-[#1176BC] dark:text-[#25A8E0]" />
                      </div>
                      <span className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">{y.year}</span>
                    </div>
                    <span className="text-base font-bold font-serif tabular-nums text-[#0C9B5E] dark:text-[#22C55E]">
                      +{formatCurrency(y.paid)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── C. CLASS EXPENSES TRANSPARENCY ───────────────────────────── */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowExpenses((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-1 cursor-pointer touch-manipulation group"
        >
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">Where Expenses Go</h2>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              classExpenses.length > 0
                ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-500/20'
                : 'text-[#52677D] dark:text-[#C6CACB] bg-[#ECECEC] dark:bg-[#172D47] border-[#C6CACB]/40 dark:border-[#203854]'
            }`}>
              {classExpenses.length} record{classExpenses.length !== 1 ? 's' : ''}
            </span>
          </div>
          {showExpenses
            ? <ChevronDown size={16} className="text-[#52677D] dark:text-[#C6CACB] group-hover:text-[#0B1A2B] dark:group-hover:text-[#FFFFFF] transition-colors" />
            : <ChevronRight size={16} className="text-[#52677D] dark:text-[#C6CACB] group-hover:text-[#0B1A2B] dark:group-hover:text-[#FFFFFF] transition-colors" />
          }
        </button>

        {showExpenses && (
          <>
            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
              <Info size={13} className="shrink-0 mt-0.5 text-amber-600" />
              <span>
                All class expenses are recorded by your class admin and finance manager.
                Every amount shown here comes directly from the audited class ledger — nothing is hidden.
              </span>
            </div>

            {classExpenses.length === 0 ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-10 text-center space-y-1 text-[#52677D] dark:text-[#C6CACB]">
                  <Receipt size={28} className="mx-auto opacity-30" />
                  <p className="text-xs font-medium text-[#0B1A2B] dark:text-[#FFFFFF]">No expenses recorded yet</p>
                  <p className="text-xs max-w-xs mx-auto">
                    When your class spends money (materials, handouts, events), each expense will appear here with a full description.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="p-0 divide-y divide-[#ECECEC] dark:divide-[#203854]/60">
                  {classExpenses.map((e, i) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#ECECEC]/30 dark:hover:bg-[#172D47]/40 transition-colors"
                    >
                      <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">
                        #{classExpenses.length - i}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0B1A2B] dark:text-[#FFFFFF] truncate">{e.description}</p>
                        <p className="text-[10px] text-[#52677D] dark:text-[#C6CACB]">{formatDate(e.date)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums font-serif">
                          -{formatCurrency(Number(e.amount))}
                        </span>
                        <span className="block text-[9px] text-[#52677D] dark:text-[#C6CACB] font-medium">Expense</span>
                      </div>
                    </div>
                  ))}
                </CardContent>

                {/* Total */}
                <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200/40 dark:border-amber-800/30 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#52677D] dark:text-[#C6CACB] uppercase tracking-wider">Total Class Expenses</span>
                  <span className="text-base font-bold font-serif tabular-nums text-rose-600 dark:text-rose-400">
                    -{formatCurrency(classExpenses.reduce((s, e) => s + Number(e.amount), 0))}
                  </span>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
