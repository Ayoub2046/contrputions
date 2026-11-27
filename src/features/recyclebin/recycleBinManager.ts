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

  // Persist directly to Supabase recycle_bin database table
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
    console.warn('Recycle bin database insert notice:', err)
  }
}

export async function fetchRecycleBinItems(classId?: string | null): Promise<RecycleBinItem[]> {
  try {
    let query = supabase.from('recycle_bin').select('*').order('deleted_at', { ascending: false })
    if (classId) query = query.eq('class_id', classId)
    const { data, error } = await query

    if (!error && Array.isArray(data)) {
      return data as RecycleBinItem[]
    }
  } catch (err) {
    console.warn('Failed to fetch recycle bin items from database:', err)
  }

  return []
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

    // Remove from recycle_bin database table
    try {
      await supabase.from('recycle_bin').delete().eq('id', item.id)
    } catch {}

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

    // Permanently remove from recycle_bin database table
    try {
      await supabase.from('recycle_bin').delete().eq('id', item.id)
    } catch {}

    return null
  } catch (err: any) {
    return err.message || 'Failed to delete permanently'
  }
}
