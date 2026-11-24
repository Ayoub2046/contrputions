import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Keep the session alive in localStorage so new tabs pick it up automatically
    persistSession: true,
    storageKey: 'classbank_auth',
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
