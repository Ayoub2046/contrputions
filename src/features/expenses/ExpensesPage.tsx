import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table, TBody, Td, Th, THead } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { useExpenses, useExpenseTotal } from './useExpenses'
import { formatCurrency, formatDate } from '../../lib/utils'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Plus, Trash2, Receipt, Filter } from 'lucide-react'

export function ExpensesPage() {
  const { t } = useTranslation()
  const { user, activeClassId, setActiveClassId } = useAuth()
  const isFinanceManager = user?.role === 'finance_manager'
  const canViewAllClasses = user?.role === 'super_admin' || isFinanceManager
  const [selectedClass, setSelectedClass] = useState<string>(activeClassId || '')
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (!canViewAllClasses) return
    supabase.from('classes').select('id, name').order('name').then(({ data }) => {
      if (data) setClasses(data)
    })
  }, [canViewAllClasses])

  useEffect(() => {
    setSelectedClass(activeClassId || '')
  }, [activeClassId])

  const classId = canViewAllClasses ? (selectedClass || null) : activeClassId
  const { expenses, loading, create, remove } = useExpenses(classId)
  const { total } = useExpenseTotal(classId, canViewAllClasses)

  const [showForm, setShowForm] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || !amount || !date) { setError(t('expenses.validation.required')); return }
    setSubmitting(true)
    const err = await create(description.trim(), parseFloat(amount), date)
    if (err) setError(err)
    else { setShowForm(false); setDescription(''); setAmount(''); setError('') }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">{t('expenses.title')}</h1>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-error tabular-nums mt-1">{formatCurrency(total)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canViewAllClasses && classes.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-bg-card">
              <Filter size={14} className="text-brand-600" />
              <select
                value={selectedClass}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedClass(val)
                  setActiveClassId(val || null)
                }}
                className="text-xs font-semibold text-text bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="">🌐 All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    📚 {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isFinanceManager ? (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              💼 Finance Manager · Read-Only Auditing
            </span>
          ) : (
            <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto justify-center">
              <Plus size={16} /> {t('expenses.record')}
            </Button>
          )}
        </div>
      </div>

      <Card>
        {loading ? (
          <CardContent className="py-8">
            <SkeletonTable rows={4} cols={3} />
          </CardContent>
        ) : expenses.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted">
            <Receipt size={40} className="text-muted/50" />
            <p>{t('expenses.none')}</p>
          </CardContent>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block">
              <Table>
                <THead>
                  <tr>
                    <Th>{t('expenses.columns.description')}</Th>
                    <Th>{t('expenses.columns.amount')}</Th>
                    <Th>{t('expenses.columns.date')}</Th>
                    <Th className="text-right">{t('expenses.columns.action')}</Th>
                  </tr>
                </THead>
                <TBody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <Td className="font-medium text-text">{e.description}</Td>
                      <Td className="font-semibold text-error tabular-nums">{formatCurrency(Number(e.amount))}</Td>
                      <Td className="text-secondary">{formatDate(e.date)}</Td>
                      <Td>
                        {!isFinanceManager && (
                          <div className="flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => remove(e.id)}>
                              <Trash2 size={16} className="text-error" />
                            </Button>
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
            {/* Mobile */}
            <div className="lg:hidden divide-y divide-border/40">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-elevated/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="size-9 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                      <Receipt size={16} className="text-error" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{e.description}</p>
                      <p className="text-xs text-muted">{formatDate(e.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-base font-bold text-error tabular-nums">-{formatCurrency(Number(e.amount))}</span>
                    {!isFinanceManager && (
                      <Button variant="ghost" size="sm" onClick={() => remove(e.id)}>
                        <Trash2 size={15} className="text-error" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('expenses.modal.title')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="desc"
            label={t('expenses.modal.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('expenses.modal.descriptionPlaceholder')}
            required
          />
          <Input
            id="amount"
            label={t('expenses.modal.amount')}
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('expenses.modal.amountPlaceholder')}
            required
          />
          <Input
            id="date"
            label={t('expenses.modal.date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          {error && <p className="text-sm text-error bg-error/10 rounded-btn px-3 py-2 border border-error/20">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>{t('expenses.modal.cancel')}</Button>
            <Button type="submit" loading={submitting}>{t('expenses.modal.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
