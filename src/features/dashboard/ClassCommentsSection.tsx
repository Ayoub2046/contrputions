import { useState, useEffect } from 'react'
import { MessageSquare, Send, Trash2, ShieldCheck, User, Sparkles, Filter } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../auth/AuthContext'
import { useClassComments } from './useClassComments'
import { formatDate } from '../../lib/utils'
import { supabase } from '../../lib/supabase'

interface ClassCommentsSectionProps {
  classId: string | null
}

export function ClassCommentsSection({ classId }: ClassCommentsSectionProps) {
  const { user, activeClassId } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const isFinanceManager = user?.role === 'finance_manager'
  const canViewAllClasses = isSuperAdmin || isFinanceManager
  const isAdmin = isSuperAdmin || user?.role === 'admin' || isFinanceManager

  // Class filtering for Super Admin & Finance Manager
  const [selectedFilterClass, setSelectedFilterClass] = useState<string>(classId || 'all')
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (classId) {
      setSelectedFilterClass(classId)
    }
  }, [classId])

  useEffect(() => {
    if (isAdmin) {
      supabase.from('classes').select('id, name').order('name').then(({ data }) => {
        if (data && data.length > 0) {
          setAvailableClasses(data)
        }
      })
    }
  }, [isAdmin])

  // Determine effective classId to query
  const effectiveClassId = canViewAllClasses
    ? selectedFilterClass === 'all'
      ? null
      : selectedFilterClass
    : classId || activeClassId

  const { comments, loading, submitting, addComment, deleteComment } = useClassComments(effectiveClassId)

  // Target class for posting when Super Admin has "all" selected
  const [targetPostClassId, setTargetPostClassId] = useState<string>('')
  const [content, setContent] = useState('')
  const [postError, setPostError] = useState<string | null>(null)

  useEffect(() => {
    if (availableClasses.length > 0 && !targetPostClassId) {
      setTargetPostClassId(classId || availableClasses[0].id)
    }
  }, [availableClasses, classId, targetPostClassId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    const postClass = effectiveClassId || targetPostClassId || (availableClasses.length > 0 ? availableClasses[0].id : null)
    if (!postClass) {
      setPostError('Please select a class to post this message into.')
      return
    }

    setPostError(null)
    const err = await addComment(content.trim(), postClass)
    if (err) {
      setPostError(err)
    } else {
      setContent('')
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return
    await deleteComment(commentId)
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border/60">
      <div className="flex items-center justify-between flex-wrap gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-brand-600 dark:text-brand-400" />
          <h2 className="text-base font-bold text-text">Class Discussion & Student Feedback</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Super Admin & Finance Manager Class Filter */}
          {canViewAllClasses && availableClasses.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-muted" />
              <select
                value={selectedFilterClass}
                onChange={(e) => setSelectedFilterClass(e.target.value)}
                className="rounded-btn border border-border bg-bg-card px-2.5 py-1 text-xs text-text focus:outline-none focus:ring-2 focus:ring-brand-600/30 font-medium"
              >
                <option value="all">🌐 All Classes</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    📚 {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <span className="text-xs font-semibold text-muted bg-bg-elevated px-2.5 py-1 rounded-full border border-border">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
        </div>
      </div>

      {/* Post a Comment Card */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* If Super Admin or Finance Manager with "All" selected, pick target class */}
            {canViewAllClasses && selectedFilterClass === 'all' && availableClasses.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted font-medium">Post to Class:</span>
                <select
                  value={targetPostClassId}
                  onChange={(e) => setTargetPostClassId(e.target.value)}
                  className="rounded-btn border border-border bg-bg-card px-2.5 py-1 text-xs text-text focus:outline-none focus:ring-2 focus:ring-brand-600/30"
                >
                  {availableClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  isFinanceManager
                    ? "Post a financial audit note or comment to the Super Admin..."
                    : isAdmin
                    ? "Post a message, reply, or announcement to students in this class..."
                    : "Share your thoughts, suggestions, or ask questions about class contributions..."
                }
                rows={2}
                maxLength={500}
                className="w-full rounded-card border border-border bg-bg-card p-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-600/30 resize-none transition-all"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] text-muted">
                {content.length}/500
              </span>
            </div>

            {postError && (
              <p className="text-xs text-error bg-error/10 p-2 rounded-btn border border-error/20">
                {postError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1">
              <span className="text-[11px] text-muted flex items-center gap-1">
                <Sparkles size={12} className="text-brand-500 shrink-0" />
                <span>
                  {isFinanceManager
                    ? "Posting as Finance Manager (visible to Super Admin & class members)"
                    : isAdmin
                    ? "Posting as Admin (visible to all students in the class)"
                    : "Visible to all classmates & class admins"}
                </span>
              </span>
              <Button
                type="submit"
                loading={submitting}
                disabled={!content.trim() || submitting}
                className="w-full sm:w-auto h-8 px-4 text-xs flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-medium"
              >
                <Send size={13} /> {isAdmin ? "Send Comment" : "Post Comment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Comments List */}
      {loading && comments.length === 0 ? (
        <div className="text-center py-8 text-xs text-muted">Loading class discussion...</div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted text-sm space-y-1">
            <p className="font-medium">No comments yet</p>
            <p className="text-xs">
              {isAdmin
                ? "No student comments recorded yet. Any comments posted by students will appear right here."
                : "Be the first classmate to share a thought, suggestion, or question!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isAuthor = user?.id === comment.user_id
            const canDelete = isAuthor || isSuperAdmin || user?.role === 'admin'
            const isAuthorAdmin = comment.author_role === 'super_admin' || comment.author_role === 'admin' || comment.author_role === 'finance_manager'

            return (
              <Card key={comment.id} className="transition-all hover:border-border-hover">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          isAuthorAdmin
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'bg-bg-elevated text-secondary border border-border'
                        }`}
                      >
                        {isAuthorAdmin ? <ShieldCheck size={16} /> : <User size={15} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-text truncate">
                            {comment.author_name}
                          </span>
                          {isAuthorAdmin && (
                            <Badge variant="default" className={`text-[9px] px-1.5 py-0 uppercase tracking-wider font-bold ${
                              comment.author_role === 'finance_manager'
                                ? 'bg-amber-600 text-white'
                                : 'bg-brand-600 text-white'
                            }`}>
                              {comment.author_role === 'super_admin'
                                ? '👑 Super Admin'
                                : comment.author_role === 'finance_manager'
                                ? '💼 Finance Manager'
                                : '🛡 Class Admin'}
                            </Badge>
                          )}
                          {comment.author_student_id && !isAuthorAdmin && (
                            <span className="text-[11px] font-mono font-medium text-brand-600 dark:text-brand-400">
                              ({comment.author_student_id})
                            </span>
                          )}
                          {comment.class_name && (
                            <Badge variant="info" className="text-[10px] px-2 py-0">
                              📚 {comment.class_name}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-muted hover:text-error p-1.5 rounded-btn hover:bg-error/10 transition-colors cursor-pointer shrink-0"
                        title="Delete comment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-text leading-relaxed whitespace-pre-wrap pl-10 break-words">
                    {comment.content}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
