/**
 * Eenmalig: scrape de "Over mij" / "À Propos" pagina van jp.montreuil.be
 * en seed `about_sections` in Supabase met FR + NL teksten.
 *
 * Run:
 *   node --env-file=.env.local scripts/scrape-about.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SOURCE = 'https://jp.montreuil.be'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE env vars')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

async function fetchHtml(path) {
  const res = await fetch(SOURCE + path, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; jp-montreuil-migration/1.0)',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} bij ${path}`)
  return res.text()
}

/**
 * Strip footer-residu zoals "© Copyright 2024 - 2026 | Atelier Montreuil | …"
 * dat soms in de laatste sectie terechtkomt door het ontbreken van een
 * scheiding tussen sectie-content en site-footer in de Avada-HTML.
 */
function stripFooterResidu(text) {
  return text
    .replace(/©\s*Copyright[\s\S]*$/i, '')
    .replace(/Powered by[\s\S]*$/i, '')
    .replace(/All Rights Reserved[\s\S]*$/i, '')
    .replace(/Alle rechten voorbehouden[\s\S]*$/i, '')
    .trim()
}

/**
 * Strip alle HTML-tags en decode HTML-entities voor leesbare platte tekst.
 * Behoudt alinea-breuken: <br>, <p>, <h5> markeren een nieuwe regel.
 */
function htmlToPlainText(html) {
  return html
    // Eerst block-elementen omzetten naar nieuwe regels
    .replace(/<\/?(p|br|h\d|div)[^>]*>/gi, '\n')
    // Andere tags weghalen
    .replace(/<[^>]+>/g, '')
    // HTML-entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8230;/g, '…')
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#171;/g, '«')
    .replace(/&#187;/g, '»')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Whitespace opkuisen
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

/**
 * Parse één about-pagina. Geeft array van { title, body } in volgorde.
 * Avada-pagina structuur:
 *   1. Intro: <h3 class="fusion-title-heading"...><pre>TITLE</pre></h3>
 *      gevolgd door <div class="fusion-text fusion-text-1">BODY</div>
 *   2-N. Secties: <h1 class="fusion-title-heading">TITLE</h1>
 *      gevolgd door <div class="fusion-text fusion-text-N">BODY</div>
 */
function parseAboutPage(html) {
  const sections = []

  // Sectie 1: <pre>TITLE</pre> in een h3 + fusion-text-1
  const introMatch = html.match(
    /<h3[^>]*fusion-title-heading[^>]*>[\s\S]*?<pre>([\s\S]*?)<\/pre>[\s\S]*?<\/h3>([\s\S]*?)(?=<div class="fusion-fullwidth)/
  )
  if (introMatch) {
    // <pre>-titels uit Avada hebben harde line-breaks; verwijder voor de DB-titel
    const title = htmlToPlainText(introMatch[1]).replace(/\s*\n+\s*/g, ' ')
    const bodyHtml = introMatch[2]
    // Pak de fusion-text-1 div
    const ftMatch = bodyHtml.match(/<div class="fusion-text fusion-text-1"[^>]*>([\s\S]*?)<\/div>/)
    const body = ftMatch ? htmlToPlainText(ftMatch[1]) : ''
    sections.push({ title, body })
  }

  // Secties 2-N: per <h1 class="fusion-title-heading">
  const h1Re = /<h1[^>]*fusion-title-heading[^>]*>([^<]+)<\/h1>/g
  const h1Matches = [...html.matchAll(h1Re)]

  for (let i = 0; i < h1Matches.length; i++) {
    const m = h1Matches[i]
    const title = m[1].trim()
    const startIdx = m.index + m[0].length
    // Pak alles tussen deze h1 en de volgende h1 (of einde)
    const next = h1Matches[i + 1]
    const endIdx = next ? next.index : html.length
    const slice = html.slice(startIdx, endIdx)
    // Pak fusion-text-N divs uit deze slice (meestal 1, soms 2)
    const ftRe = /<div class="fusion-text fusion-text-\d+[^"]*"[^>]*>([\s\S]*?)<\/div>(?=\s*<\/div>|\s*<div class="fusion-separator)/g
    const bodies = [...slice.matchAll(ftRe)].map((mm) => htmlToPlainText(mm[1])).filter(Boolean)
    const body = bodies.join('\n\n')
    sections.push({ title, body })
  }

  return sections
}

// Eén foto per sectie — gekozen op basis van wat op de oude site zichtbaar
// is rondom elke titel. Volgorde matcht de about-secties (1..4).
const SECTION_IMAGES = [
  'https://usercontent.one/wp/jp.montreuil.be/wp-content/uploads/2024/12/tete-lunettes-.jpg',                                          // 1. Un regard / Een blik (papa portret)
  'https://usercontent.one/wp/jp.montreuil.be/wp-content/uploads/2024/12/WhatsApp-Image-2024-12-28-a-15.09.44_b9df8210-e1735402318812.jpg', // 2. Réalité augmentée
  'https://usercontent.one/wp/jp.montreuil.be/wp-content/uploads/2024/12/WhatsApp-Image-2024-12-28-a-15.09.45_5a43c2bd.jpg',           // 3. Dix doigts
  'https://usercontent.one/wp/jp.montreuil.be/wp-content/uploads/2024/12/WhatsApp-Image-2024-12-28-a-15.09.45_110d11e8.jpg',           // 4. Peinture sur mesure
]

async function downloadAndUpload(sourceUrl) {
  const filename = decodeURIComponent(sourceUrl.split('/').pop())
  const storagePath = `about/${filename}`

  // Already uploaded? skip
  const { data: head } = await supabase.storage.from('works').list('about', {
    search: filename,
  })
  if (head?.some((f) => f.name === filename)) {
    return storagePath
  }

  console.log(`  download ${filename} …`)
  const res = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; jp-montreuil-migration/1.0)' },
  })
  if (!res.ok) throw new Error(`Download HTTP ${res.status}: ${sourceUrl}`)
  const buf = Buffer.from(await res.arrayBuffer())

  const ext = filename.toLowerCase().split('.').pop()
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg'

  const { error } = await supabase.storage.from('works').upload(storagePath, buf, {
    contentType,
    upsert: true,
    cacheControl: '31536000',
  })
  if (error) throw new Error(`Upload faalt: ${error.message}`)
  console.log(`  upload OK: ${storagePath} (${(buf.length / 1024).toFixed(0)}KB)`)
  return storagePath
}

async function main() {
  console.log('Fetch FR …')
  const htmlFr = await fetchHtml('/a-propos/')
  console.log('Fetch NL …')
  const htmlNl = await fetchHtml('/nl/a-propos/')

  const fr = parseAboutPage(htmlFr)
  const nl = parseAboutPage(htmlNl)

  console.log(`FR: ${fr.length} secties — NL: ${nl.length} secties`)
  if (fr.length !== nl.length) {
    console.warn('⚠ Aantallen secties mismatchen — combineer op volgorde, geen vertaling-key.')
  }

  const count = Math.min(fr.length, nl.length)

  console.log('Foto\'s downloaden + uploaden naar about/ …')
  const imagePaths = []
  for (let i = 0; i < count; i++) {
    const src = SECTION_IMAGES[i]
    if (!src) {
      imagePaths.push(null)
      continue
    }
    try {
      const path = await downloadAndUpload(src)
      imagePaths.push(path)
    } catch (err) {
      console.error(`  ✗ sectie ${i + 1}: ${err.message}`)
      imagePaths.push(null)
    }
  }

  // Bestaande secties verwijderen, dan opnieuw seeden (idempotent)
  const { error: delErr } = await supabase.from('about_sections').delete().not('id', 'is', null)
  if (delErr) throw delErr

  const rows = []
  for (let i = 0; i < count; i++) {
    rows.push({
      sort_order: i + 1,
      title_fr: fr[i].title || `(sectie ${i + 1})`,
      title_nl: nl[i].title || `(sectie ${i + 1})`,
      body_fr: stripFooterResidu(fr[i].body || ''),
      body_nl: stripFooterResidu(nl[i].body || ''),
      image_path: imagePaths[i],
    })
  }

  const { error: insErr } = await supabase.from('about_sections').insert(rows)
  if (insErr) throw insErr

  console.log(`✓ ${rows.length} about_sections rows geïnsert (met ${imagePaths.filter(Boolean).length} foto's).`)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
