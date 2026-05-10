import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { checkVies } from '@/lib/vies'
import { checkRateLimitMem } from '@/lib/rate-limit-mem'

/**
 * POST /api/shop/vies-check
 * Body: { vat_number: string }
 *
 * Server-side proxy naar de EU VIES API. Wordt aangeroepen door
 * CheckoutForm + portail/compte bij debounced typing om "geldig?"-
 * feedback te tonen.
 *
 * Response:
 *   { ok: true, name?: string, address?: string }
 *   { ok: false, reason: string }
 *   { unavailable: true, reason: string }   ← VIES down, frontend mag
 *                                             tonen "kan niet valideren
 *                                             — wordt later opnieuw
 *                                             gecheckt door de server"
 */
export async function POST(req: NextRequest) {
  const h = await headers()
  const ip =
    h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? 'unknown'
  const rl = checkRateLimitMem('vies_check', ip, { max: 20, windowSec: 60 })
  if (!rl.ok) {
    return NextResponse.json({ ok: false, reason: 'Trop de tentatives' }, { status: 429 })
  }

  let body: { vat_number?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'Body moet JSON zijn' }, { status: 400 })
  }
  const raw = String(body.vat_number ?? '').trim()
  if (!raw) {
    return NextResponse.json({ ok: false, reason: 'Vide' }, { status: 400 })
  }

  // 8s timeout — Vercel free tier hubt op 10s
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8_000)
  try {
    const result = await checkVies(raw, ctrl.signal)
    if (result.status === 'ok') {
      return NextResponse.json({
        ok: true,
        country: result.country,
        number: result.number,
        name: result.name,
        address: result.address,
      })
    }
    if (result.status === 'unavailable') {
      return NextResponse.json({ unavailable: true, reason: result.reason }, { status: 200 })
    }
    return NextResponse.json({ ok: false, reason: result.reason })
  } finally {
    clearTimeout(timer)
  }
}
