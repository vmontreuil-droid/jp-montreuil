import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'
import { workImageUrl } from '@/lib/links'

export const alt = 'Atelier Montreuil — Galerie'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'
export const revalidate = 3600

/**
 * OG-image per categorie — gebruikt het cover-werk van de categorie als
 * achtergrond, met de categorie-naam in een nette frame-overlay.
 * Wanneer een bezoeker de gallery-link in WhatsApp/FB plakt zien ze
 * direct welke categorie het betreft i.p.v. de generic site-image.
 */
export default async function Image({
  params,
}: {
  params: { locale: string; slug: string }
}) {
  const { locale, slug } = params
  const sb = createAdminClient()

  const { data: cat } = await sb
    .from('categories')
    .select('label_fr, label_nl, cover:works!categories_cover_work_id_fkey(storage_path)')
    .eq('slug', slug)
    .maybeSingle<{
      label_fr: string
      label_nl: string
      cover: { storage_path: string } | null
    }>()

  const label = cat ? (locale === 'nl' ? cat.label_nl : cat.label_fr) : 'Galerie'
  const heroUrl = cat?.cover?.storage_path ? workImageUrl(cat.cover.storage_path) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#0a0908',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        {heroUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt=""
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Subtiele vignette van onderaan zodat de tekst leesbaar is */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(10,9,8,0.92) 0%, rgba(10,9,8,0.30) 55%, rgba(10,9,8,0.0) 100%)',
            display: 'flex',
          }}
        />

        {/* Tekst onderaan links */}
        <div
          style={{
            position: 'absolute',
            left: 80,
            right: 80,
            bottom: 70,
            display: 'flex',
            flexDirection: 'column',
            color: '#faf8f5',
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: '#c89b6c',
              letterSpacing: 6,
              textTransform: 'uppercase',
              marginBottom: 18,
            }}
          >
            Atelier Montreuil
          </div>
          <div
            style={{
              fontSize: 100,
              lineHeight: 1,
              color: '#faf8f5',
            }}
          >
            {label}
          </div>
          <div
            style={{
              marginTop: 24,
              width: 100,
              height: 3,
              backgroundColor: '#c89b6c',
            }}
          />
        </div>
      </div>
    ),
    size,
  )
}
