import { createShopAdminClient } from './supabase'

/**
 * Health-check voor de scaffolding-fase: kijkt of het `shop` schema
 * en de hoofd-tabellen bereikbaar zijn via PostgREST. Returns een
 * detail-object dat de admin-pagina kan tonen om de migration- en
 * exposed-schemas-status van de Supabase setup te verifiëren.
 */
export type ShopHealth = {
  ok: boolean
  message: string
  counts: {
    photos: number | null
    products: number | null
    customers: number | null
    orders: number | null
  }
}

export async function checkShopHealth(): Promise<ShopHealth> {
  const sb = createShopAdminClient()

  async function safeCount(table: string): Promise<number | null> {
    try {
      const { count, error } = await sb
        .from(table)
        .select('*', { head: true, count: 'exact' })
      if (error) return null
      return count ?? 0
    } catch {
      return null
    }
  }

  const [photos, products, customers, orders] = await Promise.all([
    safeCount('photos'),
    safeCount('products'),
    safeCount('customers'),
    safeCount('orders'),
  ])

  const allReachable = [photos, products, customers, orders].every((n) => n !== null)

  return {
    ok: allReachable,
    message: allReachable
      ? 'Schema "shop" is bereikbaar — webshop kan worden gebruikt.'
      : 'Schema "shop" niet bereikbaar. Voer migration 0011_create_shop_schema.sql uit en voeg "shop" toe aan Exposed schemas in Supabase.',
    counts: { photos, products, customers, orders },
  }
}
