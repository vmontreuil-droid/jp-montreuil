'use server'

import { headers } from 'next/headers'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { generateShopReference } from '@/lib/shop/orders'
import { shopShippingForCountry } from '@/lib/shop/shipping'
import { createMolliePayment } from '@/lib/shop/mollie'
import { sendOrderConfirmationEmail } from '@/lib/shop/mail'
import { upsertMyShopCustomer } from '@/lib/shop/customer-portal'
import { createClient } from '@/lib/supabase/server'
import { checkVies } from '@/lib/vies'
import { validateDiscount, recordRedemption } from '@/lib/shop/discount-codes'

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
  phone?: string
  shipping_address: {
    street: string
    postal_code: string
    city: string
    country: string
    notes: string
  }
  items: CheckoutItem[]
  locale?: string
  is_b2b?: boolean
  company_name?: string | null
  vat_number?: string | null
  discount_code?: string | null
}

/**
 * Server-side preview van een kortingscode op basis van het huidige
 * cart-subtotaal. Wordt vanuit de CheckoutForm aangeroepen om feedback
 * te tonen vóór submit.
 */
export async function previewDiscount(input: {
  code: string
  subtotalCents: number
}): Promise<{ ok: true; discountCents: number; description: string | null } | { ok: false; reason: string }> {
  const result = await validateDiscount(input.code, input.subtotalCents)
  if (!result.ok) {
    const map: Record<string, string> = {
      unknown: 'Code inconnu',
      inactive: 'Code inactif',
      expired: 'Code expiré',
      min_subtotal: 'Sous-total trop faible pour ce code',
      max_uses: 'Code épuisé',
    }
    return { ok: false, reason: map[result.reason] ?? 'Code invalide' }
  }
  return {
    ok: true,
    discountCents: result.discountCents,
    description: result.code.description,
  }
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

  // Optionele kortingscode — server-side hervalidatie (klant kan via
  // browser-tools het object aanpassen, dus nooit op de prijs in de
  // payload vertrouwen).
  let discountCents = 0
  let discountCode: string | null = null
  let discountCodeId: string | null = null
  if (payload.discount_code) {
    const validation = await validateDiscount(payload.discount_code, subtotalCents)
    if (validation.ok) {
      discountCents = validation.discountCents
      discountCode = validation.code.code
      discountCodeId = validation.code.id
    }
    // Bij invalide code stil falen — de UI heeft al feedback gegeven via
    // previewDiscount; we willen geen order blokkeren door een verlopen code.
  }

  const amountCents = subtotalCents + shippingCents - discountCents

  // B2B-validatie: re-check VIES server-side. Bij unavailable bewaren we
  // het nummer wel, maar zonder validated-timestamp — admin kan
  // achteraf manueel valideren.
  const isB2B = !!payload.is_b2b
  let vatNormalized: string | null = null
  let vatValidatedAt: string | null = null
  let vatCompanyName: string | null = null
  if (isB2B && payload.vat_number) {
    const raw = payload.vat_number.toUpperCase().replace(/[\s.\-_]/g, '')
    if (raw) {
      vatNormalized = raw
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
  }

  // Optioneel auth-user koppelen (gast checkout = null)
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  const authUserId = user?.email?.toLowerCase() === payload.email.toLowerCase()
    ? user.id
    : null

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
      discount_code: discountCode,
      discount_cents: discountCents,
      is_b2b: isB2B,
      company_name: isB2B ? (payload.company_name ?? null) : null,
      vat_number: vatNormalized,
      vat_validated_at: vatValidatedAt,
      vat_company_name: vatCompanyName,
    })
    .select('id')
    .single()
  if (orderErr) throw new Error(orderErr.message)

  // Discount-redemption loggen + uses_count bumpen
  if (discountCodeId && discountCents > 0) {
    try {
      await recordRedemption({
        codeId: discountCodeId,
        orderId: order.id,
        amountCents: discountCents,
        email: payload.email,
      })
    } catch (e) {
      console.error('[checkout] discount redemption log failed:', e)
      // niet fataal
    }
  }

  // Upsert klant-profiel — zorgt dat een volgende bestelling pre-fill heeft
  try {
    await upsertMyShopCustomer({
      email: payload.email,
      authUserId,
      full_name: payload.full_name,
      phone: payload.phone || null,
      address: payload.shipping_address,
      billing_address: payload.shipping_address,
      is_b2b: isB2B,
      company: isB2B ? (payload.company_name ?? null) : null,
      vat_number: vatNormalized,
      vat_validated_at: vatValidatedAt,
      vat_company_name: vatCompanyName,
      source: authUserId ? 'shop_checkout_authed' : 'shop_checkout_guest',
    })
  } catch (e) {
    console.error('[checkout] customer upsert failed:', e)
    // niet fataal — order staat al, we gaan door
  }

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
