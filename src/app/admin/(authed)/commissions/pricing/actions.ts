'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type PricingState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

const NUMERIC_FIELDS = [
  'format_40x60',
  'format_57x77',
  'format_60x90',
  'format_130x160',
  'frame_simple',
  'frame_standard',
  'frame_travaille',
  'supplement_background',
  'supplement_complex_decor',
  'supplement_high_detail',
  'supplement_hyperrealism',
  'supplement_rush',
  'extra_portrait',
] as const

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/admin/login')
  return user
}

function parsePrice(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null
  const s = String(raw).trim().replace(',', '.')
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

export async function savePricing(
  _prev: PricingState,
  formData: FormData
): Promise<PricingState> {
  const user = await requireAdmin()
  const admin = createAdminClient()

  const update: Record<string, number | null> = {}

  for (const field of NUMERIC_FIELDS) {
    const value = parsePrice(formData.get(field))
    if (value == null) {
      return {
        status: 'error',
        message: `Valeur invalide pour ${field}.`,
      }
    }
    update[field] = value
  }

  // sur_mesure mag leeg blijven (= "sur devis")
  const surMesureRaw = formData.get('frame_sur_mesure')
  if (surMesureRaw != null && String(surMesureRaw).trim()) {
    const v = parsePrice(surMesureRaw)
    if (v == null) {
      return { status: 'error', message: 'Valeur invalide pour cadre sur mesure.' }
    }
    update.frame_sur_mesure = v
  } else {
    update.frame_sur_mesure = null
  }

  const { error } = await admin
    .from('commission_pricing')
    .update({ ...update, updated_by: user.id })
    .eq('id', 1)

  if (error) {
    console.error('savePricing failed', error)
    return { status: 'error', message: error.message }
  }

  revalidatePath('/admin/commissions/pricing')
  revalidatePath('/[locale]/devis', 'page')
  return { status: 'success' }
}
