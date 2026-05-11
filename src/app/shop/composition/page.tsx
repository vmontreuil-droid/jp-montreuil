import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { shopPhotoUrl, type Photo } from '@/lib/shop/photos'
import {
  listActiveMedia,
  listActiveSizes,
  listAvailablePrices,
  formatEur,
} from '@/lib/shop/print-shop'
import { getShopLocale } from '@/lib/shop/locale'
import { getDictionary } from '@/i18n/dictionaries'
import { CompositionBuilder } from './CompositionBuilder'

export const dynamic = 'force-dynamic'

/**
 * /shop/composition — wand-arrangement maker. Klant kiest 3 werken +
 * gemeenschappelijk materiaal/formaat → live preview met 3 frames
 * naast elkaar → "Tout ajouter au panier" voegt 3 line-items toe.
 */
export default async function CompositionPage() {
  const locale = await getShopLocale()
  const t = getDictionary(locale).boutique

  const sb = createShopAdminClient()
  const [photosRaw, media, sizes, pricesRaw] = await Promise.all([
    sb
      .from('photos')
      .select('id, slug, title, alt_text, storage_path, bucket')
      .eq('is_published', true)
      .limit(60)
      .then((r) => (r.data ?? []) as Pick<Photo, 'id' | 'slug' | 'title' | 'alt_text' | 'storage_path' | 'bucket'>[]),
    listActiveMedia(),
    listActiveSizes(),
    listAvailablePrices(),
  ])

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

  const photoProps = photosRaw.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    alt: p.alt_text ?? p.title ?? p.slug,
    url: shopPhotoUrl(p.storage_path, p.bucket),
    storagePath: p.storage_path,
    bucket: p.bucket,
  }))

  const mediaProps = media.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: locale === 'nl' ? (m.name_nl ?? m.name_fr) : m.name_fr,
  }))
  const sizeProps = sizes.map((s) => ({ id: s.id, slug: s.slug, label: s.label }))

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <Link
        href="/shop/boutique"
        className="inline-flex items-center gap-2 text-sm text-(--color-stone) hover:text-(--color-ink) mb-6"
      >
        <ArrowLeft size={14} /> {t.backToBoutique}
      </Link>

      <header className="mb-8">
        <p className="text-xs text-(--color-bronze) tracking-[0.3em] uppercase mb-2 inline-flex items-center gap-2">
          <Sparkles className="w-3 h-3" />
          {t.configurator.triptychOpen}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-(--color-ink) mb-3">
          {t.configurator.compositionTitle}
        </h1>
        <p className="text-sm text-(--color-charcoal) max-w-xl">
          {t.configurator.compositionLead}
        </p>
      </header>

      <CompositionBuilder
        photos={photoProps}
        media={mediaProps}
        sizes={sizeProps}
        prices={prices}
        labels={t.configurator}
        locale={locale}
      />
    </main>
  )
}
