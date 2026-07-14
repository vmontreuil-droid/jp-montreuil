import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const SIGNED_URL_TTL = 60 * 60 // 1u

// Image-route voor event-album foto's. De viewer-pagina's renderen stabiele
// URLs (/api/album-photo/<id>?v=thumb|full|dl) i.p.v. zelf honderden signed
// URLs aan te maken — zo blijft de pagina-render licht, ook bij 200+ foto's.
// Per foto wordt hier on-the-fly één signed URL gemaakt en ge-307't naar
// Supabase; de thumb-redirect mag door de edge gecachet worden.
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const url = new URL(request.url)
  const variant = url.searchParams.get('v') // 'thumb' | 'full'
  const download = url.searchParams.get('dl') === '1'

  const admin = createAdminClient()
  const { data: photo } = await admin
    .from('event_photos')
    .select('storage_path, filename, event_albums!inner(is_active)')
    .eq('id', id)
    .maybeSingle()

  const albumRel = (photo as { event_albums?: { is_active: boolean } | { is_active: boolean }[] } | null)
    ?.event_albums
  const album = Array.isArray(albumRel) ? albumRel[0] : albumRel
  if (!photo || !album?.is_active) {
    return new Response('Not found', { status: 404 })
  }

  const options = download
    ? { download: photo.filename ?? true }
    : variant === 'thumb'
      // 'contain' i.p.v. 'cover': de thumb past binnen 600×600 maar houdt haar
      // eigen verhouding, zodat het masonry-raster niets afsnijdt.
      ? { transform: { width: 600, height: 600, resize: 'contain' as const, quality: 65 } }
      : undefined

  const { data: signed } = await admin.storage
    .from('events')
    .createSignedUrl(photo.storage_path, SIGNED_URL_TTL, options)

  if (!signed?.signedUrl) {
    return new Response('Signing failed', { status: 500 })
  }

  // Downloads streamen we door onze eigen origin i.p.v. te redirecten naar
  // Supabase: iOS Safari negeert het download-attribuut zodra een link naar
  // een ander domein springt, en laat de download dan gewoon vallen.
  if (download) {
    const upstream = await fetch(signed.signedUrl)
    if (!upstream.ok || !upstream.body) {
      return new Response('Download failed', { status: 502 })
    }
    const name = photo.filename ?? 'photo.jpg'
    const asciiName = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
    const headers = new Headers({
      'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, no-store',
    })
    const len = upstream.headers.get('content-length')
    if (len) headers.set('Content-Length', len)
    return new Response(upstream.body, { status: 200, headers })
  }

  const res = new Response(null, {
    status: 307,
    headers: { Location: signed.signedUrl },
  })
  // Thumbnails mogen door de edge gecachet worden (korter dan de TTL zodat
  // de embedded signed URL nooit verlopen is wanneer hij geserveerd wordt).
  if (variant === 'thumb' && !download) {
    res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=1800')
  }
  return res
}
