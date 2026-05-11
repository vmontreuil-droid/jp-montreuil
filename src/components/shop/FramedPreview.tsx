'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize2, X, AlertTriangle, User } from 'lucide-react'

// Echte SVG-texture assets (in /public/shop/textures/) — vervangen de
// CSS-only patterns voor canvas-vezel, plexi-glare, dibond-brushed,
// papier-grain en houtnerf.
const TEX_CANVAS = '/shop/textures/canvas-weave.svg'
const TEX_PLEXI  = '/shop/textures/plexi-glare.svg'
const TEX_DIBOND = '/shop/textures/dibond-brushed.svg'
const TEX_PAPER  = '/shop/textures/paper-grain.svg'
const TEX_WOOD   = '/shop/textures/wood-grain.svg'

/**
 * In-kader preview voor de shop. Toont de foto binnen een mockup van het
 * gekozen materiaal — canvas met zichtbare side-wrap, dibond met
 * brushed-metal rand, plexi met multi-stop reflectie, papier met
 * passe-partout en houtnerf-rand. Foto wordt `object-cover` gerenderd
 * zodat ze het kader vult (cropped indien portrait-foto in
 * landscape-kader of omgekeerd).
 *
 * Extra's:
 *  - subtiele 3D-perspective tilt (lichtbron uit linksboven)
 *  - hover-lift effect met diepere schaduw
 *  - schaal-aware drop-shadow (XL/XXL hangt zwaarder aan de muur)
 *  - smooth transities tussen materiaal- en formaat-keuzes
 *  - subtiele muur-textuur + vloer-hint achter het kader
 *  - crop-waarschuwing wanneer foto-aspect sterk afwijkt van kader
 *  - klik-op-foto opent fullscreen lightbox met pinch-zoom support
 *  - mobile-aware stage-hoogte
 *  - shimmer-skeleton tijdens image-load
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
  mediaName,
  sizeLabel,
  orientation,
  naturalAspect,
  labels,
}: {
  photoUrl: string
  alt: string
  mediaSlug: string | null
  /** Zichtbare materiaal-naam (bv. "Toile canvas") voor caption. */
  mediaName?: string | null
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
  const [imgLoaded, setImgLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [stageSize, setStageSize] = useState({ w: 380, h: 460 })
  const stageRef = useRef<HTMLDivElement | null>(null)

  // Mount fade-in: één tick na mount triggert de transitie naar opacity 1
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Reset loading state wanneer foto-URL wijzigt
  useEffect(() => { setImgLoaded(false) }, [photoUrl])

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
  // Lichtbron uit linksboven → schaduw rechtsonder. Hover = lift +
  // diepere schaduw (alsof het kader iets van de muur loskomt).
  const shadowOffsetX = 6 + sizeWeight * 8
  const shadowOffsetY = 10 + sizeWeight * 18 + (hovered ? 6 : 0)
  const shadowBlur = 20 + sizeWeight * 22 + (hovered ? 10 : 0)
  const shadowOpacity = 0.20 + sizeWeight * 0.18 + (hovered ? 0.05 : 0)

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
    // Body scroll lock
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [zoomOpen])

  return (
    <>
      <div
        ref={stageRef}
        className="relative w-full overflow-hidden rounded-sm"
        style={{
          height: stageSize.h,
          background:
            'linear-gradient(180deg, #f3efe8 0%, #ece7df 60%, #d8d2c8 100%)',
          // Perspective op de stage zodat het frame in 3D kan draaien
          perspective: '1500px',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Lichtbron uit linksbovenhoek */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 18% 12%, rgba(255,255,250,0.60) 0%, rgba(255,255,250,0) 55%)',
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

        {/* Frame — gecentreerd, 3D tilt + scale-aware shadow + hover-lift +
            mount fade-in (van opacity 0 + scale 0.94 → 1.0). */}
        <div
          className="absolute left-1/2 top-1/2 cursor-zoom-in"
          style={{
            width: frameW,
            height: frameH,
            transform: `translate(-50%, -52%) scale(${mounted ? 1 : 0.94}) rotateY(${hovered ? '-3deg' : '-1.5deg'}) rotateX(${hovered ? '1deg' : '0.5deg'}) translateZ(${hovered ? '12px' : '0'})`,
            transformStyle: 'preserve-3d',
            filter: `drop-shadow(${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity}))`,
            opacity: mounted ? 1 : 0,
            transition: 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease-out, filter 500ms ease-out',
          }}
          onClick={() => setZoomOpen(true)}
          role="button"
          aria-label={labels.zoom}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setZoomOpen(true) } }}
        >
          {variant === 'canvas' && <CanvasFrame photoUrl={photoUrl} alt={alt} onLoad={() => setImgLoaded(true)} />}
          {variant === 'fine_art' && <FineArtFrame photoUrl={photoUrl} alt={alt} weight={sizeWeight} onLoad={() => setImgLoaded(true)} />}
          {variant === 'aluminum' && <DibondFrame photoUrl={photoUrl} alt={alt} onLoad={() => setImgLoaded(true)} />}
          {variant === 'plexi' && <PlexiFrame photoUrl={photoUrl} alt={alt} onLoad={() => setImgLoaded(true)} />}

          {/* Shimmer overlay tijdens load */}
          {!imgLoaded && (
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(110deg, rgba(232,228,220,0.6) 8%, rgba(245,242,236,0.95) 18%, rgba(232,228,220,0.6) 33%)',
                backgroundSize: '200% 100%',
                animation: 'fp-shimmer 1.2s linear infinite',
              }}
            />
          )}
        </div>

        {/* Schaal-silhouette voor grote formaten — een gestileerd silhouet
            (170 cm) naast het kader zodat de klant de fysieke grootte
            voelt. Verschijnt zachtjes wanneer kader >= L (cumulatief
            ≥120 cm) en er nog horizontale ruimte naast het kader is. */}
        {dims && dims.w + dims.h >= 120 && stageMaxW - frameW > 50 && (
          <ScaleSilhouette
            stageHeight={stageSize.h}
            frameHeightPx={frameH}
            frameHeightCm={dims.h}
            mounted={mounted}
            label={`${dims.h} cm`}
          />
        )}

        {/* Caption rechtsonder met formaat + materiaal + oriëntatie */}
        {dims && (
          <p className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.2em] text-(--color-stone) bg-white/70 backdrop-blur-sm px-2 py-1 rounded">
            {dims.w} × {dims.h} cm
            {mediaName && <> · {mediaName}</>}
            {' · '}{orientation === 'landscape' ? labels.paysage : labels.portrait}
          </p>
        )}

        {/* Zoom-knop linksonder */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setZoomOpen(true) }}
          className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-(--color-stone) bg-white/70 backdrop-blur-sm px-2 py-1 rounded hover:text-(--color-ink) hover:bg-white/90 transition-colors"
          aria-label={labels.zoom}
        >
          <Maximize2 className="w-3 h-3" />
          {labels.zoom}
        </button>

        {/* Crop-hint linksboven */}
        {showCropHint && (
          <div className="absolute top-3 left-3 max-w-[80%] inline-flex items-start gap-1.5 text-[10px] text-amber-900 bg-amber-50/95 border border-amber-200 px-2 py-1.5 rounded leading-snug shadow-sm">
            <AlertTriangle className="w-3 h-3 mt-px shrink-0" />
            <span>{labels.cropHint}</span>
          </div>
        )}

        {/* Shimmer keyframes */}
        <style>{`
          @keyframes fp-shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>

      {/* Lightbox / fullscreen zoom met pinch-zoom support */}
      {zoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="relative max-w-full max-h-full overflow-auto"
            style={{ touchAction: 'pinch-zoom' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={alt}
              className="block max-w-full max-h-[90vh] object-contain shadow-2xl select-none"
              draggable={false}
            />
          </div>
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="absolute top-4 right-4 inline-flex items-center gap-2 px-3 py-2 bg-white/90 hover:bg-white text-stone-900 text-xs uppercase tracking-widest rounded transition-colors"
            aria-label={labels.close}
          >
            <X className="w-4 h-4" />
            {labels.close}
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-white/50 select-none">
            {labels.close} · ESC
          </p>
        </div>
      )}
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Material variants
// ────────────────────────────────────────────────────────────────────────

function CoverImg({
  photoUrl,
  alt,
  onLoad,
}: {
  photoUrl: string
  alt: string
  onLoad?: () => void
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
      draggable={false}
      onLoad={onLoad}
    />
  )
}

/**
 * Canvas: foto vult voorvlak, met zichtbare wrap aan rechterkant + onder
 * (alsof het canvas over de zijkant van het houten frame is gespannen).
 * Drop-shadow staat op de stage zelf via filter.
 */
function CanvasFrame({ photoUrl, alt, onLoad }: { photoUrl: string; alt: string; onLoad?: () => void }) {
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

      <CoverImg photoUrl={photoUrl} alt={alt} onLoad={onLoad} />

      {/* Zachte wrap-suggestie langs alle randen */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow:
            'inset 4px 4px 10px rgba(0,0,0,0.20), inset -4px -4px 8px rgba(0,0,0,0.14)',
        }}
      />
      {/* Echte canvas-vezel-textuur via SVG-pattern (interwoven fibers
          + fractalNoise grain) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-70"
        style={{
          backgroundImage: `url("${TEX_CANVAS}")`,
          backgroundSize: '60px 60px',
          backgroundRepeat: 'repeat',
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
function FineArtFrame({
  photoUrl, alt, weight, onLoad,
}: { photoUrl: string; alt: string; weight: number; onLoad?: () => void }) {
  // Passe-partout marge: 6% bij kleine, 11% bij grote formaten.
  const margin = `${6 + weight * 5}%`
  return (
    <div
      className="absolute inset-0 bg-[#1a1612]"
      style={{
        border: '1px solid #0f0c0a',
        // Echte houtnerf via SVG-texture
        backgroundImage: `url("${TEX_WOOD}")`,
        backgroundSize: 'auto 100%',
        backgroundRepeat: 'repeat-x',
      }}
    >
      {/* Wit passe-partout met beveled inner edge */}
      <div
        className="absolute bg-white"
        style={{
          inset: margin,
          boxShadow:
            'inset 0 0 0 1px rgba(0,0,0,0.10), inset 0 2px 4px rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <CoverImg photoUrl={photoUrl} alt={alt} onLoad={onLoad} />
          {/* Inset-shadow alsof foto in passe-partout zit */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.22)' }}
          />
          {/* Echte papier-grain via SVG-texture (warm noise overlay) */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-50"
            style={{
              backgroundImage: `url("${TEX_PAPER}")`,
              backgroundSize: '120px 120px',
              backgroundRepeat: 'repeat',
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
function DibondFrame({ photoUrl, alt, onLoad }: { photoUrl: string; alt: string; onLoad?: () => void }) {
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
        <CoverImg photoUrl={photoUrl} alt={alt} onLoad={onLoad} />
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
      {/* Echte brushed-metal textuur via SVG (verticale streepjes + grain) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-50"
        style={{
          backgroundImage: `url("${TEX_DIBOND}")`,
          backgroundSize: '100px 100%',
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  )
}

/**
 * Plexi: hoogglans reflectie (multi-stop), dunne plexi-randhint, zwaardere
 * zwevende schaduw. Drop-shadow zit op de stage zelf via filter.
 */
function PlexiFrame({ photoUrl, alt, onLoad }: { photoUrl: string; alt: string; onLoad?: () => void }) {
  return (
    <div className="absolute inset-0">
      <CoverImg photoUrl={photoUrl} alt={alt} onLoad={onLoad} />
      {/* Echte plexi-glare via SVG (multi-stop linear + radial hot-spot
          + diagonale lichtband — schaalt mee met kader-aspect) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("${TEX_PLEXI}")`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Dunne plexi-randhint (witte 1px-glow) + zachte zwarte onder-rand
          voor 3D-effect */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.20)' }}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Schaal-silhouette: gestileerd silhouet (170 cm) naast het kader om de
// fysieke grootte voelbaar te maken bij L/XL/XXL formaten.
// ────────────────────────────────────────────────────────────────────────

function ScaleSilhouette({
  stageHeight,
  frameHeightPx,
  frameHeightCm,
  mounted,
  label,
}: {
  stageHeight: number
  frameHeightPx: number
  frameHeightCm: number
  mounted: boolean
  label: string
}) {
  // Een persoon = 170 cm. Kader-pixels-per-cm = frameHeightPx / frameHeightCm.
  // Silhouette krijgt dezelfde schaal.
  const pxPerCm = frameHeightPx / Math.max(1, frameHeightCm)
  const silhouettePx = Math.round(170 * pxPerCm)
  // Beperk tot stage-hoogte (laat 30px ruimte voor vloer-hint + label)
  const maxPx = stageHeight - 50
  const finalPx = Math.min(silhouettePx, maxPx)
  // Wat staat-zone met de "vloer" op stage gelijk
  return (
    <div
      aria-hidden
      className="absolute"
      style={{
        right: 12,
        bottom: 22, // boven vloer-hint
        height: finalPx,
        width: 32,
        opacity: mounted ? 0.55 : 0,
        transition: 'opacity 700ms ease-out 200ms',
      }}
    >
      <User
        className="text-stone-700"
        style={{ width: '100%', height: 'auto' }}
        strokeWidth={1.4}
      />
      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.2em] text-stone-600 whitespace-nowrap">
        {label}
      </span>
    </div>
  )
}
