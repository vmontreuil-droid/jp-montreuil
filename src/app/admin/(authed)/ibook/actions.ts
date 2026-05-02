'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const ALLOWED_PDF = new Set(['application/pdf'])
const MAX_IMAGE = 10 * 1024 * 1024
const MAX_PDF = 50 * 1024 * 1024

type Slot = 'cover' | 'qr' | 'pdf'

// ============================================================================
// CRUD ibooks
// ============================================================================

export async function createIbook(formData: FormData) {
  const supabase = await requireAdmin()

  const titleFr = String(formData.get('title_fr') ?? '').trim()
  const titleNl = String(formData.get('title_nl') ?? '').trim()
  if (!titleFr && !titleNl) return { error: 'title_required' as const }

  // Highest existing sort_order + 1
  const { data: maxRow } = await supabase
    .from('ibooks')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextSort = (maxRow?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('ibooks')
    .insert({
      title_fr: titleFr || titleNl,
      title_nl: titleNl || titleFr,
      sort_order: nextSort,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'insert_failed' }

  revalidatePath('/admin/ibook')
  redirect(`/admin/ibook/${data.id}`)
}

export async function updateIbook(formData: FormData) {
  const supabase = await requireAdmin()

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'no_id' }

  const update = {
    title_fr: String(formData.get('title_fr') ?? '').trim(),
    title_nl: String(formData.get('title_nl') ?? '').trim(),
    description_fr: String(formData.get('description_fr') ?? '').trim(),
    description_nl: String(formData.get('description_nl') ?? '').trim(),
    is_active: formData.get('is_active') === 'true' || formData.get('is_active') === 'on',
  }

  const { error } = await supabase.from('ibooks').update(update).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/ibook')
  revalidatePath(`/admin/ibook/${id}`)
  revalidatePath('/[locale]/a-propos', 'page')
  revalidatePath('/[locale]/contact', 'page')
  return { ok: true }
}

export async function toggleIbookActive(id: string, active: boolean) {
  const supabase = await requireAdmin()
  await supabase.from('ibooks').update({ is_active: active }).eq('id', id)
  revalidatePath('/admin/ibook')
  revalidatePath(`/admin/ibook/${id}`)
  revalidatePath('/[locale]/a-propos', 'page')
  revalidatePath('/[locale]/contact', 'page')
}

export async function moveIbook(id: string, direction: 'up' | 'down') {
  const supabase = await requireAdmin()
  const { data: target } = await supabase
    .from('ibooks')
    .select('id, sort_order')
    .eq('id', id)
    .single()
  if (!target) return

  const { data: siblings } = await supabase
    .from('ibooks')
    .select('id, sort_order')
    .order('sort_order', { ascending: true })
  if (!siblings) return

  const idx = siblings.findIndex((s) => s.id === id)
  if (idx === -1) return
  const swap = direction === 'up' ? idx - 1 : idx + 1
  if (swap < 0 || swap >= siblings.length) return

  const a = siblings[idx]
  const b = siblings[swap]
  await supabase.from('ibooks').update({ sort_order: b.sort_order }).eq('id', a.id)
  await supabase.from('ibooks').update({ sort_order: a.sort_order }).eq('id', b.id)

  revalidatePath('/admin/ibook')
  revalidatePath('/[locale]/a-propos', 'page')
}

export async function deleteIbook(id: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: book } = await admin
    .from('ibooks')
    .select('cover_path, qr_path, pdf_path')
    .eq('id', id)
    .single()

  const paths = [book?.cover_path, book?.qr_path, book?.pdf_path].filter(
    (p): p is string => !!p
  )
  if (paths.length > 0) {
    await admin.storage.from('ibook').remove(paths)
  }

  await admin.from('ibooks').delete().eq('id', id)

  revalidatePath('/admin/ibook')
  revalidatePath('/[locale]/a-propos', 'page')
  revalidatePath('/[locale]/contact', 'page')
  redirect('/admin/ibook')
}

// ============================================================================
// File slot upload / clear
// ============================================================================

export async function uploadIbookFile(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  const ibookId = String(formData.get('ibook_id') ?? '')
  if (!ibookId) return { ok: false, error: 'no_ibook' }

  const slot = String(formData.get('slot') ?? '') as Slot
  if (!['cover', 'qr', 'pdf'].includes(slot)) return { ok: false, error: 'invalid_slot' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'no_file' }

  let allowed: Set<string>
  let maxSize: number
  let ext: string
  if (slot === 'pdf') {
    allowed = ALLOWED_PDF
    maxSize = MAX_PDF
    ext = 'pdf'
  } else {
    allowed = ALLOWED_IMAGE
    maxSize = MAX_IMAGE
    const t = file.type.toLowerCase()
    ext = t.includes('png') ? 'png' : t.includes('webp') ? 'webp' : 'jpg'
  }

  if (!allowed.has(file.type.toLowerCase())) return { ok: false, error: 'type_not_allowed' }
  if (file.size > maxSize) return { ok: false, error: 'too_large' }

  // Per-ibook subfolder + timestamp voor cache-bust
  const storagePath = `${ibookId}/${slot}-${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage.from('ibook').upload(storagePath, buf, {
    contentType: file.type,
    upsert: false,
    cacheControl: '31536000',
  })
  if (upErr) return { ok: false, error: upErr.message }

  // Oude path opruimen
  const column = slot === 'pdf' ? 'pdf_path' : `${slot}_path`
  const { data: existing } = await admin
    .from('ibooks')
    .select(column)
    .eq('id', ibookId)
    .single<Record<string, string | null>>()
  const oldPath = existing?.[column]

  await admin
    .from('ibooks')
    .update({ [column]: storagePath })
    .eq('id', ibookId)

  if (oldPath && oldPath !== storagePath) {
    await admin.storage.from('ibook').remove([oldPath])
  }

  revalidatePath(`/admin/ibook/${ibookId}`)
  revalidatePath('/admin/ibook')
  revalidatePath('/[locale]/a-propos', 'page')
  revalidatePath('/[locale]/contact', 'page')
  return { ok: true }
}

/**
 * Update DB-row na een client-side direct upload naar Supabase Storage.
 * Gebruikt om server-action body-limieten en Vercel-platform-limieten
 * volledig te omzeilen. Caller is verantwoordelijk voor de upload zelf.
 */
export async function setIbookFile(input: {
  ibook_id: string
  slot: Slot
  storage_path: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  if (!['cover', 'qr', 'pdf'].includes(input.slot)) return { ok: false, error: 'invalid_slot' }
  if (!input.storage_path) return { ok: false, error: 'no_path' }

  const column = input.slot === 'pdf' ? 'pdf_path' : `${input.slot}_path`

  const { data: existing } = await admin
    .from('ibooks')
    .select(column)
    .eq('id', input.ibook_id)
    .single<Record<string, string | null>>()
  const oldPath = existing?.[column]

  const { error } = await admin
    .from('ibooks')
    .update({ [column]: input.storage_path })
    .eq('id', input.ibook_id)
  if (error) return { ok: false, error: error.message }

  if (oldPath && oldPath !== input.storage_path) {
    await admin.storage.from('ibook').remove([oldPath])
  }

  revalidatePath(`/admin/ibook/${input.ibook_id}`)
  revalidatePath('/admin/ibook')
  revalidatePath('/[locale]/a-propos', 'page')
  revalidatePath('/[locale]/contact', 'page')
  revalidatePath('/[locale]/social', 'page')
  return { ok: true }
}

export async function clearIbookFile(ibookId: string, slot: Slot) {
  await requireAdmin()
  const admin = createAdminClient()

  const column = slot === 'pdf' ? 'pdf_path' : `${slot}_path`
  const { data: existing } = await admin
    .from('ibooks')
    .select(column)
    .eq('id', ibookId)
    .single<Record<string, string | null>>()
  const oldPath = existing?.[column]

  await admin
    .from('ibooks')
    .update({ [column]: null })
    .eq('id', ibookId)

  if (oldPath) {
    await admin.storage.from('ibook').remove([oldPath])
  }

  revalidatePath(`/admin/ibook/${ibookId}`)
  revalidatePath('/admin/ibook')
  revalidatePath('/[locale]/a-propos', 'page')
  revalidatePath('/[locale]/contact', 'page')
}
