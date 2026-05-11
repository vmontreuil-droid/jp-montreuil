import { createShopAdminClient } from './supabase'
import type { Locale } from './products'

/**
 * Print-shop config: media (papier/canvas/alu/plexi), sizes (S..XXL),
 * en de prijs-matrix per (medium, size). Beheerd via /admin/boutique/boutique.
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

/**
 * Telt order_items van de laatste N dagen en geeft de meest gekozen
 * material- en size-slug terug. Wordt gebruikt om "Populair"-badges in
 * de configurator te tonen op basis van echte aankoop-stats.
 *
 * Returnt null voor een veld wanneer er onvoldoende data is — laat de
 * caller dan een sane default kiezen.
 */
export async function getPopularPrintCombo(daysBack = 30): Promise<{
  materialSlug: string | null
  sizeSlug: string | null
  totalSamples: number
}> {
  const sb = createShopAdminClient()
  const sinceIso = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await sb
    .from('order_items')
    .select('print_media_slug, print_size_slug, created_at')
    .gte('created_at', sinceIso)
    .not('print_media_slug', 'is', null)
  if (error || !data) return { materialSlug: null, sizeSlug: null, totalSamples: 0 }
  const matCount = new Map<string, number>()
  const sizeCount = new Map<string, number>()
  for (const row of data) {
    const m = (row as { print_media_slug: string | null }).print_media_slug
    const s = (row as { print_size_slug: string | null }).print_size_slug
    if (m) matCount.set(m, (matCount.get(m) ?? 0) + 1)
    if (s) sizeCount.set(s, (sizeCount.get(s) ?? 0) + 1)
  }
  const topOf = (m: Map<string, number>): string | null => {
    let best: [string, number] | null = null
    for (const entry of m.entries()) {
      if (!best || entry[1] > best[1]) best = entry
    }
    return best?.[0] ?? null
  }
  return {
    materialSlug: topOf(matCount),
    sizeSlug: topOf(sizeCount),
    totalSamples: data.length,
  }
}
