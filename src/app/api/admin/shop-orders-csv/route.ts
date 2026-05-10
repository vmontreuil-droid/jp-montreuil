import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listShopOrders, listShopOrderItems } from '@/lib/shop/orders'

/**
 * GET /api/admin/shop-orders-csv
 * Streamt een CSV-export van alle shop-orders + hun line-items.
 * Auth: enkel admins (zelfde profiles.role check als de admin-layout).
 *
 * Kolommen: reference, status, created_at, paid_at, email, full_name,
 * company_name, vat_number, country, postal_code, city, street,
 * subtotal_cents, shipping_cents, discount_code, discount_cents,
 * amount_cents, items_summary, mollie_payment_id, tracking_carrier,
 * tracking_number.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

  const orders = await listShopOrders()

  // Items per order (1 query per order — voor lage volumes ok)
  const itemsByOrder = new Map<string, Awaited<ReturnType<typeof listShopOrderItems>>>()
  for (const o of orders) {
    itemsByOrder.set(o.id, await listShopOrderItems(o.id))
  }

  const headers = [
    'reference', 'status', 'created_at', 'paid_at', 'email', 'full_name',
    'company_name', 'vat_number', 'country', 'postal_code', 'city', 'street',
    'subtotal_cents', 'shipping_cents', 'discount_code', 'discount_cents',
    'amount_cents', 'items_summary', 'mollie_payment_id',
    'tracking_carrier', 'tracking_number',
  ]
  const rows: string[][] = [headers]

  for (const o of orders) {
    const items = itemsByOrder.get(o.id) ?? []
    const subtotalCents = items.reduce((acc, i) => acc + i.unit_price_cents * i.quantity, 0)
    const summary = items
      .map((i) => `${i.quantity}× ${i.title}`)
      .join(' | ')
    const addr = (o.shipping_address ?? {}) as Record<string, string>
    rows.push([
      o.reference,
      o.status,
      o.created_at,
      o.paid_at ?? '',
      o.email,
      o.full_name,
      o.company_name ?? '',
      o.vat_number ?? '',
      o.shipping_country ?? '',
      addr.postal_code ?? '',
      addr.city ?? '',
      addr.street ?? '',
      String(subtotalCents),
      String(o.shipping_cents),
      o.discount_code ?? '',
      String(o.discount_cents),
      String(o.amount_cents),
      summary,
      o.mollie_payment_id ?? '',
      o.tracking_carrier ?? '',
      o.tracking_number ?? '',
    ])
  }

  // CSV-escape (RFC 4180): wrap velden met , " \n in dubbele quotes,
  // verdubbel interne quotes.
  const csv = rows
    .map((r) => r.map(csvEscape).join(','))
    .join('\r\n')

  // BOM zodat Excel UTF-8 herkent
  const body = '﻿' + csv
  const filename = `shop-orders-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

function csvEscape(v: string): string {
  if (v == null) return ''
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}
