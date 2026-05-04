'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const STORAGE_BUCKET = 'commission-references'
const STATUSES = ['nieuw', 'in_behandeling', 'devis_envoye', 'accepte', 'refuse', 'complete'] as const

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/login')
}

export async function markRead(id: string) {
  await requireAdmin()
  const admin = createAdminClient()
  await admin
    .from('commission_requests')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
  revalidatePath('/admin/commissions')
  revalidatePath(`/admin/commissions/${id}`)
}

export async function updateCommissionStatus(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') || '')
  const status = String(formData.get('status') || '')
  if (!id || !(STATUSES as readonly string[]).includes(status)) {
    return
  }
  const admin = createAdminClient()
  await admin.from('commission_requests').update({ status }).eq('id', id)
  revalidatePath('/admin/commissions')
  revalidatePath(`/admin/commissions/${id}`)
}

export async function saveCommissionNotes(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') || '')
  const notes = String(formData.get('admin_notes') || '').trim()
  if (!id) return
  const admin = createAdminClient()
  await admin
    .from('commission_requests')
    .update({ admin_notes: notes || null })
    .eq('id', id)
  revalidatePath(`/admin/commissions/${id}`)
}

export async function deleteCommission(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') || '')
  if (!id) return
  const admin = createAdminClient()

  const { data: atts } = await admin
    .from('commission_attachments')
    .select('storage_path')
    .eq('request_id', id)
  const paths = (atts ?? []).map((a) => a.storage_path).filter(Boolean)
  if (paths.length > 0) {
    await admin.storage.from(STORAGE_BUCKET).remove(paths)
  }

  await admin.from('commission_requests').delete().eq('id', id)
  redirect('/admin/commissions')
}
