import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AlbumViewer, { type ViewerPhoto } from '@/app/[locale]/album/[slug]/AlbumViewer'
import { getDictionary } from '@/i18n/dictionaries'
import { isLocale, type Locale } from '@/i18n/config'
import { getPortailLocale } from '../../locale'

export const dynamic = 'force-dynamic'

const SIGNED_URL_TTL = 60 * 60

type Props = {
  params: Promise<{ slug: string }>
}

export default async function PortailAlbumPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect(`/portail/login?next=${encodeURIComponent(`/portail/album/${slug}`)}`)
  }

  const admin = createAdminClient()
  const { data: album } = await admin
    .from('event_albums')
    .select('id, slug, title, client_name, client_email, client_locale, event_date, is_active')
    .eq('slug', slug)
    .maybeSingle()

  if (!album) notFound()

  // Taal: bij voorkeur die van het album zelf, val anders terug op de helper.
  const albumLocale: Locale = isLocale(album.client_locale) ? album.client_locale : await getPortailLocale()
  const t = getDictionary(albumLocale).portail

  // Verifieer dat ingelogde user de eigenaar is via email-match
  const userEmail = user.email.toLowerCase()
  const albumEmail = (album.client_email ?? '').toLowerCase()
  if (!albumEmail || userEmail !== albumEmail) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl text-(--color-ink) font-[family-name:var(--font-display)] mb-3">
          {t.album.forbiddenTitle}
        </h1>
        <p className="text-sm text-(--color-charcoal) mb-6">{t.album.forbiddenBody}</p>
        <Link
          href="/portail"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-(--color-bronze) hover:text-(--color-bronze-dark)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.album.backFull}
        </Link>
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
    <div>
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <Link
          href="/portail"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-(--color-stone) hover:text-(--color-ink)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.album.backToAlbums}
        </Link>
      </div>
      <AlbumViewer
        locale={albumLocale}
        title={album.title}
        clientName={album.client_name}
        eventDate={album.event_date}
        photos={photos}
      />
    </div>
  )
}
