/**
 * Pluggable rate-limit. Default: in-memory (reset bij elke serverless
 * cold-start). Wanneer UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * gezet zijn → Upstash REST KV met TTL-keys (persistent + cross-edge).
 *
 * Gebruik:
 *   const { ok } = await checkRate('share:slug:user@x.be', 5, 3600)
 *   if (!ok) return { ok: false, reason: 'rate_limited' }
 */

type RateResult = { ok: boolean; remaining: number }

// ── In-memory fallback ──
const recent = new Map<string, number[]>()

function inMemoryCheck(key: string, max: number, windowSec: number): RateResult {
  const now = Date.now()
  const windowMs = windowSec * 1000
  const arr = (recent.get(key) ?? []).filter((t) => now - t < windowMs)
  if (arr.length >= max) {
    recent.set(key, arr)
    return { ok: false, remaining: 0 }
  }
  arr.push(now)
  recent.set(key, arr)
  return { ok: true, remaining: max - arr.length }
}

// ── Upstash REST ──
async function upstashCheck(
  url: string,
  token: string,
  key: string,
  max: number,
  windowSec: number,
): Promise<RateResult> {
  // Atomic INCR + EXPIRE via pipeline. Upstash REST API:
  // POST <url>/pipeline met JSON-body [["INCR","key"],["EXPIRE","key", ttl]]
  try {
    const fullKey = `rl:${key}`
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', fullKey],
        ['EXPIRE', fullKey, String(windowSec), 'NX'],
      ]),
    })
    if (!res.ok) {
      // Bij KV-fout valt back op in-memory zodat de service niet kapot gaat
      return inMemoryCheck(key, max, windowSec)
    }
    const data = (await res.json()) as Array<{ result?: number; error?: string }>
    const count = typeof data[0]?.result === 'number' ? data[0].result : 1
    return { ok: count <= max, remaining: Math.max(0, max - count) }
  } catch {
    return inMemoryCheck(key, max, windowSec)
  }
}

/**
 * Check rate-limit + register hit. Returnt `{ ok: false }` als het
 * limiet bereikt is voor dit key/window.
 */
export async function checkRate(
  key: string,
  max: number,
  windowSec: number,
): Promise<RateResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    return upstashCheck(url, token, key, max, windowSec)
  }
  return inMemoryCheck(key, max, windowSec)
}
