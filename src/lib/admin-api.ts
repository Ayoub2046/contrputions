import { supabase } from './supabase'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function adminCreateUser(
  student_id: string,
  name: string,
  password: string,
  class_id?: string | null,
  role: string = 'student',
  phone?: string | null,
): Promise<{ id?: string; error?: string }> {
  try {
    const headers = await getAuthHeaders()
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

export async function adminUpdateUser(
  id: string,
  updates: {
    student_id?: string
    name?: string
    password?: string
    class_id?: string | null
    phone?: string | null
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
