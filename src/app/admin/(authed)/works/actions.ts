'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateWork(formData: FormData) {
  const supabase = await requireAdmin()

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'no_id' }

  const title_fr = String(formData.get('title_fr') ?? '').trim() || null
  const title_nl = String(formData.get('title_nl') ?? '').trim() || null
  const technique_fr = String(formData.get('technique_fr') ?? '').trim() || null
  const technique_nl = String(formData.get('technique_nl') ?? '').trim() || null
  const dimensions = String(formData.get('dimensions') ?? '').trim() || null
  const yearRaw = String(formData.get('year') ?? '').trim()
  const year = yearRaw ? parseInt(yearRaw, 10) : null
  const sortRaw = String(formData.get('sort_order') ?? '').trim()
  const sort_order = sortRaw ? parseInt(sortRaw, 10) : 0
  const category_id = String(formData.get('category_id') ?? '') || null

  const update: Record<string, unknown> = {
    title_fr,
    title_nl,
    technique_fr,
    technique_nl,
    dimensions,
    year,
    sort_order,
  }
  if (category_id) update.category_id = category_id

  await supabase.from('works').update(update).eq('id', id)
  revalidatePath('/admin/works')
  revalidatePath('/galerie')
  return { ok: true }
}

export async function deleteWork(id: string) {
  await requireAdmin()
  const admin = createAdminClient()

  // Pak storage_path zodat we 't bestand ook kunnen wissen
  const { data: work } = await admin
    .from('works')
    .select('storage_path, category_id')
    .eq('id', id)
    .single()

  if (work) {
    await admin.storage.from('works').remove([work.storage_path])
    await admin.from('works').delete().eq('id', id)
  }

  revalidatePath('/admin/works')
  revalidatePath('/galerie')
}

export async function moveWork(id: string, direction: 'up' | 'down') {
  const supabase = await requireAdmin()
  const { data: target } = await supabase
    .from('works')
    .select('id, category_id, sort_order')
    .eq('id', id)
    .single()
  if (!target) return

  const { data: siblings } = await supabase
    .from('works')
    .select('id, sort_order')
    .eq('category_id', target.category_id)
    .order('sort_order', { ascending: true })

  if (!siblings) return
  const idx = siblings.findIndex((s) => s.id === id)
  if (idx === -1) return
  const swap = direction === 'up' ? idx - 1 : idx + 1
  if (swap < 0 || swap >= siblings.length) return

  const a = siblings[idx]
  const b = siblings[swap]
  await supabase.from('works').update({ sort_order: b.sort_order }).eq('id', a.id)
  await supabase.from('works').update({ sort_order: a.sort_order }).eq('id', b.id)

  revalidatePath('/admin/works')
  revalidatePath('/galerie')
}

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])
const MAX_SIZE = 20 * 1024 * 1024 // 20MB per foto bij upload

function safeFilename(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200)
}

export type UploadResult = {
  added: number
  errors: { filename: string; reason: string }[]
}

export async function uploadWorks(formData: FormData): Promise<UploadResult> {
  const supabase = await requireAdmin()
  const admin = createAdminClient()

  const category_id = String(formData.get('category_id') ?? '')
  if (!category_id) return { added: 0, errors: [{ filename: '-', reason: 'Geen categorie gekozen' }] }

  // Slug halen voor storage path-prefix
  const { data: cat } = await supabase
    .from('categories')
    .select('slug')
    .eq('id', category_id)
    .single()
  if (!cat) return { added: 0, errors: [{ filename: '-', reason: 'Categorie niet gevonden' }] }

  // Hoogste sort_order in deze categorie ophalen
  const { data: maxRow } = await supabase
    .from('works')
    .select('sort_order')
    .eq('category_id', category_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  let nextSort = (maxRow?.sort_order ?? 0) + 1

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
  const result: UploadResult = { added: 0, errors: [] }

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type.toLowerCase())) {
      result.errors.push({ filename: file.name, reason: 'Type niet toegestaan' })
      continue
    }
    if (file.size > MAX_SIZE) {
      result.errors.push({ filename: file.name, reason: 'Te groot (max 20MB)' })
      continue
    }
    try {
      const safe = safeFilename(file.name)
      const storagePath = `${cat.slug}/${Date.now()}_${safe}`
      const buf = Buffer.from(await file.arrayBuffer())

      const { error: upErr } = await admin.storage.from('works').upload(storagePath, buf, {
        contentType: file.type,
        upsert: false,
        cacheControl: '31536000',
      })
      if (upErr) {
        result.errors.push({ filename: file.name, reason: upErr.message })
        continue
      }

      const { error: insErr } = await admin.from('works').insert({
        category_id,
        storage_path: storagePath,
        sort_order: nextSort++,
      })
      if (insErr) {
        result.errors.push({ filename: file.name, reason: insErr.message })
        // upload was succesvol maar insert faalde — ruim bestand op
        await admin.storage.from('works').remove([storagePath])
        continue
      }
      result.added++
    } catch (err) {
      result.errors.push({ filename: file.name, reason: (err as Error).message })
    }
  }

  revalidatePath('/admin/works')
  revalidatePath('/galerie')
  return result
}
