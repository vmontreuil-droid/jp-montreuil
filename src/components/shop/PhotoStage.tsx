'use client'

import { useState, type ReactNode } from 'react'
import { WishlistButton } from './WishlistButton'
import { FramedPreview } from './FramedPreview'
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
 */

type Orientation = 'portrait' | 'landscape'

type Medium = { id: string; slug: string; name: string }
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
  /** Optioneel — gebruikt om crop-hint te tonen wanneer foto-aspect
   *  sterk afwijkt van het gekozen kader. */
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

  const sizeForLabel = sizes.find((s) => s.slug === sizeSlug)
  const sizeLabel = sizeForLabel
    ? orientation === 'landscape' ? flipSizeLabel(sizeForLabel.label) : sizeForLabel.label
    : null

  const naturalAspect =
    photoNaturalWidth && photoNaturalHeight
      ? photoNaturalWidth / photoNaturalHeight
      : null

  return (
    <div className="grid md:grid-cols-2 gap-10">
      {/* Live preview in gekozen kader */}
      <div className="relative">
        <FramedPreview
          photoUrl={photoUrl}
          alt={photoAlt}
          mediaSlug={mediaSlug}
          sizeLabel={sizeLabel}
          orientation={orientation}
          naturalAspect={naturalAspect}
          labels={{
            cropHint: labels.previewCropHint,
            zoom: labels.previewZoom,
            close: labels.previewClose,
            onWall: labels.previewOnWall,
            portrait: labels.portrait,
            paysage: labels.paysage,
          }}
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
        />
      </div>
    </div>
  )
}
