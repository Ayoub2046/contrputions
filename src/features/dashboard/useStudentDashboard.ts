import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface ContributionRow {
  id: string
  amount: number
  date: string
}

export interface StudentDashboardData {
  personalTotal: number
  classTotal: number
  expenseTotal: number
  remainingBalance: number
  target: number
  status: 'paid' | 'partial' | 'unpaid'
  contributions: ContributionRow[]
  className: string
  totalStudents: number
  totalPaidStudents: number
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
        .select('name, contribution_target')
        .eq('id', classId)
        .single(),
      supabase
        .from('student_contribution_targets')
        .select('target_amount')
        .eq('student_id', userId)
        .eq('class_id', classId)
        .maybeSingle(),
    ])
      .then(([myContribRes, statusRes, expenseRes, classRes, customTargetRes]) => {
        if (!active) return
        clearTimeout(timeout)

        const contributions = (myContribRes?.data ?? []) as ContributionRow[]
        const studentStatuses = (statusRes?.data ?? []) as { student_id: string; total: number }[]
        const expenses = (expenseRes?.data ?? []) as { amount: number }[]
        const classData = classRes?.data as { name: string; contribution_target: number } | null
        const customTarget = (customTargetRes?.data as any)?.target_amount

        // Use custom per-student target if assigned, otherwise fallback to class default
        const target = customTarget != null ? Number(customTarget) : (classData?.contribution_target ?? 0)
        const personalTotal = contributions.reduce((s: number, c) => s + Number(c.amount), 0)
        const classTotal = studentStatuses.reduce((s: number, st) => s + Number(st.total), 0)
        const expenseTotal = expenses.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0)
        const status = target > 0 && personalTotal >= target ? 'paid' : personalTotal > 0 ? 'partial' : 'unpaid'
        const totalStudents = studentStatuses.length
        const totalPaidStudents = studentStatuses.filter((st) => target > 0 && Number(st.total) >= target).length

        setData({
          personalTotal,
          classTotal,
          expenseTotal,
          remainingBalance: classTotal - expenseTotal,
          target,
          status,
          contributions,
          className: classData?.name || 'Class',
          totalStudents,
          totalPaidStudents,
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
