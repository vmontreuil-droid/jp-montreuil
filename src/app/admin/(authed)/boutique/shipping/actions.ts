'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createShopAdminClient } from '@/lib/shop/supabase'

async function requireAdmin() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Non authentifié')
}

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim()
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
function parseCountries(raw: string): string[] {
  return raw.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean)
}

export async function createZone(form: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const name = str(form, 'name'); if (!name) throw new Error('Nom obligatoire')
  const baseCents = priceCentsFromEur(form, 'base_eur') ?? 0
  const freeAbove = priceCentsFromEur(form, 'free_above_eur')
  const { error } = await sb.from('shipping_zones').insert({
    name,
    countries: parseCountries(str(form, 'countries')),
    base_cents: baseCents,
    free_above_cents: freeAbove,
    is_default: bool(form, 'is_default'),
    is_active: bool(form, 'is_active'),
    sort_order: intOr(form, 'sort_order', 0),
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/boutique/shipping')
}

export async function updateZone(id: string, form: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const baseCents = priceCentsFromEur(form, 'base_eur') ?? 0
  const freeAbove = priceCentsFromEur(form, 'free_above_eur')
  const { error } = await sb.from('shipping_zones').update({
    name: str(form, 'name'),
    countries: parseCountries(str(form, 'countries')),
    base_cents: baseCents,
    free_above_cents: freeAbove,
    is_default: bool(form, 'is_default'),
    is_active: bool(form, 'is_active'),
    sort_order: intOr(form, 'sort_order', 0),
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/boutique/shipping')
}

export async function deleteZone(id: string) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb.from('shipping_zones').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/boutique/shipping')
}
