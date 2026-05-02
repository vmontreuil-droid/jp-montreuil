import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Camera, ArrowRight, Calendar, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDictionary } from '@/i18n/dictionaries'
import { getPortailLocale } from './locale'

export const dynamic = 'force-dynamic'

const SIGNED_URL_TTL = 60 * 60

type AlbumRow = {
  id: string
  slug: string
  title: string
  client_name: string | null
  event_date: string | null
  is_active: boolean
  created_at: string
  cover_storage: string | null
  photos_count: number
}

export default async function PortailDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/portail/login')
  }

  const locale = await getPortailLocale()
  const t = getDictionary(locale).portail
  const dateLocale = locale === 'fr' ? 'fr-BE' : 'nl-BE'

  // Service-role om client-data op te halen — RLS bypass nodig omdat
  // we matchen op email-veld dat anders niet door RLS gefilterd wordt.
  const admin = createAdminClient()
  const { data: albumsRaw } = await admin
    .from('event_albums')
    .select(
      `id, slug, title, client_name, event_date, is_active, created_at,
       photos:event_photos(id, storage_path, sort_order)`
    )
    .ilike('client_email', user.email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const albums: AlbumRow[] = (albumsRaw ?? []).map((a) => {
    const photos = (a.photos ?? []) as { id: string; storage_path: string; sort_order: number }[]
    photos.sort((x, y) => x.sort_order - y.sort_order)
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      client_name: a.client_name,
      event_date: a.event_date,
      is_active: a.is_active,
      created_at: a.created_at,
      cover_storage: photos[0]?.storage_path ?? null,
      photos_count: photos.length,
    }
  })

  // Cover signed URLs (one per album)
  const coverUrls = new Map<string, string>()
  for (const a of albums) {
    if (!a.cover_storage) continue
    const { data: signed } = await admin.storage
      .from('events')
      .createSignedUrl(a.cover_storage, SIGNED_URL_TTL)
    if (signed?.signedUrl) coverUrls.set(a.id, signed.signedUrl)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {t.dashboard.eyebrow}
        </p>
        <h1 className="text-3xl md:text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          {t.dashboard.welcome}
        </h1>
        <p className="mt-2 text-sm text-(--color-charcoal)">{t.dashboard.lead}</p>
      </header>

      {albums.length === 0 ? (
        <div className="bg-(--color-paper) border border-(--color-frame) p-10 text-center">
          <Camera className="w-10 h-10 mx-auto mb-4 text-(--color-stone) opacity-50" />
          <p className="text-sm text-(--color-charcoal)">{t.dashboard.empty}</p>
          <p className="mt-2 text-xs text-(--color-stone)">{t.dashboard.emptyHint}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {albums.map((a) => (
            <li key={a.id}>
              <Link
                href={`/portail/album/${a.slug}`}
                className="card-elev card-elev-lift block bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) overflow-hidden group"
              >
                <div className="relative aspect-[4/3] bg-(--color-canvas)">
                  {coverUrls.get(a.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrls.get(a.id)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-(--color-stone)">
                      <Camera className="w-10 h-10 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-xl text-(--color-ink) font-[family-name:var(--font-display)] leading-tight mb-2 group-hover:text-(--color-bronze) transition-colors">
                    {a.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--color-stone)">
                    {a.event_date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(a.event_date).toLocaleDateString(dateLocale, {
                          dateStyle: 'long',
                        })}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {a.photos_count}{' '}
                      {a.photos_count === 1 ? t.dashboard.photoSingular : t.dashboard.photoPlural}
                    </span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-(--color-bronze) group-hover:gap-2 transition-all">
                    {t.dashboard.seeAlbum}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
