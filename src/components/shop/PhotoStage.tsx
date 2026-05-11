'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X, Home, Bed, Briefcase, DoorOpen, Sparkles, Mail } from 'lucide-react'
import { WishlistButton } from './WishlistButton'
import { PreviewMailModal } from './PreviewMailModal'
import {
  FramedPreview,
  type FramedPreviewLabels,
  type WallTheme,
  type FrameColor,
  type HangPosition,
} from './FramedPreview'
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
 * State-persistence: na mount worden de URL search-params + localStorage
 * gelezen om de configurator-keuzes te herstellen. Bij elke wijziging
 * worden URL en localStorage geupdate. Avoids hydration mismatch door
 * altijd defaults te SSR-en en pas in useEffect te overrijden.
 *
 * Compare-mode: full-width 2-koloms layout met dropdown per cel.
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

type RelatedPhoto = { id: string; slug: string; url: string; alt: string }

const LS_KEY = 'shop:framed-preview:v1'

type RoomKey = 'living' | 'bedroom' | 'office' | 'hallway'
const ROOM_TO_MATERIAL: Record<RoomKey, string> = {
  living: 'canvas',     // warm en groot voor een sofa-muur
  bedroom: 'fine_art',  // rustig en mat voor een slaapkamer
  office: 'aluminum',   // strak en modern voor bureau
  hallway: 'plexi',     // glossy en oogvangend in een gang
}

function isWallTheme(s: string | null | undefined): s is WallTheme {
  return s === 'beige' || s === 'white' || s === 'dark' || s === 'room'
}
function isFrameColor(s: string | null | undefined): s is FrameColor {
  return s === 'oak' || s === 'black' || s === 'white'
}
function isHang(s: string | null | undefined): s is HangPosition {
  return s === 'high' || s === 'mid' || s === 'low'
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
  popularMaterialSlug = null,
  popularSizeSlug = null,
  relatedPhotos = [],
  locale = 'fr',
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
  /** Echte popular-combos uit order_items. Null = laat
   *  PrintConfigurator's hardcoded default (canvas + m) gebruiken. */
  popularMaterialSlug?: string | null
  popularSizeSlug?: string | null
  /** 2 related foto's voor triptych-mode (links + rechts van de
   *  gekozen foto). Optioneel — als < 2 dan is triptych verborgen. */
  relatedPhotos?: RelatedPhoto[]
  /** UI-locale ('fr'|'nl'). Wordt doorgegeven aan share-mail modal. */
  locale?: 'fr' | 'nl'
}) {
  const firstAvail = prices.find((p) => p.isAvailable)
  const [mediaSlug, setMediaSlug] = useState<string | null>(firstAvail?.mediaSlug ?? null)
  const [sizeSlug, setSizeSlug] = useState<string | null>(firstAvail?.sizeSlug ?? null)
  const [orientation, setOrientation] = useState<Orientation>(
    defaultOrientation === 'landscape' ? 'landscape' : 'portrait',
  )
  const [wall, setWall] = useState<WallTheme>('beige')
  const [frameColor, setFrameColor] = useState<FrameColor>('oak')
  const [hang, setHang] = useState<HangPosition>('mid')
  const [room, setRoom] = useState<RoomKey | null>(null)

  const [compareOpen, setCompareOpen] = useState(false)
  const [triptychOpen, setTriptychOpen] = useState(false)
  const [mailOpen, setMailOpen] = useState(false)
  const fallbackB = media.find((m) => m.slug !== mediaSlug)?.slug ?? media[0]?.slug ?? null
  const [compareSlugB, setCompareSlugB] = useState<string | null>(fallbackB)

  // ── State persistence: hydrate van URL > localStorage > defaults ──
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    try {
      const sp = new URLSearchParams(window.location.search)
      const fromUrl = {
        material: sp.get('material'),
        size: sp.get('size'),
        orientation: sp.get('orientation'),
        wall: sp.get('wall'),
        frame: sp.get('frame'),
        hang: sp.get('hang'),
      }
      const ls = (() => {
        try {
          const raw = window.localStorage.getItem(LS_KEY)
          return raw ? JSON.parse(raw) as Record<string, string> : {}
        } catch { return {} as Record<string, string> }
      })()

      const pick = (key: string): string | null => fromUrl[key as keyof typeof fromUrl] ?? ls[key] ?? null
      const m = pick('material')
      const s = pick('size')
      const o = pick('orientation')
      const w = pick('wall')
      const f = pick('frame')
      const h = pick('hang')

      if (m && media.some((x) => x.slug === m)) setMediaSlug(m)
      if (s && sizes.some((x) => x.slug === s)) setSizeSlug(s)
      if (o === 'portrait' || o === 'landscape') setOrientation(o)
      if (isWallTheme(w)) setWall(w)
      if (isFrameColor(f)) setFrameColor(f)
      if (isHang(h)) setHang(h)
    } catch {
      // ignore — bv. tijdens SSR / disabled storage
    }
  }, [media, sizes])

  // ── Sync wijzigingen naar URL (replaceState) + localStorage ──
  useEffect(() => {
    if (!restoredRef.current) return
    try {
      const sp = new URLSearchParams(window.location.search)
      if (mediaSlug) sp.set('material', mediaSlug); else sp.delete('material')
      if (sizeSlug) sp.set('size', sizeSlug); else sp.delete('size')
      sp.set('orientation', orientation)
      sp.set('wall', wall)
      sp.set('frame', frameColor)
      sp.set('hang', hang)
      const newUrl = `${window.location.pathname}?${sp.toString()}${window.location.hash}`
      window.history.replaceState(null, '', newUrl)
      window.localStorage.setItem(LS_KEY, JSON.stringify({
        material: mediaSlug ?? '',
        size: sizeSlug ?? '',
        orientation,
        wall,
        frame: frameColor,
        hang,
      }))
    } catch {
      // ignore
    }
  }, [mediaSlug, sizeSlug, orientation, wall, frameColor, hang])

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
    wallBeige: labels.wallBeige,
    wallWhite: labels.wallWhite,
    wallDark: labels.wallDark,
    wallRoom: labels.wallRoom,
    save: labels.previewSave,
    saveDone: labels.previewSaveDone,
    share: labels.previewShare,
    shareCopied: labels.previewShareCopied,
  }

  const allSlugs = media.map((m) => m.slug)
  const fileNameBase = `${photoSlug}-${mediaSlug ?? 'preview'}-${sizeSlug ?? ''}`
  // Leesbare configuratie-samenvatting voor de share-mail
  const configSummary = [
    photoTitle,
    mediaName,
    sizeLabel,
    orientation === 'landscape' ? labels.paysage : labels.portrait,
  ].filter(Boolean).join(' · ')
  // Huidige URL inclusief alle state-params (alleen op de client beschikbaar)
  const [currentUrl, setCurrentUrl] = useState('')
  useEffect(() => {
    setCurrentUrl(window.location.href)
  }, [mediaSlug, sizeSlug, orientation, wall, frameColor, hang])

  function priceFor(matSlug: string | null): string | null {
    if (!matSlug || !sizeSlug) return null
    const cell = prices.find((p) => p.mediaSlug === matSlug && p.sizeSlug === sizeSlug)
    return cell ? cell.priceFormatted : null
  }

  // ── Triptych-mode: 3 frames naast elkaar (related-current-related) ──
  if (triptychOpen && relatedPhotos.length >= 2) {
    const left = relatedPhotos[0]
    const right = relatedPhotos[1]
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs uppercase tracking-[0.25em] text-(--color-bronze)">
            {labels.triptychOpen}
            {mediaName && <span className="ml-3 text-(--color-stone) tracking-widest">· {mediaName}</span>}
          </p>
          <button
            type="button"
            onClick={() => setTriptychOpen(false)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-(--color-stone) border border-(--color-frame) rounded hover:border-(--color-stone) hover:text-(--color-ink) transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            {labels.triptychExit}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <TriptychCell
            title={labels.triptychLeft}
            href={`/shop/boutique/photo/${left.slug}`}
          >
            <FramedPreview
              photoUrl={left.url}
              alt={left.alt}
              mediaSlug={mediaSlug}
              mediaName={mediaName}
              sizeLabel={sizeLabel}
              orientation={orientation}
              naturalAspect={null}
              labels={previewLabels}
              wall={wall}
              frameColor={frameColor}
              hang={hang}
              showActions={false}
              fileNameBase={`${fileNameBase}-L`}
            />
          </TriptychCell>
          <TriptychCell
            title={labels.triptychCenter}
            href={null}
            highlighted
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
              wall={wall}
              frameColor={frameColor}
              hang={hang}
              showActions={false}
              fileNameBase={`${fileNameBase}-C`}
            />
          </TriptychCell>
          <TriptychCell
            title={labels.triptychRight}
            href={`/shop/boutique/photo/${right.slug}`}
          >
            <FramedPreview
              photoUrl={right.url}
              alt={right.alt}
              mediaSlug={mediaSlug}
              mediaName={mediaName}
              sizeLabel={sizeLabel}
              orientation={orientation}
              naturalAspect={null}
              labels={previewLabels}
              wall={wall}
              frameColor={frameColor}
              hang={hang}
              showActions={false}
              fileNameBase={`${fileNameBase}-R`}
            />
          </TriptychCell>
        </div>
      </div>
    )
  }

  // ── Compare-mode ──
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
              wall={wall}
              frameColor={frameColor}
              hang={hang}
              showActions={false}
              fileNameBase={`${fileNameBase}-A`}
            />
          </CompareCell>

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
              wall={wall}
              frameColor={frameColor}
              hang={hang}
              showActions={false}
              fileNameBase={`${fileNameBase}-B`}
            />
          </CompareCell>
        </div>
      </div>
    )
  }

  // ── Standaard layout ──
  return (
    <div className="grid md:grid-cols-2 gap-10">
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
          wall={wall}
          onWallChange={setWall}
          frameColor={frameColor}
          fileNameBase={fileNameBase}
          hang={hang}
          onHangChange={setHang}
        />
        <WishlistButton
          photoId={photoId}
          className="absolute top-3 left-3 z-10"
          size={18}
        />
      </div>

      <div>
        {rightHeader}
        <button
          type="button"
          onClick={() => setMailOpen(true)}
          className="mb-4 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-(--color-bronze) hover:text-(--color-bronze-dark) transition-colors"
        >
          <Mail className="w-3.5 h-3.5" />
          {labels.previewMail}
        </button>
        <RoomRecommender
          labels={labels}
          room={room}
          onRoomChange={(r) => {
            setRoom(r)
            // Stelt automatisch het gesuggereerde materiaal in
            const suggested = ROOM_TO_MATERIAL[r]
            if (media.some((m) => m.slug === suggested)) setMediaSlug(suggested)
          }}
        />
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
          onTriptychClick={relatedPhotos.length >= 2 ? () => setTriptychOpen(true) : undefined}
          frameColor={frameColor}
          onFrameColorChange={setFrameColor}
          popularMaterialSlug={popularMaterialSlug ?? undefined}
          popularSizeSlug={popularSizeSlug ?? undefined}
        />
      </div>

      <PreviewMailModal
        open={mailOpen}
        onClose={() => setMailOpen(false)}
        slug={photoSlug}
        configUrl={currentUrl}
        configSummary={configSummary}
        locale={locale}
        labels={{
          title: labels.previewMailTitle,
          lead: labels.previewMailLead,
          fromName: labels.previewMailFromName,
          to: labels.previewMailTo,
          note: labels.previewMailNote,
          send: labels.previewMailSend,
          sending: labels.previewMailSending,
          sent: labels.previewMailSent,
          failed: labels.previewMailFailed,
          rateLimited: labels.previewMailRateLimited,
          cancel: labels.previewClose,
        }}
      />
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

/** Triptych-cell: titel + (optioneel klikbaar) frame, midden krijgt
 *  een gemarkeerde rand zodat de "huidige" foto opvalt. */
function TriptychCell({
  title,
  href,
  highlighted = false,
  children,
}: {
  title: string
  href: string | null
  highlighted?: boolean
  children: ReactNode
}) {
  const inner = (
    <div className={`space-y-2 ${highlighted ? 'ring-2 ring-(--color-bronze) rounded-sm' : ''}`}>
      <span className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone)">
        {title}
      </span>
      <div className="relative">{children}</div>
    </div>
  )
  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    )
  }
  return inner
}

/** Room-recommender: 4 chips ('salon' / 'chambre' / 'bureau' /
 *  'couloir'). Klik → zet automatisch het aanbevolen materiaal +
 *  toont een suggestie-zin. */
function RoomRecommender({
  labels,
  room,
  onRoomChange,
}: {
  labels: PrintConfiguratorLabels
  room: RoomKey | null
  onRoomChange: (r: RoomKey) => void
}) {
  const items: ReadonlyArray<{ key: RoomKey; lbl: string; Icon: typeof Home }> = [
    { key: 'living',   lbl: labels.roomLiving,   Icon: Home },
    { key: 'bedroom',  lbl: labels.roomBedroom,  Icon: Bed },
    { key: 'office',   lbl: labels.roomOffice,   Icon: Briefcase },
    { key: 'hallway',  lbl: labels.roomHallway,  Icon: DoorOpen },
  ]
  return (
    <div className="mb-5 space-y-2">
      <p className="text-xs uppercase tracking-widest text-stone-500">
        {labels.roomQuestion}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {items.map(({ key, lbl, Icon }) => {
          const sel = key === room
          return (
            <button
              key={key}
              type="button"
              onClick={() => onRoomChange(key)}
              className={`px-2 py-2 text-xs border rounded transition-colors inline-flex flex-col items-center gap-1 ${
                sel ? 'border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-ink)' : 'border-stone-300 text-stone-600 hover:border-stone-500'
              }`}
              aria-pressed={sel}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate">{lbl}</span>
            </button>
          )
        })}
      </div>
      {room && (
        <p className="text-[11px] text-(--color-bronze) inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          {labels.roomSuggest}: <strong className="font-medium">{ROOM_TO_MATERIAL[room]}</strong>
        </p>
      )}
    </div>
  )
}
