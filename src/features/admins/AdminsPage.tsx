import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table, TBody, Td, Th, THead } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useAdmins } from './useAdmins'
import { AssignClassesModal } from './AssignClassesModal'
import { adminCreateUser, adminDeleteUser, adminUpdateUser } from '../../lib/admin-api'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { ROLES } from '../../lib/constants'
import { normalizeAuthPassword } from '../../lib/utils'
import { Shield, UserPlus, Trash2, BookOpen, Pencil, Eye, EyeOff } from 'lucide-react'
import type { Profile } from '../../lib/types'

export function AdminsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { admins, adminClasses, adminPasswords, loading, refetch } = useAdmins()

  if (user?.role !== ROLES.SUPER_ADMIN) return <Navigate to="/dashboard" replace />
  const [assignTarget, setAssignTarget] = useState<Profile | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null)

  // Password reveal state
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  function togglePassword(id: string) {
    setVisiblePasswords((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Edit Admin state
  const [editAdmin, setEditAdmin] = useState<Profile | null>(null)
  const [editSid, setEditSid] = useState('')
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState<'admin' | 'finance_manager'>('admin')
  const [editPwd, setEditPwd] = useState('')
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [sid, setSid] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'admin' | 'finance_manager'>('admin')
  const [pwd, setPwd] = useState('')
  const [msg, setMsg] = useState('')
  const [creating, setCreating] = useState(false)

  function handleStartEdit(admin: Profile) {
    setEditAdmin(admin)
    setEditSid(admin.student_id)
    setEditName(admin.name)
    setEditPhone(admin.phone || '')
    setEditRole((admin.role as any) === 'finance_manager' ? 'finance_manager' : 'admin')
    setEditPwd('')
    setEditError('')
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editAdmin) return
    if (!editSid.trim() || !editName.trim()) {
      setEditError('Admin ID and Name are required.')
      return
    }
    setSavingEdit(true)
    setEditError('')
    const updates: { student_id?: string; name?: string; phone?: string | null; password?: string; role?: string } = {
      student_id: editSid.trim(),
      name: editName.trim(),
      phone: editPhone.trim() || null,
      role: editRole,
    }
    if (editPwd.trim()) {
      updates.password = editPwd.trim()
    }
    const { error } = await adminUpdateUser(editAdmin.id, updates)
    if (error) {
      setEditError(error)
      setSavingEdit(false)
    } else {
      setEditAdmin(null)
      setSavingEdit(false)
      refetch()
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!sid.trim() || !name.trim() || !pwd.trim()) return
    setCreating(true)
    setMsg('')
    const { error } = await adminCreateUser(sid.trim(), name.trim(), pwd.trim(), null, role, phone.trim() || null)
    if (error) setMsg(error)
    else {
      setMsg(t('admins.created'))
      setSid(''); setName(''); setPhone(''); setPwd(''); setRole('admin')
      refetch()
    }
    setCreating(false)
  }

  async function handleDelete(profile: Profile) {
    await supabase.from('profiles').delete().eq('id', profile.id)
    await adminDeleteUser(profile.id)
    setConfirmDelete(null)
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <Shield size={22} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">{t('admins.title')}</h1>
          <p className="text-sm text-muted">{t('admins.subtitle')}</p>
        </div>
      </div>

      <Card className="hidden lg:block">
        {loading ? (
          <CardContent className="py-8 text-center text-muted">{t('admins.loading')}</CardContent>
        ) : admins.length === 0 ? (
          <CardContent className="py-12 flex flex-col items-center gap-3 text-muted">
            <Shield size={40} className="text-muted/50" />
            <p>{t('admins.none')}</p>
          </CardContent>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('admins.columns.id')}</Th>
                <Th>{t('admins.columns.name')}</Th>
                <Th>Role</Th>
                <Th>Phone</Th>
                <Th>{t('admins.columns.classes')}</Th>
                <Th>🔑 Password</Th>
                <Th className="text-right">{t('admins.columns.actions')}</Th>
              </tr>
            </THead>
            <TBody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <Td className="font-mono text-sm text-muted">{a.student_id}</Td>
                  <Td className="font-medium text-text">{a.name}</Td>
                  <Td>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      a.role === 'finance_manager'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-500/20'
                        : 'bg-[#EAF4FB] dark:bg-[#0d2a40] text-[#1176BC] dark:text-[#25A8E0] border-[#9FBBDE]/30'
                    }`}>
                      {a.role === 'finance_manager' ? '💼 Finance Manager' : '🛡️ Class Admin'}
                    </span>
                  </Td>
                  <Td className="text-xs font-mono font-medium text-emerald-600">
                    {a.phone ? (
                      <a href={`tel:${a.phone}`} className="hover:underline">
                        📞 {a.phone}
                      </a>
                    ) : (
                      <span className="text-muted/60 italic">No phone</span>
                    )}
                  </Td>
                  <td className="px-4 py-3">
                    {a.role === 'finance_manager' ? (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        🌐 All Classes (Global Finance)
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(adminClasses[a.id] ?? []).length === 0 ? (
                          <span className="text-xs text-muted">{t('admins.noClasses')}</span>
                        ) : (
                          (adminClasses[a.id] ?? []).map((cn, i) => (
                            <Badge key={i} variant="default">{cn}</Badge>
                          ))
                        )}
                      </div>
                    )}
                  </td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-[#ECECEC]/70 dark:bg-[#1a2d42] text-text min-w-[70px] select-all">
                        {visiblePasswords.has(a.id)
                          ? (adminPasswords[a.id] || normalizeAuthPassword(a.student_id))
                          : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePassword(a.id)}
                        className="p-1 rounded-lg hover:bg-bg-elevated text-muted hover:text-text transition-colors cursor-pointer"
                        title={visiblePasswords.has(a.id) ? "Hide Password" : "Show Password"}
                      >
                        {visiblePasswords.has(a.id) ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </Td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleStartEdit(a)} title="Edit Admin">
                        <Pencil size={16} />
                      </Button>
                      {a.role !== 'finance_manager' && (
                        <Button variant="ghost" size="sm" onClick={() => setAssignTarget(a)} title={t('admins.assignClasses.title', { name: a.name })}>
                          <BookOpen size={16} />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(a)}>
                        <Trash2 size={16} className="text-error" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <div className="lg:hidden space-y-3">
        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted">{t('admins.loading')}</CardContent></Card>
        ) : admins.length === 0 ? (
          <Card><CardContent className="py-12 flex flex-col items-center gap-3 text-muted">
            <Shield size={40} className="text-muted/50" />
            <p>{t('admins.none')}</p>
          </CardContent></Card>
        ) : (
          admins.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-text">{a.name}</p>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                        a.role === 'finance_manager'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-500/20'
                          : 'bg-[#EAF4FB] dark:bg-[#0d2a40] text-[#1176BC] dark:text-[#25A8E0] border-[#9FBBDE]/30'
                      }`}>
                        {a.role === 'finance_manager' ? '💼 Finance' : '🛡️ Admin'}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-muted">{a.student_id}</p>
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span className="text-[11px] text-muted">Password:</span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#ECECEC]/70 dark:bg-[#1a2d42] text-text select-all">
                        {visiblePasswords.has(a.id)
                          ? (adminPasswords[a.id] || normalizeAuthPassword(a.student_id))
                          : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePassword(a.id)}
                        className="p-1 rounded-lg text-muted hover:text-text cursor-pointer"
                        title={visiblePasswords.has(a.id) ? "Hide Password" : "Show Password"}
                      >
                        {visiblePasswords.has(a.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {a.role === 'finance_manager' ? (
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          🌐 All Classes (Global Finance)
                        </span>
                      ) : (adminClasses[a.id] ?? []).length === 0 ? (
                        <span className="text-xs text-muted">{t('admins.noClasses')}</span>
                      ) : (
                        (adminClasses[a.id] ?? []).map((cn, i) => (
                          <Badge key={i} variant="default" className="text-[10px] px-2 py-0.5">{cn}</Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleStartEdit(a)} title="Edit Admin"><Pencil size={16} /></Button>
                    {a.role !== 'finance_manager' && (
                      <Button variant="ghost" size="sm" onClick={() => setAssignTarget(a)}><BookOpen size={16} /></Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(a)}><Trash2 size={16} className="text-error" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="size-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
              <UserPlus size={18} className="text-brand-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-text mb-3">{t('admins.createAdmin')}</h2>
              <form onSubmit={handleCreate} className="space-y-3 max-w-md">
                <Input id="admin-sid" label={t('admins.form.adminId')} value={sid} onChange={(e) => setSid(e.target.value)} required />
                <Input id="admin-name" label={t('admins.form.name')} value={name} onChange={(e) => setName(e.target.value)} required />
                
                {/* Role Selection */}
                <div className="space-y-1">
                  <label htmlFor="admin-role-select" className="text-xs font-semibold text-text block">
                    Administrative Role Scope *
                  </label>
                  <select
                    id="admin-role-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'finance_manager')}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-bg-card text-xs font-semibold text-text focus:outline-hidden focus:border-brand-600 cursor-pointer"
                  >
                    <option value="admin">🛡️ Class Administrator (Manage assigned classes & calling)</option>
                    <option value="finance_manager">💼 Finance Manager (Global read-only finance & reports)</option>
                  </select>
                  <p className="text-[10px] text-muted">
                    {role === 'finance_manager'
                      ? 'Finance Managers can view all classes income, reports, and unpaid lists in read-only mode.'
                      : 'Class Administrators record contributions and call unpaid students for their assigned classes.'}
                  </p>
                </div>

                <Input id="admin-phone" label="Contact Phone Number (For Student Calling)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +252 61 5000000" />
                <Input id="admin-pwd" label={t('admins.form.password')} type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
                <Button type="submit" loading={creating}>{t('admins.form.submit')}</Button>
                {msg && <p className="text-sm text-secondary">{msg}</p>}
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      {assignTarget && (
        <AssignClassesModal
          admin={assignTarget}
          open={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          onUpdated={() => { refetch(); setAssignTarget(null) }}
        />
      )}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={t('admins.delete.title')}>
        <p className="text-sm text-secondary mb-4">
          {t('admins.delete.confirm', { name: confirmDelete?.name ?? '' })}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            {t('admins.delete.cancel')}
          </Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>
            {t('admins.delete.delete')}
          </Button>
        </div>
      </Modal>

      {/* Edit Admin Modal */}
      {editAdmin && (
        <Modal
          open={!!editAdmin}
          onClose={() => setEditAdmin(null)}
          title={`Edit Admin: ${editAdmin.name}`}
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              id="edit-admin-sid"
              label={t('admins.form.adminId')}
              value={editSid}
              onChange={(e) => setEditSid(e.target.value)}
              required
            />
            <Input
              id="edit-admin-name"
              label={t('admins.form.name')}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            
            {/* Role Selection */}
            <div className="space-y-1">
              <label htmlFor="edit-admin-role-select" className="text-xs font-semibold text-text block">
                Administrative Role Scope *
              </label>
              <select
                id="edit-admin-role-select"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as 'admin' | 'finance_manager')}
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg-card text-xs font-semibold text-text focus:outline-hidden focus:border-brand-600 cursor-pointer"
              >
                <option value="admin">🛡️ Class Administrator</option>
                <option value="finance_manager">💼 Finance Manager (Global Read-Only Finance)</option>
              </select>
            </div>

            <Input
              id="edit-admin-phone"
              label="Contact Phone Number (For Student Calling)"
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="e.g. +252 61 5000000"
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text block">Current Stored Password</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={adminPasswords[editAdmin.id] || normalizeAuthPassword(editAdmin.student_id)}
                  className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-border bg-bg-elevated/40 text-text select-all cursor-text font-semibold"
                />
              </div>
            </div>
            <Input
              id="edit-admin-pwd"
              label="New Password (optional)"
              type="password"
              value={editPwd}
              onChange={(e) => setEditPwd(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
            {editError && (
              <p className="text-sm text-error bg-error/10 rounded-btn px-3 py-2 border border-error/20">
                {editError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditAdmin(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={savingEdit}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
