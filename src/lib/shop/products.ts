import { createShopAdminClient } from './supabase'

export type ProductKind = 'calendar' | 'print' | 'download' | 'commission'

export type Product = {
  id: string
  slug: string
  kind: ProductKind
  title_fr: string
  title_nl: string | null
  title_en: string | null
  description_fr: string | null
  description_nl: string | null
  description_en: string | null
  cover_photo_id: string | null
  price_cents: number | null
  is_published: boolean
  is_archived: boolean
  pre_order_until: string | null
  ships_from: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type ProductVariant = {
  id: string
  product_id: string
  label: string
  price_cents: number
  stock: number | null
  sort_order: number
  created_at: string
}

export type Locale = 'fr' | 'nl' | 'en'

export function getTitle(p: Product, locale: Locale): string {
  if (locale === 'nl' && p.title_nl) return p.title_nl
  if (locale === 'en' && p.title_en) return p.title_en
  return p.title_fr
}

export function getDescription(p: Product, locale: Locale): string {
  if (locale === 'nl' && p.description_nl) return p.description_nl
  if (locale === 'en' && p.description_en) return p.description_en
  return p.description_fr ?? ''
}

export function formatPrice(cents: number, locale: Locale = 'fr'): string {
  const intl = locale === 'fr' ? 'fr-BE' : locale === 'nl' ? 'nl-BE' : 'en-GB'
  return new Intl.NumberFormat(intl, {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function isSoldOut(p: Product, variants: ProductVariant[] = []): boolean {
  if (p.kind === 'print' && variants.length > 0) {
    return variants.every((v) => v.stock !== null && v.stock <= 0)
  }
  return false
}

export async function listShopProducts(opts: {
  publishedOnly?: boolean
  kind?: ProductKind
} = {}): Promise<Product[]> {
  const sb = createShopAdminClient()
  let q = sb.from('products').select('*')
    .eq('is_archived', false)
    .order('sort_order')
    .order('created_at', { ascending: false })
  if (opts.publishedOnly) q = q.eq('is_published', true)
  if (opts.kind) q = q.eq('kind', opts.kind)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Product[]
}

export async function getShopProductById(id: string): Promise<Product | null> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('products').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Product | null) ?? null
}

export async function getShopProductBySlug(slug: string): Promise<Product | null> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('products').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return (data as Product | null) ?? null
}

export async function listShopVariants(productId: string): Promise<ProductVariant[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('product_variants').select('*')
    .eq('product_id', productId).order('sort_order')
  if (error) throw error
  return (data ?? []) as ProductVariant[]
}
