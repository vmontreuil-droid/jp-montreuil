'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize2, X, AlertTriangle } from 'lucide-react'

/**
 * In-kader preview voor de shop. Toont de foto binnen een mockup van het
 * gekozen materiaal — canvas met zichtbare side-wrap, dibond met
 * brushed-metal rand, plexi met multi-stop reflectie, papier met
 * passe-partout en houtnerf-rand. Foto wordt `object-cover` gerenderd
 * zodat ze het kader vult (cropped indien portrait-foto in
 * landscape-kader of omgekeerd).
 *
 * Extra's:
 *  - schaal-aware drop-shadow (XL/XXL hangt zwaarder aan de muur)
 *  - smooth transities tussen materiaal- en formaat-keuzes
 *  - subtiele muur-textuur + vloer-hint achter het kader
 *  - crop-waarschuwing wanneer foto-aspect sterk afwijkt van kader
 *  - klik-op-foto opent fullscreen lightbox met de originele resolutie
 *  - mobile-aware stage-hoogte
 */

type Orientation = 'portrait' | 'landscape'

const KNOWN_MATERIALS = ['fine_art', 'canvas', 'aluminum', 'plexi'] as const
type KnownMaterial = (typeof KNOWN_MATERIALS)[number]

function isKnownMaterial(s: string | null | undefined): s is KnownMaterial {
  return s != null && (KNOWN_MATERIALS as readonly string[]).includes(s)
}

/** "S — 30×45 cm" → { w: 30, h: 45 }. Returnt null bij geen match. */
function parseDimensions(label: string | null | undefined): { w: number; h: number } | null {
  if (!label) return null
  const m = label.match(/(\d+)\s*[×x]\s*(\d+)/)
  if (!m) return null
  return { w: Number(m[1]), h: Number(m[2]) }
}

export type FramedPreviewLabels = {
  cropHint: string
  zoom: string
  close: string
  onWall: string
  portrait: string
  paysage: string
}

export function FramedPreview({
  photoUrl,
  alt,
  mediaSlug,
  sizeLabel,
  orientation,
  naturalAspect,
  labels,
}: {
  photoUrl: string
  alt: string
  mediaSlug: string | null
  sizeLabel: string | null
  /** Bepaalt swap van w/h indien nodig. Sizes worden in DB als portrait
   *  (h > w) opgeslagen; landscape spiegelt ze. */
  orientation: Orientation
  /** Natuurlijke aspect ratio van de foto (w/h). Gebruikt om een
   *  crop-waarschuwing te tonen wanneer foto sterk gecropped wordt.
   *  Optioneel. */
  naturalAspect?: number | null
  labels: FramedPreviewLabels
}) {
  const dims = parseDimensions(sizeLabel)
  const aspect = dims ? dims.w / dims.h : 1
  const variant: KnownMaterial = isKnownMaterial(mediaSlug) ? mediaSlug : 'fine_art'

  const [zoomOpen, setZoomOpen] = useState(false)
  const [stageSize, setStageSize] = useState({ w: 380, h: 460 })
  const stageRef = useRef<HTMLDivElement | null>(null)

  // Mobile-aware stage: schaal naar container-breedte.
  useEffect(() => {
    if (!stageRef.current) return
    const el = stageRef.current
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      // Beperk hoogte op mobile zodat preview niet te dominant wordt
      const h = Math.max(280, Math.min(520, Math.round(w * 1.18)))
      setStageSize({ w: Math.min(420, w - 40), h })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Compute frame-afmetingen binnen stage-zone
  const stageMaxW = stageSize.w
  const stageMaxH = stageSize.h - 80 // ruimte voor caption + padding
  let frameW: number
  let frameH: number
  if (aspect >= 1) {
    frameW = stageMaxW
    frameH = Math.round(stageMaxW / aspect)
    if (frameH > stageMaxH) {
      frameH = stageMaxH
      frameW = Math.round(stageMaxH * aspect)
    }
  } else {
    frameH = stageMaxH
    frameW = Math.round(stageMaxH * aspect)
    if (frameW > stageMaxW) {
      frameW = stageMaxW
      frameH = Math.round(stageMaxW / aspect)
    }
  }

  // Schaal-aware shadow & frame-thickness — grotere kaders voelen
  // zwaarder aan en hebben dus diepere schaduw + iets dikkere rand.
  const sizeWeight = dims ? Math.min(1, Math.max(0.4, (dims.w + dims.h) / 200)) : 0.6

  // Crop-waarschuwing: significant verschil tussen foto-aspect en
  // kader-aspect (>20% relatief).
  let showCropHint = false
  if (naturalAspect != null && dims) {
    const ratio = aspect / naturalAspect
    showCropHint = ratio < 0.8 || ratio > 1.25
  }

  // ESC sluit lightbox
  useEffect(() => {
    if (!zoomOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setZoomOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomOpen])

  return (
    <>
      <div
        ref={stageRef}
        className="relative w-full overflow-hidden rounded-sm"
        style={{
          height: stageSize.h,
          // Subtiele muur-textuur + vloer-hint
          background:
            'linear-gradient(180deg, #f3efe8 0%, #ece7df 60%, #d8d2c8 100%)',
        }}
      >
        {/* Wat licht uit linkerbovenhoek alsof venster aan zijde van de muur */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 20% 15%, rgba(255,255,250,0.55) 0%, rgba(255,255,250,0) 55%)',
          }}
        />
        {/* Vloer-hint onderaan */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: 22,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(74,55,30,0.18) 100%)',
            borderTop: '1px solid rgba(74,55,30,0.18)',
          }}
        />

        {/* Frame zelf — gecentreerd, met schaal-aware shadow */}
        <div
          className="absolute left-1/2 top-1/2 transition-all duration-500 ease-out cursor-zoom-in"
          style={{
            width: frameW,
            height: frameH,
            transform: 'translate(-50%, -52%)',
            filter: `drop-shadow(0 ${10 + sizeWeight * 20}px ${20 + sizeWeight * 25}px rgba(0,0,0,${0.20 + sizeWeight * 0.20}))`,
          }}
          onClick={() => setZoomOpen(true)}
          role="button"
          aria-label={labels.zoom}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setZoomOpen(true) } }}
        >
          {variant === 'canvas' && <CanvasFrame photoUrl={photoUrl} alt={alt} />}
          {variant === 'fine_art' && <FineArtFrame photoUrl={photoUrl} alt={alt} weight={sizeWeight} />}
          {variant === 'aluminum' && <DibondFrame photoUrl={photoUrl} alt={alt} />}
          {variant === 'plexi' && <PlexiFrame photoUrl={photoUrl} alt={alt} />}
        </div>

        {/* Caption rechtsonder met formaat + materiaal-orientatie */}
        {dims && (
          <p className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.2em] text-(--color-stone) bg-white/60 backdrop-blur-sm px-2 py-1 rounded">
            {dims.w} × {dims.h} cm · {orientation === 'landscape' ? labels.paysage : labels.portrait}
          </p>
        )}

        {/* Zoom-knop linksonder */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setZoomOpen(true) }}
          className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-(--color-stone) bg-white/60 backdrop-blur-sm px-2 py-1 rounded hover:text-(--color-ink) hover:bg-white/80 transition-colors"
          aria-label={labels.zoom}
        >
          <Maximize2 className="w-3 h-3" />
          {labels.zoom}
        </button>

        {/* Crop-hint linksboven */}
        {showCropHint && (
          <div className="absolute top-3 left-3 max-w-[80%] inline-flex items-start gap-1.5 text-[10px] text-amber-900 bg-amber-50/95 border border-amber-200 px-2 py-1.5 rounded leading-snug">
            <AlertTriangle className="w-3 h-3 mt-px shrink-0" />
            <span>{labels.cropHint}</span>
          </div>
        )}
      </div>

      {/* Lightbox / fullscreen zoom */}
      {zoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 animate-in fade-in duration-200"
          onClick={() => setZoomOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={alt}
            className="max-w-full max-h-full object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="absolute top-4 right-4 inline-flex items-center gap-2 px-3 py-2 bg-white/90 hover:bg-white text-stone-900 text-xs uppercase tracking-widest rounded transition-colors"
            aria-label={labels.close}
          >
            <X className="w-4 h-4" />
            {labels.close}
          </button>
        </div>
      )}
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Material variants
// ────────────────────────────────────────────────────────────────────────

function CoverImg({ photoUrl, alt }: { photoUrl: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
      draggable={false}
    />
  )
}

/**
 * Canvas: foto vult voorvlak, met zichtbare wrap aan rechterkant + onder
 * (alsof het canvas over de zijkant van het houten frame is gespannen).
 * Drop-shadow staat op de stage zelf via filter.
 */
function CanvasFrame({ photoUrl, alt }: { photoUrl: string; alt: string }) {
  return (
    <div className="absolute inset-0">
      {/* Wrap-schaduw rechts (3D-effect: zijde lijkt naar achter te wijken) */}
      <div
        aria-hidden
        className="absolute right-0 top-0 bottom-0"
        style={{
          width: 8,
          transform: 'translateX(8px) skewY(-3deg)',
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.20) 100%)',
        }}
      />
      {/* Wrap-schaduw onder */}
      <div
        aria-hidden
        className="absolute left-0 right-0 bottom-0"
        style={{
          height: 6,
          transform: 'translateY(6px) skewX(-3deg)',
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.10) 100%)',
        }}
      />

      <CoverImg photoUrl={photoUrl} alt={alt} />

      {/* Zachte wrap-suggestie langs alle randen */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow:
            'inset 4px 4px 10px rgba(0,0,0,0.20), inset -4px -4px 8px rgba(0,0,0,0.14)',
        }}
      />
      {/* Subtiele canvas-vezel-textuur (cross-hatch) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 2px), repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 2px)',
        }}
      />
    </div>
  )
}

/**
 * Fine art: papier baryté met wit passe-partout en dunne donkergrijze
 * houtkader. `weight` schaalt de passe-partout-marge zodat grotere
 * formaten een ruimere mat krijgen.
 */
function FineArtFrame({ photoUrl, alt, weight }: { photoUrl: string; alt: string; weight: number }) {
  // Passe-partout marge: 6% bij kleine, 11% bij grote formaten.
  const margin = `${6 + weight * 5}%`
  return (
    <div
      className="absolute inset-0 bg-white"
      style={{
        border: '1px solid #1f1d1a',
        // Houtnerf-hint langs de kader-rand
        backgroundImage:
          'linear-gradient(135deg, #2a2622 0%, #1a1815 50%, #2a2622 100%)',
        backgroundSize: '12px 12px',
        backgroundClip: 'padding-box',
      }}
    >
      {/* Wit passe-partout */}
      <div
        className="absolute bg-white"
        style={{
          inset: margin,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <CoverImg photoUrl={photoUrl} alt={alt} />
          {/* Inset-shadow alsof foto in passe-partout zit */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.22)' }}
          />
          {/* Subtiel papier-grain */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-[0.04]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 20%, rgba(0,0,0,0.5) 0px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.5) 0px, transparent 1px)',
              backgroundSize: '3px 3px, 5px 5px',
            }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Aluminium dibond: dunne brushed-metal rand, koel grijs, vlakke schaduw.
 */
function DibondFrame({ photoUrl, alt }: { photoUrl: string; alt: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        padding: 2,
        background:
          'linear-gradient(135deg, #d6d6d6 0%, #f4f4f4 30%, #c0c0c0 50%, #f4f4f4 75%, #b8b8b8 100%)',
        backgroundSize: '8px 100%',
      }}
    >
      <div className="absolute inset-[2px] overflow-hidden">
        <CoverImg photoUrl={photoUrl} alt={alt} />
        {/* Subtiele matte sheen — diagonale lichtflits */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(155deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 35%)',
          }}
        />
      </div>
      {/* Brushed-metal lijntjes (verticaal) — heel subtiel */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 2px)',
        }}
      />
    </div>
  )
}

/**
 * Plexi: hoogglans reflectie (multi-stop), dunne plexi-randhint, zwaardere
 * zwevende schaduw. Drop-shadow zit op de stage zelf via filter.
 */
function PlexiFrame({ photoUrl, alt }: { photoUrl: string; alt: string }) {
  return (
    <div className="absolute inset-0">
      <CoverImg photoUrl={photoUrl} alt={alt} />
      {/* Glossy reflectie — diagonale lichtflits in linkerbovenhoek */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(125deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.14) 18%, rgba(255,255,255,0.04) 32%, rgba(255,255,255,0) 48%)',
        }}
      />
      {/* Tweede subtiele highlight rechts onder voor "diepte" */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(305deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 20%)',
        }}
      />
      {/* Dunne plexi-randhint (witte 1px-glow) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.20)' }}
      />
    </div>
  )
}
