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
import { BalanceRequest } from '@/lib/email/templates/BalanceRequest'
import { DeliveryDateRequest } from '@/lib/email/templates/DeliveryDateRequest'
import { DeliveryConfirmed } from '@/lib/email/templates/DeliveryConfirmed'
import { ProgressUpdate } from '@/lib/email/templates/ProgressUpdate'
import { generateEpcQrDataUrl } from '@/lib/epc-qr'
import { PUBLIC_BASE_URL } from '@/lib/public-url'
import {
  ATELIER,
  buildStructuredReference,
  buildBalanceReference,
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
  'pret',
  'solde_recu',
  'livraison_planifiee',
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

// Status-actie met email naar klant (enkel voor de 'simpele' overgangen
// — voor pret/solde_recu/livraison_planifiee worden dedicated functies
// gebruikt verder in dit bestand met specifieke email-templates).
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

// ─── Werk klaar — saldo opvragen ─────────────────────────────────────

async function loadCommissionForBalance(id: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('commission_requests')
    .select(
      'id, name, email, locale, signature_token, devis_total_eur, devis_acompte_eur,' +
        ' devis_payment_reference, devis_balance_reference, acompte_received_at,' +
        ' delivery_address'
    )
    .eq('id', id)
    .single<{
      id: string
      name: string
      email: string
      locale: 'fr' | 'nl'
      signature_token: string | null
      devis_total_eur: number | null
      devis_acompte_eur: number | null
      devis_payment_reference: string | null
      devis_balance_reference: string | null
      acompte_received_at: string | null
      delivery_address: string | null
    }>()
  return data
}

/** Markeer werk als klaar — verstuurt mail met afrekening + saldo-OGM. */
export async function markReady(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') || '')
  if (!id) return

  const req = await loadCommissionForBalance(id)
  if (!req) return

  const total = req.devis_total_eur ?? 0
  const acompte = req.devis_acompte_eur ?? 0
  const balance = Math.round((total - acompte) * 100) / 100

  const admin = createAdminClient()

  // Bouw een aparte OGM voor het saldo (anders dan voor het voorschot)
  let balanceRef = req.devis_balance_reference
  if (!balanceRef) {
    const year = new Date().getFullYear()
    const { count } = await admin
      .from('commission_requests')
      .select('id', { count: 'exact', head: true })
      .not('devis_sent_at', 'is', null)
      .gte('devis_sent_at', `${year}-01-01`)
    balanceRef = buildBalanceReference(year, count ?? 1)
  }

  await admin
    .from('commission_requests')
    .update({
      status: 'pret',
      ready_at: new Date().toISOString(),
      devis_balance_reference: balanceRef,
    })
    .eq('id', id)

  if (balance > 0) {
    let qrDataUrl: string | null = null
    try {
      qrDataUrl = await generateEpcQrDataUrl({
        beneficiaryName: ATELIER.ibanHolder,
        iban: ATELIER.iban,
        amountEur: balance,
        communication: balanceRef,
      })
    } catch (err) {
      console.error('markReady QR failed', err)
    }

    try {
      const isFR = req.locale === 'fr'
      const portalUrl = `${PUBLIC_BASE_URL.replace(/\/$/, '')}/portail/devis/${id}`
      const html = await render(
        BalanceRequest({
          recipientName: req.name,
          totalEur: total,
          acompteEur: acompte,
          acompteReceivedAt: req.acompte_received_at
            ? new Date(req.acompte_received_at)
            : null,
          balanceEur: balance,
          reference: balanceRef,
          iban: ATELIER.iban,
          ibanHolder: ATELIER.ibanHolder,
          qrDataUrl,
          portalUrl,
          locale: req.locale,
        })
      )
      await sendEmail({
        to: req.email,
        subject: isFR
          ? 'Votre œuvre est prête — solde à régler'
          : 'Uw werk is klaar — saldo te betalen',
        html,
        text: isFR
          ? `${req.name}, votre œuvre est prête. Solde à régler : ${balance.toFixed(2)} € avec la communication ${balanceRef}.`
          : `${req.name}, uw werk is klaar. Saldo te betalen: ${balance.toFixed(2)} € met mededeling ${balanceRef}.`,
        replyTo: ATELIER.email,
      })
    } catch (err) {
      console.error('markReady email failed', err)
    }
  }

  revalidatePath(`/admin/commissions/${id}`)
  revalidatePath('/admin/commissions')
  redirect(`/admin/commissions/${id}?notice=ready_marked`)
}

/** Markeer saldo als ontvangen — vraagt klant naar leveringsdatum. */
export async function markBalanceReceived(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') || '')
  if (!id) return

  const admin = createAdminClient()
  const { data: req } = await admin
    .from('commission_requests')
    .select('id, name, email, locale')
    .eq('id', id)
    .single<{ id: string; name: string; email: string; locale: 'fr' | 'nl' }>()

  if (!req) return

  const paidAt = new Date()
  await admin
    .from('commission_requests')
    .update({
      status: 'solde_recu',
      balance_received_at: paidAt.toISOString(),
    })
    .eq('id', id)

  try {
    const isFR = req.locale === 'fr'
    const portalUrl = `${PUBLIC_BASE_URL.replace(/\/$/, '')}/portail/devis/${id}`
    const html = await render(
      DeliveryDateRequest({
        recipientName: req.name,
        paidAt,
        portalUrl,
        locale: req.locale,
      })
    )
    await sendEmail({
      to: req.email,
      subject: isFR
        ? 'Solde reçu — choisissez votre date de livraison'
        : 'Saldo ontvangen — kies uw leveringsdatum',
      html,
      text: isFR
        ? `${req.name}, votre solde est bien reçu. Connectez-vous à votre espace client pour choisir une date de livraison : ${portalUrl}`
        : `${req.name}, uw saldo is goed ontvangen. Log in op uw klantenportaal om een leveringsdatum te kiezen: ${portalUrl}`,
      replyTo: ATELIER.email,
    })
  } catch (err) {
    console.error('markBalanceReceived email failed', err)
  }

  revalidatePath(`/admin/commissions/${id}`)
  revalidatePath('/admin/commissions')
  redirect(`/admin/commissions/${id}?notice=balance_marked`)
}

/** Bevestig de door de klant voorgestelde leveringsdatum (eventueel
 *  aangepast door JP). Stuurt definitieve bevestiging-mail. */
export async function confirmDeliveryDate(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') || '')
  const dateStr = String(formData.get('confirmed_date') || '').trim()
  if (!id || !dateStr) return

  const confirmedDate = new Date(dateStr)
  if (Number.isNaN(confirmedDate.getTime())) {
    redirect(`/admin/commissions/${id}?notice=invalid_date`)
  }

  const admin = createAdminClient()
  const { data: req } = await admin
    .from('commission_requests')
    .select(
      'id, name, email, locale, delivery_address, delivery_alt_option, delivery_alt_specs'
    )
    .eq('id', id)
    .single<{
      id: string
      name: string
      email: string
      locale: 'fr' | 'nl'
      delivery_address: string | null
      delivery_alt_option: string | null
      delivery_alt_specs: string | null
    }>()
  if (!req) return

  await admin
    .from('commission_requests')
    .update({
      status: 'livraison_planifiee',
      delivery_confirmed_at: new Date().toISOString(),
      delivery_confirmed_date: confirmedDate.toISOString(),
    })
    .eq('id', id)

  try {
    const isFR = req.locale === 'fr'
    const altLabels: Record<string, { fr: string; nl: string }> = {
      home: {
        fr: 'Présent à domicile',
        nl: 'Aanwezig thuis',
      },
      neighbours: {
        fr: 'Remettre aux voisins',
        nl: 'Bij de buren afgeven',
      },
      door: {
        fr: 'Déposer à la porte',
        nl: 'Aan de deur leggen',
      },
      safe_place: {
        fr: 'Endroit sûr',
        nl: 'Veilige plek',
      },
      other: {
        fr: 'Autre',
        nl: 'Andere',
      },
    }
    const altLabel = req.delivery_alt_option
      ? altLabels[req.delivery_alt_option]?.[req.locale] || req.delivery_alt_option
      : null
    const altInstruction = altLabel
      ? req.delivery_alt_specs
        ? `${altLabel} — ${req.delivery_alt_specs}`
        : altLabel
      : null

    const portalUrl = `${PUBLIC_BASE_URL.replace(/\/$/, '')}/portail/devis/${id}`
    const html = await render(
      DeliveryConfirmed({
        recipientName: req.name,
        confirmedDate,
        deliveryAddress: req.delivery_address,
        altInstruction,
        portalUrl,
        locale: req.locale,
      })
    )
    await sendEmail({
      to: req.email,
      subject: isFR
        ? 'Livraison confirmée — Atelier Montreuil'
        : 'Levering bevestigd — Atelier Montreuil',
      html,
      text: isFR
        ? `${req.name}, votre livraison est confirmée pour le ${confirmedDate.toLocaleString('fr-BE', { dateStyle: 'long', timeStyle: 'short' })}.`
        : `${req.name}, uw levering is bevestigd voor ${confirmedDate.toLocaleString('nl-BE', { dateStyle: 'long', timeStyle: 'short' })}.`,
      replyTo: ATELIER.email,
    })
  } catch (err) {
    console.error('confirmDeliveryDate email failed', err)
  }

  revalidatePath(`/admin/commissions/${id}`)
  revalidatePath('/admin/commissions')
  redirect(`/admin/commissions/${id}?notice=delivery_confirmed`)
}

/** Klant-actie : voorstel leveringsdatum + adres + alt-opties. */
export async function proposeDeliveryByClient(formData: FormData) {
  // Geen requireAdmin — dit komt vanuit /portail. We checken sessie + email.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) redirect('/portail/login')

  const id = String(formData.get('id') || '')
  const proposed = String(formData.get('proposed_date') || '').trim()
  const address = String(formData.get('delivery_address') || '').trim()
  const altOption = String(formData.get('delivery_alt_option') || '').trim() || null
  const altSpecs = String(formData.get('delivery_alt_specs') || '').trim() || null

  if (!id || !proposed || !address) {
    redirect(`/portail/devis/${id}?err=missing_fields`)
  }

  const proposedDate = new Date(proposed)
  if (Number.isNaN(proposedDate.getTime())) {
    redirect(`/portail/devis/${id}?err=invalid_date`)
  }

  const allowedAlt = ['home', 'neighbours', 'door', 'safe_place', 'other']
  const safeAlt = altOption && allowedAlt.includes(altOption) ? altOption : null

  const admin = createAdminClient()
  // Controleer dat de bezoeker eigenaar is van deze commission
  const { data: existing } = await admin
    .from('commission_requests')
    .select('email')
    .eq('id', id)
    .single<{ email: string }>()
  if (!existing || existing.email.toLowerCase() !== user.email.toLowerCase()) {
    redirect('/portail')
  }

  await admin
    .from('commission_requests')
    .update({
      delivery_proposed_at: new Date().toISOString(),
      delivery_proposed_date: proposedDate.toISOString(),
      delivery_address: address,
      delivery_alt_option: safeAlt,
      delivery_alt_specs: altSpecs,
    })
    .eq('id', id)

  // Mail naar JP zodat hij weet dat er een voorstel ligt
  try {
    const dateStr = proposedDate.toLocaleString('fr-BE', {
      dateStyle: 'long',
      timeStyle: 'short',
    })
    await sendEmail({
      to: ATELIER.email,
      subject: 'Nouvelle proposition de livraison — Atelier Montreuil',
      html: `<p>Le client a proposé une date de livraison.</p>
<p><strong>${dateStr}</strong></p>
<p>Adresse : ${address.replace(/\n/g, '<br/>')}</p>
${safeAlt ? `<p>En cas d’absence : ${safeAlt}${altSpecs ? ` — ${altSpecs}` : ''}</p>` : ''}
<p><a href="${PUBLIC_BASE_URL.replace(/\/$/, '')}/admin/commissions/${id}">Ouvrir dans l’admin</a></p>`,
      text: `Le client propose une livraison le ${dateStr} à l’adresse : ${address}.`,
    })
  } catch (err) {
    console.error('proposeDeliveryByClient JP-notif failed', err)
  }

  revalidatePath(`/admin/commissions/${id}`)
  revalidatePath(`/portail/devis/${id}`)
  redirect(`/portail/devis/${id}?notice=delivery_proposed`)
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

// ─── Progress photos (foto's tijdens uitvoering) ────────────────────

const MAX_PROGRESS_FILES = 8
const MAX_PROGRESS_SIZE = 10 * 1024 * 1024 // 10MB
const PREVIEW_MAX_BYTES = 500 * 1024 // inline preview cap voor mail

function safeProgressFilename(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200)
}

export type AddProgressState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

/**
 * Upload één of meer voortgangsfoto's voor een commission, sla op en
 * stuur een vriendelijke notificatiemail naar de klant met een teaser.
 */
export async function addProgressUpdate(
  _prev: AddProgressState,
  formData: FormData
): Promise<AddProgressState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Non authentifié' }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { status: 'error', message: 'Accès refusé' }

  const id = String(formData.get('id') || '')
  const caption = String(formData.get('caption') || '').trim() || null
  if (!id) return { status: 'error', message: 'ID manquant' }

  const files = formData
    .getAll('files')
    .filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) {
    return { status: 'error', message: 'Sélectionnez au moins une photo.' }
  }
  if (files.length > MAX_PROGRESS_FILES) {
    return { status: 'error', message: `Maximum ${MAX_PROGRESS_FILES} photos par envoi.` }
  }
  for (const f of files) {
    if (f.size > MAX_PROGRESS_SIZE) {
      return { status: 'error', message: `« ${f.name} » dépasse 10 MB.` }
    }
    if (!f.type.toLowerCase().startsWith('image/')) {
      return { status: 'error', message: `« ${f.name} » n’est pas une image.` }
    }
  }

  const admin = createAdminClient()

  // Commission ophalen voor klant-info
  const { data: req } = await admin
    .from('commission_requests')
    .select('id, name, email, locale')
    .eq('id', id)
    .single<{ id: string; name: string; email: string; locale: 'fr' | 'nl' }>()
  if (!req) return { status: 'error', message: 'Commission introuvable' }

  // Update-rij maken
  const { data: updateRow, error: updateErr } = await admin
    .from('commission_progress_updates')
    .insert({ commission_id: id, caption, created_by: user.id })
    .select('id')
    .single<{ id: string }>()
  if (updateErr || !updateRow) {
    console.error('progress update insert failed', updateErr)
    return { status: 'error', message: 'Erreur serveur' }
  }

  // Upload foto's + insert photo-rijen + bewaar 1 buffer voor preview
  let previewDataUrl: string | null = null
  let uploadedCount = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const safe = safeProgressFilename(file.name)
      const storagePath = `${id}/progress/${updateRow.id}/${Date.now()}_${i}_${safe}`
      const buf = Buffer.from(await file.arrayBuffer())

      const { error: upErr } = await admin.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buf, {
          contentType: file.type,
          upsert: false,
        })
      if (upErr) {
        console.error('progress upload failed', upErr)
        continue
      }

      await admin.from('commission_progress_photos').insert({
        update_id: updateRow.id,
        storage_path: storagePath,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        sort_order: i,
      })
      uploadedCount++

      // Bewaar 1e foto onder preview-cap als inline preview voor de mail
      if (
        previewDataUrl == null &&
        buf.length <= PREVIEW_MAX_BYTES &&
        file.type.startsWith('image/')
      ) {
        previewDataUrl = `data:${file.type};base64,${buf.toString('base64')}`
      }
    } catch (err) {
      console.error('progress photo processing failed', err)
    }
  }

  if (uploadedCount === 0) {
    // Cleanup: lege update-rij verwijderen
    await admin.from('commission_progress_updates').delete().eq('id', updateRow.id)
    return { status: 'error', message: 'Aucune photo n’a pu être enregistrée.' }
  }

  // Notificatiemail naar klant
  try {
    const isFR = req.locale === 'fr'
    const portalUrl = `${PUBLIC_BASE_URL.replace(/\/$/, '')}/portail/devis/${req.id}`
    const subject = isFR
      ? 'De nouvelles photos de votre œuvre — Atelier Montreuil'
      : 'Nieuwe foto’s van uw werk — Atelier Montreuil'

    const html = await render(
      ProgressUpdate({
        recipientName: req.name,
        locale: req.locale,
        caption,
        photoCount: uploadedCount,
        previewDataUrl,
        portalUrl,
      })
    )

    const fallbackText = isFR
      ? `Bonjour ${req.name},\n\nJean-Pierre vient d’ajouter ${uploadedCount} nouvelle${uploadedCount > 1 ? 's' : ''} photo${uploadedCount > 1 ? 's' : ''} de votre œuvre. Connectez-vous pour les découvrir :\n${portalUrl}\n\n${caption ? `Mot de Jean-Pierre : ${caption}\n\n` : ''}Vous pouvez répondre directement à cet e-mail.\n\nBien à vous,\nJean-Pierre Montreuil`
      : `Beste ${req.name},\n\nJean-Pierre heeft ${uploadedCount} nieuwe foto${uploadedCount > 1 ? '’s' : ''} toegevoegd van uw werk. Log in om ze te bekijken:\n${portalUrl}\n\n${caption ? `Woordje van Jean-Pierre: ${caption}\n\n` : ''}U kunt rechtstreeks op deze mail antwoorden.\n\nMet vriendelijke groet,\nJean-Pierre Montreuil`

    const result = await sendEmail({
      to: req.email,
      subject,
      html,
      text: fallbackText,
      replyTo: ATELIER.email,
    })

    if (result.ok) {
      await admin
        .from('commission_progress_updates')
        .update({ notification_sent_at: new Date().toISOString() })
        .eq('id', updateRow.id)
    }
  } catch (err) {
    console.error('progress notification failed', err)
  }

  revalidatePath(`/admin/commissions/${id}`)
  revalidatePath(`/portail/devis/${id}`)
  return { status: 'success' }
}

/** Verwijder een progress-update (incl. foto's in storage). */
export async function deleteProgressUpdate(formData: FormData) {
  await requireAdmin()
  const updateId = String(formData.get('update_id') || '')
  const commissionId = String(formData.get('commission_id') || '')
  if (!updateId || !commissionId) return

  const admin = createAdminClient()
  const { data: photos } = await admin
    .from('commission_progress_photos')
    .select('storage_path')
    .eq('update_id', updateId)

  const paths = (photos ?? []).map((p) => p.storage_path).filter(Boolean)
  if (paths.length > 0) {
    await admin.storage.from(STORAGE_BUCKET).remove(paths)
  }
  await admin.from('commission_progress_updates').delete().eq('id', updateId)

  revalidatePath(`/admin/commissions/${commissionId}`)
  revalidatePath(`/portail/devis/${commissionId}`)
}
