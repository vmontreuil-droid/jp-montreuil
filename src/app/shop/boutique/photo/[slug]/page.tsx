import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { shopPhotoUrl, photoAlt, type Photo } from '@/lib/shop/photos'
import {
  listActiveMedia,
  listActiveSizes,
  listAvailablePrices,
  formatEur,
} from '@/lib/shop/print-shop'
import { PrintConfigurator } from '@/components/shop/PrintConfigurator'

export default async function PhotoConfiguratorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sb = createShopAdminClient()
  const { data: photoRaw } = await sb
    .from('photos')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
  if (!photoRaw) notFound()
  const photo = photoRaw as Photo

  const [media, sizes, pricesRaw] = await Promise.all([
    listActiveMedia(),
    listActiveSizes(),
    listAvailablePrices(),
  ])

  // Bouw lookup voor cell-rendering: omdat prices media_id+size_id heeft,
  // en de configurator wil mediaSlug+sizeSlug, mappen we ze.
  const mediaById = new Map(media.map((m) => [m.id, m]))
  const sizeById = new Map(sizes.map((s) => [s.id, s]))
  const prices = pricesRaw
    .map((p) => {
      const m = mediaById.get(p.media_id)
      const s = sizeById.get(p.size_id)
      if (!m || !s) return null
      return {
        mediaSlug: m.slug,
        sizeSlug: s.slug,
        priceCents: p.price_cents,
        priceFormatted: formatEur(p.price_cents),
        isAvailable: p.is_available,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const mediaProps = media.map((m) => ({ id: m.id, slug: m.slug, name: m.name_fr }))
  const sizeProps = sizes.map((s) => ({ id: s.id, slug: s.slug, label: s.label }))

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <Link
        href="/shop/boutique"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 mb-6"
      >
        <ArrowLeft size={14} /> Retour à la boutique
      </Link>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Foto */}
        <div className="aspect-square bg-stone-100 border border-stone-200 rounded overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shopPhotoUrl(photo.storage_path)}
            alt={photoAlt(photo)}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Configurator */}
        <div>
          <p className="text-xs text-stone-500 tracking-widest uppercase mb-2">Personnaliser</p>
          <h1 className="text-3xl font-semibold mb-3">{photo.title ?? photo.slug}</h1>
          {photo.description && (
            <p className="text-sm text-stone-600 mb-6">{photo.description}</p>
          )}

          {media.length === 0 || sizes.length === 0 || prices.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded p-4 text-sm">
              Configurator niet beschikbaar — voeg eerst materialen, formaten
              en prijzen toe via{' '}
              <Link href="/admin/boutique/boutique" className="underline">
                /admin/boutique/boutique
              </Link>
              .
            </div>
          ) : (
            <PrintConfigurator
              photoId={photo.id}
              photoSlug={photo.slug}
              photoTitle={photo.title ?? photo.slug}
              photoStoragePath={photo.storage_path}
              media={mediaProps}
              sizes={sizeProps}
              prices={prices}
            />
          )}
        </div>
      </div>
    </main>
  )
}
