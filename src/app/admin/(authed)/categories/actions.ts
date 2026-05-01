'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function createCategory(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await requireAdmin()

  const label_fr = String(formData.get('label_fr') ?? '').trim()
  const label_nl = String(formData.get('label_nl') ?? '').trim()
  let slug = String(formData.get('slug') ?? '').trim()

  if (!label_fr || !label_nl) {
    return { ok: false, error: 'Label FR + NL verplicht' }
  }
  if (!slug) slug = slugify(label_fr)
  if (!slug) return { ok: false, error: 'Slug ongeldig' }

  // Hoogste sort_order ophalen
  const { data: maxRow } = await supabase
    .from('categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const sort_order = (maxRow?.sort_order ?? 0) + 1

  const { error } = await supabase.from('categories').insert({
    slug,
    label_fr,
    label_nl,
    sort_order,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/categories')
  revalidatePath('/admin/works')
  revalidatePath('/galerie')
  return { ok: true }
}

export async function deleteCategory(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  // Check welke werken bestaan + hun storage_paths
  const { data: works } = await admin
    .from('works')
    .select('id, storage_path')
    .eq('category_id', id)

  if (works && works.length > 0) {
    // Verwijder eerst de foto's uit storage
    const paths = works.map((w) => w.storage_path)
    await admin.storage.from('works').remove(paths)
  }

  // DB cascade verwijdert de works-rijen automatisch (FK on delete cascade)
  const { error } = await admin.from('categories').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/categories')
  revalidatePath('/admin/works')
  revalidatePath('/galerie')
  return { ok: true }
}

export async function updateCategory(formData: FormData) {
  const supabase = await requireAdmin()

  const id = String(formData.get('id') ?? '')
  const label_fr = String(formData.get('label_fr') ?? '').trim()
  const label_nl = String(formData.get('label_nl') ?? '').trim()
  const description_fr = String(formData.get('description_fr') ?? '').trim() || null
  const description_nl = String(formData.get('description_nl') ?? '').trim() || null
  const cover_work_id = String(formData.get('cover_work_id') ?? '') || null

  if (!id || !label_fr || !label_nl) {
    return
  }

  await supabase
    .from('categories')
    .update({ label_fr, label_nl, description_fr, description_nl, cover_work_id })
    .eq('id', id)

  revalidatePath('/admin/categories')
  revalidatePath('/admin')
  revalidatePath('/galerie')
}

export async function moveCategory(id: string, direction: 'up' | 'down') {
  const supabase = await requireAdmin()

  const { data: cats } = await supabase
    .from('categories')
    .select('id, sort_order')
    .order('sort_order', { ascending: true })

  if (!cats) return
  const idx = cats.findIndex((c) => c.id === id)
  if (idx === -1) return
  const swap = direction === 'up' ? idx - 1 : idx + 1
  if (swap < 0 || swap >= cats.length) return

  const a = cats[idx]
  const b = cats[swap]
  await supabase.from('categories').update({ sort_order: b.sort_order }).eq('id', a.id)
  await supabase.from('categories').update({ sort_order: a.sort_order }).eq('id', b.id)

  revalidatePath('/admin/categories')
  revalidatePath('/galerie')
}
