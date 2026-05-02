import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AlbumDetail, { type AlbumDetailPhoto, type AlbumDetailRow } from './AlbumDetail'

export const dynamic = 'force-dynamic'

const SIGNED_URL_TTL = 60 * 60 // 1u

type Props = {
  params: Promise<{ id: string }>
}

export default async function AlbumAdminPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: album } = await supabase
    .from('event_albums')
    .select('id, slug, title, client_name, client_email, client_locale, event_date, is_active, created_at')
    .eq('id', id)
    .single<AlbumDetailRow>()

  if (!album) notFound()

  const { data: photosRaw } = await supabase
    .from('event_photos')
    .select('id, storage_path, filename, size_bytes, sort_order, created_at')
    .eq('album_id', id)
    .order('sort_order', { ascending: true })

  // Signed URLs voor preview in admin (admin RLS, dus storage list mag)
  const admin = createAdminClient()
  const photos: AlbumDetailPhoto[] = []
  for (const p of photosRaw ?? []) {
    const { data: signed } = await admin.storage
      .from('events')
      .createSignedUrl(p.storage_path, SIGNED_URL_TTL)
    photos.push({
      id: p.id,
      storage_path: p.storage_path,
      filename: p.filename,
      size_bytes: p.size_bytes,
      sort_order: p.sort_order,
      preview_url: signed?.signedUrl ?? '',
    })
  }

  return (
    <div className="p-8 md:p-12 max-w-6xl">
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-(--color-stone) hover:text-(--color-ink) mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Tous les albums
      </Link>

      <AlbumDetail album={album} photos={photos} />
    </div>
  )
}
