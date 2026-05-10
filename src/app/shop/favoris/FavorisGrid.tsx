'use client'

import Link from 'next/link'
import { ArrowRight, Heart, Sparkles } from 'lucide-react'
import { useWishlist } from '@/components/shop/WishlistProvider'
import { WishlistButton } from '@/components/shop/WishlistButton'
import { shopPhotoUrl } from '@/lib/shop/photo-url'

type PhotoMini = {
  id: string
  slug: string
  title: string | null
  alt: string
  storage_path: string
}

export default function FavorisGrid({ photos }: { photos: PhotoMini[] }) {
  const { ids, hydrated, clear, count } = useWishlist()

  if (!hydrated) {
    return (
      <div className="py-20 text-center">
        <span className="inline-block w-6 h-6 border-2 border-(--color-frame) border-t-(--color-bronze) rounded-full animate-spin" />
      </div>
    )
  }

  const favorites = photos.filter((p) => ids.has(p.id))

  if (favorites.length === 0) {
    return (
      <div className="bg-(--color-paper) border border-(--color-frame) p-12 text-center">
        <Heart className="w-10 h-10 mx-auto mb-4 text-(--color-stone)/40" />
        <p className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) mb-2">
          Pas encore de favoris
        </p>
        <p className="text-sm text-(--color-charcoal) mb-6">
          Cliquez sur le ♡ d&apos;une photographie dans la boutique pour la sauver ici.
        </p>
        <Link
          href="/shop/boutique"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Parcourir la boutique
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
          {count} {count === 1 ? 'favori' : 'favoris'}
        </p>
        <button
          type="button"
          onClick={() => {
            if (confirm('Vider tous les favoris ?')) clear()
          }}
          className="text-xs text-(--color-stone) hover:text-red-700 transition-colors"
        >
          Tout vider
        </button>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
        {favorites.map((p) => (
          <li key={p.id}>
            <Link
              href={`/shop/boutique/photo/${p.slug}`}
              className="group block bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) overflow-hidden transition-colors relative"
            >
              <div className="aspect-square bg-(--color-canvas) relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shopPhotoUrl(p.storage_path)}
                  alt={p.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                />
                <WishlistButton
                  photoId={p.id}
                  className="absolute top-2 right-2 z-10"
                  size={14}
                  ariaLabel="Retirer des favoris"
                />
              </div>
              <div className="p-3">
                <p className="text-sm text-(--color-ink) truncate font-medium">
                  {p.title ?? p.slug}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-(--color-bronze) group-hover:gap-2 transition-all">
                  Personnaliser
                  <ArrowRight className="w-3 h-3" />
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
