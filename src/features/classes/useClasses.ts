import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { moveToRecycleBin } from '../recyclebin/recycleBinManager'
import type { Class, Profile } from '../../lib/types'

export interface ClassWithMetrics extends Class {
  student_count: number
  total_income: number
  total_expenses: number
}

export function useClasses() {
  const [classes, setClasses] = useState<ClassWithMetrics[]>([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    const [classesRes, studentsRes, contribsRes, expensesRes] = await Promise.all([
      supabase.from('classes').select('*').order('name'),
      supabase.from('profiles').select('class_id').eq('role', 'student'),
      supabase.from('contributions').select('class_id, amount').is('deleted_at', null),
      supabase.from('expenses').select('class_id, amount'),
    ])

    const rawClasses = (classesRes.data ?? []) as Class[]
    const students = studentsRes.data ?? []
    const contribs = contribsRes.data ?? []
    const expenses = expensesRes.data ?? []

    const studentCountMap: Record<string, number> = {}
    for (const s of students) {
      if (s.class_id) {
        studentCountMap[s.class_id] = (studentCountMap[s.class_id] || 0) + 1
      }
    }

    const incomeMap: Record<string, number> = {}
    for (const c of contribs) {
      if (c.class_id) {
        incomeMap[c.class_id] = (incomeMap[c.class_id] || 0) + Number(c.amount || 0)
      }
    }

    const expenseMap: Record<string, number> = {}
    for (const e of expenses) {
      if (e.class_id) {
        expenseMap[e.class_id] = (expenseMap[e.class_id] || 0) + Number(e.amount || 0)
      }
    }

    const enriched: ClassWithMetrics[] = rawClasses.map((c) => ({
      ...c,
      student_count: studentCountMap[c.id] || 0,
      total_income: incomeMap[c.id] || 0,
      total_expenses: expenseMap[c.id] || 0,
    }))

    setClasses(enriched)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  async function create(name: string, contribution_target = 0) {
    const { error } = await supabase.from('classes').insert({ name, contribution_target } as never)
    if (!error) fetch()
    return error?.message ?? null
  }

  async function update(id: string, name: string, contribution_target = 0) {
    const { error } = await supabase.from('classes').update({ name, contribution_target } as never).eq('id', id)
    if (!error) fetch()
    return error?.message ?? null
  }

  async function remove(id: string) {
    let targetClass: Class | undefined = classes.find((c) => c.id === id)
    if (!targetClass) {
      const { data: fetched } = await supabase.from('classes').select('*').eq('id', id).single()
      if (fetched) targetClass = fetched as Class
    }
    if (targetClass) {
      await moveToRecycleBin(
        'class',
        id,
        targetClass.name,
        {
          id: targetClass.id,
          name: targetClass.name,
          contribution_target: targetClass.contribution_target ?? 0,
        },
        null,
      )
    }
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (!error) fetch()
    return error?.message ?? null
  }

  return { classes, loading, create, update, remove, refetch: fetch }
}

export function useClassAdmins(classId: string | null) {
  const [admins, setAdmins] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!classId) { setAdmins([]); return }
    setLoading(true)
    supabase
      .from('class_admins')
      .select('admin_id, profiles!class_admins_admin_id_fkey(*)')
      .eq('class_id', classId)
      .then(({ data }) => {
        if (data) setAdmins(data.map((r: any) => r.profiles as Profile))
        setLoading(false)
      })
  }, [classId])

  return { admins, loading }
}

export function useAssignableAdmins(excludeIds: string[]) {
  const [admins, setAdmins] = useState<Profile[]>([])

  useEffect(() => {
    let query = supabase.from('profiles').select('*').eq('role', 'admin')
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
    }
    query.order('name').then(({ data }) => {
      if (data) setAdmins(data)
    })
  }, [excludeIds.join(',')])

  return { admins }
}
