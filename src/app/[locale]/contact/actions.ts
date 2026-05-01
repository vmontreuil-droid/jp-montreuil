'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLocale } from '@/i18n/config'

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
    } catch (err) {
      console.error('Attachment processing failed', err)
    }
  }

  return { status: 'success' }
}
