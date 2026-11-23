import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { broadcastPushNotification } from '../notifications/notificationService'
import type { ClassComment } from '../../lib/types'

const LOCAL_STORAGE_KEY_PREFIX = 'classbank_comments_'

export function useClassComments(classId: string | null) {
  const { user } = useAuth()
  const [comments, setComments] = useState<ClassComment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cacheKey = classId ? `${LOCAL_STORAGE_KEY_PREFIX}${classId}` : null

  const fetchComments = useCallback(async () => {
    if (!classId) {
      setComments([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: err } = await supabase
        .from('class_comments')
        .select(`
          id,
          class_id,
          user_id,
          content,
          created_at,
          profiles:user_id (
            name,
            role,
            student_id
          )
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false })

      if (err) {
        // Fallback to local cache if table not ready or offline
        if (cacheKey) {
          try {
            const cached = localStorage.getItem(cacheKey)
            if (cached) setComments(JSON.parse(cached))
          } catch {}
        }
      } else if (data) {
        const mapped: ClassComment[] = data.map((item: any) => ({
          id: item.id,
          class_id: item.class_id,
          user_id: item.user_id,
          content: item.content,
          created_at: item.created_at,
          author_name: item.profiles?.name ?? 'Anonymous Student',
          author_role: item.profiles?.role ?? 'student',
          author_student_id: item.profiles?.student_id ?? '',
        }))
        setComments(mapped)
        if (cacheKey) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(mapped))
          } catch {}
        }
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [classId, cacheKey])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const addComment = async (content: string): Promise<string | null> => {
    if (!content.trim() || !classId || !user) {
      return 'Comment content is required.'
    }

    setSubmitting(true)
    setError(null)

    const newComment: ClassComment = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      class_id: classId,
      user_id: user.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      author_name: user.name,
      author_role: user.role,
      author_student_id: user.student_id,
    }

    try {
      const { error: err } = await supabase.from('class_comments').insert({
        id: newComment.id,
        class_id: classId,
        user_id: user.id,
        content: content.trim(),
      } as never)

      // Optimistically update state and cache
      setComments((prev) => [newComment, ...prev])
      if (cacheKey) {
        try {
          const current = [newComment, ...comments]
          localStorage.setItem(cacheKey, JSON.stringify(current))
        } catch {}
      }

      // Broadcast WhatsApp-style popup notification to all students and admins in class
      broadcastPushNotification({
        id: newComment.id,
        title: `💬 New message from ${user.name}`,
        body: content.trim(),
        category: 'news',
        senderName: user.name,
        senderRole: user.role,
        classId: classId,
        createdAt: newComment.created_at,
      }).catch(() => {})

      setSubmitting(false)
      if (err) {
        // If DB table isn't created yet in SQL editor, still kept in local cache
        return null
      }
      return null
    } catch (e: any) {
      setSubmitting(false)
      return e.message || 'Failed to post comment'
    }
  }

  const deleteComment = async (id: string): Promise<string | null> => {
    try {
      await supabase.from('class_comments').delete().eq('id', id)
      setComments((prev) => prev.filter((c) => c.id !== id))
      if (cacheKey) {
        try {
          const updated = comments.filter((c) => c.id !== id)
          localStorage.setItem(cacheKey, JSON.stringify(updated))
        } catch {}
      }
      return null
    } catch (e: any) {
      return e.message || 'Failed to delete comment'
    }
  }

  return {
    comments,
    loading,
    submitting,
    error,
    addComment,
    deleteComment,
    refetch: fetchComments,
  }
}