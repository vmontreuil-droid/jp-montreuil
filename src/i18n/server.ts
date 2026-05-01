import { headers } from 'next/headers'
import { defaultLocale, isLocale, type Locale } from './config'

/**
 * Lees de gedetecteerde locale uit de `x-locale` header die door `proxy.ts`
 * wordt gezet. Voor admin/api routes (waar de proxy niet draait) valt dit
 * terug op de default locale.
 */
export async function getRequestLocale(): Promise<Locale> {
  const h = await headers()
  const fromHeader = h.get('x-locale')
  if (fromHeader && isLocale(fromHeader)) return fromHeader
  return defaultLocale
}

/**
 * De originele (zichtbare) pathname, vóór de proxy-rewrite. Door de proxy
 * gezet via `x-pathname` header.
 */
export async function getRequestPathname(): Promise<string> {
  const h = await headers()
  return h.get('x-pathname') ?? '/'
}

/**
 * Bouw de URL voor de "andere" taal vanuit de huidige pathname.
 * - Op /contact (FR) → /nl/contact
 * - Op /nl/galerie/voitures → /galerie/voitures
 */
export function getAltLocaleHref(currentPathname: string, currentLocale: Locale): string {
  if (currentLocale === 'nl') {
    const stripped = currentPathname.replace(/^\/nl(?=\/|$)/, '')
    return stripped === '' ? '/' : stripped
  }
  return currentPathname === '/' ? '/nl' : `/nl${currentPathname}`
}
