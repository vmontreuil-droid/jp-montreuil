'use client'

import { useMemo, useState } from 'react'
import {
  ShoppingBag, Check, RectangleHorizontal, RectangleVertical,
  Frame, FileImage, Square, Sparkles, Star,
} from 'lucide-react'
import { useCart } from './CartProvider'

export type FrameColor = 'oak' | 'black' | 'white'

/** "S — 30×45 cm" → { w: 30, h: 45 }. Voor SizeIndicator-rendering. */
function parseSizeDims(label: string): { w: number; h: number } | null {
  const m = label.match(/(\d+)\s*[×x]\s*(\d+)/)
  if (!m) return null
  return { w: Number(m[1]), h: Number(m[2]) }
}

/** Mini-rechthoek met relatieve afmetingen t.o.v. het grootste formaat
 *  in de lijst. Geeft een visuele schaal-cue naast de cm-tekst. */
function SizeIndicator({
  label,
  maxLong,
  selected,
  disabled,
  orientation,
}: {
  label: string
  /** Langste-kant van het grootste beschikbare formaat in cm. */
  maxLong: number
  selected: boolean
  disabled: boolean
  orientation: 'portrait' | 'landscape'
}) {
  const dims = parseSizeDims(label)
  if (!dims) return null
  const w = orientation === 'landscape' ? Math.max(dims.w, dims.h) : Math.min(dims.w, dims.h)
  const h = orientation === 'landscape' ? Math.min(dims.w, dims.h) : Math.max(dims.w, dims.h)
  // Schaal: maxBox = 22px voor de langste zijde
  const scale = 22 / maxLong
  const px = Math.max(4, Math.round(w * scale))
  const py = Math.max(4, Math.round(h * scale))
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{
        width: 24,
        height: 24,
        position: 'relative',
      }}
    >
      <span
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: px,
          height: py,
          border: `1px solid ${selected ? 'rgba(255,255,255,0.85)' : disabled ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.55)'}`,
          background: selected ? 'rgba(255,255,255,0.18)' : 'transparent',
          transition: 'all 200ms ease-out',
        }}
      />
    </span>
  )
}

/** Iconen per materiaal-slug — visuele herkenning naast de tekst. */
function MaterialIcon({ slug, className }: { slug: string; className?: string }) {
  const cls = className ?? 'w-4 h-4'
  switch (slug) {
    case 'canvas':   return <Frame className={cls} />
    case 'fine_art': return <FileImage className={cls} />
    case 'aluminum': return <Square className={cls} />
    case 'plexi':    return <Sparkles className={cls} />
    default:         return <Frame className={cls} />
  }
}

/**
 * Print-on-demand configurator: kies een materiaal + formaat → live
 * prijs uit de matrix → add-to-cart. Plain-data props zodat alles
 * server-side voorbereid wordt en we geen function-prop conflicten
 * hebben (Next 15+ Server -> Client).
 */

type Medium = { id: string; slug: string; name: string; description?: string | null }
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
  // Preview-overlay labels (gedeeld met FramedPreview / PhotoStage)
  previewCropHint: string
  previewZoom: string
  previewClose: string
  previewOnWall: string
  previewCompare: string
  previewCompareExit: string
  previewCompareLeft: string
  previewCompareRight: string
  wallBeige: string
  wallWhite: string
  wallDark: string
  wallRoom: string
  frameColor: string
  frameOak: string
  frameBlack: string
  frameWhite: string
  previewSave: string
  previewSaveDone: string
  previewShare: string
  previewShareCopied: string
  previewMail: string
  previewMailTitle: string
  previewMailLead: string
  previewMailFromName: string
  previewMailTo: string
  previewMailNote: string
  previewMailSend: string
  previewMailSending: string
  previewMailSent: string
  previewMailFailed: string
  previewMailRateLimited: string
  popular: string
  hangPosition: string
  hangHigh: string
  hangMid: string
  hangLow: string
  roomQuestion: string
  roomLiving: string
  roomBedroom: string
  roomOffice: string
  roomHallway: string
  roomSuggest: string
  triptychOpen: string
  triptychExit: string
  triptychCenter: string
  triptychLeft: string
  triptychRight: string
  compositionTitle: string
  compositionLead: string
  compositionPickPhoto: string
  compositionEmptySlot: string
  compositionAddAll: string
  compositionAdded: string
  compositionPickerTitle: string
  compositionPickerSearch: string
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
  previewCropHint: 'L\'image sera légèrement recadrée pour remplir ce format.',
  previewZoom: 'Voir en grand',
  previewClose: 'Fermer',
  previewOnWall: 'Aperçu mural',
  previewCompare: 'Comparer matériaux',
  previewCompareExit: 'Fermer la comparaison',
  previewCompareLeft: 'Matériau A',
  previewCompareRight: 'Matériau B',
  wallBeige: 'Beige',
  wallWhite: 'Galerie',
  wallDark: 'Sombre',
  wallRoom: 'Salon',
  frameColor: 'Cadre',
  frameOak: 'Chêne',
  frameBlack: 'Noir',
  frameWhite: 'Blanc',
  previewSave: 'Télécharger',
  previewSaveDone: 'Téléchargé !',
  previewShare: 'Partager',
  previewShareCopied: 'Lien copié',
  previewMail: 'Envoyer par mail',
  previewMailTitle: 'Partager cet aperçu',
  previewMailLead: 'Envoyez cette configuration à un proche pour son avis.',
  previewMailFromName: 'Votre prénom (optionnel)',
  previewMailTo: 'Destinataire',
  previewMailNote: 'Petit mot (optionnel)',
  previewMailSend: 'Envoyer',
  previewMailSending: 'Envoi…',
  previewMailSent: 'Envoyé !',
  previewMailFailed: 'Envoi impossible',
  previewMailRateLimited: 'Trop de messages — patientez 1 h.',
  popular: 'Populaire',
  hangPosition: 'Hauteur',
  hangHigh: 'Haut',
  hangMid: 'Centre',
  hangLow: 'Bas',
  roomQuestion: 'Pour quelle pièce ?',
  roomLiving: 'Salon',
  roomBedroom: 'Chambre',
  roomOffice: 'Bureau',
  roomHallway: 'Couloir',
  roomSuggest: 'Recommandé pour',
  triptychOpen: 'Composition murale',
  triptychExit: 'Fermer la composition',
  triptychCenter: 'Au centre',
  triptychLeft: 'À gauche',
  triptychRight: 'À droite',
  compositionTitle: 'Composez votre mur',
  compositionLead: 'Choisissez 3 œuvres et un matériau commun.',
  compositionPickPhoto: 'Choisissez une œuvre',
  compositionEmptySlot: 'Vide — cliquez pour choisir',
  compositionAddAll: 'Tout ajouter au panier',
  compositionAdded: 'Ajouté au panier',
  compositionPickerTitle: 'Sélectionnez une œuvre',
  compositionPickerSearch: 'Rechercher…',
}

/** Swap "30×45 cm" → "45×30 cm" voor landscape; "S — 30×45 cm" → "S — 45×30 cm". */
export function flipSizeLabel(label: string): string {
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
  // Controlled mode (optioneel) — wanneer een parent als PhotoStage de
  // selectie ook nodig heeft (bv. voor in-kader preview), kan die de
  // state hier injecteren. Als deze props ontbreken valt de component
  // terug op interne state (backwards-compat).
  controlledMediaSlug,
  controlledSizeSlug,
  controlledOrientation,
  onMediaSlugChange,
  onSizeSlugChange,
  onOrientationChange,
  onCompareClick,
  onTriptychClick,
  frameColor = 'oak',
  onFrameColorChange,
  popularMaterialSlug = 'canvas',
  popularSizeSlug = 'm',
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
  controlledMediaSlug?: string | null
  controlledSizeSlug?: string | null
  controlledOrientation?: Orientation
  onMediaSlugChange?: (slug: string) => void
  onSizeSlugChange?: (slug: string) => void
  onOrientationChange?: (o: Orientation) => void
  onCompareClick?: () => void
  /** Optionele callback — toont een "Composition murale" knop naast de
   *  vergelijk-knop. PhotoStage gebruikt dit om triptych-mode te openen. */
  onTriptychClick?: () => void
  /** Houtkleur voor fine_art (oak/black/white). Sub-toggle verschijnt
   *  alleen wanneer fine_art het actieve materiaal is. */
  frameColor?: FrameColor
  onFrameColorChange?: (c: FrameColor) => void
  /** Popular-badges. Default canvas + m (kan overruled worden). */
  popularMaterialSlug?: string | null
  popularSizeSlug?: string | null
}) {
  const { add } = useCart()

  const firstAvail = prices.find((p) => p.isAvailable)
  const [internalMediaSlug, setInternalMediaSlug] = useState<string | null>(firstAvail?.mediaSlug ?? null)
  const [internalSizeSlug, setInternalSizeSlug] = useState<string | null>(firstAvail?.sizeSlug ?? null)
  const [internalOrientation, setInternalOrientation] = useState<Orientation>(
    defaultOrientation === 'landscape' ? 'landscape' : 'portrait',
  )
  const mediaSlug = controlledMediaSlug !== undefined ? controlledMediaSlug : internalMediaSlug
  const sizeSlug = controlledSizeSlug !== undefined ? controlledSizeSlug : internalSizeSlug
  const orientation = controlledOrientation ?? internalOrientation
  const setMediaSlug = (s: string) => {
    if (onMediaSlugChange) onMediaSlugChange(s)
    if (controlledMediaSlug === undefined) setInternalMediaSlug(s)
  }
  const setSizeSlug = (s: string) => {
    if (onSizeSlugChange) onSizeSlugChange(s)
    if (controlledSizeSlug === undefined) setInternalSizeSlug(s)
  }
  const setOrientation = (o: Orientation) => {
    if (onOrientationChange) onOrientationChange(o)
    if (controlledOrientation === undefined) setInternalOrientation(o)
  }
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
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-stone-500">{labels.material}</p>
          <span className="inline-flex items-center gap-3">
            {onTriptychClick && (
              <button
                type="button"
                onClick={onTriptychClick}
                className="text-[10px] uppercase tracking-[0.18em] text-(--color-bronze) hover:text-(--color-bronze-dark) transition-colors"
              >
                {labels.triptychOpen}
              </button>
            )}
            {onCompareClick && media.length >= 2 && (
              <button
                type="button"
                onClick={onCompareClick}
                className="text-[10px] uppercase tracking-[0.18em] text-(--color-bronze) hover:text-(--color-bronze-dark) transition-colors"
              >
                {labels.previewCompare}
              </button>
            )}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {media.map((m) => {
            const sel = m.slug === mediaSlug
            const isPopular = m.slug === popularMaterialSlug
            return (
              <div key={m.id} className="relative group">
                <button
                  type="button"
                  onClick={() => setMediaSlug(m.slug)}
                  className={`w-full px-3 py-2 text-sm border rounded transition-colors inline-flex items-center gap-2 ${
                    sel ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 hover:border-stone-500'
                  }`}
                >
                  <MaterialIcon slug={m.slug} className="w-4 h-4 shrink-0" />
                  <span className="truncate">{m.name}</span>
                </button>
                {isPopular && (
                  <span
                    className="absolute -top-2 -right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.15em] bg-(--color-bronze) text-white rounded-full shadow-sm pointer-events-none"
                    aria-label={labels.popular}
                    title={labels.popular}
                  >
                    <Star className="w-2.5 h-2.5" />
                    {labels.popular}
                  </span>
                )}
                {m.description && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 z-30 w-60 max-w-[80vw] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200 bg-stone-900 text-white text-xs leading-snug rounded p-3 shadow-lg"
                  >
                    <span className="block font-medium mb-0.5">{m.name}</span>
                    <span className="block text-stone-300">{m.description}</span>
                    <span
                      aria-hidden
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 rotate-45"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Houtkleur — alleen wanneer fine_art active. */}
      {mediaSlug === 'fine_art' && onFrameColorChange && (
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">{labels.frameColor}</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { key: 'oak', lbl: labels.frameOak, swatch: 'linear-gradient(135deg, #2a2622 0%, #1a1815 50%, #2a2622 100%)' },
                { key: 'black', lbl: labels.frameBlack, swatch: '#0d0d0d' },
                { key: 'white', lbl: labels.frameWhite, swatch: '#fafafa' },
              ] as const
            ).map(({ key, lbl, swatch }) => {
              const sel = key === frameColor
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onFrameColorChange(key)}
                  className={`px-3 py-2 text-xs border rounded transition-colors inline-flex items-center gap-2 ${
                    sel ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 hover:border-stone-500'
                  }`}
                  aria-pressed={sel}
                >
                  <span
                    aria-hidden
                    className="w-3 h-3 rounded-sm border border-stone-300 shrink-0"
                    style={{ background: swatch }}
                  />
                  {lbl}
                </button>
              )
            })}
          </div>
        </div>
      )}

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
          {(() => {
            // Compute langste zijde van grootste beschikbare formaat
            // (gebruikt door SizeIndicator om alle mini-rechthoeken op
            // dezelfde schaal te tekenen).
            let maxLong = 1
            for (const s of sizes) {
              const d = parseSizeDims(s.label)
              if (d) maxLong = Math.max(maxLong, d.w, d.h)
            }
            return sizes.map((s) => {
              const sel = s.slug === sizeSlug
              const cell = mediaSlug ? cellMap.get(`${mediaSlug}|${s.slug}`) : null
              const disabled = !cell || !cell.isAvailable
              const displayLabel = orientation === 'landscape' ? flipSizeLabel(s.label) : s.label
              const isPopular = s.slug === popularSizeSlug && !disabled
              return (
                <div key={s.id} className="relative">
                  <button
                    type="button"
                    onClick={() => !disabled && setSizeSlug(s.slug)}
                    disabled={disabled}
                    className={`w-full px-3 py-2 text-sm border rounded transition-colors text-left inline-flex items-center gap-2 ${
                      disabled
                        ? 'border-stone-200 opacity-40 cursor-not-allowed'
                        : sel
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-stone-300 hover:border-stone-500'
                    }`}
                  >
                    <SizeIndicator
                      label={s.label}
                      maxLong={maxLong}
                      selected={sel}
                      disabled={disabled}
                      orientation={orientation}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium truncate">{displayLabel}</span>
                      <span className="block text-xs opacity-75 mt-0.5">
                        {cell ? cell.priceFormatted : '—'}
                      </span>
                    </span>
                  </button>
                  {isPopular && (
                    <span
                      className="absolute -top-2 -right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.15em] bg-(--color-bronze) text-white rounded-full shadow-sm pointer-events-none"
                      aria-label={labels.popular}
                      title={labels.popular}
                    >
                      <Star className="w-2.5 h-2.5" />
                      {labels.popular}
                    </span>
                  )}
                </div>
              )
            })
          })()}
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
