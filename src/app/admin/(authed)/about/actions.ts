'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createAboutSection(formData: FormData) {
  const supabase = await requireAdmin()

  const titleFr = String(formData.get('title_fr') ?? '').trim()
  const titleNl = String(formData.get('title_nl') ?? '').trim()
  if (!titleFr && !titleNl) return { error: 'title_required' as const }

  const { data: maxRow } = await supabase
    .from('about_sections')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextSort = (maxRow?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('about_sections')
    .insert({
      title_fr: titleFr || titleNl,
      title_nl: titleNl || titleFr,
      body_fr: '',
      body_nl: '',
      sort_order: nextSort,
    })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'insert_failed' }

  revalidatePath('/admin/about')
  revalidatePath('/[locale]/a-propos', 'page')
  redirect(`/admin/about/${data.id}`)
}

export async function updateAboutSection(formData: FormData) {
  const supabase = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'no_id' }

  const update = {
    title_fr: String(formData.get('title_fr') ?? '').trim(),
    title_nl: String(formData.get('title_nl') ?? '').trim(),
    body_fr: String(formData.get('body_fr') ?? '').trim(),
    body_nl: String(formData.get('body_nl') ?? '').trim(),
  }

  const { error } = await supabase.from('about_sections').update(update).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/about')
  revalidatePath(`/admin/about/${id}`)
  revalidatePath('/[locale]/a-propos', 'page')
  return { ok: true }
}

/** Update enkel image_path na een direct-to-storage upload (zelfde patroon
 *  als ibooks). Caller is verantwoordelijk voor de upload. */
export async function setAboutImage(input: {
  id: string
  storage_path: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('about_sections')
    .select('image_path')
    .eq('id', input.id)
    .single<{ image_path: string | null }>()

  const { error } = await admin
    .from('about_sections')
    .update({ image_path: input.storage_path })
    .eq('id', input.id)
  if (error) return { ok: false, error: error.message }

  // Oude image opruimen als 'ie alleen door deze sectie gebruikt werd.
  // Voorzichtig — image_path kan ook naar bestaand werk wijzen, dus we
  // controleren of 't pad onder de 'about/' prefix valt vóór delete.
  const oldPath = existing?.image_path
  if (oldPath && oldPath !== input.storage_path && oldPath.startsWith('about/')) {
    await admin.storage.from('works').remove([oldPath])
  }

  revalidatePath('/admin/about')
  revalidatePath(`/admin/about/${input.id}`)
  revalidatePath('/[locale]/a-propos', 'page')
  return { ok: true }
}

export async function clearAboutImage(id: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('about_sections')
    .select('image_path')
    .eq('id', id)
    .single<{ image_path: string | null }>()
  const oldPath = existing?.image_path

  await admin.from('about_sections').update({ image_path: null }).eq('id', id)

  if (oldPath && oldPath.startsWith('about/')) {
    await admin.storage.from('works').remove([oldPath])
  }

  revalidatePath('/admin/about')
  revalidatePath(`/admin/about/${id}`)
  revalidatePath('/[locale]/a-propos', 'page')
}

export async function deleteAboutSection(id: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('about_sections')
    .select('image_path')
    .eq('id', id)
    .single<{ image_path: string | null }>()

  await admin.from('about_sections').delete().eq('id', id)

  if (existing?.image_path && existing.image_path.startsWith('about/')) {
    await admin.storage.from('works').remove([existing.image_path])
  }

  revalidatePath('/admin/about')
  revalidatePath('/[locale]/a-propos', 'page')
  redirect('/admin/about')
}

export async function moveAboutSection(id: string, direction: 'up' | 'down') {
  const supabase = await requireAdmin()
  const { data: target } = await supabase
    .from('about_sections')
    .select('id, sort_order')
    .eq('id', id)
    .single()
  if (!target) return

  const { data: siblings } = await supabase
    .from('about_sections')
    .select('id, sort_order')
    .order('sort_order', { ascending: true })
  if (!siblings) return

  const idx = siblings.findIndex((s) => s.id === id)
  if (idx === -1) return
  const swap = direction === 'up' ? idx - 1 : idx + 1
  if (swap < 0 || swap >= siblings.length) return

  const a = siblings[idx]
  const b = siblings[swap]
  await supabase.from('about_sections').update({ sort_order: b.sort_order }).eq('id', a.id)
  await supabase.from('about_sections').update({ sort_order: a.sort_order }).eq('id', b.id)

  revalidatePath('/admin/about')
  revalidatePath('/[locale]/a-propos', 'page')
}
