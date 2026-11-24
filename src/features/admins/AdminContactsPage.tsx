import { useState } from 'react'
import {
  Users,
  MessageSquare,
  Phone,
  Send,
  Trash2,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Megaphone,
  HelpCircle,
  MessageCircle,
  Mail,
} from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../auth/AuthContext'
import { useAdminCommunications } from './useAdminCommunications'
import { formatDate } from '../../lib/utils'

export function AdminContactsPage() {
  const { user } = useAuth()
  const { adminsList, messages, loading, submitting, postMessage, deleteMessage } =
    useAdminCommunications()

  // Hide Super Admin from Class Admins and Finance Manager
  const visibleAdmins = adminsList.filter((admin) => {
    if (user?.role !== 'super_admin' && admin.role === 'super_admin') {
      return false
    }
    return true
  })

  const [activeTab, setActiveTab] = useState<'directory' | 'messages'>('directory')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<'general' | 'announcement' | 'urgent' | 'query'>(
    'general'
  )
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [postError, setPostError] = useState<string | null>(null)

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setPostError(null)
    const err = await postMessage(content.trim(), category)
    if (err) {
      setPostError(err)
    } else {
      setContent('')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this message from admin board?')) return
    await deleteMessage(id)
  }

  const filteredMessages =
    filterCategory === 'all'
      ? messages
      : messages.filter((m) => m.category === filterCategory)

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'urgent':
        return (
          <Badge variant="danger" className="flex items-center gap-1 text-[10px] px-2 py-0.5">
            <AlertTriangle size={11} /> Urgent
          </Badge>
        )
      case 'announcement':
        return (
          <Badge variant="default" className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-brand-600 text-white">
            <Megaphone size={11} /> Announcement
          </Badge>
        )
      case 'query':
        return (
          <Badge variant="warning" className="flex items-center gap-1 text-[10px] px-2 py-0.5">
            <HelpCircle size={11} /> Question
          </Badge>
        )
      default:
        return (
          <Badge variant="default" className="text-[10px] px-2 py-0.5">
            General
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-text flex items-center gap-2.5">
            <Shield className="text-brand-600" /> Admin Communications & Directory
          </h1>
          <p className="text-sm text-muted mt-1">
            Direct coordination and contact hub between Super Administrators and Class Treasurers.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-btn border border-border bg-bg-card p-1 shadow-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-btn text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-secondary hover:text-text'
            }`}
          >
            <Users size={14} /> Admin Directory ({visibleAdmins.length})
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-btn text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-secondary hover:text-text'
            }`}
          >
            <MessageSquare size={14} /> Admin Noticeboard ({messages.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Admin Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleAdmins.map((admin) => {
              const isSuper = admin.role === 'super_admin'
              const isFinanceMgr = admin.role === 'finance_manager'
              const cleanPhone = admin.phone ? admin.phone.replace(/[^0-9+]/g, '') : ''

              return (
                <Card key={admin.id} className="transition-all hover:border-border-hover">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-11 rounded-full flex items-center justify-center shrink-0 font-bold text-white shadow-sm ${
                            isSuper
                              ? 'bg-gradient-to-tr from-brand-700 to-brand-500'
                              : isFinanceMgr
                              ? 'bg-gradient-to-tr from-amber-600 to-amber-500'
                              : 'bg-gradient-to-tr from-slate-700 to-slate-500'
                          }`}
                        >
                          {isSuper ? <ShieldCheck size={20} /> : <Shield size={19} />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-text text-base leading-snug">
                            {admin.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={isSuper ? 'default' : isFinanceMgr ? 'warning' : 'info'}
                              className={`text-[10px] uppercase font-bold tracking-wider ${
                                isSuper ? 'bg-brand-600 text-white' : ''
                              }`}
                            >
                              {isSuper ? 'Super Admin' : isFinanceMgr ? 'Finance Manager' : 'Class Admin'}
                            </Badge>
                            <span className="text-xs text-muted">ID: {admin.student_id}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Classes */}
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-muted font-medium block mb-1">
                        Scope / Assigned Classes:
                      </span>
                      {isSuper ? (
                        <span className="inline-block text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded">
                          Full Administrative Access (All Classes)
                        </span>
                      ) : isFinanceMgr ? (
                        <span className="inline-block text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                          All Classes
                        </span>
                      ) : admin.assignedClasses && admin.assignedClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {admin.assignedClasses.map((clsName, idx) => (
                            <span
                              key={idx}
                              className="text-xs font-medium text-text bg-bg-elevated px-2 py-0.5 rounded border border-border"
                            >
                              {clsName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">No classes currently assigned</span>
                      )}
                    </div>

                    {/* Direct Contact Actions */}
                    <div className="pt-2 border-t border-border/70 flex flex-wrap items-center gap-2">
                      {cleanPhone ? (
                        <>
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20 text-xs font-semibold transition-colors"
                          >
                            <MessageCircle size={14} /> WhatsApp
                          </a>
                          <a
                            href={`tel:${cleanPhone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn border border-border hover:bg-bg-elevated text-xs font-semibold text-secondary transition-colors"
                          >
                            <Phone size={13} /> {admin.phone}
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Phone size={13} className="opacity-50" /> No phone provided
                        </span>
                      )}

                      <a
                        href={`mailto:${admin.student_id}@classbank.local`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn text-xs font-medium text-muted hover:text-text transition-colors ml-auto"
                        title="Send Internal Mail"
                      >
                        <Mail size={13} /> Email
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Admin Noticeboard & Communication Channel */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          {/* Post New Admin Broadcast Message */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text flex items-center gap-2">
                  <Megaphone size={16} className="text-brand-600" /> Post Admin Announcement or Comment
                </h3>
                <span className="text-xs text-muted">
                  Visible to Super Admins, Finance Managers & Class Admins
                </span>
              </div>

              <form onSubmit={handlePost} className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(['general', 'announcement', 'urgent', 'query'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer ${
                        category === cat
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-bg-elevated text-secondary hover:text-text border border-border'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share a class contribution update, financial deadline, treasury policy change, or question..."
                  rows={3}
                  className="w-full rounded-card border border-border bg-bg-card p-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-600/30 resize-none"
                  required
                />

                {postError && (
                  <p className="text-xs text-error bg-error/10 p-2 rounded-btn border border-error/20">
                    {postError}
                  </p>
                )}

                <div className="flex justify-end">
                  <Button type="submit" loading={submitting} disabled={!content.trim() || submitting}>
                    <Send size={14} className="mr-1.5" /> Broadcast to Admins
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-secondary mr-1">Filter:</span>
            {['all', 'urgent', 'announcement', 'general', 'query'].map((c) => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all cursor-pointer ${
                  filterCategory === c
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-bg-card border border-border text-secondary hover:text-text'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          {loading && messages.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted">Loading messages...</div>
          ) : filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted text-sm space-y-1">
                <p className="font-semibold text-base">No admin notices yet</p>
                <p>Broadcast your first announcement or notice to your fellow class administrators.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((msg) => {
                const isAuthor = user?.id === msg.sender_id
                const canDelete = isAuthor || user?.role === 'super_admin'

                return (
                  <Card key={msg.id} className="transition-all hover:border-border-hover">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-brand-600/10 text-brand-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {msg.sender_role === 'super_admin' ? (
                              <ShieldCheck size={16} />
                            ) : (
                              <Shield size={15} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-text">
                                {msg.sender_name}
                              </span>
                              <Badge
                                variant={msg.sender_role === 'super_admin' ? 'default' : msg.sender_role === 'finance_manager' ? 'warning' : 'info'}
                                className="text-[9px] px-1.5 py-0 uppercase tracking-wider"
                              >
                                {msg.sender_role === 'super_admin' ? 'Super Admin' : msg.sender_role === 'finance_manager' ? 'Finance Manager' : 'Class Admin'}
                              </Badge>
                              {getCategoryBadge(msg.category)}
                            </div>
                            <span className="text-[10px] text-muted block mt-0.5">
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                        </div>

                        {canDelete && (
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="text-muted hover:text-error p-1 rounded transition-colors cursor-pointer"
                            title="Delete message"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-text leading-relaxed whitespace-pre-wrap pl-10">
                        {msg.content}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
