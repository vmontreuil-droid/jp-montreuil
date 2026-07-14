'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Download, X, Calendar, User, Image as ImageIcon, Loader2 } from 'lucide-react'
import type { Locale } from '@/i18n/config'

export type ViewerPhoto = {
  id: string
  filename: string | null
  /** verkleind (600×600) — voor het raster */
  thumb_url: string
  /** origineel op volle resolutie — voor de lightbox */
  url: string
  download_url: string
}

type Props = {
  locale: Locale
  title: string
  clientName: string | null
  eventDate: string | null
  photos: ViewerPhoto[]
}

const labels = {
  fr: {
    photos: 'photos',
    photo: 'photo',
    prev: 'Précédent',
    next: 'Suivant',
    close: 'Fermer',
    download: 'Télécharger',
    empty: 'Album vide pour le moment.',
    intro: 'Cliquez sur une photo pour l’agrandir et la télécharger.',
  },
  nl: {
    photos: 'foto’s',
    photo: 'foto',
    prev: 'Vorige',
    next: 'Volgende',
    close: 'Sluiten',
    download: 'Downloaden',
    empty: 'Album is voorlopig leeg.',
    intro: 'Klik op een foto om ze te vergroten en te downloaden.',
  },
} as const

export default function AlbumViewer({
  locale,
  title,
  clientName,
  eventDate,
  photos,
}: Props) {
  const t = labels[locale]
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  // Toont een spinner zolang de volle-resolutie foto in de lightbox laadt.
  const [hiResLoaded, setHiResLoaded] = useState(false)

  const open = useCallback((i: number) => {
    setHiResLoaded(false)
    setOpenIdx(i)
  }, [])
  const close = useCallback(() => setOpenIdx(null), [])
  const next = useCallback(() => {
    setHiResLoaded(false)
    setOpenIdx((i) => (i === null ? null : (i + 1) % photos.length))
  }, [photos.length])
  const prev = useCallback(() => {
    setHiResLoaded(false)
    setOpenIdx((i) => (i === null ? null : (i - 1 + photos.length) % photos.length))
  }, [photos.length])

  useEffect(() => {
    if (openIdx === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Verbergt de vaste sub-footer, die anders over de download-balk valt.
    document.body.classList.add('modal-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
    }
  }, [openIdx, close, next, prev])

  // Swipe: horizontaal = vorige/volgende, verticaal naar beneden = sluiten.
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const p = e.touches[0]
    touchStart.current = { x: p.clientX, y: p.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const p = e.changedTouches[0]
    const dx = p.clientX - start.x
    const dy = p.clientY - start.y
    const MIN = 50
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx <= -MIN) next()
      else if (dx >= MIN) prev()
    } else if (dy >= 80) {
      close()
    }
  }

  const active = openIdx === null ? null : photos[openIdx]

  return (
    <main className="min-h-screen px-4 sm:px-6 md:px-10 py-10 md:py-14">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 md:mb-12">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-bronze) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-3xl md:text-5xl font-[family-name:var(--font-display)] text-(--color-ink) leading-tight">
          {title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-(--color-stone)">
          {clientName && (
            <span className="inline-flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {clientName}
            </span>
          )}
          {eventDate && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(eventDate).toLocaleDateString(locale === 'fr' ? 'fr-BE' : 'nl-BE')}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            {photos.length} {photos.length === 1 ? t.photo : t.photos}
          </span>
        </div>
        {photos.length > 0 && (
          <p className="mt-3 text-sm text-(--color-charcoal)">{t.intro}</p>
        )}
      </header>

      {/* Grid */}
      <div className="max-w-6xl mx-auto">
        {photos.length === 0 ? (
          <p className="text-(--color-stone) text-center py-20">{t.empty}</p>
        ) : (
          /* Masonry via CSS-kolommen: elke foto behoudt haar eigen verhouding,
             geen vierkante crop meer. */
          <div className="columns-2 sm:columns-3 md:columns-4 gap-2 md:gap-3">
            {photos.map((p, i) => (
              /* De download-link mag niet ín de knop staan (ongeldige HTML,
                 de klik gaat dan verloren) — vandaar broer i.p.v. kind. */
              <div
                key={p.id}
                className="group relative mb-2 md:mb-3 break-inside-avoid bg-(--color-paper) overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => open(i)}
                  className="block w-full cursor-zoom-in"
                  aria-label={p.filename ?? `Photo ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumb_url}
                    alt={p.filename ?? ''}
                    loading="lazy"
                    className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                  />
                </button>
                <a
                  href={p.download_url}
                  download={p.filename ?? true}
                  className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-(--color-bronze) text-white transition-opacity md:opacity-0 md:group-hover:opacity-100"
                  aria-label={t.download}
                  title={t.download}
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {active && openIdx !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center touch-pan-y"
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Close */}
          <button
            type="button"
            onClick={close}
            aria-label={t.close}
            className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              aria-label={t.prev}
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 p-3 md:p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-[92vw] max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Spinner zolang de volle-resolutie foto laadt */}
            {!hiResLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-white/70 animate-spin" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={active.id}
              src={active.url}
              alt={active.filename ?? ''}
              onLoad={() => setHiResLoaded(true)}
              className={`max-w-full max-h-[80vh] object-contain transition-opacity duration-300 ${
                hiResLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>

          {/* Next */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              aria-label={t.next}
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 p-3 md:p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-colors"
            >
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}

          {/* Bottom bar — boven de home-indicator / browserbalk houden */}
          <div
            className="absolute left-0 right-0 flex justify-center pointer-events-none"
            style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
          >
            <div
              className="pointer-events-auto flex items-center gap-3 px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 text-white text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="opacity-80">
                {openIdx + 1} / {photos.length}
              </span>
              {active.filename && (
                <span className="opacity-60 hidden sm:inline truncate max-w-xs">
                  {active.filename}
                </span>
              )}
              <a
                href={active.download_url}
                download={active.filename ?? true}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-(--color-bronze) hover:bg-(--color-bronze-dark) transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {t.download}
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
