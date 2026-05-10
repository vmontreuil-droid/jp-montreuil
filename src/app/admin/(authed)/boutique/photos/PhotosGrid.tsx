'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import {
  Eye, EyeOff, Star, Trash2, Loader2, AlertCircle, X, Filter,
} from 'lucide-react'
import { shopPhotoUrl } from '@/lib/shop/photo-url'
import { bulkPhotoAction } from './actions'

type PhotoMini = {
  id: string
  slug: string
  title: string | null
  alt_text: string | null
  storage_path: string
  is_published: boolean
  is_featured: boolean
}

type FilterKey = 'all' | 'published' | 'draft' | 'featured'

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'Toutes',
  published: 'Publiées',
  draft: 'Brouillons',
  featured: 'Coups de cœur',
}

/**
 * Admin photos lijst met checkboxes + bulk-action bar + filter.
 * Klikken op de afbeelding zelf gaat naar de detail-pagina; klikken op
 * de checkbox-zone selecteert (handig voor batch-acties).
 */
export default function PhotosGrid({ photos }: { photos: PhotoMini[] }) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    switch (filter) {
      case 'published': return photos.filter((p) => p.is_published)
      case 'draft':     return photos.filter((p) => !p.is_published)
      case 'featured':  return photos.filter((p) => p.is_featured)
      default:          return photos
    }
  }, [photos, filter])

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

  const counts = {
    all: photos.length,
    published: photos.filter((p) => p.is_published).length,
    draft: photos.filter((p) => !p.is_published).length,
    featured: photos.filter((p) => p.is_featured).length,
  }

  return (
    <>
      {/* Filter pills */}
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

      {/* Toolbar: select-all */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mb-3 text-xs text-(--color-stone)">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleAll}
              className="w-4 h-4"
            />
            <span>Tout sélectionner ({filtered.length})</span>
          </label>
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
                    src={shopPhotoUrl(p.storage_path)}
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
