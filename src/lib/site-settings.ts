/**
 * Site-settings helpers — leest uit de public.site_settings tabel.
 * Server-only (gebruikt service-role / cookie-server client). Voor
 * publieke pagina's is een subset van keys via RLS leesbaar zonder admin.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type SiteSetting = {
  key: string
  value: string | null
  description: string | null
  updated_at: string
}

const PUBLISHABLE_KEYS = new Set([
  'site_title',
  'site_tagline',
  'meta_description',
  'social_default_image',
  'announcement_banner',
  'reply_to_email',
])

export async function listAllSettings(): Promise<SiteSetting[]> {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('site_settings')
    .select('key, value, description, updated_at')
    .order('key')
  if (error) throw error
  return (data ?? []) as SiteSetting[]
}

export async function getSetting(key: string): Promise<string | null> {
  const sb = PUBLISHABLE_KEYS.has(key) ? await createClient() : createAdminClient()
  const { data } = await sb
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle<{ value: string | null }>()
  return data?.value ?? null
}

/** Bulk-getter voor publieke pagina's: leest alle PUBLISHABLE_KEYS in één query. */
export async function getPublicSettings(): Promise<Record<string, string | null>> {
  const sb = await createClient()
  const { data } = await sb
    .from('site_settings')
    .select('key, value')
    .in('key', Array.from(PUBLISHABLE_KEYS))
  const out: Record<string, string | null> = {}
  for (const row of (data ?? []) as { key: string; value: string | null }[]) {
    out[row.key] = row.value
  }
  return out
}
