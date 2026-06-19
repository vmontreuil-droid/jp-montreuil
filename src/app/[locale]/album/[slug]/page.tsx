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

  // Per foto 3 signed URLs:
  //  - thumb_url : verkleind (600×600, q65) via Supabase image-transform → snel raster
  //  - url       : origineel op volle resolutie → lightbox
  //  - download  : origineel met download-header
  // Parallel i.p.v. sequentieel zodat grote albums niet traag renderen.
  const photos: ViewerPhoto[] = await Promise.all(
    (photosRaw ?? []).map(async (p) => {
      const [thumb, signed, signedDl] = await Promise.all([
        admin.storage.from('events').createSignedUrl(p.storage_path, SIGNED_URL_TTL, {
          transform: { width: 600, height: 600, resize: 'cover', quality: 65 },
        }),
        admin.storage.from('events').createSignedUrl(p.storage_path, SIGNED_URL_TTL),
        admin.storage.from('events').createSignedUrl(p.storage_path, SIGNED_URL_TTL, {
          download: p.filename ?? true,
        }),
      ])
      return {
        id: p.id,
        filename: p.filename,
        thumb_url: thumb.data?.signedUrl ?? signed.data?.signedUrl ?? '',
        url: signed.data?.signedUrl ?? '',
        download_url: signedDl.data?.signedUrl ?? '',
      }
    })
  )

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
