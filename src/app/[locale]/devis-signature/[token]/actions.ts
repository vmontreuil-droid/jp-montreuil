'use server'

import { revalidatePath } from 'next/cache'
import { render } from '@react-email/render'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, ADMIN_EMAIL } from '@/lib/email/client'
import { DevisSignedNotification } from '@/lib/email/templates/DevisSignedNotification'
import { buildPaymentReference } from '@/lib/atelier-config'

export type SignState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

const MAX_SIGNATURE_BYTES = 256 * 1024 // 256 KB — een PNG van een handtekening blijft makkelijk onder

export async function signDevis(
  _prev: SignState,
  formData: FormData
): Promise<SignState> {
  const token = String(formData.get('token') ?? '').trim()
  const signerName = String(formData.get('signer_name') ?? '').trim()
  const signatureData = String(formData.get('signature_data') ?? '').trim()
  const localeRaw = String(formData.get('locale') ?? 'fr')
  const locale = localeRaw === 'nl' ? 'nl' : 'fr'

  if (!token) return { status: 'error', message: locale === 'fr' ? 'Lien invalide.' : 'Ongeldige link.' }
  if (!signerName) {
    return {
      status: 'error',
      message: locale === 'fr' ? 'Indiquez votre nom complet.' : 'Geef uw volledige naam op.',
    }
  }
  if (!signatureData || !signatureData.startsWith('data:image/')) {
    return {
      status: 'error',
      message: locale === 'fr' ? 'Veuillez tracer votre signature.' : 'Plaats uw handtekening.',
    }
  }
  if (signatureData.length > MAX_SIGNATURE_BYTES) {
    return {
      status: 'error',
      message: locale === 'fr' ? 'Signature trop volumineuse.' : 'Handtekening te groot.',
    }
  }

  const admin = createAdminClient()

  const { data: req, error: fetchErr } = await admin
    .from('commission_requests')
    .select('id, name, email, signed_at, status, devis_total_eur, devis_acompte_eur, devis_payment_reference, devis_subject')
    .eq('signature_token', token)
    .single()

  if (fetchErr || !req) {
    return {
      status: 'error',
      message: locale === 'fr' ? 'Devis introuvable.' : 'Offerte niet gevonden.',
    }
  }

  // Idempotent — al ondertekend? Geef gewoon success terug.
  if (req.signed_at) {
    return { status: 'success' }
  }

  const signedAt = new Date()
  const reference =
    req.devis_payment_reference ||
    buildPaymentReference(`#${String(req.id).slice(0, 8)}`)

  const { error: updErr } = await admin
    .from('commission_requests')
    .update({
      signature_data: signatureData,
      signer_name: signerName,
      signed_at: signedAt.toISOString(),
      status: 'signe',
      devis_payment_reference: req.devis_payment_reference || reference,
    })
    .eq('id', req.id)

  if (updErr) {
    console.error('signDevis update failed', updErr)
    return {
      status: 'error',
      message: locale === 'fr' ? 'Une erreur est survenue.' : 'Er is een fout opgetreden.',
    }
  }

  // Notify JP
  try {
    const html = await render(
      DevisSignedNotification({
        id: req.id,
        clientName: req.name,
        clientEmail: req.email,
        signerName,
        signedAt,
        devisNumber: req.devis_subject || `#${String(req.id).slice(0, 8)}`,
        total: Number(req.devis_total_eur || 0),
        acompteEur: Number(req.devis_acompte_eur || 0),
        paymentReference: reference,
      })
    )
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Devis signé — ${signerName}`,
      html,
      text: `${signerName} vient de signer le devis. Acompte attendu avec la communication "${reference}".`,
      replyTo: req.email,
    })
  } catch (err) {
    console.error('signDevis notify failed', err)
  }

  revalidatePath(`/admin/commissions/${req.id}`)
  revalidatePath('/admin/commissions')

  return { status: 'success' }
}
