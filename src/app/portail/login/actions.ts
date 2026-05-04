'use server'

import { render } from '@react-email/render'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/client'
import { PortalMagicLink } from '@/lib/email/templates/PortalMagicLink'
import { PortalPasswordReset } from '@/lib/email/templates/PortalPasswordReset'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

export type RequestPortalLinkResult =
  | { ok: true }
  | { ok: false; error: 'invalid_email' | 'unknown_email' | 'send_failed' }

export type SignInResult =
  | { ok: true }
  | {
      ok: false
      error: 'invalid_credentials' | 'invalid_email' | 'rate_limited' | 'unknown'
    }

export type ResetRequestResult =
  | { ok: true }
  | { ok: false; error: 'invalid_email' | 'unknown_email' | 'send_failed' }

const EMAIL_RX = /^\S+@\S+\.\S+$/

/**
 * Login met email + password. Server-side flow zodat de cookies juist
 * worden geschreven door Supabase SSR client.
 */
export async function signInWithPassword(input: {
  email: string
  password: string
}): Promise<SignInResult> {
  const email = (input.email ?? '').trim().toLowerCase()
  const password = input.password ?? ''

  if (!email || !EMAIL_RX.test(email)) return { ok: false, error: 'invalid_email' }
  if (!password) return { ok: false, error: 'invalid_credentials' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.status === 429) return { ok: false, error: 'rate_limited' }
    if (
      error.message?.toLowerCase().includes('invalid login') ||
      error.message?.toLowerCase().includes('email not confirmed')
    ) {
      return { ok: false, error: 'invalid_credentials' }
    }
    console.error('[portail/signIn] error:', error.message)
    return { ok: false, error: 'unknown' }
  }

  return { ok: true }
}

/**
 * Stuur een wachtwoord-reset link. Werkt voor:
 *  - bestaande klanten met een album (event_albums match)
 *  - bestaande klanten met een devis (commission_requests match)
 *  - elke andere geauthenticeerde gebruiker
 *
 * Wanneer het mailadres niet gekend is, sturen we niets en geven we
 * `unknown_email` terug — UI toont een nette boodschap.
 */
export async function requestPasswordReset(input: {
  email: string
}): Promise<ResetRequestResult> {
  const email = (input.email ?? '').trim().toLowerCase()
  if (!email || !EMAIL_RX.test(email)) return { ok: false, error: 'invalid_email' }

  const admin = createAdminClient()

  // Kijk welke locale we moeten gebruiken voor de mail
  let locale: 'fr' | 'nl' = 'fr'
  const { data: album } = await admin
    .from('event_albums')
    .select('client_locale')
    .ilike('client_email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (album?.client_locale === 'nl') locale = 'nl'

  if (!album) {
    // Probeer commissions
    const { data: commission } = await admin
      .from('commission_requests')
      .select('locale')
      .ilike('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ locale: 'fr' | 'nl' }>()

    if (!commission) {
      return { ok: false, error: 'unknown_email' }
    }
    locale = commission.locale === 'nl' ? 'nl' : 'fr'
  }

  const origin = PUBLIC_BASE_URL.replace(/\/$/, '')
  const next = '/portail/reset-password'
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('[portail/reset] generateLink error', linkErr?.message)
    return { ok: false, error: 'send_failed' }
  }

  const actionUrl = `${origin}/auth/confirm?token_hash=${encodeURIComponent(
    linkData.properties.hashed_token
  )}&type=recovery&next=${encodeURIComponent(next)}`

  const html = await render(PortalPasswordReset({ actionUrl, locale }))

  const subject =
    locale === 'fr'
      ? 'Réinitialisation de votre mot de passe — Atelier Montreuil'
      : 'Wachtwoord opnieuw instellen — Atelier Montreuil'

  const result = await sendEmail({
    to: email,
    subject,
    html,
    text:
      locale === 'fr'
        ? `Cliquez sur ce lien pour définir un nouveau mot de passe : ${linkData.properties.action_link}\n\nLe lien expire dans 1 heure.`
        : `Klik op deze link om een nieuw wachtwoord in te stellen: ${linkData.properties.action_link}\n\nDe link vervalt na 1 uur.`,
    replyTo: process.env.RESEND_REPLY_TO || 'jp@montreuil.be',
  })

  if (!result.ok) return { ok: false, error: 'send_failed' }
  return { ok: true }
}

/**
 * Stuur een nieuwe magic-link via Resend. Behouden als fallback voor wie
 * het wachtwoord vergeten is en even snel via een mail wil inloggen
 * zonder de reset-flow te doorlopen.
 */
export async function requestPortalMagicLink(input: {
  email: string
}): Promise<RequestPortalLinkResult> {
  const email = (input.email ?? '').trim().toLowerCase()
  if (!email || !EMAIL_RX.test(email)) return { ok: false, error: 'invalid_email' }

  const admin = createAdminClient()

  // Vind locale via album of commission
  let locale: 'fr' | 'nl' = 'fr'
  const { data: album } = await admin
    .from('event_albums')
    .select('client_locale')
    .ilike('client_email', email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let known = !!album
  if (album?.client_locale === 'nl') locale = 'nl'

  if (!known) {
    const { data: commission } = await admin
      .from('commission_requests')
      .select('locale')
      .ilike('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ locale: 'fr' | 'nl' }>()
    if (commission) {
      known = true
      locale = commission.locale === 'nl' ? 'nl' : 'fr'
    }
  }

  if (!known) {
    return { ok: false, error: 'unknown_email' }
  }

  const origin = PUBLIC_BASE_URL.replace(/\/$/, '')
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/portail')}`

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    return { ok: false, error: 'send_failed' }
  }

  const actionUrl = `${origin}/auth/confirm?token_hash=${encodeURIComponent(
    linkData.properties.hashed_token
  )}&type=magiclink&next=${encodeURIComponent('/portail')}`

  const html = await render(PortalMagicLink({ actionUrl, locale }))

  const subject =
    locale === 'fr'
      ? 'Votre lien de connexion — Atelier Montreuil'
      : 'Uw login-link — Atelier Montreuil'

  const result = await sendEmail({
    to: email,
    subject,
    html,
    text:
      locale === 'fr'
        ? `Votre lien de connexion: ${linkData.properties.action_link}\n\nValide 1 heure.`
        : `Uw login-link: ${linkData.properties.action_link}\n\n1 uur geldig.`,
    replyTo: process.env.RESEND_REPLY_TO || 'jp@montreuil.be',
  })

  if (!result.ok) return { ok: false, error: 'send_failed' }
  return { ok: true }
}

/** Server-side login die de gebruiker meteen redirect na succes. */
export async function loginWithPasswordAndRedirect(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const result = await signInWithPassword({ email, password })
  if (!result.ok) {
    redirect(`/portail/login?err=${result.error}`)
  }
  redirect('/portail')
}
