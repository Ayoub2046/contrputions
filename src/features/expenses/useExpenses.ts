import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { moveToRecycleBin } from '../recyclebin/recycleBinManager'
import { broadcastPushNotification, generateUUID } from '../notifications/notificationService'
import type { Expense } from '../../lib/types'

export function useExpenses(classId?: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    let query = supabase.from('expenses').select('*').order('date', { ascending: false })
    if (classId) query = query.eq('class_id', classId)
    const { data } = await query
    if (data) setExpenses(data)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [classId])

  async function create(description: string, amount: number, date: string) {
    const uid = (await supabase.auth.getUser()).data.user?.id
    const { error } = await supabase.from('expenses').insert({
      class_id: classId,
      description,
      amount,
      date,
      added_by: uid,
    } as never)
    if (!error) {
      fetch()
      broadcastPushNotification({
        id: generateUUID(),
        title: '🧾 New Class Expense',
        body: `An expense of $${amount} was recorded: ${description}`,
        category: 'expense',
        classId: classId || null,
        createdAt: new Date().toISOString(),
      }).catch(() => {})
    }
    return error?.message ?? null
  }

  async function remove(id: string) {
    // Instant optimistic removal from UI
    const item = expenses.find((e) => e.id === id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))

    if (item) {
      await moveToRecycleBin(
        'expense',
        id,
        item.description,
        { ...item },
        item.class_id,
      )
    }
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) fetch()
    return error?.message ?? null
  }

  return { expenses, loading, create, remove, refetch: fetch }
}

export function useExpenseTotal(classId?: string | null, allowGlobal = false) {
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!classId && !allowGlobal) { setTotal(0); return }
    let query = supabase
      .from('expenses')
      .select('amount')
    if (classId) query = query.eq('class_id', classId)

    query.then(({ data }) => {
        if (data) setTotal(data.reduce((sum, e) => sum + Number(e.amount), 0))
      })
  }, [classId, allowGlobal])

  return { total }
}
