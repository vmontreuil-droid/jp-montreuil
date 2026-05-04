'use server'

import { headers } from 'next/headers'
import { render } from '@react-email/render'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { sendEmail, ADMIN_EMAIL } from '@/lib/email/client'
import { NewCommissionRequest } from '@/lib/email/templates/NewCommissionRequest'

export type CommissionState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

const STORAGE_BUCKET = 'commission-references'
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
const TECHNIQUES = new Set(['crayon_nb', 'aquarelle_couleur', 'acrylique_toile', 'autre'])
const SUPPORTS = new Set(['papier_aquarelle', 'toile_lin', 'peu_importe'])
const FRAMINGS = new Set(['oui', 'non', 'peu_importe'])

function safeFilename(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200)
}

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function submitCommission(
  _prev: CommissionState,
  formData: FormData
): Promise<CommissionState> {
  const localeRaw = String(formData.get('locale') ?? 'fr')
  const locale: Locale = isLocale(localeRaw) ? localeRaw : 'fr'
  const t = getDictionary(locale).devis

  const honeypot = String(formData.get('website') ?? '')
  if (honeypot) return { status: 'success' }

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const technique = String(formData.get('technique') ?? '').trim()
  const supportRaw = String(formData.get('support') ?? '').trim()
  const framingRaw = String(formData.get('framing') ?? '').trim()
  const widthRaw = String(formData.get('width_cm') ?? '').trim()
  const heightRaw = String(formData.get('height_cm') ?? '').trim()
  const budget = String(formData.get('budget') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()

  if (!name || !email || !message) {
    return { status: 'error', message: t.errors.required }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: t.errors.email }
  }
  if (message.length < 5) {
    return { status: 'error', message: t.errors.tooShort }
  }
  if (message.length > 5000) {
    return { status: 'error', message: t.errors.tooLong }
  }
  if (!TECHNIQUES.has(technique)) {
    return { status: 'error', message: t.errors.required }
  }
  const support = SUPPORTS.has(supportRaw) ? supportRaw : null
  const framing = FRAMINGS.has(framingRaw) ? framingRaw : null
  const widthCm = parseNumber(widthRaw)
  const heightCm = parseNumber(heightRaw)

  // Files
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length > MAX_FILES) {
    return { status: 'error', message: t.errors.tooManyFiles }
  }
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE) {
      return { status: 'error', message: t.errors.fileTooBig }
    }
    if (!ALLOWED_TYPES.has(f.type.toLowerCase())) {
      return { status: 'error', message: t.errors.unsupportedFile }
    }
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  const userAgent = h.get('user-agent') ?? null

  const supabase = createAdminClient()

  const { data: req, error: insErr } = await supabase
    .from('commission_requests')
    .insert({
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      locale,
      technique,
      support,
      width_cm: widthCm,
      height_cm: heightCm,
      framing,
      budget_indication: budget || null,
      message,
      ip,
      user_agent: userAgent,
    })
    .select('id')
    .single()

  if (insErr || !req) {
    console.error('Commission insert failed', insErr)
    return { status: 'error', message: t.errors.server }
  }

  // Upload reference photos
  const attachmentInfo: { filename: string; size: number }[] = []
  for (const file of files) {
    try {
      const safe = safeFilename(file.name)
      const storagePath = `${req.id}/${Date.now()}_${safe}`
      const buf = Buffer.from(await file.arrayBuffer())

      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buf, {
          contentType: file.type,
          upsert: false,
        })
      if (upErr) {
        console.error('Commission upload failed', upErr)
        continue
      }

      await supabase.from('commission_attachments').insert({
        request_id: req.id,
        storage_path: storagePath,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
      })
      attachmentInfo.push({ filename: file.name, size: file.size })
    } catch (err) {
      console.error('Commission attachment processing failed', err)
    }
  }

  // Notify JP
  try {
    const techniqueLabel = (t.techniqueOptions as Record<string, string>)[technique] || technique
    const supportLabel = support
      ? (t.supportOptions as Record<string, string>)[support] || support
      : null
    const framingLabel = framing
      ? (t.framingOptions as Record<string, string>)[framing] || framing
      : null

    const isFR = locale === 'fr'
    const subject = isFR
      ? `Nouvelle demande de devis — ${name}`
      : `Nieuwe offerteaanvraag — ${name}`

    const html = await render(
      NewCommissionRequest({
        id: req.id,
        name,
        email,
        phone,
        locale,
        technique,
        techniqueLabel,
        support,
        supportLabel,
        width: widthCm,
        height: heightCm,
        framing,
        framingLabel,
        budget: budget || null,
        message,
        attachments: attachmentInfo,
        submittedAt: new Date(),
      })
    )

    const fallbackText = [
      `${isFR ? 'Nom' : 'Naam'}: ${name}`,
      `Email: ${email}`,
      phone ? `${isFR ? 'Téléphone' : 'Telefoon'}: ${phone}` : '',
      `${isFR ? 'Technique' : 'Techniek'}: ${techniqueLabel}`,
      supportLabel ? `${isFR ? 'Support' : 'Drager'}: ${supportLabel}` : '',
      widthCm && heightCm ? `${isFR ? 'Format' : 'Formaat'}: ${widthCm} × ${heightCm} cm` : '',
      framingLabel ? `${isFR ? 'Encadrement' : 'Inkadering'}: ${framingLabel}` : '',
      budget ? `${isFR ? 'Budget' : 'Budget'}: ${budget}` : '',
      '',
      message,
    ]
      .filter(Boolean)
      .join('\n')

    await sendEmail({
      to: ADMIN_EMAIL,
      subject,
      html,
      text: fallbackText,
      replyTo: email,
    })
  } catch (err) {
    console.error('Commission notification email failed', err)
  }

  return { status: 'success' }
}
