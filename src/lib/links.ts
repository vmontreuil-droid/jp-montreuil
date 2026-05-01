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
