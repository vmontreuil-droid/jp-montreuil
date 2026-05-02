import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'

const SITE_NAME = 'Atelier Montreuil'

/**
 * Bouw OG + Twitter metadata zodat share-previews op FB/WhatsApp/iMessage
 * altijd een titel, beschrijving én foto tonen. `imageUrl` is optioneel:
 * - aanwezig → gebruikt voor og:image en twitter:image
 * - afwezig → file-convention `app/opengraph-image.tsx` levert de fallback
 *   (een 1200×630 brand-image) en wordt automatisch geïnjecteerd door
 *   Next.js. Niet expliciet `images` zetten zorgt dat die fallback erdoor
 *   komt.
 */
export function pageMetadata(input: {
  locale: Locale
  title: string
  description: string
  imageUrl?: string | null
  /** Optioneel: 'website' (default) of 'article' voor sub-content */
  ogType?: 'website' | 'article'
}): Metadata {
  const { locale, title, description, imageUrl, ogType = 'website' } = input
  const fullTitle = `${title} — ${SITE_NAME}`

  return {
    title,
    description,
    openGraph: {
      type: ogType,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
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
