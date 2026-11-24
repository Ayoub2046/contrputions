import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ClassForm } from './ClassForm'
import { AssignAdminsModal } from './AssignAdminsModal'
import { useClasses, type ClassWithMetrics } from './useClasses'
import { useStudents } from '../students/useStudents'
import { StudentImport } from '../students/StudentImport'
import { StudentForm } from '../students/StudentForm'
import { ROLES } from '../../lib/constants'
import { formatCurrency } from '../../lib/utils'
import {
  Plus, Pencil, Trash2, UserPlus, School, Calendar,
  TrendingUp, Users, Target, ChevronRight, GraduationCap,
  Upload, DollarSign
} from 'lucide-react'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Card shown for each class — used by both super_admin and regular admin */
function ClassCard({
  c,
  canEdit,
  onEdit,
  onAssign,
  onDelete,
  onImportStudents,
  onAddStudent,
  onSelectClass,
}: {
  c: ClassWithMetrics
  canEdit: boolean
  onEdit?: () => void
  onAssign?: () => void
  onDelete?: () => void
  onImportStudents?: () => void
  onAddStudent?: () => void
  onSelectClass: () => void
}) {
  const target = c.contribution_target || 0

  return (
    <div className="group relative flex flex-col rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#1176BC] to-[#25A8E0]" />

      <div className="flex flex-col flex-1 p-5 gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div
            onClick={onSelectClass}
            className="flex items-center gap-3 cursor-pointer min-w-0"
            title="Click to select this class"
          >
            <div className="size-11 rounded-xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              <GraduationCap size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-[#1a2332] dark:text-[#e8f0f8] truncate hover:text-[#1176BC] transition-colors">
                {c.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-[#9FBBDE] mt-0.5">
                <Calendar size={11} />
                <span>{formatDate(c.created_at)}</span>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-1 shrink-0">
              {onAssign && (
                <button
                  onClick={onAssign}
                  title="Assign Admins"
                  className="p-1.5 rounded-lg hover:bg-[#EAF4FB] dark:hover:bg-[#1176BC]/20 text-[#9FBBDE] hover:text-[#1176BC] transition-colors cursor-pointer"
                >
                  <UserPlus size={15} />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={onEdit}
                  title="Edit Class"
                  className="p-1.5 rounded-lg hover:bg-[#EAF4FB] dark:hover:bg-[#1176BC]/20 text-[#9FBBDE] hover:text-[#1176BC] transition-colors cursor-pointer"
                >
                  <Pencil size={15} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  title="Delete Class"
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[#9FBBDE] hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Total Enrolled Students */}
          <div className="rounded-xl bg-[#EAF4FB] dark:bg-[#0d2a40] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Users size={12} className="text-[#1176BC]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9FBBDE]">Enrolled</span>
            </div>
            <p className="text-base font-bold text-[#1176BC] tabular-nums">
              {c.student_count} <span className="text-xs font-normal text-[#9FBBDE]">students</span>
            </p>
          </div>

          {/* Total Income */}
          <div className="rounded-xl bg-[#f0fdf4] dark:bg-[#064e3b]/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign size={12} className="text-[#0C9B5E]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9FBBDE]">Total Income</span>
            </div>
            <p className="text-base font-bold text-[#0C9B5E] tabular-nums">
              {formatCurrency(c.total_income || 0)}
            </p>
          </div>

          {/* Target Amount */}
          <div className="rounded-xl bg-[#ECECEC]/60 dark:bg-[#1a2d42] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Target size={12} className="text-[#1176BC]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9FBBDE]">Target / Student</span>
            </div>
            <p className="text-sm font-bold text-[#1176BC] tabular-nums">
              {formatCurrency(target)}
            </p>
          </div>

          {/* Target Pool */}
          <div className="rounded-xl bg-[#ECECEC]/60 dark:bg-[#1a2d42] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={12} className="text-[#25A8E0]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9FBBDE]">Target Pool</span>
            </div>
            <p className="text-sm font-bold text-[#25A8E0] tabular-nums">
              {formatCurrency(target * (c.student_count || 1))}
            </p>
          </div>
        </div>

        {/* Direct Action Buttons on Card */}
        <div className="pt-2 border-t border-[#ECECEC] dark:border-[#1e3550] flex items-center justify-between gap-2 mt-auto">
          {onImportStudents && onAddStudent ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onImportStudents}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EAF4FB] dark:bg-[#0d2a40] hover:bg-[#1176BC] hover:text-white text-xs font-semibold text-[#1176BC] transition-all cursor-pointer shadow-2xs"
                title="Import CSV students directly into this class (Super Admin only)"
              >
                <Upload size={12} />
                <span>Import CSV</span>
              </button>
              <button
                onClick={onAddStudent}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#132033] hover:bg-[#EAF4FB] dark:hover:bg-[#0d2a40] border border-[#ECECEC] dark:border-[#1e3550] text-xs font-semibold text-[#1a2332] dark:text-[#e8f0f8] transition-all cursor-pointer shadow-2xs"
                title="Add individual student to this class (Super Admin only)"
              >
                <Plus size={12} />
                <span>Add Student</span>
              </button>
            </div>
          ) : (
            <span className="text-xs text-[#9FBBDE] font-medium">Assigned Class View</span>
          )}

          <button
            onClick={onSelectClass}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1176BC] hover:underline transition-colors cursor-pointer ml-auto"
            title="View students in this class"
          >
            <span>View Students</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminClassesView({
  classes,
  loading,
  onSelectClass,
}: {
  classes: ClassWithMetrics[]
  loading: boolean
  onSelectClass: (cls: ClassWithMetrics) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 animate-pulse">
            <div className="h-11 w-11 rounded-xl bg-[#ECECEC] dark:bg-[#1e3550] mb-4" />
            <div className="h-5 w-32 bg-[#ECECEC] dark:bg-[#1e3550] rounded mb-2" />
            <div className="h-3 w-24 bg-[#ECECEC] dark:bg-[#1e3550] rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#9FBBDE]/40 bg-white dark:bg-[#132033] py-16 flex flex-col items-center gap-3 text-[#9FBBDE]">
        <School size={44} className="opacity-40" />
        <p className="text-sm font-medium">No classes assigned yet</p>
        <p className="text-xs text-[#C6CACB]">Contact your super admin to assign you to a class.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {classes.map((c) => (
        <ClassCard
          key={c.id}
          c={c}
          canEdit={false}
          onSelectClass={() => onSelectClass(c)}
        />
      ))}
    </div>
  )
}

export function ClassesPage() {
  const { t } = useTranslation()
  const { user, setActiveClassId } = useAuth()
  const navigate = useNavigate()
  const { classes, loading, create, update, remove, refetch } = useClasses()
  const { create: createStudent, importCSV } = useStudents(null)

  const [showForm, setShowForm] = useState(false)
  const [editClass, setEditClass] = useState<{ id: string; name: string; contribution_target?: number } | null>(null)
  const [assignTo, setAssignTo] = useState<{ id: string; name: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Direct Student Import & Add Modals in Classes Page
  const [targetClassForImport, setTargetClassForImport] = useState<ClassWithMetrics | null>(null)
  const [targetClassForAdd, setTargetClassForAdd] = useState<ClassWithMetrics | null>(null)

  function handleSelectClass(c: ClassWithMetrics) {
    setActiveClassId(c.id)
    navigate('/students')
  }

  const availableClassesForImport = classes.map((c) => ({ id: c.id, name: c.name }))

  if (user?.role !== ROLES.SUPER_ADMIN) {
    return (
      <div className="space-y-6 w-full max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] flex items-center justify-center shadow-sm">
            <School size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a2332] dark:text-[#e8f0f8]">My Classes</h1>
            <p className="text-xs text-[#9FBBDE]">Classes assigned to your admin account</p>
          </div>
        </div>
        <AdminClassesView
          classes={classes}
          loading={loading}
          onSelectClass={handleSelectClass}
        />

        {/* Import Students Modal */}
        {targetClassForImport && (
          <Modal
            open={!!targetClassForImport}
            onClose={() => { setTargetClassForImport(null); refetch() }}
            title={`📥 Import Students into "${targetClassForImport.name}"`}
          >
            <StudentImport
              availableClasses={availableClassesForImport}
              selectedClassId={targetClassForImport.id}
              onSelectClassId={(id) => {
                const found = classes.find((c) => c.id === id)
                if (found) setTargetClassForImport(found)
              }}
              onImport={async (rows, targetClassId) => {
                const res = await importCSV(rows, targetClassId)
                refetch()
                return res
              }}
            />
          </Modal>
        )}

        {/* Add Individual Student Modal */}
        {targetClassForAdd && (
          <Modal
            open={!!targetClassForAdd}
            onClose={() => { setTargetClassForAdd(null); refetch() }}
            title={`👤 Add Student to "${targetClassForAdd.name}"`}
          >
            <StudentForm
              classId={targetClassForAdd.id}
              classes={availableClassesForImport}
              onSave={async (studentId, name, password, classId, phone) => {
                const err = await createStudent(studentId, name, password || studentId, classId || targetClassForAdd.id, phone)
                if (!err) {
                  setTargetClassForAdd(null)
                  refetch()
                }
                return err
              }}
              onCancel={() => setTargetClassForAdd(null)}
            />
          </Modal>
        )}
      </div>
    )
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    await remove(confirmDelete)
    setConfirmDelete(null)
    setDeleting(false)
  }

  const confirmClass = classes.find((c) => c.id === confirmDelete)
  const totalStudentsEnrolled = classes.reduce((s, c) => s + (c.student_count || 0), 0)
  const totalIncomeAll = classes.reduce((s, c) => s + (c.total_income || 0), 0)
  const totalTargetPool = classes.reduce((s, c) => s + (c.contribution_target || 0) * (c.student_count || 1), 0)

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] flex items-center justify-center shadow-md">
            <School size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a2332] dark:text-[#e8f0f8]">
              {t('classes.superAdmin.title')}
            </h1>
            <p className="text-xs text-[#9FBBDE]">{classes.length} registered class{classes.length !== 1 ? 'es' : ''}</p>
          </div>
        </div>

        <button
          onClick={() => { setEditClass(null); setShowForm(true) }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1176BC] to-[#25A8E0] text-white text-sm font-semibold shadow-sm hover:shadow-md hover:opacity-95 transition-all cursor-pointer active:scale-95"
        >
          <Plus size={16} />
          {t('classes.superAdmin.new')}
        </button>
      </div>

      {/* Stats strip */}
      {!loading && classes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Classes', value: classes.length, icon: School, color: '#1176BC', bg: '#EAF4FB' },
            {
              label: 'Total Students',
              value: `${totalStudentsEnrolled} enrolled`,
              icon: Users,
              color: '#25A8E0',
              bg: '#EAF4FB',
            },
            {
              label: 'Total Income',
              value: formatCurrency(totalIncomeAll),
              icon: DollarSign,
              color: '#0C9B5E',
              bg: '#f0fdf4',
            },
            {
              label: 'Total Target Pool',
              value: formatCurrency(totalTargetPool),
              icon: Target,
              color: '#d97706',
              bg: '#fffbeb',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-4 flex items-center gap-3 shadow-2xs"
            >
              <div
                className="size-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: stat.bg }}
              >
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#9FBBDE] font-medium">{stat.label}</p>
                <p className="text-base font-bold text-[#1a2332] dark:text-[#e8f0f8] truncate">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Class cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 animate-pulse">
              <div className="h-11 w-11 rounded-xl bg-[#ECECEC] dark:bg-[#1e3550] mb-4" />
              <div className="h-5 w-32 bg-[#ECECEC] dark:bg-[#1e3550] rounded mb-2" />
              <div className="h-3 w-24 bg-[#ECECEC] dark:bg-[#1e3550] rounded mb-4" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-14 rounded-xl bg-[#ECECEC] dark:bg-[#1e3550]" />
                <div className="h-14 rounded-xl bg-[#ECECEC] dark:bg-[#1e3550]" />
              </div>
            </div>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#9FBBDE]/40 bg-white dark:bg-[#132033] py-20 flex flex-col items-center gap-3 text-[#9FBBDE]">
          <School size={48} className="opacity-30" />
          <p className="text-base font-semibold text-[#1a2332] dark:text-[#e8f0f8]">No classes yet</p>
          <p className="text-sm text-[#9FBBDE]">Click "New Class" to create your first class.</p>
          <button
            onClick={() => { setEditClass(null); setShowForm(true) }}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1176BC] text-white text-sm font-semibold hover:bg-[#0D5A8A] transition-colors cursor-pointer"
          >
            <Plus size={15} /> Create First Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes.map((c) => (
            <ClassCard
              key={c.id}
              c={c}
              canEdit={true}
              onEdit={() => { setEditClass(c); setShowForm(true) }}
              onAssign={() => setAssignTo({ id: c.id, name: c.name })}
              onDelete={() => setConfirmDelete(c.id)}
              onImportStudents={() => setTargetClassForImport(c)}
              onAddStudent={() => setTargetClassForAdd(c)}
              onSelectClass={() => handleSelectClass(c)}
            />
          ))}
        </div>
      )}

      {/* Direct CSV Import Modal in Classes Page */}
      {targetClassForImport && (
        <Modal
          open={!!targetClassForImport}
          onClose={() => { setTargetClassForImport(null); refetch() }}
          title={`📥 Import Students into "${targetClassForImport.name}"`}
        >
          <StudentImport
            availableClasses={availableClassesForImport}
            selectedClassId={targetClassForImport.id}
            onSelectClassId={(id) => {
              const found = classes.find((c) => c.id === id)
              if (found) setTargetClassForImport(found)
            }}
            onImport={async (rows, targetClassId) => {
              const res = await importCSV(rows, targetClassId)
              refetch()
              return res
            }}
          />
        </Modal>
      )}

      {/* Direct Add Individual Student Modal in Classes Page */}
      {targetClassForAdd && (
        <Modal
          open={!!targetClassForAdd}
          onClose={() => { setTargetClassForAdd(null); refetch() }}
          title={`👤 Add Student to "${targetClassForAdd.name}"`}
        >
          <StudentForm
            classId={targetClassForAdd.id}
            classes={availableClassesForImport}
            onSave={async (studentId, name, password, classId, phone) => {
              const err = await createStudent(studentId, name, password || studentId, classId || targetClassForAdd.id, phone)
              if (!err) {
                setTargetClassForAdd(null)
                refetch()
              }
              return err
            }}
            onCancel={() => setTargetClassForAdd(null)}
          />
        </Modal>
      )}

      {/* Create / Edit Class Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditClass(null) }}
        title={editClass ? t('classes.form.editTitle') : t('classes.superAdmin.new')}
      >
        <ClassForm
          initial={editClass ?? undefined}
          onSave={async (name, target) => {
            const err = editClass
              ? await update(editClass.id, name, target)
              : await create(name, target)
            if (!err) { setShowForm(false); setEditClass(null) }
            return err
          }}
          onCancel={() => { setShowForm(false); setEditClass(null) }}
        />
      </Modal>

      {/* Assign Admins Modal */}
      {assignTo && (
        <AssignAdminsModal
          open={!!assignTo}
          onClose={() => setAssignTo(null)}
          classId={assignTo.id}
          className={assignTo.name}
        />
      )}

      {/* Delete Confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Class"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#4a5a72] dark:text-[#9FBBDE]">
            Are you sure you want to delete{' '}
            <span className="font-bold text-[#1a2332] dark:text-[#e8f0f8]">"{confirmClass?.name}"</span>?
            This will permanently remove all associated data.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={handleDelete}
            >
              <Trash2 size={15} /> Delete Class
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
