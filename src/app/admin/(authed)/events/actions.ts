'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { render } from '@react-email/render'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAlbumSlug } from '@/lib/album-slug'
import { sendEmail } from '@/lib/email/client'
import { ShareAlbumLink } from '@/lib/email/templates/ShareAlbumLink'
import { PortalInvite } from '@/lib/email/templates/PortalInvite'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

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

/**
 * Stuur de album-link via mail naar de opdrachtgever.
 */
export async function shareAlbumByEmail(input: {
  album_id: string
  to: string
  recipient_name: string
  message: string
  locale: 'fr' | 'nl'
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  const to = input.to.trim()
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) return { ok: false, error: 'invalid_email' }

  const { data: album, error } = await admin
    .from('event_albums')
    .select('id, slug, title, is_active')
    .eq('id', input.album_id)
    .single()
  if (error || !album) return { ok: false, error: 'album_not_found' }
  if (!album.is_active) return { ok: false, error: 'album_inactive' }

  // Foto-aantal voor in de mail
  const { count: photoCount } = await admin
    .from('event_photos')
    .select('*', { count: 'exact', head: true })
    .eq('album_id', input.album_id)

  const albumUrl = `${PUBLIC_BASE_URL.replace(/\/$/, '')}${
    input.locale === 'fr' ? '' : '/nl'
  }/album/${album.slug}`

  const html = await render(
    ShareAlbumLink({
      recipientName: input.recipient_name.trim(),
      message: input.message.trim() || undefined,
      albumTitle: album.title,
      albumUrl,
      photoCount: photoCount ?? undefined,
      locale: input.locale,
    })
  )

  const subject =
    input.locale === 'fr'
      ? `Vos photos — « ${album.title} »`
      : `Uw foto's — "${album.title}"`

  const result = await sendEmail({
    to,
    subject,
    html,
    text:
      (input.message.trim() ? input.message.trim() + '\n\n' : '') +
      (input.locale === 'fr'
        ? `Voici votre album: ${albumUrl}`
        : `Hier is uw album: ${albumUrl}`),
    replyTo: process.env.RESEND_REPLY_TO || 'jp@montreuil.be',
  })

  if (!result.ok) return { ok: false, error: result.error ?? 'send_failed' }
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

/**
 * Stuur een portail-uitnodiging naar de opdrachtgever — magic-link via
 * Supabase Auth, gepackaged in onze branded Resend-mail. Klant klikt
 * en logt automatisch in op /portail.
 */
export async function inviteClientToPortal(input: {
  album_id: string
  message: string
  locale: 'fr' | 'nl'
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: album, error } = await admin
    .from('event_albums')
    .select('id, slug, title, client_name, client_email, is_active')
    .eq('id', input.album_id)
    .single()
  if (error || !album) return { ok: false, error: 'album_not_found' }
  if (!album.is_active) return { ok: false, error: 'album_inactive' }

  const email = (album.client_email ?? '').trim().toLowerCase()
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: 'invalid_email' }
  }

  // Foto-aantal voor de mail
  const { count: photoCount } = await admin
    .from('event_photos')
    .select('*', { count: 'exact', head: true })
    .eq('album_id', album.id)

  const origin = PUBLIC_BASE_URL.replace(/\/$/, '')
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/portail')}`

  // Genereer magic-link via Supabase Auth Admin API
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })
  if (linkErr || !linkData?.properties?.action_link) {
    return { ok: false, error: linkErr?.message ?? 'magiclink_failed' }
  }
  const actionUrl = linkData.properties.action_link

  // Render branded email + send via Resend
  const html = await render(
    PortalInvite({
      recipientName: album.client_name ?? undefined,
      message: input.message.trim() || undefined,
      albumTitle: album.title,
      actionUrl,
      photoCount: photoCount ?? undefined,
      locale: input.locale,
    })
  )

  const subject =
    input.locale === 'fr'
      ? `Vos photos « ${album.title} » — accès personnel`
      : `Uw foto's "${album.title}" — persoonlijke toegang`

  const result = await sendEmail({
    to: email,
    subject,
    html,
    text:
      (input.message.trim() ? input.message.trim() + '\n\n' : '') +
      (input.locale === 'fr'
        ? `Accédez à vos photos: ${actionUrl}`
        : `Bekijk uw foto's: ${actionUrl}`),
    replyTo: process.env.RESEND_REPLY_TO || 'jp@montreuil.be',
  })

  if (!result.ok) return { ok: false, error: result.error ?? 'send_failed' }
  return { ok: true }
}
