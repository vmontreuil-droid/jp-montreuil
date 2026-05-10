'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { slugify } from '@/lib/shop/photos'
import type { ProductKind } from '@/lib/shop/products'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet geauthenticeerd')
}

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim()
}
function strOrNull(form: FormData, key: string): string | null {
  const v = str(form, key)
  return v === '' ? null : v
}
function bool(form: FormData, key: string): boolean {
  return form.get(key) === 'on' || form.get(key) === 'true'
}
function intOr(form: FormData, key: string, fallback: number): number {
  const raw = str(form, key)
  if (raw === '') return fallback
  const n = Number(raw)
  return Number.isInteger(n) ? n : fallback
}
function priceCentsFromEur(form: FormData, key: string): number | null {
  const raw = str(form, key)
  if (raw === '') return null
  const n = Number(raw.replace(',', '.'))
  if (!isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export async function createShopProduct(form: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()

  const titleFr = str(form, 'title_fr')
  if (!titleFr) throw new Error('Titre FR obligatoire')
  const slug = strOrNull(form, 'slug') ?? slugify(titleFr)
  const kind = (strOrNull(form, 'kind') ?? 'print') as ProductKind

  const { data, error } = await sb.from('products').insert({
    slug,
    kind,
    title_fr: titleFr,
    title_nl: strOrNull(form, 'title_nl'),
    title_en: strOrNull(form, 'title_en'),
    description_fr: strOrNull(form, 'description_fr'),
    description_nl: strOrNull(form, 'description_nl'),
    description_en: strOrNull(form, 'description_en'),
    cover_photo_id: strOrNull(form, 'cover_photo_id'),
    price_cents: priceCentsFromEur(form, 'price_eur'),
    is_published: bool(form, 'is_published'),
    sort_order: intOr(form, 'sort_order', 0),
  }).select('id').single()

  if (error) {
    if (error.code === '23505') throw new Error(`Le slug "${slug}" existe déjà`)
    throw error
  }
  revalidatePath('/admin/boutique/products')
  redirect(`/admin/boutique/products/${data.id}`)
}

export async function updateShopProduct(id: string, form: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb.from('products').update({
    title_fr: str(form, 'title_fr'),
    title_nl: strOrNull(form, 'title_nl'),
    title_en: strOrNull(form, 'title_en'),
    description_fr: strOrNull(form, 'description_fr'),
    description_nl: strOrNull(form, 'description_nl'),
    description_en: strOrNull(form, 'description_en'),
    cover_photo_id: strOrNull(form, 'cover_photo_id'),
    price_cents: priceCentsFromEur(form, 'price_eur'),
    is_published: bool(form, 'is_published'),
    sort_order: intOr(form, 'sort_order', 0),
  }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/boutique/products')
  revalidatePath(`/admin/boutique/products/${id}`)
}

export async function deleteShopProduct(id: string) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb.from('products').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/boutique/products')
  redirect('/admin/boutique/products')
}

/* Variants */

export async function createShopVariant(productId: string, form: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const label = str(form, 'label')
  if (!label) throw new Error('Label obligatoire')
  const priceCents = priceCentsFromEur(form, 'price_eur')
  if (priceCents == null) throw new Error('Prix obligatoire')
  const { error } = await sb.from('product_variants').insert({
    product_id: productId,
    label,
    price_cents: priceCents,
    stock: intOr(form, 'stock', 0) || null,
    sort_order: intOr(form, 'sort_order', 0),
  })
  if (error) throw error
  revalidatePath(`/admin/boutique/products/${productId}`)
}

export async function deleteShopVariant(productId: string, variantId: string) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb.from('product_variants').delete().eq('id', variantId)
  if (error) throw error
  revalidatePath(`/admin/boutique/products/${productId}`)
}
