import { useState } from 'react'
import { MessageSquare, Send, Trash2, ShieldCheck, User, Sparkles } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../auth/AuthContext'
import { useClassComments } from './useClassComments'
import { formatDate } from '../../lib/utils'

interface ClassCommentsSectionProps {
  classId: string | null
}

export function ClassCommentsSection({ classId }: ClassCommentsSectionProps) {
  const { user } = useAuth()
  const { comments, loading, submitting, addComment, deleteComment } = useClassComments(classId)
  const [content, setContent] = useState('')
  const [postError, setPostError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setPostError(null)
    const err = await addComment(content.trim())
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
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-brand-600 dark:text-brand-400" />
          <h2 className="text-sm font-semibold text-secondary">Class Discussion & Feedback</h2>
        </div>
        <span className="text-[11px] font-medium text-muted bg-bg-elevated px-2 py-0.5 rounded-full border border-border">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      {/* Post a Comment Card */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts, suggestions, or ask questions about class contributions..."
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

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted flex items-center gap-1">
                <Sparkles size={12} className="text-brand-500" /> Visible to all classmates & class admins
              </span>
              <Button
                type="submit"
                loading={submitting}
                disabled={!content.trim() || submitting}
                className="h-8 px-3 text-xs flex items-center gap-1.5"
              >
                <Send size={13} /> Post
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Comments List */}
      {loading && comments.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted">Loading discussion...</div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted text-sm space-y-1">
            <p className="font-medium">No comments yet in this class</p>
            <p className="text-xs">Be the first classmate to share a thought, suggestion, or question!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {comments.map((comment) => {
            const isAuthor = user?.id === comment.user_id
            const canDelete = isAuthor || user?.role === 'super_admin' || user?.role === 'admin'
            const isAdmin = comment.author_role === 'super_admin' || comment.author_role === 'admin'

            return (
              <Card key={comment.id} className="transition-all hover:border-border-hover">
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`size-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          isAdmin
                            ? 'bg-brand-600 text-white'
                            : 'bg-bg-elevated text-secondary border border-border'
                        }`}
                      >
                        {isAdmin ? <ShieldCheck size={14} /> : <User size={13} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-text truncate">
                            {comment.author_name}
                          </span>
                          {isAdmin && (
                            <Badge variant="default" className="text-[9px] px-1.5 py-0 uppercase tracking-wider bg-brand-600 text-white">
                              {comment.author_role === 'super_admin' ? 'Super Admin' : 'Class Admin'}
                            </Badge>
                          )}
                          {comment.author_student_id && !isAdmin && (
                            <span className="text-[10px] text-muted">
                              ({comment.author_student_id})
                            </span>
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
                        className="text-muted hover:text-error p-1 rounded transition-colors cursor-pointer shrink-0"
                        title="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-text leading-relaxed whitespace-pre-wrap pl-9">
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
