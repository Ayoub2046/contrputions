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
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  Eye,
  EyeOff,
  Upload,
  Target,
  Phone,
  PhoneCall,
  MessageSquare,
} from 'lucide-react'

export function StudentsPage() {
  const { t } = useTranslation()
  const { user, activeClassId, setActiveClassId } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const isFinanceManager = user?.role === 'finance_manager'
  const canViewAllClasses = isSuperAdmin || isFinanceManager
  const isAdmin = user?.role === 'admin' || isSuperAdmin

  // Class filter for super admin and finance manager
  const [classFilter, setClassFilter] = useState<string>(activeClassId || 'all')
  useEffect(() => {
    if (canViewAllClasses && activeClassId) {
      setClassFilter(activeClassId)
    }
  }, [activeClassId, canViewAllClasses])

  const effectiveClassId = canViewAllClasses
    ? (classFilter === 'all' ? null : classFilter)
    : activeClassId

  const { students, loading, search, setSearch, create, update, remove, importCSV } = useStudents(effectiveClassId)
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (!isAdmin && !isFinanceManager) return
    supabase.from('classes').select('id, name').order('name').then(({ data }) => {
      if (data) {
        setAvailableClasses(data)
        if (!importClassId) {
          setImportClassId(activeClassId || (data.length > 0 ? data[0].id : ''))
        }
      }
    })
  }, [isAdmin, isFinanceManager, activeClassId])

  const [showForm, setShowForm] = useState(false)
  const [editStudent, setEditStudent] = useState<{ id: string; student_id: string; name: string; phone?: string; class_id?: string } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importClassId, setImportClassId] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

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

  const [contribTotalsByStudent, setContribTotalsByStudent] = useState<Record<string, number>>({})
  const [studentTargets, setStudentTargets] = useState<Record<string, number>>({})
  const [classTargets, setClassTargets] = useState<Record<string, number>>({})

  useEffect(() => {
    supabase.from('classes').select('id, contribution_target').then(({ data }) => {
      if (data) {
        const map: Record<string, number> = {}
        data.forEach((c: any) => { map[c.id] = Number(c.contribution_target || 0) })
        setClassTargets(map)
      }
    })
    supabase.from('student_contribution_targets').select('student_id, target_amount').then(({ data }) => {
      if (data) {
        const map: Record<string, number> = {}
        data.forEach((t: any) => { map[t.student_id] = Number(t.target_amount) })
        setStudentTargets(map)
      }
    })
  }, [])

  useEffect(() => {
    let query = supabase.from('contributions').select('student_id, amount').is('deleted_at', null)
    if (effectiveClassId) {
      query = query.eq('class_id', effectiveClassId)
    }
    query.then(({ data }) => {
      const map: Record<string, number> = {}
      if (data) {
        for (const row of data as { student_id: string; amount: number }[]) {
          map[row.student_id] = (map[row.student_id] ?? 0) + Number(row.amount || 0)
        }
      }
      setContribTotalsByStudent(map)
    })
  }, [effectiveClassId])

  const paymentData: Record<string, { total: number; status: string }> = {}
  for (const s of students) {
    const total = contribTotalsByStudent[s.id] ?? 0
    const target = studentTargets[s.id] ?? classTargets[s.class_id || ''] ?? 0
    const status = target > 0 && total >= target ? 'paid' : total > 0 ? (target === 0 ? 'paid' : 'partial') : 'unpaid'
    paymentData[s.id] = { total, status }
  }

  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all')
  const filters = ['all', 'paid', 'partial', 'unpaid'] as const

  const selectClass = 'rounded-btn border border-border-hover bg-bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-600/30'

  // Apply filters: class filter + status filter
  const filteredByClass = canViewAllClasses && classFilter !== 'all'
    ? students.filter(s => s.class_id === classFilter)
    : students

  const displayStudents = statusFilter === 'all'
    ? filteredByClass
    : filteredByClass.filter(s => (paymentData[s.id]?.status ?? 'unpaid') === statusFilter)

  const badgeVariant = (status: string) =>
    status === 'paid' ? 'success' : status === 'partial' ? 'warning' : 'danger'

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#ECECEC] dark:border-[#1e3550] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">{t('students.title')}</h1>
          <p className="text-xs text-[#9FBBDE]">Directory of all enrolled students, contribution status, and contact actions</p>
        </div>
        {isSuperAdmin ? (
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => setShowImport(!showImport)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] hover:bg-[#EAF4FB] dark:hover:bg-[#0d2a40] text-xs font-semibold text-[#1176BC] transition-all cursor-pointer shadow-2xs"
            >
              <Upload size={14} />
              <span>{showImport ? 'Hide Import' : t('students.importCsv')}</span>
            </button>
            <button
              onClick={() => { setEditStudent(null); setShowForm(true) }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1176BC] to-[#25A8E0] text-white text-xs font-semibold shadow-sm hover:shadow-md hover:opacity-95 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={14} />
              <span>{t('students.addStudent')}</span>
            </button>
          </div>
        ) : isFinanceManager ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-500/20">
              💼 Finance Manager · Read-Only Auditing
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/20">
              <PhoneCall size={13} className="text-emerald-600" />
              <span>Class Admin Access · Calling & Reminders Active</span>
            </span>
          </div>
        )}
      </div>

      {showImport && isSuperAdmin && (
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
          {/* Class filter — super admin & finance manager */}
          {canViewAllClasses && availableClasses.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted font-medium">Filter by class:</span>
              <select
                value={classFilter}
                onChange={(e) => {
                  const val = e.target.value
                  setClassFilter(val)
                  setActiveClassId(val === 'all' ? null : val)
                }}
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
                    <Th>Assigned Target</Th>
                    <Th>{t('students.columns.status')}</Th>
                    <Th className="text-right">{t('students.columns.totalContributed')}</Th>
                    <Th className="text-right">{t('students.columns.actions')}</Th>
                  </tr>
                </THead>
                <TBody>
                  {displayStudents.map((s, i) => {
                    const assignedTarget = studentTargets[s.id] ?? classTargets[s.class_id || ''] ?? 0
                    const pStatus = (paymentData[s.id] ?? { total: 0, status: 'unpaid' }).status
                    const isUnpaid = pStatus !== 'paid'
                    const cleanPhone = s.phone ? s.phone.replace(/[^0-9+]/g, '') : ''
                    const waPhone = s.phone ? s.phone.replace(/[^0-9]/g, '') : ''
                    const reminderMsg = `Asc ${s.name}, waxaan kaa soo xiriiraynaa maamulka fasalka. Fadlan waxaan ku xusuusinaynaa bixinta lacagta qaadhaanka ee kugu hadhay. Mahadsanid!`

                    return (
                      <tr key={s.id} className="hover:bg-bg-elevated/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted text-center">{i + 1}</td>
                        <Td className="font-mono text-sm text-brand-600 font-semibold">{s.student_id}</Td>
                        <Td>
                          {s.phone ? (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-text hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              title={`Click to call ${s.name}`}
                            >
                              <Phone size={12} className="text-emerald-600 shrink-0" />
                              <span className="font-mono">{s.phone}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-muted/60 italic">No phone</span>
                          )}
                        </Td>
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
                                className="text-muted hover:text-text transition-colors p-0.5 cursor-pointer"
                                title={visiblePasswords.has(s.id) ? 'Hide password' : 'Show password'}
                              >
                                {visiblePasswords.has(s.id)
                                  ? <EyeOff size={13} />
                                  : <Eye size={13} />}
                              </button>
                            </div>
                          </Td>
                        )}
                        <Td className="font-semibold tabular-nums text-text">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Target size={13} className="text-[#1176BC]" />
                            {formatCurrency(assignedTarget)}
                          </span>
                        </Td>
                        <Td><Badge variant={badgeVariant(pStatus)}>{t(`students.status.${pStatus}`)}</Badge></Td>
                        <Td className="text-right font-semibold tabular-nums text-text">
                          <span className="inline-flex items-center gap-1">
                            <Wallet size={14} className="text-muted" />
                            {formatCurrency((paymentData[s.id] ?? { total: 0, status: 'unpaid' }).total)}
                          </span>
                        </Td>
                        <Td>
                          <div className="flex justify-end items-center gap-1.5">
                            {/* Calling Actions for Unpaid / Paid Students */}
                            {s.phone && (
                              <>
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
                                    isUnpaid
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-bg-elevated hover:bg-border text-secondary hover:text-text border border-border'
                                  }`}
                                  title={`Call ${s.name} directly`}
                                >
                                  <PhoneCall size={12} />
                                  <span>{isUnpaid ? 'Call' : 'Call'}</span>
                                </a>
                                {isUnpaid && (
                                  <a
                                    href={`https://wa.me/${waPhone}?text=${encodeURIComponent(reminderMsg)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                                    title={`Send WhatsApp reminder to ${s.name}`}
                                  >
                                    <MessageSquare size={12} />
                                    <span>WA</span>
                                  </a>
                                )}
                              </>
                            )}

                            {/* Super Admin Only: Edit and Delete buttons */}
                            {isSuperAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditStudent({
                                      id: s.id,
                                      student_id: s.student_id,
                                      name: s.name,
                                      phone: s.phone,
                                      class_id: s.class_id ?? undefined,
                                    })
                                    setShowForm(true)
                                  }}
                                  title="Edit student (Super Admin)"
                                >
                                  <Pencil size={15} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmDelete(s.id)}
                                  title="Delete student (Super Admin)"
                                >
                                  <Trash2 size={15} className="text-error" />
                                </Button>
                              </>
                            )}
                          </div>
                        </Td>
                      </tr>
                    )
                  })}
                </TBody>
              </Table>
            </div>
            {/* Mobile */}
            <div className="lg:hidden divide-y divide-border/40">
              {displayStudents.map((s, i) => {
                const pStatus = (paymentData[s.id] ?? { total: 0, status: 'unpaid' }).status
                const isUnpaid = pStatus !== 'paid'
                const cleanPhone = s.phone ? s.phone.replace(/[^0-9+]/g, '') : ''
                const waPhone = s.phone ? s.phone.replace(/[^0-9]/g, '') : ''
                const reminderMsg = `Asc ${s.name}, waxaan kaa soo xiriiraynaa maamulka fasalka. Fadlan waxaan ku xusuusinaynaa bixinta lacagta qaadhaanka ee kugu hadhay. Mahadsanid!`

                return (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-bg-elevated/40 transition-colors">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs text-muted font-mono">
                        #{i + 1} &middot; <span className="text-brand-600 font-semibold">{s.student_id}</span>
                      </p>
                      <p className="text-sm font-semibold text-text truncate">{s.name}</p>

                      {s.phone ? (
                        <div className="flex items-center gap-2 pt-0.5">
                          <a
                            href={`tel:${cleanPhone}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                          >
                            <Phone size={12} />
                            <span className="font-mono">{s.phone}</span>
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-muted/60 italic">No phone added</p>
                      )}

                      {isAdmin && (
                        <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-bg-elevated border border-border">
                          <span className="text-[11px] text-muted">Pass:</span>
                          <span className="text-xs font-mono font-semibold text-text">
                            {visiblePasswords.has(s.id) ? normalizeAuthPassword(s.student_id) : '••••••'}
                          </span>
                          <button
                            onClick={() => togglePassword(s.id)}
                            className="text-muted hover:text-text transition-colors p-0.5 cursor-pointer"
                            title={visiblePasswords.has(s.id) ? 'Hide password' : 'Show password'}
                          >
                            {visiblePasswords.has(s.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant={badgeVariant(pStatus)}>{t(`students.status.${pStatus}`)}</Badge>
                        <span className="text-xs text-[#9FBBDE]">
                          Target: {formatCurrency(studentTargets[s.id] ?? classTargets[s.class_id || ''] ?? 0)}
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-text">
                          Paid: {formatCurrency((paymentData[s.id] ?? { total: 0, status: 'unpaid' }).total)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 justify-end">
                      {/* Calling & Reminding Buttons */}
                      {s.phone && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${cleanPhone}`}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
                              isUnpaid
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-bg-elevated hover:bg-border text-secondary border border-border'
                            }`}
                            title={`Call ${s.name}`}
                          >
                            <PhoneCall size={12} />
                            <span>Call</span>
                          </a>
                          {isUnpaid && (
                            <a
                              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(reminderMsg)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                              title={`WhatsApp reminder to ${s.name}`}
                            >
                              <MessageSquare size={12} />
                              <span>WA</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Super Admin Only: Edit and Delete buttons */}
                      {isSuperAdmin && (
                        <div className="flex items-center gap-1 border-l border-border/50 pl-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditStudent({
                                id: s.id,
                                student_id: s.student_id,
                                name: s.name,
                                phone: s.phone,
                                class_id: s.class_id ?? undefined,
                              })
                              setShowForm(true)
                            }}
                            title="Edit student"
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(s.id)}
                            title="Delete student"
                          >
                            <Trash2 size={15} className="text-error" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
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
