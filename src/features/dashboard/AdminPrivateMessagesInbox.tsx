import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Lock,
  MessageSquare,
  Phone,
  MessageSquareText,
  Trash2,
  Reply,
  RefreshCw,
  Send,
  Clock,
  CheckCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../auth/AuthContext'
import { useNotifications } from '../notifications/NotificationContext'
import { getValidAuthToken } from '../../lib/admin-api'
import { formatDate } from '../../lib/utils'

export interface PrivateMessageParty {
  id: string
  name: string
  role?: string | null
  phone: string | null
  student_id: string | null
  class_id: string | null
  classes?: { name: string } | null
}

export interface PrivateMessageItem {
  id: string
  sender_id: string
  recipient_id?: string | null
  content: string
  category: string
  created_at: string
  sender?: PrivateMessageParty | null
  recipient?: PrivateMessageParty | null
}

interface StudentThread {
  studentId: string
  student: PrivateMessageParty
  messages: PrivateMessageItem[] // oldest -> newest
  latestMessage: PrivateMessageItem
  unreadIds: string[]
}

interface AdminPrivateMessagesInboxProps {
  classId?: string | null
}

function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('252')) return digits
  if (digits.length === 9 && digits.startsWith('6')) return `252${digits}`
  if (digits.length === 10 && digits.startsWith('06')) return `252${digits.slice(1)}`
  return digits
}

export function AdminPrivateMessagesInbox({ classId }: AdminPrivateMessagesInboxProps) {
  const { user } = useAuth()
  const { notifications, markAsRead, markAllAsRead, refreshNotifications } = useNotifications()
  const [rawMessages, setRawMessages] = useState<PrivateMessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())

  // Reply modal state
  const [replyThread, setReplyThread] = useState<StudentThread | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [replyStatus, setReplyStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  // Filter
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all')

  // Sync read IDs directly from unified NotificationContext state
  const readIdSet = useMemo(() => {
    const s = new Set<string>()
    for (const n of notifications) {
      if (n.read) s.add(n.id)
    }
    return s
  }, [notifications])

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const token = await getValidAuthToken()
      if (!token) return

      const res = await fetch('/api/comments?action=private_messages', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setRawMessages(data)
        }
      }
    } catch (e) {
      console.warn('Failed to fetch private messages:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(() => {
      fetchMessages(true)
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  // Also scroll smoothly into view when arriving via #student-private-messages hash
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#student-private-messages') {
      setTimeout(() => {
        document.getElementById('student-private-messages')?.scrollIntoView({ behavior: 'smooth' })
      }, 250)
    }
  }, [])

  // Group 1-on-1 messages into clean per-student conversation threads (oldest -> newest inside each thread)
  const threads = useMemo<StudentThread[]>(() => {
    if (!user?.id) return []
    const byStudent = new Map<string, StudentThread>()

    // Sort raw messages chronologically ascending for thread assembly
    const ascending = [...rawMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    for (const msg of ascending) {
      const isFromMe = msg.sender_id === user.id
      const partnerId = isFromMe
        ? msg.recipient_id || (msg.category.startsWith('dm:') ? msg.category.slice(3) : '')
        : msg.sender_id

      if (!partnerId || partnerId === user.id) continue

      const partnerProfile: PrivateMessageParty = isFromMe
        ? msg.recipient || {
            id: partnerId,
            name: 'Student',
            phone: null,
            student_id: null,
            class_id: null,
          }
        : msg.sender || {
            id: partnerId,
            name: 'Student',
            phone: null,
            student_id: null,
            class_id: null,
          }

      let existing = byStudent.get(partnerId)
      if (!existing) {
        existing = {
          studentId: partnerId,
          student: partnerProfile,
          messages: [],
          latestMessage: msg,
          unreadIds: [],
        }
        byStudent.set(partnerId, existing)
      } else if (partnerProfile.name !== 'Student') {
        existing.student = partnerProfile
      }

      existing.messages.push(msg)
      existing.latestMessage = msg
      if (!isFromMe && !readIdSet.has(msg.id)) {
        existing.unreadIds.push(msg.id)
      }
    }

    // Optional class scope filter if Super Admin selected a specific class filter
    let threadList = Array.from(byStudent.values())
    if (classId && classId !== 'all') {
      const scoped = threadList.filter(
        (t) => !t.student.class_id || t.student.class_id === classId
      )
      // Only apply scope if it won't hide unlinked messages when admin owns single class
      if (scoped.length > 0 || user.role === 'super_admin') {
        threadList = scoped
      }
    }

    // Order threads by latest message descending (unread/newest on top)
    return threadList.sort(
      (a, b) =>
        new Date(b.latestMessage.created_at).getTime() -
        new Date(a.latestMessage.created_at).getTime()
    )
  }, [rawMessages, user?.id, user?.role, readIdSet, classId])

  const unreadThreads = useMemo(
    () => threads.filter((t) => t.unreadIds.length > 0),
    [threads]
  )
  const totalUnreadMessages = useMemo(
    () => threads.reduce((sum, t) => sum + t.unreadIds.length, 0),
    [threads]
  )
  const displayedThreads = activeFilter === 'unread' ? unreadThreads : threads

  // Keep active reply modal thread updated when new messages arrive
  const liveReplyThread = useMemo(() => {
    if (!replyThread) return null
    return threads.find((t) => t.studentId === replyThread.studentId) || replyThread
  }, [replyThread, threads])

  const markThreadAsRead = async (thread: StudentThread) => {
    for (const id of thread.unreadIds) {
      await markAsRead(id)
    }
  }

  const toggleExpandThread = (thread: StudentThread) => {
    markThreadAsRead(thread)
    setExpandedThreads((prev) => {
      const next = new Set(prev)
      if (next.has(thread.studentId)) next.delete(thread.studentId)
      else next.add(thread.studentId)
      return next
    })
  }

  const handleMarkAllRead = async () => {
    for (const t of unreadThreads) {
      for (const id of t.unreadIds) {
        await markAsRead(id)
      }
    }
    await markAllAsRead()
  }

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Remove this message from your confidential history?')) return
    try {
      const token = await getValidAuthToken()
      const res = await fetch(`/api/comments?action=private_message&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setRawMessages((prev) => prev.filter((m) => m.id !== id))
        refreshNotifications()
      }
    } catch (e) {
      console.warn('Delete private message error:', e)
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!liveReplyThread || !replyBody.trim()) return
    setReplySending(true)
    setReplyStatus(null)

    try {
      const token = await getValidAuthToken()
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient_id: liveReplyThread.studentId,
          class_id: liveReplyThread.student.class_id || classId,
          content: replyBody.trim(),
          is_private: true,
        }),
      })

      const resData = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to send reply')
      }

      // Immediately update local thread with saved message
      if (resData?.data) {
        setRawMessages((prev) => [
          {
            ...resData.data,
            sender: user
              ? {
                  id: user.id,
                  name: user.name,
                  role: user.role,
                  phone: user.phone || null,
                  student_id: user.student_id,
                  class_id: user.class_id || null,
                }
              : undefined,
            recipient: liveReplyThread.student,
            recipient_id: liveReplyThread.studentId,
          },
          ...prev,
        ])
      } else {
        await fetchMessages(true)
      }

      await markThreadAsRead(liveReplyThread)
      setReplyStatus({
        ok: true,
        msg: `Reply delivered confidentially to ${liveReplyThread.student.name}.`,
      })
      setReplyBody('')
      setTimeout(() => {
        setReplyStatus(null)
      }, 2200)
    } catch (err: any) {
      setReplyStatus({ ok: false, msg: err.message || 'Failed to send reply' })
    } finally {
      setReplySending(false)
    }
  }

  return (
    <div id="student-private-messages" className="space-y-4 pt-2 scroll-mt-20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECECEC] dark:border-[#203854] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-[#1176BC] text-[#FFFFFF] flex items-center justify-center shadow-xs shrink-0">
            <Lock size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF] leading-tight">
                Confidential Student Inquiries
              </h2>
              {totalUnreadMessages > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1176BC] text-[#FFFFFF]">
                  {totalUnreadMessages} Unread
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#52677D] dark:text-[#C6CACB]">
              Private 1-on-1 student inquiries and your confidential replies
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-1 bg-[#ECECEC] dark:bg-[#0D1B2C] rounded-xl border border-[#C6CACB]/40 dark:border-[#203854]">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#FFFFFF] dark:bg-[#172D47] text-[#1176BC] dark:text-[#FFFFFF] shadow-2xs'
                  : 'text-[#52677D] dark:text-[#C6CACB] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]'
              }`}
            >
              All ({threads.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('unread')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeFilter === 'unread'
                  ? 'bg-[#FFFFFF] dark:bg-[#172D47] text-[#1176BC] dark:text-[#FFFFFF] shadow-2xs'
                  : 'text-[#52677D] dark:text-[#C6CACB] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]'
              }`}
            >
              Unread ({unreadThreads.length})
            </button>
          </div>

          {unreadThreads.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#C6CACB] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] hover:bg-[#ECECEC] dark:hover:bg-[#172D47] text-[11px] font-bold text-[#1176BC] dark:text-[#25A8E0] transition-colors cursor-pointer"
            >
              <CheckCheck size={12} />
              Mark all read
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              fetchMessages()
              refreshNotifications()
            }}
            disabled={refreshing}
            className="p-1.5 rounded-xl border border-[#C6CACB] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] hover:bg-[#ECECEC] dark:hover:bg-[#172D47] text-[#52677D] dark:text-[#C6CACB] transition-colors cursor-pointer"
            title="Refresh private messages"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Threads List */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-24 rounded-2xl bg-[#ECECEC]/60 dark:bg-[#172D47]/40 animate-pulse" />
          <div className="h-24 rounded-2xl bg-[#ECECEC]/60 dark:bg-[#172D47]/40 animate-pulse" />
        </div>
      ) : displayedThreads.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-[#C6CACB] dark:border-[#203854]">
          <CardContent className="py-10 text-center space-y-2">
            <div className="size-12 rounded-2xl bg-[#1176BC]/10 dark:bg-[#1176BC]/20 text-[#1176BC] dark:text-[#25A8E0] flex items-center justify-center mx-auto">
              <Lock size={22} />
            </div>
            <p className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              {activeFilter === 'unread' ? 'No unread student inquiries' : 'No private student messages yet'}
            </p>
            <p className="text-xs text-[#52677D] dark:text-[#C6CACB] max-w-sm mx-auto">
              When students send confidential payment notes or extension requests from their dashboard, they will appear privately here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedThreads.map((thread) => {
            const hasUnread = thread.unreadIds.length > 0
            const student = thread.student
            const waNumber = student.phone ? formatWhatsAppNumber(student.phone) : ''
            const prefilledReply = `Hello ${student.name || 'student'}, regarding your message: `
            const isExpanded = expandedThreads.has(thread.studentId)
            const shownMessages = isExpanded ? thread.messages : thread.messages.slice(-2)
            const hiddenCount = Math.max(0, thread.messages.length - shownMessages.length)

            return (
              <Card
                key={thread.studentId}
                className={`rounded-2xl overflow-hidden transition-all shadow-xs border ${
                  hasUnread
                    ? 'border-[#1176BC]/70 dark:border-[#25A8E0]/70 bg-[#FFFFFF] dark:bg-[#102033] ring-1 ring-[#1176BC]/15'
                    : 'border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033]'
                }`}
              >
                <div className="p-4 sm:p-5 space-y-3.5">
                  {/* Top Bar: Student info & Direct Contact Channels */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div
                      onClick={() => toggleExpandThread(thread)}
                      className="flex items-center gap-3 cursor-pointer min-w-0"
                    >
                      <div className="size-10 rounded-xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] text-[#FFFFFF] flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                        {student.name?.charAt(0).toUpperCase() || 'S'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF] truncate">
                            {student.name || 'Student'}
                          </h4>
                          {hasUnread && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#1176BC] text-[#FFFFFF]">
                              {thread.unreadIds.length} New
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-[#52677D] dark:text-[#C6CACB]">
                          {student.student_id && (
                            <span className="font-mono font-semibold text-[#1176BC] dark:text-[#25A8E0]">
                              {student.student_id}
                            </span>
                          )}
                          {student.classes?.name && (
                            <>
                              <span>&bull;</span>
                              <span>{student.classes.name}</span>
                            </>
                          )}
                          <span>&bull;</span>
                          <span>
                            {thread.messages.length} {thread.messages.length === 1 ? 'message' : 'messages'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timestamp & Direct Channels */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-[#52677D] dark:text-[#C6CACB] flex items-center gap-1 font-medium">
                        <Clock size={12} />
                        {formatDate(thread.latestMessage.created_at)}
                      </span>

                      {student.phone && (
                        <div className="flex items-center gap-1 pl-1">
                          <a
                            href={`tel:${student.phone}`}
                            className="p-1.5 rounded-lg bg-[#1176BC]/10 hover:bg-[#1176BC] text-[#1176BC] dark:text-[#25A8E0] hover:text-[#FFFFFF] transition-colors"
                            title={`Call ${student.name} (${student.phone})`}
                          >
                            <Phone size={13} />
                          </a>
                          <a
                            href={`sms:${student.phone}?body=${encodeURIComponent(prefilledReply)}`}
                            className="p-1.5 rounded-lg bg-[#25A8E0]/10 hover:bg-[#25A8E0] text-[#25A8E0] hover:text-[#FFFFFF] transition-colors"
                            title={`Send SMS to ${student.name}`}
                          >
                            <MessageSquareText size={13} />
                          </a>
                          {waNumber && (
                            <a
                              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(prefilledReply)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-[#FFFFFF] transition-colors"
                              title={`WhatsApp ${student.name}`}
                            >
                              <MessageSquare size={13} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conversation History Bubbles */}
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpandThread(thread)}
                      className="text-[11px] font-semibold text-[#1176BC] dark:text-[#25A8E0] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronDown size={13} />
                      View {hiddenCount} earlier {hiddenCount === 1 ? 'message' : 'messages'}
                    </button>
                  )}

                  <div className="space-y-2">
                    {shownMessages.map((msg) => {
                      const isMyReply = msg.sender_id === user?.id
                      const isUnreadItem = !isMyReply && !readIdSet.has(msg.id)
                      return (
                        <div
                          key={msg.id}
                          onClick={() => {
                            if (isUnreadItem) markAsRead(msg.id)
                          }}
                          className={`group/msg p-3 rounded-xl border text-xs sm:text-sm flex items-start justify-between gap-2 transition-colors ${
                            isMyReply
                              ? 'ml-4 sm:ml-10 bg-[#EAF4FB] dark:bg-[#172D47] border-[#9FBBDE]/60 dark:border-[#25A8E0]/35'
                              : isUnreadItem
                              ? 'bg-[#FFFFFF] dark:bg-[#0D1B2C] border-[#1176BC]/60 dark:border-[#25A8E0]/60'
                              : 'bg-[#F4F8FC] dark:bg-[#0D1B2C] border-[#ECECEC] dark:border-[#203854]'
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 text-[10px] font-bold">
                              <span
                                className={
                                  isMyReply
                                    ? 'text-[#1176BC] dark:text-[#25A8E0]'
                                    : 'text-[#0B1A2B] dark:text-[#FFFFFF]'
                                }
                              >
                                {isMyReply ? 'You (Class Admin Reply)' : student.name || 'Student'}
                              </span>
                              <span className="font-normal text-[#52677D] dark:text-[#C6CACB]">
                                &bull; {formatDate(msg.created_at)}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-[#0B1A2B] dark:text-[#FFFFFF] leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteMessage(msg.id)
                            }}
                            className="opacity-70 group-hover/msg:opacity-100 text-[#52677D] hover:text-rose-600 dark:text-[#C6CACB] dark:hover:text-rose-400 p-1 rounded-md transition-colors cursor-pointer shrink-0"
                            title="Delete message"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Bottom Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#ECECEC] dark:border-[#203854]/60 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[#52677D] dark:text-[#C6CACB] flex items-center gap-1">
                        <Lock size={11} className="text-[#1176BC] dark:text-[#25A8E0]" />
                        Confidential 1-on-1 thread
                      </span>
                      {isExpanded && thread.messages.length > 2 && (
                        <button
                          type="button"
                          onClick={() => toggleExpandThread(thread)}
                          className="text-[11px] font-semibold text-[#52677D] dark:text-[#9FBBDE] hover:text-[#1176BC] flex items-center gap-0.5 cursor-pointer"
                        >
                          <ChevronUp size={12} /> Collapse
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {hasUnread && (
                        <button
                          type="button"
                          onClick={() => markThreadAsRead(thread)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#C6CACB] dark:border-[#203854] text-[11px] font-bold text-[#1176BC] dark:text-[#25A8E0] hover:bg-[#EAF4FB] dark:hover:bg-[#172D47] transition-colors cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => {
                          markThreadAsRead(thread)
                          setReplyThread(thread)
                          setReplyBody('')
                          setReplyStatus(null)
                        }}
                        className="h-8 gap-1.5 text-xs bg-gradient-to-r from-[#1176BC] to-[#25A8E0] text-[#FFFFFF]"
                      >
                        <Reply size={13} /> Reply Confidentially
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* CONFIDENTIAL 1-ON-1 CONVERSATION & REPLY MODAL */}
      <Modal
        open={Boolean(liveReplyThread)}
        onClose={() => {
          if (!replySending) {
            setReplyThread(null)
            setReplyStatus(null)
          }
        }}
        title={liveReplyThread ? `🔒 Confidential Chat: ${liveReplyThread.student.name}` : 'Reply'}
      >
        {liveReplyThread && (
          <form onSubmit={handleSendReply} className="space-y-4">
            {/* Scrollable 1-on-1 history inside modal */}
            <div className="max-h-56 overflow-y-auto space-y-2 rounded-xl border border-[#ECECEC] dark:border-[#203854] bg-[#F4F8FC] dark:bg-[#0D1B2C] p-3">
              {liveReplyThread.messages.map((msg) => {
                const isMine = msg.sender_id === user?.id
                return (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl text-xs space-y-1 ${
                      isMine
                        ? 'ml-6 bg-[#1176BC] text-[#FFFFFF]'
                        : 'mr-6 bg-[#FFFFFF] dark:bg-[#102033] text-[#0B1A2B] dark:text-[#FFFFFF] border border-[#ECECEC] dark:border-[#203854]'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between text-[10px] ${
                        isMine ? 'text-[#FFFFFF]/80' : 'text-[#52677D] dark:text-[#9FBBDE]'
                      }`}
                    >
                      <span className="font-bold">
                        {isMine ? 'You (Class Admin)' : liveReplyThread.student.name}
                      </span>
                      <span>{formatDate(msg.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  </div>
                )
              })}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1A2B] dark:text-[#FFFFFF] mb-1.5">
                Your Confidential Response
              </label>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={3}
                maxLength={600}
                required
                placeholder={`Write your private reply to ${liveReplyThread.student.name}...`}
                className="w-full rounded-xl border border-[#C6CACB] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] p-3 text-sm text-[#0B1A2B] dark:text-[#FFFFFF] placeholder:text-[#52677D] dark:placeholder:text-[#9FBBDE] focus:outline-none focus:ring-2 focus:ring-[#25A8E0]/40"
              />
            </div>

            {replyStatus && (
              <p
                className={`text-xs font-medium p-2.5 rounded-xl border ${
                  replyStatus.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                {replyStatus.msg}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                disabled={replySending}
                onClick={() => setReplyThread(null)}
              >
                Close
              </Button>
              <Button
                type="submit"
                loading={replySending}
                disabled={!replyBody.trim() || replySending}
                className="bg-gradient-to-r from-[#1176BC] to-[#25A8E0] text-[#FFFFFF]"
              >
                <Send size={14} /> Send Private Reply
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
