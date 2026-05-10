import { createShopAdminClient } from './supabase'

export type ShippingZone = {
  id: string
  name: string
  countries: string[]
  base_cents: number
  free_above_cents: number | null
  is_default: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export async function listActiveZones(): Promise<ShippingZone[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('shipping_zones').select('*')
    .eq('is_active', true).order('sort_order')
  if (error) return []
  return (data ?? []) as ShippingZone[]
}

export async function adminListZones(): Promise<ShippingZone[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('shipping_zones').select('*').order('sort_order')
  if (error) return []
  return (data ?? []) as ShippingZone[]
}

/**
 * Bereken verzendkost voor een bestelling. Eerst exacte country-match,
 * dan default-zone (catch-all). free_above_cents triggert gratis levering
 * bij subtotal >= threshold.
 */
export async function shopShippingForCountry(
  country: string,
  subtotalCents: number,
): Promise<{ cents: number; zone: ShippingZone | null }> {
  const zones = await listActiveZones()
  if (zones.length === 0) return { cents: 0, zone: null }
  const upper = country.toUpperCase()
  const zone =
    zones.find((z) => z.countries.includes(upper)) ??
    zones.find((z) => z.is_default) ??
    null
  if (!zone) return { cents: 0, zone: null }
  if (zone.free_above_cents != null && subtotalCents >= zone.free_above_cents) {
    return { cents: 0, zone }
  }
  return { cents: zone.base_cents, zone }
}

/** Voor de hint onder een prijs: cheapest zone tarief + threshold. */
export async function cheapestShippingHint(): Promise<{
  baseCents: number
  freeAboveCents: number | null
  country: string | null
} | null> {
  const zones = await listActiveZones()
  if (zones.length === 0) return null
  const cheapest = zones.reduce((min, z) => (z.base_cents < min.base_cents ? z : min), zones[0])
  return {
    baseCents: cheapest.base_cents,
    freeAboveCents: cheapest.free_above_cents,
    country: cheapest.countries[0] ?? null,
  }
}
