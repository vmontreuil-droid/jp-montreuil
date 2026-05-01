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
  console.log('--- Voorbeeld eerste sectie ---')
  console.log('FR title:', fr[0]?.title)
  console.log('FR body  :', (fr[0]?.body ?? '').slice(0, 200) + '…')
  console.log('NL title:', nl[0]?.title)
  console.log('NL body  :', (nl[0]?.body ?? '').slice(0, 200) + '…')
  console.log('--- ---')

  // Bestaande secties verwijderen, dan opnieuw seeden (idempotent)
  const { error: delErr } = await supabase.from('about_sections').delete().not('id', 'is', null)
  if (delErr) throw delErr

  const rows = []
  for (let i = 0; i < count; i++) {
    rows.push({
      sort_order: i + 1,
      title_fr: fr[i].title || `(sectie ${i + 1})`,
      title_nl: nl[i].title || `(sectie ${i + 1})`,
      body_fr: fr[i].body || '',
      body_nl: nl[i].body || '',
    })
  }

  const { error: insErr } = await supabase.from('about_sections').insert(rows)
  if (insErr) throw insErr

  console.log(`✓ ${rows.length} about_sections rows geïnsert.`)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
