import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface ContributionRow {
  id: string
  amount: number
  date: string
}

interface StudentDashboardData {
  personalTotal: number
  classTotal: number
  expenseTotal: number
  remainingBalance: number
  target: number
  status: 'paid' | 'partial' | 'unpaid'
  contributions: ContributionRow[]
}

export function useStudentDashboard(userId?: string | null, classId?: string | null) {
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!classId || !userId) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    let active = true

    // Maximum 5-second wait before clearing the loading spinner on mobile
    const timeout = setTimeout(() => {
      if (active) setLoading(false)
    }, 5000)

    Promise.all([
      supabase
        .from('contributions')
        .select('id, amount, date')
        .eq('student_id', userId)
        .eq('class_id', classId)
        .is('deleted_at', null)
        .order('date', { ascending: false }),
      supabase
        .rpc('get_student_payment_status', { p_class_id: classId })
        .then((res) => res, () => ({ data: [] })),
      supabase
        .from('expenses')
        .select('amount')
        .eq('class_id', classId),
      supabase
        .from('classes')
        .select('contribution_target')
        .eq('id', classId)
        .single(),
    ])
      .then(([myContribRes, statusRes, expenseRes, classRes]) => {
        if (!active) return
        clearTimeout(timeout)

        const contributions = (myContribRes?.data ?? []) as ContributionRow[]
        const studentStatuses = (statusRes?.data ?? []) as { student_id: string; total: number }[]
        const expenses = (expenseRes?.data ?? []) as { amount: number }[]
        const classData = classRes?.data as { contribution_target: number } | null

        const personalTotal = contributions.reduce((s: number, c) => s + Number(c.amount), 0)
        const classTotal = studentStatuses.reduce((s: number, st) => s + Number(st.total), 0)
        const expenseTotal = expenses.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0)
        const target = classData?.contribution_target ?? 0
        const status = personalTotal >= target ? 'paid' : personalTotal > 0 ? 'partial' : 'unpaid'

        setData({
          personalTotal,
          classTotal,
          expenseTotal,
          remainingBalance: classTotal - expenseTotal,
          target,
          status,
          contributions,
        })
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error in useStudentDashboard:', err)
        if (active) {
          clearTimeout(timeout)
          setLoading(false)
        }
      })

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [userId, classId])

  return { data, loading }
}
