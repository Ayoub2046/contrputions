/**
 * Hook: Student contribution breakdown by week / month / year.
 * Also fetches the class expenses so the student can see
 * where the money goes.
 *
 * All values are derived on-the-fly from raw DB rows — no stored
 * computed totals, in line with the prd.md "never store computed
 * values" constraint.
 */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  getCurrentWeekCycle,
  getRecentWeekCycles,
} from '../../lib/weekCycle'

export interface ContributionRaw {
  id: string
  amount: number
  date: string // "YYYY-MM-DD"
}

export interface ExpenseRaw {
  id: string
  description: string
  amount: number
  date: string
}

export interface WeekBreakdown {
  cycleId: string
  label: string
  shortLabel: string
  startDateStr: string
  endDateStr: string
  paid: number
  isCurrent: boolean
}

export interface MonthBreakdown {
  year: number
  month: number       // 1-12
  label: string       // "November 2026"
  paid: number
}

export interface YearBreakdown {
  year: number
  paid: number
}

export interface StudentBreakdownData {
  currentCycle: ReturnType<typeof getCurrentWeekCycle>
  nextCycleStart: string   // "Sat Dec 05" – the Saturday after current Friday cutoff
  daysUntilNextCycle: number
  weekBreakdowns: WeekBreakdown[]    // most-recent 12 weeks
  monthBreakdowns: MonthBreakdown[]  // rolling 12 months
  yearBreakdowns: YearBreakdown[]    // all years found in data
  classExpenses: ExpenseRaw[]
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export function useStudentContributionBreakdown(
  userId?: string | null,
  classId?: string | null,
) {
  const [contributions, setContributions] = useState<ContributionRaw[]>([])
  const [expenses, setExpenses] = useState<ExpenseRaw[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !classId) {
      setLoading(false)
      return
    }
    setLoading(true)

    Promise.all([
      supabase
        .from('contributions')
        .select('id, amount, date')
        .eq('student_id', userId)
        .eq('class_id', classId)
        .is('deleted_at', null)
        .order('date', { ascending: false }),
      supabase
        .from('expenses')
        .select('id, description, amount, date')
        .eq('class_id', classId)
        .order('date', { ascending: false }),
    ]).then(([contribRes, expenseRes]) => {
      setContributions((contribRes.data ?? []) as ContributionRaw[])
      setExpenses((expenseRes.data ?? []) as ExpenseRaw[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId, classId])

  const data = useMemo((): StudentBreakdownData | null => {
    if (loading) return null

    const currentCycle = getCurrentWeekCycle()

    // Next cycle starts the Saturday after the current Friday cutoff
    const nextSat = new Date(currentCycle.endDate)
    nextSat.setDate(nextSat.getDate() + 1)
    const nextCycleStart = nextSat.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    nextSat.setHours(0, 0, 0, 0)
    const daysUntilNextCycle = Math.max(
      0,
      Math.ceil((nextSat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    )

    // ── Weekly breakdown (last 12 weeks) ────────────────────────────
    const recentCycles = getRecentWeekCycles(12)
    const weekBreakdowns: WeekBreakdown[] = recentCycles.map((cycle) => {
      const paid = contributions
        .filter((c) => c.date >= cycle.startDateStr && c.date <= cycle.endDateStr)
        .reduce((s, c) => s + Number(c.amount), 0)
      return {
        cycleId: cycle.id,
        label: cycle.label,
        shortLabel: cycle.shortLabel,
        startDateStr: cycle.startDateStr,
        endDateStr: cycle.endDateStr,
        paid,
        isCurrent: cycle.isCurrent,
      }
    })

    // ── Monthly breakdown (rolling 12 months) ───────────────────────
    const monthBreakdowns: MonthBreakdown[] = []
    const curDate = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(curDate.getFullYear(), curDate.getMonth() - i, 1)
      const yr = d.getFullYear()
      const mo = d.getMonth() + 1
      const paid = contributions
        .filter((c) => {
          const cd = new Date(c.date)
          return cd.getFullYear() === yr && cd.getMonth() + 1 === mo
        })
        .reduce((s, c) => s + Number(c.amount), 0)
      monthBreakdowns.push({
        year: yr,
        month: mo,
        label: `${MONTH_NAMES[mo - 1]} ${yr}`,
        paid,
      })
    }

    // ── Yearly breakdown ────────────────────────────────────────────
    const yearMap: Record<number, number> = {}
    for (const c of contributions) {
      const yr = new Date(c.date).getFullYear()
      yearMap[yr] = (yearMap[yr] ?? 0) + Number(c.amount)
    }
    const yearBreakdowns: YearBreakdown[] = Object.entries(yearMap)
      .map(([yr, paid]) => ({ year: Number(yr), paid }))
      .sort((a, b) => b.year - a.year)

    return {
      currentCycle,
      nextCycleStart,
      daysUntilNextCycle,
      weekBreakdowns,
      monthBreakdowns,
      yearBreakdowns,
      classExpenses: expenses,
    }
  }, [contributions, expenses, loading])

  return { data, loading }
}
