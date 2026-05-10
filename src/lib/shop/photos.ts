import { createShopAdminClient } from './supabase'
import type { Photo } from './photo-url'

/**
 * Server-side photo-queries. Client Components mogen dit bestand niet
 * importeren — gebruik @/lib/shop/photo-url voor pure helpers
 * (shopPhotoUrl, photoAlt, slugify, type Photo).
 */

// Re-exports voor backward compat — server-side code kan nog uit @/lib/shop/photos importeren
export { shopPhotoUrl, photoAlt, slugify, SHOP_PHOTOS_BUCKET } from './photo-url'
export type { Photo } from './photo-url'

export async function listShopPhotos(opts: { publishedOnly?: boolean } = {}): Promise<Photo[]> {
  const sb = createShopAdminClient()
  let q = sb.from('photos').select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (opts.publishedOnly) q = q.eq('is_published', true)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Photo[]
}

export async function getShopPhotoById(id: string): Promise<Photo | null> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('photos').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Photo | null) ?? null
}
