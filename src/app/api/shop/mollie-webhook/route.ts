import { NextRequest, NextResponse } from 'next/server'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { getMolliePaymentStatus } from '@/lib/shop/mollie'

/**
 * POST /api/shop/mollie-webhook
 * Mollie stuurt naar deze URL bij elke status-change van een payment.
 * Body is form-encoded: `id=tr_xxx`. We halen de status op via de
 * Mollie API (vertrouw nooit de body — Mollie kan gespoofd worden).
 *
 * Bij status='paid': zet shop.orders.status='paid' + paid_at = now().
 */
export async function POST(req: NextRequest) {
  let id: string | null = null
  try {
    const formData = await req.formData()
    id = String(formData.get('id') ?? '').trim() || null
  } catch {
    // Vercel kan ook x-www-form-urlencoded ontvangen
    const text = await req.text().catch(() => '')
    const params = new URLSearchParams(text)
    id = params.get('id')
  }
  if (!id) {
    return NextResponse.json({ ok: false, reason: 'no payment id' }, { status: 400 })
  }

  const status = await getMolliePaymentStatus(id)
  if (!status) {
    // Mollie key niet gezet of API down — antwoord 200 zodat Mollie
    // niet retried (we kunnen de status niet bevestigen)
    return NextResponse.json({ ok: false, reason: 'mollie unavailable' })
  }

  const sb = createShopAdminClient()
  const { data: order } = await sb
    .from('orders')
    .select('id, status')
    .eq('mollie_payment_id', id)
    .maybeSingle()
  if (!order) {
    return NextResponse.json({ ok: false, reason: 'order not found' }, { status: 404 })
  }

  // Map Mollie statuses -> onze status enum
  const next =
    status === 'paid' ? 'paid' :
    status === 'authorized' ? 'paid' :
    status === 'canceled' ? 'canceled' :
    status === 'expired' ? 'canceled' :
    status === 'failed' ? 'canceled' :
    null

  if (next && next !== order.status) {
    const update: Record<string, unknown> = { status: next }
    if (next === 'paid' && order.status !== 'paid') {
      update.paid_at = new Date().toISOString()
    }
    await sb.from('orders').update(update).eq('id', order.id)

    // Auto-trigger bons de production zodra de order officieel betaald is.
    // Idempotent — UNIQUE op order_item_id voorkomt dubbele bons als de
    // webhook 2x triggert.
    if (next === 'paid') {
      try {
        const { createSupplierOrdersForOrder } = await import('@/lib/shop/supplier-orders')
        await createSupplierOrdersForOrder(order.id)
      } catch (e) {
        console.error('[mollie-webhook] supplier_orders auto-create failed:', e)
      }
    }
  }

  return NextResponse.json({ ok: true, status: next ?? status })
}
