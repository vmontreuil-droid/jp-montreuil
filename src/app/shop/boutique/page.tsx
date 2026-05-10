import Link from 'next/link'
import { ArrowRight, HelpCircle, ShoppingBag } from 'lucide-react'
import { listShopPhotos } from '@/lib/shop/photos'
import { formatPrice } from '@/lib/shop/products'
import {
  listActiveMedia,
  listActiveSizes,
  listAvailablePrices,
  mediumName,
} from '@/lib/shop/print-shop'
import { getDictionary } from '@/i18n/dictionaries'
import BoutiqueGrid from './BoutiqueGrid'

export const dynamic = 'force-dynamic'

/**
 * /shop/boutique — publieke landing in jp-montreuil-stijl.
 * Server fetcht alle gepubliceerde foto's; sorting/zoek/wishlist gebeurt
 * client-side in BoutiqueGrid.
 */
export default async function ShopBoutiquePage() {
  const t = getDictionary('fr').boutique

  const [photos, media, sizes, prices] = await Promise.all([
    listShopPhotos({ publishedOnly: true }),
    listActiveMedia(),
    listActiveSizes(),
    listAvailablePrices(),
  ])

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
              href="/comment-ca-marche"
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
                ({mediumName(cheapestMedium, 'fr')}, {sizes[0]?.label})
              </span>
            )}
          </div>
        </div>
      </section>

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
            photos={photos.map((p) => ({
              id: p.id,
              slug: p.slug,
              title: p.title,
              alt: p.alt_text ?? p.title ?? p.slug,
              storage_path: p.storage_path,
              species: p.species,
              taken_at_location: p.taken_at_location,
              created_at: p.created_at,
            }))}
            labels={{
              singular: t.photoCountSingular,
              plural: t.photoCountPlural,
              customize: t.customizeCta,
            }}
          />
        )}
      </section>
    </div>
  )
}
