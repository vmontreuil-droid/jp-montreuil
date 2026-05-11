'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, X, ShoppingBag, Check, Search, Heart, Grid2x2, Rows3, Columns2, LayoutGrid } from 'lucide-react'
import { useCart } from '@/components/shop/CartProvider'
import { useWishlist } from '@/components/shop/WishlistProvider'
import { FramedPreview, type FramedPreviewLabels } from '@/components/shop/FramedPreview'
import { flipSizeLabel, type PrintConfiguratorLabels } from '@/components/shop/PrintConfigurator'

type Photo = {
  id: string
  slug: string
  title: string | null
  alt: string
  url: string
  storagePath: string
  bucket: string
}
type Medium = { id: string; slug: string; name: string }
type Size = { id: string; slug: string; label: string }
type PriceCell = {
  mediaSlug: string
  sizeSlug: string
  priceCents: number
  priceFormatted: string
  isAvailable: boolean
}

/**
 * Layout-presets — elke layout definieert:
 *  - slots: aantal cellen
 *  - className: tailwind grid-template
 *  - cellClass(idx): per-cel CSS (bv. col-span / row-span voor salon)
 *  - aspect(idx): per-cel aspect ratio (mag verschillend zijn)
 */
type LayoutKey = 'triptych' | 'salon' | 'diptyque' | 'stack'

const LAYOUTS: Record<LayoutKey, {
  slots: number
  containerClass: string
  cellClass: (idx: number) => string
}> = {
  triptych: {
    slots: 3,
    containerClass: 'grid grid-cols-3',
    cellClass: () => '',
  },
  salon: {
    // 1 grote bovenaan, 2 kleinere eronder
    slots: 3,
    containerClass: 'grid grid-cols-2 grid-rows-[auto_auto]',
    cellClass: (idx) => idx === 0 ? 'col-span-2' : '',
  },
  diptyque: {
    slots: 2,
    containerClass: 'grid grid-cols-2',
    cellClass: () => '',
  },
  stack: {
    // 3 verticaal gestapeld
    slots: 3,
    containerClass: 'grid grid-cols-1 max-w-md mx-auto',
    cellClass: () => '',
  },
}

export function CompositionBuilder({
  photos,
  media,
  sizes,
  prices,
  labels,
  locale,
}: {
  photos: Photo[]
  media: Medium[]
  sizes: Size[]
  prices: PriceCell[]
  labels: PrintConfiguratorLabels
  locale: 'fr' | 'nl'
}) {
  const { add } = useCart()
  const { ids: wishlistIds, hydrated: wishlistHydrated } = useWishlist()

  const firstAvail = prices.find((p) => p.isAvailable)
  const [mediaSlug, setMediaSlug] = useState<string | null>(firstAvail?.mediaSlug ?? null)
  const [sizeSlug, setSizeSlug] = useState<string | null>(firstAvail?.sizeSlug ?? null)
  const [layout, setLayout] = useState<LayoutKey>('triptych')
  const [spacing, setSpacing] = useState<number>(2) // cm tussen frames, 0-30
  const [slots, setSlots] = useState<(Photo | null)[]>(() =>
    Array.from({ length: 3 }, (_, i) => photos[i] ?? null),
  )
  const [pickerSlot, setPickerSlot] = useState<number | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [done, setDone] = useState(false)
  const [usedWishlistDefaults, setUsedWishlistDefaults] = useState(false)

  // Auto-fill slots vanuit wishlist (een keer, na hydration)
  useEffect(() => {
    if (!wishlistHydrated || usedWishlistDefaults) return
    setUsedWishlistDefaults(true)
    if (wishlistIds.size === 0) return
    const wished = photos.filter((p) => wishlistIds.has(p.id))
    if (wished.length === 0) return
    setSlots(Array.from({ length: 3 }, (_, i) => wished[i] ?? photos[i] ?? null))
  }, [wishlistHydrated, wishlistIds, photos, usedWishlistDefaults])

  // Layout-switch: pas slot-count aan
  useEffect(() => {
    const target = LAYOUTS[layout].slots
    setSlots((prev) => {
      if (prev.length === target) return prev
      if (prev.length < target) {
        const extra = Array.from({ length: target - prev.length }, (_, i) => photos[prev.length + i] ?? null)
        return [...prev, ...extra]
      }
      return prev.slice(0, target)
    })
  }, [layout, photos])

  const cellMap = useMemo(() => {
    const m = new Map<string, PriceCell>()
    for (const p of prices) m.set(`${p.mediaSlug}|${p.sizeSlug}`, p)
    return m
  }, [prices])

  const sizeForLabel = sizes.find((s) => s.slug === sizeSlug)
  const sizeLabel = sizeForLabel?.label ?? null
  const mediaName = media.find((m) => m.slug === mediaSlug)?.name ?? null
  const selectedCell = mediaSlug && sizeSlug ? cellMap.get(`${mediaSlug}|${sizeSlug}`) : null

  const filledSlots = slots.filter((s): s is Photo => s !== null)
  const totalCents = (selectedCell?.priceCents ?? 0) * filledSlots.length
  const fmt = new Intl.NumberFormat(locale === 'nl' ? 'nl-BE' : 'fr-BE', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  })
  const totalFormatted = fmt.format(totalCents / 100)

  const previewLabels: FramedPreviewLabels = {
    cropHint: labels.previewCropHint,
    zoom: labels.previewZoom,
    close: labels.previewClose,
    onWall: labels.previewOnWall,
    portrait: labels.portrait,
    paysage: labels.paysage,
    wallBeige: labels.wallBeige,
    wallWhite: labels.wallWhite,
    wallDark: labels.wallDark,
    wallRoom: labels.wallRoom,
    save: labels.previewSave,
    saveDone: labels.previewSaveDone,
    share: labels.previewShare,
    shareCopied: labels.previewShareCopied,
  }

  function pickPhoto(idx: number, photo: Photo) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? photo : s)))
    setPickerSlot(null)
    setPickerSearch('')
  }
  function clearSlot(idx: number) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? null : s)))
  }

  function onAddAll() {
    if (!mediaSlug || !sizeSlug || !selectedCell) return
    const m = media.find((x) => x.slug === mediaSlug)
    const s = sizes.find((x) => x.slug === sizeSlug)
    if (!m || !s) return
    for (const photo of filledSlots) {
      add({
        kind: 'photo_print',
        photoId: photo.id,
        photoSlug: photo.slug,
        mediaSlug,
        sizeSlug,
        slug: photo.slug,
        title: photo.title ?? photo.slug,
        variantLabel: `${m.name} — ${s.label} (${labels.portrait})`,
        unitPriceCents: selectedCell.priceCents,
        storagePath: photo.storagePath,
        storageBucket: photo.bucket,
      })
    }
    setDone(true)
    setTimeout(() => setDone(false), 1800)
  }

  const filteredPhotos = pickerSearch
    ? photos.filter((p) =>
        (p.title ?? p.slug).toLowerCase().includes(pickerSearch.toLowerCase()),
      )
    : photos

  // Spacing: 1 cm in echte wand ≈ 4 px in preview-grid (visuele
  // proxy — niet 1:1 schaal, maar voldoende om verschil te zien).
  const gapPx = Math.round(spacing * 4)
  const layoutDef = LAYOUTS[layout]
  const slotLabels = (idx: number) => {
    if (layoutDef.slots === 2) {
      return idx === 0 ? labels.triptychLeft : labels.triptychRight
    }
    if (layout === 'salon') {
      return idx === 0 ? labels.triptychCenter : (idx === 1 ? labels.triptychLeft : labels.triptychRight)
    }
    return idx === 0 ? labels.triptychLeft : (idx === 1 ? labels.triptychCenter : labels.triptychRight)
  }

  return (
    <div className="space-y-8">
      {/* Layout + spacing picker */}
      <div className="bg-(--color-paper) border border-(--color-frame) p-5 rounded space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">{labels.compositionLayout}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { key: 'triptych', Icon: Columns2, lbl: labels.compositionLayoutTriptych },
                { key: 'salon',    Icon: LayoutGrid, lbl: labels.compositionLayoutSalon },
                { key: 'diptyque', Icon: Grid2x2, lbl: labels.compositionLayoutDiptyque },
                { key: 'stack',    Icon: Rows3, lbl: labels.compositionLayoutStack },
              ] as const
            ).map(({ key, Icon, lbl }) => {
              const sel = key === layout
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLayout(key)}
                  className={`px-3 py-2 text-sm border rounded transition-colors inline-flex items-center gap-2 ${
                    sel ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 hover:border-stone-500'
                  }`}
                  aria-pressed={sel}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate">{lbl}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-stone-500">{labels.compositionSpacing}</p>
            <span className="text-xs text-(--color-stone) tabular-nums">{spacing} cm</span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={spacing}
            onChange={(e) => setSpacing(Number(e.target.value))}
            className="w-full accent-(--color-bronze)"
            aria-label={labels.compositionSpacing}
          />
        </div>

        {usedWishlistDefaults && wishlistIds.size > 0 && (
          <p className="text-xs text-(--color-bronze) inline-flex items-center gap-1.5">
            <Heart className="w-3 h-3" />
            {labels.compositionFromWishlist}
          </p>
        )}
      </div>

      {/* Materiaal + formaat picker */}
      <div className="grid sm:grid-cols-2 gap-6 bg-(--color-paper) border border-(--color-frame) p-5 rounded">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">{labels.material}</p>
          <div className="grid grid-cols-2 gap-2">
            {media.map((m) => {
              const sel = m.slug === mediaSlug
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMediaSlug(m.slug)}
                  className={`px-3 py-2 text-sm border rounded transition-colors truncate ${
                    sel ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 hover:border-stone-500'
                  }`}
                >
                  {m.name}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">{labels.format}</p>
          <div className="grid grid-cols-3 gap-2">
            {sizes.map((s) => {
              const sel = s.slug === sizeSlug
              const cell = mediaSlug ? cellMap.get(`${mediaSlug}|${s.slug}`) : null
              const disabled = !cell || !cell.isAvailable
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setSizeSlug(s.slug)}
                  className={`px-2 py-1.5 text-xs border rounded transition-colors ${
                    disabled
                      ? 'border-stone-200 opacity-40 cursor-not-allowed'
                      : sel
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-300 hover:border-stone-500'
                  }`}
                >
                  <div className="font-medium">{flipSizeLabel(s.label)}</div>
                  <div className="opacity-75">{cell?.priceFormatted ?? '—'}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Slots — layout-aware */}
      <div className={layoutDef.containerClass} style={{ gap: gapPx }}>
        {slots.map((photo, idx) => (
          <div key={idx} className={`space-y-2 ${layoutDef.cellClass(idx)}`}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone)">
              {slotLabels(idx)}
            </p>
            {photo ? (
              <div className="relative">
                <FramedPreview
                  photoUrl={photo.url}
                  alt={photo.alt}
                  mediaSlug={mediaSlug}
                  mediaName={mediaName}
                  sizeLabel={sizeLabel}
                  orientation="portrait"
                  naturalAspect={null}
                  labels={previewLabels}
                  showActions={false}
                />
                <button
                  type="button"
                  onClick={() => clearSlot(idx)}
                  className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/85 backdrop-blur-sm hover:bg-white text-stone-700 transition-colors"
                  aria-label="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPickerSlot(idx)}
                className="w-full aspect-[4/5] border-2 border-dashed border-stone-300 hover:border-(--color-bronze) rounded text-stone-400 hover:text-(--color-bronze) inline-flex flex-col items-center justify-center gap-2 transition-colors text-xs uppercase tracking-[0.2em]"
              >
                <Plus className="w-6 h-6" />
                {labels.compositionEmptySlot}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add all to cart */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-4 border-t border-(--color-frame)">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500">
            {filledSlots.length} × {sizeLabel ?? '—'} {mediaName ? `· ${mediaName}` : ''}
          </p>
          <p className="text-2xl font-semibold tabular-nums text-(--color-ink)">
            {totalFormatted}
          </p>
        </div>
        <button
          type="button"
          disabled={!selectedCell || filledSlots.length === 0}
          onClick={onAddAll}
          className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm rounded transition-colors"
        >
          {done ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
          {done ? labels.compositionAdded : labels.compositionAddAll}
        </button>
      </div>

      {/* Photo picker modal */}
      {pickerSlot !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPickerSlot(null)}
        >
          <div
            className="bg-white rounded-md w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-stone-200 flex items-center gap-3">
              <h3 className="text-sm uppercase tracking-widest text-stone-500 flex-1">
                {labels.compositionPickerTitle}
              </h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                <input
                  type="search"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder={labels.compositionPickerSearch}
                  className="pl-7 pr-3 py-1.5 text-sm border border-stone-300 rounded"
                />
              </div>
              <button
                type="button"
                onClick={() => setPickerSlot(null)}
                className="text-stone-500 hover:text-stone-900"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {filteredPhotos.map((p) => {
                  const isWished = wishlistIds.has(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => pickPhoto(pickerSlot, p)}
                      className="group relative aspect-square border border-stone-200 hover:border-(--color-bronze) overflow-hidden rounded transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt={p.alt}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                        loading="lazy"
                      />
                      {isWished && (
                        <Heart
                          className="absolute top-1.5 right-1.5 w-4 h-4 text-(--color-bronze) fill-(--color-bronze)"
                          aria-label="Favori"
                        />
                      )}
                      <span className="absolute inset-x-0 bottom-0 px-2 py-1 text-[10px] text-white bg-black/55 truncate">
                        {p.title ?? p.slug}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
