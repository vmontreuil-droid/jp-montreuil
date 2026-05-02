import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'

const SITE_NAME = 'Atelier Montreuil'

/**
 * Bouw OG + Twitter metadata zodat share-previews op FB/WhatsApp/iMessage
 * altijd een titel, beschrijving én foto tonen. `imageUrl` mag een absolute
 * URL zijn (bv. Supabase storage) of een pad relatief aan de site (bv.
 * '/logo-dark.png'). Geen image gegeven → val terug op het logo.
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
  const image = imageUrl || '/logo-dark.png'

  return {
    title,
    description,
    openGraph: {
      type: ogType,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      locale: locale === 'fr' ? 'fr_BE' : 'nl_BE',
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
  }
}
