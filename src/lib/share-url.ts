/**
 * Voeg een dagelijks roterende cache-buster toe aan share-URLs voor
 * FB/WhatsApp. Effect: scrapers behandelen de link als nieuw zolang de
 * dag draait, dus na een OG-update is de fresh preview binnen 24u
 * automatisch live — zonder dat een gebruiker handmatig "Scrape Again"
 * moet doen of een eigen `?v=` moet typen.
 *
 * - Eens per dag verandert de waarde (YYYYMMDD)
 * - Wordt enkel op FB/WhatsApp-share-URLs gebruikt; "Copy link" en
 *   native share blijven schoon zodat het mailadres niet vol query-
 *   params staat.
 */
export function withShareCacheBuster(url: string): string {
  if (!url) return url
  try {
    const u = new URL(url)
    const today = new Date()
    const v = `${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, '0')}${String(today.getUTCDate()).padStart(2, '0')}`
    u.searchParams.set('v', v)
    return u.toString()
  } catch {
    // url is geen valid absolute URL → onveranderd teruggeven
    return url
  }
}
