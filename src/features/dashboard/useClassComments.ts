import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { broadcastPushNotification } from '../notifications/notificationService'
import { getValidAuthToken } from '../../lib/admin-api'
import type { ClassComment } from '../../lib/types'

const LOCAL_STORAGE_KEY_PREFIX = 'classbank_comments_'

export function useClassComments(classId: string | null) {
  const { user } = useAuth()
  const [comments, setComments] = useState<ClassComment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSuperAdmin = user?.role === 'super_admin'
  const canViewAll = isSuperAdmin || user?.role === 'finance_manager'
  const cacheKey = classId ? `${LOCAL_STORAGE_KEY_PREFIX}${classId}` : `${LOCAL_STORAGE_KEY_PREFIX}all`

  const fetchComments = useCallback(async () => {
    if (!classId && !canViewAll) {
      setComments([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Try fetching via dedicated /api/comments endpoint (which uses service role to bypass RLS profile blocks)
      const token = await getValidAuthToken()
      if (token) {
        try {
          const apiParam = classId && classId !== 'all' ? `?class_id=${encodeURIComponent(classId)}` : '?class_id=all'
          const res = await fetch(`/api/comments${apiParam}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (res.ok) {
            const apiData: ClassComment[] = await res.json()
            if (Array.isArray(apiData)) {
              setComments(apiData)
              if (cacheKey) {
                try {
                  localStorage.setItem(cacheKey, JSON.stringify(apiData))
                } catch {}
              }
              setLoading(false)
              return
            }
          }
        } catch {}
      }

      // 2. Direct Supabase Query Fallback
      let query = supabase
        .from('class_comments')
        .select(`
          id,
          class_id,
          user_id,
          content,
          created_at,
          classes:class_id (
            name
          ),
          profiles:user_id (
            name,
            role,
            student_id
          )
        `)
        .order('created_at', { ascending: false })

      if (classId && classId !== 'all') {
        query = query.eq('class_id', classId)
      }

      const { data, error: err } = await query

      if (err) {
        // 3. Fallback to local cache if offline
        if (cacheKey) {
          try {
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
              const parsed = JSON.parse(cached)
              if (Array.isArray(parsed)) setComments(parsed)
            }
          } catch {}
        }
      } else if (Array.isArray(data)) {
        const mapped: ClassComment[] = data.map((item: any) => ({
          id: item.id,
          class_id: item.class_id,
          class_name: item.classes?.name ?? '',
          user_id: item.user_id,
          content: item.content,
          created_at: item.created_at,
          author_name: item.profiles?.name ?? (user && item.user_id === user.id ? user.name : 'Class Member'),
          author_role: item.profiles?.role ?? (user && item.user_id === user.id ? user.role : 'student'),
          author_student_id: item.profiles?.student_id ?? (user && item.user_id === user.id ? user.student_id : ''),
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
  }, [classId, cacheKey, isSuperAdmin, user])

  // Initial load and Realtime sync
  useEffect(() => {
    fetchComments()

    // Subscribe to live comment additions & deletions across the class
    const channel = supabase
      .channel(`class_comments_realtime_${classId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_comments',
        },
        () => {
          fetchComments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchComments, classId])

  const addComment = async (content: string, targetClassId?: string): Promise<string | null> => {
    const finalClassId = targetClassId || classId
    if (!content.trim() || !finalClassId || !user) {
      return 'Comment content and class are required.'
    }

    setSubmitting(true)
    setError(null)

    const newComment: ClassComment = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      class_id: finalClassId,
      user_id: user.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      author_name: user.name,
      author_role: user.role,
      author_student_id: user.student_id,
    }

    try {
      // Optimistically update state and cache immediately (0ms delay)
      setComments((prev) => [newComment, ...prev])
      if (cacheKey) {
        try {
          const current = [newComment, ...comments]
          localStorage.setItem(cacheKey, JSON.stringify(current))
        } catch {}
      }

      // Broadcast live popup notification to all students and admins
      broadcastPushNotification({
        id: newComment.id,
        title: `💬 ${user.name} commented in class`,
        body: content.trim(),
        category: 'news',
        senderName: user.name,
        senderRole: user.role,
        classId: finalClassId,
        createdAt: newComment.created_at,
      }).catch(() => {})

      // 1. Post via /api/comments
      const token = await getValidAuthToken()
      if (token) {
        try {
          const res = await fetch('/api/comments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              content: content.trim(),
              class_id: finalClassId,
            }),
          })
          if (res.ok) {
            setSubmitting(false)
            fetchComments()
            return null
          }
        } catch {}
      }

      // 2. Direct Supabase insert fallback
      const { error: err } = await supabase.from('class_comments').insert({
        id: newComment.id,
        class_id: finalClassId,
        user_id: user.id,
        content: content.trim(),
      } as never)

      setSubmitting(false)
      if (err) {
        // Still kept in local cache
        return null
      }
      return null
    } catch (e: any) {
      setSubmitting(false)
      return e.message || 'Failed to post comment'
    }
  }

  const deleteComment = async (id: string): Promise<string | null> => {
    // Instant optimistic deletion from UI (0ms delay)
    setComments((prev) => prev.filter((c) => c.id !== id))
    if (cacheKey) {
      try {
        const updated = comments.filter((c) => c.id !== id)
        localStorage.setItem(cacheKey, JSON.stringify(updated))
      } catch {}
    }

    try {
      const token = await getValidAuthToken()
      if (token) {
        try {
          const res = await fetch(`/api/comments?id=${id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (res.ok) return null
        } catch {}
      }

      await supabase.from('class_comments').delete().eq('id', id)
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
