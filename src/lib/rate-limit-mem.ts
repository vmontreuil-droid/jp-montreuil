/**
 * Minimal in-memory rate-limiter voor jp-montreuil endpoints. Geen
 * Redis-afhankelijkheid: de map leeft per server-instance en wordt
 * opgeschoond door TTL-checks bij elke aanroep. Voor lage-traffic
 * publieke endpoints zoals VIES-check (door een handvol klanten per
 * dag bevraagd) is dit ruim voldoende.
 *
 * Limitations: bij Vercel preview/prod loopt elke Edge/Lambda met een
 * eigen geheugen, dus de limiet geldt per instance. Een DDoS zou via
 * load-balancing dat omzeilen. Voor échte hardening is Upstash o.i.d.
 * nodig — niet hier.
 */

type Window = { hits: number; resetAt: number }

// Map<bucket-key, Window>
const buckets = new Map<string, Window>()

export type RateLimitOptions = {
  /** Max requests in window. */
  max: number
  /** Window-grootte in seconden. */
  windowSec: number
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimitMem(
  scope: string,
  identifier: string,
  opts: RateLimitOptions,
): RateLimitResult {
  const now = Date.now()
  const key = `${scope}:${identifier}`
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowSec * 1000
    buckets.set(key, { hits: 1, resetAt })
    return { ok: true, remaining: opts.max - 1, resetAt }
  }
  existing.hits += 1
  if (existing.hits > opts.max) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt }
  }
  return { ok: true, remaining: opts.max - existing.hits, resetAt: existing.resetAt }
}
