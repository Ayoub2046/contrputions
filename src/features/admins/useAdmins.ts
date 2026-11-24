import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

export function useAdmins() {
  const [admins, setAdmins] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [adminClasses, setAdminClasses] = useState<Record<string, string[]>>({})
  const [adminPasswords, setAdminPasswords] = useState<Record<string, string>>({})

  async function fetch() {
    setLoading(true)
    const { data: profiles } = await supabase.from('profiles').select('*').in('role', ['admin', 'finance_manager']).order('name')
    if (profiles) {
      setAdmins(profiles)
      const ids = profiles.map((a) => a.id)
      if (ids.length > 0) {
        const { data: assignments } = await supabase
          .from('class_admins')
          .select('admin_id, classes!class_admins_class_id_fkey(name)')
          .in('admin_id', ids)
        if (assignments) {
          const map: Record<string, string[]> = {}
          for (const r of assignments as any[]) {
            if (!map[r.admin_id]) map[r.admin_id] = []
            map[r.admin_id].push(r.classes?.name || 'Unknown')
          }
          setAdminClasses(map)
        }

        try {
          const { data: pwds } = await supabase
            .from('admin_passwords')
            .select('user_id, plain_password')
            .in('user_id', ids)
          if (pwds && Array.isArray(pwds)) {
            const pwdMap: Record<string, string> = {}
            for (const p of pwds) {
              pwdMap[p.user_id] = p.plain_password
            }
            setAdminPasswords(pwdMap)
          }
        } catch {}
      }
    }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  return { admins, adminClasses, adminPasswords, loading, refetch: fetch }
}
