'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type SaveSettingsResult = { ok: true; saved: number } | { ok: false; error: string }

/**
 * Bulk-save: alle wijzigingen worden in één RPC opgestuurd. We gebruiken
 * de admin-client (service-role) zodat de RLS-policy niet hoeft te
 * matchen op auth.uid() per row — auth-gating gebeurt al via de admin
 * route guard in (authed)/layout.tsx.
 */
export async function saveSiteSettings(
  changes: Record<string, string>,
): Promise<SaveSettingsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = createAdminClient()
  const rows = Object.entries(changes).map(([key, value]) => ({
    key,
    value: value.trim() || null,
    updated_by: user.id,
  }))

  if (rows.length === 0) return { ok: true, saved: 0 }

  const { error } = await admin.from('site_settings').upsert(rows, { onConflict: 'key' })
  if (error) {
    console.error('[admin/settings] save failed:', error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/settings')
  // Ook publieke pagina's revalideren (homepage, footer, etc.) zodat
  // veranderde site_title/tagline meteen zichtbaar zijn.
  revalidatePath('/', 'layout')
  return { ok: true, saved: rows.length }
}
