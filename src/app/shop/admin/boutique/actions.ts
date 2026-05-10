'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createShopAdminClient } from '@/lib/shop/supabase'

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
function intOr(form: FormData, key: string, fb: number): number {
  const raw = str(form, key); if (raw === '') return fb
  const n = Number(raw); return Number.isInteger(n) ? n : fb
}
function priceCentsFromEur(form: FormData, key: string): number | null {
  const raw = str(form, key); if (raw === '') return null
  const n = Number(raw.replace(',', '.'))
  if (!isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

/* ---------- Media ---------- */

export async function createMedium(form: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const slug = str(form, 'slug'); const nameFr = str(form, 'name_fr')
  if (!slug || !nameFr) throw new Error('Slug + nom FR obligatoires')
  const { error } = await sb.from('print_media').insert({
    slug,
    name_fr: nameFr,
    name_nl: strOrNull(form, 'name_nl'),
    name_en: strOrNull(form, 'name_en'),
    is_active: bool(form, 'is_active'),
    sort_order: intOr(form, 'sort_order', 0),
  })
  if (error) throw error
  revalidatePath('/shop/admin/boutique')
}

export async function updateMedium(id: string, form: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb.from('print_media').update({
    name_fr: str(form, 'name_fr'),
    name_nl: strOrNull(form, 'name_nl'),
    name_en: strOrNull(form, 'name_en'),
    is_active: bool(form, 'is_active'),
    sort_order: intOr(form, 'sort_order', 0),
  }).eq('id', id)
  if (error) throw error
  revalidatePath('/shop/admin/boutique')
}

export async function deleteMedium(id: string) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb.from('print_media').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/shop/admin/boutique')
}

/* ---------- Sizes ---------- */

export async function createSize(form: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const slug = str(form, 'slug'); const label = str(form, 'label')
  if (!slug || !label) throw new Error('Slug + label obligatoires')
  const { error } = await sb.from('print_sizes').insert({
    slug, label,
    is_active: bool(form, 'is_active'),
    sort_order: intOr(form, 'sort_order', 0),
  })
  if (error) throw error
  revalidatePath('/shop/admin/boutique')
}

export async function updateSize(id: string, form: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb.from('print_sizes').update({
    label: str(form, 'label'),
    is_active: bool(form, 'is_active'),
    sort_order: intOr(form, 'sort_order', 0),
  }).eq('id', id)
  if (error) throw error
  revalidatePath('/shop/admin/boutique')
}

export async function deleteSize(id: string) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb.from('print_sizes').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/shop/admin/boutique')
}

/* ---------- Prijs-matrix cell-update ---------- */

export async function setPriceCell(form: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const mediaId = str(form, 'media_id')
  const sizeId = str(form, 'size_id')
  if (!mediaId || !sizeId) throw new Error('media_id + size_id verplicht')
  const priceCents = priceCentsFromEur(form, 'price_eur')
  const isAvail = bool(form, 'is_available')
  if (priceCents == null) {
    // null prijs = verwijder cel
    await sb.from('print_prices').delete().match({ media_id: mediaId, size_id: sizeId })
  } else {
    await sb.from('print_prices').upsert({
      media_id: mediaId, size_id: sizeId, price_cents: priceCents, is_available: isAvail,
    })
  }
  revalidatePath('/shop/admin/boutique')
}
