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
import {
  ATELIER,
  buildPaymentReference,
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
  const validUntil = String(formData.get('devis_valid_until') || '').trim()
  const lines = parseLines(formData)

  if (!id) return { status: 'error', message: 'ID manquant.' }
  if (!subject) return { status: 'error', message: 'Donnez un titre au devis.' }
  if (lines.length === 0) {
    return { status: 'error', message: 'Ajoutez au moins une ligne avec un montant.' }
  }

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)
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
  const devisNumber = generateDevisNumber(year, (count ?? 0) + 1)
  const reference = buildPaymentReference(devisNumber)

  const { error: updErr } = await admin
    .from('commission_requests')
    .update({
      devis_subject: subject,
      devis_intro: intro || null,
      devis_lines: lines,
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
          paymentAmountEur: newStatus === 'livre' ? balance : null,
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
