import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface StudentTarget {
  id: string
  student_id: string
  class_id: string
  target_amount: number
  set_by: string | null
  note: string | null
  updated_at: string
}

/** Fetch all student targets for a given class */
export function useStudentTargets(classId?: string | null) {
  const [targets, setTargets] = useState<StudentTarget[]>([])
  const [loading, setLoading] = useState(false)

  async function fetchTargets() {
    if (!classId) { setTargets([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('student_contribution_targets')
      .select('*')
      .eq('class_id', classId)
    if (data) setTargets(data as StudentTarget[])
    setLoading(false)
  }

  useEffect(() => { fetchTargets() }, [classId])

  async function upsertTarget(studentId: string, targetAmount: number, note?: string): Promise<string | null> {
    const uid = (await supabase.auth.getUser()).data.user?.id
    const { error } = await supabase
      .from('student_contribution_targets')
      .upsert({
        student_id: studentId,
        class_id: classId,
        target_amount: targetAmount,
        set_by: uid,
        note: note ?? null,
        updated_at: new Date().toISOString(),
      } as never, { onConflict: 'student_id,class_id' })
    if (!error) fetchTargets()
    return error?.message ?? null
  }

  async function removeTarget(studentId: string): Promise<string | null> {
    const { error } = await supabase
      .from('student_contribution_targets')
      .delete()
      .eq('student_id', studentId)
      .eq('class_id', classId)
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
