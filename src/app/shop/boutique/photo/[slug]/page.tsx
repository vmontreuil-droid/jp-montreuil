import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { shopPhotoUrl, photoUrl, photoAlt, type Photo } from '@/lib/shop/photos'
import {
  listActiveMedia,
  listActiveSizes,
  listAvailablePrices,
  formatEur,
} from '@/lib/shop/print-shop'
import { listApprovedReviewsForPhoto, aggregateReviews } from '@/lib/shop/reviews'
import { PhotoStage } from '@/components/shop/PhotoStage'
import ReviewsSection from '@/components/shop/ReviewsSection'
import PhotoViewTracker from '@/components/shop/PhotoViewTracker'
import { getShopLocale } from '@/lib/shop/locale'
import { getDictionary } from '@/i18n/dictionaries'

export const dynamic = 'force-dynamic'

export default async function PhotoConfiguratorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const locale = await getShopLocale()
  const t = getDictionary(locale).boutique
  const sb = createShopAdminClient()
  const { data: photoRaw } = await sb
    .from('photos')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
  if (!photoRaw) notFound()
  const photo = photoRaw as Photo

  const [media, sizes, pricesRaw, reviews, relatedRaw] = await Promise.all([
    listActiveMedia(),
    listActiveSizes(),
    listAvailablePrices(),
    listApprovedReviewsForPhoto(photo.id),
    (async () => {
      const all = await sb
        .from('photos')
        .select('id, slug, title, alt_text, storage_path, bucket, species, category_slug')
        .eq('is_published', true)
        .neq('id', photo.id)
        .limit(20)
      const list = (all.data ?? []) as Pick<Photo, 'id' | 'slug' | 'title' | 'alt_text' | 'storage_path' | 'bucket' | 'species' | 'category_slug'>[]
      const sameCat = photo.category_slug
        ? list.filter((p) => p.category_slug === photo.category_slug)
        : []
      const others = list.filter((p) => !sameCat.includes(p))
      return [...sameCat, ...others].slice(0, 4)
    })(),
  ])

  const aggregate = aggregateReviews(reviews)

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

  const mediaProps = media.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: locale === 'nl' ? (m.name_nl ?? m.name_fr) : m.name_fr,
  }))
  const sizeProps = sizes.map((s) => ({ id: s.id, slug: s.slug, label: s.label }))

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <PhotoViewTracker photoId={photo.id} path={`/shop/boutique/photo/${photo.slug}`} />

      <Link
        href="/shop/boutique"
        className="inline-flex items-center gap-2 text-sm text-(--color-stone) hover:text-(--color-ink) mb-6"
      >
        <ArrowLeft size={14} /> {t.backToBoutique}
      </Link>

      {media.length === 0 || sizes.length === 0 || prices.length === 0 ? (
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-(--color-frame)/40 border border-(--color-frame) overflow-hidden relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl(photo)}
              alt={photoAlt(photo)}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-xs text-(--color-bronze) tracking-[0.3em] uppercase mb-2 inline-flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              {t.detailEyebrow}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-(--color-ink) mb-3">
              {photo.title ?? photo.slug}
            </h1>
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded p-4 text-sm">
              {t.configurator.configMissing}{' '}
              <Link href="/admin/boutique/boutique" className="underline">
                /admin/boutique/boutique
              </Link>
              .
            </div>
          </div>
        </div>
      ) : (
        <PhotoStage
          photoId={photo.id}
          photoSlug={photo.slug}
          photoTitle={photo.title ?? photo.slug}
          photoUrl={photoUrl(photo)}
          photoAlt={photoAlt(photo)}
          photoStoragePath={photo.storage_path}
          photoBucket={photo.bucket}
          photoNaturalWidth={photo.width}
          photoNaturalHeight={photo.height}
          defaultOrientation={photo.orientation ?? 'portrait'}
          media={mediaProps}
          sizes={sizeProps}
          prices={prices}
          labels={t.configurator}
          rightHeader={
            <>
              <p className="text-xs text-(--color-bronze) tracking-[0.3em] uppercase mb-2 inline-flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                {t.detailEyebrow}
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-(--color-ink) mb-3">
                {photo.title ?? photo.slug}
              </h1>
              {(photo.species || photo.taken_at_location) && (
                <p className="text-xs text-(--color-stone) mb-3">
                  {[photo.species, photo.taken_at_location].filter(Boolean).join(' · ')}
                </p>
              )}
              {photo.description && (
                <p className="text-sm text-(--color-charcoal) mb-6 leading-relaxed">{photo.description}</p>
              )}
            </>
          }
        />
      )}

      {/* Reviews */}
      <ReviewsSection photoId={photo.id} reviews={reviews} aggregate={aggregate} />

      {/* Related */}
      {relatedRaw.length > 0 && (
        <section className="border-t border-(--color-frame) pt-12 mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) mb-6">
            {t.relatedTitle}
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedRaw.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/shop/boutique/photo/${r.slug}`}
                  className="group block bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) overflow-hidden transition-colors"
                >
                  <div className="aspect-square bg-(--color-canvas) relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shopPhotoUrl(r.storage_path, r.bucket)}
                      alt={r.alt_text ?? r.title ?? r.slug}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-(--color-ink) truncate font-medium">
                      {r.title ?? r.slug}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-(--color-bronze) group-hover:gap-2 transition-all">
                      {t.relatedSee}
                      <ArrowRight className="w-3 h-3" />
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
