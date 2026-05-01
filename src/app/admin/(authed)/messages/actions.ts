'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
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
  if (!profile || profile.role !== 'admin') redirect('/admin/login?error=not_admin')
  return supabase
}

export async function markRead(messageId: string) {
  const supabase = await requireAdmin()
  await supabase
    .from('contact_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)
  revalidatePath('/admin/messages')
  revalidatePath('/admin')
}

export async function markUnread(messageId: string) {
  const supabase = await requireAdmin()
  await supabase
    .from('contact_messages')
    .update({ read_at: null })
    .eq('id', messageId)
  revalidatePath('/admin/messages')
  revalidatePath('/admin')
}

export async function deleteMessage(messageId: string) {
  await requireAdmin()
  // Service role om bucket-bestanden + DB-rij te wissen (cascade dropt attachments-rijen)
  const admin = createAdminClient()

  // Eerst attachments-paden ophalen om uit storage te wissen
  const { data: atts } = await admin
    .from('contact_attachments')
    .select('storage_path')
    .eq('message_id', messageId)

  if (atts && atts.length) {
    await admin.storage
      .from('contact-attachments')
      .remove(atts.map((a) => a.storage_path))
  }

  await admin.from('contact_messages').delete().eq('id', messageId)
  revalidatePath('/admin/messages')
  revalidatePath('/admin')
}

/**
 * Maak een tijdelijke signed URL voor een private attachment (1 uur geldig).
 */
export async function getAttachmentUrl(storagePath: string): Promise<string | null> {
  await requireAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('contact-attachments')
    .createSignedUrl(storagePath, 60 * 60)
  if (error || !data) return null
  return data.signedUrl
}
