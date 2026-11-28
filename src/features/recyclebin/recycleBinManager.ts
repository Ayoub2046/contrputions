import { supabase } from '../../lib/supabase'
import { adminCreateUser } from '../../lib/admin-api'

export type RecycleItemType = 'student' | 'expense' | 'contribution' | 'class'

export interface RecycleBinItem {
  id: string
  item_type: RecycleItemType
  item_id: string
  class_id?: string | null
  name: string
  details: Record<string, any>
  deleted_at: string
  deleted_by?: string | null
  /** True when reconstructed from a soft-deleted row without an entry in recycle_bin */
  virtualSoftDelete?: boolean
}

function makeUuid(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `rb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

export async function moveToRecycleBin(
  item_type: RecycleItemType,
  item_id: string,
  name: string,
  details: Record<string, any>,
  class_id?: string | null
): Promise<string | null> {
  const deleted_by = await getCurrentUserId()
  const { error } = await supabase.from('recycle_bin').insert({
    id: makeUuid(),
    item_type,
    item_id,
    class_id: class_id || null,
    name,
    details,
    deleted_at: new Date().toISOString(),
    deleted_by,
  } as never)

  if (error) {
    console.warn('[RecycleBin] Failed to insert item:', error.message)
    return error.message
  }
  return null
}

export async function moveManyToRecycleBin(
  entries: Array<{
    item_type: RecycleItemType
    item_id: string
    name: string
    details: Record<string, any>
    class_id?: string | null
  }>
): Promise<string | null> {
  if (entries.length === 0) return null
  const deleted_by = await getCurrentUserId()
  const now = new Date().toISOString()

  const rows = entries.map((entry) => ({
    id: makeUuid(),
    item_type: entry.item_type,
    item_id: entry.item_id,
    class_id: entry.class_id || null,
    name: entry.name,
    details: entry.details,
    deleted_at: now,
    deleted_by,
  }))

  const { error } = await supabase.from('recycle_bin').insert(rows as never)
  if (error) {
    console.warn('[RecycleBin] Failed to batch-insert items:', error.message)
    return error.message
  }
  return null
}

export async function fetchRecycleBinItems(classId?: string | null): Promise<RecycleBinItem[]> {
  try {
    let rbQuery = supabase.from('recycle_bin').select('*').order('deleted_at', { ascending: false })
    if (classId) rbQuery = rbQuery.eq('class_id', classId)

    let softContribQuery = supabase
      .from('contributions')
      .select('*, profiles!contributions_student_id_fkey(student_id, name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    if (classId) softContribQuery = softContribQuery.eq('class_id', classId)

    const [{ data: rbData, error: rbError }, { data: softContribs }] = await Promise.all([
      rbQuery,
      softContribQuery,
    ])

    const items: RecycleBinItem[] =
      !rbError && Array.isArray(rbData) ? (rbData as RecycleBinItem[]) : []

    if (rbError) {
      console.warn('[RecycleBin] Failed to fetch recycle_bin:', rbError.message)
    }

    // Surface any soft-deleted contributions not present in recycle_bin (e.g., from legacy clearAll)
    if (Array.isArray(softContribs) && softContribs.length > 0) {
      const existingIds = new Set(
        items.filter((i) => i.item_type === 'contribution').map((i) => i.item_id)
      )
      for (const c of softContribs as any[]) {
        if (!existingIds.has(c.id)) {
          items.push({
            id: `soft_${c.id}`,
            item_type: 'contribution',
            item_id: c.id,
            class_id: c.class_id ?? null,
            name: `${c.profiles?.name || 'Student'} ($${c.amount})`,
            details: {
              id: c.id,
              student_id: c.student_id,
              class_id: c.class_id,
              amount: c.amount,
              date: c.date,
              recorded_by: c.recorded_by,
              profiles: c.profiles,
            },
            deleted_at: c.deleted_at,
            deleted_by: null,
            virtualSoftDelete: true,
          })
        }
      }
      items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())
    }

    return items
  } catch (err) {
    console.warn('Failed to fetch recycle bin items from database:', err)
  }

  return []
}

export async function restoreRecycleItem(item: RecycleBinItem): Promise<string | null> {
  try {
    if (item.item_type === 'contribution') {
      const { data: updatedRows, error } = await supabase
        .from('contributions')
        .update({ deleted_at: null } as never)
        .eq('id', item.item_id)
        .select('id')

      if (error || !updatedRows || updatedRows.length === 0) {
        const uid = await getCurrentUserId()
        const d = item.details || {}
        const { error: insertErr } = await supabase.from('contributions').insert({
          id: item.item_id,
          student_id: d.student_id,
          class_id: d.class_id ?? item.class_id,
          amount: d.amount,
          date: d.date || new Date().toISOString().split('T')[0],
          recorded_by: d.recorded_by || uid,
          deleted_at: null,
        } as never)
        if (insertErr) return insertErr.message
      }
    } else if (item.item_type === 'expense') {
      const uid = await getCurrentUserId()
      const d = item.details || {}
      const { error } = await supabase.from('expenses').insert({
        id: item.item_id,
        class_id: item.class_id ?? d.class_id,
        description: d.description || item.name,
        amount: d.amount,
        date: d.date || new Date().toISOString().split('T')[0],
        added_by: d.added_by || uid,
      } as never)
      if (error) return error.message
    } else if (item.item_type === 'student') {
      const d = item.details || {}
      const targetClassId = item.class_id ?? d.class_id ?? null
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: item.item_id,
        student_id: d.student_id,
        name: d.name || item.name,
        phone: d.phone || null,
        role: d.role || 'student',
        class_id: targetClassId,
      } as never)

      if (upsertErr) {
        // Parent auth.users record was also deleted; recreate account via admin API cleanly
        const res = await adminCreateUser(
          d.student_id,
          d.name || item.name,
          d.student_id,
          targetClassId,
          d.role || 'student',
          d.phone || null
        )
        if (res.error) return res.error
      }
    } else if (item.item_type === 'class') {
      const d = item.details || {}
      const { error } = await supabase.from('classes').insert({
        id: d.id || item.item_id,
        name: d.name || item.name,
        contribution_target: Number(d.contribution_target || 0),
      } as never)
      if (error) return error.message
    }

    if (!item.virtualSoftDelete) {
      await supabase.from('recycle_bin').delete().eq('id', item.id)
    }

    return null
  } catch (err: any) {
    return err.message || 'Failed to restore item'
  }
}

export async function permanentDeleteRecycleItem(item: RecycleBinItem): Promise<string | null> {
  try {
    if (item.item_type === 'contribution') {
      const { error } = await supabase.from('contributions').delete().eq('id', item.item_id)
      if (error) return error.message
    } else if (item.item_type === 'expense') {
      const { error } = await supabase.from('expenses').delete().eq('id', item.item_id)
      if (error) return error.message
    } else if (item.item_type === 'student') {
      const { error } = await supabase.from('profiles').delete().eq('id', item.item_id)
      if (error) return error.message
    } else if (item.item_type === 'class') {
      const { error } = await supabase.from('classes').delete().eq('id', item.item_id)
      if (error) return error.message
    }

    if (!item.virtualSoftDelete) {
      await supabase.from('recycle_bin').delete().eq('id', item.id)
    }

    return null
  } catch (err: any) {
    return err.message || 'Failed to delete permanently'
  }
}
