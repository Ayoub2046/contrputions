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
import { adminCreateUser, adminDeleteUser } from '../../lib/admin-api'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { ROLES } from '../../lib/constants'
import { Shield, UserPlus, Trash2, BookOpen } from 'lucide-react'
import type { Profile } from '../../lib/types'

export function AdminsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { admins, adminClasses, loading, refetch } = useAdmins()

  if (user?.role !== ROLES.SUPER_ADMIN) return <Navigate to="/dashboard" replace />
  const [assignTarget, setAssignTarget] = useState<Profile | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null)

  const [sid, setSid] = useState('')
  const [name, setName] = useState('')
  const [pwd, setPwd] = useState('')
  const [msg, setMsg] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!sid.trim() || !name.trim() || !pwd.trim()) return
    setCreating(true)
    setMsg('')
    const { error } = await adminCreateUser(sid.trim(), name.trim(), pwd.trim(), null, 'admin')
    if (error) setMsg(error)
    else {
      setMsg(t('admins.created'))
      setSid(''); setName(''); setPwd('')
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
                <Th>{t('admins.columns.classes')}</Th>
                <Th className="text-right">{t('admins.columns.actions')}</Th>
              </tr>
            </THead>
            <TBody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <Td className="font-mono text-sm text-muted">{a.student_id}</Td>
                  <Td className="font-medium text-text">{a.name}</Td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(adminClasses[a.id] ?? []).length === 0 ? (
                        <span className="text-xs text-muted">{t('admins.noClasses')}</span>
                      ) : (
                        (adminClasses[a.id] ?? []).map((cn, i) => (
                          <Badge key={i} variant="default">{cn}</Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setAssignTarget(a)} title={t('admins.assignClasses.title', { name: a.name })}>
                        <BookOpen size={16} />
                      </Button>
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
                    <p className="font-semibold text-text">{a.name}</p>
                    <p className="text-xs font-mono text-muted">{a.student_id}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(adminClasses[a.id] ?? []).length === 0 ? (
                        <span className="text-xs text-muted">{t('admins.noClasses')}</span>
                      ) : (
                        (adminClasses[a.id] ?? []).map((cn, i) => (
                          <Badge key={i} variant="default" className="text-[10px] px-2 py-0.5">{cn}</Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setAssignTarget(a)}><BookOpen size={16} /></Button>
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
    </div>
  )
}
