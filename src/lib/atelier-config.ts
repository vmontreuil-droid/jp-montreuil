/**
 * Statische bedrijfsgegevens van Atelier Montreuil.
 * Gebruikt voor de devis (IBAN, mededeling) en mailtjes.
 *
 * Wijzig hier wanneer JP een ander rekeningnummer gebruikt of de
 * standaard acompte-percentage aanpast — geen extra DB-tabel nodig.
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

/** Bouw een korte mededeling voor een overschrijving. Max 12 tekens vrij + `+++` */
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
export const FORMAT_IDS: readonly FormatId[] = [...FORMATS.map((f) => f.id), 'custom']

/** Supplementen die de klant kan aanvinken — labels in i18n.devis.supplementOptions
 * Aantal portretten staat apart als numeriek veld (portrait_count).
 */
export const SUPPLEMENT_IDS = ['background', 'high_detail', 'rush'] as const

export type SupplementId = (typeof SUPPLEMENT_IDS)[number]

/** Min/max aantal portretten dat de klant kan kiezen */
export const PORTRAIT_COUNT_MIN = 1
export const PORTRAIT_COUNT_MAX = 10

/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  RICHTPRIJZEN — pas deze aan naar JP's echte tarieven.            ║
 * ║  Wordt enkel gebruikt voor de live prijs-indicatie op /devis.     ║
 * ║  De échte prijs blijft staan in de devis-op-maat door JP.         ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */
export const PRICING = {
  /** Basisprijs per formaat (in EUR), voor de instaptechniek */
  formatBase: {
    '40x60': 250,
    '57x77': 400,
    '60x90': 600,
    '130x160': 1800,
  } as Record<string, number>,
  /** Vermenigvuldiger per techniek t.o.v. de basis */
  techniqueMultiplier: {
    crayon_nb: 1.0,
    aquarelle_couleur: 1.3,
    acrylique_toile: 1.5,
  } as Record<string, number>,
  /** Toeslag per extra portret, als % van (basis × techniek) */
  extraPortraitPct: 30,
  /** Toeslagen per supplement, als % van (basis × techniek) */
  supplementPct: {
    background: 25,
    high_detail: 20,
    rush: 30,
  } as Record<string, number>,
  /** Vaste meerprijs voor inkadering, per formaat */
  framingPrice: {
    '40x60': 80,
    '57x77': 120,
    '60x90': 150,
    '130x160': 280,
  } as Record<string, number>,
} as const

/** Live prijsschatting voor de /devis pagina. Geeft `null` voor 'custom' formaat. */
export function estimatePrice(opts: {
  formatId: string
  technique: string
  portraitCount: number
  supplements: readonly string[]
  framing: 'oui' | 'non'
}): number | null {
  if (opts.formatId === 'custom') return null
  const base = PRICING.formatBase[opts.formatId]
  const multiplier = PRICING.techniqueMultiplier[opts.technique]
  if (base == null || multiplier == null) return null

  const baseTechnique = base * multiplier
  let total = baseTechnique

  const extraPortraits = Math.max(0, opts.portraitCount - 1)
  total += baseTechnique * (PRICING.extraPortraitPct / 100) * extraPortraits

  for (const sid of opts.supplements) {
    const pct = PRICING.supplementPct[sid]
    if (pct) total += baseTechnique * (pct / 100)
  }

  if (opts.framing === 'oui') {
    const fp = PRICING.framingPrice[opts.formatId]
    if (fp) total += fp
  }

  return Math.round(total)
}
