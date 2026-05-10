import { createShopAdminClient } from './supabase'

export type OrderStatus =
  | 'pending' | 'paid' | 'shipped' | 'fulfilled' | 'canceled' | 'refunded'

export type ShopOrder = {
  id: string
  reference: string
  status: OrderStatus
  email: string
  full_name: string
  shipping_address: Record<string, string> | null
  shipping_country: string | null
  shipping_cents: number
  mollie_payment_id: string | null
  mollie_checkout_url: string | null
  amount_cents: number
  currency: string
  locale: string
  notes: string | null
  tracking_number: string | null
  tracking_carrier: string | null
  internal_status: string | null
  discount_code: string | null
  discount_cents: number
  gift_card_code: string | null
  gift_card_cents: number
  company_name: string | null
  vat_number: string | null
  vat_validated_at: string | null
  vat_company_name: string | null
  created_at: string
  paid_at: string | null
  updated_at: string
}

export type ShopOrderItem = {
  id: string
  order_id: string
  product_id: string | null
  variant_id: string | null
  title: string
  unit_price_cents: number
  quantity: number
  photo_id: string | null
  print_media_slug: string | null
  print_size_slug: string | null
  print_size_label: string | null
  created_at: string
}

/**
 * Genereer een orderreferentie zoals "JPM-2026-12345" — JPM = JP
 * Montreuil. Random suffix om ze niet voorspelbaar te maken (klanten
 * kunnen elkaars orders niet raden).
 */
export function generateShopReference(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 90000 + 10000) // 10000..99999
  return `JPM-${year}-${rand}`
}

export async function listShopOrders(): Promise<ShopOrder[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ShopOrder[]
}

export async function getShopOrderById(id: string): Promise<ShopOrder | null> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('orders').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as ShopOrder | null) ?? null
}

export async function getShopOrderByReference(ref: string): Promise<ShopOrder | null> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('orders').select('*').eq('reference', ref).maybeSingle()
  if (error) throw error
  return (data as ShopOrder | null) ?? null
}

export async function listShopOrderItems(orderId: string): Promise<ShopOrderItem[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('order_items').select('*')
    .eq('order_id', orderId).order('created_at')
  if (error) throw error
  return (data ?? []) as ShopOrderItem[]
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente paiement',
  paid: 'Payée',
  shipped: 'Expédiée',
  fulfilled: 'Livrée',
  canceled: 'Annulée',
  refunded: 'Remboursée',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  shipped: 'bg-blue-100 text-blue-800',
  fulfilled: 'bg-stone-100 text-stone-700',
  canceled: 'bg-stone-100 text-stone-500',
  refunded: 'bg-red-100 text-red-700',
}
