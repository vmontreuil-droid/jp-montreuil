/**
 * AI-draft generator voor /journal posts.
 *
 * JP geeft een onderwerp + 3 keywords → Claude levert een eerste draft
 * met titel, excerpt en body in beide talen (FR + NL). JP redigeert
 * en publiceert.
 *
 * Strategie: Sonnet (i.p.v. Haiku zoals bij alt-text) want we willen
 * écht goeie schrijfstijl. Kost ~€0.05 per post, te verwaarlozen
 * tegenover de SEO-waarde van een kwaliteits-post.
 */

export type JournalDraft = {
  title_fr: string
  title_nl: string
  excerpt_fr: string
  excerpt_nl: string
  body_fr: string
  body_nl: string
  tags: string[]
}

export async function generateJournalDraft(input: {
  topic: string
  keywords: string[]
  /** Optionele extra context — bv. lengte, doelgroep, toon */
  notes?: string | null
}): Promise<JournalDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY niet gezet')

  const keywords = input.keywords.filter(Boolean).slice(0, 8)
  const prompt = [
    "Tu écris un article de blog pour le journal en ligne d'un artiste peintre belge,",
    "Jean-Pierre Montreuil, basé à Anzegem en Belgique. Spécialités : art animalier",
    "(chevaux, chiens, portraits) et tirages d'art en édition limitée.",
    "",
    "Le ton est : intime, sobre, professionnel — comme un artisan qui partage son atelier.",
    "Pas de superlatifs vides ('incroyable', 'magnifique'), pas de jargon marketing.",
    "Concret, sensoriel, avec des détails techniques quand utile.",
    "",
    `Sujet de l'article : ${input.topic}`,
    `Mots-clés à incorporer naturellement : ${keywords.join(', ')}`,
    input.notes ? `Notes de l'auteur : ${input.notes}` : '',
    "",
    "Génère :",
    "1. title_fr / title_nl : 4-8 mots, accrocheur sans clickbait",
    "2. excerpt_fr / excerpt_nl : 1-2 phrases, 120-180 caractères, donne envie de lire",
    "3. body_fr / body_nl : 400-700 mots en Markdown (## sous-titres, paragraphes courts,",
    "   pas de listes à puces sauf si vraiment utile, pas de h1 — celui-ci est dans le layout)",
    "4. tags : 3-5 mots-clés courts, en français, lowercase, sans tirets",
    "",
    "Le NL est une vraie traduction adaptée — pas un calque mot-à-mot. Tu peux reformuler",
    "pour que la version NL sonne naturelle pour un lecteur flamand.",
    "",
    "Réponds UNIQUEMENT avec un JSON valide de cette forme :",
    '{"title_fr":"...","title_nl":"...","excerpt_fr":"...","excerpt_nl":"...","body_fr":"...","body_nl":"...","tags":["mot1","mot2"]}',
  ].filter(Boolean).join('\n')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('[ai-journal]', res.status, txt.slice(0, 500))
    throw new Error(`Claude API gaf ${res.status}`)
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
  const raw = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? ''
  // Soms wraps Claude met ```json ... ```
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
  let parsed: JournalDraft
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Kan response niet parsen: ${raw.slice(0, 300)}`)
  }
  // Sanity check
  for (const k of ['title_fr', 'title_nl', 'body_fr', 'body_nl'] as const) {
    if (!parsed[k] || typeof parsed[k] !== 'string') {
      throw new Error(`Veld ${k} ontbreekt of is geen string`)
    }
  }
  return {
    title_fr: parsed.title_fr.trim(),
    title_nl: parsed.title_nl.trim(),
    excerpt_fr: (parsed.excerpt_fr ?? '').trim(),
    excerpt_nl: (parsed.excerpt_nl ?? '').trim(),
    body_fr: parsed.body_fr.trim(),
    body_nl: parsed.body_nl.trim(),
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8).map(String) : [],
  }
}
