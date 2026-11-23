import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  generateContributionReport,
  generateExpenseReport,
  generateStudentStatusReport,
} from './PDFGenerator'
import { useContributionTotals } from '../contributions/useContributions'
import { useExpenseTotal } from '../expenses/useExpenses'
import { useStudents } from '../students/useStudents'
import { formatCurrency } from '../../lib/utils'
import { FileText, FileDown, Receipt, Users, Bot, Send, Loader2 } from 'lucide-react'

export function ReportsPage() {
  const { t } = useTranslation()
  const { activeClassId } = useAuth()
  const classId = activeClassId
  const { total: contribTotal, studentTotals } = useContributionTotals(classId)
  const { total: expenseTotal } = useExpenseTotal(classId)
  const { allStudents } = useStudents(classId)
  const [loading, setLoading] = useState<string | null>(null)

  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function buildContext() {
    const { data: classData } = await supabase
      .from('classes')
      .select('contribution_target')
      .eq('id', classId)
      .single()

    const { data: recentContribs } = await supabase
      .from('contributions')
      .select('*, profiles!contributions_student_id_fkey(name)')
      .eq('class_id', classId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(20)

    const { data: recentExpenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('class_id', classId)
      .order('date', { ascending: false })
      .limit(20)

    const target = classData?.contribution_target ?? 0

    return {
      contribution_target_per_student: target,
      total_contributions: contribTotal,
      total_expenses: expenseTotal,
      remaining_balance: contribTotal - expenseTotal,
      students: allStudents.map((s) => ({
        student_id: s.student_id,
        name: s.name,
        total_paid: studentTotals[s.id] ?? 0,
        status: (studentTotals[s.id] ?? 0) >= target ? 'paid' : (studentTotals[s.id] ?? 0) > 0 ? 'partial' : 'unpaid',
      })),
      recent_contributions: (recentContribs ?? []).map((c: any) => ({
        student: c.profiles?.name ?? '',
        amount: Number(c.amount),
        date: c.date,
      })),
      recent_expenses: (recentExpenses ?? []).map((e) => ({
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
      })),
    }
  }

  async function handleChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return
    const question = chatInput.trim()
    setChatInput('')
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setChatLoading(true)

    try {
      const context = await buildContext()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: t('aiChat.error') }])
    }
    setChatLoading(false)
  }

  async function loadContributions() {
    const { data } = await supabase
      .from('contributions')
      .select('*, profiles!contributions_student_id_fkey(student_id, name)')
      .eq('class_id', classId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
    return data ?? []
  }

  async function loadExpenses() {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('class_id', classId)
      .order('date', { ascending: false })
    return data ?? []
  }

  async function handleContributions() {
    setLoading('contributions')
    const data = await loadContributions()
    await generateContributionReport(t('pdf.contributionsReport'), data as any, contribTotal)
    setLoading(null)
  }

  async function handleExpenses() {
    setLoading('expenses')
    const data = await loadExpenses()
    await generateExpenseReport(t('pdf.expensesReport'), data as any, expenseTotal)
    setLoading(null)
  }

  async function handleStudentStatus() {
    setLoading('status')
    const { data: classData } = await supabase
      .from('classes')
      .select('contribution_target')
      .eq('id', classId)
      .single()
    const target = classData?.contribution_target ?? 0

    const { data: contribData } = await supabase
      .from('contributions')
      .select('student_id, amount')
      .eq('class_id', classId)
      .is('deleted_at', null)

    const studentTotals: Record<string, number> = {}
    ;(contribData ?? []).forEach((c: any) => {
      studentTotals[c.student_id] = (studentTotals[c.student_id] ?? 0) + Number(c.amount)
    })

    await generateStudentStatusReport(t('pdf.studentStatus'), allStudents, studentTotals, target)
    setLoading(null)
  }

  const remaining = contribTotal - expenseTotal

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">{t('reports.title')}</h1>
        <p className="text-sm text-muted">{t('reports.subtitle')}</p>
      </div>

      {/* Desktop */}
      <div className="hidden sm:grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-lg bg-success/10 p-3">
                <FileDown size={24} className="text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-text">{t('reports.contributions')}</h3>
                <p className="text-sm text-muted">{formatCurrency(contribTotal)}</p>
              </div>
              <Button size="sm" onClick={handleContributions} loading={loading === 'contributions'}>
                <FileText size={16} /> {t('reports.download')}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-lg bg-error/10 p-3">
                <Receipt size={24} className="text-error" />
              </div>
              <div>
                <h3 className="font-semibold text-text">{t('reports.expenses')}</h3>
                <p className="text-sm text-muted">{formatCurrency(expenseTotal)}</p>
              </div>
              <Button size="sm" onClick={handleExpenses} loading={loading === 'expenses'}>
                <FileText size={16} /> {t('reports.download')}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-lg bg-info/10 p-3">
                <Users size={24} className="text-info" />
              </div>
              <div>
                <h3 className="font-semibold text-text">{t('reports.studentStatus')}</h3>
                <p className="text-sm text-muted">{formatCurrency(remaining)}</p>
              </div>
              <Button size="sm" onClick={handleStudentStatus} loading={loading === 'status'}>
                <FileText size={16} /> {t('reports.download')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile */}
      <div className="sm:hidden space-y-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success/10 p-2"><FileDown size={18} className="text-success" /></div>
                <div>
                  <p className="text-sm font-semibold text-text">{t('reports.contributions')}</p>
                  <p className="text-xs text-muted">{formatCurrency(contribTotal)}</p>
                </div>
              </div>
              <Button size="sm" onClick={handleContributions} loading={loading === 'contributions'}>
                <FileText size={14} /> {t('reports.download')}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-error/10 p-2"><Receipt size={18} className="text-error" /></div>
                <div>
                  <p className="text-sm font-semibold text-text">{t('reports.expenses')}</p>
                  <p className="text-xs text-muted">{formatCurrency(expenseTotal)}</p>
                </div>
              </div>
              <Button size="sm" onClick={handleExpenses} loading={loading === 'expenses'}>
                <FileText size={14} /> {t('reports.download')}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-info/10 p-2"><Users size={18} className="text-info" /></div>
                <div>
                  <p className="text-sm font-semibold text-text">{t('reports.studentStatus')}</p>
                  <p className="text-xs text-muted">{formatCurrency(remaining)}</p>
                </div>
              </div>
              <Button size="sm" onClick={handleStudentStatus} loading={loading === 'status'}>
                <FileText size={14} /> {t('reports.download')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={20} className="text-brand-600" />
            <h2 className="text-lg font-semibold text-text">{t('aiChat.title')}</h2>
          </div>

          {messages.length > 0 && (
            <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-br-sm'
                        : 'bg-bg-elevated text-text rounded-bl-sm border border-border'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          <form onSubmit={handleChat} className="relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={t('aiChat.placeholder')}
              disabled={chatLoading}
              className="w-full rounded-btn border border-border-hover bg-bg-card pl-4 pr-12 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-600/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-btn bg-brand-600 text-white disabled:opacity-30 transition-opacity cursor-pointer shrink-0"
            >
              {chatLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
