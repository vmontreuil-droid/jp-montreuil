'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createShopAdminClient } from '@/lib/shop/supabase'

const ALL_MEDIA = ['fine_art', 'canvas', 'aluminum', 'plexi'] as const

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim()
}
function strOrNull(form: FormData, key: string): string | null {
  const v = str(form, key)
  return v === '' ? null : v
}

function getMedia(form: FormData): string[] {
  return ALL_MEDIA.filter((m) => form.get(`media_${m}`) === 'on')
}

export async function createSupplier(form: FormData): Promise<void> {
  const sb = createShopAdminClient()
  const { data, error } = await sb.from('suppliers').insert({
    name: str(form, 'name'),
    email: str(form, 'email'),
    phone: strOrNull(form, 'phone'),
    default_for_media: getMedia(form),
    notes: strOrNull(form, 'notes'),
    sort_order: Number(form.get('sort_order') ?? 0),
    is_active: form.get('is_active') === 'on',
  }).select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath('/admin/boutique/imprimeurs')
  redirect(`/admin/boutique/imprimeurs/${data.id}`)
}

export async function updateSupplier(id: string, form: FormData): Promise<void> {
  const sb = createShopAdminClient()
  const { error } = await sb.from('suppliers').update({
    name: str(form, 'name'),
    email: str(form, 'email'),
    phone: strOrNull(form, 'phone'),
    default_for_media: getMedia(form),
    notes: strOrNull(form, 'notes'),
    sort_order: Number(form.get('sort_order') ?? 0),
    is_active: form.get('is_active') === 'on',
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/boutique/imprimeurs')
  revalidatePath(`/admin/boutique/imprimeurs/${id}`)
}

export async function deleteSupplier(id: string): Promise<void> {
  const sb = createShopAdminClient()
  const { error } = await sb.from('suppliers').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/boutique/imprimeurs')
  redirect('/admin/boutique/imprimeurs')
}
