'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/client'
import { ReplyToMessage } from '@/lib/email/templates/ReplyToMessage'
import { isLocale } from '@/i18n/config'

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

export type ReplyResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Stuur een opgemaakte HTML-mail antwoord naar de afzender van een
 * contact-bericht, en markeer het bericht als gelezen.
 */
export async function sendReply(formData: FormData): Promise<ReplyResult> {
  await requireAdmin()
  const admin = createAdminClient()

  const messageId = String(formData.get('message_id') ?? '')
  const subject = String(formData.get('subject') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()

  if (!messageId) return { ok: false, error: 'no_message_id' }
  if (!subject) return { ok: false, error: 'subject_empty' }
  if (body.length < 5) return { ok: false, error: 'body_too_short' }
  if (body.length > 10000) return { ok: false, error: 'body_too_long' }

  const { data: msg, error: fetchErr } = await admin
    .from('contact_messages')
    .select('email, name, message, locale, created_at, read_at')
    .eq('id', messageId)
    .single()

  if (fetchErr || !msg) return { ok: false, error: 'message_not_found' }

  // Optionele bijlagen meesturen
  const MAX_TOTAL = 30 * 1024 * 1024
  const ALLOWED = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
  ])
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
  let total = 0
  const mailAttachments: { filename: string; content: Buffer; contentType?: string }[] = []
  for (const f of files) {
    if (!ALLOWED.has(f.type.toLowerCase())) continue
    if (total + f.size > MAX_TOTAL) break
    const buf = Buffer.from(await f.arrayBuffer())
    mailAttachments.push({ filename: f.name, content: buf, contentType: f.type })
    total += f.size
  }

  const locale = isLocale(msg.locale ?? '') ? msg.locale : 'fr'

  const html = await render(
    ReplyToMessage({
      recipientName: msg.name,
      body,
      locale: locale as 'fr' | 'nl',
      originalMessage: {
        date: new Date(msg.created_at),
        preview: msg.message.slice(0, 500),
      },
    })
  )

  const result = await sendEmail({
    to: msg.email,
    subject,
    html,
    text: body,
    replyTo: process.env.RESEND_REPLY_TO || 'jp@montreuil.be',
    attachments: mailAttachments.length > 0 ? mailAttachments : undefined,
  })

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'send_failed' }
  }

  // Markeer als gelezen + record reply-tijd (gebruikt bestaande read_at)
  await admin
    .from('contact_messages')
    .update({ read_at: msg.read_at ?? new Date().toISOString() })
    .eq('id', messageId)

  revalidatePath('/admin/messages')
  revalidatePath('/admin')
  return { ok: true }
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
