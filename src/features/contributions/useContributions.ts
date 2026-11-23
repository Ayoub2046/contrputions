import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { moveToRecycleBin } from '../recyclebin/recycleBinManager'
import { broadcastPushNotification } from '../notifications/notificationService'
import type { Contribution } from '../../lib/types'

export interface ContributionWithStudent extends Contribution {
  profiles: { student_id: string; name: string }
}

export function useContributions(classId?: string | null) {
  const [contributions, setContributions] = useState<ContributionWithStudent[]>([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    let query = supabase
      .from('contributions')
      .select('*, profiles!contributions_student_id_fkey(student_id, name)')
      .order('date', { ascending: false })
      .is('deleted_at', null)
    if (classId) query = query.eq('class_id', classId)
    const { data } = await query
    if (data) setContributions(data as unknown as ContributionWithStudent[])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [classId])

  async function create(studentId: string, amount: number, date: string) {
    const uid = (await supabase.auth.getUser()).data.user?.id
    const { error } = await supabase.from('contributions').insert({
      student_id: studentId,
      class_id: classId,
      amount,
      date,
      recorded_by: uid,
    } as never)
    if (!error) {
      fetch()
      broadcastPushNotification({
        id: `contrib_${Date.now()}`,
        title: '💰 Contribution Received',
        body: `A contribution of $${amount} was recorded.`,
        category: 'contribution',
        classId: classId || null,
        createdAt: new Date().toISOString(),
      }).catch(() => {})
    }
    return error?.message ?? null
  }

  async function update(id: string, amount: number, date: string) {
    const { error } = await supabase.from('contributions').update({ amount, date } as never).eq('id', id)
    if (!error) fetch()
    return error?.message ?? null
  }

  async function remove(id: string) {
    const item = contributions.find((c) => c.id === id)
    if (item) {
      await moveToRecycleBin(
        'contribution',
        id,
        `${item.profiles?.name || 'Student'} ($${item.amount})`,
        { ...item },
        item.class_id
      )
    }
    const { error } = await supabase.from('contributions').update({ deleted_at: new Date().toISOString() } as never).eq('id', id)
    if (!error) fetch()
    return error?.message ?? null
  }

  async function clearAll(): Promise<string | null> {
    const { error } = await supabase.from('contributions').update({ deleted_at: new Date().toISOString() } as never).eq('class_id', classId).is('deleted_at', null)
    if (!error) fetch()
    return error?.message ?? null
  }

  async function fetchDeleted(): Promise<ContributionWithStudent[]> {
    let query = supabase
      .from('contributions')
      .select('*, profiles!contributions_student_id_fkey(student_id, name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    if (classId) query = query.eq('class_id', classId)
    const { data } = await query
    return (data as unknown as ContributionWithStudent[]) ?? []
  }

  async function restore(id: string): Promise<string | null> {
    const { error } = await supabase.from('contributions').update({ deleted_at: null } as never).eq('id', id)
    if (!error) fetch()
    return error?.message ?? null
  }

  async function permanentDelete(id: string): Promise<string | null> {
    const { error } = await supabase.from('contributions').delete().eq('id', id)
    return error?.message ?? null
  }

  return { contributions, loading, create, update, remove, clearAll, fetchDeleted, restore, permanentDelete, refetch: fetch }
}

export function useContributionTotals(classId?: string | null) {
  const [total, setTotal] = useState(0)
  const [studentTotals, setStudentTotals] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!classId) { setTotal(0); setStudentTotals({}); return }

    supabase
      .from('contributions')
      .select('student_id, amount')
      .eq('class_id', classId)
      .is('deleted_at', null)
      .then(({ data }) => {
        if (!data) return
        const t = data.reduce((sum, c) => sum + Number(c.amount), 0)
        setTotal(t)
        const byStudent: Record<string, number> = {}
        data.forEach((c) => {
          byStudent[c.student_id] = (byStudent[c.student_id] || 0) + Number(c.amount)
        })
        setStudentTotals(byStudent)
      })
  }, [classId])

  return { total, studentTotals }
}
