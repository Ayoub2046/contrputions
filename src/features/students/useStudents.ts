import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { adminCreateUser, adminDeleteUser, adminUpdateUser, adminImportStudentsBatch } from '../../lib/admin-api'
import { moveToRecycleBin } from '../recyclebin/recycleBinManager'
import type { Profile } from '../../lib/types'
import type { ParsedStudentRow } from './csvStudentParser'

export function useStudents(classId?: string | null) {
  const [students, setStudents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function fetch() {
    setLoading(true)
    let query = supabase.from('profiles').select('*').eq('role', 'student').order('name')
    if (classId) query = query.eq('class_id', classId)
    const { data } = await query
    if (data) setStudents(data)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [classId])

  async function create(studentId: string, name: string, password: string, passwordClassId?: string, phone?: string | null) {
    const { error } = await adminCreateUser(studentId, name, password, passwordClassId ?? classId ?? null, 'student', phone || null)
    if (error) return error
    fetch()
    return null
  }

  async function updateProfile(
    id: string,
    updates: { student_id?: string; name?: string; phone?: string | null; class_id?: string | null },
    newPassword?: string
  ) {
    // Instant optimistic UI update
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              name: updates.name ?? s.name,
              phone: updates.phone !== undefined ? updates.phone ?? undefined : s.phone,
              student_id: updates.student_id ?? s.student_id,
              class_id: updates.class_id ?? s.class_id,
            }
          : s,
      ),
    )

    const { error } = await supabase.from('profiles').update(updates as never).eq('id', id)
    if (updates.student_id || newPassword) {
      await adminUpdateUser(id, {
        student_id: updates.student_id,
        password: newPassword,
        name: updates.name,
        phone: updates.phone,
        class_id: updates.class_id,
      })
    }
    if (!error) fetch()
    return error?.message ?? null
  }

  async function remove(id: string) {
    // Instant optimistic deletion from UI (0ms delay)
    let student = students.find((s) => s.id === id)
    if (!student) {
      const { data: fetched } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (fetched) student = fetched as Profile
    }
    setStudents((prev) => prev.filter((s) => s.id !== id))

    if (student) {
      await moveToRecycleBin(
        'student',
        id,
        student.name,
        {
          student_id: student.student_id,
          name: student.name,
          phone: student.phone,
          role: student.role,
          class_id: student.class_id ?? null,
        },
        student.class_id ?? null,
      )
    }
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (!error) {
      await adminDeleteUser(id)
    }
    fetch()
    return error?.message ?? null
  }

  async function importCSV(parsedRows: ParsedStudentRow[], importClassId?: string): Promise<string[]> {
    const targetClass = importClassId ?? classId ?? null
    if (!targetClass) {
      return ['Please select a target class first before importing students to assign them properly.']
    }
    const { successCount, errors } = await adminImportStudentsBatch(parsedRows, targetClass)
    if (successCount > 0) {
      await fetch()
    }
    return errors
  }

  const filtered = students.filter(
    (s) =>
      s.student_id.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()),
  )

  return { students: filtered, allStudents: students, loading, search, setSearch, create, update: updateProfile, remove, importCSV, refetch: fetch }
}
