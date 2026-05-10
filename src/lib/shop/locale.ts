import { headers, cookies } from 'next/headers'
import { isLocale, defaultLocale, type Locale } from '@/i18n/config'
import { PORTAIL_LOCALE_COOKIE } from '@/app/portail/locale-cookie'

/**
 * Bepaal de taal voor /shop/* — geen URL-prefix routing want één
 * cart/checkout flow voor alle talen. Volgorde:
 *   1. Cookie `portail_locale` (gedeeld met /portail — als klant FR
 *      koos in z'n portail, krijgt hij ook FR in shop).
 *   2. Accept-Language header (eerste FR/NL match).
 *   3. defaultLocale (FR).
 *
 * We hergebruiken de portail-cookie zodat een ingelogde klant niet 2×
 * een keuze hoeft te maken.
 */
export async function getShopLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const cookieLoc = cookieStore.get(PORTAIL_LOCALE_COOKIE)?.value
  if (cookieLoc && isLocale(cookieLoc)) return cookieLoc

  const h = await headers()
  const al = h.get('accept-language') ?? ''
  const tags = al.split(',').map((s) => s.trim().split(';')[0]?.toLowerCase() ?? '')
  for (const tag of tags) {
    if (tag.startsWith('nl')) return 'nl'
    if (tag.startsWith('fr')) return 'fr'
  }
  return defaultLocale
}
