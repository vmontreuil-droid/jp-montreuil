import { createShopAdminClient } from './supabase'
import type { Locale } from './products'

/**
 * Print-shop config: media (papier/canvas/alu/plexi), sizes (S..XXL),
 * en de prijs-matrix per (medium, size). Beheerd via /shop/admin/boutique.
 */

export type PrintMedium = {
  id: string
  slug: string
  name_fr: string
  name_nl: string | null
  name_en: string | null
  description_fr: string | null
  description_nl: string | null
  description_en: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export type PrintSize = {
  id: string
  slug: string
  label: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export type PrintPrice = {
  media_id: string
  size_id: string
  price_cents: number
  is_available: boolean
}

export function mediumName(m: PrintMedium, locale: Locale): string {
  if (locale === 'nl' && m.name_nl) return m.name_nl
  if (locale === 'en' && m.name_en) return m.name_en
  return m.name_fr
}

export function formatEur(cents: number, locale: Locale = 'fr'): string {
  const intl = locale === 'fr' ? 'fr-BE' : locale === 'nl' ? 'nl-BE' : 'en-GB'
  return new Intl.NumberFormat(intl, {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  }).format(cents / 100)
}

export async function listAllMedia(): Promise<PrintMedium[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('print_media').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as PrintMedium[]
}

export async function listActiveMedia(): Promise<PrintMedium[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('print_media').select('*')
    .eq('is_active', true).order('sort_order')
  if (error) throw error
  return (data ?? []) as PrintMedium[]
}

export async function listAllSizes(): Promise<PrintSize[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('print_sizes').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as PrintSize[]
}

export async function listActiveSizes(): Promise<PrintSize[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('print_sizes').select('*')
    .eq('is_active', true).order('sort_order')
  if (error) throw error
  return (data ?? []) as PrintSize[]
}

export async function listAllPrices(): Promise<PrintPrice[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('print_prices').select('*')
  if (error) throw error
  return (data ?? []) as PrintPrice[]
}

export async function listAvailablePrices(): Promise<PrintPrice[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('print_prices').select('*').eq('is_available', true)
  if (error) throw error
  return (data ?? []) as PrintPrice[]
}
