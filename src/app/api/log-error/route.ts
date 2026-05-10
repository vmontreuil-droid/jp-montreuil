import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { logError } from '@/lib/error-log'
import { checkRateLimitMem } from '@/lib/rate-limit-mem'

/**
 * POST /api/log-error — endpoint voor client-side errors.
 * Body: { message, stack?, url?, context? }
 *
 * Rate-limited per IP (max 30/min) zodat een runaway page niet de DB volpompt.
 */
export async function POST(req: NextRequest) {
  const h = await headers()
  const ip =
    h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? 'unknown'
  const rl = checkRateLimitMem('log_error', ip, { max: 30, windowSec: 60 })
  if (!rl.ok) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 })
  }

  let body: { message?: string; stack?: string; url?: string; context?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 })
  }
  if (!body.message) {
    return NextResponse.json({ ok: false, reason: 'no_message' }, { status: 400 })
  }

  const ua = h.get('user-agent') ?? null
  const fakeErr = new Error(body.message)
  if (body.stack) fakeErr.stack = body.stack

  await logError({
    source: 'client',
    err: fakeErr,
    url: body.url ?? null,
    userAgent: ua,
    context: body.context,
  })
  return NextResponse.json({ ok: true })
}
