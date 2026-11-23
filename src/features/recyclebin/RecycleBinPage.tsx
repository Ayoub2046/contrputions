import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, TBody, Td, Th, THead } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { useRecycleBin } from './useRecycleBin'
import { formatCurrency, formatDate } from '../../lib/utils'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Trash2, RotateCcw, PiggyBank } from 'lucide-react'

export function RecycleBinPage() {
  const { t } = useTranslation()
  const { deleted, loading, refetch, restoreItem, permanentDeleteItem } = useRecycleBin()

  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState<string | null>(null)
  const [permanentDeleteText, setPermanentDeleteText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { refetch() }, [])

  async function handleRestore() {
    if (!confirmRestore) return
    setActionLoading(true)
    await restoreItem(confirmRestore)
    setConfirmRestore(null)
    setActionLoading(false)
  }

  async function handlePermanentDelete() {
    if (!confirmPermanentDelete) return
    setActionLoading(true)
    await permanentDeleteItem(confirmPermanentDelete)
    setConfirmPermanentDelete(null)
    setPermanentDeleteText('')
    setActionLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">{t('recycleBin.title')}</h1>
        <p className="text-sm text-muted">{t('recycleBin.subtitle')}</p>
      </div>

      <Card>
        {loading ? (
          <CardContent className="py-8">
            <SkeletonTable rows={4} cols={4} />
          </CardContent>
        ) : deleted.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted">
            <PiggyBank size={40} className="text-muted/50" />
            <p>{t('recycleBin.empty')}</p>
          </CardContent>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block">
              <Table>
                <THead>
                  <tr>
                    <Th>{t('recycleBin.columns.student')}</Th>
                    <Th>{t('recycleBin.columns.id')}</Th>
                    <Th>{t('recycleBin.columns.amount')}</Th>
                    <Th>{t('recycleBin.columns.deletedAt')}</Th>
                    <Th className="text-right">{t('recycleBin.columns.actions')}</Th>
                  </tr>
                </THead>
                <TBody>
                  {deleted.map((c) => (
                    <tr key={c.id}>
                      <Td className="font-medium text-text">{c.profiles?.name}</Td>
                      <Td className="font-mono text-muted">{c.profiles?.student_id}</Td>
                      <Td className="font-semibold text-error tabular-nums">{formatCurrency(Number(c.amount))}</Td>
                      <Td className="text-secondary">{formatDate(c.deleted_at!)}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setConfirmRestore(c.id)}>
                            <RotateCcw size={16} className="text-success" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmPermanentDelete(c.id)}>
                            <Trash2 size={16} className="text-error" />
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
            {/* Mobile */}
            <div className="lg:hidden divide-y divide-border/40">
              {deleted.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="size-8 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                      <PiggyBank size={15} className="text-error" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{c.profiles?.name}</p>
                      <p className="text-xs text-muted">{c.profiles?.student_id} &middot; {formatDate(c.deleted_at!)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-sm font-bold text-error tabular-nums">{formatCurrency(Number(c.amount))}</span>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmRestore(c.id)}>
                      <RotateCcw size={15} className="text-success" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmPermanentDelete(c.id)}>
                      <Trash2 size={15} className="text-error" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal open={!!confirmRestore} onClose={() => setConfirmRestore(null)} title={t('recycleBin.confirmRestore.title')}>
        <p className="text-sm text-secondary mb-4">{t('recycleBin.confirmRestore.message')}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmRestore(null)}>{t('recycleBin.confirmRestore.cancel')}</Button>
          <Button onClick={handleRestore} loading={actionLoading}>{t('recycleBin.confirmRestore.restore')}</Button>
        </div>
      </Modal>

      <Modal open={!!confirmPermanentDelete} onClose={() => { setConfirmPermanentDelete(null); setPermanentDeleteText('') }} title={t('recycleBin.confirmPermanentDelete.title')}>
        <p className="text-sm text-secondary mb-4">{t('recycleBin.confirmPermanentDelete.message')}</p>
        <p className="text-sm text-secondary mb-4">{t('recycleBin.confirmPermanentDelete.instruction')}</p>
        <input
          type="text"
          value={permanentDeleteText}
          onChange={(e) => setPermanentDeleteText(e.target.value)}
          placeholder="DELETE"
          className="w-full rounded-btn border border-border-hover bg-bg-card px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-600/30 mb-4"
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => { setConfirmPermanentDelete(null); setPermanentDeleteText('') }}>{t('recycleBin.confirmPermanentDelete.cancel')}</Button>
          <Button variant="danger" disabled={permanentDeleteText !== 'DELETE'} loading={actionLoading} onClick={handlePermanentDelete}>{t('recycleBin.confirmPermanentDelete.delete')}</Button>
        </div>
      </Modal>
    </div>
  )
}
