/**
 * Abandoned-carts: snapshot bewaren bij checkout zodra een klant zijn
 * email getypt heeft + items in cart. Admin kan later een herinnering
 * sturen of (optioneel) een cron.
 *
 * Geport van allardphilippe — vereenvoudigd: geen email-queue, gewoon
 * directe `sendEmail()` via Resend client.
 */

import { createShopAdminClient } from './supabase'
import { sendEmail, REPLY_TO } from '@/lib/email/client'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

export type AbandonedCartItemSnap = {
  title: string
  unit_price_cents: number
  quantity: number
}

export type AbandonedCart = {
  id: string
  email: string
  full_name: string | null
  locale: string
  items: AbandonedCartItemSnap[]
  subtotal_cents: number
  cart_signature: string | null
  recovered_order_id: string | null
  reminder_sent_at: string | null
  created_at: string
  updated_at: string
}

export async function trackAbandonedCart(input: {
  email: string
  fullName?: string | null
  locale: string
  items: AbandonedCartItemSnap[]
  subtotalCents: number
}): Promise<void> {
  const sb = createShopAdminClient()
  const email = input.email.toLowerCase().trim()
  if (!email || input.items.length === 0) return

  const signature = input.items
    .map((i) => `${i.title}×${i.quantity}@${i.unit_price_cents}`)
    .join('|')

  // Recente entry met dezelfde signature → niet dubbelen
  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString()
  const { data: recent } = await sb
    .from('abandoned_carts')
    .select('id')
    .eq('email', email)
    .eq('cart_signature', signature)
    .gte('created_at', oneHourAgo)
    .maybeSingle()
  if (recent) return

  try {
    await sb.from('abandoned_carts').insert({
      email,
      full_name: input.fullName ?? null,
      locale: input.locale,
      items: input.items,
      subtotal_cents: input.subtotalCents,
      cart_signature: signature,
    })
  } catch {
    // niet kritisch
  }
}

export async function listAbandonedCarts(opts?: {
  pendingOnly?: boolean
}): Promise<AbandonedCart[]> {
  const sb = createShopAdminClient()
  let q = sb.from('abandoned_carts').select('*').order('created_at', { ascending: false })
  if (opts?.pendingOnly) {
    q = q.is('reminder_sent_at', null).is('recovered_order_id', null)
  }
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as AbandonedCart[]
}

/**
 * Admin-trigger: stuur reminder-mail naar 1 abandoned cart. Markeert
 * `reminder_sent_at` + checkt of klant ondertussen een order plaatste
 * (in dat geval `recovered_order_id` zetten en NIET versturen).
 */
export async function sendAbandonedCartReminder(id: string): Promise<{
  ok: true
  sent: boolean
  reason?: 'recovered'
} | { ok: false; error: string }> {
  const sb = createShopAdminClient()
  const { data: cart } = await sb
    .from('abandoned_carts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!cart) return { ok: false, error: 'Cart introuvable' }
  const c = cart as AbandonedCart

  // Recovered? — order van zelfde email die nadien is aangemaakt en betaald
  const { data: recovered } = await sb
    .from('orders')
    .select('id')
    .ilike('email', c.email)
    .gte('created_at', c.created_at)
    .in('status', ['paid', 'shipped', 'fulfilled'])
    .limit(1)
  if (recovered && recovered.length > 0) {
    await sb.from('abandoned_carts').update({
      recovered_order_id: recovered[0].id,
    }).eq('id', id)
    return { ok: true, sent: false, reason: 'recovered' }
  }

  const isFr = c.locale !== 'nl'
  const origin = PUBLIC_BASE_URL.replace(/\/$/, '')
  const boutiqueUrl = `${origin}/shop/boutique`
  const cartUrl = `${origin}/shop/panier`

  const subject = isFr
    ? 'Vous avez oublié votre panier — Atelier Montreuil'
    : 'U bent uw winkelmandje vergeten — Atelier Montreuil'

  const itemsHtml = c.items.map((i) => `
    <tr>
      <td style="padding:8px 0;">${escapeHtml(i.title)}</td>
      <td style="padding:8px 0;text-align:right;color:#8a8478;">× ${i.quantity}</td>
      <td style="padding:8px 0;text-align:right;font-family:monospace;">€ ${(i.unit_price_cents * i.quantity / 100).toFixed(2)}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="${isFr ? 'fr' : 'nl'}">
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f3ee;font-family:Georgia,serif;color:#2a2520;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #d8d2c5;max-width:600px;width:100%;">
        <tr><td style="padding:32px;">
          <p style="font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#8a8478;margin:0 0 8px;">
            Atelier Jean-Pierre Montreuil
          </p>
          <h1 style="font-size:24px;line-height:1.25;color:#2a2520;margin:0 0 16px;font-weight:normal;">
            ${isFr ? 'Votre panier vous attend' : 'Uw mandje wacht op u'}
          </h1>
          <p style="font-size:14px;line-height:1.6;color:#3d3a35;margin:0 0 20px;">
            ${isFr
              ? 'Bonjour' + (c.full_name ? ` ${escapeHtml(c.full_name)}` : '') + ', vous avez ajouté ces œuvres à votre panier sans finaliser la commande. Elles vous attendent toujours :'
              : 'Hallo' + (c.full_name ? ` ${escapeHtml(c.full_name)}` : '') + ', u heeft deze werken in uw mandje geplaatst zonder af te ronden. Ze wachten nog steeds op u:'}
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #d8d2c5;border-bottom:1px solid #d8d2c5;font-size:13px;margin:0 0 20px;">
            ${itemsHtml}
            <tr>
              <td colspan="2" style="padding:10px 0;font-weight:bold;">${isFr ? 'Sous-total' : 'Subtotaal'}</td>
              <td style="padding:10px 0;text-align:right;font-weight:bold;font-family:monospace;">€ ${(c.subtotal_cents / 100).toFixed(2)}</td>
            </tr>
          </table>
          <a href="${cartUrl}" style="display:inline-block;background:#b89668;color:#fff;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:.15em;text-transform:uppercase;font-family:Georgia,serif;">
            ${isFr ? 'Reprendre ma commande' : 'Mijn bestelling hervatten'}
          </a>
          <p style="font-size:12px;color:#8a8478;margin:20px 0 0;">
            ${isFr
              ? 'Ou continuez à parcourir la <a href="' + boutiqueUrl + '" style="color:#b89668;">boutique</a>.'
              : 'Of bekijk verder de <a href="' + boutiqueUrl + '" style="color:#b89668;">boutique</a>.'}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const result = await sendEmail({
    to: c.email,
    subject,
    html,
    text: stripHtml(html),
    replyTo: REPLY_TO,
  })
  if (!result.ok) return { ok: false, error: result.error ?? 'send failed' }

  await sb.from('abandoned_carts').update({
    reminder_sent_at: new Date().toISOString(),
  }).eq('id', id)

  return { ok: true, sent: true }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
