'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import {
  Eye, EyeOff, Star, Trash2, Loader2, AlertCircle, X, Filter, Tags,
} from 'lucide-react'
import { shopPhotoUrl } from '@/lib/shop/photo-url'
import { bulkPhotoAction } from './actions'

type PhotoMini = {
  id: string
  slug: string
  title: string | null
  alt_text: string | null
  storage_path: string
  bucket: string
  is_published: boolean
  is_featured: boolean
  category_slug: string | null
}

type FilterKey = 'all' | 'published' | 'draft' | 'featured'

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'Toutes',
  published: 'Publiées',
  draft: 'Brouillons',
  featured: 'Coups de cœur',
}

/**
 * Admin photos lijst met checkboxes + bulk-action bar + filter (status +
 * categorie). Klikken op de afbeelding zelf gaat naar de detail-pagina;
 * klikken op de checkbox-zone selecteert (handig voor batch-acties).
 */
export default function PhotosGrid({ photos }: { photos: PhotoMini[] }) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Categorie-counts (uniek + ongesorteerd, slug-based)
  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of photos) {
      if (!p.category_slug) continue
      counts.set(p.category_slug, (counts.get(p.category_slug) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [photos])

  const filtered = useMemo(() => {
    let list = photos
    if (activeCategory) {
      list = list.filter((p) => p.category_slug === activeCategory)
    }
    switch (filter) {
      case 'published': return list.filter((p) => p.is_published)
      case 'draft':     return list.filter((p) => !p.is_published)
      case 'featured':  return list.filter((p) => p.is_featured)
      default:          return list
    }
  }, [photos, filter, activeCategory])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))
  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filtered.forEach((p) => next.delete(p.id))
      } else {
        filtered.forEach((p) => next.add(p.id))
      }
      return next
    })
  }

  function runBulk(action: 'publish' | 'unpublish' | 'feature' | 'unfeature' | 'delete') {
    if (selected.size === 0) return
    if (action === 'delete' && !confirm(`Supprimer ${selected.size} photo${selected.size > 1 ? 's' : ''} ?`)) return
    setError(null)
    startTransition(async () => {
      const r = await bulkPhotoAction([...selected], action)
      if (r.ok) {
        setSelected(new Set())
      } else {
        setError(r.error)
      }
    })
  }

  /** "Tout publier maintenant" — handig na een grote import om alles
      in één klik op publiek te zetten. */
  function publishAllVisible() {
    const ids = filtered.filter((p) => !p.is_published).map((p) => p.id)
    if (ids.length === 0) return
    if (!confirm(`Publier ${ids.length} photo${ids.length > 1 ? 's' : ''} ?`)) return
    setError(null)
    startTransition(async () => {
      const r = await bulkPhotoAction(ids, 'publish')
      if (!r.ok) setError(r.error)
    })
  }

  const counts = {
    all: photos.length,
    published: photos.filter((p) => p.is_published).length,
    draft: photos.filter((p) => !p.is_published).length,
    featured: photos.filter((p) => p.is_featured).length,
  }

  // In de huidige view: hoeveel niet-gepubliceerd?
  const draftsInView = filtered.filter((p) => !p.is_published).length

  return (
    <>
      {/* Status filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter className="w-3.5 h-3.5 text-(--color-stone)" />
        {(Object.keys(FILTER_LABELS) as FilterKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
              filter === k
                ? 'bg-(--color-bronze) text-white border-(--color-bronze)'
                : 'bg-(--color-paper) border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-bronze)'
            }`}
          >
            {FILTER_LABELS[k]}
            <span className={`text-[10px] ${filter === k ? 'opacity-90' : 'opacity-60'}`}>
              ({counts[k]})
            </span>
          </button>
        ))}
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-(--color-frame)/50">
          <Tags className="w-3.5 h-3.5 text-(--color-stone)" />
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
              activeCategory === null
                ? 'bg-(--color-ink) text-white border-(--color-ink)'
                : 'bg-(--color-paper) border-(--color-frame) text-(--color-charcoal) hover:border-(--color-ink) hover:text-(--color-ink)'
            }`}
          >
            Toutes catégories
          </button>
          {categories.map(([slug, n]) => (
            <button
              key={slug}
              type="button"
              onClick={() => setActiveCategory(slug)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
                activeCategory === slug
                  ? 'bg-(--color-ink) text-white border-(--color-ink)'
                  : 'bg-(--color-paper) border-(--color-frame) text-(--color-charcoal) hover:border-(--color-ink) hover:text-(--color-ink)'
              }`}
            >
              {slug}
              <span className={`text-[10px] ${activeCategory === slug ? 'opacity-90' : 'opacity-60'}`}>
                ({n})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Bulk-action bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-20 bg-(--color-bronze) text-white shadow-lg px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3 rounded">
          <div className="inline-flex items-center gap-3 text-sm">
            <span className="font-semibold">{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-white/70 hover:text-white inline-flex items-center gap-1 text-xs"
            >
              <X className="w-3.5 h-3.5" /> Désélectionner
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BulkBtn icon={Eye} label="Publier" onClick={() => runBulk('publish')} pending={pending} />
            <BulkBtn icon={EyeOff} label="Cacher" onClick={() => runBulk('unpublish')} pending={pending} />
            <BulkBtn icon={Star} label="Coup de cœur" onClick={() => runBulk('feature')} pending={pending} />
            <BulkBtn icon={Star} label="Retirer cœur" onClick={() => runBulk('unfeature')} pending={pending} variant="muted" />
            <BulkBtn icon={Trash2} label="Supprimer" onClick={() => runBulk('delete')} pending={pending} variant="danger" />
          </div>
        </div>
      )}

      {error && (
        <p className="mb-3 inline-flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}

      {/* Toolbar: select-all + "publier tout" shortcut */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap text-xs text-(--color-stone)">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleAll}
              className="w-4 h-4"
            />
            <span>Tout sélectionner ({filtered.length})</span>
          </label>
          {draftsInView > 0 && (
            <button
              type="button"
              onClick={publishAllVisible}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 text-[10px] uppercase tracking-widest"
            >
              {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
              Publier les {draftsInView} brouillons
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-(--color-stone) py-10">
          Aucune photo dans cette vue.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => {
            const isSelected = selected.has(p.id)
            return (
              <div
                key={p.id}
                className={`relative group ${isSelected ? 'ring-2 ring-(--color-bronze)' : ''}`}
              >
                <Link
                  href={`/admin/boutique/photos/${p.id}`}
                  className={`block aspect-square overflow-hidden bg-(--color-frame)/40 border border-(--color-frame) rounded ${
                    p.is_published ? '' : 'opacity-60'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shopPhotoUrl(p.storage_path, p.bucket)}
                    alt={p.alt_text ?? p.title ?? p.slug}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                    loading="lazy"
                  />
                </Link>
                {/* Status badges */}
                <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none">
                  {p.is_featured && (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-(--color-bronze) text-white rounded-full">
                      <Star className="w-3 h-3 fill-white" />
                    </span>
                  )}
                  {p.is_published ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-700 text-white rounded-full">
                      <Eye className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-(--color-stone) text-white rounded-full">
                      <EyeOff className="w-3 h-3" />
                    </span>
                  )}
                </div>
                {/* Selectie checkbox linksboven */}
                <label
                  className={`absolute top-2 left-2 inline-flex items-center justify-center w-6 h-6 cursor-pointer rounded transition ${
                    isSelected
                      ? 'bg-(--color-bronze) text-white'
                      : 'bg-(--color-canvas)/80 text-(--color-charcoal) opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(p.id)}
                    className="sr-only"
                    aria-label={`Sélectionner ${p.title ?? p.slug}`}
                  />
                  <span className="text-xs">{isSelected ? '✓' : ''}</span>
                </label>
                <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                  <p className="text-white text-xs truncate">{p.title ?? p.slug}</p>
                  {p.category_slug && (
                    <p className="text-white/70 text-[9px] uppercase tracking-widest truncate">
                      {p.category_slug}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function BulkBtn({
  icon: Icon, label, onClick, pending, variant = 'default',
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  pending: boolean
  variant?: 'default' | 'muted' | 'danger'
}) {
  const cls =
    variant === 'danger'
      ? 'bg-red-700 hover:bg-red-800'
      : variant === 'muted'
      ? 'bg-(--color-bronze-dark)/80 hover:bg-(--color-bronze-dark)'
      : 'bg-white/15 hover:bg-white/25'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest text-white disabled:opacity-50 ${cls}`}
    >
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  )
}
