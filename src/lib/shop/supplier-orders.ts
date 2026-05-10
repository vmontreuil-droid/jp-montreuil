/**
 * Bons de production — koppelt klant-order_items aan een drukkerij,
 * stuurt mail met hi-res signed URL, tracking-status door de hele flow.
 *
 * Geport van allardphilippe + aangepast aan jp-montreuil's shop schema
 * en branding.
 */

import { createShopAdminClient } from './supabase'
import { sendEmail, REPLY_TO } from '@/lib/email/client'
import { SHOP_PHOTOS_BUCKET } from './photo-url'
import { getSupplierById, getDefaultSupplierFor, type Supplier } from './suppliers'
import type { ShopOrder, ShopOrderItem } from './orders'
import type { Photo } from './photo-url'

export type SupplierOrderStatus =
  | 'pending'
  | 'sent'
  | 'acked'
  | 'in_production'
  | 'received_by_studio'
  | 'cancelled'

export type SupplierOrder = {
  id: string
  order_id: string
  order_item_id: string
  supplier_id: string | null
  status: SupplierOrderStatus
  sent_at: string | null
  acked_at: string | null
  received_at: string | null
  cancelled_at: string | null
  external_ref: string | null
  signed_url_expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const SUPPLIER_ORDER_STATUS_LABELS: Record<SupplierOrderStatus, string> = {
  pending: 'À envoyer',
  sent: 'Envoyée à l’imprimeur',
  acked: 'Confirmée',
  in_production: 'En production',
  received_by_studio: 'Reçue à l’atelier',
  cancelled: 'Annulée',
}

export const SUPPLIER_ORDER_STATUS_COLORS: Record<SupplierOrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  sent: 'bg-sky-100 text-sky-900',
  acked: 'bg-indigo-100 text-indigo-900',
  in_production: 'bg-violet-100 text-violet-900',
  received_by_studio: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-(--color-frame)/40 text-(--color-stone)',
}

export async function listSupplierOrders(opts?: {
  status?: SupplierOrderStatus | 'open'
}): Promise<SupplierOrder[]> {
  const sb = createShopAdminClient()
  let q = sb.from('supplier_orders').select('*').order('created_at', { ascending: false })
  if (opts?.status === 'open') {
    q = q.in('status', ['pending', 'sent', 'acked', 'in_production'])
  } else if (opts?.status) {
    q = q.eq('status', opts.status)
  }
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as SupplierOrder[]
}

export async function getSupplierOrderById(id: string): Promise<SupplierOrder | null> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('supplier_orders').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as SupplierOrder | null) ?? null
}

export type SupplierOrderDetail = {
  bon: SupplierOrder
  supplier: Supplier | null
  order: ShopOrder
  item: ShopOrderItem
  photo: Photo | null
}

export async function getSupplierOrderDetail(id: string): Promise<SupplierOrderDetail | null> {
  const sb = createShopAdminClient()
  const bon = await getSupplierOrderById(id)
  if (!bon) return null
  const [{ data: order }, { data: item }, supplier] = await Promise.all([
    sb.from('orders').select('*').eq('id', bon.order_id).maybeSingle(),
    sb.from('order_items').select('*').eq('id', bon.order_item_id).maybeSingle(),
    bon.supplier_id ? getSupplierById(bon.supplier_id) : Promise.resolve(null),
  ])
  if (!order || !item) return null
  let photo: Photo | null = null
  if ((item as ShopOrderItem).photo_id) {
    const { data: p } = await sb
      .from('photos').select('*').eq('id', (item as ShopOrderItem).photo_id).maybeSingle()
    photo = (p as Photo | null) ?? null
  }
  return {
    bon,
    supplier,
    order: order as ShopOrder,
    item: item as ShopOrderItem,
    photo,
  }
}

/**
 * Wordt aangeroepen zodra een order op 'paid' gaat (admin handmatig
 * óf Mollie webhook). Per print-line-item maakt deze een
 * supplier_orders rij in status 'pending'. UNIQUE op order_item_id
 * zorgt dat herhalingen geen errors gooien — gewoon return wat al was.
 */
export async function createSupplierOrdersForOrder(orderId: string): Promise<{
  created: number
  skipped: number
}> {
  const sb = createShopAdminClient()
  const { data: items } = await sb
    .from('order_items')
    .select('id, photo_id, print_media_slug')
    .eq('order_id', orderId)
  const printItems = (items ?? []).filter(
    (i: { photo_id: string | null; print_media_slug: string | null }) =>
      i.photo_id && i.print_media_slug,
  ) as { id: string; photo_id: string; print_media_slug: string }[]

  if (printItems.length === 0) return { created: 0, skipped: 0 }

  // Welke order_items hebben al een bon?
  const { data: existing } = await sb
    .from('supplier_orders')
    .select('order_item_id')
    .in('order_item_id', printItems.map((i) => i.id))
  const existingSet = new Set(
    ((existing ?? []) as { order_item_id: string }[]).map((e) => e.order_item_id),
  )

  let created = 0
  let skipped = 0
  for (const it of printItems) {
    if (existingSet.has(it.id)) {
      skipped++
      continue
    }
    const supplier = await getDefaultSupplierFor(it.print_media_slug)
    const { error } = await sb.from('supplier_orders').insert({
      order_id: orderId,
      order_item_id: it.id,
      supplier_id: supplier?.id ?? null,
      status: 'pending',
    })
    if (error) {
      // Race-condition (UNIQUE constraint): andere call heeft 'm net gemaakt
      if (error.code === '23505') skipped++
      else throw error
    } else {
      created++
    }
  }
  return { created, skipped }
}

export async function setSupplierOrderStatus(
  id: string,
  status: SupplierOrderStatus,
  externalRef?: string | null,
): Promise<void> {
  const sb = createShopAdminClient()
  const patch: Record<string, unknown> = { status }
  if (externalRef !== undefined) patch.external_ref = externalRef
  const now = new Date().toISOString()
  if (status === 'sent') patch.sent_at = now
  if (status === 'acked') patch.acked_at = now
  if (status === 'received_by_studio') patch.received_at = now
  if (status === 'cancelled') patch.cancelled_at = now
  const { error } = await sb.from('supplier_orders').update(patch).eq('id', id)
  if (error) throw error
}

export async function reassignSupplier(id: string, supplierId: string | null): Promise<void> {
  const sb = createShopAdminClient()
  const { error } = await sb
    .from('supplier_orders')
    .update({ supplier_id: supplierId })
    .eq('id', id)
  if (error) throw error
}

export async function updateSupplierOrderNotes(id: string, notes: string | null): Promise<void> {
  const sb = createShopAdminClient()
  const { error } = await sb
    .from('supplier_orders')
    .update({ notes })
    .eq('id', id)
  if (error) throw error
}

/**
 * Stuur de bon naar de drukkerij. Genereert een 30-dagen signed URL
 * voor de hi-res foto + render een bon-de-commande HTML mail.
 * Idempotent: als status al 'sent' of verder, returnt zonder mail.
 */
export async function sendSupplierOrderEmail(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const detail = await getSupplierOrderDetail(id)
  if (!detail) return { ok: false, error: 'Bon introuvable' }
  const { bon, supplier, order, item, photo } = detail

  if (!supplier) return { ok: false, error: 'Aucun imprimeur assigné' }
  if (!photo) return { ok: false, error: 'Photo source introuvable' }

  if (bon.status !== 'pending') {
    return { ok: false, error: `Déjà envoyée (status : ${bon.status})` }
  }

  // Signed URL — 30 dagen geldig
  const sb = createShopAdminClient()
  const ttlSeconds = 30 * 24 * 3600
  const { data: signed, error: signErr } = await sb.storage
    .from(SHOP_PHOTOS_BUCKET)
    .createSignedUrl(photo.storage_path, ttlSeconds)
  if (signErr || !signed?.signedUrl) {
    return { ok: false, error: signErr?.message ?? 'Echec signed-URL' }
  }
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()

  // Render + send
  const html = renderSupplierOrderHtml({
    orderRef: order.reference,
    photoSlug: photo.slug,
    photoTitle: photo.title ?? photo.slug,
    media: item.print_media_slug ?? '—',
    sizeLabel: item.print_size_label ?? item.print_size_slug ?? '—',
    quantity: item.quantity,
    customer: order.full_name,
    customerEmail: order.email,
    downloadUrl: signed.signedUrl,
    expiresAt,
  })

  const subject = `Bon de commande ${order.reference} — ${item.print_size_label ?? item.print_size_slug ?? ''} ${item.print_media_slug ?? ''}`.trim()

  const result = await sendEmail({
    to: supplier.email,
    subject,
    html,
    text: stripHtml(html),
    replyTo: REPLY_TO,
  })

  if (!result.ok) return { ok: false, error: result.error ?? 'Echec envoi mail' }

  // Status bijwerken
  await sb.from('supplier_orders').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    signed_url_expires_at: expiresAt,
  }).eq('id', id)

  return { ok: true }
}

function renderSupplierOrderHtml(input: {
  orderRef: string
  photoSlug: string
  photoTitle: string
  media: string
  sizeLabel: string
  quantity: number
  customer: string
  customerEmail: string
  downloadUrl: string
  expiresAt: string
}): string {
  const expiresFmt = new Date(input.expiresAt).toLocaleDateString('fr-BE', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Bon de commande ${escapeHtml(input.orderRef)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f3ee;font-family:Georgia,serif;color:#2a2520;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #d8d2c5;max-width:640px;width:100%;">
        <tr><td style="padding:32px 32px 16px;">
          <p style="font-family:Georgia,serif;font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#8a8478;margin:0 0 8px;">
            Atelier Jean-Pierre Montreuil
          </p>
          <h1 style="font-family:Georgia,serif;font-size:24px;line-height:1.25;color:#2a2520;margin:0 0 4px;font-weight:normal;">
            Bon de commande
          </h1>
          <p style="margin:0;font-size:13px;color:#6b6760;">
            Référence : <strong style="color:#2a2520;font-family:monospace;">${escapeHtml(input.orderRef)}</strong>
          </p>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #d8d2c5;border-bottom:1px solid #d8d2c5;margin:8px 0 0;">
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid #ece8de;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#8a8478;">Œuvre</p>
                <p style="margin:0;font-size:15px;color:#2a2520;font-family:Georgia,serif;">${escapeHtml(input.photoTitle)}</p>
                <p style="margin:2px 0 0;font-size:11px;color:#8a8478;font-family:monospace;">${escapeHtml(input.photoSlug)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid #ece8de;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#8a8478;">Support</p>
                <p style="margin:0;font-size:15px;color:#2a2520;">${escapeHtml(input.media)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid #ece8de;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#8a8478;">Format</p>
                <p style="margin:0;font-size:15px;color:#2a2520;">${escapeHtml(input.sizeLabel)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 0;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#8a8478;">Quantité</p>
                <p style="margin:0;font-size:15px;color:#2a2520;font-weight:bold;">${input.quantity}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 32px;">
          <p style="font-size:12px;color:#6b6760;margin:0 0 12px;">
            Téléchargez le fichier hi-res :
          </p>
          <a href="${escapeHtml(input.downloadUrl)}"
             style="display:inline-block;background:#b89668;color:#fff;text-decoration:none;padding:14px 24px;font-size:13px;letter-spacing:.15em;text-transform:uppercase;font-family:Georgia,serif;">
            Télécharger le fichier
          </a>
          <p style="font-size:11px;color:#8a8478;margin:12px 0 0;">
            Lien valide jusqu’au <strong>${expiresFmt}</strong>.
          </p>
        </td></tr>

        <tr><td style="border-top:1px solid #d8d2c5;padding:20px 32px;background:#f6f3ee;font-size:11px;color:#8a8478;">
          <p style="margin:0 0 8px;">
            <strong style="color:#2a2520;">Livraison à :</strong>
            Atelier Jean-Pierre Montreuil
          </p>
          <p style="margin:0 0 8px;">
            <strong style="color:#2a2520;">Client :</strong> ${escapeHtml(input.customer)} (${escapeHtml(input.customerEmail)})
          </p>
          <p style="margin:0;color:#6b6760;font-style:italic;">
            Merci de répondre avec accusé de réception et délai prévu.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
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
