import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Upload, FileDown, CheckCircle2 } from 'lucide-react'
import { parseStudentCsv, type ParsedStudentRow } from './csvStudentParser'

interface StudentImportProps {
  onImport: (rows: ParsedStudentRow[]) => Promise<string[]>
}

export function StudentImport({ onImport }: StudentImportProps) {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<string[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

      const importErrors = await onImport(rows)
      const allErrors = [...parseErrors, ...importErrors]
      setErrors(allErrors)

      const successCount = rows.length - importErrors.length
      if (successCount > 0) {
        setSuccessMsg(`Successfully imported ${successCount} student${successCount > 1 ? 's' : ''}! Default passwords set to their Student IDs.`)
      }
    } catch (err: any) {
      setErrors([err.message || 'Failed to read or process CSV file.'])
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <Button variant="secondary" onClick={downloadTemplate}>
          <FileDown size={16} /> {t('import.template')}
        </Button>
        <label className="cursor-pointer">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          <span className="inline-flex items-center gap-2 rounded-btn border border-border bg-bg-card px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-elevated hover:text-text transition-colors">
            <Upload size={16} /> {t('import.importCsv')}
          </span>
        </label>
      </div>

      <p className="text-xs text-muted">
        Tip: Works with any CSV containing Student ID & Name. Passwords are automatically set to each student's exact ID.
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-brand-600 font-medium">
          <div className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <span>Processing and registering students into system...</span>
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
