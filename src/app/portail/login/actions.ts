'use server'

import { render } from '@react-email/render'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/client'
import { PortalMagicLink } from '@/lib/email/templates/PortalMagicLink'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

export type RequestPortalLinkResult =
  | { ok: true }
  | { ok: false; error: 'invalid_email' | 'unknown_email' | 'send_failed' }

/**
 * Stuur een nieuwe login-link via Resend (eigen branded mail) ipv via
 * Supabase's default email-provider. Gegarandeerd betere deliverability
 * en consistent met onze andere mails (PortalInvite, ShareAlbumLink).
 *
 * - Werkt enkel voor e-mails die gekoppeld zijn aan een actief album:
 *   onbekende e-mails → unknown_email (UI toont nette tekst).
 * - Magic-link wordt gegenereerd via auth.admin.generateLink, niet via
 *   signInWithOtp, zodat we volledige controle hebben over de mail.
 */
export async function requestPortalMagicLink(input: {
  email: string
}): Promise<RequestPortalLinkResult> {
  const email = (input.email ?? '').trim().toLowerCase()
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: 'invalid_email' }
  }

  const admin = createAdminClient()

  // Vind het meest recente actieve album van deze klant — bepaalt
  // tegelijk of het mailadres bekend is en in welke taal we moeten mailen.
  const { data: album } = await admin
    .from('event_albums')
    .select('client_locale')
    .ilike('client_email', email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!album) {
    return { ok: false, error: 'unknown_email' }
  }

  const locale: 'fr' | 'nl' = album.client_locale === 'nl' ? 'nl' : 'fr'

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

  // Bouw onze eigen action URL die rechtstreeks naar /auth/callback gaat met
  // token_hash. Zo wordt de sessie via verifyOtp() server-side aangemaakt
  // en zijn de cookies meteen gezet op montreuil.be (geen PKCE-pad nodig).
  const actionUrl = `${origin}/auth/callback?token_hash=${encodeURIComponent(
    linkData.properties.hashed_token
  )}&type=magiclink&next=${encodeURIComponent('/portail')}`

  const html = await render(
    PortalMagicLink({
      actionUrl,
      locale,
    })
  )

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
