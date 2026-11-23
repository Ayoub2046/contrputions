import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useStudents } from '../students/useStudents'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table, TBody, Td, Th, THead } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { useContributions, useContributionTotals } from './useContributions'
import type { ContributionWithStudent } from './useContributions'
import { formatCurrency, formatDate } from '../../lib/utils'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Plus, Pencil, Trash2, PiggyBank, Search } from 'lucide-react'

export function ContributionsPage() {
  const { t } = useTranslation()
  const { activeClassId } = useAuth()
  const classId = activeClassId
  const { contributions, loading, create, update, remove, clearAll } = useContributions(classId)
  const { total } = useContributionTotals(classId)
  const { students, search, setSearch } = useStudents(classId)

  const [showForm, setShowForm] = useState(false)
  const [editingContribution, setEditingContribution] = useState<ContributionWithStudent | null>(null)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearText, setClearText] = useState('')
  const [clearing, setClearing] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent || !amount || !date) { setError(t('contributions.validation.required')); return }
    setSubmitting(true)
    const err = editingContribution
      ? await update(editingContribution.id, parseFloat(amount), date)
      : await create(selectedStudent, parseFloat(amount), date)
    if (err) setError(err)
    else { setShowForm(false); setEditingContribution(null); setSelectedStudent(''); setAmount(''); setSearch(''); setError('') }
    setSubmitting(false)
  }

  function openEdit(c: ContributionWithStudent) {
    setEditingContribution(c)
    setSelectedStudent(c.student_id)
    setSearch(`${c.profiles?.name} (${c.profiles?.student_id})`)
    setAmount(String(c.amount))
    setDate(c.date)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingContribution(null)
    setSearch('')
  }

  async function handleClearAll() {
    setClearing(true)
    const err = await clearAll()
    if (err) setError(err)
    else { setShowClearConfirm(false); setClearText('') }
    setClearing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-text">{t('contributions.title')}</h1>
          <p className="text-3xl font-serif font-bold text-success tabular-nums mt-1">{formatCurrency(total)}</p>
        </div>
        <div className="flex gap-2">
          {contributions.length > 0 && (
            <Button variant="danger" onClick={() => setShowClearConfirm(true)}><Trash2 size={16} /> {t('contributions.clearAll')}</Button>
          )}
          <Button onClick={() => setShowForm(true)}><Plus size={16} /> {t('contributions.record')}</Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <CardContent className="py-8">
            <SkeletonTable rows={4} cols={4} />
          </CardContent>
        ) : contributions.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted">
            <PiggyBank size={40} className="text-muted/50" />
            <p>{t('contributions.none')}</p>
          </CardContent>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block">
              <Table>
                <THead>
                  <tr>
                    <Th>{t('contributions.columns.student')}</Th>
                    <Th>{t('contributions.columns.id')}</Th>
                    <Th>{t('contributions.columns.amount')}</Th>
                    <Th>{t('contributions.columns.date')}</Th>
                    <Th className="text-right">{t('contributions.columns.action')}</Th>
                  </tr>
                </THead>
                <TBody>
                  {contributions.map((c) => (
                    <tr key={c.id}>
                      <Td className="font-medium text-text">{c.profiles?.name}</Td>
                      <Td className="font-mono text-muted">{c.profiles?.student_id}</Td>
                      <Td className="font-semibold text-success tabular-nums">{formatCurrency(Number(c.amount))}</Td>
                      <Td className="text-secondary">{formatDate(c.date)}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                            <Pencil size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
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
              {contributions.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="size-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                      <PiggyBank size={15} className="text-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{c.profiles?.name}</p>
                      <p className="text-xs text-muted">{c.profiles?.student_id} &middot; {formatDate(c.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-sm font-bold text-success tabular-nums">+{formatCurrency(Number(c.amount))}</span>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Pencil size={15} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
                      <Trash2 size={15} className="text-error" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal open={showForm} onClose={closeForm} title={editingContribution ? t('contributions.modal.editTitle') : t('contributions.modal.title')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-secondary">{t('contributions.modal.student')}</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); if (selectedStudent) setSelectedStudent('') }}
                placeholder={t('contributions.modal.searchStudent')}
                className="w-full rounded-btn border border-border-hover bg-bg-card pl-9 pr-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-600/30"
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-btn border border-border divide-y divide-border/40 bg-bg-card">
              {students.length === 0 ? (
                <p className="px-3 py-4 text-sm text-center text-muted">{t('contributions.modal.selectStudent')}</p>
              ) : (
                students.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setSelectedStudent(s.id); setSearch(`${s.name} (${s.student_id})`); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-bg-elevated cursor-pointer ${selectedStudent === s.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-text'}`}
                  >
                    <div className="size-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-brand-600">{s.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate">{s.name}</p>
                      <p className="text-xs text-muted truncate">{s.student_id}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          <Input
            id="amount"
            label={t('contributions.modal.amount')}
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('contributions.modal.amountPlaceholder')}
            required
          />
          <Input
            id="date"
            label={t('contributions.modal.date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          {error && <p className="text-sm text-error bg-error/10 rounded-btn px-3 py-2 border border-error/20">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeForm}>{t('contributions.modal.cancel')}</Button>
            <Button type="submit" loading={submitting}>{editingContribution ? t('contributions.modal.update') : t('contributions.modal.save')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showClearConfirm} onClose={() => { setShowClearConfirm(false); setClearText('') }} title={t('contributions.clearConfirm.title')}>
        <p className="text-sm text-secondary mb-2">{t('contributions.clearConfirm.message', { count: contributions.length })}</p>
        <p className="text-sm text-secondary mb-4">{t('contributions.clearConfirm.instruction')}</p>
        <input
          type="text"
          value={clearText}
          onChange={(e) => setClearText(e.target.value)}
          placeholder="CLEAR"
          className="w-full rounded-btn border border-border-hover bg-bg-card px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-600/30 mb-4"
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => { setShowClearConfirm(false); setClearText('') }}>{t('contributions.clearConfirm.cancel')}</Button>
          <Button variant="danger" disabled={clearText !== 'CLEAR'} loading={clearing} onClick={handleClearAll}>{t('contributions.clearConfirm.delete')}</Button>
        </div>
      </Modal>
    </div>
  )
}
