import { ImageResponse } from 'next/og'
import { workImageUrl } from '@/lib/links'
import { createAdminClient } from '@/lib/supabase/admin'

export const alt = 'Atelier Montreuil — Jean-Pierre Montreuil'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Edge runtime: ImageResponse + remote fetch werken sneller; we cachen de
// gegenereerde PNG agressief op CDN niveau via revalidate.
export const runtime = 'edge'
export const revalidate = 3600 // 1u — werken wisselen niet vaak van plaats

/**
 * Open Graph image (1200×630) voor de homepage en alle pagina's zonder
 * eigen image. Bestond uit enkel een logo — nu rijker met een werkelijke
 * werk-foto als achtergrond + bronze accent + tagline.
 *
 * Strategie:
 *  1. Pak het cover-werk van de eerste actieve categorie (sort_order)
 *  2. Bij ontbrekend werk → puur logo-fallback (oude gedrag)
 */
export default async function Image() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://montreuil.be'
  const logoSrc = `${baseUrl.replace(/\/$/, '')}/logo-dark.png`

  // Hero-werk fetchen (eerst geprobeerd uit categories.cover, fallback
  // naar eerste werk in `works`)
  let heroUrl: string | null = null
  try {
    const sb = createAdminClient()
    const { data: cat } = await sb
      .from('categories')
      .select('cover:works!categories_cover_work_id_fkey(storage_path)')
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle<{ cover: { storage_path: string } | null }>()
    const path = cat?.cover?.storage_path
    if (path) heroUrl = workImageUrl(path)
    else {
      const { data: work } = await sb
        .from('works')
        .select('storage_path')
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle<{ storage_path: string }>()
      if (work) heroUrl = workImageUrl(work.storage_path)
    }
  } catch {
    // Ignore — fall back op logo-only image
  }

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
        {/* Hero-foto als achtergrond */}
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

        {/* Donker overlay zodat de tekst leesbaar is op elke foto */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(10,9,8,0.85) 0%, rgba(10,9,8,0.55) 50%, rgba(10,9,8,0.78) 100%)',
            display: 'flex',
          }}
        />

        {/* Inhoud — links uitgelijnd, met bronze accent */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '80px 90px',
            color: '#faf8f5',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="Atelier Montreuil"
            width={620}
            height={215}
            style={{ marginBottom: 36, filter: 'invert(1) brightness(1.05)' }}
          />

          <div
            style={{
              width: 100,
              height: 3,
              backgroundColor: '#c89b6c',
              marginBottom: 28,
            }}
          />

          <div
            style={{
              fontSize: 36,
              color: '#faf8f5',
              fontStyle: 'italic',
              lineHeight: 1.2,
              maxWidth: 800,
            }}
          >
            L&apos;intermédiaire entre vous et la toile
          </div>

          <div
            style={{
              marginTop: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 22,
              color: '#c89b6c',
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            <span>Jean-Pierre Montreuil</span>
            <span>·</span>
            <span>Anzegem</span>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
