'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { workImageUrl } from '@/lib/links'
import ShareButtons from './ShareButtons'

export type LightboxWork = {
  id: string
  storage_path: string
  title?: string | null
  year?: number | null
}

type Props = {
  works: LightboxWork[]
  startIndex: number
  onClose: () => void
  prevLabel?: string
  nextLabel?: string
  closeLabel?: string
  locale: 'fr' | 'nl'
}

export default function Lightbox({
  works,
  startIndex,
  onClose,
  prevLabel = 'Précédent',
  nextLabel = 'Suivant',
  closeLabel = 'Fermer',
  locale,
}: Props) {
  const [index, setIndex] = useState(startIndex)

  const next = useCallback(
    () => setIndex((i) => (i + 1) % works.length),
    [works.length]
  )
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + works.length) % works.length),
    [works.length]
  )

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [next, prev, onClose])

  // Body scroll lock
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  const work = works[index]
  if (!work) return null

  const titleText = work.title || ''
  const yearText = work.year ? `${work.year}` : ''

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation()
  const blockContextMenu = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titleText || `Image ${index + 1} / ${works.length}`}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
      onContextMenu={blockContextMenu}
    >
      {/* Sluit-knop — duidelijk zichtbaar rechtsboven */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label={closeLabel}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-10 inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm uppercase tracking-wider transition-colors"
      >
        <X className="w-5 h-5" />
        <span className="hidden sm:inline">{closeLabel}</span>
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs tracking-wider">
        {index + 1} / {works.length}
      </div>

      {/* Vorige */}
      {works.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            prev()
          }}
          aria-label={prevLabel}
          className="absolute left-2 md:left-6 z-10 p-3 md:p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
        </button>
      )}

      {/* Volgende */}
      {works.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            next()
          }}
          aria-label={nextLabel}
          className="absolute right-2 md:right-6 z-10 p-3 md:p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-colors"
        >
          <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
        </button>
      )}

      {/* Afbeelding — onkopieerbaar via pointer-events op overlay */}
      <div
        className="relative w-[92vw] h-[78vh] md:w-[88vw] md:h-[82vh] no-save"
        onClick={stopPropagation}
        onContextMenu={blockContextMenu}
        onDragStart={(e) => e.preventDefault()}
      >
        <Image
          src={workImageUrl(work.storage_path)}
          alt={titleText}
          fill
          sizes="92vw"
          quality={90}
          priority
          draggable={false}
          className="object-contain select-none"
        />
        {/* Onzichtbare overlay vangt right-click + drag op */}
        <div
          className="absolute inset-0"
          onContextMenu={blockContextMenu}
          onDragStart={(e) => e.preventDefault()}
        />
      </div>

      {/* Caption + share, onderaan */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        {(titleText || yearText) && (
          <div className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm">
            {titleText}
            {titleText && yearText ? ' · ' : ''}
            {yearText}
          </div>
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <ShareButtons
            title={titleText || `Atelier Montreuil — ${index + 1} / ${works.length}`}
            compact
            locale={locale}
          />
        </div>
      </div>
    </div>
  )
}
