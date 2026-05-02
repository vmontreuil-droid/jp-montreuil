'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createExhibition(formData: FormData) {
  const supabase = await requireAdmin()

  const titleFr = String(formData.get('title_fr') ?? '').trim()
  const titleNl = String(formData.get('title_nl') ?? '').trim()
  const dateFrom = String(formData.get('date_from') ?? '').trim()

  if (!titleFr && !titleNl) return { error: 'title_required' as const }
  if (!dateFrom) return { error: 'date_required' as const }

  const { data, error } = await supabase
    .from('exhibitions')
    .insert({
      title_fr: titleFr || titleNl,
      title_nl: titleNl || titleFr,
      date_from: dateFrom,
      location: String(formData.get('location') ?? '').trim() || null,
    })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'insert_failed' }

  revalidatePath('/admin/exhibitions')
  revalidatePath('/[locale]/expositions', 'page')
  redirect(`/admin/exhibitions/${data.id}`)
}

export async function updateExhibition(formData: FormData) {
  const supabase = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'no_id' }

  const titleFr = String(formData.get('title_fr') ?? '').trim()
  const titleNl = String(formData.get('title_nl') ?? '').trim()
  if (!titleFr && !titleNl) return { error: 'title_required' as const }

  const dateFrom = String(formData.get('date_from') ?? '').trim()
  if (!dateFrom) return { error: 'date_required' as const }

  const dateToRaw = String(formData.get('date_to') ?? '').trim()
  const externalUrlRaw = String(formData.get('external_url') ?? '').trim()

  const update = {
    title_fr: titleFr || titleNl,
    title_nl: titleNl || titleFr,
    description_fr: String(formData.get('description_fr') ?? '').trim(),
    description_nl: String(formData.get('description_nl') ?? '').trim(),
    location: String(formData.get('location') ?? '').trim() || null,
    date_from: dateFrom,
    date_to: dateToRaw || null,
    external_url: externalUrlRaw || null,
    is_active: formData.get('is_active') === 'true' || formData.get('is_active') === 'on',
  }

  const { error } = await supabase.from('exhibitions').update(update).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/exhibitions')
  revalidatePath(`/admin/exhibitions/${id}`)
  revalidatePath('/[locale]/expositions', 'page')
  revalidatePath('/[locale]', 'page')
  return { ok: true }
}

export async function toggleExhibitionActive(id: string, active: boolean) {
  const supabase = await requireAdmin()
  await supabase.from('exhibitions').update({ is_active: active }).eq('id', id)
  revalidatePath('/admin/exhibitions')
  revalidatePath(`/admin/exhibitions/${id}`)
  revalidatePath('/[locale]/expositions', 'page')
  revalidatePath('/[locale]', 'page')
}

export async function setExhibitionImage(input: {
  id: string
  storage_path: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('exhibitions')
    .select('image_path')
    .eq('id', input.id)
    .single<{ image_path: string | null }>()

  const { error } = await admin
    .from('exhibitions')
    .update({ image_path: input.storage_path })
    .eq('id', input.id)
  if (error) return { ok: false, error: error.message }

  // Oude image opruimen — alleen verwijderen als 't onder onze prefix valt
  const oldPath = existing?.image_path
  if (oldPath && oldPath !== input.storage_path && oldPath.startsWith('exhibitions/')) {
    await admin.storage.from('works').remove([oldPath])
  }

  revalidatePath('/admin/exhibitions')
  revalidatePath(`/admin/exhibitions/${input.id}`)
  revalidatePath('/[locale]/expositions', 'page')
  return { ok: true }
}

export async function clearExhibitionImage(id: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('exhibitions')
    .select('image_path')
    .eq('id', id)
    .single<{ image_path: string | null }>()
  const oldPath = existing?.image_path

  await admin.from('exhibitions').update({ image_path: null }).eq('id', id)

  if (oldPath && oldPath.startsWith('exhibitions/')) {
    await admin.storage.from('works').remove([oldPath])
  }

  revalidatePath('/admin/exhibitions')
  revalidatePath(`/admin/exhibitions/${id}`)
  revalidatePath('/[locale]/expositions', 'page')
}

export async function deleteExhibition(id: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('exhibitions')
    .select('image_path')
    .eq('id', id)
    .single<{ image_path: string | null }>()

  await admin.from('exhibitions').delete().eq('id', id)

  if (existing?.image_path && existing.image_path.startsWith('exhibitions/')) {
    await admin.storage.from('works').remove([existing.image_path])
  }

  revalidatePath('/admin/exhibitions')
  revalidatePath('/[locale]/expositions', 'page')
  redirect('/admin/exhibitions')
}
