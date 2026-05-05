'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not_authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('forbidden')
  return { supabase, user }
}

export async function saveClientNotes(formData: FormData) {
  const { supabase, user } = await requireAdmin()
  const email = String(formData.get('email') || '').toLowerCase().trim()
  const notes = String(formData.get('notes') || '')

  if (!email) return

  await supabase
    .from('client_notes')
    .upsert(
      { email, notes, updated_at: new Date().toISOString(), updated_by: user.id },
      { onConflict: 'email' }
    )

  revalidatePath(`/admin/clients/${encodeURIComponent(email)}`)
}
