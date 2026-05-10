'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X, ArrowRight, Heart, MapPin, Calendar } from 'lucide-react'
import { WishlistButton } from './WishlistButton'
import { shopPhotoUrl } from '@/lib/shop/photo-url'

type QuickViewPhoto = {
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
}

/**
 * Quick-view modal — toont een grotere preview + metadata + CTA naar
 * de volledige configurator-pagina. Bedoeld om snel meerdere foto's
 * door te bladeren zonder elke keer te navigeren.
 *
 * Geen body-scroll lock want close-via-backdrop is voldoende UX. ESC
 * sluit ook.
 */
export default function QuickViewModal({
  photo,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  photo: QuickViewPhoto
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      else if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    document.addEventListener('keydown', onKey)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = original
    }
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.title ?? photo.slug}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-4 right-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Prev / Next */}
      {hasPrev && (
        <button
          type="button"
          onClick={onPrev}
          aria-label="Précédent"
          className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl"
        >
          ‹
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={onNext}
          aria-label="Suivant"
          className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl"
        >
          ›
        </button>
      )}

      <div className="bg-(--color-canvas) max-w-5xl w-full max-h-[90vh] overflow-y-auto grid md:grid-cols-[1fr_320px]">
        {/* Image */}
        <div className="bg-black flex items-center justify-center relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shopPhotoUrl(photo.storage_path, photo.bucket)}
            alt={photo.alt}
            className="max-h-[60vh] md:max-h-[90vh] w-auto h-auto object-contain"
          />
          <WishlistButton
            photoId={photo.id}
            className="absolute top-3 right-3"
            size={18}
          />
        </div>

        {/* Info */}
        <div className="p-6 flex flex-col">
          <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-2 inline-flex items-center gap-2">
            <Heart className="w-3 h-3" />
            Aperçu
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-3 leading-tight">
            {photo.title ?? photo.slug}
          </h2>

          <ul className="text-xs text-(--color-stone) space-y-1.5 mb-4">
            {photo.species && (
              <li className="inline-flex items-center gap-1.5">
                <span className="text-(--color-bronze)">●</span>
                <span>{photo.species}</span>
              </li>
            )}
            {photo.taken_at_location && (
              <li className="inline-flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                <span>{photo.taken_at_location}</span>
              </li>
            )}
            {photo.taken_at && (
              <li className="inline-flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                <span>{new Date(photo.taken_at).toLocaleDateString('fr-BE', { dateStyle: 'long' })}</span>
              </li>
            )}
          </ul>

          {photo.description && (
            <p className="text-sm text-(--color-charcoal) leading-relaxed mb-6">
              {photo.description}
            </p>
          )}

          <Link
            href={`/shop/boutique/photo/${photo.slug}`}
            className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] transition-colors"
          >
            Personnaliser & ajouter
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <p className="mt-3 text-[10px] text-(--color-stone) text-center">
            ESC pour fermer · ← → pour naviguer
          </p>
        </div>
      </div>
    </div>
  )
}
