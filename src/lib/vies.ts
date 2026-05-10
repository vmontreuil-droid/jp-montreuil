/**
 * VIES BTW-nummer validatie via de officiële EU REST-API.
 *
 *   https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{country}/vat/{number}
 *
 * Werkt voor alle EU-lidstaten. Returns naam + adres als de combinatie
 * geldig is. We doen géén harde fail bij timeout (VIES is regelmatig
 * traag of down) — caller beslist of een onbereikbare VIES de checkout
 * mag blokkeren.
 *
 * Inputs accepteren we tolerant: "BE0123456789", "BE 0123 456 789",
 * "be 0123-456-789" — we strippen alle non-alfanumerieke tekens en
 * splitsen country/number.
 */

export type ViesResult =
  | { status: 'ok'; country: string; number: string; name: string | null; address: string | null }
  | { status: 'invalid'; country: string; number: string; reason: string }
  | { status: 'unavailable'; reason: string }

const VALID_COUNTRIES = new Set([
  'AT','BE','BG','CY','CZ','DE','DK','EE','EL','ES','FI','FR','HR',
  'HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK','XI',
])

export function parseVatInput(raw: string): { country: string; number: string } | null {
  const cleaned = raw.replace(/[\s.\-_]/g, '').toUpperCase()
  const m = cleaned.match(/^([A-Z]{2})([A-Z0-9]{6,15})$/)
  if (!m) return null
  const [, country, number] = m
  if (!VALID_COUNTRIES.has(country)) return null
  return { country, number }
}

export async function checkVies(rawVat: string, signal?: AbortSignal): Promise<ViesResult> {
  const parsed = parseVatInput(rawVat)
  if (!parsed) {
    return { status: 'invalid', country: '', number: rawVat, reason: 'Format invalide' }
  }

  const url = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${parsed.country}/vat/${parsed.number}`
  let res: Response
  try {
    res = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })
  } catch (e) {
    return {
      status: 'unavailable',
      reason: e instanceof Error ? e.message : 'Connectie mislukt',
    }
  }

  if (!res.ok) {
    return { status: 'unavailable', reason: `VIES HTTP ${res.status}` }
  }

  const json = (await res.json()) as {
    isValid?: boolean
    name?: string | null
    address?: string | null
    requestDate?: string
    userError?: string
  }

  if (json.isValid === true) {
    return {
      status: 'ok',
      country: parsed.country,
      number: parsed.number,
      // VIES retourneert vaak '---' als naam/adres niet publiek beschikbaar.
      name: json.name && json.name !== '---' ? json.name : null,
      address: json.address && json.address !== '---' ? json.address : null,
    }
  }

  return {
    status: 'invalid',
    country: parsed.country,
    number: parsed.number,
    reason: json.userError ?? 'Niet bekend bij VIES',
  }
}
