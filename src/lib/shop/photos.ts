import { createShopAdminClient } from './supabase'

/**
 * Photo-helpers voor de webshop. Alle queries gaan naar `shop.photos`
 * via createShopAdminClient (schema-isolated client).
 *
 * URL helper bouwt een publieke URL voor de Storage-bucket `shop-photos`
 * (apart van de jp-montreuil galerij-bucket `photos`).
 */

export type Photo = {
  id: string
  slug: string
  title: string | null
  description: string | null
  alt_text: string | null
  ai_alt_generated_at: string | null
  storage_path: string
  taken_at: string | null
  taken_at_location: string | null
  species: string | null
  width: number | null
  height: number | null
  is_published: boolean
  is_slider: boolean
  slider_order: number
  sort_order: number
  created_at: string
  updated_at: string
}

const BUCKET = 'shop-photos'

export function shopPhotoUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) throw new Error('NEXT_PUBLIC_SUPABASE_URL ontbreekt')
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`
}

export function photoAlt(p: Pick<Photo, 'alt_text' | 'title' | 'slug'>): string {
  return p.alt_text ?? p.title ?? p.slug
}

/**
 * Slugify — geport van allardphilippe. Strip diacritics + lowercase +
 * non-alphanum naar dash, max 60 chars.
 */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // diacritics
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'photo'
  )
}

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

export const SHOP_PHOTOS_BUCKET = BUCKET
