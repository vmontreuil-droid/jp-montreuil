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
