import { useState, useCallback } from 'react'
import { useAuth } from '../auth/AuthContext'
import { fetchRecycleBinItems, restoreRecycleItem, permanentDeleteRecycleItem } from './recycleBinManager'
import type { RecycleBinItem } from './recycleBinManager'

export function useRecycleBin() {
  const { activeClassId, user } = useAuth()
  const [deleted, setDeleted] = useState<RecycleBinItem[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    const classIdFilter = user?.role === 'super_admin' ? undefined : activeClassId
    const data = await fetchRecycleBinItems(classIdFilter)
    setDeleted(data)
    setLoading(false)
  }, [activeClassId, user?.role])

  const restoreItem = useCallback(async (item: RecycleBinItem): Promise<string | null> => {
    // Instant optimistic removal from recycle bin list
    setDeleted((prev) => prev.filter((d) => d.id !== item.id))
    const err = await restoreRecycleItem(item)
    if (err) await refetch()
    return err
  }, [refetch])

  const permanentDeleteItem = useCallback(async (item: RecycleBinItem): Promise<string | null> => {
    // Instant optimistic removal from recycle bin list
    setDeleted((prev) => prev.filter((d) => d.id !== item.id))
    const err = await permanentDeleteRecycleItem(item)
    if (err) await refetch()
    return err
  }, [refetch])

  return { deleted, loading, refetch, restoreItem, permanentDeleteItem }
}
