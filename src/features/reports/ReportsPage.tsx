import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Table, TBody, Td, Th, THead } from '../../components/ui/Table'
import {
  generateContributionReport,
  generateExpenseReport,
  generateStudentStatusReport,
} from './PDFGenerator'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useAppName } from '../../hooks/useAppLogo'
import {
  FileText,
  FileDown,
  Receipt,
  Users,
  Send,
  Loader2,
  School,
  TrendingUp,
  Wallet,
  Printer,
  Search,
  Sparkles,
} from 'lucide-react'

interface ClassOption {
  id: string
  name: string
  contribution_target?: number
}

interface ContributionItem {
  id: string
  student_id: string
  amount: number
  date: string
  class_id?: string
  profiles?: { student_id?: string; name?: string } | any
}

interface ExpenseItem {
  id: string
  description: string
  amount: number
  date: string
  category?: string
  class_id?: string
}

interface StudentItem {
  id: string
  student_id: string
  name: string
  phone?: string | null
  class_id?: string | null
  total_paid?: number
}

export function ReportsPage() {
  const { t } = useTranslation()
  const appName = useAppName()
  const { user, activeClassId, adminClasses } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const canViewAllClasses = isSuperAdmin || user?.role === 'finance_manager'

  // Available classes & selected class scope
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('all')

  // Live ledger data
  const [loadingData, setLoadingData] = useState(true)
  const [contributions, setContributions] = useState<ContributionItem[]>([])
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [students, setStudents] = useState<StudentItem[]>([])
  const [classTarget, setClassTarget] = useState<number>(0)

  // Report generation state
  const [downloading, setDownloading] = useState<string | null>(null)

  // Interactive Table preview tab & search
  const [activeTab, setActiveTab] = useState<'contributions' | 'expenses' | 'students'>('contributions')
  const [searchQuery, setSearchQuery] = useState('')

  // AI Assistant Chat state
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    {
      role: 'assistant',
      text: `Hello! I am your ${appName} Financial Assistant. Ask me anything about class collections, expenditures, remaining balances, or unpaid students.`,
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 1. Load Available Classes
  useEffect(() => {
    async function loadClasses() {
      if (canViewAllClasses) {
        const { data } = await supabase.from('classes').select('id, name, contribution_target').order('name')
        if (data) {
          setClasses(data)
          if (activeClassId) setSelectedClassId(activeClassId)
        }
      } else {
        // Regular class admin: use assigned classes
        if (adminClasses && adminClasses.length > 0) {
          const mapped = adminClasses.map((ac) => ({ id: ac.id, name: ac.name }))
          setClasses(mapped)
          setSelectedClassId(activeClassId || mapped[0].id)
        }
      }
    }
    loadClasses()
  }, [canViewAllClasses, activeClassId, adminClasses])

  // 2. Fetch Live Financial Records based on Selected Scope
  useEffect(() => {
    async function fetchLedgerData() {
      setLoadingData(true)
      try {
        // A. Contributions
        let contribQuery = supabase
          .from('contributions')
          .select('id, student_id, amount, date, class_id, profiles!contributions_student_id_fkey(student_id, name)')
          .is('deleted_at', null)
          .order('date', { ascending: false })

        if (selectedClassId !== 'all') {
          contribQuery = contribQuery.eq('class_id', selectedClassId)
        } else if (!canViewAllClasses && adminClasses.length > 0) {
          contribQuery = contribQuery.in('class_id', adminClasses.map((c) => c.id))
        }

        const { data: contribData } = await contribQuery

        // B. Expenses
        let expenseQuery = supabase
          .from('expenses')
          .select('id, description, amount, date, category, class_id')
          .order('date', { ascending: false })

        if (selectedClassId !== 'all') {
          expenseQuery = expenseQuery.eq('class_id', selectedClassId)
        } else if (!canViewAllClasses && adminClasses.length > 0) {
          expenseQuery = expenseQuery.in('class_id', adminClasses.map((c) => c.id))
        }

        const { data: expData } = await expenseQuery

        // C. Students
        let studentQuery = supabase
          .from('profiles')
          .select('id, student_id, name, phone, class_id')
          .eq('role', 'student')
          .order('name')

        if (selectedClassId !== 'all') {
          studentQuery = studentQuery.eq('class_id', selectedClassId)
        } else if (!canViewAllClasses && adminClasses.length > 0) {
          studentQuery = studentQuery.in('class_id', adminClasses.map((c) => c.id))
        }

        const { data: stuData } = await studentQuery

        // D. Target for single class
        if (selectedClassId !== 'all') {
          const found = classes.find((c) => c.id === selectedClassId)
          setClassTarget(found?.contribution_target || 0)
        } else {
          // Average target across all classes
          const avg = classes.length > 0
            ? classes.reduce((sum, c) => sum + (c.contribution_target || 0), 0) / classes.length
            : 0
          setClassTarget(avg)
        }

        // Map student total contributions
        const studentPaidMap: Record<string, number> = {}
        ;(contribData ?? []).forEach((c: any) => {
          studentPaidMap[c.student_id] = (studentPaidMap[c.student_id] ?? 0) + Number(c.amount)
        })

        const mappedStudents: StudentItem[] = (stuData ?? []).map((s: any) => ({
          ...s,
          total_paid: studentPaidMap[s.id] ?? 0,
        }))

        setContributions((contribData as unknown as ContributionItem[]) ?? [])
        setExpenses((expData as unknown as ExpenseItem[]) ?? [])
        setStudents(mappedStudents)
      } catch (err) {
        console.error('Error fetching reports data:', err)
      } finally {
        setLoadingData(false)
      }
    }

    fetchLedgerData()
  }, [selectedClassId, canViewAllClasses, adminClasses, classes])

  // Calculated Real-time Financial Totals
  const totalContributions = useMemo(() => {
    return contributions.reduce((sum, c) => sum + Number(c.amount || 0), 0)
  }, [contributions])

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }, [expenses])

  const netBalance = totalContributions - totalExpenses

  const studentSummary = useMemo(() => {
    const total = students.length
    const cleared = students.filter((s) => (s.total_paid || 0) >= (classTarget || 0) && (s.total_paid || 0) > 0).length
    const partial = students.filter((s) => (s.total_paid || 0) > 0 && (s.total_paid || 0) < (classTarget || 0)).length
    const unpaid = students.filter((s) => !s.total_paid || s.total_paid === 0).length
    const pct = total > 0 ? Math.round((cleared / total) * 100) : 0
    return { total, cleared, partial, unpaid, pct }
  }, [students, classTarget])

  const selectedClassName = useMemo(() => {
    if (selectedClassId === 'all') return 'All Classes (Institute Master Overview)'
    const c = classes.find((cl) => cl.id === selectedClassId)
    return c ? c.name : 'Class'
  }, [selectedClassId, classes])

  // Filtered rows for on-screen interactive table preview
  const filteredContributions = useMemo(() => {
    if (!searchQuery.trim()) return contributions
    const q = searchQuery.toLowerCase()
    return contributions.filter(
      (c) =>
        c.profiles?.name?.toLowerCase().includes(q) ||
        c.profiles?.student_id?.toLowerCase().includes(q) ||
        String(c.amount).includes(q)
    )
  }, [contributions, searchQuery])

  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses
    const q = searchQuery.toLowerCase()
    return expenses.filter(
      (e) => e.description?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q) || String(e.amount).includes(q)
    )
  }, [expenses, searchQuery])

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase()
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q)
    )
  }, [students, searchQuery])

  // PDF Handlers
  async function handleDownloadContributions() {
    setDownloading('contributions')
    try {
      await generateContributionReport(
        `ClassBank Collections & Contributions Audit`,
        contributions as any,
        totalContributions,
        selectedClassName
      )
    } finally {
      setDownloading(null)
    }
  }

  async function handleDownloadExpenses() {
    setDownloading('expenses')
    try {
      await generateExpenseReport(
        `ClassBank Approved Expenses & Disbursements`,
        expenses as any,
        totalExpenses,
        selectedClassName
      )
    } finally {
      setDownloading(null)
    }
  }

  async function handleDownloadStudentStatus() {
    setDownloading('status')
    try {
      const studentPaidMap: Record<string, number> = {}
      students.forEach((s) => {
        studentPaidMap[s.id] = s.total_paid || 0
      })
      await generateStudentStatusReport(
        `ClassBank Student Contribution Clearance Audit`,
        students as any,
        studentPaidMap,
        classTarget,
        selectedClassName
      )
    } finally {
      setDownloading(null)
    }
  }

  // AI Chat Handler
  async function handleChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return
    const question = chatInput.trim()
    setChatInput('')
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setChatLoading(true)

    const context = {
      scope: selectedClassName,
      contribution_target_per_student: classTarget,
      total_contributions: totalContributions,
      total_expenses: totalExpenses,
      remaining_balance: netBalance,
      students: students.map((s) => ({
        student_id: s.student_id,
        name: s.name,
        total_paid: s.total_paid || 0,
        status: (s.total_paid || 0) >= classTarget ? 'paid' : (s.total_paid || 0) > 0 ? 'partial' : 'unpaid',
      })),
      recent_contributions: contributions.slice(0, 15).map((c) => ({
        student: c.profiles?.name || '',
        amount: Number(c.amount),
        date: c.date,
      })),
      recent_expenses: expenses.slice(0, 15).map((e) => ({
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
      })),
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to process question')
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Current Financial Summary for ${selectedClassName}:\n• Total Collected: ${formatCurrency(totalContributions)}\n• Total Spent: ${formatCurrency(totalExpenses)}\n• Safe In-Bank Balance: ${formatCurrency(netBalance)}\n• Clearance Rate: ${studentSummary.pct}% (${studentSummary.cleared} paid, ${studentSummary.unpaid} unpaid)`,
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* 1. Header Bar with Scope Filter & Direct Print Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332] dark:text-[#e8f0f8]">
            {t('reports.title')}
          </h1>
          <p className="text-xs text-[#9FBBDE] mt-0.5">
            Verified financial statements, printable PDF audit sheets, and AI analysis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class Filter Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#132033] border border-[#ECECEC] dark:border-[#1e3550] rounded-xl px-3 py-1.5 shadow-2xs">
            <School size={15} className="text-[#1176BC] shrink-0" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#1a2332] dark:text-[#e8f0f8] focus:outline-hidden cursor-pointer"
            >
              {canViewAllClasses && (
                <option value="all" className="bg-white dark:bg-[#132033]">
                  All Classes (Master Ledger)
                </option>
              )}
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-[#132033]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Print Page Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 h-8.5 text-xs font-semibold"
          >
            <Printer size={14} />
            <span>Print Sheet</span>
          </Button>
        </div>
      </div>

      {/* 2. Executive Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Contributions */}
        <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9FBBDE]">
              Total Collections
            </span>
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold font-serif text-[#1a2332] dark:text-[#e8f0f8] tabular-nums">
              {formatCurrency(totalContributions)}
            </p>
            <p className="text-xs text-[#9FBBDE] mt-0.5">
              {contributions.length} recorded payments
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleDownloadContributions}
            loading={downloading === 'contributions'}
            className="w-full justify-center text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileDown size={14} /> Download PDF
          </Button>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9FBBDE]">
              Approved Expenses
            </span>
            <div className="size-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
              <Receipt size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold font-serif text-red-500 tabular-nums">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="text-xs text-[#9FBBDE] mt-0.5">
              {expenses.length} approved items
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleDownloadExpenses}
            loading={downloading === 'expenses'}
            className="w-full justify-center text-xs h-8 bg-red-600 hover:bg-red-700 text-white"
          >
            <FileDown size={14} /> Download PDF
          </Button>
        </div>

        {/* Card 3: Net In-Bank Reserve */}
        <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9FBBDE]">
              Net Bank Balance
            </span>
            <div className="size-8 rounded-lg bg-[#1176BC]/10 flex items-center justify-center text-[#1176BC] dark:text-[#25A8E0]">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <p className={`text-2xl font-bold font-serif tabular-nums ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {formatCurrency(netBalance)}
            </p>
            <p className="text-xs text-[#9FBBDE] mt-0.5">
              Verified against PostgreSQL
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleDownloadStudentStatus}
            loading={downloading === 'status'}
            className="w-full justify-center text-xs h-8"
          >
            <FileText size={14} /> Clearance Report
          </Button>
        </div>

        {/* Card 4: Student Clearance Rate */}
        <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9FBBDE]">
              Clearance Status
            </span>
            <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-serif text-[#1a2332] dark:text-[#e8f0f8]">
                {studentSummary.pct}%
              </span>
              <span className="text-xs text-[#9FBBDE]">
                ({studentSummary.cleared}/{studentSummary.total} cleared)
              </span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
              {studentSummary.unpaid} pending payment
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleDownloadStudentStatus}
            loading={downloading === 'status'}
            className="w-full justify-center text-xs h-8 bg-[#1176BC] hover:bg-[#0e5c93] text-white"
          >
            <FileDown size={14} /> Download PDF
          </Button>
        </div>
      </div>

      {/* 3. Interactive Data Preview & Report Tables */}
      <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#ECECEC]/60 dark:bg-[#0e1726] rounded-xl self-start">
            <button
              onClick={() => setActiveTab('contributions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'contributions'
                  ? 'bg-white dark:bg-[#132033] text-[#1176BC] dark:text-[#25A8E0] shadow-xs'
                  : 'text-[#9FBBDE] hover:text-[#1a2332] dark:hover:text-[#e8f0f8]'
              }`}
            >
              Contributions ({contributions.length})
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'expenses'
                  ? 'bg-white dark:bg-[#132033] text-[#1176BC] dark:text-[#25A8E0] shadow-xs'
                  : 'text-[#9FBBDE] hover:text-[#1a2332] dark:hover:text-[#e8f0f8]'
              }`}
            >
              Expenses ({expenses.length})
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-white dark:bg-[#132033] text-[#1176BC] dark:text-[#25A8E0] shadow-xs'
                  : 'text-[#9FBBDE] hover:text-[#1a2332] dark:hover:text-[#e8f0f8]'
              }`}
            >
              Student Clearance ({students.length})
            </button>
          </div>

          {/* Quick Table Search */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9FBBDE]" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] text-xs text-[#1a2332] dark:text-[#e8f0f8] focus:outline-hidden focus:border-[#1176BC]"
            />
          </div>
        </div>

        {/* Tab 1: Contributions Table */}
        {activeTab === 'contributions' && (
          <div className="overflow-x-auto">
            {loadingData ? (
              <div className="py-12 flex items-center justify-center gap-2 text-xs text-[#9FBBDE]">
                <Loader2 size={16} className="animate-spin text-[#1176BC]" />
                <span>Loading financial ledger...</span>
              </div>
            ) : filteredContributions.length === 0 ? (
              <p className="text-center py-10 text-xs text-[#9FBBDE]">No contribution records found.</p>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <Th>Student ID</Th>
                    <Th>Student Name</Th>
                    <Th>Date</Th>
                    <Th className="text-right">Amount</Th>
                  </tr>
                </THead>
                <TBody>
                  {filteredContributions.slice(0, 50).map((c) => (
                    <tr key={c.id}>
                      <Td className="font-mono text-xs text-[#9FBBDE]">{c.profiles?.student_id || '-'}</Td>
                      <Td className="font-semibold text-xs text-[#1a2332] dark:text-[#e8f0f8]">{c.profiles?.name || 'Unknown'}</Td>
                      <Td className="text-xs text-[#9FBBDE]">{formatDate(c.date)}</Td>
                      <Td className="text-right font-bold font-serif text-xs text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(Number(c.amount))}
                      </Td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 2: Expenses Table */}
        {activeTab === 'expenses' && (
          <div className="overflow-x-auto">
            {filteredExpenses.length === 0 ? (
              <p className="text-center py-10 text-xs text-[#9FBBDE]">No expense records found.</p>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <Th>Description</Th>
                    <Th>Category</Th>
                    <Th>Date</Th>
                    <Th className="text-right">Amount</Th>
                  </tr>
                </THead>
                <TBody>
                  {filteredExpenses.slice(0, 50).map((e) => (
                    <tr key={e.id}>
                      <Td className="font-semibold text-xs text-[#1a2332] dark:text-[#e8f0f8]">{e.description}</Td>
                      <Td className="text-xs text-[#9FBBDE]">
                        <span className="px-2 py-0.5 rounded-full bg-[#ECECEC] dark:bg-[#1e3550] text-[10px] uppercase font-bold">
                          {e.category || 'General'}
                        </span>
                      </Td>
                      <Td className="text-xs text-[#9FBBDE]">{formatDate(e.date)}</Td>
                      <Td className="text-right font-bold font-serif text-xs text-red-500">
                        -{formatCurrency(Number(e.amount))}
                      </Td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 3: Students Clearance Table */}
        {activeTab === 'students' && (
          <div className="overflow-x-auto">
            {filteredStudents.length === 0 ? (
              <p className="text-center py-10 text-xs text-[#9FBBDE]">No student records found.</p>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Name</Th>
                    <Th>Phone</Th>
                    <Th className="text-right">Target</Th>
                    <Th className="text-right">Total Paid</Th>
                    <Th className="text-right">Remaining</Th>
                    <Th className="text-center">Status</Th>
                  </tr>
                </THead>
                <TBody>
                  {filteredStudents.slice(0, 50).map((s) => {
                    const paid = s.total_paid || 0
                    const remaining = Math.max(0, classTarget - paid)
                    const isPaid = classTarget > 0 && paid >= classTarget
                    const isPartial = paid > 0 && paid < classTarget
                    return (
                      <tr key={s.id}>
                        <Td className="font-mono text-xs text-[#9FBBDE]">{s.student_id}</Td>
                        <Td className="font-semibold text-xs text-[#1a2332] dark:text-[#e8f0f8]">{s.name}</Td>
                        <Td className="text-xs font-mono text-[#9FBBDE]">
                          {s.phone ? (
                            <a href={`tel:${s.phone}`} className="hover:text-[#1176BC] underline">
                              {s.phone}
                            </a>
                          ) : (
                            '-'
                          )}
                        </Td>
                        <Td className="text-right text-xs font-serif text-[#9FBBDE]">
                          {classTarget > 0 ? formatCurrency(classTarget) : '-'}
                        </Td>
                        <Td className="text-right text-xs font-bold font-serif text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(paid)}
                        </Td>
                        <Td className="text-right text-xs font-serif text-amber-600 dark:text-amber-400">
                          {classTarget > 0 ? formatCurrency(remaining) : '-'}
                        </Td>
                        <Td className="text-center">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : isPartial
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                            }`}
                          >
                            {isPaid ? 'Cleared' : isPartial ? 'Partial' : 'Unpaid'}
                          </span>
                        </Td>
                      </tr>
                    )
                  })}
                </TBody>
              </Table>
            )}
          </div>
        )}
      </div>

      {/* 4. AI Financial Assistant Section */}
      <div className="rounded-2xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-[#1176BC]/10 flex items-center justify-center text-[#1176BC] dark:text-[#25A8E0]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1a2332] dark:text-[#e8f0f8]">
                ClassBank AI Financial Assistant
              </h2>
              <p className="text-[11px] text-[#9FBBDE]">
                Ask questions about balances, spending audits, and unpaid students for {selectedClassName}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Live Analysis
          </span>
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            'What is our net in-bank reserve balance?',
            'Who has not paid their contributions yet?',
            'What are our total expenses and spending?',
            'Who are the top class contributors?',
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setChatInput(prompt)
              }}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#ECECEC]/70 dark:bg-[#0e1726] hover:bg-[#1176BC]/10 hover:text-[#1176BC] text-[#1a2332] dark:text-[#e8f0f8] border border-[#ECECEC] dark:border-[#1e3550] transition-colors cursor-pointer"
            >
              💬 {prompt}
            </button>
          ))}
        </div>

        {/* Chat History Box */}
        <div className="h-60 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-[#ECECEC]/30 dark:bg-[#0e1726]/60 border border-[#ECECEC] dark:border-[#1e3550]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-[#1176BC] text-white rounded-br-xs'
                    : 'bg-white dark:bg-[#132033] text-[#1a2332] dark:text-[#e8f0f8] border border-[#ECECEC] dark:border-[#1e3550] shadow-2xs rounded-bl-xs'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl p-3 text-xs bg-white dark:bg-[#132033] border border-[#ECECEC] dark:border-[#1e3550] flex items-center gap-2 text-[#9FBBDE]">
                <Loader2 size={14} className="animate-spin text-[#1176BC]" />
                <span>Analyzing class ledger...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Form */}
        <form onSubmit={handleChat} className="flex gap-2">
          <input
            type="text"
            placeholder="Ask anything about contributions, expenses, or students..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={chatLoading}
            className="flex-1 px-3.5 py-2 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] text-xs text-[#1a2332] dark:text-[#e8f0f8] focus:outline-hidden focus:border-[#1176BC]"
          />
          <Button
            type="submit"
            disabled={!chatInput.trim() || chatLoading}
            className="bg-[#1176BC] hover:bg-[#0e5c93] text-white px-4 h-9"
          >
            <Send size={14} />
          </Button>
        </form>
      </div>
    </div>
  )
}
