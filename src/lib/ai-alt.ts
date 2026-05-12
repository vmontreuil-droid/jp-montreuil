/**
 * Genereer een korte alt-text voor een foto m.b.v. Claude vision.
 *
 * Gebruikt direct de REST API (geen SDK-dep) zodat de bundle niet
 * groeit. Verwacht ANTHROPIC_API_KEY in env.
 *
 * Output: 1 zin, 80-150 chars, FR, geen "Photo de…" prefix.
 *
 * Geport van allardphilippe — model claude-haiku-4-5-20251001.
 */
export async function generateAltText(
  imageUrl: string,
  hints?: { species?: string | null; location?: string | null },
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY niet gezet — voeg toe in Vercel env vars')
  }

  const hintLine = [
    hints?.species ? `Espèce probable : ${hints.species}.` : '',
    hints?.location ? `Lieu : ${hints.location}.` : '',
  ].filter(Boolean).join(' ')

  const prompt = [
    "Tu écris une description courte (alt-text) en français pour une photo,",
    "destinée aux lecteurs d'écran et au SEO. Règles strictes :",
    "- 1 phrase, 80-150 caractères",
    "- décris ce qui est VISIBLE (sujet, posture, environnement, lumière), pas d'interprétation poétique",
    "- ne commence PAS par \"Photo de\", \"Image de\", \"Cette photo montre\"",
    "- pas de point final superflu",
    hintLine ? `Indices fournis par le photographe : ${hintLine}` : '',
    "Réponds UNIQUEMENT avec la phrase, rien d'autre — pas de guillemets.",
  ].filter(Boolean).join('\n')

  const body = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('[ai-alt]', res.status, txt.slice(0, 500))
    throw new Error(`Claude API gaf ${res.status}`)
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>
  }
  const text = data.content?.find((c) => c.type === 'text')?.text?.trim()
  if (!text) throw new Error('Lege response van Claude')

  return text.replace(/^["'«»]|["'«»]$/g, '').trim().slice(0, 200)
}

/**
 * Genereer een korte, marketing-vriendelijke titel voor een foto.
 * Gebruikt Claude vision met een andere prompt dan generateAltText:
 *  - 2 à 5 woorden
 *  - hoofdletter aan begin, geen punt
 *  - geen "Photo de", "Image de"
 *  - mag licht poëtisch zijn (anders dan alt-text)
 *  - bedoeld voor titels in de boutique en de galerie
 *
 * Werkt met dezelfde Anthropic-key. Throws bij API-fout.
 */
export async function generateTitle(
  imageUrl: string,
  hints?: { species?: string | null; location?: string | null; category?: string | null },
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY niet gezet — voeg toe in Vercel env vars')
  }

  const hintLine = [
    hints?.species ? `Espèce probable : ${hints.species}.` : '',
    hints?.location ? `Lieu : ${hints.location}.` : '',
    hints?.category ? `Catégorie : ${hints.category}.` : '',
  ].filter(Boolean).join(' ')

  const prompt = [
    "Tu écris un titre court et accrocheur en français pour une photographie d'art.",
    "Règles strictes :",
    "- 2 à 5 mots maximum",
    "- majuscule à la première lettre seulement, pas de point final",
    "- ne commence PAS par \"Photo de\", \"Image de\", \"Portrait de\"",
    "- peut être légèrement poétique ou évocateur",
    "- en français même si l'œuvre semble venir d'ailleurs",
    hintLine ? `Indices : ${hintLine}` : '',
    "Réponds UNIQUEMENT avec le titre, rien d'autre — pas de guillemets.",
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
      max_tokens: 80,
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
    console.error('[ai-title]', res.status, txt.slice(0, 500))
    throw new Error(`Claude API gaf ${res.status}`)
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
  const text = data.content?.find((c) => c.type === 'text')?.text?.trim()
  if (!text) throw new Error('Lege response van Claude')

  return text
    .replace(/^["'«»]|["'«»]$/g, '')
    .replace(/[.!?]+$/, '')
    .trim()
    .slice(0, 80)
}

/**
 * Genereer alt + title in één call — efficiënter want we hebben de
 * foto maar één keer nodig. Output is een JSON-object zodat Claude in
 * één response beide velden levert.
 *
 * Gebruikt voor bulk-imports waar zowel titel als alt nuttig zijn.
 */
export async function generateTitleAndAlt(
  imageUrl: string,
  hints?: { species?: string | null; location?: string | null; category?: string | null },
): Promise<{ title: string; alt: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY niet gezet')

  const hintLine = [
    hints?.species ? `Espèce probable : ${hints.species}.` : '',
    hints?.location ? `Lieu : ${hints.location}.` : '',
    hints?.category ? `Catégorie : ${hints.category}.` : '',
  ].filter(Boolean).join(' ')

  const prompt = [
    "Pour cette photographie d'art, génère DEUX choses en français :",
    "1. \"title\" : 2 à 5 mots, majuscule initiale, pas de point, accrocheur",
    "2. \"alt\" : 1 phrase de 80-150 caractères, descriptive (visible), pas de \"Photo de…\"",
    hintLine ? `Indices : ${hintLine}` : '',
    "",
    "Réponds UNIQUEMENT avec un JSON valide de cette forme :",
    '{"title": "...", "alt": "..."}',
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
      max_tokens: 300,
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
    console.error('[ai-title-and-alt]', res.status, txt.slice(0, 500))
    throw new Error(`Claude API gaf ${res.status}`)
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
  const raw = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? ''
  // Soms wraps Claude met ```json ... ``` — strip dat
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
  let parsed: { title?: string; alt?: string }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Kan response niet parsen: ${raw.slice(0, 200)}`)
  }
  const title = (parsed.title ?? '').replace(/^["'«»]|["'«»]$/g, '').replace(/[.!?]+$/, '').trim().slice(0, 80)
  const alt = (parsed.alt ?? '').replace(/^["'«»]|["'«»]$/g, '').trim().slice(0, 200)
  if (!title || !alt) throw new Error('title of alt ontbreekt in response')
  return { title, alt }
}
