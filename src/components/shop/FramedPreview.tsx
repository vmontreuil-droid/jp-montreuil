'use client'

/**
 * In-kader preview voor de shop. Toont de foto binnen een mockup van het
 * gekozen materiaal — canvas met side-wrap, dibond met dunne metaal-rand,
 * plexi met glossy reflectie, papier met passe-partout. Foto wordt
 * `object-cover` gerenderd zodat ze het kader vult (cropped indien
 * portrait-foto in landscape-kader of omgekeerd).
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

export function FramedPreview({
  photoUrl,
  alt,
  mediaSlug,
  sizeLabel,
  orientation,
}: {
  photoUrl: string
  alt: string
  mediaSlug: string | null
  sizeLabel: string | null
  /** Bepaalt swap van w/h indien nodig. Sizes worden in DB als portrait
   *  (h > w) opgeslagen; landscape spiegelt ze. */
  orientation: Orientation
}) {
  const dims = parseDimensions(sizeLabel)
  // Aspect ratio uit het label (post-flip is de label al 45×30 voor
  // landscape). Fallback: vierkant.
  const aspect = dims ? dims.w / dims.h : 1

  // Kies een vaste "stage"-hoogte/breedte zodat het kader zich daarbinnen
  // schaalt. Hierdoor blijft het rechter-paneel (configurator) op zijn
  // plaats wanneer de klant van formaat wisselt.
  const stageMaxWidth = 380 // px — komt overeen met paneel-breedte op md+
  const stageMaxHeight = 460
  let frameW: number
  let frameH: number
  if (aspect >= 1) {
    // landscape of vierkant → bind aan breedte
    frameW = stageMaxWidth
    frameH = Math.round(stageMaxWidth / aspect)
    if (frameH > stageMaxHeight) {
      frameH = stageMaxHeight
      frameW = Math.round(stageMaxHeight * aspect)
    }
  } else {
    // portrait → bind aan hoogte
    frameH = stageMaxHeight
    frameW = Math.round(stageMaxHeight * aspect)
    if (frameW > stageMaxWidth) {
      frameW = stageMaxWidth
      frameH = Math.round(stageMaxWidth / aspect)
    }
  }

  const variant: KnownMaterial = isKnownMaterial(mediaSlug) ? mediaSlug : 'fine_art'

  return (
    <div
      className="relative w-full bg-(--color-canvas) border border-(--color-frame) flex items-center justify-center overflow-hidden"
      style={{ height: stageMaxHeight + 80 }}
    >
      {/* Vage muur-textuur achter het kader */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.04) 70%, rgba(0,0,0,0.08) 100%)',
        }}
      />

      <div style={{ width: frameW, height: frameH }} className="relative">
        {variant === 'canvas' && <CanvasFrame photoUrl={photoUrl} alt={alt} />}
        {variant === 'fine_art' && <FineArtFrame photoUrl={photoUrl} alt={alt} />}
        {variant === 'aluminum' && <DibondFrame photoUrl={photoUrl} alt={alt} />}
        {variant === 'plexi' && <PlexiFrame photoUrl={photoUrl} alt={alt} />}
      </div>

      {/* Caption rechtsonder met formaat + oriëntatie hint */}
      {dims && (
        <p className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.2em] text-(--color-stone)">
          {dims.w} × {dims.h} cm · {orientation === 'landscape' ? 'paysage' : 'portrait'}
        </p>
      )}
    </div>
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
      className="absolute inset-0 w-full h-full object-cover"
      draggable={false}
    />
  )
}

/**
 * Canvas: foto vult het zichtbare voorvlak. Side-wrap wordt gesuggereerd
 * door een lichte schaduw aan de bovenkant + linkerkant (alsof het doek
 * over de zijkant van het houten kader gespannen zit) en een dikkere
 * drop-shadow eronder.
 */
function CanvasFrame({ photoUrl, alt }: { photoUrl: string; alt: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        boxShadow:
          // Drop-shadow eronder + zachte glow eromheen
          '0 18px 32px -10px rgba(0,0,0,0.45), 0 4px 8px rgba(0,0,0,0.18)',
      }}
    >
      <CoverImg photoUrl={photoUrl} alt={alt} />
      {/* Wrap-suggestie boven + links — zachte donker-naar-licht gradient */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.18), inset -4px -4px 6px rgba(0,0,0,0.12)',
        }}
      />
      {/* Subtiele canvas-textuur (diagonale vezels) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)',
        }}
      />
    </div>
  )
}

/**
 * Fine art: papier baryté met wit passe-partout en dunne donkergrijze
 * kader-omlijsting. Foto vult de inner-cutout (cover, cropped indien
 * nodig).
 */
function FineArtFrame({ photoUrl, alt }: { photoUrl: string; alt: string }) {
  return (
    <div
      className="absolute inset-0 bg-white"
      style={{
        boxShadow: '0 14px 24px -8px rgba(0,0,0,0.30), 0 2px 4px rgba(0,0,0,0.10)',
        border: '1px solid #1f1d1a',
      }}
    >
      {/* Passe-partout (wit) met geneste foto */}
      <div className="absolute inset-[8%] bg-white" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}>
        <div className="absolute inset-0 overflow-hidden">
          <CoverImg photoUrl={photoUrl} alt={alt} />
          {/* Subtiele inset-shadow alsof foto in passe-partout zit */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.20)' }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Aluminium dibond: dunne metaal-rand, koel grijs, vlakke schaduw.
 */
function DibondFrame({ photoUrl, alt }: { photoUrl: string; alt: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        boxShadow: '0 12px 22px -8px rgba(0,0,0,0.40)',
        border: '2px solid',
        borderImage:
          'linear-gradient(135deg, #c8c8c8 0%, #f4f4f4 45%, #b8b8b8 100%) 1',
      }}
    >
      <CoverImg photoUrl={photoUrl} alt={alt} />
      {/* Heel subtiele matte sheen */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(155deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 35%)',
        }}
      />
    </div>
  )
}

/**
 * Plexi: hoogglans reflectie, dikkere drop-shadow voor "zwevend"
 * gallery-effect.
 */
function PlexiFrame({ photoUrl, alt }: { photoUrl: string; alt: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        boxShadow: '0 24px 40px -8px rgba(0,0,0,0.55), 0 6px 12px rgba(0,0,0,0.25)',
      }}
    >
      <CoverImg photoUrl={photoUrl} alt={alt} />
      {/* Glossy reflectie — diagonale lichtflits in linkerbovenhoek */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(125deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 22%, rgba(255,255,255,0) 45%)',
        }}
      />
      {/* Dunne plexi-randhint */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.45)' }}
      />
    </div>
  )
}
