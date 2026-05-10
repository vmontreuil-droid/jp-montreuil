/**
 * Gift cards — een code = een saldo. Klant voert in bij checkout, krijgt
 * het bedrag afgetrokken (capped op order). Saldo wordt bijgewerkt in
 * gift_cards.remaining_cents en logged in gift_card_usages.
 */

import { createShopAdminClient } from './supabase'

export type GiftCard = {
  id: string
  code: string
  initial_cents: number
  remaining_cents: number
  recipient_email: string | null
  recipient_name: string | null
  message: string | null
  expires_at: string | null
  created_at: string
  source_order_id: string | null
  created_by: string | null
}

export type GiftCardValidation =
  | { ok: true; card: GiftCard; appliedCents: number }
  | { ok: false; reason: 'unknown' | 'empty' | 'expired' }

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // O/0/1/I weggelaten — leesbaarheid

export function generateGiftCardCode(): string {
  let out = ''
  for (let i = 0; i < 12; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    if (i === 3 || i === 7) out += '-'
  }
  return out
}

export async function listGiftCards(): Promise<GiftCard[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('gift_cards')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as GiftCard[]
}

export async function getGiftCardByCode(code: string): Promise<GiftCard | null> {
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('gift_cards')
    .select('*')
    .ilike('code', code.trim())
    .maybeSingle()
  if (error) throw error
  return (data as GiftCard | null) ?? null
}

export async function createGiftCard(input: {
  initial_eur: number
  recipient_email?: string | null
  recipient_name?: string | null
  message?: string | null
  expires_at?: string | null
  created_by?: string | null
}): Promise<GiftCard> {
  const sb = createShopAdminClient()
  const cents = Math.round(input.initial_eur * 100)
  if (cents <= 0) throw new Error('Montant > 0 requis')

  // Genereer een unieke code (max 5 retries voor unique-constraint)
  let code = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateGiftCardCode()
    const { data: existing } = await sb
      .from('gift_cards').select('id').eq('code', code).maybeSingle<{ id: string }>()
    if (!existing) break
  }

  const { data, error } = await sb
    .from('gift_cards')
    .insert({
      code,
      initial_cents: cents,
      remaining_cents: cents,
      recipient_email: input.recipient_email ?? null,
      recipient_name: input.recipient_name ?? null,
      message: input.message ?? null,
      expires_at: input.expires_at ?? null,
      created_by: input.created_by ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as GiftCard
}

export async function deleteGiftCard(id: string): Promise<void> {
  const sb = createShopAdminClient()
  const { error } = await sb.from('gift_cards').delete().eq('id', id)
  if (error) throw error
}

/**
 * Validatie + bereken hoeveel er afgetrokken kan worden van het orderbedrag.
 * Doet GEEN debit — dat doet `redeemGiftCard` op order-creatie.
 */
export async function validateGiftCard(
  rawCode: string,
  orderTotalCents: number,
): Promise<GiftCardValidation> {
  const trimmed = rawCode.trim()
  if (!trimmed) return { ok: false, reason: 'unknown' }
  const card = await getGiftCardByCode(trimmed)
  if (!card) return { ok: false, reason: 'unknown' }
  if (card.expires_at && new Date(card.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' }
  }
  if (card.remaining_cents <= 0) return { ok: false, reason: 'empty' }
  const applied = Math.min(card.remaining_cents, orderTotalCents)
  return { ok: true, card, appliedCents: applied }
}

/**
 * Debit gift card op order-creatie. Logged usage-rij + verlaagt
 * remaining_cents. Best-effort: als deze faalt blijven order + payment
 * geldig — admin kan handmatig corrigeren.
 */
export async function redeemGiftCard(input: {
  cardId: string
  orderId: string
  amountCents: number
}): Promise<void> {
  const sb = createShopAdminClient()
  const { error: insErr } = await sb.from('gift_card_usages').insert({
    gift_card_id: input.cardId,
    order_id: input.orderId,
    amount_cents: input.amountCents,
  })
  if (insErr) throw insErr
  const { data: card } = await sb
    .from('gift_cards')
    .select('remaining_cents')
    .eq('id', input.cardId)
    .maybeSingle<{ remaining_cents: number }>()
  if (card) {
    const next = Math.max(0, card.remaining_cents - input.amountCents)
    await sb.from('gift_cards').update({ remaining_cents: next }).eq('id', input.cardId)
  }
}
