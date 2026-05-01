import type { Locale } from '@/i18n/config'

/**
 * Bouw een pad in de juiste locale. FR (default) krijgt geen prefix, NL krijgt
 * `/nl/...`. Gebruik dit voor alle interne <Link href={...}>.
 */
export function localePath(locale: Locale, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (locale === 'fr') return normalized
  return normalized === '/' ? '/nl' : `/nl${normalized}`
}

/**
 * Publieke URL naar een afbeelding in de Supabase Storage 'works' bucket.
 */
export function workImageUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return ''
  return `${base}/storage/v1/object/public/works/${storagePath}`
}

/**
 * Bouw een wa.me URL met taal-specifiek voorgedefinieerd bericht.
 */
export function whatsappHref(phone: string, locale: Locale): string {
  const num = phone.replace(/[^\d]/g, '')
  const greeting =
    locale === 'fr' ? 'Bonjour Jean-Pierre, ' : 'Hallo Jean-Pierre, '
  return `https://wa.me/${num}?text=${encodeURIComponent(greeting)}`
}
