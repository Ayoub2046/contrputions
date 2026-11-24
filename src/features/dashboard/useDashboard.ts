import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface TopStudentContributor {
  id: string
  student_id: string
  name: string
  class_name: string
  total_paid: number
  target: number
}

export interface ClassContributionStat {
  class_id: string
  class_name: string
  total_income: number
  student_count: number
  target: number
}

export interface StudentPaymentSummary {
  id: string
  student_id: string
  name: string
  class_name: string
  total_paid: number
  target: number
  status: 'paid' | 'partial' | 'unpaid'
}

export interface DashboardData {
  totalContributions: number
  totalExpenses: number
  remainingBalance: number
  totalStudents: number
  paidCount: number
  partialCount: number
  unpaidCount: number
  topStudents: TopStudentContributor[]
  topClasses: ClassContributionStat[]
  studentsStatusList: StudentPaymentSummary[]
}

export function useDashboard(classId?: string | null) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let active = true

    const timeout = setTimeout(() => {
      if (active) setLoading(false)
    }, 6000)

    async function loadData() {
      try {
        // 1. Fetch classes
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name, contribution_target')
          .order('name')
        const classes = classesData || []
        const classMap = new Map(classes.map((c) => [c.id, c]))

        // 2. Fetch contributions
        let contribQuery = supabase
          .from('contributions')
          .select('id, student_id, class_id, amount, profiles!contributions_student_id_fkey(name, student_id, class_id)')
          .is('deleted_at', null)
        if (classId) contribQuery = contribQuery.eq('class_id', classId)
        const { data: contribsData } = await contribQuery
        const contributions = contribsData || []

        // 3. Fetch expenses
        let expenseQuery = supabase.from('expenses').select('amount, class_id')
        if (classId) expenseQuery = expenseQuery.eq('class_id', classId)
        const { data: expensesData } = await expenseQuery
        const expenses = expensesData || []

        // 4. Fetch students
        let studentQuery = supabase
          .from('profiles')
          .select('id, student_id, name, class_id')
          .eq('role', 'student')
        if (classId) studentQuery = studentQuery.eq('class_id', classId)
        const { data: studentsData } = await studentQuery
        const students = studentsData || []

        // 5. Fetch custom targets
        let targetQuery = supabase
          .from('student_contribution_targets')
          .select('student_id, class_id, target_amount')
        if (classId) targetQuery = targetQuery.eq('class_id', classId)
        const { data: targetsData } = await targetQuery
        const customTargets = new Map((targetsData || []).map((t: any) => [t.student_id, Number(t.target_amount)]))

        // Calculations
        const totalContributions = contributions.reduce((s, c) => s + Number(c.amount || 0), 0)
        const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
        const remainingBalance = totalContributions - totalExpenses

        // Student total paid map
        const studentPaidMap = new Map<string, number>()
        for (const c of contributions) {
          studentPaidMap.set(c.student_id, (studentPaidMap.get(c.student_id) || 0) + Number(c.amount || 0))
        }

        // Status counts & full student status list
        let paidCount = 0
        let partialCount = 0
        let unpaidCount = 0
        const studentsStatusList: StudentPaymentSummary[] = []

        for (const st of students) {
          const paid = studentPaidMap.get(st.id) || 0
          const cls = classMap.get(st.class_id || '')
          const target = customTargets.get(st.id) ?? (cls?.contribution_target ? Number(cls.contribution_target) : 0)

          let status: 'paid' | 'partial' | 'unpaid' = 'unpaid'
          if ((target > 0 && paid >= target) || (target === 0 && paid > 0)) {
            paidCount++
            status = 'paid'
          } else if (paid > 0) {
            partialCount++
            status = 'partial'
          } else {
            unpaidCount++
            status = 'unpaid'
          }

          studentsStatusList.push({
            id: st.id,
            student_id: st.student_id,
            name: st.name,
            class_name: cls?.name || 'Class',
            total_paid: paid,
            target,
            status,
          })
        }
        studentsStatusList.sort((a, b) => a.name.localeCompare(b.name))

        // Top contributing students
        const topStudentsList: TopStudentContributor[] = []
        for (const st of students) {
          const paid = studentPaidMap.get(st.id) || 0
          if (paid > 0) {
            const cls = classMap.get(st.class_id || '')
            const target = customTargets.get(st.id) ?? (cls?.contribution_target ? Number(cls.contribution_target) : 0)
            topStudentsList.push({
              id: st.id,
              student_id: st.student_id,
              name: st.name,
              class_name: cls?.name || 'Class',
              total_paid: paid,
              target,
            })
          }
        }
        topStudentsList.sort((a, b) => b.total_paid - a.total_paid)
        const topStudents = topStudentsList.slice(0, 8)

        // Class contribution stats
        const classIncomeMap = new Map<string, number>()
        for (const c of contributions) {
          if (c.class_id) {
            classIncomeMap.set(c.class_id, (classIncomeMap.get(c.class_id) || 0) + Number(c.amount || 0))
          }
        }
        const classStudentCountMap = new Map<string, number>()
        for (const st of students) {
          if (st.class_id) {
            classStudentCountMap.set(st.class_id, (classStudentCountMap.get(st.class_id) || 0) + 1)
          }
        }

        const topClassesList: ClassContributionStat[] = classes
          .filter((c) => !classId || c.id === classId)
          .map((c) => ({
            class_id: c.id,
            class_name: c.name,
            total_income: classIncomeMap.get(c.id) || 0,
            student_count: classStudentCountMap.get(c.id) || 0,
            target: Number(c.contribution_target || 0),
          }))
        topClassesList.sort((a, b) => b.total_income - a.total_income)

        if (active) {
          setData({
            totalContributions,
            totalExpenses,
            remainingBalance,
            totalStudents: students.length,
            paidCount,
            partialCount,
            unpaidCount,
            topStudents,
            topClasses: topClassesList,
            studentsStatusList,
          })
          setLoading(false)
        }
      } catch (err) {
        console.error('useDashboard load error:', err)
        if (active) setLoading(false)
      } finally {
        clearTimeout(timeout)
      }
    }

    loadData()

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [classId])

  return { data, loading }
}
