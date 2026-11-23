import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { Profile, Class } from '../../lib/types'

interface AssignClassesModalProps {
  admin: Profile
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function AssignClassesModal({ admin, open, onClose, onUpdated }: AssignClassesModalProps) {
  const { t } = useTranslation()
  const [currentClasses, setCurrentClasses] = useState<Class[]>([])
  const [availableClasses, setAvailableClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open || !admin) return
    setLoading(true)
    setMessage('')

    supabase
      .from('class_admins')
      .select('class_id, classes!class_admins_class_id_fkey(*)')
      .eq('admin_id', admin.id)
      .then(({ data }) => {
        const assigned: Class[] = data?.map((r: any) => r.classes as Class) ?? []
        setCurrentClasses(assigned)
        const assignedIds = assigned.map((c) => c.id)

        supabase
          .from('classes')
          .select('*')
          .order('name')
          .then(({ data: all }) => {
            const avail = (all ?? []).filter((c) => !assignedIds.includes(c.id))
            setAvailableClasses(avail)
            setLoading(false)
          })
      })
  }, [open, admin])

  async function assignClass(classId: string) {
    setMessage('')
    const { error } = await supabase.from('class_admins').insert({
      class_id: classId,
      admin_id: admin.id,
    } as never)
    if (error) setMessage(error.message)
    else {
      setMessage(t('admins.assignClasses.assigned'))
      onUpdated()
    }
  }

  async function removeClass(classId: string) {
    setMessage('')
    const { error } = await supabase
      .from('class_admins')
      .delete()
      .eq('class_id', classId)
      .eq('admin_id', admin.id)
    if (error) setMessage(error.message)
    else {
      setMessage(t('admins.assignClasses.removed'))
      onUpdated()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('admins.assignClasses.title', { name: admin.name })}>
      <div className="space-y-4">
        {message && (
          <p className="text-sm text-secondary bg-bg-elevated rounded-btn px-3 py-2 border border-border">{message}</p>
        )}

        <div>
          <h3 className="text-sm font-medium text-secondary mb-2">{t('admins.assignClasses.currentClasses')}</h3>
          {loading ? (
            <p className="text-sm text-muted">{t('admins.assignClasses.loading')}</p>
          ) : currentClasses.length === 0 ? (
            <p className="text-sm text-muted">{t('admins.assignClasses.noClasses')}</p>
          ) : (
            <ul className="space-y-1">
              {currentClasses.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-text font-medium">{c.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeClass(c.id)}>
                    {t('admins.assignClasses.remove')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {availableClasses.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-secondary mb-2">{t('admins.assignClasses.availableClasses')}</h3>
            <ul className="space-y-1">
              {availableClasses.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-text">{c.name}</span>
                  <Button variant="secondary" size="sm" onClick={() => assignClass(c.id)}>
                    {t('admins.assignClasses.assign')}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}
