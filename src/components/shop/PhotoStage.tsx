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

  const allSlugs = media.map((m) => m.slug)

  // Helper voor prijzen in compare-mode
  function priceFor(matSlug: string | null): string | null {
    if (!matSlug || !sizeSlug) return null
    const cell = prices.find((p) => p.mediaSlug === matSlug && p.sizeSlug === sizeSlug)
    return cell ? cell.priceFormatted : null
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
            price={priceFor(mediaSlug)}
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
              availableMaterialSlugs={allSlugs}
              onMaterialCycle={setMediaSlug}
            />
          </CompareCell>

          {/* Materiaal B — vrij in te stellen second-pick */}
          <CompareCell
            title={labels.previewCompareRight}
            mediaList={media}
            currentSlug={compareSlugB}
            onChange={setCompareSlugB}
            price={priceFor(compareSlugB)}
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
              availableMaterialSlugs={allSlugs}
              onMaterialCycle={setCompareSlugB}
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
          availableMaterialSlugs={allSlugs}
          onMaterialCycle={setMediaSlug}
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

/** Cell in de compare-grid: titel + materiaal-dropdown bovenaan,
 *  preview in het midden, prijs onderaan rechts. */
function CompareCell({
  title,
  mediaList,
  currentSlug,
  onChange,
  price,
  children,
}: {
  title: string
  mediaList: Medium[]
  currentSlug: string | null
  onChange: (slug: string) => void
  price: string | null
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
      {price && (
        <p className="text-right text-sm tabular-nums text-(--color-ink) font-medium">
          {price}
        </p>
      )}
    </div>
  )
}
