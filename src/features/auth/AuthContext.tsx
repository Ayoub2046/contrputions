import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'
import { AUTH_EMAIL_DOMAIN } from '../../lib/constants'
import { normalizeAuthPassword } from '../../lib/utils'

interface AdminClassInfo {
  id: string
  name: string
}

interface AuthState {
  user: Profile | null
  loading: boolean
  activeClassId: string | null
  adminClassIds: string[]
  adminClasses: AdminClassInfo[]
  setActiveClassId: (id: string | null) => void
  signIn: (studentId: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeClassId, setActiveClassId] = useState<string | null>(null)
  const [adminClassIds, setAdminClassIds] = useState<string[]>([])
  const [adminClasses, setAdminClasses] = useState<AdminClassInfo[]>([])

  async function fetchAdminClasses(profile: Profile) {
    if (profile.role !== 'admin') return
    const { data } = await supabase
      .from('class_admins')
      .select('class_id, classes!class_admins_class_id_fkey(name)')
      .eq('admin_id', profile.id)
    if (data) {
      const mapped = data.map((r: any) => ({ id: r.class_id, name: r.classes?.name ?? 'Unknown' }))
      setAdminClasses(mapped)
      const ids = mapped.map((r) => r.id)
      setAdminClassIds(ids)
      if (ids.length > 0 && !activeClassId) {
        setActiveClassId(ids[0])
      }
    }
  }

  async function fetchProfile(id: string) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (error) {
        console.warn('Profile fetch error:', error.message)
      }
      if (data) {
        setUser(data)
        await fetchAdminClasses(data)
        if (data.class_id) setActiveClassId(data.class_id)
      } else {
        setUser(null)
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    // Failsafe timeout: guarantee loading finishes in 5 seconds max on slow mobile connections
    const timer = setTimeout(() => {
      if (active) setLoading(false)
    }, 5000)

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        console.warn('getSession error:', err)
        if (active) setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      // INITIAL_SESSION fires when a new tab opens and finds an existing session.
      // We must NOT clear the user on this event — just load the profile.
      if (session?.user) {
        fetchProfile(session.user.id)
      } else if (_event !== 'INITIAL_SESSION') {
        // Only clear user on actual sign-out events, not on page load with no session
        setUser(null)
        setActiveClassId(null)
        setAdminClassIds([])
        setAdminClasses([])
        setLoading(false)
      } else {
        // No session on INITIAL_SESSION (truly not logged in)
        setLoading(false)
      }
    })

    return () => {
      active = false
      clearTimeout(timer)
      listener?.subscription.unsubscribe()
    }
  }, [])

  async function signIn(studentId: string, password: string): Promise<string | null> {
    const cleanId = studentId.trim()
    const email = cleanId.includes('@') ? cleanId : `${cleanId}@${AUTH_EMAIL_DOMAIN}`
    const finalPassword = normalizeAuthPassword(cleanId, password)
    setLoading(true)

    // First attempt: with normalized password
    let authRes = await supabase.auth.signInWithPassword({ email, password: finalPassword })

    // Fallback attempt: if failed and raw password was different, try raw password
    if (authRes.error && finalPassword !== password.trim()) {
      authRes = await supabase.auth.signInWithPassword({ email, password: password.trim() })
    }

    if (authRes.error) {
      setLoading(false)
      return authRes.error.message
    }

    if (authRes.data?.user) {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authRes.data.user.id)
        .single()

      if (profileErr) {
        console.error('Profile fetch error on login:', profileErr)
        setLoading(false)
        return `Database profile error: ${profileErr.message}`
      }

      if (profile) {
        setUser(profile)
        await fetchAdminClasses(profile)
        if (profile.class_id) setActiveClassId(profile.class_id)
        // Log login event
        supabase.from('activity_logs').insert({
          user_id: authRes.data.user.id,
          action: 'login',
          event_type: 'login',
        } as never).then(() => {}, () => {})
      } else {
        setLoading(false)
        return 'No profile found for this user account.'
      }
    }
    setLoading(false)
    return null
  }

  async function signOut() {
    try {
      // Log logout event before clearing session
      const uid = (await supabase.auth.getUser()).data.user?.id
      if (uid) {
        await supabase.from('activity_logs').insert({
          user_id: uid,
          action: 'logout',
          event_type: 'logout',
        } as never).then(() => {}, () => {})
      }
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Sign out warning:', err)
    } finally {
      setUser(null)
      setActiveClassId(null)
      setAdminClassIds([])
      setAdminClasses([])
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i)
          if (key && (key.startsWith('classbank_auth') || key.includes('supabase.auth.token') || key.startsWith('sb-'))) {
            sessionStorage.removeItem(key)
          }
        }
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('classbank_auth') || key.includes('supabase.auth.token') || key.startsWith('sb-'))) {
            localStorage.removeItem(key)
          }
        }
      } catch {}
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, activeClassId, adminClassIds, adminClasses, setActiveClassId, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
