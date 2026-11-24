import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table, TBody, Td, Th, THead } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { StudentForm } from './StudentForm'
import { StudentImport } from './StudentImport'
import { useStudents } from './useStudents'
import { formatCurrency, normalizeAuthPassword } from '../../lib/utils'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Search, Plus, Pencil, Trash2, Wallet, Eye, EyeOff } from 'lucide-react'

export function StudentsPage() {
  const { t } = useTranslation()
  const { user, activeClassId } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  const { students, loading, search, setSearch, create, update, remove, importCSV } = useStudents(activeClassId)
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (!isAdmin) return
    supabase.from('classes').select('id, name').order('name').then(({ data }) => {
      if (data) {
        setAvailableClasses(data)
        if (!importClassId) {
          setImportClassId(activeClassId || (data.length > 0 ? data[0].id : ''))
        }
      }
    })
  }, [isAdmin, activeClassId])

  const [showForm, setShowForm] = useState(false)
  const [editStudent, setEditStudent] = useState<{ id: string; student_id: string; name: string; phone?: string; class_id?: string } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importClassId, setImportClassId] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Class filter for super admin
  const [classFilter, setClassFilter] = useState<string>('all')

  // Password visibility per student
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  function togglePassword(id: string) {
    setVisiblePasswords(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const [paymentData, setPaymentData] = useState<Record<string, { total: number; status: string }>>({})

  useEffect(() => {
    if (!activeClassId) { setPaymentData({}); return }
    supabase.rpc('get_student_payment_status', { p_class_id: activeClassId }).then(({ data }) => {
      if (data) {
        const map: Record<string, { total: number; status: string }> = {}
        for (const row of data as { student_id: string; status: string; total: number }[]) {
          map[row.student_id] = { total: row.total, status: row.status }
        }
        setPaymentData(map)
      }
    })
  }, [activeClassId])

  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all')
  const filters = ['all', 'paid', 'partial', 'unpaid'] as const

  const selectClass = 'rounded-btn border border-border-hover bg-bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-600/30'

  // Apply filters: class filter (super admin only) + status filter
  const filteredByClass = isSuperAdmin && classFilter !== 'all'
    ? students.filter(s => s.class_id === classFilter)
    : students

  const displayStudents = statusFilter === 'all'
    ? filteredByClass
    : filteredByClass.filter(s => (paymentData[s.id]?.status ?? 'unpaid') === statusFilter)

  const badgeVariant = (status: string) =>
    status === 'paid' ? 'success' : status === 'partial' ? 'warning' : 'danger'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-text">{t('students.title')}</h1>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <Button variant="secondary" onClick={() => setShowImport(!showImport)} className="flex-1 sm:flex-none justify-center">
            <Plus size={16} /> {t('students.importCsv')}
          </Button>
          <Button onClick={() => { setEditStudent(null); setShowForm(true) }} className="flex-1 sm:flex-none justify-center">
            <Plus size={16} /> {t('students.addStudent')}
          </Button>
        </div>
      </div>

      {showImport && (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <StudentImport
              availableClasses={availableClasses}
              selectedClassId={importClassId}
              onSelectClassId={(id) => setImportClassId(id)}
              onImport={(rows, targetClassId) => importCSV(rows, targetClassId)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="px-4 pt-4 space-y-3">
          {/* Class filter — super admin only */}
          {isSuperAdmin && availableClasses.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted font-medium">Filter by class:</span>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className={selectClass}
                style={{ minWidth: 160 }}
              >
                <option value="all">All Classes</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('students.searchPlaceholder')}
              className="pl-9"
            />
          </div>
          {students.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1">
                {filters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-btn border transition-colors cursor-pointer ${
                      statusFilter === f
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-bg-card text-secondary border-border hover:bg-bg-elevated'
                    }`}
                  >
                    {t(`students.filter.${f}`)}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted">{t('students.count', { count: displayStudents.length })}</span>
            </div>
          )}
        </div>
        {loading ? (
          <CardContent className="py-8">
            <SkeletonTable rows={5} cols={5} />
          </CardContent>
        ) : displayStudents.length === 0 ? (
          <CardContent className="py-8 text-center text-muted">
            {search ? t('students.noResults') : t('students.noStudents')}
          </CardContent>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block">
              <Table>
                <THead>
                  <tr>
                    <Th className="w-10 text-center">#</Th>
                    <Th>{t('students.columns.studentId')}</Th>
                    <Th>{t('students.columns.phone')}</Th>
                    <Th>{t('students.columns.name')}</Th>
                    {isAdmin && <Th>Password</Th>}
                    <Th>{t('students.columns.status')}</Th>
                    <Th className="text-right">{t('students.columns.totalContributed')}</Th>
                    <Th className="text-right">{t('students.columns.actions')}</Th>
                  </tr>
                </THead>
                <TBody>
                  {displayStudents.map((s, i) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-xs text-muted text-center">{i + 1}</td>
                      <Td className="font-mono text-sm text-brand-600 font-semibold">{s.student_id}</Td>
                      <Td className="text-sm text-muted">{s.phone || '—'}</Td>
                      <Td className="font-medium text-text">{s.name}</Td>
                      {isAdmin && (
                        <Td>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-text">
                              {visiblePasswords.has(s.id)
                                ? normalizeAuthPassword(s.student_id)
                                : '••••••'}
                            </span>
                            <button
                              onClick={() => togglePassword(s.id)}
                              className="text-muted hover:text-text transition-colors p-0.5"
                              title={visiblePasswords.has(s.id) ? 'Hide password' : 'Show password'}
                            >
                              {visiblePasswords.has(s.id)
                                ? <EyeOff size={13} />
                                : <Eye size={13} />}
                            </button>
                          </div>
                        </Td>
                      )}
                      <Td><Badge variant={badgeVariant((paymentData[s.id] ?? { total: 0, status: 'unpaid' }).status)}>{t(`students.status.${(paymentData[s.id] ?? { total: 0, status: 'unpaid' }).status}`)}</Badge></Td>
                      <Td className="text-right font-semibold tabular-nums text-text">
                        <span className="inline-flex items-center gap-1">
                          <Wallet size={14} className="text-muted" />
                          {formatCurrency((paymentData[s.id] ?? { total: 0, status: 'unpaid' }).total)}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditStudent({ id: s.id, student_id: s.student_id, name: s.name, phone: s.phone, class_id: s.class_id ?? undefined }); setShowForm(true) }}>
                            <Pencil size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(s.id)}>
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
              {displayStudents.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-elevated/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted font-mono mb-0.5">#{i + 1} &middot; <span className="text-brand-600 font-semibold">{s.student_id}</span></p>
                    <p className="text-sm font-medium text-text truncate">{s.name}</p>
                    {s.phone && <p className="text-xs text-muted">{s.phone}</p>}
                    {isAdmin && (
                      <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-bg-elevated border border-border">
                        <span className="text-[11px] text-muted">Pass:</span>
                        <span className="text-xs font-mono font-semibold text-text">
                          {visiblePasswords.has(s.id) ? normalizeAuthPassword(s.student_id) : '••••••'}
                        </span>
                        <button
                          onClick={() => togglePassword(s.id)}
                          className="text-muted hover:text-text transition-colors p-0.5"
                          title={visiblePasswords.has(s.id) ? 'Hide password' : 'Show password'}
                        >
                          {visiblePasswords.has(s.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <Badge variant={badgeVariant((paymentData[s.id] ?? { total: 0, status: 'unpaid' }).status)}>{t(`students.status.${(paymentData[s.id] ?? { total: 0, status: 'unpaid' }).status}`)}</Badge>
                      <span className="text-xs font-semibold tabular-nums text-text">
                        {formatCurrency((paymentData[s.id] ?? { total: 0, status: 'unpaid' }).total)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditStudent({ id: s.id, student_id: s.student_id, name: s.name, phone: s.phone, class_id: s.class_id ?? undefined }); setShowForm(true) }}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(s.id)}>
                      <Trash2 size={16} className="text-error" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editStudent ? t('students.modal.edit') : t('students.modal.new')}>
        <StudentForm
          initial={editStudent ?? undefined}
          classId={activeClassId}
          classes={isSuperAdmin ? availableClasses : undefined}
          onSave={async (sid, name, password, cid, phone) =>
            editStudent
              ? update(editStudent.id, { name, phone: phone || null, student_id: sid, ...(cid ? { class_id: cid } : {}) }, password || undefined)
              : create(sid, name, password!, cid, phone)
          }
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={t('students.modal.delete')}>
        <p className="text-sm text-secondary mb-4">{t('students.modal.deleteConfirm')}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>{t('students.modal.cancel')}</Button>
          <Button variant="danger" onClick={async () => {
            if (confirmDelete) await remove(confirmDelete)
            setConfirmDelete(null)
          }}>{t('students.modal.delete')}</Button>
        </div>
      </Modal>
    </div>
  )
}
