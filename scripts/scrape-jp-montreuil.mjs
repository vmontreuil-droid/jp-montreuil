/**
 * Eenmalig scrape-script: importeert categorieën + galerij-afbeeldingen
 * van https://jp.montreuil.be (WordPress/Avada) naar Supabase.
 *
 * Idempotent: meermaals draaien voegt geen duplicaten toe.
 *
 * Run:
 *   node --env-file=.env.local scripts/scrape-jp-montreuil.mjs
 *   node --env-file=.env.local scripts/scrape-jp-montreuil.mjs --dry-run
 *   node --env-file=.env.local scripts/scrape-jp-montreuil.mjs --only=voitures,bronze
 */

import { createClient } from '@supabase/supabase-js'

const SOURCE_BASE = 'https://jp.montreuil.be'
const BUCKET = 'works'
const CDN_HOST = 'usercontent.one'

// Regex voor alle afbeeldingen op de WP CDN.
const IMAGE_REGEX = /https:\/\/usercontent\.one\/wp\/jp\.montreuil\.be\/wp-content\/uploads\/[^\s"'<>()]+\.(?:jpg|jpeg|png)/gi

// Filenames die geen werk zijn (logo, decoratie).
const SKIP_FILENAME_PATTERNS = [
  /^LOGO-AM/i,
]

const CATEGORIES = [
  { slug: 'voitures',     sort_order: 1, label_fr: 'Voitures',      label_nl: "Auto's",    source_path: '/portfolio-items/voitures/' },
  { slug: 'chevaux',      sort_order: 2, label_fr: 'Chevaux',       label_nl: 'Paarden',   source_path: '/portfolio-items/travel/' },
  { slug: 'chiens-chats', sort_order: 3, label_fr: 'Chiens-Chats',  label_nl: 'Huisdieren', source_path: '/portfolio-items/chiens-chats-2/' },
  { slug: 'chasse',       sort_order: 4, label_fr: 'Chasse',        label_nl: 'Jacht',     source_path: '/portfolio-items/chasse/' },
  { slug: 'oiseaux',      sort_order: 5, label_fr: 'Oiseaux',       label_nl: 'Vogels',    source_path: '/portfolio-items/oiseaux/' },
  { slug: 'portraits',    sort_order: 6, label_fr: 'Portraits',     label_nl: 'Portretten', source_path: '/portfolio-items/portraits/' },
  { slug: 'bronze',       sort_order: 7, label_fr: 'Bronze',        label_nl: 'Brons',     source_path: '/portfolio-items/bronze/' },
  { slug: 'bafra-art',    sort_order: 8, label_fr: 'Bafra-Art',     label_nl: 'Bafra-Art', source_path: '/portfolio-items/bafra-art/' },
  { slug: 'photos',       sort_order: 9, label_fr: 'Photos',        label_nl: "Foto's",    source_path: '/portfolio-items/photos/' },
  { slug: 'expos',        sort_order: 10, label_fr: 'Expos',        label_nl: "Expo's",    source_path: '/portfolio-items/expos/' },
]

// ---- CLI args ----------------------------------------------------------

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const ONLY = args.find(a => a.startsWith('--only='))?.split('=')[1]?.split(',') ?? null

// ---- Supabase client ---------------------------------------------------

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY moeten gezet zijn (in .env.local).')
  process.exit(1)
}
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---- Helpers -----------------------------------------------------------

function log(...m) { console.log(...m) }
function logStep(...m) { console.log('→', ...m) }

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; jp-montreuil-migration/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} bij ${url}`)
  return res.text()
}

/**
 * WordPress genereert thumbnail-varianten per foto:
 *   foo.jpg, foo-150x150.jpg, foo-300x250.jpg, foo-1024x683.jpg, foo-scaled.jpg
 *
 * Voor migratie willen we per foto één variant: liefst -scaled.jpg (WP's 2560px
 * max), anders het origineel zonder dimensies, anders de grootste NNNxNNN.
 */
function canonicalize(url) {
  const filename = decodeURIComponent(url.split('/').pop() ?? '')
  const m = filename.match(/^(.+?)(-scaled)?(-\d+x\d+)?\.(jpg|jpeg|png)$/i)
  if (!m) return null
  const [, base, scaled, sized, ext] = m
  // base + ext = canonieke "key" (zonder dimensie-suffix); url = welke variant we hebben
  const key = `${base}.${ext.toLowerCase()}`
  let priority
  if (scaled) priority = 10_000          // -scaled = WP's max kwaliteit
  else if (!sized) priority = 9_000      // origineel zonder dimensies
  else {
    // grootte uit -NNNxNNN halen
    const [, w] = sized.match(/-(\d+)x\d+/) ?? []
    priority = parseInt(w, 10) || 0
  }
  return { key, url, filename, priority }
}

function extractImageUrls(html) {
  const matches = html.match(IMAGE_REGEX) ?? []
  const unique = Array.from(new Set(matches))

  // Filter logo enz.
  const filtered = unique.filter(u => {
    const filename = u.split('/').pop() ?? ''
    return !SKIP_FILENAME_PATTERNS.some(re => re.test(filename))
  })

  // Per canonieke key houden we enkel de beste variant.
  const bestByKey = new Map()
  for (const url of filtered) {
    const c = canonicalize(url)
    if (!c) continue
    const prev = bestByKey.get(c.key)
    if (!prev || c.priority > prev.priority) bestByKey.set(c.key, c)
  }

  return Array.from(bestByKey.values()).map(v => v.url)
}

function getFilename(url) {
  return decodeURIComponent(url.split('/').pop() ?? '')
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; jp-montreuil-migration/1.0)' },
  })
  if (!res.ok) throw new Error(`Download HTTP ${res.status}: ${url}`)
  const buf = await res.arrayBuffer()
  return Buffer.from(buf)
}

function inferContentType(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

async function uploadToBucket(storagePath, buffer, contentType) {
  if (DRY_RUN) return
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: '31536000',
    })
  if (error) throw new Error(`Upload faalt voor ${storagePath}: ${error.message}`)
}

// ---- Hoofdflow ---------------------------------------------------------

async function upsertCategories() {
  logStep('Upsert categorieën …')
  if (DRY_RUN) {
    log(`  [dry] zou ${CATEGORIES.length} categorieën upserten`)
    return new Map(CATEGORIES.map(c => [c.slug, { id: 'dry-run-id', ...c }]))
  }
  const { data, error } = await supabase
    .from('categories')
    .upsert(
      CATEGORIES.map(({ source_path, ...rest }) => rest),
      { onConflict: 'slug' }
    )
    .select('id, slug')
  if (error) throw error
  log(`  ${data.length} categorieën opgeslagen`)
  return new Map(data.map(d => [d.slug, d]))
}

async function loadExistingWorks() {
  if (DRY_RUN) return { byCategoryAndPath: new Set(), byPath: new Set() }
  const { data, error } = await supabase
    .from('works')
    .select('category_id, storage_path')
  if (error) throw error
  const byCategoryAndPath = new Set(data.map(r => `${r.category_id}::${r.storage_path}`))
  const byPath = new Set(data.map(r => r.storage_path))
  return { byCategoryAndPath, byPath }
}

async function processCategory(category, categoryRow, existing) {
  const { slug, source_path } = category
  logStep(`[${slug}] fetch ${source_path}`)
  const html = await fetchHtml(SOURCE_BASE + source_path)
  const imageUrls = extractImageUrls(html)
  log(`  ${imageUrls.length} afbeeldingen na dedup`)

  let added = 0
  let skipped = 0
  let errors = 0
  let order = 0

  for (const sourceUrl of imageUrls) {
    order++
    const filename = getFilename(sourceUrl)
    const storagePath = `${slug}/${filename}`
    const compositeKey = `${categoryRow.id}::${storagePath}`

    if (existing.byCategoryAndPath.has(compositeKey)) {
      skipped++
      continue
    }

    try {
      let buffer
      if (!existing.byPath.has(storagePath)) {
        buffer = await downloadImage(sourceUrl)
        await uploadToBucket(storagePath, buffer, inferContentType(filename))
      }

      if (!DRY_RUN) {
        const { error } = await supabase.from('works').insert({
          category_id: categoryRow.id,
          storage_path: storagePath,
          sort_order: order,
          original_source_url: sourceUrl,
        })
        if (error) throw error
      }
      added++
      existing.byCategoryAndPath.add(compositeKey)
      existing.byPath.add(storagePath)
      if (added % 10 === 0) {
        const sz = buffer ? `${(buffer.length / 1024).toFixed(0)}KB` : 'reused'
        log(`    +${added} (${sz})`)
      }
    } catch (err) {
      errors++
      console.error(`  ✗ ${filename}: ${err.message}`)
    }
  }

  log(`  klaar: +${added}, overgeslagen ${skipped}, fouten ${errors}`)
  return { added, skipped, errors }
}

async function setCoverWorks() {
  if (DRY_RUN) return
  logStep('Cover-foto per categorie zetten (eerste werk)')
  const { data: cats, error } = await supabase.from('categories').select('id, slug, cover_work_id')
  if (error) throw error
  for (const cat of cats) {
    if (cat.cover_work_id) continue
    const { data: works, error: e2 } = await supabase
      .from('works')
      .select('id')
      .eq('category_id', cat.id)
      .order('sort_order', { ascending: true })
      .limit(1)
    if (e2) throw e2
    if (!works?.length) continue
    await supabase
      .from('categories')
      .update({ cover_work_id: works[0].id })
      .eq('id', cat.id)
  }
}

async function main() {
  log(DRY_RUN ? '== DRY RUN ==' : '== LIVE ==')
  if (ONLY) log('Alleen categorieën:', ONLY.join(', '))

  const cats = await upsertCategories()
  const existing = await loadExistingWorks()
  log(`${existing.byCategoryAndPath.size} (cat, path) combinaties al in DB — die slaan we over.`)

  const totals = { added: 0, skipped: 0, errors: 0 }
  const categoriesToProcess = ONLY
    ? CATEGORIES.filter(c => ONLY.includes(c.slug))
    : CATEGORIES

  for (const cat of categoriesToProcess) {
    const row = cats.get(cat.slug)
    if (!row) {
      console.error(`Geen DB-rij voor ${cat.slug}, overslaan`)
      continue
    }
    const r = await processCategory(cat, row, existing)
    totals.added += r.added
    totals.skipped += r.skipped
    totals.errors += r.errors
  }

  await setCoverWorks()

  log('')
  log('=== Totaal ===')
  log(`Toegevoegd: ${totals.added}`)
  log(`Overgeslagen (al aanwezig): ${totals.skipped}`)
  log(`Fouten: ${totals.errors}`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
