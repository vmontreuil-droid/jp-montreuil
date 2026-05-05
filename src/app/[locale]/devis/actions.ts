'use server'

import { headers } from 'next/headers'
import { after } from 'next/server'
import { render } from '@react-email/render'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { sendEmail, ADMIN_EMAIL } from '@/lib/email/client'
import { NewCommissionRequest } from '@/lib/email/templates/NewCommissionRequest'
import { CommissionRequestReceived } from '@/lib/email/templates/CommissionRequestReceived'
import {
  FORMATS,
  FRAME_TYPES,
  SUPPLEMENT_IDS,
  PORTRAIT_COUNT_MIN,
  PORTRAIT_COUNT_MAX,
  estimatePrice,
  type FrameType,
} from '@/lib/atelier-config'
import { loadPricing } from '@/lib/commission-pricing'

export type CommissionState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

const STORAGE_BUCKET = 'commission-references'
const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
// Alle beeldformaten — we vertrouwen op MIME-type prefix.
const TECHNIQUES = new Set(['crayon_nb', 'aquarelle_couleur', 'acrylique_toile'])
const SUPPORTS = new Set(['papier_aquarelle', 'toile_lin'])
const FRAME_TYPE_SET = new Set<string>(FRAME_TYPES as readonly string[])
const FORMAT_PRESET_IDS = new Set<string>(FORMATS.map((f) => f.id))
const SUPPLEMENT_SET = new Set<string>(SUPPLEMENT_IDS as readonly string[])

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
  const message = String(formData.get('message') ?? '').trim()
  const discussOnly = formData.get('discuss_only') === 'on'

  if (!name || !email || !phone || !message) {
    return { status: 'error', message: t.errors.required }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: t.errors.email }
  }
  if (phone.length < 6) {
    return { status: 'error', message: t.errors.phone }
  }
  if (message.length < 5) {
    return { status: 'error', message: t.errors.tooShort }
  }
  if (message.length > 5000) {
    return { status: 'error', message: t.errors.tooLong }
  }

  // In discuss-mode skippen we de structured validatie — JP behandelt manueel.
  let technique: string
  let support: string | null
  let frameType: FrameType | null
  let widthCm: number | null = null
  let heightCm: number | null = null
  let formatChoice: string
  let portraitCount: number
  let supplements: string[]

  if (discussOnly) {
    technique = 'autre'
    support = null
    frameType = null
    formatChoice = 'custom'
    portraitCount = 1
    supplements = []
  } else {
    const techniqueRaw = String(formData.get('technique') ?? '').trim()
    const supportRaw = String(formData.get('support') ?? '').trim()
    const frameTypeRaw = String(formData.get('frame_type') ?? '').trim()
    formatChoice = String(formData.get('format_choice') ?? '').trim()
    const widthRaw = String(formData.get('width_cm') ?? '').trim()
    const heightRaw = String(formData.get('height_cm') ?? '').trim()
    const portraitCountRaw = String(formData.get('portrait_count') ?? '1').trim()

    if (!TECHNIQUES.has(techniqueRaw)) return { status: 'error', message: t.errors.required }
    if (!SUPPORTS.has(supportRaw)) return { status: 'error', message: t.errors.required }
    if (!FRAME_TYPE_SET.has(frameTypeRaw)) return { status: 'error', message: t.errors.required }
    technique = techniqueRaw
    support = supportRaw
    frameType = frameTypeRaw as FrameType

    // Format: ofwel preset (gebruik vaste afmetingen) ofwel custom (use input)
    if (FORMAT_PRESET_IDS.has(formatChoice)) {
      const preset = FORMATS.find((f) => (f.id as string) === formatChoice)!
      widthCm = preset.width
      heightCm = preset.height
    } else if (formatChoice === 'custom') {
      widthCm = parseNumber(widthRaw)
      heightCm = parseNumber(heightRaw)
      if (widthCm == null || heightCm == null) {
        return { status: 'error', message: t.errors.required }
      }
    } else {
      return { status: 'error', message: t.errors.required }
    }

    portraitCount = Math.min(
      PORTRAIT_COUNT_MAX,
      Math.max(PORTRAIT_COUNT_MIN, Number(portraitCountRaw) || PORTRAIT_COUNT_MIN)
    )

    const supplementsRaw = formData.getAll('supplements').map((v) => String(v))
    supplements = supplementsRaw.filter((s) => SUPPLEMENT_SET.has(s))
  }

  // Files — minstens 1 verplicht
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) {
    return { status: 'error', message: t.errors.referencesRequired }
  }
  if (files.length > MAX_FILES) {
    return { status: 'error', message: t.errors.tooManyFiles }
  }
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE) {
      return { status: 'error', message: t.errors.fileTooBig }
    }
    if (!f.type.toLowerCase().startsWith('image/')) {
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
      frame_type: frameType,
      portrait_count: portraitCount,
      supplements,
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

  // Schat de prijs voor in de mail naar JP (null voor discuss-mode of custom format)
  const pricing = await loadPricing()
  const priceEstimate =
    discussOnly || frameType == null
      ? null
      : estimatePrice({
          formatId: formatChoice,
          frameType,
          portraitCount,
          supplements,
          pricing,
        })

  // Mail-rendering + verzending gebeurt NA de response zodat de klant
  // (vooral op trage mobiele verbinding) niet wacht op 2× react-email +
  // 2× Resend-POST. Door 'after' blijft de Vercel-functie even draaien
  // voor de mails terwijl Safari al een succes te zien krijgt.
  const techniqueLabel = (t.techniqueOptions as Record<string, string>)[technique] || technique
  const supportLabel = support
    ? ((t.supportOptions as Record<string, string>)[support] || support)
    : null
  const frameTypeLabel = frameType
    ? ((t.frameTypeOptions as Record<string, string>)[frameType] || frameType)
    : null
  const supplementLabels = supplements.map(
    (s) => (t.supplementOptions as Record<string, string>)[s] || s
  )
  const isFR = locale === 'fr'
  const submittedAt = new Date()

  after(async () => {
    // Notify JP
    try {
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
          frameType,
          frameTypeLabel,
          portraitCount,
          supplements: supplementLabels,
          priceEstimate,
          message,
          attachments: attachmentInfo,
          submittedAt,
        })
      )

      const fallbackText = [
        `${isFR ? 'Nom' : 'Naam'}: ${name}`,
        `Email: ${email}`,
        phone ? `${isFR ? 'Téléphone' : 'Telefoon'}: ${phone}` : '',
        `${isFR ? 'Technique' : 'Techniek'}: ${techniqueLabel}`,
        supportLabel ? `${isFR ? 'Support' : 'Drager'}: ${supportLabel}` : '',
        widthCm && heightCm ? `${isFR ? 'Format' : 'Formaat'}: ${widthCm} × ${heightCm} cm` : '',
        frameTypeLabel ? `${isFR ? 'Encadrement' : 'Inkadering'}: ${frameTypeLabel}` : '',
        `${isFR ? 'Portraits' : 'Portretten'}: ${portraitCount}`,
        supplementLabels.length > 0
          ? `${isFR ? 'Suppléments' : 'Supplementen'}: ${supplementLabels.join(', ')}`
          : '',
        priceEstimate != null
          ? `${isFR ? 'Estimation' : 'Schatting'}: ${priceEstimate} €`
          : `${isFR ? 'Estimation' : 'Schatting'}: sur devis`,
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

    // Bevestigingsmail naar de klant
    try {
      const customerSubject = isFR
        ? 'Votre demande est bien arrivée — Atelier Montreuil'
        : 'Uw aanvraag is goed aangekomen — Atelier Montreuil'

      const customerHtml = await render(
        CommissionRequestReceived({
          recipientName: name,
          email,
          locale,
          techniqueLabel,
          supportLabel,
          width: widthCm,
          height: heightCm,
          frameTypeLabel,
          portraitCount,
          supplements: supplementLabels,
          message,
          attachmentCount: attachmentInfo.length,
          priceEstimate,
          submittedAt,
        })
      )

      const customerText = isFR
        ? `Bonjour ${name},\n\nVotre demande de devis est bien arrivée. Jean-Pierre vous reviendra avec une proposition détaillée — habituellement sous 48 heures ouvrables.\n\nÀ très bientôt,\nJean-Pierre Montreuil`
        : `Beste ${name},\n\nUw offerteaanvraag is goed bij ons aangekomen. Jean-Pierre stuurt u een gedetailleerd voorstel — meestal binnen 48 werkuren.\n\nTot binnenkort,\nJean-Pierre Montreuil`

      await sendEmail({
        to: email,
        subject: customerSubject,
        html: customerHtml,
        text: customerText,
        replyTo: ADMIN_EMAIL,
      })
    } catch (err) {
      console.error('Commission customer confirmation email failed', err)
    }
  })

  return { status: 'success' }
}
