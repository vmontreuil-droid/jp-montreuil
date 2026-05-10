'use server'

import { headers } from 'next/headers'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { generateShopReference } from '@/lib/shop/orders'
import { shopShippingForCountry } from '@/lib/shop/shipping'
import { createMolliePayment } from '@/lib/shop/mollie'
import { sendOrderConfirmationEmail } from '@/lib/shop/mail'

type CheckoutItem = {
  product_id: string | null
  variant_id: string | null
  title: string
  unit_price_cents: number
  quantity: number
  photo_id?: string | null
  print_media_slug?: string | null
  print_size_slug?: string | null
  print_size_label?: string | null
}

type CheckoutPayload = {
  email: string
  full_name: string
  shipping_address: {
    street: string
    postal_code: string
    city: string
    country: string
    notes: string
  }
  items: CheckoutItem[]
  locale?: string
}

/**
 * Server-side: bereken verzendkost voor een land + subtotaal. Wordt
 * door de checkout-form gebruikt zodra de country-selector wijzigt.
 */
export async function estimateShopShipping(input: {
  country: string
  subtotalCents: number
}): Promise<{ cents: number; zoneName: string | null; freeAbove: number | null }> {
  const r = await shopShippingForCountry(input.country, input.subtotalCents)
  return {
    cents: r.cents,
    zoneName: r.zone?.name ?? null,
    freeAbove: r.zone?.free_above_cents ?? null,
  }
}

/**
 * prepareOrder: maakt order + items + initieert Mollie betaling.
 * Retourneert reference + optionele checkout-URL (null als Mollie key
 * ontbreekt of payment-init faalde).
 */
export async function prepareShopOrder(payload: CheckoutPayload): Promise<{
  reference: string
  checkoutUrl: string | null
}> {
  if (!payload.email || !payload.full_name) {
    throw new Error('Naam en e-mail zijn verplicht')
  }
  if (payload.items.length === 0) {
    throw new Error('Le panier est vide')
  }

  const sb = createShopAdminClient()
  const reference = generateShopReference()
  const subtotalCents = payload.items.reduce(
    (acc, it) => acc + it.unit_price_cents * it.quantity, 0,
  )

  const country = (payload.shipping_address.country || 'BE').toUpperCase()
  const { cents: shippingCents } = await shopShippingForCountry(country, subtotalCents)
  const amountCents = subtotalCents + shippingCents

  // Insert order
  const { data: order, error: orderErr } = await sb
    .from('orders')
    .insert({
      reference,
      status: 'pending',
      email: payload.email.toLowerCase(),
      full_name: payload.full_name,
      shipping_address: payload.shipping_address,
      shipping_country: country,
      shipping_cents: shippingCents,
      amount_cents: amountCents,
      currency: 'EUR',
      locale: payload.locale ?? 'fr',
    })
    .select('id')
    .single()
  if (orderErr) throw new Error(orderErr.message)

  // Insert items
  const { error: itemsErr } = await sb
    .from('order_items')
    .insert(payload.items.map((it) => ({
      order_id: order.id,
      product_id: it.product_id,
      variant_id: it.variant_id,
      title: it.title,
      unit_price_cents: it.unit_price_cents,
      quantity: it.quantity,
      photo_id: it.photo_id ?? null,
      print_media_slug: it.print_media_slug ?? null,
      print_size_slug: it.print_size_slug ?? null,
      print_size_label: it.print_size_label ?? null,
    })))
  if (itemsErr) throw new Error(itemsErr.message)

  // Mollie payment
  const h = await headers()
  const host = h.get('host') ?? 'jp.montreuil.be'
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const baseUrl = `${proto}://${host}`
  const orderUrl = `${baseUrl}/shop/portail/commande/${reference}?email=${encodeURIComponent(payload.email)}`

  const mollie = await createMolliePayment({
    reference,
    amountCents,
    description: `Commande ${reference} — Atelier JP Montreuil`,
    redirectUrl: `${baseUrl}/shop/checkout/success?ref=${reference}`,
    webhookUrl: `${baseUrl}/api/shop/mollie-webhook`,
    email: payload.email,
    locale: payload.locale ?? 'fr',
  })

  if (mollie) {
    await sb.from('orders').update({
      mollie_payment_id: mollie.id,
      mollie_checkout_url: mollie.checkoutUrl,
    }).eq('id', order.id)
  }

  // Bevestigingsmail (best-effort, blokkeert order-creatie niet)
  try {
    await sendOrderConfirmationEmail({
      to: payload.email,
      reference,
      fullName: payload.full_name,
      items: payload.items.map((it) => ({
        title: it.title,
        unit_price_cents: it.unit_price_cents,
        quantity: it.quantity,
      })),
      amountCents,
      shippingCents,
      paymentUrl: mollie?.checkoutUrl ?? null,
      orderUrl,
    })
  } catch (e) {
    console.error('[checkout] mail send failed:', e)
  }

  return { reference, checkoutUrl: mollie?.checkoutUrl ?? null }
}
