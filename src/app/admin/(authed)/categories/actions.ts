'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'

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
