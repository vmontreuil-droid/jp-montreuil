import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Helper voor server actions: vereist een ingelogde admin-user.
 * Gooit redirect bij ontbreken.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') {
    redirect('/admin/login?error=not_admin')
  }
  return supabase
}
