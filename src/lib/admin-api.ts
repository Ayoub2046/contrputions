import { supabase } from './supabase'

export async function getValidAuthToken(): Promise<string | null> {
  // 1. Get current session
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) return session.access_token

  // 2. Try refreshing session if expired
  try {
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed.session?.access_token) return refreshed.session.access_token
  } catch {}

  // 3. Fallback: inspect sessionStorage first (for tab isolation), then localStorage
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (key.startsWith('sb-') || key.startsWith('classbank_auth'))) {
        const item = JSON.parse(sessionStorage.getItem(key) || '{}')
        if (item?.access_token) return item.access_token
      }
    }
  } catch {}

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const item = JSON.parse(localStorage.getItem(key) || '{}')
        if (item?.access_token) return item.access_token
      }
    }
  } catch {}

  return null
}

async function getAuthHeaders(explicitToken?: string): Promise<Record<string, string>> {
  const token = explicitToken || (await getValidAuthToken())
  if (!token) {
    throw new Error('Your session has expired. Please sign out and sign in again.')
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function adminCreateUser(
  student_id: string,
  name: string,
  password: string,
  class_id?: string | null,
  role: string = 'student',
  phone?: string | null,
  explicitToken?: string,
): Promise<{ id?: string; error?: string }> {
  try {
    const headers = await getAuthHeaders(explicitToken)
    const r = await fetch('/api/users', {
      method: 'POST',
      headers,
      body: JSON.stringify({ student_id, name, password, class_id, role, phone }),
    })
    const data = await r.json()
    if (!r.ok) return { error: data.error || 'Failed to create user' }
    return { id: data.id }
  } catch (err: any) {
    return { error: err.message || 'Network error creating user' }
  }
}

export async function adminImportStudentsBatch(
  students: { student_id: string; name: string; password?: string; phone?: string | null }[],
  class_id?: string | null,
): Promise<{ successCount: number; errors: string[] }> {
  try {
    const headers = await getAuthHeaders()
    const r = await fetch('/api/users', {
      method: 'POST',
      headers,
      body: JSON.stringify({ students, class_id }),
    })

    const data = await r.json()
    if (r.ok && data.ok) {
      return { successCount: data.createdCount || 0, errors: data.errors || [] }
    }

    // Fallback: If server endpoint doesn't support batch, sequentially create with explicit token
    const token = await getValidAuthToken()
    const errors: string[] = []
    let successCount = 0

    for (let i = 0; i < students.length; i++) {
      const s = students[i]
      const finalPwd = s.password || s.student_id
      const res = await adminCreateUser(s.student_id, s.name, finalPwd, class_id, 'student', s.phone, token || undefined)
      if (res.error) {
        errors.push(`Row ${i + 1} (${s.student_id}): ${res.error}`)
      } else {
        successCount++
      }
    }
    return { successCount, errors }
  } catch (err: any) {
    return { successCount: 0, errors: [err.message || 'Network error during batch import'] }
  }
}

export async function adminUpdateUser(
  id: string,
  updates: {
    student_id?: string
    name?: string
    password?: string
    class_id?: string | null
    phone?: string | null
    role?: string
  }
): Promise<{ error?: string }> {
  try {
    const headers = await getAuthHeaders()
    const r = await fetch('/api/users', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id, ...updates }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) return { error: data.error || 'Failed to update user' }
    return {}
  } catch (err: any) {
    return { error: err.message || 'Network error updating user' }
  }
}

export async function adminDeleteUser(id: string): Promise<{ error?: string }> {
  try {
    const headers = await getAuthHeaders()
    const r = await fetch(`/api/users?id=${id}`, {
      method: 'DELETE',
      headers,
    })
    if (!r.ok) {
      const data = await r.json().catch(() => ({}))
      return { error: data.error || 'Failed to delete user' }
    }
    return {}
  } catch (err: any) {
    return { error: err.message || 'Network error deleting user' }
  }
}
