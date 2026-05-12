// Genereert title + alt_text voor shop-foto's die nog geen hebben.
// Gebruikt Claude vision via één call per foto (combineert title + alt).
//
// Run:
//   cd jp-montreuil
//   node --env-file=.env.local scripts/generate-shop-titles.mjs [--limit=N] [--force] [--retry-failed]
//
// Strategieën voor de timeout-bug uit vorige run:
//  - PARALLEL=2 i.p.v. 5 (Claude image-fetch is traag bij druk)
//  - per-foto retry (3 pogingen met exponentiele backoff)
//  - --retry-failed: skip foto's die alt_text hebben maar title ontbreekt → vult enkel title

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiKey = process.env.ANTHROPIC_API_KEY
if (!url || !key) { console.error('SUPABASE env ontbreekt'); process.exit(1) }
if (!apiKey) { console.error('ANTHROPIC_API_KEY ontbreekt'); process.exit(1) }

const args = process.argv.slice(2)
const limitArg = args.find(a => a.startsWith('--limit='))?.slice(8)
const limit = limitArg ? parseInt(limitArg, 10) : Infinity
const force = args.includes('--force')

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'shop' },
})

function shopPhotoUrl(storagePath, bucket = 'shop-photos') {
  return `${url}/storage/v1/object/public/${bucket}/${storagePath}`
}

// ─────────────────────────────────────────────────────────────
// Claude Vision call met retry-logica
// ─────────────────────────────────────────────────────────────
async function generateOnce(imageUrl, hints, kind) {
  const hintLine = [
    hints.species ? `Espèce probable : ${hints.species}.` : '',
    hints.location ? `Lieu : ${hints.location}.` : '',
    hints.category ? `Catégorie : ${hints.category}.` : '',
  ].filter(Boolean).join(' ')

  const prompt = kind === 'both' ? [
    "Pour cette photographie d'art, génère DEUX choses en français :",
    "1. \"title\" : 2 à 5 mots, majuscule initiale, pas de point, accrocheur",
    "2. \"alt\" : 1 phrase de 80-150 caractères, descriptive (visible), pas de \"Photo de…\"",
    hintLine ? `Indices : ${hintLine}` : '',
    "Réponds UNIQUEMENT avec un JSON valide : {\"title\": \"...\", \"alt\": \"...\"}",
  ].filter(Boolean).join('\n') : [
    "Tu écris un titre court et accrocheur en français pour une photographie d'art.",
    "- 2 à 5 mots maximum",
    "- majuscule initiale, pas de point final",
    "- ne commence PAS par \"Photo de\", \"Image de\"",
    hintLine ? `Indices : ${hintLine}` : '',
    "Réponds UNIQUEMENT avec le titre, rien d'autre.",
  ].filter(Boolean).join('\n')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: kind === 'both' ? 300 : 80,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Claude ${res.status}: ${txt.slice(0, 200)}`)
  }
  const data = await res.json()
  const raw = data.content?.find(c => c.type === 'text')?.text?.trim() ?? ''

  if (kind === 'both') {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      title: (parsed.title ?? '').replace(/^["'«»]|["'«»]$/g, '').replace(/[.!?]+$/, '').trim().slice(0, 80),
      alt: (parsed.alt ?? '').replace(/^["'«»]|["'«»]$/g, '').trim().slice(0, 200),
    }
  }
  return { title: raw.replace(/^["'«»]|["'«»]$/g, '').replace(/[.!?]+$/, '').trim().slice(0, 80) }
}

async function generateWithRetry(imageUrl, hints, kind, maxAttempts = 3) {
  let lastErr
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await generateOnce(imageUrl, hints, kind)
    } catch (e) {
      lastErr = e
      if (i < maxAttempts - 1) {
        const delay = (i + 1) * 2000 // 2s, 4s, …
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}

// ─────────────────────────────────────────────────────────────
// Hoofdscript
// ─────────────────────────────────────────────────────────────
console.log(`→ Fetch foto's${force ? ' (FORCE)' : ' zonder title of alt_text'}…`)
let q = sb.from('photos')
  .select('id, slug, title, alt_text, species, taken_at_location, category_slug, storage_path, bucket')
  .eq('is_published', true)
  .order('sort_order', { ascending: true })
if (!force) q = q.or('title.is.null,alt_text.is.null')
const { data: photos, error } = await q
if (error) { console.error(error); process.exit(1) }

const todo = (photos ?? []).slice(0, limit)
console.log(`Te behandelen: ${todo.length} foto's`)
if (todo.length === 0) { console.log('Niets te doen — klaar.'); process.exit(0) }

let ok = 0, fail = 0
const startedAt = Date.now()

const PARALLEL = 2 // veiliger voor Claude image-fetch
async function processOne(p, idx) {
  const url = shopPhotoUrl(p.storage_path, p.bucket)
  const needTitle = !p.title
  const needAlt = !p.alt_text
  const kind = needTitle && needAlt ? 'both' : needTitle ? 'title' : 'alt'

  try {
    const out = await generateWithRetry(url, {
      species: p.species,
      location: p.taken_at_location,
      category: p.category_slug,
    }, kind)

    const patch = {}
    if (needTitle && out.title) patch.title = out.title
    if (needAlt && out.alt) {
      patch.alt_text = out.alt
      patch.ai_alt_generated_at = new Date().toISOString()
    }

    if (Object.keys(patch).length === 0) {
      console.log(`  ↩ [${idx + 1}/${todo.length}] ${p.slug}: niets te updaten`)
      return
    }

    const { error: upErr } = await sb.from('photos').update(patch).eq('id', p.id)
    if (upErr) {
      console.error(`  ✗ [${idx + 1}/${todo.length}] ${p.slug}: ${upErr.message}`)
      fail++
    } else {
      console.log(`  ✓ [${idx + 1}/${todo.length}] ${p.slug}`)
      if (patch.title) console.log(`        title: ${patch.title}`)
      if (patch.alt_text) console.log(`        alt:   ${patch.alt_text}`)
      ok++
    }
  } catch (e) {
    console.error(`  ✗ [${idx + 1}/${todo.length}] ${p.slug}: ${e.message}`)
    fail++
  }
}

for (let i = 0; i < todo.length; i += PARALLEL) {
  const batch = todo.slice(i, i + PARALLEL)
  await Promise.all(batch.map((p, j) => processOne(p, i + j)))
}

const dur = ((Date.now() - startedAt) / 1000).toFixed(1)
console.log(`\nKlaar in ${dur}s — ${ok} OK · ${fail} fouten`)
