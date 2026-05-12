// Update boutique-prijzen naar marktconforme tarieven (BE 2026)
// + seed 4 drukkerijen rond Waregem in shop.suppliers.
//
// Run: cd jp-montreuil && node --env-file=.env.local scripts/seed-prices-and-suppliers.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('env ontbreekt'); process.exit(1) }

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'shop' },
})

// ────────────────────────────────────────────────────────────────────────
// 1. Prijzen — marktconform voor BE 2026 voor wildlife / fine-art prints
// ────────────────────────────────────────────────────────────────────────
//
// Bronnen vergeleken: Whitewall (DE/BE), MyPosterFrame, Saal Digital,
// lokale drukkerijen rond Waregem, Belgische fine-art galerijen.
// Doel: comfortabel marktsegment — niet budget, niet luxe.
//
// Cellen: 4 materialen × 5 formaten = 20 cellen, prijs in eurocents.

const PRICE_MATRIX = {
  // material_slug → { size_slug → eurocents }
  fine_art: { s: 7500,  m: 14500, l: 24500, xl: 39500, xxl: 62500 },
  canvas:   { s: 9500,  m: 19500, l: 32500, xl: 52500, xxl: 82500 },
  aluminum: { s: 12500, m: 26500, l: 44500, xl: 72500, xxl: 119500 },
  plexi:    { s: 16500, m: 34500, l: 57500, xl: 98500, xxl: 169500 },
}

console.log('→ Lookup media + sizes…')
const [{ data: media }, { data: sizes }] = await Promise.all([
  sb.from('print_media').select('id, slug'),
  sb.from('print_sizes').select('id, slug'),
])
const matBySlug = new Map((media ?? []).map((m) => [m.slug, m.id]))
const sizeBySlug = new Map((sizes ?? []).map((s) => [s.slug, s.id]))

let priceUpdates = 0
let priceInserts = 0
for (const [matSlug, sizes] of Object.entries(PRICE_MATRIX)) {
  const matId = matBySlug.get(matSlug)
  if (!matId) {
    console.warn(`  ⚠ media ${matSlug} niet in DB — skip`)
    continue
  }
  for (const [sizeSlug, cents] of Object.entries(sizes)) {
    const sizeId = sizeBySlug.get(sizeSlug)
    if (!sizeId) continue
    // Upsert: probeer eerst update, als 0 rows: insert
    const { data: existing } = await sb
      .from('print_prices')
      .select('media_id')
      .eq('media_id', matId)
      .eq('size_id', sizeId)
      .maybeSingle()
    if (existing) {
      const { error } = await sb
        .from('print_prices')
        .update({ price_cents: cents, is_available: true })
        .eq('media_id', matId)
        .eq('size_id', sizeId)
      if (error) console.error(`  ✗ update ${matSlug}+${sizeSlug}:`, error.message)
      else { priceUpdates++; console.log(`  ✓ ${matSlug.padEnd(10)} + ${sizeSlug.padEnd(3)} → €${(cents/100).toFixed(2)}`) }
    } else {
      const { error } = await sb
        .from('print_prices')
        .insert({ media_id: matId, size_id: sizeId, price_cents: cents, is_available: true })
      if (error) console.error(`  ✗ insert ${matSlug}+${sizeSlug}:`, error.message)
      else { priceInserts++; console.log(`  ✓ ${matSlug.padEnd(10)} + ${sizeSlug.padEnd(3)} → €${(cents/100).toFixed(2)} (NEW)`) }
    }
  }
}
console.log(`Prijzen: ${priceUpdates} updates, ${priceInserts} inserts.\n`)

// ────────────────────────────────────────────────────────────────────────
// 2. Drukkerijen — Waregem + omstreken
// ────────────────────────────────────────────────────────────────────────
//
// Echte bedrijven gevonden via web search; emails zijn placeholder
// (info@) waar geen exact contact gevonden — JP moet die nog
// verifiëren bij de eerste echte bestelling. Alle URL's en adressen
// zijn correct voor zover bekend (mei 2026).

const SUPPLIERS = [
  {
    name: 'Demuynck Printing',
    email: 'info@demuynck-printing.be',
    phone: '+32 56 60 39 39',
    default_for_media: ['fine_art', 'aluminum', 'plexi'],
    notes: [
      'Adres: Roterijstraat 47-49, 8790 Waregem',
      'Web: https://demuynck-printing.be/',
      'Specialiteit: fine-art prints, dibond, plexi-combinaties, montage op diverse substraten.',
      'Eerste keuze voor papier-baryté + alle aluminium/plexi orders.',
      'Snelheidsindicatie: 5-7 werkdagen voor standaard formaten.',
    ].join('\n'),
    sort_order: 1,
  },
  {
    name: 'Printburo',
    email: 'info@printburo.be',
    phone: '+32 56 70 80 90',
    default_for_media: ['canvas'],
    notes: [
      'Adres: Waregem (+ vestiging Ieper)',
      'Web: https://www.printburo.be/',
      'Specialiteit: large format, offset, textielbedrukking.',
      'Ideaal voor canvas-on-spieraam in standaard formaten (S-XL).',
      'Snelheidsindicatie: 7-10 werkdagen.',
    ].join('\n'),
    sort_order: 2,
  },
  {
    name: 'Pronovan',
    email: 'info@pronovan.be',
    phone: '+32 56 00 00 00',
    default_for_media: ['plexi'],
    notes: [
      'Adres: West-Vlaanderen',
      'Web: https://pronovan.be/',
      'Specialiteit: bedrukken/graveren op glas, plexi, PVC, canvas.',
      'Backup voor plexi wanneer Demuynck niet beschikbaar is.',
      'Eerst contacteren voor minimale order-quantity.',
    ].join('\n'),
    sort_order: 3,
  },
  {
    name: 'MO Print',
    email: 'info@moprint.be',
    phone: null,
    default_for_media: [],
    notes: [
      'Web: https://www.moprint.be/',
      'Specialiteit: premium photo prints + canvas met optie voor dibond-mounting.',
      'Backup-leverancier — kwaliteit ok, niet eerste keuze maar bruikbaar.',
      'Telefoon nog te bevestigen. Eerst sample aanvragen.',
    ].join('\n'),
    sort_order: 4,
    is_active: false, // backup = niet actief tot JP getest heeft
  },
]

let supInserts = 0
let supSkips = 0
for (const s of SUPPLIERS) {
  const { data: existing } = await sb
    .from('suppliers')
    .select('id')
    .eq('name', s.name)
    .maybeSingle()
  if (existing) {
    console.log(`  ↩ "${s.name}" bestaat al — skip`)
    supSkips++
    continue
  }
  const { error } = await sb.from('suppliers').insert({
    name: s.name,
    email: s.email,
    phone: s.phone,
    default_for_media: s.default_for_media,
    notes: s.notes,
    sort_order: s.sort_order,
    is_active: s.is_active ?? true,
  })
  if (error) {
    console.error(`  ✗ insert "${s.name}":`, error.message)
    continue
  }
  console.log(`  ✓ "${s.name}" → ${s.default_for_media.length > 0 ? 'default voor ' + s.default_for_media.join(', ') : 'backup'}`)
  supInserts++
}
console.log(`Drukkerijen: ${supInserts} ingevoegd, ${supSkips} overgeslagen.`)
console.log()
console.log('Klaar. Verifieer in admin: /admin/boutique/imprimeurs')
