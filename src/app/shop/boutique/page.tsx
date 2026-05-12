import Link from 'next/link'
import { ArrowRight, HelpCircle, ShoppingBag, Sparkles } from 'lucide-react'
import { listShopPhotos, listFeaturedShopPhotos, photoAlt } from '@/lib/shop/photos'
import { photoUrl } from '@/lib/shop/photo-url'
import { formatPrice } from '@/lib/shop/products'
import {
  listActiveMedia,
  listActiveSizes,
  listAvailablePrices,
  mediumName,
} from '@/lib/shop/print-shop'
import { listShopCategories } from '@/lib/shop/import-works'
import { aggregatesForPhotos } from '@/lib/shop/reviews'
import { getDictionary } from '@/i18n/dictionaries'
import { getShopLocale } from '@/lib/shop/locale'
import { localePath } from '@/lib/links'
import BoutiqueGrid from './BoutiqueGrid'

export const dynamic = 'force-dynamic'

/**
 * /shop/boutique — publieke landing in jp-montreuil-stijl.
 * Server fetcht alle gepubliceerde foto's; sorting/zoek/wishlist gebeurt
 * client-side in BoutiqueGrid.
 */
export default async function ShopBoutiquePage() {
  const locale = await getShopLocale()
  const t = getDictionary(locale).boutique

  const [photos, media, sizes, prices, featured, categories] = await Promise.all([
    listShopPhotos({ publishedOnly: true }),
    listActiveMedia(),
    listActiveSizes(),
    listAvailablePrices(),
    listFeaturedShopPhotos(6).catch(() => []),
    listShopCategories().catch(() => []),
  ])

  // Reviews-aggregates per foto (1 batch-query) — voor sterren-badges
  // op de cards. Drempel: ≥1 review → toon badge.
  const reviewAggregates = await aggregatesForPhotos(
    photos.map((p) => p.id),
  ).catch(() => new Map())

  const minCents = prices.length > 0 ? Math.min(...prices.map((p) => p.price_cents)) : null
  const cheapestMedium = (() => {
    if (!minCents || media.length === 0) return null
    const cell = prices.find((p) => p.price_cents === minCents)
    if (!cell) return null
    return media.find((m) => m.id === cell.media_id) ?? null
  })()

  return (
    <div className="bg-(--color-canvas)">
      {/* Hero */}
      <section className="border-b border-(--color-frame) bg-(--color-paper)/40">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-3 inline-flex items-center gap-2">
            <ShoppingBag className="w-3.5 h-3.5" />
            {t.eyebrow}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-6xl text-(--color-ink) leading-tight mb-4">
            {t.title}
          </h1>
          <p className="text-(--color-charcoal) text-base md:text-lg max-w-2xl leading-relaxed">
            {t.lead}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={localePath(locale, '/comment-ca-marche')}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-bronze) transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              {t.seeHow}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            {minCents && cheapestMedium && (
              <span className="text-xs text-(--color-stone)">
                {t.fromPrice}{' '}
                <strong className="text-(--color-ink)">{formatPrice(minCents)}</strong>{' '}
                ({mediumName(cheapestMedium, locale)}, {sizes[0]?.label})
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Featured strip — toont enkel als admin foto's heeft als "is_featured" gemarkeerd */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pt-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) inline-flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-(--color-bronze)" />
              {t.favouritesTitle}
            </h2>
          </div>
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {featured.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/shop/boutique/photo/${p.slug}`}
                  className="group block bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) overflow-hidden transition-colors"
                >
                  <div className="aspect-square bg-(--color-canvas) relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl(p)}
                      alt={photoAlt(p)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Photo grid + sort/search filter */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        {photos.length === 0 ? (
          <div className="bg-(--color-paper) border border-(--color-frame) p-12 text-center">
            <ShoppingBag className="w-10 h-10 mx-auto mb-4 text-(--color-stone) opacity-40" />
            <p className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) mb-2">
              {t.emptyTitle}
            </p>
            <p className="text-sm text-(--color-charcoal)">{t.emptyBody}</p>
          </div>
        ) : (
          <BoutiqueGrid
            photos={photos.map((p) => {
              const ag = reviewAggregates.get(p.id)
              return {
                id: p.id,
                slug: p.slug,
                title: p.title,
                alt: p.alt_text ?? p.title ?? p.slug,
                storage_path: p.storage_path,
                bucket: p.bucket ?? 'shop-photos',
                species: p.species,
                taken_at_location: p.taken_at_location,
                taken_at: p.taken_at,
                description: p.description,
                category_slug: p.category_slug,
                orientation: p.orientation,
                created_at: p.created_at,
                reviewsCount: ag?.count ?? 0,
                reviewsAverage: ag?.average ?? null,
              }
            })}
            categories={categories}
            labels={{
              singular: t.photoCountSingular,
              plural: t.photoCountPlural,
              customize: t.customizeCta,
              search: t.searchPlaceholder,
              favoritesToggle: t.favoritesToggle,
              allCategories: t.allCategories,
              noResults: t.noResults,
              clearFilters: t.clearFilters,
              quickView: t.quickView,
              sort: {
                recent: t.sortRecent,
                oldest: t.sortOldest,
                title: t.sortTitle,
                favorites: t.sortFavorites,
              },
            }}
          />
        )}
      </section>
    </div>
  )
}
