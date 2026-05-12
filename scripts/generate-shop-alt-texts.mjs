// Genereert alt-text voor alle gepubliceerde shop-foto's via Claude Vision.
// Idempotent: skipt foto's die al een alt_text hebben.
//
// Run:
//   cd jp-montreuil
//   node --env-file=.env.local scripts/generate-shop-alt-texts.mjs [--limit=N] [--force]
//
// Kosten-indicatie: ~335 foto's × ~$0.001/foto (Haiku 4.5 vision) = ~€0.30 totaal.
// Throttled op 5 parallel om de Anthropic-rate-limit niet te raken.

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

// ─────────────────────────────────────────────────────────────
// Bouw publieke storage URL — moet matchen met src/lib/shop/photo-url.ts
// ─────────────────────────────────────────────────────────────
function shopPhotoUrl(storagePath, bucket = 'shop-photos') {
  return `${url}/storage/v1/object/public/${bucket}/${storagePath}`
}

// ─────────────────────────────────────────────────────────────
// Anthropic Claude Vision call — same prompt als src/lib/ai-alt.ts
// ─────────────────────────────────────────────────────────────
async function generateAltText(imageUrl, hints = {}) {
  const hintLine = [
    hints.species ? `Espèce probable : ${hints.species}.` : '',
    hints.location ? `Lieu : ${hints.location}.` : '',
    hints.title ? `Titre : ${hints.title}.` : '',
  ].filter(Boolean).join(' ')

  const prompt = [
    "Tu écris une description courte (alt-text) en français pour une photo,",
    "destinée aux lecteurs d'écran et au SEO. Règles strictes :",
    "- 1 phrase, 80-150 caractères",
    "- décris ce qui est VISIBLE (sujet, posture, environnement, lumière), pas d'interprétation poétique",
    "- ne commence PAS par \"Photo de\", \"Image de\", \"Cette photo montre\"",
    "- pas de point final superflu",
    hintLine ? `Indices : ${hintLine}` : '',
    "Réponds UNIQUEMENT avec la phrase, rien d'autre — pas de guillemets.",
  ].filter(Boolean).join('\n')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
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
  const text = data.content?.find(c => c.type === 'text')?.text?.trim()
  if (!text) throw new Error('Lege response')
  return text.replace(/^["'«»]|["'«»]$/g, '').trim().slice(0, 200)
}

// ─────────────────────────────────────────────────────────────
// Hoofdscript
// ─────────────────────────────────────────────────────────────
console.log(`→ Fetch gepubliceerde foto's${force ? ' (FORCE — overschrijft bestaande)' : ''}…`)
let q = sb.from('photos')
  .select('id, slug, title, alt_text, species, taken_at_location, storage_path, bucket')
  .eq('is_published', true)
  .order('sort_order', { ascending: true })
if (!force) q = q.or('alt_text.is.null,alt_text.eq.')
const { data: photos, error } = await q
if (error) { console.error(error); process.exit(1) }

const todo = (photos ?? []).slice(0, limit)
console.log(`Te behandelen: ${todo.length} foto's`)
if (todo.length === 0) { console.log('Niets te doen — klaar.'); process.exit(0) }

let ok = 0, fail = 0, skipped = 0
const startedAt = Date.now()

// Throttled parallel processing — 5 tegelijk
const PARALLEL = 5
async function processOne(p, idx) {
  const url = shopPhotoUrl(p.storage_path, p.bucket)
  try {
    const alt = await generateAltText(url, {
      species: p.species,
      location: p.taken_at_location,
      title: p.title,
    })
    const { error: upErr } = await sb.from('photos')
      .update({ alt_text: alt, ai_alt_generated_at: new Date().toISOString() })
      .eq('id', p.id)
    if (upErr) {
      console.error(`  ✗ [${idx + 1}/${todo.length}] ${p.slug}: UPDATE faalde — ${upErr.message}`)
      fail++
    } else {
      console.log(`  ✓ [${idx + 1}/${todo.length}] ${p.slug}`)
      console.log(`        ${alt}`)
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
console.log(`\nKlaar in ${dur}s — ${ok} OK · ${fail} fouten · ${skipped} skip`)
