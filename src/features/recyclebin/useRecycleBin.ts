import { useState, useCallback } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useContributions } from '../contributions/useContributions'
import type { ContributionWithStudent } from '../contributions/useContributions'

export function useRecycleBin() {
  const { activeClassId } = useAuth()
  const { fetchDeleted, restore, permanentDelete } = useContributions(activeClassId)
  const [deleted, setDeleted] = useState<ContributionWithStudent[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    const data = await fetchDeleted()
    setDeleted(data)
    setLoading(false)
  }, [fetchDeleted])

  const restoreItem = useCallback(async (id: string): Promise<string | null> => {
    const err = await restore(id)
    if (!err) await refetch()
    return err
  }, [restore, refetch])

  const permanentDeleteItem = useCallback(async (id: string): Promise<string | null> => {
    const err = await permanentDelete(id)
    if (!err) await refetch()
    return err
  }, [permanentDelete, refetch])

  return { deleted, loading, refetch, restoreItem, permanentDeleteItem }
}
