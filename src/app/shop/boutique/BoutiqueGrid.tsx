'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Search, ArrowDownUp, Heart, X, Eye, Tags } from 'lucide-react'
import { WishlistButton } from '@/components/shop/WishlistButton'
import { useWishlist } from '@/components/shop/WishlistProvider'
import QuickViewModal from '@/components/shop/QuickViewModal'
import { shopPhotoUrl } from '@/lib/shop/photo-url'

type PhotoMini = {
  id: string
  slug: string
  title: string | null
  alt: string
  storage_path: string
  bucket: string
  species: string | null
  taken_at_location: string | null
  taken_at: string | null
  description: string | null
  category_slug: string | null
  orientation: 'portrait' | 'landscape' | 'square'
  created_at: string
}

type SortKey = 'recent' | 'oldest' | 'title' | 'favorites'

type Labels = {
  singular: string
  plural: string
  customize: string
}

type CategoryOption = {
  slug: string
  label: string
  count: number
}

const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Plus récentes',
  oldest: 'Plus anciennes',
  title: 'Titre A → Z',
  favorites: '♡ Favoris d’abord',
}

/**
 * Interactieve foto-grid voor /shop/boutique met live search + sort +
 * favorites-toggle + category-filter (uitsluit bronze automatisch via
 * server-side filter — categories-list bevat enkel toegelaten cats).
 */
export default function BoutiqueGrid({
  photos,
  categories,
  labels,
}: {
  photos: PhotoMini[]
  categories: CategoryOption[]
  labels: Labels
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [onlyFavs, setOnlyFavs] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [quickViewIdx, setQuickViewIdx] = useState<number | null>(null)
  const { ids, hydrated } = useWishlist()

  const filtered = useMemo(() => {
    let list = photos.slice()
    if (activeCategory) {
      list = list.filter((p) => p.category_slug === activeCategory)
    }
    if (onlyFavs && hydrated) {
      list = list.filter((p) => ids.has(p.id))
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((p) => {
        const haystack = [
          p.title ?? '',
          p.slug,
          p.species ?? '',
          p.taken_at_location ?? '',
          p.category_slug ?? '',
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }
    switch (sort) {
      case 'recent':
        list.sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      case 'oldest':
        list.sort((a, b) => a.created_at.localeCompare(b.created_at))
        break
      case 'title':
        list.sort((a, b) => (a.title ?? a.slug).localeCompare(b.title ?? b.slug))
        break
      case 'favorites':
        if (hydrated) {
          list.sort((a, b) => Number(ids.has(b.id)) - Number(ids.has(a.id)))
        }
        break
    }
    return list
  }, [photos, query, sort, onlyFavs, ids, hydrated, activeCategory])

  return (
    <>
      {/* Category pills — alle categorieën van papa's portfolio (excl bronze) */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-5 border-b border-(--color-frame)/60">
          <Tags className="w-3.5 h-3.5 text-(--color-stone)" />
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
              activeCategory === null
                ? 'bg-(--color-bronze) text-white border-(--color-bronze)'
                : 'bg-(--color-paper) border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-bronze)'
            }`}
          >
            Toutes
            <span className={`text-[10px] ${activeCategory === null ? 'opacity-90' : 'opacity-60'}`}>
              ({photos.length})
            </span>
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setActiveCategory(c.slug)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
                activeCategory === c.slug
                  ? 'bg-(--color-bronze) text-white border-(--color-bronze)'
                  : 'bg-(--color-paper) border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-bronze)'
              }`}
            >
              {c.label}
              <span className={`text-[10px] ${activeCategory === c.slug ? 'opacity-90' : 'opacity-60'}`}>
                ({c.count})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Toolbar: search + sort + favs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
          {filtered.length} {filtered.length === 1 ? labels.singular : labels.plural}
        </p>

        <div className="flex flex-wrap gap-2 items-center">
          <label className="relative inline-flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 text-(--color-stone)" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="pl-9 pr-8 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-xs uppercase tracking-[0.15em] focus:border-(--color-bronze) focus:outline-none w-44 sm:w-56"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Effacer"
                className="absolute right-2 text-(--color-stone) hover:text-(--color-ink)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>

          <label className="relative inline-flex items-center">
            <ArrowDownUp className="absolute left-3 w-3.5 h-3.5 text-(--color-stone) pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="pl-9 pr-8 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-xs uppercase tracking-[0.15em] focus:border-(--color-bronze) focus:outline-none appearance-none"
            >
              {Object.entries(SORT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setOnlyFavs((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 border text-xs uppercase tracking-[0.15em] transition-colors ${
              onlyFavs
                ? 'bg-(--color-bronze) text-white border-(--color-bronze)'
                : 'bg-(--color-paper) text-(--color-charcoal) border-(--color-frame) hover:border-(--color-bronze) hover:text-(--color-bronze)'
            }`}
            aria-pressed={onlyFavs}
          >
            <Heart className={`w-3.5 h-3.5 ${onlyFavs ? 'fill-white' : ''}`} />
            <span className="hidden sm:inline">Favoris</span>
          </button>
        </div>
      </div>

      {/* Empty filter result */}
      {filtered.length === 0 ? (
        <div className="bg-(--color-paper) border border-(--color-frame) p-12 text-center">
          <Search className="w-8 h-8 mx-auto mb-3 text-(--color-stone)/50" />
          <p className="text-sm text-(--color-charcoal) mb-4">
            Aucune œuvre ne correspond à votre recherche.
          </p>
          <button
            type="button"
            onClick={() => { setQuery(''); setOnlyFavs(false); setActiveCategory(null) }}
            className="text-xs uppercase tracking-[0.2em] text-(--color-bronze) hover:text-(--color-bronze-dark)"
          >
            Effacer les filtres
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {filtered.map((p, idx) => (
            <li key={p.id}>
              <Link
                href={`/shop/boutique/photo/${p.slug}`}
                className="group block bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) overflow-hidden transition-colors relative"
              >
                <div className="aspect-square bg-(--color-canvas) relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shopPhotoUrl(p.storage_path, p.bucket)}
                    alt={p.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                  <WishlistButton
                    photoId={p.id}
                    className="absolute top-2 right-2 z-10"
                    size={14}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setQuickViewIdx(idx)
                    }}
                    aria-label="Aperçu rapide"
                    title="Aperçu rapide"
                    className="absolute top-2 left-2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full bg-(--color-canvas)/80 backdrop-blur-sm text-(--color-charcoal) hover:bg-(--color-canvas) hover:text-(--color-bronze) opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-sm text-(--color-ink) truncate font-medium">
                    {p.title ?? p.slug}
                  </p>
                  {p.category_slug && (
                    <p className="text-[10px] uppercase tracking-widest text-(--color-stone) mt-0.5">
                      {p.category_slug}
                    </p>
                  )}
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-(--color-bronze) group-hover:gap-2 transition-all">
                    {labels.customize}
                    <ArrowRight className="w-3 h-3" />
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Quick-view modal */}
      {quickViewIdx !== null && filtered[quickViewIdx] && (
        <QuickViewModal
          photo={filtered[quickViewIdx]}
          onClose={() => setQuickViewIdx(null)}
          onPrev={() => setQuickViewIdx((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setQuickViewIdx((i) => (i !== null && i < filtered.length - 1 ? i + 1 : i))}
          hasPrev={quickViewIdx > 0}
          hasNext={quickViewIdx < filtered.length - 1}
        />
      )}
    </>
  )
}
