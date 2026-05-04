'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomUUID } from 'node:crypto'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/client'
import { DevisToClient } from '@/lib/email/templates/DevisToClient'
import { StatusUpdate } from '@/lib/email/templates/StatusUpdate'
import { PortalWelcome } from '@/lib/email/templates/PortalWelcome'
import { PaymentReminder } from '@/lib/email/templates/PaymentReminder'
import { generateEpcQrDataUrl } from '@/lib/epc-qr'
import { PUBLIC_BASE_URL } from '@/lib/public-url'
import {
  ATELIER,
  buildStructuredReference,
  generateDevisNumber,
} from '@/lib/atelier-config'

const STORAGE_BUCKET = 'commission-references'

const STATUSES = [
  'nieuw',
  'in_behandeling',
  'devis_envoye',
  'signe',
  'refuse',
  'acompte_recu',
  'en_cours',
  'livre',
  'complete',
] as const

type Status = (typeof STATUSES)[number]

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
  const status = String(formData.get('status') || '') as Status
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

// ─── Devis flow ─────────────────────────────────────────────────────

export type ComposeDevisState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

type DevisLine = {
  description: string
  quantity: number
  unit_price: number
}

function parseLines(formData: FormData): DevisLine[] {
  const descriptions = formData.getAll('line_description')
  const quantities = formData.getAll('line_quantity')
  const prices = formData.getAll('line_unit_price')
  const lines: DevisLine[] = []
  for (let i = 0; i < descriptions.length; i++) {
    const description = String(descriptions[i] || '').trim()
    const quantity = Number(String(quantities[i] || '1').replace(',', '.')) || 0
    const unit_price = Number(String(prices[i] || '0').replace(',', '.')) || 0
    if (description && quantity > 0 && unit_price >= 0) {
      lines.push({ description, quantity, unit_price })
    }
  }
  return lines
}

export async function composeDevis(
  _prev: ComposeDevisState,
  formData: FormData
): Promise<ComposeDevisState> {
  await requireAdmin()
  const id = String(formData.get('id') || '')
  const subject = String(formData.get('devis_subject') || '').trim()
  const intro = String(formData.get('devis_intro') || '').trim()
  const acomptePctRaw = String(formData.get('devis_acompte_pct') || ATELIER.defaultAcomptePct)
  const acomptePct = Math.max(0, Math.min(100, Number(acomptePctRaw) || ATELIER.defaultAcomptePct))
  const vatRateRaw = String(formData.get('devis_vat_rate') || '0')
  const vatRate = Math.max(0, Math.min(100, Number(vatRateRaw) || 0))
  const validUntil = String(formData.get('devis_valid_until') || '').trim()
  const lines = parseLines(formData)

  if (!id) return { status: 'error', message: 'ID manquant.' }
  if (!subject) return { status: 'error', message: 'Donnez un titre au devis.' }
  if (lines.length === 0) {
    return { status: 'error', message: 'Ajoutez au moins une ligne avec un montant.' }
  }

  // Lijnen worden TTC ingevoerd (BTW inbegrepen) — BTW wordt eruit gehaald
  const total = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)
  const subtotalHt =
    vatRate > 0
      ? Math.round((total / (1 + vatRate / 100)) * 100) / 100
      : total
  const vatAmount = Math.round((total - subtotalHt) * 100) / 100
  const acompteEur = Math.round(total * (acomptePct / 100) * 100) / 100

  const admin = createAdminClient()

  // Bestaande commission ophalen om locale + devis_number te kennen
  const { data: existing } = await admin
    .from('commission_requests')
    .select('id, name, email, locale, signature_token, devis_subject')
    .eq('id', id)
    .single<{
      id: string
      name: string
      email: string
      locale: 'fr' | 'nl'
      signature_token: string | null
      devis_subject: string | null
    }>()

  if (!existing) return { status: 'error', message: 'Demande introuvable.' }

  const signatureToken = existing.signature_token || randomUUID()

  // Bouw devis-nummer (count rijen met devis_sent_at niet null + 1)
  const year = new Date().getFullYear()
  const { count } = await admin
    .from('commission_requests')
    .select('id', { count: 'exact', head: true })
    .not('devis_sent_at', 'is', null)
    .gte('devis_sent_at', `${year}-01-01`)
  const sequenceNumber = (count ?? 0) + 1
  const devisNumber = generateDevisNumber(year, sequenceNumber)
  // Gestructureerde Belgische mededeling (OGM) — bankapps vullen 'm
  // automatisch in via QR.
  const reference = buildStructuredReference(year, sequenceNumber)

  const { error: updErr } = await admin
    .from('commission_requests')
    .update({
      devis_subject: subject,
      devis_intro: intro || null,
      devis_lines: lines,
      devis_subtotal_eur: subtotalHt,
      devis_vat_rate: vatRate,
      devis_total_eur: total,
      devis_acompte_pct: acomptePct,
      devis_acompte_eur: acompteEur,
      devis_valid_until: validUntil || null,
      devis_payment_reference: reference,
      devis_sent_at: new Date().toISOString(),
      signature_token: signatureToken,
      status: 'devis_envoye',
    })
    .eq('id', id)

  if (updErr) {
    console.error('composeDevis update failed', updErr)
    return { status: 'error', message: 'Échec de l’enregistrement.' }
  }

  // Maak Supabase auth-account aan voor de klant (idempotent —
  // negeer de fout als de gebruiker al bestaat) en stuur een welkomstmail
  // met set-password link. Zo kan de klant straks inloggen op /portail.
  try {
    const tempPassword = randomUUID()
    const { error: createErr } = await admin.auth.admin.createUser({
      email: existing.email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
    })
    const wasNewUser = !createErr
    // 422 = User already registered → geen probleem, gewoon recovery sturen
    if (createErr && createErr.status !== 422) {
      console.warn('composeDevis: createUser non-fatal error', createErr.message)
    }

    const origin = PUBLIC_BASE_URL.replace(/\/$/, '')
    const next = '/portail/reset-password'
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: existing.email.toLowerCase(),
      options: { redirectTo },
    })

    const setupPasswordUrl = linkData?.properties?.hashed_token
      ? `${origin}/auth/confirm?token_hash=${encodeURIComponent(
          linkData.properties.hashed_token
        )}&type=recovery&next=${encodeURIComponent(next)}`
      : `${origin}/portail/login`

    const isFR = existing.locale === 'fr'
    if (wasNewUser) {
      const welcomeHtml = await render(
        PortalWelcome({
          recipientName: existing.name,
          setupPasswordUrl,
          portalUrl: `${origin}/portail/login`,
          locale: existing.locale,
        })
      )
      await sendEmail({
        to: existing.email,
        subject: isFR
          ? 'Activez votre espace client — Atelier Montreuil'
          : 'Activeer uw klantenportaal — Atelier Montreuil',
        html: welcomeHtml,
        text: isFR
          ? `${existing.name}, votre espace client est prêt. Définissez votre mot de passe : ${setupPasswordUrl}`
          : `${existing.name}, uw klantenportaal is klaar. Stel uw wachtwoord in: ${setupPasswordUrl}`,
        replyTo: ATELIER.email,
      })
    }
  } catch (err) {
    console.error('composeDevis: portal account setup failed (non-fatal)', err)
  }

  // Mail naar klant
  try {
    const isFR = existing.locale === 'fr'
    const html = await render(
      DevisToClient({
        clientName: existing.name,
        devisNumber,
        subject,
        intro: intro || null,
        lines,
        subtotalHt,
        vatRate,
        vatAmount,
        total,
        acomptePct,
        acompteEur,
        validUntil: validUntil || null,
        signToken: signatureToken,
        locale: existing.locale,
      })
    )
    const subjectLine = isFR
      ? `Votre devis ${devisNumber} — Atelier Montreuil`
      : `Uw offerte ${devisNumber} — Atelier Montreuil`
    await sendEmail({
      to: existing.email,
      subject: subjectLine,
      html,
      text: isFR
        ? `${existing.name},\n\nVotre devis ${devisNumber} est disponible.\nMontant total : ${total.toFixed(2)} €\nAcompte : ${acompteEur.toFixed(2)} €.\n\n— Jean-Pierre Montreuil`
        : `${existing.name},\n\nUw offerte ${devisNumber} staat klaar.\nTotaal: ${total.toFixed(2)} €\nVoorschot: ${acompteEur.toFixed(2)} €.\n\n— Jean-Pierre Montreuil`,
      replyTo: ATELIER.email,
    })
  } catch (err) {
    console.error('composeDevis email failed', err)
  }

  revalidatePath(`/admin/commissions/${id}`)
  revalidatePath('/admin/commissions')
  return { status: 'success' }
}

// Status-actie met email naar klant
async function transitionStatus(
  id: string,
  newStatus: 'acompte_recu' | 'en_cours' | 'livre' | 'complete' | 'refuse',
  timestampField: string | null
) {
  await requireAdmin()
  if (!id) return
  const admin = createAdminClient()

  const { data: req } = await admin
    .from('commission_requests')
    .select('id, name, email, locale, signature_token, devis_acompte_eur, devis_payment_reference, devis_total_eur')
    .eq('id', id)
    .single<{
      id: string
      name: string
      email: string
      locale: 'fr' | 'nl'
      signature_token: string | null
      devis_acompte_eur: number | null
      devis_payment_reference: string | null
      devis_total_eur: number | null
    }>()

  if (!req) return

  const update: Record<string, unknown> = { status: newStatus }
  if (timestampField) update[timestampField] = new Date().toISOString()

  await admin.from('commission_requests').update(update).eq('id', id)

  if (newStatus !== 'refuse') {
    try {
      const balance =
        req.devis_total_eur != null && req.devis_acompte_eur != null
          ? Math.round((req.devis_total_eur - req.devis_acompte_eur) * 100) / 100
          : null

      const html = await render(
        StatusUpdate({
          clientName: req.name,
          status: newStatus,
          locale: req.locale,
          signToken: req.signature_token,
          paymentReference: req.devis_payment_reference,
          // Bij 'acompte_recu' tonen we het saldo dat nog te betalen valt
          // bij levering. Bij 'livre' tonen we het te betalen saldo zelf.
          paymentAmountEur:
            newStatus === 'livre' || newStatus === 'acompte_recu' ? balance : null,
        })
      )

      const subjects: Record<typeof newStatus, { fr: string; nl: string }> = {
        acompte_recu: {
          fr: 'Acompte bien reçu — Atelier Montreuil',
          nl: 'Voorschot ontvangen — Atelier Montreuil',
        },
        en_cours: {
          fr: 'Votre œuvre est en cours — Atelier Montreuil',
          nl: 'Uw werk is in uitvoering — Atelier Montreuil',
        },
        livre: {
          fr: 'Œuvre livrée — Atelier Montreuil',
          nl: 'Werk afgeleverd — Atelier Montreuil',
        },
        complete: {
          fr: 'Commande clôturée — Atelier Montreuil',
          nl: 'Bestelling afgerond — Atelier Montreuil',
        },
      } as const

      await sendEmail({
        to: req.email,
        subject: subjects[newStatus][req.locale],
        html,
        text: `${req.name}, votre commande a été mise à jour : ${newStatus}.`,
        replyTo: ATELIER.email,
      })
    } catch (err) {
      console.error('transitionStatus email failed', err)
    }
  }

  revalidatePath(`/admin/commissions/${id}`)
  revalidatePath('/admin/commissions')
}

export async function markAcompteReceived(formData: FormData) {
  const id = String(formData.get('id') || '')
  await transitionStatus(id, 'acompte_recu', 'acompte_received_at')
}

export async function markInProgress(formData: FormData) {
  const id = String(formData.get('id') || '')
  await transitionStatus(id, 'en_cours', 'in_progress_at')
}

export async function markDelivered(formData: FormData) {
  const id = String(formData.get('id') || '')
  await transitionStatus(id, 'livre', 'delivered_at')
}

export async function markComplete(formData: FormData) {
  const id = String(formData.get('id') || '')
  await transitionStatus(id, 'complete', 'completed_at')
}

export async function markRefused(formData: FormData) {
  const id = String(formData.get('id') || '')
  await transitionStatus(id, 'refuse', 'refused_at')
}

// ─── Noodknoppen — herversturen mails ───────────────────────────────

type DevisLineRecord = {
  description: string
  quantity: number
  unit_price: number
}

type CommissionForResend = {
  id: string
  name: string
  email: string
  locale: 'fr' | 'nl'
  signature_token: string | null
  devis_subject: string | null
  devis_intro: string | null
  devis_lines: DevisLineRecord[] | null
  devis_subtotal_eur: number | null
  devis_vat_rate: number | null
  devis_total_eur: number | null
  devis_acompte_pct: number | null
  devis_acompte_eur: number | null
  devis_valid_until: string | null
  devis_payment_reference: string | null
}

async function loadCommissionForResend(id: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('commission_requests')
    .select(
      'id, name, email, locale, signature_token, devis_subject, devis_intro, devis_lines,' +
        ' devis_subtotal_eur, devis_vat_rate, devis_total_eur, devis_acompte_pct,' +
        ' devis_acompte_eur, devis_valid_until, devis_payment_reference'
    )
    .eq('id', id)
    .single<CommissionForResend>()
  return data
}

/** Herverstuur de oorspronkelijke devis-mail (met sign-link en alle details). */
export async function resendDevisEmail(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') || '')
  if (!id) return

  const req = await loadCommissionForResend(id)
  if (!req || !req.signature_token || !req.devis_subject) {
    redirect(`/admin/commissions/${id}?notice=missing_devis`)
  }

  try {
    const isFR = req.locale === 'fr'
    const lines = (req.devis_lines ?? []) as DevisLineRecord[]
    const subtotal =
      req.devis_subtotal_eur ?? lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
    const total = req.devis_total_eur ?? subtotal
    const html = await render(
      DevisToClient({
        clientName: req.name,
        devisNumber: req.devis_subject || `#${id.slice(0, 8)}`,
        subject: req.devis_subject!,
        intro: req.devis_intro,
        lines,
        subtotalHt: subtotal,
        vatRate: Number(req.devis_vat_rate ?? 0),
        vatAmount: Math.round((total - subtotal) * 100) / 100,
        total,
        acomptePct: req.devis_acompte_pct ?? 50,
        acompteEur: req.devis_acompte_eur ?? 0,
        validUntil: req.devis_valid_until,
        signToken: req.signature_token!,
        locale: req.locale,
      })
    )
    await sendEmail({
      to: req.email,
      subject: isFR
        ? 'Rappel : votre devis — Atelier Montreuil'
        : 'Herinnering: uw offerte — Atelier Montreuil',
      html,
      text: isFR
        ? `${req.name}, voici à nouveau votre devis. Total ${(total).toFixed(2)} €.`
        : `${req.name}, hier nogmaals uw offerte. Totaal ${(total).toFixed(2)} €.`,
      replyTo: ATELIER.email,
    })
  } catch (err) {
    console.error('resendDevisEmail failed', err)
  }
  revalidatePath(`/admin/commissions/${id}`)
  redirect(`/admin/commissions/${id}?notice=devis_resent`)
}

async function sendPaymentReminderInternal(
  id: string,
  type: 'acompte' | 'balance'
) {
  await requireAdmin()
  if (!id) return

  const req = await loadCommissionForResend(id)
  if (!req || !req.devis_payment_reference) {
    redirect(`/admin/commissions/${id}?notice=missing_devis`)
  }

  const total = req!.devis_total_eur ?? 0
  const acompte = req!.devis_acompte_eur ?? 0
  const amount =
    type === 'acompte' ? acompte : Math.round((total - acompte) * 100) / 100
  if (amount <= 0) {
    redirect(`/admin/commissions/${id}?notice=missing_amount`)
  }

  const reference = req!.devis_payment_reference!

  let qrDataUrl: string | null = null
  try {
    qrDataUrl = await generateEpcQrDataUrl({
      beneficiaryName: ATELIER.ibanHolder,
      iban: ATELIER.iban,
      amountEur: amount,
      communication: reference,
    })
  } catch (err) {
    console.error('Payment reminder QR failed', err)
  }

  try {
    const isFR = req!.locale === 'fr'
    const portalUrl = `${PUBLIC_BASE_URL.replace(/\/$/, '')}/portail/devis/${id}`
    const html = await render(
      PaymentReminder({
        recipientName: req!.name,
        paymentType: type,
        amountEur: amount,
        reference,
        iban: ATELIER.iban,
        ibanHolder: ATELIER.ibanHolder,
        qrDataUrl,
        portalUrl,
        locale: req!.locale,
      })
    )
    const subject =
      type === 'acompte'
        ? isFR
          ? 'Coordonnées pour votre acompte — Atelier Montreuil'
          : 'Gegevens voor uw voorschot — Atelier Montreuil'
        : isFR
          ? 'Coordonnées pour le solde — Atelier Montreuil'
          : 'Gegevens voor het saldo — Atelier Montreuil'

    await sendEmail({
      to: req!.email,
      subject,
      html,
      text: isFR
        ? `Bonjour ${req!.name}, voici les coordonnées de paiement : IBAN ${ATELIER.iban}, montant ${amount.toFixed(2)} €, communication structurée ${reference}.`
        : `Beste ${req!.name}, hier de betalingsgegevens: IBAN ${ATELIER.iban}, bedrag ${amount.toFixed(2)} €, gestructureerde mededeling ${reference}.`,
      replyTo: ATELIER.email,
    })
  } catch (err) {
    console.error(`sendPaymentReminder ${type} failed`, err)
  }

  revalidatePath(`/admin/commissions/${id}`)
  redirect(`/admin/commissions/${id}?notice=reminder_sent_${type}`)
}

/** Stuur een vriendelijke betaalherinnering voor het voorschot. */
export async function sendAcompteReminder(formData: FormData) {
  const id = String(formData.get('id') || '')
  await sendPaymentReminderInternal(id, 'acompte')
}

/** Stuur een vriendelijke betaalherinnering voor het saldo. */
export async function sendBalanceReminder(formData: FormData) {
  const id = String(formData.get('id') || '')
  await sendPaymentReminderInternal(id, 'balance')
}
