import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env')

let fileEnv = {}
if (existsSync(envPath)) {
  fileEnv = Object.fromEntries(
    readFileSync(envPath, 'utf-8')
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      }),
  )
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || fileEnv.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SECRET_KEY

console.log('Connecting to Supabase at:', SUPABASE_URL)
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function clearData() {
  try {
    // 1. Identify super admins to preserve
    const { data: superAdmins, error: saError } = await supabase
      .from('profiles')
      .select('id, name, student_id, role')
      .eq('role', 'super_admin')

    if (saError) {
      console.error('Error fetching super admin:', saError)
      return
    }

    console.log('Found Super Admin(s) to PRESERVE:', superAdmins)
    if (!superAdmins || superAdmins.length === 0) {
      console.error('ABORTING: No super admin found! Preserving all data to be safe.')
      return
    }

    const superAdminIds = new Set(superAdmins.map((a) => a.id))

    // 2. Clear contributions
    const { count: cCount, error: cErr } = await supabase.from('contributions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    console.log('Cleared contributions:', cErr ? cErr.message : 'OK')

    // 3. Clear expenses
    const { error: eErr } = await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    console.log('Cleared expenses:', eErr ? eErr.message : 'OK')

    // 4. Clear comments
    try {
      const { error: cmErr } = await supabase.from('class_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      console.log('Cleared class_comments:', cmErr ? cmErr.message : 'OK')
    } catch (e) {
      console.log('class_comments table skipped')
    }

    // 5. Clear recycle_bin
    try {
      const { error: rbErr } = await supabase.from('recycle_bin').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      console.log('Cleared recycle_bin:', rbErr ? rbErr.message : 'OK')
    } catch (e) {
      console.log('recycle_bin table skipped')
    }

    // 6. Clear notifications
    try {
      const { error: notifErr } = await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      console.log('Cleared notifications:', notifErr ? notifErr.message : 'OK')
    } catch (e) {
      console.log('notifications table skipped')
    }

    // 7. Clear activity logs
    try {
      const { error: alErr } = await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      console.log('Cleared activity_logs:', alErr ? alErr.message : 'OK')
    } catch (e) {
      console.log('activity_logs skipped')
    }

    // 8. Clear class_admins
    const { error: caErr } = await supabase.from('class_admins').delete().neq('class_id', '00000000-0000-0000-0000-000000000000')
    console.log('Cleared class_admins:', caErr ? caErr.message : 'OK')

    // 9. Clear student & admin profiles (KEEP ONLY SUPER ADMIN)
    const { data: allProfiles } = await supabase.from('profiles').select('id, role, name, student_id')
    if (allProfiles) {
      for (const p of allProfiles) {
        if (!superAdminIds.has(p.id)) {
          const { error: delPErr } = await supabase.from('profiles').delete().eq('id', p.id)
          console.log(`Deleted profile ${p.name} (${p.student_id}, ${p.role}):`, delPErr ? delPErr.message : 'OK')

          // Also delete from Supabase Auth
          try {
            const { error: authDelErr } = await supabase.auth.admin.deleteUser(p.id)
            if (authDelErr) console.warn(`Auth delete warning for ${p.id}:`, authDelErr.message)
          } catch (err) {
            console.warn(`Auth delete failed for ${p.id}`)
          }
        }
      }
    }

    // 10. Clear classes
    const { error: clErr } = await supabase.from('classes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    console.log('Cleared classes:', clErr ? clErr.message : 'OK')

    console.log('========================================================')
    console.log('[SUCCESS] ALL DATA CLEARED!')
    console.log('Preserved Super Admin:', superAdmins)
    console.log('========================================================')
  } catch (err) {
    console.error('Error during data cleanup:', err)
  }
}

clearData()
