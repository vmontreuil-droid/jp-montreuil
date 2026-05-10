/**
 * Helpers voor het klantenportaal-deel van de webshop. Deze module
 * werkt expliciet met de service-role admin client zodat we kunnen
 * matchen op auth.user().email tegen shop.customers en shop.orders —
 * en dus niet afhankelijk zijn van het feit dat een rij al een
 * `auth_user_id`-koppeling heeft (handig voor klanten die eerst gast
 * besteld hebben en pas later hun account claimen).
 *
 * RLS self-policies (zie 0022) maken dezelfde reads ook mogelijk via
 * de cookie-based shopServerClient, maar de admin-route is robuuster
 * voor server-rendering omdat we niet hoeven te wachten op de
 * sessie-cookie.
 */

import { createShopAdminClient } from './supabase'
import type { Photo } from './photo-url'
import type { ShopOrder, ShopOrderItem } from './orders'

export type ShopCustomer = {
  email: string
  full_name: string | null
  phone: string | null
  company: string | null
  address: Record<string, string> | null
  billing_address: Record<string, string> | null
  notes: string | null
  tags: string[]
  source: string
  is_archived: boolean
  is_b2b: boolean
  vat_number: string | null
  vat_validated_at: string | null
  vat_company_name: string | null
  auth_user_id: string | null
  created_at: string
  updated_at: string
}

/** Lees klantrij voor een ingelogde gebruiker. Returns null als nog niet bestaat. */
export async function getMyShopCustomer(email: string): Promise<ShopCustomer | null> {
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('customers')
    .select('*')
    .ilike('email', email)
    .maybeSingle()
  if (error) throw error
  return (data as ShopCustomer | null) ?? null
}

/**
 * Lijst alle bestellingen van deze klant. Sorteer op recentste eerst.
 * Match op email (case-insensitive) — auth_user_id wordt na de eerste
 * upsert ook gevuld, maar email blijft de stabiele identifier (een
 * gast-bestelling heeft nog geen account).
 */
export async function listMyShopOrders(email: string): Promise<ShopOrder[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('orders')
    .select('*')
    .ilike('email', email)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ShopOrder[]
}

export async function getMyShopOrderByReference(
  email: string,
  reference: string,
): Promise<ShopOrder | null> {
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('orders')
    .select('*')
    .eq('reference', reference)
    .ilike('email', email)
    .maybeSingle()
  if (error) throw error
  return (data as ShopOrder | null) ?? null
}

export async function listMyShopOrderItems(orderId: string): Promise<ShopOrderItem[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as ShopOrderItem[]
}

/**
 * Photo-info voor de klant-side weergave (factuur thumbnails). Per
 * order-items kunnen we een batch ophalen ipv N+1 queries.
 */
export async function getPhotosByIds(ids: string[]): Promise<Map<string, Photo>> {
  const out = new Map<string, Photo>()
  const filtered = ids.filter(Boolean)
  if (filtered.length === 0) return out
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('photos')
    .select('*')
    .in('id', filtered)
  if (error) throw error
  for (const row of (data ?? []) as Photo[]) out.set(row.id, row)
  return out
}

export type UpsertCustomerInput = {
  email: string
  authUserId?: string | null
  full_name?: string | null
  phone?: string | null
  company?: string | null
  address?: Record<string, string> | null
  billing_address?: Record<string, string> | null
  is_b2b?: boolean
  vat_number?: string | null
  vat_validated_at?: string | null
  vat_company_name?: string | null
  source?: string
}

/**
 * Upsert een klantrij obv lower(email). Wordt aangeroepen vanuit
 * checkout (gast bestelt → rij wordt aangemaakt) én vanuit
 * /portail/compte (ingelogde klant edit z'n profiel).
 *
 * We strippen ondefined velden zodat een PATCH-achtige update werkt:
 * checkout vult bv. geen B2B-velden in, dan blijven die ongemoeid.
 */
export async function upsertMyShopCustomer(input: UpsertCustomerInput): Promise<void> {
  const sb = createShopAdminClient()
  const email = input.email.trim().toLowerCase()
  if (!email) throw new Error('Email vereist voor customer-upsert')

  const patch: Record<string, unknown> = {
    email,
    source: input.source ?? 'shop_checkout',
  }
  for (const [k, v] of Object.entries(input)) {
    if (k === 'email' || k === 'source' || k === 'authUserId') continue
    if (v !== undefined) patch[k] = v
  }
  if (input.authUserId !== undefined) {
    patch['auth_user_id'] = input.authUserId
  }

  const { error } = await sb
    .from('customers')
    .upsert(patch, { onConflict: 'email' })
  if (error) throw error
}
