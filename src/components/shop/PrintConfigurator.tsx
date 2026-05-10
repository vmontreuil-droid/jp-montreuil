'use client'

import { useMemo, useState } from 'react'
import { ShoppingBag, Check, RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { useCart } from './CartProvider'

/**
 * Print-on-demand configurator: kies een materiaal + formaat → live
 * prijs uit de matrix → add-to-cart. Plain-data props zodat alles
 * server-side voorbereid wordt en we geen function-prop conflicten
 * hebben (Next 15+ Server -> Client).
 */

type Medium = { id: string; slug: string; name: string }
type Size = { id: string; slug: string; label: string }
type PriceCell = {
  mediaSlug: string
  sizeSlug: string
  priceCents: number
  priceFormatted: string
  isAvailable: boolean
}

type Orientation = 'portrait' | 'landscape'

export type PrintConfiguratorLabels = {
  material: string
  orientation: string
  portrait: string
  paysage: string
  portraitHint: string
  paysageHint: string
  format: string
  price: string
  addToCart: string
  added: string
  unavailable: string
  configMissing: string
}

const DEFAULT_LABELS: PrintConfiguratorLabels = {
  material: 'Matériau',
  orientation: 'Orientation',
  portrait: 'Portrait',
  paysage: 'Paysage',
  portraitHint: 'Format vertical (hauteur > largeur).',
  paysageHint: "Format horizontal (largeur > hauteur). Les dimensions s'adaptent.",
  format: 'Format',
  price: 'Prix',
  addToCart: 'Ajouter au panier',
  added: 'Ajouté',
  unavailable: 'Combinaison non disponible',
  configMissing: 'Configurateur non disponible.',
}

/** Swap "30×45 cm" → "45×30 cm" voor landscape; "S — 30×45 cm" → "S — 45×30 cm". */
function flipSizeLabel(label: string): string {
  return label.replace(/(\d+)\s*[×x]\s*(\d+)/, (_, a: string, b: string) => `${b}×${a}`)
}

export function PrintConfigurator({
  photoId,
  photoSlug,
  photoTitle,
  photoStoragePath,
  photoBucket,
  defaultOrientation,
  media,
  sizes,
  prices,
  labels = DEFAULT_LABELS,
}: {
  photoId: string
  photoSlug: string
  photoTitle: string
  photoStoragePath: string
  photoBucket?: string
  defaultOrientation?: Orientation | 'square'
  media: Medium[]
  sizes: Size[]
  prices: PriceCell[]
  labels?: PrintConfiguratorLabels
}) {
  const { add } = useCart()

  const firstAvail = prices.find((p) => p.isAvailable)
  const [mediaSlug, setMediaSlug] = useState<string | null>(firstAvail?.mediaSlug ?? null)
  const [sizeSlug, setSizeSlug] = useState<string | null>(firstAvail?.sizeSlug ?? null)
  const [orientation, setOrientation] = useState<Orientation>(
    defaultOrientation === 'landscape' ? 'landscape' : 'portrait',
  )
  const [done, setDone] = useState(false)

  const cellMap = useMemo(() => {
    const m = new Map<string, PriceCell>()
    for (const p of prices) m.set(`${p.mediaSlug}|${p.sizeSlug}`, p)
    return m
  }, [prices])

  const selected = mediaSlug && sizeSlug ? cellMap.get(`${mediaSlug}|${sizeSlug}`) : null
  const canAdd = selected != null && selected.isAvailable

  function onAdd() {
    if (!canAdd || !mediaSlug || !sizeSlug) return
    const m = media.find((x) => x.slug === mediaSlug)
    const s = sizes.find((x) => x.slug === sizeSlug)
    if (!m || !s) return
    const sizeLabel = orientation === 'landscape' ? flipSizeLabel(s.label) : s.label
    const orientLabel = orientation === 'landscape' ? labels.paysage : labels.portrait
    add({
      kind: 'photo_print',
      photoId,
      photoSlug,
      mediaSlug,
      sizeSlug,
      slug: photoSlug,
      title: photoTitle,
      variantLabel: `${m.name} — ${sizeLabel} (${orientLabel})`,
      unitPriceCents: selected.priceCents,
      storagePath: photoStoragePath,
      storageBucket: photoBucket,
    })
    setDone(true)
    setTimeout(() => setDone(false), 1500)
  }

  return (
    <div className="space-y-6">
      {/* Materiaal */}
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
                className={`px-3 py-2 text-sm border rounded transition-colors ${
                  sel ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 hover:border-stone-500'
                }`}
              >
                {m.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Orientation */}
      <div>
        <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">{labels.orientation}</p>
        <div className="grid grid-cols-2 gap-2">
          {(['portrait', 'landscape'] as const).map((o) => {
            const sel = o === orientation
            const Icon = o === 'portrait' ? RectangleVertical : RectangleHorizontal
            return (
              <button
                key={o}
                type="button"
                onClick={() => setOrientation(o)}
                className={`px-3 py-2 text-sm border rounded transition-colors inline-flex items-center justify-center gap-2 ${
                  sel ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 hover:border-stone-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                {o === 'portrait' ? labels.portrait : labels.paysage}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-stone-500 mt-1.5">
          {orientation === 'portrait' ? labels.portraitHint : labels.paysageHint}
        </p>
      </div>

      {/* Formaat */}
      <div>
        <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">{labels.format}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sizes.map((s) => {
            const sel = s.slug === sizeSlug
            const cell = mediaSlug ? cellMap.get(`${mediaSlug}|${s.slug}`) : null
            const disabled = !cell || !cell.isAvailable
            const displayLabel = orientation === 'landscape' ? flipSizeLabel(s.label) : s.label
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => !disabled && setSizeSlug(s.slug)}
                disabled={disabled}
                className={`px-3 py-2 text-sm border rounded transition-colors text-left ${
                  disabled
                    ? 'border-stone-200 opacity-40 cursor-not-allowed'
                    : sel
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 hover:border-stone-500'
                }`}
              >
                <div className="font-medium">{displayLabel}</div>
                <div className="text-xs opacity-75 mt-0.5">
                  {cell ? cell.priceFormatted : '—'}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Prijs + CTA */}
      <div className="border-t border-stone-200 pt-4">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-sm text-stone-500">{labels.price}</span>
          <span className="text-2xl font-semibold tabular-nums">
            {selected ? selected.priceFormatted : '—'}
          </span>
        </div>
        <button
          type="button"
          disabled={!canAdd}
          onClick={onAdd}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm rounded transition-colors"
        >
          {done ? <Check size={16} /> : <ShoppingBag size={16} />}
          {done ? labels.added : !canAdd ? labels.unavailable : labels.addToCart}
        </button>
      </div>
    </div>
  )
}
