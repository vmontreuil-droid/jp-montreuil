import { ImageResponse } from 'next/og'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { shopPhotoUrl } from '@/lib/shop/photo-url'

/**
 * /api/og/preview?slug=…&material=…&size=…&orientation=…&wall=…
 *
 * Genereert een 1200×630 PNG met de gevraagde foto in een mockup-frame
 * + caption. Wordt gebruikt voor:
 *  - Open Graph image van /shop/boutique/photo/[slug] (rich preview bij
 *    delen op WhatsApp/Facebook/LinkedIn) — automatisch via
 *    `generateMetadata` met de huidige config-params
 *  - Embed in order-confirmation email
 *
 * Satori (engine achter ImageResponse) ondersteunt slechts een subset
 * van CSS — geen `box-shadow`, geen `filter`, geen `backdrop-filter`,
 * geen complexe SVG. We gebruiken plain flexbox + borders + plain
 * gradients. Mockup is daardoor simpler dan de live FramedPreview.
 */

export const runtime = 'edge'

const SIZE = { width: 1200, height: 630 }

const WALLS: Record<string, { bg: string; ink: string }> = {
  beige: { bg: '#ece7df', ink: '#1f1d1a' },
  white: { bg: '#f6f6f5', ink: '#3a3a3a' },
  dark:  { bg: '#221f1a', ink: '#e8e3da' },
  room:  { bg: '#e1d6c4', ink: '#3a2f22' },
}

function parseDims(label: string | null | undefined): { w: number; h: number } | null {
  if (!label) return null
  const m = label.match(/(\d+)\s*[×x]\s*(\d+)/)
  if (!m) return null
  return { w: Number(m[1]), h: Number(m[2]) }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')
  const photoId = url.searchParams.get('photoId')
  const material = url.searchParams.get('material') ?? 'fine_art'
  const sizeSlug = url.searchParams.get('size')
  const orientation = (url.searchParams.get('orientation') ?? 'portrait') as 'portrait' | 'landscape'
  const wall = (url.searchParams.get('wall') ?? 'beige') in WALLS
    ? (url.searchParams.get('wall') ?? 'beige')
    : 'beige'

  if (!slug && !photoId) {
    return new Response('slug or photoId required', { status: 400 })
  }

  // Photo + size data uit Supabase — accepteer slug OF photoId zodat
  // zowel /shop/boutique/photo/[slug] (slug) als de
  // order-confirmation email (photoId) hetzelfde endpoint kan
  // gebruiken.
  const sb = createShopAdminClient()
  const photoQuery = sb.from('photos').select('title, slug, alt_text, storage_path, bucket').eq('is_published', true)
  const [{ data: photo }, { data: size }] = await Promise.all([
    (slug ? photoQuery.eq('slug', slug) : photoQuery.eq('id', photoId!)).maybeSingle(),
    sizeSlug
      ? sb.from('print_sizes').select('label').eq('slug', sizeSlug).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!photo) return new Response('not found', { status: 404 })

  const photoUrl = shopPhotoUrl(
    (photo as { storage_path: string }).storage_path,
    (photo as { bucket: string }).bucket,
  )
  const title = (photo as { title: string | null; slug: string }).title
    ?? (photo as { slug: string }).slug

  const dims = parseDims((size as { label: string } | null)?.label)
  const aspect = dims
    ? (orientation === 'landscape' ? dims.w / dims.h : dims.h / dims.w)
    : 1
  // Compute frame size binnen 800×500 zone
  const stageMaxW = 760
  const stageMaxH = 470
  let frameW: number, frameH: number
  if (orientation === 'landscape') {
    frameW = stageMaxW
    frameH = Math.round(stageMaxW / aspect)
    if (frameH > stageMaxH) {
      frameH = stageMaxH
      frameW = Math.round(stageMaxH * aspect)
    }
  } else {
    frameH = stageMaxH
    frameW = Math.round(stageMaxH / aspect)
    if (frameW > stageMaxW) {
      frameW = stageMaxW
      frameH = Math.round(stageMaxW * aspect)
    }
  }

  const theme = WALLS[wall] ?? WALLS.beige
  // Material-style: vereenvoudigde border/wrap
  const isCanvas = material === 'canvas'
  const isPlexi = material === 'plexi'
  const isDibond = material === 'aluminum'
  const frameBorder = isCanvas
    ? 'none'
    : isDibond
      ? '3px solid #c0c0c0'
      : isPlexi
        ? '2px solid rgba(255,255,255,0.6)'
        : '1px solid #1a1612'
  const passePartoutMargin = material === 'fine_art' ? 28 : 0

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: theme.bg,
          fontFamily: 'Georgia, "Times New Roman", serif',
          padding: 60,
        }}
      >
        {/* Stage met frame */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: frameW,
              height: frameH,
              border: frameBorder,
              background: material === 'fine_art' ? '#ffffff' : 'transparent',
              padding: passePartoutMargin,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                background: '#000',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt={title}
                width={frameW - passePartoutMargin * 2}
                height={frameH - passePartoutMargin * 2}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {/* Plexi reflectie-overlay (vereenvoudigd) */}
              {isPlexi && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(125deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0) 45%)',
                    display: 'flex',
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Caption */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: 24,
            color: theme.ink,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 36, fontWeight: 600 }}>{title}</div>
            <div
              style={{
                fontSize: 18,
                opacity: 0.7,
                marginTop: 6,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {[
                dims ? `${dims.w} × ${dims.h} cm` : null,
                material === 'fine_art' ? 'Fine-Art' : material === 'aluminum' ? 'Dibond' : material === 'plexi' ? 'Plexiglas' : 'Canvas',
                orientation === 'landscape' ? 'Paysage' : 'Portrait',
              ].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              fontSize: 14,
              letterSpacing: 4,
              textTransform: 'uppercase',
              opacity: 0.6,
            }}
          >
            <div>Atelier JP Montreuil</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>jp.montreuil.be</div>
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      // 5 min CDN cache + 1u stale-while-revalidate
      headers: {
        'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
      },
    },
  )
}
