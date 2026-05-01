'use server'

import { headers } from 'next/headers'
import { render } from '@react-email/render'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLocale, type Locale } from '@/i18n/config'
import { sendEmail, ADMIN_EMAIL } from '@/lib/email/client'
import { NewContactMessage } from '@/lib/email/templates/NewContactMessage'

export type ContactState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

function safeFilename(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200)
}

type AttachmentPayload = {
  filename: string
  size: number
  buffer?: Buffer
  contentType?: string
}

/**
 * Stuur notificatie-mail naar JP via het centrale email-systeem.
 * Geen-op als RESEND_API_KEY ontbreekt; bericht blijft in DB staan.
 * Voegt foto's als bijlagen toe (Resend), max ~30MB totaal.
 */
async function sendNotificationEmail(args: {
  name: string
  email: string
  phone: string
  message: string
  locale: Locale
  attachments: AttachmentPayload[]
  ip: string | null
}) {
  const isFR = args.locale === 'fr'
  const subject = isFR
    ? `Nouveau message via le site — ${args.name}`
    : `Nieuw bericht via de website — ${args.name}`

  const html = await render(
    NewContactMessage({
      name: args.name,
      email: args.email,
      phone: args.phone,
      message: args.message,
      locale: args.locale,
      attachments: args.attachments,
      ip: args.ip,
      submittedAt: new Date(),
    })
  )

  const fallbackText = [
    isFR ? `Nom: ${args.name}` : `Naam: ${args.name}`,
    `Email: ${args.email}`,
    isFR ? `Téléphone: ${args.phone}` : `Telefoon: ${args.phone}`,
    '',
    args.message,
  ].join('\n')

  // Bijlagen meesturen — cap op 30MB totaal om mail-server limieten te respecteren
  const MAX_TOTAL = 30 * 1024 * 1024
  let total = 0
  const mailAttachments = []
  for (const a of args.attachments) {
    if (!a.buffer) continue
    if (total + a.buffer.length > MAX_TOTAL) break
    total += a.buffer.length
    mailAttachments.push({
      filename: a.filename,
      content: a.buffer,
      contentType: a.contentType,
    })
  }

  await sendEmail({
    to: ADMIN_EMAIL,
    subject,
    html,
    text: fallbackText,
    replyTo: args.email,
    attachments: mailAttachments.length > 0 ? mailAttachments : undefined,
  })
}

export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()
  const localeRaw = String(formData.get('locale') ?? 'fr')
  const locale = isLocale(localeRaw) ? localeRaw : 'fr'
  const honeypot = String(formData.get('website') ?? '')

  if (honeypot) return { status: 'success' }

  // Verplichte velden
  if (!name || !email || !phone || !message) {
    return {
      status: 'error',
      message: locale === 'fr' ? 'Tous les champs sont requis.' : 'Alle velden zijn verplicht.',
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      status: 'error',
      message: locale === 'fr' ? 'Email invalide.' : 'Ongeldig e-mailadres.',
    }
  }
  if (message.length < 5 || message.length > 5000) {
    return {
      status: 'error',
      message: locale === 'fr' ? 'Message trop court ou trop long.' : 'Bericht te kort of te lang.',
    }
  }

  // Bestanden ophalen + valideren
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length > MAX_FILES) {
    return {
      status: 'error',
      message:
        locale === 'fr'
          ? `Maximum ${MAX_FILES} photos.`
          : `Maximum ${MAX_FILES} foto's.`,
    }
  }
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE) {
      return {
        status: 'error',
        message:
          locale === 'fr'
            ? `Photo "${f.name}" trop volumineuse (max 10MB).`
            : `Foto "${f.name}" te groot (max 10MB).`,
      }
    }
    if (!ALLOWED_TYPES.has(f.type.toLowerCase())) {
      return {
        status: 'error',
        message:
          locale === 'fr'
            ? `Format non supporté: ${f.name}.`
            : `Niet-ondersteund formaat: ${f.name}.`,
      }
    }
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  const userAgent = h.get('user-agent') ?? null

  const supabase = createAdminClient()

  // 1. Insert message
  const { data: msg, error: msgErr } = await supabase
    .from('contact_messages')
    .insert({ name, email, phone, message, locale, ip, user_agent: userAgent })
    .select('id')
    .single()

  if (msgErr || !msg) {
    console.error('Contact insert failed', msgErr)
    return {
      status: 'error',
      message: locale === 'fr' ? 'Erreur serveur.' : 'Server fout.',
    }
  }

  // 2. Upload elke file → contact-attachments bucket → contact_attachments rij
  // Bewaar buffers om door te geven aan notificatie-mail (zodat JP de foto's
  // direct in zijn mail ziet zonder admin-login te moeten doen).
  const attachmentInfo: AttachmentPayload[] = []
  for (const file of files) {
    try {
      const safe = safeFilename(file.name)
      const storagePath = `${msg.id}/${Date.now()}_${safe}`
      const buf = Buffer.from(await file.arrayBuffer())

      const { error: upErr } = await supabase.storage
        .from('contact-attachments')
        .upload(storagePath, buf, {
          contentType: file.type,
          upsert: false,
        })
      if (upErr) {
        console.error('Upload failed', upErr)
        continue
      }

      await supabase.from('contact_attachments').insert({
        message_id: msg.id,
        storage_path: storagePath,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
      })
      attachmentInfo.push({
        filename: file.name,
        size: file.size,
        buffer: buf,
        contentType: file.type,
      })
    } catch (err) {
      console.error('Attachment processing failed', err)
    }
  }

  // 3. Notificatie-mail naar JP (no-op als RESEND_API_KEY niet gezet)
  await sendNotificationEmail({
    name,
    email,
    phone,
    message,
    locale,
    attachments: attachmentInfo,
    ip,
  })

  return { status: 'success' }
}
