'use server'

import { headers } from 'next/headers'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLocale, type Locale } from '@/i18n/config'

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

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Stuur notificatie-mail naar JP via Resend. Geen-op als RESEND_API_KEY
 * niet geconfigureerd is — formulier blijft werken (DB-opslag).
 */
async function sendNotificationEmail(args: {
  name: string
  email: string
  phone: string
  message: string
  locale: Locale
  attachments: { filename: string; size: number }[]
  ip: string | null
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return // graceful skip
  const to = process.env.CONTACT_TO_EMAIL || 'jp@montreuil.be'
  const from = process.env.RESEND_FROM || 'Atelier Montreuil <onboarding@resend.dev>'

  try {
    const resend = new Resend(apiKey)
    const isFR = args.locale === 'fr'
    const subject = isFR
      ? `Nouveau message via le site — ${args.name}`
      : `Nieuw bericht via de website — ${args.name}`

    const attachLines = args.attachments.length
      ? args.attachments.map((a) => `  • ${a.filename} (${formatBytes(a.size)})`).join('\n')
      : isFR
      ? '  (aucune)'
      : '  (geen)'

    const text = [
      isFR ? `Nom        : ${args.name}` : `Naam       : ${args.name}`,
      `Email      : ${args.email}`,
      isFR ? `Téléphone  : ${args.phone}` : `Telefoon   : ${args.phone}`,
      '',
      isFR ? 'Message :' : 'Bericht :',
      args.message,
      '',
      isFR ? `Pièces jointes (${args.attachments.length}) :` : `Bijlagen (${args.attachments.length}) :`,
      attachLines,
      '',
      `Locale: ${args.locale} · IP: ${args.ip ?? 'unknown'}`,
      `Date  : ${new Date().toISOString()}`,
      '',
      isFR ? 'Voir l\'admin pour télécharger les pièces jointes.' : 'Open admin om bijlagen te bekijken.',
    ].join('\n')

    await resend.emails.send({
      from,
      to,
      replyTo: args.email,
      subject,
      text,
    })
  } catch (err) {
    console.error('Resend notify failed', err)
    // niet fataal — bericht staat al in DB
  }
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
  const attachmentInfo: { filename: string; size: number }[] = []
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
      attachmentInfo.push({ filename: file.name, size: file.size })
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
