/**
 * Discount-codes helpers. Validatie + toepassing draait service-role
 * zodat de cookie-client niet gefopt kan worden door RLS-bypass via
 * select.
 */

import { createShopAdminClient } from './supabase'

export type DiscountKind = 'percent' | 'fixed_amount'

export type ShopDiscountCode = {
  id: string
  code: string
  kind: DiscountKind
  value: number
  min_subtotal_cents: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
}

export type DiscountValidation =
  | { ok: true; code: ShopDiscountCode; discountCents: number }
  | { ok: false; reason: 'unknown' | 'inactive' | 'expired' | 'min_subtotal' | 'max_uses' }

export async function listDiscountCodes(): Promise<ShopDiscountCode[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ShopDiscountCode[]
}

export async function getDiscountByCode(code: string): Promise<ShopDiscountCode | null> {
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('discount_codes')
    .select('*')
    .ilike('code', code.trim())
    .maybeSingle()
  if (error) throw error
  return (data as ShopDiscountCode | null) ?? null
}

/**
 * Bereken de korting in cent voor een gegeven subtotaal. Validatie:
 *  - actief
 *  - niet vervallen
 *  - min_subtotal_cents bereikt
 *  - max_uses niet overschreden
 *
 * Discount kan nooit groter zijn dan het subtotaal (clamp naar
 * subtotaal-1 cent zodat een totaal van 0 nooit voorkomt — Mollie
 * weigert payments van 0).
 */
export function evaluateDiscount(
  code: ShopDiscountCode,
  subtotalCents: number,
): DiscountValidation {
  if (!code.is_active) return { ok: false, reason: 'inactive' }
  if (code.expires_at && new Date(code.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' }
  }
  if (code.max_uses != null && code.uses_count >= code.max_uses) {
    return { ok: false, reason: 'max_uses' }
  }
  if (subtotalCents < code.min_subtotal_cents) {
    return { ok: false, reason: 'min_subtotal' }
  }
  let discount = 0
  if (code.kind === 'percent') {
    discount = Math.round((subtotalCents * code.value) / 100)
  } else {
    discount = code.value
  }
  // clamp
  if (discount >= subtotalCents) discount = Math.max(0, subtotalCents - 1)
  return { ok: true, code, discountCents: discount }
}

export async function validateDiscount(
  rawCode: string,
  subtotalCents: number,
): Promise<DiscountValidation> {
  const trimmed = rawCode.trim()
  if (!trimmed) return { ok: false, reason: 'unknown' }
  const code = await getDiscountByCode(trimmed)
  if (!code) return { ok: false, reason: 'unknown' }
  return evaluateDiscount(code, subtotalCents)
}

export async function recordRedemption(input: {
  codeId: string
  orderId: string
  amountCents: number
  email: string
}): Promise<void> {
  const sb = createShopAdminClient()
  const { error: insErr } = await sb.from('discount_redemptions').insert({
    code_id: input.codeId,
    order_id: input.orderId,
    amount_cents: input.amountCents,
    email: input.email,
  })
  if (insErr) throw insErr
  // Bump uses_count atomisch via RPC zou cleaner zijn, maar voor lage
  // traffic site is deze read-modify-write OK.
  const { data: code } = await sb
    .from('discount_codes')
    .select('uses_count')
    .eq('id', input.codeId)
    .maybeSingle<{ uses_count: number }>()
  if (code) {
    await sb
      .from('discount_codes')
      .update({ uses_count: code.uses_count + 1 })
      .eq('id', input.codeId)
  }
}
