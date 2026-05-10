'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { slugify, getShopPhotoById, SHOP_PHOTOS_BUCKET } from '@/lib/shop/photos'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet geauthenticeerd')
}

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim()
}
function strOrNull(form: FormData, key: string): string | null {
  const v = str(form, key)
  return v === '' ? null : v
}
function bool(form: FormData, key: string): boolean {
  return form.get(key) === 'on' || form.get(key) === 'true'
}
function intOr(form: FormData, key: string, fallback: number): number {
  const raw = str(form, key)
  if (raw === '') return fallback
  const n = Number(raw)
  return Number.isInteger(n) ? n : fallback
}

/**
 * Upload één foto naar `shop-photos` bucket en maak DB-record in
 * shop.photos. Slug uit bestandsnaam of expliciet ingevulde slug.
 */
export async function uploadShopPhoto(form: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Aucun fichier sélectionné')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error(`Le fichier n'est pas une image (${file.type})`)
  }

  const explicitSlug = str(form, 'slug')
  const baseSlug = explicitSlug !== ''
    ? slugify(explicitSlug)
    : slugify(file.name.replace(/\.[^.]+$/, ''))
  if (!baseSlug) throw new Error('Slug introuvable')

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const storage_path = `${baseSlug}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await sb.storage
    .from(SHOP_PHOTOS_BUCKET)
    .upload(storage_path, buffer, { contentType: file.type, upsert: false })
  if (upErr) {
    if (upErr.message.includes('already exists')) {
      throw new Error(`Le chemin ${storage_path} existe déjà — choisissez un autre slug`)
    }
    throw upErr
  }

  const width = intOr(form, 'width', 0) || null
  const height = intOr(form, 'height', 0) || null

  const { error: insErr } = await sb.from('photos').insert({
    slug: baseSlug,
    title: strOrNull(form, 'title'),
    description: strOrNull(form, 'description'),
    storage_path,
    taken_at: strOrNull(form, 'taken_at'),
    taken_at_location: strOrNull(form, 'taken_at_location'),
    species: strOrNull(form, 'species'),
    width, height,
    is_published: bool(form, 'is_published'),
    sort_order: intOr(form, 'sort_order', 0),
  })
  if (insErr) {
    await sb.storage.from(SHOP_PHOTOS_BUCKET).remove([storage_path])
    if (insErr.code === '23505') {
      throw new Error(`Le slug "${baseSlug}" existe déjà`)
    }
    throw insErr
  }

  revalidatePath('/admin/boutique/photos')
}

export async function updateShopPhoto(id: string, form: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb.from('photos').update({
    title: strOrNull(form, 'title'),
    description: strOrNull(form, 'description'),
    alt_text: strOrNull(form, 'alt_text'),
    taken_at: strOrNull(form, 'taken_at'),
    taken_at_location: strOrNull(form, 'taken_at_location'),
    species: strOrNull(form, 'species'),
    is_published: bool(form, 'is_published'),
    sort_order: intOr(form, 'sort_order', 0),
  }).eq('id', id)
  if (error) throw error

  revalidatePath('/admin/boutique/photos')
  revalidatePath(`/admin/boutique/photos/${id}`)
}

export async function togglePublishedShopPhoto(id: string, next: boolean) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb.from('photos').update({ is_published: next }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/boutique/photos')
  revalidatePath(`/admin/boutique/photos/${id}`)
}

export async function deleteShopPhoto(id: string) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const photo = await getShopPhotoById(id)
  if (!photo) throw new Error('Photo introuvable')

  const { error: delErr } = await sb.from('photos').delete().eq('id', id)
  if (delErr) throw delErr

  await sb.storage.from(SHOP_PHOTOS_BUCKET).remove([photo.storage_path]).catch(() => {})
  revalidatePath('/admin/boutique/photos')
  redirect('/admin/boutique/photos')
}
