'use client'

import { useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { WishlistButton } from './WishlistButton'
import { FramedPreview, type FramedPreviewLabels } from './FramedPreview'
import {
  PrintConfigurator,
  flipSizeLabel,
  type PrintConfiguratorLabels,
} from './PrintConfigurator'

/**
 * Combineert links de in-kader preview en rechts de configurator. Beide
 * delen hier dezelfde state zodat het mockup-kader meeschaalt met de
 * keuze in de configurator. De page geeft via `rightHeader` de
 * statische metadata (eyebrow / titel / soort / beschrijving) door, die
 * boven de configurator verschijnt.
 *
 * Compare-mode: een toggle in de configurator schakelt over naar een
 * full-width 2-koloms layout waarin twee FramedPreviews naast elkaar
 * verschijnen voor hetzelfde formaat. Configurator + metadata
 * verdwijnen tijdelijk.
 */

type Orientation = 'portrait' | 'landscape'

type Medium = { id: string; slug: string; name: string; description?: string | null }
type Size = { id: string; slug: string; label: string }
type PriceCell = {
  mediaSlug: string
  sizeSlug: string
  priceCents: number
  priceFormatted: string
  isAvailable: boolean
}

export function PhotoStage({
  photoId,
  photoSlug,
  photoTitle,
  photoUrl,
  photoAlt,
  photoStoragePath,
  photoBucket,
  photoNaturalWidth,
  photoNaturalHeight,
  defaultOrientation,
  media,
  sizes,
  prices,
  labels,
  rightHeader,
}: {
  photoId: string
  photoSlug: string
  photoTitle: string
  photoUrl: string
  photoAlt: string
  photoStoragePath: string
  photoBucket?: string
  photoNaturalWidth?: number | null
  photoNaturalHeight?: number | null
  defaultOrientation?: Orientation | 'square'
  media: Medium[]
  sizes: Size[]
  prices: PriceCell[]
  labels: PrintConfiguratorLabels
  rightHeader: ReactNode
}) {
  const firstAvail = prices.find((p) => p.isAvailable)
  const [mediaSlug, setMediaSlug] = useState<string | null>(firstAvail?.mediaSlug ?? null)
  const [sizeSlug, setSizeSlug] = useState<string | null>(firstAvail?.sizeSlug ?? null)
  const [orientation, setOrientation] = useState<Orientation>(
    defaultOrientation === 'landscape' ? 'landscape' : 'portrait',
  )
  // Compare-mode state. Het tweede materiaal default naar het eerstvolgende
  // dat verschilt van het primaire materiaal.
  const [compareOpen, setCompareOpen] = useState(false)
  const fallbackB = media.find((m) => m.slug !== mediaSlug)?.slug ?? media[0]?.slug ?? null
  const [compareSlugB, setCompareSlugB] = useState<string | null>(fallbackB)

  const sizeForLabel = sizes.find((s) => s.slug === sizeSlug)
  const sizeLabel = sizeForLabel
    ? orientation === 'landscape' ? flipSizeLabel(sizeForLabel.label) : sizeForLabel.label
    : null
  const mediaForName = media.find((m) => m.slug === mediaSlug)
  const mediaName = mediaForName?.name ?? null
  const mediaForB = media.find((m) => m.slug === compareSlugB)
  const mediaNameB = mediaForB?.name ?? null

  const naturalAspect =
    photoNaturalWidth && photoNaturalHeight
      ? photoNaturalWidth / photoNaturalHeight
      : null

  const previewLabels: FramedPreviewLabels = {
    cropHint: labels.previewCropHint,
    zoom: labels.previewZoom,
    close: labels.previewClose,
    onWall: labels.previewOnWall,
    portrait: labels.portrait,
    paysage: labels.paysage,
  }

  // ── Compare-mode: full-width 2-kolom layout, configurator verborgen ──
  if (compareOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs uppercase tracking-[0.25em] text-(--color-bronze)">
            {labels.previewCompare}
            {sizeLabel && <span className="ml-3 text-(--color-stone) tracking-widest">· {sizeLabel}</span>}
          </p>
          <button
            type="button"
            onClick={() => setCompareOpen(false)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-(--color-stone) border border-(--color-frame) rounded hover:border-(--color-stone) hover:text-(--color-ink) transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            {labels.previewCompareExit}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Materiaal A — gekozen materiaal uit configurator */}
          <CompareCell
            title={labels.previewCompareLeft}
            mediaList={media}
            currentSlug={mediaSlug}
            onChange={setMediaSlug}
          >
            <FramedPreview
              photoUrl={photoUrl}
              alt={photoAlt}
              mediaSlug={mediaSlug}
              mediaName={mediaName}
              sizeLabel={sizeLabel}
              orientation={orientation}
              naturalAspect={naturalAspect}
              labels={previewLabels}
            />
          </CompareCell>

          {/* Materiaal B — vrij in te stellen second-pick */}
          <CompareCell
            title={labels.previewCompareRight}
            mediaList={media}
            currentSlug={compareSlugB}
            onChange={setCompareSlugB}
          >
            <FramedPreview
              photoUrl={photoUrl}
              alt={photoAlt}
              mediaSlug={compareSlugB}
              mediaName={mediaNameB}
              sizeLabel={sizeLabel}
              orientation={orientation}
              naturalAspect={naturalAspect}
              labels={previewLabels}
            />
          </CompareCell>
        </div>
      </div>
    )
  }

  // ── Standaard layout: preview + configurator naast elkaar ──
  return (
    <div className="grid md:grid-cols-2 gap-10">
      {/* Live preview in gekozen kader */}
      <div className="relative">
        <FramedPreview
          photoUrl={photoUrl}
          alt={photoAlt}
          mediaSlug={mediaSlug}
          mediaName={mediaName}
          sizeLabel={sizeLabel}
          orientation={orientation}
          naturalAspect={naturalAspect}
          labels={previewLabels}
        />
        <WishlistButton
          photoId={photoId}
          className="absolute top-3 right-3 z-10"
          size={18}
        />
      </div>

      {/* Rechts: metadata + configurator */}
      <div>
        {rightHeader}
        <PrintConfigurator
          photoId={photoId}
          photoSlug={photoSlug}
          photoTitle={photoTitle}
          photoStoragePath={photoStoragePath}
          photoBucket={photoBucket}
          defaultOrientation={defaultOrientation}
          media={media}
          sizes={sizes}
          prices={prices}
          labels={labels}
          controlledMediaSlug={mediaSlug}
          controlledSizeSlug={sizeSlug}
          controlledOrientation={orientation}
          onMediaSlugChange={setMediaSlug}
          onSizeSlugChange={setSizeSlug}
          onOrientationChange={setOrientation}
          onCompareClick={() => setCompareOpen(true)}
        />
      </div>
    </div>
  )
}

/** Cell in de compare-grid: titel + materiaal-dropdown bovenaan, preview eronder. */
function CompareCell({
  title,
  mediaList,
  currentSlug,
  onChange,
  children,
}: {
  title: string
  mediaList: Medium[]
  currentSlug: string | null
  onChange: (slug: string) => void
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone)">
          {title}
        </span>
        <select
          value={currentSlug ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs border border-(--color-frame) bg-white rounded px-2 py-1 max-w-[60%] truncate"
        >
          {mediaList.map((m) => (
            <option key={m.id} value={m.slug}>{m.name}</option>
          ))}
        </select>
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
