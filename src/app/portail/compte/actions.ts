'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, ADMIN_EMAIL } from '@/lib/email/client'
import { NewContactMessage } from '@/lib/email/templates/NewContactMessage'
import { upsertMyShopCustomer } from '@/lib/shop/customer-portal'
import { checkVies } from '@/lib/vies'

export type ChangePasswordResult =
  | { ok: true }
  | {
      ok: false
      error: 'too_short' | 'mismatch' | 'wrong_current' | 'not_authenticated' | 'server'
    }

export async function changePassword(input: {
  current: string
  next: string
  confirm: string
}): Promise<ChangePasswordResult> {
  if (input.next.length < 8) return { ok: false, error: 'too_short' }
  if (input.next !== input.confirm) return { ok: false, error: 'mismatch' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return { ok: false, error: 'not_authenticated' }

  // Re-auth with current password to verify
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.current,
  })
  if (signInErr) {
    return { ok: false, error: 'wrong_current' }
  }

  const { error } = await supabase.auth.updateUser({ password: input.next })
  if (error) {
    console.error('[compte/changePassword] error:', error.message)
    return { ok: false, error: 'server' }
  }

  revalidatePath('/portail/compte')
  return { ok: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/portail/login')
}

export type SaveShopProfileResult = { ok: true } | { ok: false; error: string }

/**
 * Save the customer's shipping/billing profile + B2B settings into
 * shop.customers. Triggered by the ShopProfileForm in /portail/compte.
 *
 * VIES re-validatie gebeurt server-side bij elke save: zelfs als de
 * client-side check ok zei, controleren we hier opnieuw — anders kan
 * een ingelogde klant een willekeurig BTW-nummer als "validated"
 * doordrukken.
 */
export async function saveShopProfile(input: {
  full_name: string
  phone: string
  street: string
  postal_code: string
  city: string
  country: string
  is_b2b: boolean
  company: string
  vat_number: string
  vies_validated: { name: string | null; address: string | null } | null
}): Promise<SaveShopProfileResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { ok: false, error: 'Niet ingelogd' }

  const isB2B = !!input.is_b2b
  let vatNumber: string | null = null
  let vatValidatedAt: string | null = null
  let vatCompanyName: string | null = null

  if (isB2B && input.vat_number.trim()) {
    const raw = input.vat_number.trim().toUpperCase().replace(/[\s.\-_]/g, '')
    vatNumber = raw
    // Server-side re-check (8s timeout). Bij unavailable bewaren we het
    // nummer wel, maar markeren we het als niet-gevalideerd.
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8_000)
    try {
      const result = await checkVies(raw, ctrl.signal)
      if (result.status === 'ok') {
        vatValidatedAt = new Date().toISOString()
        vatCompanyName = result.name
      }
    } finally {
      clearTimeout(timer)
    }
  }

  const address = {
    street: input.street.trim(),
    postal_code: input.postal_code.trim(),
    city: input.city.trim(),
    country: (input.country || 'BE').toUpperCase(),
  }

  try {
    await upsertMyShopCustomer({
      email: user.email,
      authUserId: user.id,
      full_name: input.full_name.trim() || null,
      phone: input.phone.trim() || null,
      address,
      billing_address: address,
      is_b2b: isB2B,
      company: isB2B ? (input.company.trim() || null) : null,
      vat_number: vatNumber,
      vat_validated_at: vatValidatedAt,
      vat_company_name: vatCompanyName,
      source: 'portail_compte',
    })
  } catch (e) {
    console.error('[compte/saveShopProfile] error:', e)
    return { ok: false, error: e instanceof Error ? e.message : 'Server error' }
  }

  revalidatePath('/portail/compte')
  return { ok: true }
}

export type SendMessageState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

export async function sendMessageToJP(
  _prev: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return { status: 'error', message: 'Niet ingelogd.' }
  }

  const message = String(formData.get('message') ?? '').trim()
  const localeRaw = String(formData.get('locale') ?? 'fr')
  const locale: 'fr' | 'nl' = localeRaw === 'nl' ? 'nl' : 'fr'
  const isFR = locale === 'fr'
  // Optionele commission-id (wanneer vraag gesteld vanuit dossier-pagina)
  const commissionId = String(formData.get('commission_id') ?? '').trim() || null

  if (message.length < 5) {
    return {
      status: 'error',
      message: isFR ? 'Message trop court.' : 'Bericht te kort.',
    }
  }
  if (message.length > 5000) {
    return {
      status: 'error',
      message: isFR ? 'Message trop long.' : 'Bericht te lang.',
    }
  }

  const admin = createAdminClient()

  // Naam + telefoon ophalen uit meest recente commission van deze klant
  const { data: lastReq } = await admin
    .from('commission_requests')
    .select('name, phone')
    .ilike('email', user.email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ name: string; phone: string | null }>()

  const name = lastReq?.name || user.email
  const phone = lastReq?.phone || ''

  // Optioneel: dossier-context ophalen voor in subject/body
  let commissionContext = ''
  if (commissionId) {
    const { data: comm } = await admin
      .from('commission_requests')
      .select('id, devis_subject, email')
      .eq('id', commissionId)
      .maybeSingle<{ id: string; devis_subject: string | null; email: string }>()
    if (comm && comm.email.toLowerCase() === user.email.toLowerCase()) {
      const subjectStr = comm.devis_subject || `${comm.id.slice(0, 8)}`
      commissionContext = isFR
        ? `Concerne le dossier : ${subjectStr}\n`
        : `Betreft dossier: ${subjectStr}\n`
    }
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  const userAgent = h.get('user-agent') ?? null

  // Tag de boodschap zodat JP weet dat ze uit het portaal komt
  const taggedMessage =
    `[${isFR ? 'Message via espace client' : 'Bericht via klantenportaal'}]\n` +
    (commissionContext ? `${commissionContext}\n` : '\n') +
    message

  const { error: insErr } = await admin.from('contact_messages').insert({
    name,
    email: user.email,
    phone: phone || null,
    message: taggedMessage,
    locale,
    ip,
    user_agent: userAgent,
  })

  if (insErr) {
    console.error('Portail message insert failed', insErr)
    return {
      status: 'error',
      message: isFR ? 'Erreur serveur.' : 'Serverfout.',
    }
  }

  // Notificatie naar JP — replyTo = klant zodat JP gewoon kan antwoorden
  try {
    const subject = isFR
      ? `Nouveau message via l'espace client — ${name}`
      : `Nieuw bericht via het klantenportaal — ${name}`

    const html = await render(
      NewContactMessage({
        name,
        email: user.email,
        phone,
        message: taggedMessage,
        locale,
        attachments: [],
        ip,
        submittedAt: new Date(),
      })
    )

    const fallbackText = [
      isFR ? `Nom: ${name}` : `Naam: ${name}`,
      `Email: ${user.email}`,
      phone ? (isFR ? `Téléphone: ${phone}` : `Telefoon: ${phone}`) : '',
      '',
      taggedMessage,
    ]
      .filter(Boolean)
      .join('\n')

    await sendEmail({
      to: ADMIN_EMAIL,
      subject,
      html,
      text: fallbackText,
      replyTo: user.email,
    })
  } catch (err) {
    console.error('Portail message notification failed', err)
  }

  revalidatePath('/portail/compte')
  return { status: 'success' }
}
