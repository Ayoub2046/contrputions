import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface DashboardData {
  totalContributions: number
  totalExpenses: number
  remainingBalance: number
  totalStudents: number
  paidCount: number
  partialCount: number
  unpaidCount: number
}

export function useDashboard(classId?: string | null) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!classId) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    let active = true

    // Maximum 5-second wait before clearing loading state on mobile
    const timeout = setTimeout(() => {
      if (active) setLoading(false)
    }, 5000)

    Promise.all([
      supabase
        .from('contributions')
        .select('amount')
        .eq('class_id', classId)
        .is('deleted_at', null),
      supabase
        .from('expenses')
        .select('amount')
        .eq('class_id', classId),
      supabase
        .from('profiles')
        .select('id')
        .eq('class_id', classId)
        .eq('role', 'student'),
      supabase
        .rpc('get_student_payment_status', { p_class_id: classId })
        .then((res) => res, () => ({ data: [] })),
    ])
      .then(([contribRes, expenseRes, studentRes, statusRes]) => {
        if (!active) return
        clearTimeout(timeout)

        const contributions = (contribRes?.data ?? []) as { amount: number }[]
        const expenses = (expenseRes?.data ?? []) as { amount: number }[]
        const students = (studentRes?.data ?? []) as { id: string }[]

        const totalContributions = contributions.reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0)
        const totalExpenses = expenses.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0)
        const studentStatuses = (statusRes?.data ?? []) as { student_id: string; status: string; total: number }[]

        const paidCount = studentStatuses.filter((s) => s.status === 'paid').length
        const partialCount = studentStatuses.filter((s) => s.status === 'partial').length
        const unpaidCount = studentStatuses.filter((s) => s.status === 'unpaid').length

        setData({
          totalContributions,
          totalExpenses,
          remainingBalance: totalContributions - totalExpenses,
          totalStudents: students.length,
          paidCount,
          partialCount,
          unpaidCount,
        })
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error in useDashboard:', err)
        if (active) {
          clearTimeout(timeout)
          setLoading(false)
        }
      })

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [classId])

  return { data, loading }
}
