/**
 * Statische bedrijfsgegevens van Atelier Montreuil.
 * IBAN, adres, supplementen-IDs zijn hier hardcoded; tarieven worden
 * geladen uit de DB-tabel `commission_pricing` (zie src/lib/commission-pricing.ts).
 */
export const ATELIER = {
  name: 'Atelier Montreuil',
  ownerName: 'Jean-Pierre Montreuil',
  email: 'jp@montreuil.be',
  phone: '+32 475 61 68 38',
  address: 'Heuntjesstraat 6, 8570 Anzegem',
  iban: 'BE80 4621 1025 8177',
  ibanRaw: 'BE80462110258177',
  ibanHolder: 'Montreuil-Devogelaere J + M',
  bic: '',
  defaultAcomptePct: 50,
} as const

/** Format een bedrag in euro (komma als decimaalteken). */
export function formatEur(amount: number): string {
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Bouw een mededeling voor een overschrijving. */
export function buildPaymentReference(devisNumber: string): string {
  return `Devis ${devisNumber}`
}

/** Genereer een leesbaar devis-nummer (DV-2026-0001 stijl). */
export function generateDevisNumber(year: number, sequence: number): string {
  return `DV-${year}-${String(sequence).padStart(4, '0')}`
}

/** Standaard formaten — labels staan in i18n.devis.formatOptions */
export const FORMATS = [
  { id: '40x60', width: 40, height: 60 },
  { id: '57x77', width: 57, height: 77 },
  { id: '60x90', width: 60, height: 90 },
  { id: '130x160', width: 130, height: 160 },
] as const

export type FormatId = (typeof FORMATS)[number]['id'] | 'custom'

/** Frame keuzes — labels in i18n.devis.frameTypeOptions */
export const FRAME_TYPES = ['aucun', 'simple', 'standard', 'travaille', 'sur_mesure'] as const
export type FrameType = (typeof FRAME_TYPES)[number]

/** Supplementen die de klant kan aanvinken — labels in i18n.devis.supplementOptions */
export const SUPPLEMENT_IDS = [
  'background',
  'complex_decor',
  'high_detail',
  'hyperrealism',
  'rush',
] as const

export type SupplementId = (typeof SUPPLEMENT_IDS)[number]

/** Min/max aantal portretten dat de klant kan kiezen */
export const PORTRAIT_COUNT_MIN = 1
export const PORTRAIT_COUNT_MAX = 10

/**
 * Pricing-structuur (loaded uit DB tabel commission_pricing).
 * Defaults staan ook hier zodat de fallback klopt als DB-fetch faalt.
 */
export type Pricing = {
  format: Record<(typeof FORMATS)[number]['id'], number>
  frame: Record<Exclude<FrameType, 'aucun'>, number | null>
  supplement: Record<SupplementId, number>
  extraPortrait: number
}

export const DEFAULT_PRICING: Pricing = {
  format: {
    '40x60': 390,
    '57x77': 495,
    '60x90': 720,
    '130x160': 2250,
  },
  frame: {
    simple: 80,
    standard: 150,
    travaille: 280,
    sur_mesure: null, // "op aanvraag"
  },
  supplement: {
    background: 120,
    complex_decor: 200,
    high_detail: 150,
    hyperrealism: 250,
    rush: 180,
  },
  extraPortrait: 200,
} as const

/** Een lijn in de prijsdetail-tabel. */
export type PriceLineItem = {
  /** Stabiele key: 'format:40x60' | 'frame:simple' | 'extra_portraits' | 'supplement:background' etc. */
  key: string
  /** Optioneel aantal (voor extra portretten) */
  qty?: number
  /** Bedrag in EUR (0 als sur-devis lijn) */
  amount: number
  /** True als deze lijn "sur devis" is (geen vaste prijs) */
  onRequest?: boolean
}

export type PriceBreakdown = {
  /** Total bedrag, of null als ergens een sur-devis-lijn voorkomt */
  total: number | null
  lines: PriceLineItem[]
}

/**
 * Live prijsschatting met breakdown per lijn.
 * Returned `total: null` zodra een lijn "sur devis" is (custom formaat of cadre sur mesure).
 */
export function priceBreakdown(opts: {
  formatId: string
  frameType: FrameType
  portraitCount: number
  supplements: readonly string[]
  pricing: Pricing
}): PriceBreakdown {
  const { pricing } = opts
  const lines: PriceLineItem[] = []
  let onRequest = false

  // Format
  if (opts.formatId === 'custom') {
    onRequest = true
    lines.push({ key: 'format:custom', amount: 0, onRequest: true })
  } else {
    const fp = pricing.format[opts.formatId as keyof Pricing['format']]
    if (fp != null) lines.push({ key: `format:${opts.formatId}`, amount: fp })
  }

  // Frame
  if (opts.frameType !== 'aucun') {
    const fk = opts.frameType as Exclude<FrameType, 'aucun'>
    const fp = pricing.frame[fk]
    if (fp == null) {
      onRequest = true
      lines.push({ key: `frame:${fk}`, amount: 0, onRequest: true })
    } else if (fp > 0) {
      lines.push({ key: `frame:${fk}`, amount: fp })
    }
  }

  // Extra portraits
  const extra = Math.max(0, opts.portraitCount - 1)
  if (extra > 0) {
    lines.push({
      key: 'extra_portraits',
      qty: extra,
      amount: pricing.extraPortrait * extra,
    })
  }

  // Supplements
  for (const sid of opts.supplements) {
    const price = pricing.supplement[sid as SupplementId]
    if (price != null && price > 0) {
      lines.push({ key: `supplement:${sid}`, amount: price })
    }
  }

  const total = onRequest
    ? null
    : Math.round(lines.reduce((sum, l) => sum + l.amount, 0))

  return { total, lines }
}

/** Backwards-compatible helper: geeft enkel het totaal terug. */
export function estimatePrice(opts: {
  formatId: string
  frameType: FrameType
  portraitCount: number
  supplements: readonly string[]
  pricing: Pricing
}): number | null {
  return priceBreakdown(opts).total
}
