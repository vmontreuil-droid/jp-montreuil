import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

const SITE_NAME = 'Atelier Montreuil'
const BASE = PUBLIC_BASE_URL.replace(/\/$/, '')

/**
 * Bouw OG + Twitter metadata zodat share-previews op FB/WhatsApp/iMessage
 * altijd een titel, beschrijving én foto tonen, én duidt canonical +
 * hreflang per page (vermijdt duplicate-content tussen FR/NL).
 *
 *  - `imageUrl` is optioneel → afwezig = gebruikt fallback uit
 *    `app/opengraph-image.tsx` (1200×630 brand-image).
 *  - `path` is het pad zonder locale-prefix (bv. '/galerie' of
 *    '/galerie/voitures'). Bij root: '/' of weglaten. Wordt gebruikt om
 *    canonical-URL en hreflang-alternates te bouwen.
 */
export function pageMetadata(input: {
  locale: Locale
  title: string
  description: string
  imageUrl?: string | null
  /** Optioneel: 'website' (default) of 'article' voor sub-content */
  ogType?: 'website' | 'article'
  /** Pad zonder locale-prefix (bv. '/galerie/voitures'). */
  path?: string
}): Metadata {
  const { locale, title, description, imageUrl, ogType = 'website', path = '/' } = input
  const fullTitle = `${title} — ${SITE_NAME}`

  // Canonical: per locale een eigen URL. FR (default) krijgt geen prefix,
  // NL krijgt /nl. Bij root: '/' wordt '' zodat we geen trailing slash
  // krijgen die soms naar dubbele indexering leidt.
  const trimmedPath = path === '/' ? '' : path
  const frUrl = `${BASE}${trimmedPath}`
  const nlUrl = `${BASE}/nl${trimmedPath}`
  const canonical = locale === 'fr' ? frUrl : nlUrl

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        'fr-BE': frUrl,
        'nl-BE': nlUrl,
        // x-default verwijst typisch naar de meest gebruikte locale
        'x-default': frUrl,
      },
    },
    openGraph: {
      type: ogType,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url: canonical,
      locale: locale === 'fr' ? 'fr_BE' : 'nl_BE',
      ...(imageUrl ? { images: [{ url: imageUrl, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  }
}
