import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { createAdminClient } from '@/lib/supabase/admin'
import AlbumViewer, { type ViewerPhoto } from './AlbumViewer'

export const dynamic = 'force-dynamic'

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

  // Geen signing in de pagina (zou bij 200+ foto's honderden calls geven en de
  // render blokkeren). We renderen stabiele URLs naar de image-route, die per
  // foto lazy signt + de thumb edge-cachet.
  const photos: ViewerPhoto[] = (photosRaw ?? []).map((p) => ({
    id: p.id,
    filename: p.filename,
    thumb_url: `/api/album-photo/${p.id}?v=thumb`,
    url: `/api/album-photo/${p.id}?v=full`,
    download_url: `/api/album-photo/${p.id}?dl=1`,
  }))

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
