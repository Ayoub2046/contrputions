import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useNotifications } from './NotificationContext'
import { useAuth } from '../auth/AuthContext'
import { useAppName } from '../../hooks/useAppLogo'
import { Send, CheckCircle2 } from 'lucide-react'
import type { NotificationCategory } from './notificationTypes'

interface BroadcastModalProps {
  open: boolean
  onClose: () => void
  availableClasses?: { id: string; name: string }[]
}

export function BroadcastNotificationModal({ open, onClose, availableClasses = [] }: BroadcastModalProps) {
  const { broadcast } = useNotifications()
  const { user, activeClassId } = useAuth()
  const appName = useAppName()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<NotificationCategory>('news')
  const [targetClassId, setTargetClassId] = useState<string>(activeClassId || 'all')
  const [sending, setSending] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)

  const isSuperAdmin = user?.role === 'super_admin'

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    setSending(true)
    try {
      await broadcast({
        title: title.trim(),
        body: body.trim(),
        category,
        classId: targetClassId === 'all' ? null : targetClassId,
      })
      setSentSuccess(true)
      setTimeout(() => {
        setSentSuccess(false)
        setTitle('')
        setBody('')
        onClose()
      }, 1400)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="📢 Broadcast Push Notification">
      {sentSuccess ? (
        <div className="py-8 text-center space-y-3">
          <div className="size-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-base font-bold text-text">Notification Sent Successfully!</h3>
          <p className="text-xs text-muted">
            All users with notifications enabled will receive this alert as a push popup on their screen.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-4">
          <p className="text-xs text-secondary leading-relaxed">
            Send an instant notification to students and members. Everyone who allowed notifications will see this popup on their device even before opening the app.
          </p>

          {isSuperAdmin && availableClasses.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">Target Audience</label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full rounded-btn border border-border-hover bg-bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-600/30"
              >
                <option value="all">🌐 All Classes & Students</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    📚 {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">Category</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'news', label: '📢 News / Update' },
                { id: 'reminder', label: '💳 Payment Reminder' },
                { id: 'announcement', label: '🔔 Class Notice' },
              ].map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id as NotificationCategory)}
                  className={`px-3 py-2 text-xs font-semibold rounded-btn border transition-all cursor-pointer text-center ${
                    category === cat.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-bg-card text-secondary border-border hover:bg-bg-elevated'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">Notification Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 📢 Important: Monthly Contribution Deadline"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">Message Content</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the message that will pop up on students' screens..."
              rows={3}
              required
              className="w-full rounded-btn border border-border-hover bg-bg-card p-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-600/30"
            />
          </div>

          {/* Notification Live Preview */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1.5">
              Live Notification Popup Preview
            </span>
            <div className="rounded-lg bg-white dark:bg-slate-900 border border-border p-2.5 shadow-sm">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                <span>{appName} &middot; Push Notification</span>
                <span className="text-[10px] text-muted">Just now</span>
              </div>
              <p className="text-xs font-bold text-text truncate">{title || 'Your Notification Title'}</p>
              <p className="text-[11px] text-muted line-clamp-2 mt-0.5">
                {body || 'Your message will appear here on students desktop/mobile screens...'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !body.trim() || sending}
              loading={sending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send size={15} /> Send Broadcast Push
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
