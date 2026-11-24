import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { AdminMessage, Profile } from '../../lib/types'

const LOCAL_STORAGE_KEY = 'classbank_admin_messages'

export function useAdminCommunications() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [adminsList, setAdminsList] = useState<
    (Profile & { assignedClasses?: string[] })[]
  >([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAdmins = useCallback(async () => {
    try {
      // 1. Fetch all super_admin, admin, and finance_manager profiles
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['super_admin', 'admin', 'finance_manager'])
        .order('role', { ascending: false })

      if (profiles && !pErr) {
        // 2. Fetch class assignments
        const { data: assignments } = await supabase
          .from('class_admins')
          .select('admin_id, classes:class_id(name)')

        const map: Record<string, string[]> = {}
        if (assignments) {
          for (const a of assignments as any[]) {
            if (!map[a.admin_id]) map[a.admin_id] = []
            if (a.classes?.name) map[a.admin_id].push(a.classes.name)
          }
        }

        const enriched = profiles.map((p) => ({
          ...p,
          assignedClasses: map[p.id] || [],
        }))

        setAdminsList(enriched)
      }
    } catch (e: any) {
      console.warn('Error fetching admin directory:', e)
    }
  }, [])

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('admin_messages')
        .select(`
          id,
          sender_id,
          content,
          category,
          created_at,
          profiles:sender_id (
            name,
            role,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (err) {
        // Fallback to local cache if table not ready or offline
        try {
          const cached = localStorage.getItem(LOCAL_STORAGE_KEY)
          if (cached) setMessages(JSON.parse(cached))
        } catch {}
      } else if (data) {
        const mapped: AdminMessage[] = data.map((item: any) => ({
          id: item.id,
          sender_id: item.sender_id,
          content: item.content,
          category: item.category || 'general',
          created_at: item.created_at,
          sender_name: item.profiles?.name ?? 'Admin',
          sender_role: item.profiles?.role ?? 'admin',
          sender_phone: item.profiles?.phone ?? '',
        }))
        setMessages(mapped)
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mapped))
        } catch {}
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdmins()
    fetchMessages()
  }, [fetchAdmins, fetchMessages])

  const postMessage = async (
    content: string,
    category: 'general' | 'announcement' | 'urgent' | 'query' = 'general'
  ): Promise<string | null> => {
    if (!content.trim() || !user) return 'Message content is required.'

    setSubmitting(true)
    setError(null)

    const newMsg: AdminMessage = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      sender_id: user.id,
      content: content.trim(),
      category,
      created_at: new Date().toISOString(),
      sender_name: user.name,
      sender_role: user.role,
      sender_phone: user.phone,
    }

    try {
      const { error: err } = await supabase.from('admin_messages').insert({
        id: newMsg.id,
        sender_id: user.id,
        content: content.trim(),
        category,
      } as never)

      // Optimistic update
      setMessages((prev) => [newMsg, ...prev])
      try {
        const current = [newMsg, ...messages]
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current))
      } catch {}

      setSubmitting(false)
      if (err) {
        return null // Kept in local state
      }
      return null
    } catch (e: any) {
      setSubmitting(false)
      return e.message || 'Failed to post message'
    }
  }

  const deleteMessage = async (id: string): Promise<string | null> => {
    try {
      await supabase.from('admin_messages').delete().eq('id', id)
      setMessages((prev) => prev.filter((m) => m.id !== id))
      try {
        const updated = messages.filter((m) => m.id !== id)
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
      } catch {}
      return null
    } catch (e: any) {
      return e.message || 'Failed to delete message'
    }
  }

  return {
    adminsList,
    messages,
    loading,
    submitting,
    error,
    postMessage,
    deleteMessage,
    refetch: () => {
      fetchAdmins()
      fetchMessages()
    },
  }
}
