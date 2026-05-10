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
  revalidatePath('/admin/boutique/boutique')
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
  revalidatePath('/admin/boutique/boutique')
}

export async function deleteMedium(id: string) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb.from('print_media').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/boutique/boutique')
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
  revalidatePath('/admin/boutique/boutique')
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
  revalidatePath('/admin/boutique/boutique')
}

export async function deleteSize(id: string) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb.from('print_sizes').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/boutique/boutique')
}

/* ---------- Prijs-matrix bulk-fill ---------- */

/**
 * Vult ontbrekende prijs-cellen in de matrix met een berekende default.
 * Voor elke media × size combinatie zonder bestaande prijs:
 *  - Basis-prijs uit de mediums tabel (uit de eerste bestaande cel
 *    voor die media, of fallback default per slug).
 *  - Vermenigvuldigd met size-multipliers
 *    (s 1.0, m 2.4, l 4.0, xl 6.5, xxl 10.0) — zelfde als Allard.
 *  - Sizes die niet in de standaard slugs zitten krijgen multiplier 1.
 *
 * Idempotent: bestaande prijzen worden NIET overschreven.
 */
const SIZE_MULTIPLIERS: Record<string, number> = {
  s: 1.0,
  m: 2.4,
  l: 4.0,
  xl: 6.5,
  xxl: 10.0,
}

const DEFAULT_BASE_CENTS: Record<string, number> = {
  fine_art: 4500,
  canvas: 7500,
  aluminum: 9500,
  plexi: 11500,
}

function deriveBaseCents(mediaSlug: string, existing: { size_slug: string; price_cents: number }[]): number {
  // 1) Fallback default per medium-slug
  if (DEFAULT_BASE_CENTS[mediaSlug]) return DEFAULT_BASE_CENTS[mediaSlug]
  // 2) Reverse-engineer uit een bestaande cel: cel_cents / multiplier
  for (const e of existing) {
    const mult = SIZE_MULTIPLIERS[e.size_slug] ?? 1
    if (mult > 0 && e.price_cents > 0) return Math.round(e.price_cents / mult)
  }
  // 3) Laatste redmiddel: 5000 cent (50€) als basis
  return 5000
}

export type FillReport = { added: number; skipped: number }

export async function fillMissingPrices(): Promise<FillReport> {
  await requireAdmin()
  const sb = createShopAdminClient()

  const [
    { data: mediaRaw },
    { data: sizesRaw },
    { data: pricesRaw },
  ] = await Promise.all([
    sb.from('print_media').select('id, slug').eq('is_active', true),
    sb.from('print_sizes').select('id, slug').eq('is_active', true),
    sb.from('print_prices').select('media_id, size_id, price_cents'),
  ])
  const media = (mediaRaw ?? []) as { id: string; slug: string }[]
  const sizes = (sizesRaw ?? []) as { id: string; slug: string }[]
  const prices = (pricesRaw ?? []) as { media_id: string; size_id: string; price_cents: number }[]

  const existingKey = new Set(prices.map((p) => `${p.media_id}|${p.size_id}`))
  const sizeSlugById = new Map(sizes.map((s) => [s.id, s.slug]))

  let added = 0
  let skipped = 0
  const inserts: { media_id: string; size_id: string; price_cents: number; is_available: boolean }[] = []

  for (const m of media) {
    // Bestaande cellen voor dit medium → nodig om base te raden
    const mediaPrices = prices
      .filter((p) => p.media_id === m.id)
      .map((p) => ({
        size_slug: sizeSlugById.get(p.size_id) ?? '',
        price_cents: p.price_cents,
      }))
    const baseCents = deriveBaseCents(m.slug, mediaPrices)

    for (const s of sizes) {
      const key = `${m.id}|${s.id}`
      if (existingKey.has(key)) {
        skipped += 1
        continue
      }
      const mult = SIZE_MULTIPLIERS[s.slug] ?? 1
      inserts.push({
        media_id: m.id,
        size_id: s.id,
        price_cents: Math.round(baseCents * mult),
        is_available: true,
      })
      added += 1
    }
  }

  if (inserts.length > 0) {
    // Batch insert (PostgREST limit 1000 — onze matrix < 100 cellen dus 1 batch ok)
    const { error } = await sb.from('print_prices').insert(inserts)
    if (error) throw error
  }

  revalidatePath('/admin/boutique/boutique')
  revalidatePath('/shop/boutique')
  return { added, skipped }
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
  revalidatePath('/admin/boutique/boutique')
}
