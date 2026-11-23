import { supabase } from '../../lib/supabase'

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
}

const STORAGE_KEY = 'classbank_recycle_bin_items'

export function getLocalRecycleBin(): RecycleBinItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalRecycleBin(items: RecycleBinItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

export async function moveToRecycleBin(
  item_type: RecycleItemType,
  item_id: string,
  name: string,
  details: Record<string, any>,
  class_id?: string | null
): Promise<void> {
  const item: RecycleBinItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : `rb_${Date.now()}_${Math.random()}`,
    item_type,
    item_id,
    class_id: class_id || null,
    name,
    details,
    deleted_at: new Date().toISOString(),
  }

  // 1. Save to local storage cache immediately
  const localItems = getLocalRecycleBin()
  const updated = [item, ...localItems.filter((x) => x.item_id !== item_id)]
  saveLocalRecycleBin(updated)

  // 2. Attempt saving to Supabase recycle_bin table
  try {
    await supabase.from('recycle_bin').insert({
      id: item.id,
      item_type: item.item_type,
      item_id: item.item_id,
      class_id: item.class_id,
      name: item.name,
      details: item.details,
      deleted_at: item.deleted_at,
    } as never)
  } catch (err) {
    console.warn('Recycle bin table insert notice:', err)
  }
}

export async function fetchRecycleBinItems(classId?: string | null): Promise<RecycleBinItem[]> {
  const localItems = getLocalRecycleBin()

  try {
    let query = supabase.from('recycle_bin').select('*').order('deleted_at', { ascending: false })
    if (classId) query = query.eq('class_id', classId)
    const { data, error } = await query

    if (!error && data && data.length > 0) {
      // Merge with local items avoiding duplicates
      const ids = new Set(data.map((d: any) => d.id))
      const combined = [...data, ...localItems.filter((l) => !ids.has(l.id))]
      saveLocalRecycleBin(combined)
      return combined
    }
  } catch {}

  // Filter local items if classId specified
  if (classId) {
    return localItems.filter((i) => !i.class_id || i.class_id === classId)
  }
  return localItems
}

export async function restoreRecycleItem(item: RecycleBinItem): Promise<string | null> {
  try {
    if (item.item_type === 'contribution') {
      // Restore contribution by clearing deleted_at
      const { error } = await supabase
        .from('contributions')
        .update({ deleted_at: null } as never)
        .eq('id', item.item_id)
      if (error) {
        // If not found in contributions, re-insert from details
        await supabase.from('contributions').insert(item.details as never)
      }
    } else if (item.item_type === 'expense') {
      // Restore expense
      const { error } = await supabase.from('expenses').insert({
        id: item.item_id,
        class_id: item.class_id,
        description: item.details.description || item.name,
        amount: item.details.amount,
        date: item.details.date || new Date().toISOString(),
        added_by: item.details.added_by || null,
      } as never)
      if (error) return error.message
    } else if (item.item_type === 'student') {
      // Restore student profile
      const { error } = await supabase.from('profiles').upsert({
        id: item.item_id,
        student_id: item.details.student_id,
        name: item.details.name || item.name,
        phone: item.details.phone || null,
        role: item.details.role || 'student',
        class_id: item.class_id,
      } as never)
      if (error) return error.message
    }

    // Remove from recycle_bin table & local cache
    try {
      await supabase.from('recycle_bin').delete().eq('id', item.id)
    } catch {}

    const localItems = getLocalRecycleBin().filter((x) => x.id !== item.id)
    saveLocalRecycleBin(localItems)
    return null
  } catch (err: any) {
    return err.message || 'Failed to restore item'
  }
}

export async function permanentDeleteRecycleItem(item: RecycleBinItem): Promise<string | null> {
  try {
    if (item.item_type === 'contribution') {
      await supabase.from('contributions').delete().eq('id', item.item_id)
    } else if (item.item_type === 'expense') {
      await supabase.from('expenses').delete().eq('id', item.item_id)
    } else if (item.item_type === 'student') {
      await supabase.from('profiles').delete().eq('id', item.item_id)
    }

    try {
      await supabase.from('recycle_bin').delete().eq('id', item.id)
    } catch {}

    const localItems = getLocalRecycleBin().filter((x) => x.id !== item.id)
    saveLocalRecycleBin(localItems)
    return null
  } catch (err: any) {
    return err.message || 'Failed to delete permanently'
  }
}
