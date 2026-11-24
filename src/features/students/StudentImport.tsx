import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Upload, FileDown, CheckCircle2, AlertTriangle, School } from 'lucide-react'
import { parseStudentCsv, type ParsedStudentRow } from './csvStudentParser'

interface StudentImportProps {
  availableClasses: { id: string; name: string }[]
  selectedClassId: string
  onSelectClassId: (classId: string) => void
  onImport: (rows: ParsedStudentRow[], targetClassId: string) => Promise<string[]>
}

export function StudentImport({
  availableClasses,
  selectedClassId,
  onSelectClassId,
  onImport,
}: StudentImportProps) {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<string[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedClassName = availableClasses.find((c) => c.id === selectedClassId)?.name

  function downloadTemplate() {
    const csv = 'student_id,name,phone\nHS241220,Ubah Ali Adan,+252 61 2345678\nCIS241382,Abdufatah Ahmed Mohamed,+252 61 9876543'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!selectedClassId) {
      setErrors(['Please select a target class before importing students so they are assigned to the correct class.'])
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setErrors([])
    setSuccessMsg(null)
    setLoading(true)

    try {
      const text = await file.text()
      const { rows, parseErrors } = parseStudentCsv(text)

      if (rows.length === 0) {
        setErrors(parseErrors.length > 0 ? parseErrors : ['No valid student rows found in CSV file.'])
        setLoading(false)
        if (fileRef.current) fileRef.current.value = ''
        return
      }

      const importErrors = await onImport(rows, selectedClassId)
      const allErrors = [...parseErrors, ...importErrors]
      setErrors(allErrors)

      const successCount = rows.length - importErrors.length
      if (successCount > 0) {
        setSuccessMsg(
          `Successfully registered ${successCount} student${successCount > 1 ? 's' : ''} into "${selectedClassName || 'Class'}"! Passwords automatically set to their Student IDs.`
        )
      }
    } catch (err: any) {
      setErrors([err.message || 'Failed to read or process CSV file.'])
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Step 1: Mandatory Class Selection */}
      <div className="p-3.5 rounded-card border border-border bg-bg-elevated/40 space-y-2.5">
        <div className="flex items-center gap-2">
          <School size={16} className="text-brand-600 dark:text-brand-400" />
          <label className="text-xs font-bold text-text uppercase tracking-wider">
            Step 1: Assign to Class <span className="text-error font-bold">*</span>
          </label>
        </div>

        <select
          value={selectedClassId}
          onChange={(e) => {
            onSelectClassId(e.target.value)
            setErrors([])
            setSuccessMsg(null)
          }}
          className="w-full rounded-btn border border-border bg-bg-card px-3 py-2 text-sm text-text font-medium focus:outline-none focus:ring-2 focus:ring-brand-600/30"
        >
          <option value="">-- Choose Class to Assign Students (Required) --</option>
          {availableClasses.map((c) => (
            <option key={c.id} value={c.id}>
              📚 {c.name}
            </option>
          ))}
        </select>

        {selectedClassId ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-success bg-success/10 border border-success/20 px-3 py-2 rounded-btn">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>Target Class: <strong>{selectedClassName}</strong>. All imported students will be assigned here.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-medium text-warning bg-warning/10 border border-warning/20 px-3 py-2 rounded-btn">
            <AlertTriangle size={15} className="shrink-0 text-warning" />
            <span>Select a class above before uploading to avoid unassigned student records.</span>
          </div>
        )}
      </div>

      {/* Step 2: Upload CSV File */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-text uppercase tracking-wider block">
          Step 2: Upload Student CSV
        </label>

        <div className="flex gap-2 flex-wrap items-center">
          <Button variant="secondary" onClick={downloadTemplate}>
            <FileDown size={16} /> {t('import.template')}
          </Button>

          <label
            className={`cursor-pointer ${
              !selectedClassId || loading
                ? 'opacity-50 cursor-not-allowed pointer-events-none'
                : ''
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              disabled={!selectedClassId || loading}
              className="hidden"
            />
            <span
              className={`inline-flex items-center gap-2 rounded-btn border px-4 py-2 text-sm font-semibold transition-all ${
                selectedClassId
                  ? 'border-brand-600/40 bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
                  : 'border-border bg-bg-card text-muted cursor-not-allowed'
              }`}
            >
              <Upload size={16} /> {t('import.importCsv')}
            </span>
          </label>
        </div>

        <p className="text-xs text-muted">
          Smart ID Detection: Works with any student list CSV. Passwords are automatically set to each student's exact ID.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-brand-600 font-medium p-3 rounded-btn bg-brand-500/10 border border-brand-500/20">
          <div className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <span>Processing and registering students into "{selectedClassName}"...</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 text-xs font-semibold text-success bg-success/10 border border-success/20 p-3 rounded-btn">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-btn bg-error/10 p-3 max-h-48 overflow-y-auto border border-error/20 space-y-1">
          <p className="text-xs font-bold text-error">Import Issues ({errors.length}):</p>
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-error font-mono">{e}</p>
          ))}
        </div>
      )}
    </div>
  )
}
