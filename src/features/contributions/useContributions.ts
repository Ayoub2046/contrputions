import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { moveToRecycleBin, moveManyToRecycleBin } from '../recyclebin/recycleBinManager'
import { broadcastPushNotification, generateUUID } from '../notifications/notificationService'
import type { Contribution } from '../../lib/types'

export interface ContributionWithStudent extends Contribution {
  profiles: { student_id: string; name: string }
}

/** Resolve a non-null class_id from explicit/active selection or the student's profile. */
export async function resolveStudentClassId(
  studentId: string,
  preferredClassId?: string | null
): Promise<string | null> {
  if (preferredClassId) return preferredClassId
  if (!studentId) return null
  const { data } = await supabase
    .from('profiles')
    .select('class_id')
    .eq('id', studentId)
    .single()
  return (data as { class_id?: string | null } | null)?.class_id ?? null
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

  async function create(
    studentId: string,
    amount: number,
    date: string,
    overrideClassId?: string | null
  ) {
    const resolvedClassId = await resolveStudentClassId(studentId, overrideClassId ?? classId)
    if (!resolvedClassId) {
      return 'Cannot record contribution: please select a class or assign this student to a class first.'
    }

    const uid = (await supabase.auth.getUser()).data.user?.id
    const { error } = await supabase.from('contributions').insert({
      student_id: studentId,
      class_id: resolvedClassId,
      amount,
      date,
      recorded_by: uid,
    } as never)
    if (!error) {
      fetch()
      broadcastPushNotification({
        id: generateUUID(),
        title: '💰 Contribution Received',
        body: `A contribution of $${amount} was recorded.`,
        category: 'contribution',
        classId: resolvedClassId,
        url: '/contributions',
        createdAt: new Date().toISOString(),
      }).catch(() => {})
    }
    return error?.message ?? null
  }

  async function update(id: string, amount: number, date: string) {
    // Instant optimistic update
    const existing = contributions.find((c) => c.id === id)
    setContributions((prev) => prev.map((c) => (c.id === id ? { ...c, amount, date } : c)))
    const { error } = await supabase.from('contributions').update({ amount, date } as never).eq('id', id)
    if (!error) {
      fetch()
      broadcastPushNotification({
        id: generateUUID(),
        title: '💰 Contribution Updated',
        body: `${existing?.profiles?.name || 'Student'}'s contribution record was updated to $${amount}.`,
        category: 'contribution',
        classId: existing?.class_id ?? classId ?? null,
        url: '/contributions',
        createdAt: new Date().toISOString(),
      }).catch(() => {})
    }
    return error?.message ?? null
  }

  async function remove(id: string) {
    // Instant optimistic removal from UI
    let item = contributions.find((c) => c.id === id)
    if (!item) {
      const { data: fetched } = await supabase
        .from('contributions')
        .select('*, profiles!contributions_student_id_fkey(student_id, name)')
        .eq('id', id)
        .single()
      if (fetched) item = fetched as unknown as ContributionWithStudent
    }
    setContributions((prev) => prev.filter((c) => c.id !== id))

    if (item) {
      await moveToRecycleBin(
        'contribution',
        id,
        `${item.profiles?.name || 'Student'} ($${item.amount})`,
        { ...item },
        item.class_id,
      )
    }
    const { error } = await supabase.from('contributions').update({ deleted_at: new Date().toISOString() } as never).eq('id', id)
    fetch()
    return error?.message ?? null
  }

  async function clearAll(): Promise<string | null> {
    if (!classId) {
      return 'Please select a specific class before clearing contributions.'
    }
    // Archive all active contributions to recycle_bin before soft-deleting
    const { data: toArchive } = await supabase
      .from('contributions')
      .select('*, profiles!contributions_student_id_fkey(student_id, name)')
      .eq('class_id', classId)
      .is('deleted_at', null)

    if (Array.isArray(toArchive) && toArchive.length > 0) {
      await moveManyToRecycleBin(
        (toArchive as unknown as ContributionWithStudent[]).map((item) => ({
          item_type: 'contribution' as const,
          item_id: item.id,
          name: `${item.profiles?.name || 'Student'} ($${item.amount})`,
          details: { ...item },
          class_id: item.class_id ?? classId,
        }))
      )
    }

    const { error } = await supabase
      .from('contributions')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('class_id', classId)
      .is('deleted_at', null)
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

export function useContributionTotals(classId?: string | null, allowGlobal = false) {
  const [total, setTotal] = useState(0)
  const [studentTotals, setStudentTotals] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!classId && !allowGlobal) { setTotal(0); setStudentTotals({}); return }

    let query = supabase
      .from('contributions')
      .select('student_id, amount')
      .is('deleted_at', null)
    if (classId) query = query.eq('class_id', classId)

    query.then(({ data }) => {
        if (!data) return
        const t = data.reduce((sum, c) => sum + Number(c.amount), 0)
        setTotal(t)
        const byStudent: Record<string, number> = {}
        data.forEach((c) => {
          byStudent[c.student_id] = (byStudent[c.student_id] || 0) + Number(c.amount)
        })
        setStudentTotals(byStudent)
      })
  }, [classId, allowGlobal])

  return { total, studentTotals }
}
