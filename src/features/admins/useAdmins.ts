import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

export function useAdmins() {
  const [admins, setAdmins] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [adminClasses, setAdminClasses] = useState<Record<string, string[]>>({})

  async function fetch() {
    setLoading(true)
    const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'admin').order('name')
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
      }
    }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  return { admins, adminClasses, loading, refetch: fetch }
}
