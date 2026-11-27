import { useState } from 'react'
import {
  Calendar,
  Clock,
  Sparkles,
  BellRing,
  Send,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { getCurrentWeekCycle } from '../../lib/weekCycle'
import { broadcastPushNotification } from '../notifications/notificationService'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../lib/utils'

interface WeeklyCutoffBannerProps {
  classId?: string | null
  classNameStr?: string
  paidStudents: { id: string; name: string; phone?: string; student_id: string }[]
  unpaidStudents: { id: string; name: string; phone?: string; student_id: string; target: number; paid: number }[]
  totalCollected: number
  totalTarget: number
  canSendNotification: boolean
}

export function WeeklyCutoffBanner({
  classId,
  classNameStr,
  paidStudents,
  unpaidStudents,
  totalCollected,
  totalTarget,
  canSendNotification,
}: WeeklyCutoffBannerProps) {
  const cycle = getCurrentWeekCycle()
  const [modalType, setModalType] = useState<'both' | 'congrats' | 'reminder' | null>(null)
  const [congratsMsg, setCongratsMsg] = useState(
    `🎉 Congratulations & Thank You! You have successfully paid your class contribution for this week (${cycle.shortLabel}). Please get ready for next week's collection starting Saturday!`
  )
  const [reminderMsg, setReminderMsg] = useState(
    `⚠️ Weekly Contribution Reminder: Today is ${cycle.dayName}, the cutoff for this week's collection (${cycle.shortLabel}). Please submit your assigned contribution before the week closes!`
  )
  const [sending, setSending] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  async function handleSend() {
    if (!classId && canSendNotification) {
      setStatusMsg('Please select a specific class to send announcements.')
      return
    }

    setSending(true)
    setStatusMsg(null)

    try {
      const tasks: Promise<any>[] = []

      // Send Congratulations message if requested
      if ((modalType === 'both' || modalType === 'congrats') && paidStudents.length > 0) {
        tasks.push(
          broadcastPushNotification({
            id: `congrats_${Date.now()}_${classId || 'all'}`,
            title: '🎉 Congratulations: Weekly Contribution Completed!',
            body: congratsMsg,
            category: 'contribution',
            classId: classId || null,
            createdAt: new Date().toISOString(),
          })
        )
      }

      // Send Reminder message if requested
      if ((modalType === 'both' || modalType === 'reminder') && unpaidStudents.length > 0) {
        tasks.push(
          broadcastPushNotification({
            id: `remind_${Date.now()}_${classId || 'all'}`,
            title: `⏰ Weekly Reminder: Friday Collection Cutoff (${cycle.shortLabel})`,
            body: reminderMsg,
            category: 'announcement',
            classId: classId || null,
            createdAt: new Date().toISOString(),
          })
        )
      }

      await Promise.all(tasks)
      setStatusMsg(
        `✓ Broadcast successfully sent! Congratulated ${paidStudents.length} paid student(s) and reminded ${unpaidStudents.length} pending student(s).`
      )
      setTimeout(() => {
        setModalType(null)
        setStatusMsg(null)
      }, 2500)
    } catch (err: any) {
      setStatusMsg('Failed to send broadcast: ' + (err.message || 'Error'))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div
        className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
          cycle.isFriday
            ? 'border-amber-400/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:border-amber-500/40'
            : 'border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033]'
        }`}
      >
        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#ECECEC]/70 dark:border-[#1e3550]/70">
          <div className="flex items-center gap-2.5">
            <div
              className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                cycle.isFriday
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-[#1176BC]/10 text-[#1176BC] dark:bg-[#1176BC]/20'
              }`}
            >
              <Calendar size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-[#9FBBDE]">
                  Weekly Contribution Cycle
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1176BC]/10 text-[#1176BC] dark:bg-[#1176BC]/20">
                  Sat – Fri
                </span>
                {cycle.isFriday ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    🚨 Today is Friday (Cutoff Day!)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Day {cycle.dayIndex} of 7 ({cycle.dayName})
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-[#1a2332] dark:text-[#e8f0f8] mt-0.5">
                {cycle.label}
              </h3>
            </div>
          </div>

          {/* Action buttons for Class Admins / Super Admin */}
          {canSendNotification && (
            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
              <button
                onClick={() => setModalType('both')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-xs font-bold shadow-xs hover:opacity-95 transition-all cursor-pointer"
                title="Send both congratulations to paid students and reminders to unpaid students"
              >
                <BellRing size={13} />
                Send Friday Wrap-up Alerts
              </button>

              <button
                onClick={() => setModalType('congrats')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer"
              >
                <Sparkles size={13} />
                Congratulate Paid ({paidStudents.length})
              </button>

              <button
                onClick={() => setModalType('reminder')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all cursor-pointer"
              >
                <Clock size={13} />
                Remind Unpaid ({unpaidStudents.length})
              </button>
            </div>
          )}
        </div>

        {/* Cycle Days Progress & Counters */}
        <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Day countdown */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#9FBBDE] font-medium">Cycle Timeline</span>
              <span className="font-bold text-[#1a2332] dark:text-[#e8f0f8]">
                {cycle.isFriday
                  ? 'Final Day Cutoff (Friday)'
                  : `${cycle.daysRemaining} day${cycle.daysRemaining === 1 ? '' : 's'} until Friday cutoff`}
              </span>
            </div>
            {/* 7-step day progress bar from Saturday to Friday */}
            <div className="grid grid-cols-7 gap-1">
              {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((dayAbbr, idx) => {
                const isPastOrCurrent = idx + 1 <= cycle.dayIndex
                const isCurrent = idx + 1 === cycle.dayIndex
                const isFri = idx === 6
                return (
                  <div key={dayAbbr} className="flex flex-col items-center gap-0.5">
                    <div
                      className={`h-2 w-full rounded-full transition-all ${
                        isCurrent
                          ? isFri
                            ? 'bg-amber-500 ring-2 ring-amber-400/40'
                            : 'bg-[#1176BC] ring-2 ring-[#25A8E0]/40'
                          : isPastOrCurrent
                          ? 'bg-emerald-500/80 dark:bg-emerald-500/60'
                          : 'bg-[#ECECEC] dark:bg-[#1e3550]'
                      }`}
                    />
                    <span
                      className={`text-[9px] font-semibold ${
                        isCurrent
                          ? 'text-[#1176BC] dark:text-[#25A8E0] font-bold'
                          : 'text-[#9FBBDE]'
                      }`}
                    >
                      {dayAbbr}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Weekly Collection Metrics */}
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-6">
            <div className="text-left sm:text-right">
              <span className="text-[11px] text-[#9FBBDE] block font-medium">
                Collected This Week
              </span>
              <span className="text-base font-bold text-[#1a2332] dark:text-[#e8f0f8]">
                {formatCurrency(totalCollected)}
                {totalTarget > 0 && (
                  <span className="text-xs font-normal text-[#9FBBDE] ml-1">
                    / {formatCurrency(totalTarget)}
                  </span>
                )}
              </span>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] text-[#9FBBDE] block font-medium">
                Completed
              </span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                <CheckCircle2 size={14} />
                {paidStudents.length} Students
              </span>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] text-[#9FBBDE] block font-medium">
                Pending Cutoff
              </span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 justify-end">
                <AlertTriangle size={14} />
                {unpaidStudents.length} Students
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      {modalType && (
        <Modal
          open={true}
          onClose={() => {
            if (!sending) {
              setModalType(null)
              setStatusMsg(null)
            }
          }}
          title={
            modalType === 'both'
              ? '📢 Send Friday Collection Wrap-Up & Reminders'
              : modalType === 'congrats'
              ? '🎉 Congratulate Paid Students'
              : '⏰ Remind Unpaid Students (Friday Cutoff)'
          }
        >
          <div className="space-y-4 text-sm">
            {classNameStr && (
              <p className="text-xs text-[#9FBBDE]">
                Target Class: <strong className="text-[#1a2332] dark:text-[#e8f0f8]">{classNameStr}</strong>
              </p>
            )}

            {/* Recipients summary */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 block mb-0.5">
                  ✅ {paidStudents.length} Paid Student(s)
                </span>
                <span className="text-[#4a5a72] dark:text-[#9FBBDE]">
                  Will receive the congratulations message + next week reminder.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <span className="font-bold text-amber-700 dark:text-amber-300 block mb-0.5">
                  ⚠️ {unpaidStudents.length} Unpaid Student(s)
                </span>
                <span className="text-[#4a5a72] dark:text-[#9FBBDE]">
                  Will receive the urgent Friday cutoff reminder notification.
                </span>
              </div>
            </div>

            {/* Message inputs */}
            {(modalType === 'both' || modalType === 'congrats') && (
              <div>
                <label className="text-xs font-bold text-[#1a2332] dark:text-[#e8f0f8] block mb-1">
                  Congratulations Message (For Paid Students)
                </label>
                <textarea
                  value={congratsMsg}
                  onChange={(e) => setCongratsMsg(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] text-[#1a2332] dark:text-[#e8f0f8] focus:outline-none focus:ring-2 focus:ring-[#25A8E0]/30 resize-none"
                />
              </div>
            )}

            {(modalType === 'both' || modalType === 'reminder') && (
              <div>
                <label className="text-xs font-bold text-[#1a2332] dark:text-[#e8f0f8] block mb-1">
                  Reminder Message (For Unpaid Students)
                </label>
                <textarea
                  value={reminderMsg}
                  onChange={(e) => setReminderMsg(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#ECECEC] dark:border-[#1e3550] bg-white dark:bg-[#132033] text-[#1a2332] dark:text-[#e8f0f8] focus:outline-none focus:ring-2 focus:ring-[#25A8E0]/30 resize-none"
                />
              </div>
            )}

            {statusMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  statusMsg.startsWith('✓')
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300'
                }`}
              >
                {statusMsg}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#ECECEC] dark:border-[#1e3550]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setModalType(null)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                loading={sending}
                onClick={handleSend}
                disabled={sending}
                className="bg-[#1176BC] hover:bg-[#0D5A8A] text-white"
              >
                <Send size={13} className="mr-1.5" />
                Broadcast to Students
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
