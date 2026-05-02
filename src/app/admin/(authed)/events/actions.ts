'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAlbumSlug } from '@/lib/album-slug'

export async function createAlbum(formData: FormData) {
  const supabase = await requireAdmin()

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { error: 'title_required' as const }
  const client_name = String(formData.get('client_name') ?? '').trim() || null
  const client_email = String(formData.get('client_email') ?? '').trim() || null
  const dateRaw = String(formData.get('event_date') ?? '').trim()
  const event_date = dateRaw || null

  // Slug genereren — kleine kans op botsing, retry tot 3x
  let slug = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = generateAlbumSlug()
    const { data: existing } = await supabase
      .from('event_albums')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!existing) {
      slug = candidate
      break
    }
  }
  if (!slug) return { error: 'slug_collision' as const }

  const { data, error } = await supabase
    .from('event_albums')
    .insert({ title, client_name, client_email, event_date, slug })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'insert_failed' }

  revalidatePath('/admin/events')
  redirect(`/admin/events/${data.id}`)
}

export async function updateAlbum(formData: FormData) {
  const supabase = await requireAdmin()

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'no_id' }

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { error: 'title_required' as const }
  const client_name = String(formData.get('client_name') ?? '').trim() || null
  const client_email = String(formData.get('client_email') ?? '').trim() || null
  const dateRaw = String(formData.get('event_date') ?? '').trim()
  const event_date = dateRaw || null
  const is_active = formData.get('is_active') === 'on' || formData.get('is_active') === 'true'

  await supabase
    .from('event_albums')
    .update({ title, client_name, client_email, event_date, is_active })
    .eq('id', id)

  revalidatePath('/admin/events')
  revalidatePath(`/admin/events/${id}`)
  return { ok: true }
}

export async function toggleAlbumActive(id: string, active: boolean) {
  const supabase = await requireAdmin()
  await supabase.from('event_albums').update({ is_active: active }).eq('id', id)
  revalidatePath('/admin/events')
  revalidatePath(`/admin/events/${id}`)
}

export async function deleteAlbum(id: string) {
  await requireAdmin()
  const admin = createAdminClient()

  // Eerst alle photos opruimen uit storage
  const { data: photos } = await admin
    .from('event_photos')
    .select('storage_path')
    .eq('album_id', id)

  if (photos && photos.length > 0) {
    const paths = photos.map((p) => p.storage_path)
    await admin.storage.from('events').remove(paths)
  }

  // Album row → cascade verwijdert event_photos rows
  await admin.from('event_albums').delete().eq('id', id)

  revalidatePath('/admin/events')
  redirect('/admin/events')
}

/**
 * Voeg een reeds-geüploade foto toe aan een album. Client uploadt
 * direct naar Supabase Storage (admin RLS toelating) en roept dan
 * deze action om de DB-row toe te voegen.
 */
export async function registerPhoto(input: {
  album_id: string
  storage_path: string
  filename: string
  size_bytes: number | null
}) {
  const supabase = await requireAdmin()

  // Volgende sort_order
  const { data: maxRow } = await supabase
    .from('event_photos')
    .select('sort_order')
    .eq('album_id', input.album_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextSort = (maxRow?.sort_order ?? 0) + 1

  const { error } = await supabase.from('event_photos').insert({
    album_id: input.album_id,
    storage_path: input.storage_path,
    filename: input.filename,
    size_bytes: input.size_bytes,
    sort_order: nextSort,
  })

  if (error) return { error: error.message }
  revalidatePath(`/admin/events/${input.album_id}`)
  return { ok: true }
}

export async function deletePhoto(photoId: string, albumId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: photo } = await admin
    .from('event_photos')
    .select('storage_path')
    .eq('id', photoId)
    .single()

  if (photo) {
    await admin.storage.from('events').remove([photo.storage_path])
    await admin.from('event_photos').delete().eq('id', photoId)
  }

  revalidatePath(`/admin/events/${albumId}`)
}
