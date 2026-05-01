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
