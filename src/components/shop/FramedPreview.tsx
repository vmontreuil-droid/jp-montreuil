'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Maximize2, X, AlertTriangle, User, Sun, Square, Moon, Sofa,
  Download, Share2, Check, ArrowUp, ArrowDown, Minus,
} from 'lucide-react'

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
 *  - mouse-parallax: kader volgt de cursor over de stage
 *  - hover-lift effect met diepere schaduw
 *  - schaal-aware drop-shadow (XL/XXL hangt zwaarder aan de muur)
 *  - alle 4 material-skins blijven gemount, crossfade bij switch
 *  - subtiele muur-textuur + vloer-hint achter het kader
 *  - wall-toggle: 3 muur-themas (beige / wit galerij / donker)
 *  - crop-waarschuwing wanneer foto-aspect sterk afwijkt van kader
 *  - klik-op-foto opent fullscreen lightbox met pinch-zoom support
 *  - arrow-keys in lightbox cyclen door de beschikbare materialen
 *  - mobile-aware stage-hoogte
 *  - shimmer-skeleton tijdens image-load
 *  - eerbiedigt prefers-reduced-motion (zet parallax + tilt uit)
 */

type Orientation = 'portrait' | 'landscape'

const KNOWN_MATERIALS = ['fine_art', 'canvas', 'aluminum', 'plexi'] as const
type KnownMaterial = (typeof KNOWN_MATERIALS)[number]

function isKnownMaterial(s: string | null | undefined): s is KnownMaterial {
  return s != null && (KNOWN_MATERIALS as readonly string[]).includes(s)
}

// SVG-texture assets in /public/shop/textures/
const TEX_CANVAS = '/shop/textures/canvas-weave.svg'
const TEX_PLEXI  = '/shop/textures/plexi-glare.svg'
const TEX_DIBOND = '/shop/textures/dibond-brushed.svg'
const TEX_PAPER  = '/shop/textures/paper-grain.svg'
const TEX_WOOD   = '/shop/textures/wood-grain.svg'

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
  wallBeige: string
  wallWhite: string
  wallDark: string
  wallRoom: string
  save: string
  saveDone: string
  share: string
  shareCopied: string
}

export type WallTheme = 'beige' | 'white' | 'dark' | 'room'
export type FrameColor = 'oak' | 'black' | 'white'
export type HangPosition = 'high' | 'mid' | 'low'

const WALL_THEMES: Record<WallTheme, { background: string; floor: string; lightSpot: string; ink: string }> = {
  beige: {
    background: 'linear-gradient(180deg, #f3efe8 0%, #ece7df 60%, #d8d2c8 100%)',
    floor: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(74,55,30,0.18) 100%)',
    lightSpot: 'radial-gradient(ellipse at 18% 12%, rgba(255,255,250,0.60) 0%, rgba(255,255,250,0) 55%)',
    ink: '#1f1d1a',
  },
  white: {
    background: 'linear-gradient(180deg, #ffffff 0%, #f6f6f5 60%, #e8e7e4 100%)',
    floor: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.10) 100%)',
    lightSpot: 'radial-gradient(ellipse at 18% 12%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 50%)',
    ink: '#3a3a3a',
  },
  dark: {
    background: 'linear-gradient(180deg, #2a2620 0%, #221f1a 60%, #15120e 100%)',
    floor: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)',
    lightSpot: 'radial-gradient(ellipse at 18% 12%, rgba(255,240,210,0.18) 0%, rgba(0,0,0,0) 60%)',
    ink: '#e8e3da',
  },
  room: {
    background: 'linear-gradient(180deg, #ede5d8 0%, #e1d6c4 55%, #c8b89c 100%)',
    floor: 'linear-gradient(180deg, rgba(74,55,30,0) 0%, rgba(74,55,30,0.55) 100%)',
    lightSpot: 'radial-gradient(ellipse at 18% 12%, rgba(255,250,235,0.55) 0%, rgba(255,250,235,0) 55%)',
    ink: '#3a2f22',
  },
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
  availableMaterialSlugs,
  onMaterialCycle,
  wall = 'beige',
  onWallChange,
  frameColor = 'oak',
  fileNameBase,
  showActions = true,
  hang = 'mid',
  onHangChange,
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
  /** Lijst van materiaal-slugs die de parent ondersteunt. Wanneer
   *  meegegeven kan de lightbox via ←/→ cyclen. */
  availableMaterialSlugs?: string[]
  /** Callback om de actieve material-slug aan de parent door te geven
   *  (gebruikt door arrow-key cycling). */
  onMaterialCycle?: (slug: string) => void
  /** Controlled wall-thema. Default 'beige'. */
  wall?: WallTheme
  onWallChange?: (w: WallTheme) => void
  /** Houtkleur voor fine_art (oak/black/white). Default 'oak'. */
  frameColor?: FrameColor
  /** Basis-bestandsnaam voor de PNG-export (zonder extensie). */
  fileNameBase?: string
  /** Toont save/share/wall-toggle bovenop de stage. Zet uit voor
   *  compare-mode cellen waar je de actie-knoppen niet wil dupliceren. */
  showActions?: boolean
  /** Hang-positie binnen de stage (high/mid/low). Default 'mid'. */
  hang?: HangPosition
  onHangChange?: (h: HangPosition) => void
}) {
  const dims = parseDimensions(sizeLabel)
  const aspect = dims ? dims.w / dims.h : 1
  const variant: KnownMaterial = isKnownMaterial(mediaSlug) ? mediaSlug : 'fine_art'

  const [zoomOpen, setZoomOpen] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [stageSize, setStageSize] = useState({ w: 380, h: 460 })
  const [parallax, setParallax] = useState({ x: 0, y: 0 })
  const [reducedMotion, setReducedMotion] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [sharedFlash, setSharedFlash] = useState(false)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const setWall = onWallChange ?? (() => {})

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

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
      const h = Math.max(280, Math.min(520, Math.round(w * 1.18)))
      setStageSize({ w: Math.min(420, w - 40), h })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Mouse-parallax: kader volgt cursor binnen ±0.5 van centrum
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setParallax({ x, y })
  }, [reducedMotion])
  const resetParallax = useCallback(() => setParallax({ x: 0, y: 0 }), [])

  // Save stage als PNG via dynamic-import van html-to-image (~14kB,
  // alleen geladen wanneer user effectief klikt).
  const onSave = useCallback(async () => {
    if (!stageRef.current) return
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(stageRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: undefined,
      })
      const link = document.createElement('a')
      link.download = `${fileNameBase ?? 'preview'}.png`
      link.href = dataUrl
      link.click()
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } catch (err) {
      console.error('PNG export failed', err)
    }
  }, [fileNameBase])

  // Share huidige URL (state zit al in query-params via PhotoStage).
  const onShare = useCallback(async () => {
    try {
      const url = window.location.href
      // Native Web Share API op mobile, fallback naar clipboard
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try {
          await (navigator as unknown as { share: (d: { url: string; title?: string }) => Promise<void> }).share({ url })
          return
        } catch {
          // user cancelde — val terug op clipboard
        }
      }
      await navigator.clipboard.writeText(url)
      setSharedFlash(true)
      setTimeout(() => setSharedFlash(false), 1500)
    } catch (err) {
      console.error('Share failed', err)
    }
  }, [])

  // Compute frame-afmetingen binnen stage-zone
  const stageMaxW = stageSize.w
  const stageMaxH = stageSize.h - 80
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

  // Schaal-aware shadow & frame-thickness
  const sizeWeight = dims ? Math.min(1, Math.max(0.4, (dims.w + dims.h) / 200)) : 0.6
  const shadowOffsetX = 6 + sizeWeight * 8
  const shadowOffsetY = 10 + sizeWeight * 18 + (hovered ? 6 : 0)
  const shadowBlur = 20 + sizeWeight * 22 + (hovered ? 10 : 0)
  const shadowOpacity = 0.20 + sizeWeight * 0.18 + (hovered ? 0.05 : 0)

  // Crop-waarschuwing
  let showCropHint = false
  if (naturalAspect != null && dims) {
    const ratio = aspect / naturalAspect
    showCropHint = ratio < 0.8 || ratio > 1.25
  }

  // ESC + arrow-key cycling in lightbox
  useEffect(() => {
    if (!zoomOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setZoomOpen(false); return }
      if (!availableMaterialSlugs || !onMaterialCycle || availableMaterialSlugs.length < 2) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const idx = mediaSlug ? availableMaterialSlugs.indexOf(mediaSlug) : -1
      const dir = e.key === 'ArrowRight' ? 1 : -1
      const next = availableMaterialSlugs[(idx + dir + availableMaterialSlugs.length) % availableMaterialSlugs.length]
      if (next) onMaterialCycle(next)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [zoomOpen, availableMaterialSlugs, mediaSlug, onMaterialCycle])

  // Combineer alle rotaties: 3D-tilt + hover + parallax (laatste alleen
  // wanneer geen reduced-motion). Parallax-strength: ±5° max op X/Y.
  const tiltY = -1.5 + (hovered ? -1.5 : 0) + (reducedMotion ? 0 : parallax.x * -5)
  const tiltX = 0.5 + (hovered ? 0.5 : 0) + (reducedMotion ? 0 : parallax.y * 4)
  const lift = hovered ? 12 : 0
  const wallTheme = WALL_THEMES[wall]
  // Hang-positie: high duwt frame omhoog, low naar beneden. Centerpoint
  // is op -52% (default). High = -78%, Low = -22% (in vh-relatief).
  const hangShift = hang === 'high' ? -26 : hang === 'low' ? 30 : 0

  return (
    <>
      <div
        ref={stageRef}
        className="fp-stage relative w-full overflow-hidden rounded-sm"
        style={{
          height: stageSize.h,
          background: wallTheme.background,
          perspective: '1500px',
          transition: 'background 400ms ease-out',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); resetParallax() }}
        onMouseMove={onMouseMove}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: wallTheme.lightSpot, transition: 'background 400ms ease-out' }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: 22,
            background: wallTheme.floor,
            borderTop: '1px solid rgba(74,55,30,0.18)',
            transition: 'background 400ms ease-out',
          }}
        />

        {/* Room-scene: sofa + side table silhouette wanneer wall === 'room' */}
        {wall === 'room' && <RoomScene mounted={mounted} />}

        {/* Frame — alle 4 material-skins blijven gemount, crossfade via opacity. */}
        <div
          className="absolute left-1/2 top-1/2 cursor-zoom-in"
          style={{
            width: frameW,
            height: frameH,
            transform: `translate(-50%, calc(-52% + ${hangShift}px)) scale(${mounted ? 1 : 0.94}) rotateY(${tiltY}deg) rotateX(${tiltX}deg) translateZ(${lift}px)`,
            transformStyle: 'preserve-3d',
            filter: `drop-shadow(${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity}))`,
            opacity: mounted ? 1 : 0,
            transition: reducedMotion
              ? 'opacity 200ms ease-out'
              : 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease-out, filter 500ms ease-out',
          }}
          onClick={() => setZoomOpen(true)}
          role="button"
          aria-label={labels.zoom}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setZoomOpen(true) } }}
        >
          <CrossfadeFrame
            variant={variant}
            photoUrl={photoUrl}
            alt={alt}
            sizeWeight={sizeWeight}
            frameColor={frameColor}
            onLoad={() => setImgLoaded(true)}
            reducedMotion={reducedMotion}
          />

          {/* Shimmer overlay tijdens load */}
          {!imgLoaded && (
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(110deg, rgba(232,228,220,0.6) 8%, rgba(245,242,236,0.95) 18%, rgba(232,228,220,0.6) 33%)',
                backgroundSize: '200% 100%',
                animation: reducedMotion ? undefined : 'fp-shimmer 1.2s linear infinite',
              }}
            />
          )}
        </div>

        {/* Schaal-silhouette voor grote formaten */}
        {dims && dims.w + dims.h >= 120 && stageMaxW - frameW > 50 && (
          <ScaleSilhouette
            stageHeight={stageSize.h}
            frameHeightPx={frameH}
            frameHeightCm={dims.h}
            mounted={mounted}
            label={`${dims.h} cm`}
            inkColor={wallTheme.ink}
          />
        )}

        {/* Caption rechtsonder met formaat + materiaal + oriëntatie */}
        {dims && (
          <p
            className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.2em] backdrop-blur-sm px-2 py-1 rounded"
            style={{
              color: wall === 'dark' ? '#e8e3da' : 'var(--color-stone)',
              background: wall === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.70)',
            }}
          >
            {dims.w} × {dims.h} cm
            {mediaName && <> · {mediaName}</>}
            {' · '}{orientation === 'landscape' ? labels.paysage : labels.portrait}
          </p>
        )}

        {/* Zoom-knop linksonder */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setZoomOpen(true) }}
          className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] backdrop-blur-sm px-2 py-1 rounded transition-colors"
          style={{
            color: wall === 'dark' ? '#e8e3da' : 'var(--color-stone)',
            background: wall === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.70)',
          }}
          aria-label={labels.zoom}
        >
          <Maximize2 className="w-3 h-3" />
          {labels.zoom}
        </button>

        {/* Wall-toggle + save + share rechtsboven */}
        {showActions && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
            {/* Wall-toggle: 4 themes */}
            {onWallChange && (
              <div
                className="inline-flex gap-1 backdrop-blur-sm rounded p-0.5"
                style={{
                  background: wall === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.70)',
                }}
                role="radiogroup"
                aria-label={labels.onWall}
              >
                {(
                  [
                    { key: 'beige', Icon: Square, lbl: labels.wallBeige },
                    { key: 'white', Icon: Sun, lbl: labels.wallWhite },
                    { key: 'dark',  Icon: Moon, lbl: labels.wallDark },
                    { key: 'room',  Icon: Sofa, lbl: labels.wallRoom },
                  ] as const
                ).map(({ key, Icon, lbl }) => {
                  const sel = key === wall
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setWall(key)}
                      className={`p-1.5 rounded transition-colors ${
                        sel
                          ? 'bg-stone-900 text-white'
                          : wall === 'dark'
                            ? 'text-stone-200 hover:bg-white/10'
                            : 'text-stone-600 hover:bg-stone-200'
                      }`}
                      aria-label={lbl}
                      aria-pressed={sel}
                      title={lbl}
                    >
                      <Icon className="w-3 h-3" />
                    </button>
                  )
                })}
              </div>
            )}
            {/* Hang-positie (alleen als parent een setter geeft) */}
            {onHangChange && (
              <div
                className="inline-flex gap-1 backdrop-blur-sm rounded p-0.5"
                style={{
                  background: wall === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.70)',
                }}
                role="radiogroup"
                aria-label={labels.share /* fallback aria; wordt door title overschreven */}
              >
                {(
                  [
                    { key: 'high', Icon: ArrowUp },
                    { key: 'mid', Icon: Minus },
                    { key: 'low', Icon: ArrowDown },
                  ] as const
                ).map(({ key, Icon }) => {
                  const sel = key === hang
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onHangChange(key)}
                      className={`p-1.5 rounded transition-colors ${
                        sel
                          ? 'bg-stone-900 text-white'
                          : wall === 'dark'
                            ? 'text-stone-200 hover:bg-white/10'
                            : 'text-stone-600 hover:bg-stone-200'
                      }`}
                      aria-label={`Hang: ${key}`}
                      aria-pressed={sel}
                      title={key === 'high' ? 'Haut' : key === 'low' ? 'Bas' : 'Centre'}
                    >
                      <Icon className="w-3 h-3" />
                    </button>
                  )
                })}
              </div>
            )}
            {/* Save + Share */}
            <div
              className="inline-flex gap-1 backdrop-blur-sm rounded p-0.5"
              style={{
                background: wall === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.70)',
              }}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void onSave() }}
                className={`inline-flex items-center gap-1 px-2 py-1.5 rounded transition-colors text-[10px] uppercase tracking-[0.18em] ${
                  wall === 'dark'
                    ? 'text-stone-200 hover:bg-white/10'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
                aria-label={labels.save}
                title={labels.save}
              >
                {savedFlash ? <Check className="w-3 h-3" /> : <Download className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void onShare() }}
                className={`inline-flex items-center gap-1 px-2 py-1.5 rounded transition-colors text-[10px] uppercase tracking-[0.18em] ${
                  wall === 'dark'
                    ? 'text-stone-200 hover:bg-white/10'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
                aria-label={labels.share}
                title={labels.share}
              >
                {sharedFlash ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
              </button>
            </div>
            {/* Toast voor save/share feedback */}
            {(savedFlash || sharedFlash) && (
              <p
                className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded bg-stone-900 text-white animate-in fade-in"
              >
                {savedFlash ? labels.saveDone : labels.shareCopied}
              </p>
            )}
          </div>
        )}

        {/* Crop-hint linksboven */}
        {showCropHint && (
          <div className="absolute top-3 left-3 max-w-[60%] inline-flex items-start gap-1.5 text-[10px] text-amber-900 bg-amber-50/95 border border-amber-200 px-2 py-1.5 rounded leading-snug shadow-sm">
            <AlertTriangle className="w-3 h-3 mt-px shrink-0" />
            <span>{labels.cropHint}</span>
          </div>
        )}

        {/* Shimmer + texture entry-keyframes. Reduced-motion override
            zet alle keyframe-animaties uit zonder extra JS. */}
        <style>{`
          @keyframes fp-shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes fp-tex-fade-in {
            0%   { opacity: 0; }
            100% { opacity: 0.7; }
          }
          @keyframes fp-glare-slide {
            0%   { opacity: 0; transform: translateX(-30%); }
            60%  { opacity: 1; }
            100% { opacity: 1; transform: translateX(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .fp-stage * {
              animation-duration: 0ms !important;
              animation-delay: 0ms !important;
            }
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
            {availableMaterialSlugs && availableMaterialSlugs.length > 1 && (
              <> · ← → matériau</>
            )}
          </p>
        </div>
      )}
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Crossfade tussen materialen — alle 4 skins blijven gemount, alleen de
// active heeft opacity 1.
// ────────────────────────────────────────────────────────────────────────

function CrossfadeFrame({
  variant,
  photoUrl,
  alt,
  sizeWeight,
  frameColor,
  onLoad,
  reducedMotion,
}: {
  variant: KnownMaterial
  photoUrl: string
  alt: string
  sizeWeight: number
  frameColor: FrameColor
  onLoad: () => void
  reducedMotion: boolean
}) {
  const variants: KnownMaterial[] = useMemo(() => ['fine_art', 'canvas', 'aluminum', 'plexi'], [])
  return (
    <>
      {variants.map((v) => (
        <div
          key={v}
          className="absolute inset-0"
          style={{
            opacity: v === variant ? 1 : 0,
            transition: reducedMotion ? 'none' : 'opacity 280ms ease-out',
            pointerEvents: v === variant ? 'auto' : 'none',
          }}
        >
          {v === 'canvas' && <CanvasFrame photoUrl={photoUrl} alt={alt} onLoad={v === variant ? onLoad : undefined} />}
          {v === 'fine_art' && (
            <FineArtFrame
              photoUrl={photoUrl}
              alt={alt}
              weight={sizeWeight}
              color={frameColor}
              onLoad={v === variant ? onLoad : undefined}
            />
          )}
          {v === 'aluminum' && <DibondFrame photoUrl={photoUrl} alt={alt} onLoad={v === variant ? onLoad : undefined} />}
          {v === 'plexi' && <PlexiFrame photoUrl={photoUrl} alt={alt} onLoad={v === variant ? onLoad : undefined} />}
        </div>
      ))}
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

function CanvasFrame({ photoUrl, alt, onLoad }: { photoUrl: string; alt: string; onLoad?: () => void }) {
  return (
    <div className="absolute inset-0">
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
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow:
            'inset 4px 4px 10px rgba(0,0,0,0.20), inset -4px -4px 8px rgba(0,0,0,0.14)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("${TEX_CANVAS}")`,
          backgroundSize: '60px 60px',
          backgroundRepeat: 'repeat',
          // Fade-in na photo-load: opacity 0 → 0.7 in 800ms met 250ms delay
          animation: 'fp-tex-fade-in 800ms ease-out 250ms forwards',
          opacity: 0,
        }}
      />
    </div>
  )
}

function FineArtFrame({
  photoUrl, alt, weight, color = 'oak', onLoad,
}: {
  photoUrl: string
  alt: string
  weight: number
  color?: FrameColor
  onLoad?: () => void
}) {
  const margin = `${6 + weight * 5}%`
  // Frame styling per kleur — wood-grain texture wordt enkel op de
  // 'oak' getoond. Black + white krijgen vlakke kleur + subtiele beveled
  // edge via box-shadow.
  const frameStyle: React.CSSProperties =
    color === 'oak'
      ? {
          background: '#1a1612',
          border: '1px solid #0f0c0a',
          backgroundImage: `url("${TEX_WOOD}")`,
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x',
        }
      : color === 'black'
        ? {
            background: '#0d0d0d',
            border: '1px solid #000',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.5)',
          }
        : {
            background: '#fafafa',
            border: '1px solid #d8d4cd',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(0,0,0,0.08)',
          }
  return (
    <div className="absolute inset-0" style={frameStyle}>
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
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.22)' }}
          />
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
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(155deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 35%)',
          }}
        />
      </div>
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

function PlexiFrame({ photoUrl, alt, onLoad }: { photoUrl: string; alt: string; onLoad?: () => void }) {
  return (
    <div className="absolute inset-0">
      <CoverImg photoUrl={photoUrl} alt={alt} onLoad={onLoad} />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("${TEX_PLEXI}")`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          // Glare schuift in vanaf links na de photo-load
          animation: 'fp-glare-slide 900ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards',
          transform: 'translateX(-30%)',
          opacity: 0,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.20)' }}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Room-scene: gestileerde sofa + side table onder het kader voor extra
// woonkamer-context wanneer wall === 'room'.
// ────────────────────────────────────────────────────────────────────────

function RoomScene({ mounted }: { mounted: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 200"
      preserveAspectRatio="xMidYMax meet"
      className="absolute inset-x-0 bottom-0 pointer-events-none"
      style={{
        height: '40%',
        opacity: mounted ? 0.55 : 0,
        transition: 'opacity 700ms ease-out 200ms',
      }}
    >
      {/* Sofa silhouet */}
      <g fill="#6b5640">
        {/* Hoofdblok */}
        <path d="M60 145 Q60 115 90 115 L290 115 Q320 115 320 145 L320 175 L60 175 Z" />
        {/* Armleuningen */}
        <rect x="50" y="120" width="22" height="55" rx="6" />
        <rect x="308" y="120" width="22" height="55" rx="6" />
        {/* Kussen-naden */}
        <line x1="155" y1="118" x2="155" y2="170" stroke="#534332" strokeWidth="1.2" />
        <line x1="225" y1="118" x2="225" y2="170" stroke="#534332" strokeWidth="1.2" />
        {/* Pootjes */}
        <rect x="70" y="175" width="6" height="10" />
        <rect x="304" y="175" width="6" height="10" />
      </g>
      {/* Side table rechts naast sofa */}
      <g fill="#3e3128">
        <rect x="345" y="135" width="40" height="8" />
        <rect x="350" y="143" width="3" height="35" />
        <rect x="377" y="143" width="3" height="35" />
        {/* Vaas + sprietje */}
        <path d="M358 122 Q358 117 362 117 L368 117 Q372 117 372 122 L370 135 L360 135 Z" fill="#8a6f54" />
        <path d="M365 117 Q368 105 372 100" stroke="#3a5a32" strokeWidth="1.2" fill="none" />
        <path d="M365 117 Q362 108 358 103" stroke="#3a5a32" strokeWidth="1.2" fill="none" />
      </g>
    </svg>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Schaal-silhouette
// ────────────────────────────────────────────────────────────────────────

function ScaleSilhouette({
  stageHeight,
  frameHeightPx,
  frameHeightCm,
  mounted,
  label,
  inkColor,
}: {
  stageHeight: number
  frameHeightPx: number
  frameHeightCm: number
  mounted: boolean
  label: string
  inkColor: string
}) {
  const pxPerCm = frameHeightPx / Math.max(1, frameHeightCm)
  const silhouettePx = Math.round(170 * pxPerCm)
  const maxPx = stageHeight - 50
  const finalPx = Math.min(silhouettePx, maxPx)
  return (
    <div
      aria-hidden
      className="absolute"
      style={{
        right: 12,
        bottom: 22,
        height: finalPx,
        width: 32,
        opacity: mounted ? 0.55 : 0,
        transition: 'opacity 700ms ease-out 200ms',
        color: inkColor,
      }}
    >
      <User
        style={{ width: '100%', height: 'auto' }}
        strokeWidth={1.4}
      />
      <span
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.2em] whitespace-nowrap"
        style={{ color: inkColor }}
      >
        {label}
      </span>
    </div>
  )
}
