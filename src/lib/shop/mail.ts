import { sendEmail, FROM_EMAIL, ADMIN_EMAIL } from '@/lib/email/client'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

/**
 * Order-specifieke mails. Hergebruikt de bestaande sendEmail() helper
 * van jp-montreuil zodat één Resend-config voldoende is.
 */

const fmt = new Intl.NumberFormat('fr-BE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
})
const formatPrice = (cents: number) => fmt.format(cents / 100)

type OrderItemLite = {
  title: string
  unit_price_cents: number
  quantity: number
  // Optioneel: render een mini-mockup van de configuratie naast elke
  // line via /api/og/preview. Wanneer photo_id ontbreekt valt de mail
  // gracefully terug op de tekst-only versie.
  photo_id?: string | null
  print_media_slug?: string | null
  print_size_slug?: string | null
}

function previewImgFor(it: OrderItemLite): string | null {
  if (!it.photo_id) return null
  const sp = new URLSearchParams({ photoId: it.photo_id })
  if (it.print_media_slug) sp.set('material', it.print_media_slug)
  if (it.print_size_slug) sp.set('size', it.print_size_slug)
  return `${PUBLIC_BASE_URL}/api/og/preview?${sp.toString()}`
}

export async function sendOrderConfirmationEmail({
  to,
  reference,
  fullName,
  items,
  amountCents,
  shippingCents,
  paymentUrl,
  orderUrl,
}: {
  to: string
  reference: string
  fullName: string
  items: OrderItemLite[]
  amountCents: number
  shippingCents: number
  paymentUrl: string | null
  orderUrl: string
}) {
  const itemsHtml = items.map((it) => {
    const img = previewImgFor(it)
    return `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e9e4dc;vertical-align:top;width:120px;">
        ${img ? `<img src="${img}" alt="" width="100" height="60" style="display:block;width:100px;height:auto;border-radius:4px;border:1px solid #e9e4dc;" />` : ''}
      </td>
      <td style="padding:12px;border-bottom:1px solid #e9e4dc;vertical-align:top;">
        ${escapeHtml(it.title)}
        <span style="color:#9d9588;font-size:12px;display:block;margin-top:4px;"> × ${it.quantity}</span>
      </td>
      <td style="padding:12px;text-align:right;border-bottom:1px solid #e9e4dc;font-family:monospace;vertical-align:top;">
        ${formatPrice(it.unit_price_cents * it.quantity)}
      </td>
    </tr>
  `
  }).join('')

  const ctaButton = paymentUrl
    ? `<a href="${paymentUrl}" style="display:inline-block;background:#1a1815;color:#ffffff;padding:14px 28px;text-decoration:none;font-size:14px;letter-spacing:0.04em;border-radius:4px;">
         Procéder au paiement
       </a>`
    : `<p style="color:#6b665e;font-size:13px;">
         Nous prendrons contact avec vous pour le règlement.
       </p>`

  const html = `
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><title>Commande ${reference}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1815;background:#f6f3ee;margin:0;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px;border-radius:6px;">
    <h1 style="font-size:22px;margin:0 0 4px 0;">Merci pour votre commande</h1>
    <p style="color:#6b665e;margin:0 0 24px 0;font-size:13px;">Référence : <strong>${reference}</strong></p>

    <p>Bonjour ${escapeHtml(fullName)},</p>
    <p>Nous avons bien reçu votre commande. Voici le récapitulatif :</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f6f3ee;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6b665e;" colspan="2">Article</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6b665e;">Sous-total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr>
          <td style="padding:8px 12px;color:#6b665e;" colspan="2">Frais de port</td>
          <td style="padding:8px 12px;text-align:right;font-family:monospace;color:#6b665e;">
            ${shippingCents > 0 ? formatPrice(shippingCents) : 'gratuit'}
          </td>
        </tr>
        <tr>
          <td style="padding:12px;border-top:2px solid #1a1815;font-weight:600;" colspan="2">Total</td>
          <td style="padding:12px;text-align:right;border-top:2px solid #1a1815;font-family:monospace;font-weight:600;font-size:18px;">
            ${formatPrice(amountCents)}
          </td>
        </tr>
      </tbody>
    </table>

    <div style="margin:28px 0;text-align:center;">
      ${ctaButton}
    </div>

    <p style="color:#6b665e;font-size:12px;margin-top:32px;border-top:1px solid #e9e4dc;padding-top:16px;">
      Vous pouvez suivre votre commande à tout moment via :<br>
      <a href="${orderUrl}" style="color:#1a1815;">${orderUrl}</a>
    </p>
  </div>
</body>
</html>`

  await sendEmail({
    to,
    subject: `Commande ${reference} — confirmée`,
    html,
  })

  // Notificeer admin
  if (ADMIN_EMAIL && ADMIN_EMAIL !== to) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[shop] Nieuwe bestelling ${reference} — ${formatPrice(amountCents)}`,
      html: `<p>Nieuwe bestelling van <strong>${escapeHtml(fullName)}</strong> (${escapeHtml(to)}).</p>
             <p>Totaal: <strong>${formatPrice(amountCents)}</strong></p>
             <p>Referentie: ${reference}</p>
             <p>Beheer: <a href="${orderUrl.replace('/portail/commande/', '/admin/orders/')}">admin link</a></p>`,
    })
  }
}

void FROM_EMAIL // re-export hint zonder unused-warning

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
