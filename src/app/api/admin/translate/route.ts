import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You translate short labels and texts for an art-portfolio website (Atelier Montreuil — Jean-Pierre Montreuil, painter).

Rules:
- Translate ONLY between French (fr) and Dutch / Nederlands (nl).
- Output the translated text directly — no quotes, no preamble, no explanation, no labels.
- Preserve formatting: capitalization style, line breaks, punctuation.
- Keep proper nouns and names unchanged (Jean-Pierre Montreuil, Atelier Montreuil, Bafra-Art, etc).
- Use natural Belgian-French / Belgian-Dutch where stylistic choices apply.
- For uppercase input, return uppercase output.
- For category names: keep them concise (1-3 words) like the input.`

function isLang(s: unknown): s is 'fr' | 'nl' {
  return s === 'fr' || s === 'nl'
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'translate_not_configured', message: 'ANTHROPIC_API_KEY ontbreekt' },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const { text, from, to } = (body ?? {}) as { text?: string; from?: string; to?: string }

  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'empty_text' }, { status: 400 })
  }
  if (text.length > 5000) {
    return NextResponse.json({ error: 'text_too_long', max: 5000 }, { status: 400 })
  }
  if (!isLang(from) || !isLang(to) || from === to) {
    return NextResponse.json({ error: 'invalid_lang_pair' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Translate from ${from === 'fr' ? 'French' : 'Dutch'} to ${
            to === 'fr' ? 'French' : 'Dutch'
          }:\n\n${text}`,
        },
      ],
    })

    const translation = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    if (!translation) {
      return NextResponse.json({ error: 'empty_translation' }, { status: 502 })
    }

    return NextResponse.json({ translation })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Translate API error', err.status, err.message)
      return NextResponse.json({ error: 'api_error', message: err.message }, { status: 502 })
    }
    console.error('Translate unexpected error', err)
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
