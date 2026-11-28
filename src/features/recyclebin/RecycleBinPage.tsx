import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, TBody, Td, Th, THead } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { useRecycleBin } from './useRecycleBin'
import { formatCurrency, formatDate } from '../../lib/utils'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Trash2, RotateCcw, PiggyBank, User, Receipt, School, RefreshCw } from 'lucide-react'
import type { RecycleBinItem } from './recycleBinManager'

function itemTypeIcon(type: string) {
  if (type === 'student') return <User size={15} className="text-brand-500" />
  if (type === 'expense') return <Receipt size={15} className="text-warning" />
  if (type === 'class') return <School size={15} className="text-[#1176BC]" />
  return <PiggyBank size={15} className="text-error" />
}

function itemTypeBadge(type: string) {
  if (type === 'student') return <Badge variant="info">Student</Badge>
  if (type === 'expense') return <Badge variant="warning">Expense</Badge>
  if (type === 'class') return <Badge variant="info">Class</Badge>
  return <Badge variant="danger">Contribution</Badge>
}

export function RecycleBinPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { deleted, loading, refetch, restoreItem, permanentDeleteItem } = useRecycleBin()

  if (user?.role === 'finance_manager' || user?.role === 'student') {
    return <Navigate to="/dashboard" replace />
  }

  const [confirmRestore, setConfirmRestore] = useState<RecycleBinItem | null>(null)
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState<RecycleBinItem | null>(null)
  const [permanentDeleteText, setPermanentDeleteText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => { refetch() }, [refetch])

  async function handleRestore() {
    if (!confirmRestore) return
    setActionLoading(true)
    setActionError('')
    const err = await restoreItem(confirmRestore)
    if (err) setActionError(err)
    setConfirmRestore(null)
    setActionLoading(false)
  }

  async function handlePermanentDelete() {
    if (!confirmPermanentDelete) return
    setActionLoading(true)
    setActionError('')
    const err = await permanentDeleteItem(confirmPermanentDelete)
    if (err) setActionError(err)
    setConfirmPermanentDelete(null)
    setPermanentDeleteText('')
    setActionLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">{t('recycleBin.title')}</h1>
          <p className="text-sm text-muted">{t('recycleBin.subtitle')}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {actionError && (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-2.5 text-xs font-medium text-error">
          {actionError}
        </div>
      )}

      <Card>
        {loading ? (
          <CardContent className="py-8">
            <SkeletonTable rows={4} cols={5} />
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
                    <Th>Type</Th>
                    <Th>{t('recycleBin.columns.student')}</Th>
                    <Th>{t('recycleBin.columns.amount')}</Th>
                    <Th>{t('recycleBin.columns.deletedAt')}</Th>
                    <Th className="text-right">{t('recycleBin.columns.actions')}</Th>
                  </tr>
                </THead>
                <TBody>
                  {deleted.map((item) => (
                    <tr key={item.id}>
                      <Td>{itemTypeBadge(item.item_type)}</Td>
                      <Td className="font-medium text-text">
                        <div className="flex items-center gap-2">
                          {itemTypeIcon(item.item_type)}
                          <span>{item.name}</span>
                        </div>
                        {item.details?.student_id && (
                          <span className="text-xs text-muted font-mono ml-5">{item.details.student_id}</span>
                        )}
                      </Td>
                      <Td className="font-semibold tabular-nums text-text">
                        {item.details?.amount != null ? formatCurrency(Number(item.details.amount)) : '—'}
                      </Td>
                      <Td className="text-secondary">{formatDate(item.deleted_at)}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setConfirmRestore(item)}>
                            <RotateCcw size={16} className="text-success" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmPermanentDelete(item)}>
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
              {deleted.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="size-8 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                      {itemTypeIcon(item.item_type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{item.name}</p>
                      <p className="text-xs text-muted">
                        {item.item_type} &middot; {formatDate(item.deleted_at)}
                        {item.details?.amount != null && ` · ${formatCurrency(Number(item.details.amount))}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => setConfirmRestore(item)}>
                      <RotateCcw size={15} className="text-success" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmPermanentDelete(item)}>
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
        {confirmRestore && (
          <p className="text-sm font-medium text-text mb-4">
            Restoring: <span className="font-bold">{confirmRestore.name}</span> ({confirmRestore.item_type})
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmRestore(null)}>{t('recycleBin.confirmRestore.cancel')}</Button>
          <Button onClick={handleRestore} loading={actionLoading}>{t('recycleBin.confirmRestore.restore')}</Button>
        </div>
      </Modal>

      <Modal
        open={!!confirmPermanentDelete}
        onClose={() => { setConfirmPermanentDelete(null); setPermanentDeleteText('') }}
        title={t('recycleBin.confirmPermanentDelete.title')}
      >
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
          <Button variant="secondary" onClick={() => { setConfirmPermanentDelete(null); setPermanentDeleteText('') }}>
            {t('recycleBin.confirmPermanentDelete.cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={permanentDeleteText !== 'DELETE'}
            loading={actionLoading}
            onClick={handlePermanentDelete}
          >
            {t('recycleBin.confirmPermanentDelete.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
