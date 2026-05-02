'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const ALLOWED_PDF = new Set(['application/pdf'])
const MAX_IMAGE = 10 * 1024 * 1024 // 10MB
const MAX_PDF = 50 * 1024 * 1024 // 50MB

type Slot = 'cover' | 'qr' | 'pdf'

export async function uploadIbookFile(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const admin = createAdminClient()

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

  // Timestamped path = automatische cache-bust + makkelijke rollback
  const storagePath = `${slot}-${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage.from('ibook').upload(storagePath, buf, {
    contentType: file.type,
    upsert: false,
    cacheControl: '31536000',
  })
  if (upErr) return { ok: false, error: upErr.message }

  // Oude path opruimen
  const key = slot === 'pdf' ? 'ibook_pdf_path' : `ibook_${slot}_path`
  const { data: existing } = await admin
    .from('site_texts')
    .select('value_fr')
    .eq('key', key)
    .maybeSingle()
  const oldPath = existing?.value_fr?.trim()

  // Update site_texts (zelfde value voor FR + NL — pad is taal-onafhankelijk)
  await admin
    .from('site_texts')
    .upsert(
      { key, value_fr: storagePath, value_nl: storagePath },
      { onConflict: 'key' }
    )

  // Oude file verwijderen ná update zodat we niet zonder bestand zitten
  // bij een tussenliggende fout
  if (oldPath && oldPath !== storagePath) {
    await admin.storage.from('ibook').remove([oldPath])
  }

  revalidatePath('/admin/ibook')
  revalidatePath('/[locale]/a-propos', 'page')
  revalidatePath('/[locale]/contact', 'page')
  return { ok: true }
}

export async function clearIbookFile(slot: Slot) {
  await requireAdmin()
  const admin = createAdminClient()

  const key = slot === 'pdf' ? 'ibook_pdf_path' : `ibook_${slot}_path`
  const { data: existing } = await admin
    .from('site_texts')
    .select('value_fr')
    .eq('key', key)
    .maybeSingle()
  const oldPath = existing?.value_fr?.trim()

  await admin
    .from('site_texts')
    .upsert({ key, value_fr: '', value_nl: '' }, { onConflict: 'key' })

  if (oldPath) {
    await admin.storage.from('ibook').remove([oldPath])
  }

  revalidatePath('/admin/ibook')
  revalidatePath('/[locale]/a-propos', 'page')
  revalidatePath('/[locale]/contact', 'page')
}

export async function updateIbookText(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await requireAdmin()

  const titleFr = String(formData.get('title_fr') ?? '').trim()
  const titleNl = String(formData.get('title_nl') ?? '').trim()
  const descFr = String(formData.get('description_fr') ?? '').trim()
  const descNl = String(formData.get('description_nl') ?? '').trim()

  const { error } = await supabase
    .from('site_texts')
    .upsert(
      [
        { key: 'ibook_title', value_fr: titleFr, value_nl: titleNl },
        { key: 'ibook_description', value_fr: descFr, value_nl: descNl },
      ],
      { onConflict: 'key' }
    )

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/ibook')
  revalidatePath('/[locale]/a-propos', 'page')
  return { ok: true }
}
