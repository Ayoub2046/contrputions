import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency } from '../../lib/utils'
import i18n from '../../lib/i18n'
import type { Contribution, Expense, Profile } from '../../lib/types'

interface ContributionWithStudent extends Contribution {
  profiles: { student_id: string; name: string }
}

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

const darkBg = hexToRgb('#0f172a')
const altBg = hexToRgb('#f8fafc')

export async function generateContributionReport(
  title: string,
  contributions: ContributionWithStudent[],
  total: number,
  className?: string,
) {
  const doc = new jsPDF('p', 'mm', 'a4')
  doc.setFontSize(18)
  doc.text(title, 14, 20)
  doc.setFontSize(10)
  if (className) {
    doc.text(`Class Scope: ${className}`, 14, 26)
  }
  doc.text(i18n.t('pdf.generated', { date: new Date().toLocaleDateString() }), 14, className ? 32 : 26)
  doc.text(i18n.t('pdf.totalContributions', { currency: formatCurrency(total) }), 14, className ? 38 : 32)

  autoTable(doc, {
    startY: className ? 44 : 38,
    head: [[i18n.t('pdf.columns.studentId'), i18n.t('pdf.columns.name'), i18n.t('pdf.columns.amount'), i18n.t('pdf.columns.date')]],
    body: contributions.map((c) => [
      c.profiles?.student_id ?? '',
      c.profiles?.name ?? '',
      formatCurrency(Number(c.amount)),
      new Date(c.date).toLocaleDateString(),
    ]),
    theme: 'grid',
    headStyles: { fillColor: darkBg, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: altBg },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { horizontal: 10 },
  })

  doc.save('contributions-report.pdf')
}

export async function generateExpenseReport(
  title: string,
  expenses: Expense[],
  total: number,
  className?: string,
) {
  const doc = new jsPDF('p', 'mm', 'a4')
  doc.setFontSize(18)
  doc.text(title, 14, 20)
  doc.setFontSize(10)
  if (className) {
    doc.text(`Class Scope: ${className}`, 14, 26)
  }
  doc.text(i18n.t('pdf.generated', { date: new Date().toLocaleDateString() }), 14, className ? 32 : 26)
  doc.text(i18n.t('pdf.totalExpenses', { currency: formatCurrency(total) }), 14, className ? 38 : 32)

  autoTable(doc, {
    startY: className ? 44 : 38,
    head: [[i18n.t('pdf.columns.description'), i18n.t('pdf.columns.amount'), i18n.t('pdf.columns.date')]],
    body: expenses.map((e) => [
      e.description,
      formatCurrency(Number(e.amount)),
      new Date(e.date).toLocaleDateString(),
    ]),
    theme: 'grid',
    headStyles: { fillColor: darkBg, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: altBg },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
    },
    margin: { horizontal: 10 },
  })

  doc.save('expenses-report.pdf')
}

export async function generateStudentStatusReport(
  title: string,
  students: Profile[],
  studentTotals: Record<string, number>,
  target: number,
  className?: string,
) {
  const doc = new jsPDF('p', 'mm', 'a4')
  doc.setFontSize(18)
  doc.text(title, 14, 20)
  doc.setFontSize(10)
  if (className) {
    doc.text(`Class: ${className}`, 14, 26)
  }
  doc.text(i18n.t('pdf.generated', { date: new Date().toLocaleDateString() }), 14, className ? 32 : 26)
  doc.text(i18n.t('pdf.targetPerStudent', { currency: formatCurrency(target) }), 14, className ? 38 : 32)

  const t = i18n.t

  autoTable(doc, {
    startY: className ? 44 : 38,
    head: [[t('pdf.columns.studentId'), t('pdf.columns.name'), t('pdf.columns.totalPaid'), 'Remaining', t('pdf.columns.status')]],
    body: students.map((s) => {
      const paid = studentTotals[s.id] ?? 0
      const remaining = Math.max(0, target - paid)
      const status = target > 0 && paid >= target ? 'Cleared (Paid)' : paid > 0 ? 'Partial' : 'Unpaid'
      return [
        s.student_id,
        s.name,
        formatCurrency(paid),
        target > 0 ? formatCurrency(remaining) : '-',
        status,
      ]
    }),
    theme: 'grid',
    headStyles: { fillColor: darkBg, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: altBg },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' },
    },
    margin: { horizontal: 10 },
  })

  doc.save('student-status-report.pdf')
}
