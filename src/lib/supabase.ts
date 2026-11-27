import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY

// Clean up any legacy shared localStorage session so opening a new tab doesn't inherit prior tab's session
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('classbank_auth')
  } catch {}
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use sessionStorage so each browser tab has its own independent login/session
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    persistSession: true,
    storageKey: 'classbank_auth_session',
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
