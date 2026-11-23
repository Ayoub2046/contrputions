import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, TBody, Td, Th, THead } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { ClassForm } from './ClassForm'
import { AssignAdminsModal } from './AssignAdminsModal'
import { useClasses } from './useClasses'
import { ROLES } from '../../lib/constants'
import { formatCurrency } from '../../lib/utils'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Plus, Pencil, Trash2, UserPlus, School, Calendar } from 'lucide-react'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function AdminClassesView({ classes, loading }: { classes: any[]; loading: boolean }) {
  const { t } = useTranslation()
  if (loading) return <Card><CardContent className="py-8"><SkeletonTable rows={3} cols={3} /></CardContent></Card>
  if (classes.length === 0) return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center gap-3 text-muted">
        <School size={40} className="text-muted/50" />
        <p>{t('classes.admin.none')}</p>
      </CardContent>
    </Card>
  )
  return (
    <>
      {/* Desktop */}
      <Card className="hidden lg:block">
        <Table>
          <THead>
            <tr>
              <Th>{t('classes.admin.columns.className')}</Th>
              <Th>{t('classes.admin.columns.target')}</Th>
              <Th>{t('classes.admin.columns.created')}</Th>
            </tr>
          </THead>
          <TBody>
            {classes.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium text-text">{c.name}</Td>
                <Td className="text-secondary">{formatCurrency(c.contribution_target || 0)}</Td>
                <Td className="text-secondary"><Badge variant="default">{formatDate(c.created_at)}</Badge></Td>
              </tr>
            ))}
          </TBody>
        </Table>
      </Card>
      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {classes.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-text">{c.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span>{t('classes.admin.columns.target')}: {formatCurrency(c.contribution_target || 0)}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(c.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

export function ClassesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { classes, loading, create, update, remove } = useClasses()
  const [showForm, setShowForm] = useState(false)
  const [editClass, setEditClass] = useState<{ id: string; name: string } | null>(null)
  const [assignTo, setAssignTo] = useState<{ id: string; name: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (user?.role !== ROLES.SUPER_ADMIN) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text">{t('classes.admin.title')}</h1>
        <AdminClassesView classes={classes} loading={loading} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-text">{t('classes.superAdmin.title')}</h1>
        <Button onClick={() => { setEditClass(null); setShowForm(true) }}>
          <Plus size={16} /> {t('classes.superAdmin.new')}
        </Button>
      </div>

      {/* Desktop */}
      <Card className="hidden lg:block">
        {loading ? (
          <CardContent className="py-8"><SkeletonTable rows={4} cols={3} /></CardContent>
        ) : classes.length === 0 ? (
          <CardContent className="py-8 text-center text-muted">{t('classes.superAdmin.none')}</CardContent>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('classes.superAdmin.columns.name')}</Th>
                <Th>{t('classes.superAdmin.columns.created')}</Th>
                <Th className="text-right">{t('classes.superAdmin.columns.actions')}</Th>
              </tr>
            </THead>
            <TBody>
              {classes.map((c) => (
                <tr key={c.id}>
                  <Td className="font-medium text-text">{c.name}</Td>
                  <Td className="text-secondary">
                    <Badge variant="default">{formatDate(c.created_at)}</Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setAssignTo({ id: c.id, name: c.name })}>
                        <UserPlus size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditClass(c); setShowForm(true) }}>
                        <Pencil size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(c.id)}>
                        <Trash2 size={16} className="text-error" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <Card><CardContent className="py-8"><SkeletonTable rows={3} cols={2} /></CardContent></Card>
        ) : classes.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted">{t('classes.superAdmin.none')}</CardContent></Card>
        ) : (
          classes.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-text">{c.name}</p>
                    <p className="text-xs text-muted"><Calendar size={12} className="inline mr-1" />{formatDate(c.created_at)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setAssignTo({ id: c.id, name: c.name })}><UserPlus size={16} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditClass(c); setShowForm(true) }}><Pencil size={16} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(c.id)}><Trash2 size={16} className="text-error" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editClass ? t('classes.modal.edit') : t('classes.modal.new')}>
          <ClassForm
            initial={editClass ?? undefined}
            onSave={async (name, target) => editClass ? update(editClass.id, name, target) : create(name, target)}
            onCancel={() => setShowForm(false)}
          />
      </Modal>

      {assignTo && (
        <AssignAdminsModal
          classId={assignTo.id}
          className={assignTo.name}
          open={!!assignTo}
          onClose={() => setAssignTo(null)}
        />
      )}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={t('classes.modal.delete')}>
        <p className="text-sm text-secondary mb-4">{t('classes.modal.deleteConfirm')}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>{t('classes.modal.cancel')}</Button>
          <Button variant="danger" onClick={async () => {
            if (confirmDelete) await remove(confirmDelete)
            setConfirmDelete(null)
          }}>{t('classes.modal.delete')}</Button>
        </div>
      </Modal>
    </div>
  )
}
