'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { slugify, getShopPhotoById, SHOP_PHOTOS_BUCKET, shopPhotoUrl } from '@/lib/shop/photos'
import { generateAltText } from '@/lib/ai-alt'
import { importWorksAsShopPhotos, type ImportWorksReport } from '@/lib/shop/import-works'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
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

/**
 * Featured-toggle (uit shop.photos.is_featured) — gebruikt door
 * /admin/boutique/photos/[id] om een foto in de "Coups de cœur"-strip
 * op de boutique-landing te laten verschijnen.
 */
export async function toggleFeaturedShopPhoto(id: string, next: boolean): Promise<void> {
  await requireAdmin()
  const sb = createShopAdminClient()
  const { error } = await sb
    .from('photos')
    .update({ is_featured: next })
    .eq('id', id)
  if (error) throw error
  revalidatePath('/admin/boutique/photos')
  revalidatePath(`/admin/boutique/photos/${id}`)
  revalidatePath('/shop/boutique')
}

/**
 * Genereer AI alt-text voor een foto via Claude Vision. Bewaart het
 * resultaat in shop.photos.alt_text + ai_alt_generated_at zodat we
 * achteraf kunnen filteren "welke foto's hebben nog geen AI-alt".
 */
export async function generateShopPhotoAltText(id: string): Promise<{ ok: true; alt: string } | { ok: false; error: string }> {
  await requireAdmin()
  const sb = createShopAdminClient()
  const photo = await getShopPhotoById(id)
  if (!photo) return { ok: false, error: 'Photo introuvable' }

  try {
    const url = shopPhotoUrl(photo.storage_path)
    const alt = await generateAltText(url, {
      species: photo.species,
      location: photo.taken_at_location,
    })
    const { error } = await sb
      .from('photos')
      .update({ alt_text: alt, ai_alt_generated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/admin/boutique/photos/${id}`)
    return { ok: true, alt }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur Claude' }
  }
}

export type BulkActionResult = { ok: true; affected: number } | { ok: false; error: string }

/**
 * Bulk-actie voor 1 of meer foto's. Veiliger dan client-side N requests
 * te doen — single round-trip + 1 revalidate. Gebruikt door PhotosBulkBar
 * in de admin lijst.
 */
export async function bulkPhotoAction(
  ids: string[],
  action: 'publish' | 'unpublish' | 'feature' | 'unfeature' | 'delete',
): Promise<BulkActionResult> {
  await requireAdmin()
  if (!ids.length) return { ok: true, affected: 0 }
  const sb = createShopAdminClient()

  if (action === 'delete') {
    // Eerst storage_paths ophalen om Storage te kunnen opruimen
    const { data: rows } = await sb.from('photos').select('storage_path').in('id', ids)
    const paths = (rows ?? []).map((r: { storage_path: string }) => r.storage_path)
    const { error } = await sb.from('photos').delete().in('id', ids)
    if (error) return { ok: false, error: error.message }
    if (paths.length) {
      await sb.storage.from(SHOP_PHOTOS_BUCKET).remove(paths).catch(() => {})
    }
    revalidatePath('/admin/boutique/photos')
    revalidatePath('/shop/boutique')
    return { ok: true, affected: ids.length }
  }

  const patch: Record<string, boolean> = {}
  if (action === 'publish') patch.is_published = true
  if (action === 'unpublish') patch.is_published = false
  if (action === 'feature') patch.is_featured = true
  if (action === 'unfeature') patch.is_featured = false

  const { error } = await sb.from('photos').update(patch).in('id', ids)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/boutique/photos')
  revalidatePath('/shop/boutique')
  return { ok: true, affected: ids.length }
}

export type BulkUploadFileInput = {
  file: File
  slug: string
  title: string
  description: string | null
  taken_at: string | null
  taken_at_location: string | null
  species: string | null
  width: number | null
  height: number | null
  is_published: boolean
}

export type BulkUploadFileResult =
  | { ok: true; slug: string }
  | { ok: false; slug: string; error: string }

/**
 * Eén foto uploaden — wordt sequentieel aangeroepen vanuit
 * BulkUploadClient. Slaat fout in plaats van te throwen zodat de
 * client per file feedback krijgt zonder de hele batch te onderbreken.
 */
export async function uploadShopPhotoOne(form: FormData): Promise<BulkUploadFileResult> {
  await requireAdmin()
  const sb = createShopAdminClient()

  const file = form.get('file')
  const slugInput = String(form.get('slug') ?? '').trim()
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, slug: slugInput, error: 'Aucun fichier' }
  }
  if (!file.type.startsWith('image/')) {
    return { ok: false, slug: slugInput, error: `Pas une image (${file.type})` }
  }

  const baseSlug = slugInput ? slugify(slugInput) : slugify(file.name.replace(/\.[^.]+$/, ''))
  if (!baseSlug) return { ok: false, slug: slugInput, error: 'Slug introuvable' }

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const storage_path = `${baseSlug}.${ext}`

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await sb.storage
      .from(SHOP_PHOTOS_BUCKET)
      .upload(storage_path, buffer, { contentType: file.type, upsert: false })
    if (upErr) {
      const msg = upErr.message.includes('already exists')
        ? `Le chemin ${storage_path} existe déjà`
        : upErr.message
      return { ok: false, slug: baseSlug, error: msg }
    }

    const { error: insErr } = await sb.from('photos').insert({
      slug: baseSlug,
      title: strOrNull(form, 'title'),
      description: strOrNull(form, 'description'),
      storage_path,
      taken_at: strOrNull(form, 'taken_at'),
      taken_at_location: strOrNull(form, 'taken_at_location'),
      species: strOrNull(form, 'species'),
      width: intOr(form, 'width', 0) || null,
      height: intOr(form, 'height', 0) || null,
      is_published: bool(form, 'is_published'),
      sort_order: 0,
    })
    if (insErr) {
      await sb.storage.from(SHOP_PHOTOS_BUCKET).remove([storage_path])
      const msg = insErr.code === '23505' ? `Slug "${baseSlug}" existe déjà` : insErr.message
      return { ok: false, slug: baseSlug, error: msg }
    }

    return { ok: true, slug: baseSlug }
  } catch (e) {
    return { ok: false, slug: baseSlug, error: e instanceof Error ? e.message : 'Erreur upload' }
  }
}

/**
 * Importeer alle public.works als shop.photos. Categorie 'bronze'
 * uitgesloten. Idempotent: enkel nieuwe werken worden toegevoegd.
 * Wordt aangeroepen door de "Importer œuvres" knop.
 */
export async function importWorksAction(): Promise<ImportWorksReport> {
  await requireAdmin()
  const report = await importWorksAsShopPhotos()
  revalidatePath('/admin/boutique/photos')
  revalidatePath('/shop/boutique')
  return report
}
