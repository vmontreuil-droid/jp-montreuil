/**
 * Pure photo URL + helpers — geen Supabase-imports zodat Client
 * Components dit veilig kunnen importeren (anders trekken ze
 * `next/headers` mee via supabase.ts wat een build-error geeft).
 *
 * Server-side queries (listShopPhotos, getShopPhotoById) staan apart in
 * src/lib/shop/photos.ts.
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

export const SHOP_PHOTOS_BUCKET = 'shop-photos'

export function shopPhotoUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) throw new Error('NEXT_PUBLIC_SUPABASE_URL ontbreekt')
  return `${base}/storage/v1/object/public/${SHOP_PHOTOS_BUCKET}/${storagePath}`
}

export function photoAlt(p: Pick<Photo, 'alt_text' | 'title' | 'slug'>): string {
  return p.alt_text ?? p.title ?? p.slug
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'photo'
  )
}
