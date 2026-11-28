import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { resolveStudentClassId } from './useContributions'
import { dispatchWebPushApi, generateUUID } from '../notifications/notificationService'

export interface StudentTarget {
  id: string
  student_id: string
  class_id: string
  target_amount: number
  set_by: string | null
  note: string | null
  updated_at: string
}

/** Fetch student targets for a specific class or across all classes when classId is omitted. */
export function useStudentTargets(classId?: string | null) {
  const [targets, setTargets] = useState<StudentTarget[]>([])
  const [loading, setLoading] = useState(false)

  async function fetchTargets() {
    setLoading(true)
    let query = supabase.from('student_contribution_targets').select('*')
    if (classId) query = query.eq('class_id', classId)
    const { data } = await query
    if (data) setTargets(data as StudentTarget[])
    setLoading(false)
  }

  useEffect(() => { fetchTargets() }, [classId])

  async function upsertTarget(
    studentId: string,
    targetAmount: number,
    note?: string,
    overrideClassId?: string | null
  ): Promise<string | null> {
    const resolvedClassId = await resolveStudentClassId(studentId, overrideClassId ?? classId)
    if (!resolvedClassId) {
      return 'Cannot save target: please select a class or assign this student to a class first.'
    }

    const uid = (await supabase.auth.getUser()).data.user?.id
    const { error } = await supabase
      .from('student_contribution_targets')
      .upsert({
        student_id: studentId,
        class_id: resolvedClassId,
        target_amount: targetAmount,
        set_by: uid,
        note: note ?? null,
        updated_at: new Date().toISOString(),
      } as never, { onConflict: 'student_id,class_id' })
    if (!error) {
      fetchTargets()
      dispatchWebPushApi({
        id: generateUUID(),
        title: '🎯 Contribution Target Updated',
        body: `Your contribution target has been set to $${targetAmount}${note ? ` (${note})` : ''}.`,
        category: 'reminder',
        classId: resolvedClassId,
        targetUserIds: [studentId],
        url: '/dashboard',
        createdAt: new Date().toISOString(),
      }).catch(() => {})
    }
    return error?.message ?? null
  }

  async function removeTarget(studentId: string, overrideClassId?: string | null): Promise<string | null> {
    const existingClassId = targets.find((t) => t.student_id === studentId)?.class_id
    const resolvedClassId = await resolveStudentClassId(
      studentId,
      overrideClassId ?? classId ?? existingClassId
    )
    if (!resolvedClassId) {
      return 'Cannot remove target: class assignment not found for this student.'
    }

    const { error } = await supabase
      .from('student_contribution_targets')
      .delete()
      .eq('student_id', studentId)
      .eq('class_id', resolvedClassId)
    if (!error) fetchTargets()
    return error?.message ?? null
  }

  function getTargetForStudent(studentId: string): number | null {
    const t = targets.find((t) => t.student_id === studentId)
    return t ? t.target_amount : null
  }

  return { targets, loading, upsertTarget, removeTarget, getTargetForStudent, refetch: fetchTargets }
}

/** Fetch the personal target for a single student */
export function useMyStudentTarget(studentId?: string | null, classId?: string | null) {
  const [target, setTarget] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId || !classId) { setTarget(null); setLoading(false); return }
    supabase
      .from('student_contribution_targets')
      .select('target_amount')
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .single()
      .then(({ data }) => {
        setTarget(data ? (data as any).target_amount : null)
        setLoading(false)
      })
  }, [studentId, classId])

  return { target, loading }
}
