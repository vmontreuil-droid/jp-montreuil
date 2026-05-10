'use server'

import { revalidatePath } from 'next/cache'
import { createShopAdminClient } from '@/lib/shop/supabase'

function formNumber(form: FormData, key: string): number | null {
  const raw = String(form.get(key) ?? '').trim()
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function formDate(form: FormData, key: string): string | null {
  const raw = String(form.get(key) ?? '').trim()
  if (!raw) return null
  // ISO date → ISO timestamptz
  return new Date(raw + 'T23:59:59Z').toISOString()
}

export async function createDiscount(form: FormData) {
  const code = String(form.get('code') ?? '').trim().toUpperCase()
  const kind = String(form.get('kind') ?? 'percent') as 'percent' | 'fixed_amount'
  const valueRaw = formNumber(form, 'value') ?? 0
  // value: percent → integer 1-100 ; fixed_amount → euro → cents
  const value = kind === 'percent' ? Math.round(valueRaw) : Math.round(valueRaw * 100)
  const minEur = formNumber(form, 'min_subtotal_eur') ?? 0
  const min_subtotal_cents = Math.round(minEur * 100)
  const max_uses = formNumber(form, 'max_uses')
  const expires_at = formDate(form, 'expires_at')
  const description = String(form.get('description') ?? '').trim() || null

  if (!code || value <= 0) throw new Error('Code en valeur > 0 vereist')

  const sb = createShopAdminClient()
  const { error } = await sb.from('discount_codes').insert({
    code,
    kind,
    value,
    min_subtotal_cents,
    max_uses,
    expires_at,
    description,
    is_active: true,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/boutique/discounts')
}

export async function updateDiscount(id: string, form: FormData) {
  const code = String(form.get('code') ?? '').trim().toUpperCase()
  const kind = String(form.get('kind') ?? 'percent') as 'percent' | 'fixed_amount'
  const valueRaw = formNumber(form, 'value') ?? 0
  const value = kind === 'percent' ? Math.round(valueRaw) : Math.round(valueRaw * 100)
  const minEur = formNumber(form, 'min_subtotal_eur') ?? 0
  const min_subtotal_cents = Math.round(minEur * 100)
  const max_uses = formNumber(form, 'max_uses')
  const expires_at = formDate(form, 'expires_at')
  const is_active = form.get('is_active') === 'on'

  const sb = createShopAdminClient()
  const { error } = await sb
    .from('discount_codes')
    .update({ code, kind, value, min_subtotal_cents, max_uses, expires_at, is_active })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/boutique/discounts')
}

export async function deleteDiscount(id: string) {
  const sb = createShopAdminClient()
  const { error } = await sb.from('discount_codes').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/boutique/discounts')
}
