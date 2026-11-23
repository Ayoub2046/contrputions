import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { adminCreateUser, adminDeleteUser, adminUpdateUser } from '../../lib/admin-api'
import { moveToRecycleBin } from '../recyclebin/recycleBinManager'
import type { Profile } from '../../lib/types'

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
    // Capture student details before deleting for recycle bin
    const student = students.find(s => s.id === id)
    if (student) {
      await moveToRecycleBin(
        'student',
        id,
        student.name,
        { student_id: student.student_id, name: student.name, phone: student.phone, role: student.role },
        student.class_id ?? null
      )
    }
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (!error) {
      await adminDeleteUser(id)
      fetch()
    }
    return error?.message ?? null
  }

  async function importCSV(lines: string[][], importClassId?: string) {
    const errors: string[] = []
    for (let i = 0; i < lines.length; i++) {
      const [sid, name, password, phone] = lines[i]
      if (!sid || !name) {
        errors.push(`Row ${i + 1}: missing required fields (student_id, name)`)
        continue
      }
      const finalPwd = (password && password.trim()) ? password.trim() : sid.trim()
      const err = await create(sid.trim(), name.trim(), finalPwd, importClassId, phone?.trim() || null)
      if (err) errors.push(`Row ${i + 1} (${sid}): ${err}`)
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
