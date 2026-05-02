import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { createAdminClient } from '@/lib/supabase/admin'
import AlbumViewer, { type ViewerPhoto } from './AlbumViewer'

export const dynamic = 'force-dynamic'

const SIGNED_URL_TTL = 60 * 60 // 1u

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export default async function AlbumViewerPage({ params }: Props) {
  const { locale: localeRaw, slug } = await params
  const locale: Locale = isLocale(localeRaw) ? localeRaw : 'fr'

  // Service role: omzeilt RLS — we doen zelf de active-check zodat we
  // een nette "indisponible" pagina kunnen tonen wanneer JP het link
  // gedeactiveerd heeft.
  const admin = createAdminClient()
  const { data: album } = await admin
    .from('event_albums')
    .select('id, slug, title, client_name, event_date, is_active')
    .eq('slug', slug)
    .maybeSingle()

  if (!album) notFound()

  if (!album.is_active) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-10 text-center">
        <h1 className="text-3xl font-[family-name:var(--font-display)] text-(--color-ink) mb-3">
          {locale === 'fr' ? 'Album indisponible' : 'Album niet beschikbaar'}
        </h1>
        <p className="text-(--color-stone) max-w-md">
          {locale === 'fr'
            ? 'Ce lien a été désactivé. Contactez Jean-Pierre Montreuil pour plus d’informations.'
            : 'Deze link is gedeactiveerd. Neem contact op met Jean-Pierre Montreuil voor meer informatie.'}
        </p>
      </main>
    )
  }

  const { data: photosRaw } = await admin
    .from('event_photos')
    .select('id, storage_path, filename, sort_order')
    .eq('album_id', album.id)
    .order('sort_order', { ascending: true })

  const photos: ViewerPhoto[] = []
  for (const p of photosRaw ?? []) {
    const { data: signed } = await admin.storage
      .from('events')
      .createSignedUrl(p.storage_path, SIGNED_URL_TTL)
    const { data: signedDl } = await admin.storage
      .from('events')
      .createSignedUrl(p.storage_path, SIGNED_URL_TTL, {
        download: p.filename ?? true,
      })
    photos.push({
      id: p.id,
      filename: p.filename,
      url: signed?.signedUrl ?? '',
      download_url: signedDl?.signedUrl ?? '',
    })
  }

  return (
    <AlbumViewer
      locale={locale}
      title={album.title}
      clientName={album.client_name}
      eventDate={album.event_date}
      photos={photos}
    />
  )
}
