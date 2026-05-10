/**
 * Drukkerijen / leveranciers — admin-side lijst & per-medium default.
 * Service-role client (admin pages hebben al auth-check via layout).
 */

import { createShopAdminClient } from './supabase'

export type Supplier = {
  id: string
  name: string
  email: string
  phone: string | null
  default_for_media: string[]
  is_active: boolean
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export async function listSuppliers(opts?: { activeOnly?: boolean }): Promise<Supplier[]> {
  const sb = createShopAdminClient()
  let q = sb.from('suppliers').select('*').order('sort_order').order('name')
  if (opts?.activeOnly) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Supplier[]
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('suppliers').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Supplier | null) ?? null
}

/**
 * Vind de default leverancier voor een gegeven medium-slug
 * (bv. 'fine_art', 'canvas'). Eerste actieve match in sort_order wint.
 * Returns null als geen enkele leverancier dit medium dekt — caller
 * krijgt dan een onassigned bon (admin moet handmatig kiezen).
 */
export async function getDefaultSupplierFor(mediaSlug: string): Promise<Supplier | null> {
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .contains('default_for_media', [mediaSlug])
    .order('sort_order')
    .order('name')
    .limit(1)
  if (error) throw error
  return ((data ?? [])[0] as Supplier | undefined) ?? null
}
