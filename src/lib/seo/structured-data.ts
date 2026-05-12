/**
 * JSON-LD structured-data builders. Pure functies — geen DB-fetch.
 * De caller geeft de data, deze functies returnen het correcte
 * schema.org-object dat in een <script type="application/ld+json"> moet
 * landen. Eén plek voor alle schema-keuzes zodat we consistent blijven.
 *
 * Schema-keuzes:
 *  - Person + ProfessionalService (atelier) op site-niveau
 *  - Product + AggregateRating + Review op shop-photo
 *  - ImageGallery + BreadcrumbList op /galerie/[slug]
 *  - FAQPage op /comment-ca-marche
 */

import { PUBLIC_BASE_URL } from '@/lib/public-url'

const BASE = PUBLIC_BASE_URL.replace(/\/$/, '')

// ────────────────────────────────────────────────────────────────────────
// Site-niveau (root layout — verschijnt op elke page)
// ────────────────────────────────────────────────────────────────────────

/** De artiest zelf — Google toont dit in de Knowledge Panel. */
export function personJsonLd(input: {
  name: string
  url: string
  image: string
  description: string
  sameAs?: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: input.name,
    url: input.url,
    image: input.image,
    description: input.description,
    jobTitle: 'Artiste peintre / Kunstschilder',
    knowsLanguage: ['fr', 'nl'],
    nationality: 'Belgian',
    ...(input.sameAs && input.sameAs.length > 0 ? { sameAs: input.sameAs } : {}),
  }
}

/** Het atelier als zaak — kritisch voor lokale zoekopdrachten. */
export function localBusinessJsonLd(input: {
  name: string
  url: string
  image: string
  telephone: string
  email: string
  street: string
  postalCode: string
  city: string
  country: string
  description: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': ['ProfessionalService', 'ArtGallery'],
    name: input.name,
    url: input.url,
    image: input.image,
    telephone: input.telephone,
    email: input.email,
    description: input.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: input.street,
      postalCode: input.postalCode,
      addressLocality: input.city,
      addressCountry: input.country,
    },
    priceRange: '€€',
  }
}

/** Sitelinks-searchbox — soms toont Google een zoekveld onder de URL. */
export function webSiteJsonLd(input: { name: string; url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
    inLanguage: ['fr-BE', 'nl-BE'],
  }
}

// ────────────────────────────────────────────────────────────────────────
// Shop / Product
// ────────────────────────────────────────────────────────────────────────

/** Foto in de boutique — Product + AggregateRating als reviews bestaan. */
export function shopPhotoJsonLd(input: {
  name: string
  description: string
  image: string
  url: string
  /** Goedkoopste prijs in euro (decimaal: 75.00). */
  lowPrice?: number
  highPrice?: number
  isAvailable: boolean
  reviews?: {
    count: number
    average: number
    items?: Array<{ author: string; rating: number; body?: string | null; datePublished: string }>
  }
}) {
  const offer: Record<string, unknown> = {
    '@type': 'AggregateOffer',
    priceCurrency: 'EUR',
    availability: input.isAvailable
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
  }
  if (input.lowPrice !== undefined) offer.lowPrice = input.lowPrice.toFixed(2)
  if (input.highPrice !== undefined) offer.highPrice = input.highPrice.toFixed(2)

  const out: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    image: input.image,
    url: input.url,
    brand: { '@type': 'Brand', name: 'Atelier Montreuil' },
    offers: offer,
  }

  if (input.reviews && input.reviews.count > 0) {
    out.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: input.reviews.average.toFixed(1),
      reviewCount: input.reviews.count,
      bestRating: '5',
      worstRating: '1',
    }
    if (input.reviews.items && input.reviews.items.length > 0) {
      out.review = input.reviews.items.slice(0, 5).map((r) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.author },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: String(r.rating),
          bestRating: '5',
          worstRating: '1',
        },
        ...(r.body ? { reviewBody: r.body } : {}),
        datePublished: r.datePublished.slice(0, 10),
      }))
    }
  }

  return out
}

// ────────────────────────────────────────────────────────────────────────
// Navigatie
// ────────────────────────────────────────────────────────────────────────

/** Broodkruimels — Google toont ze onder de URL i.p.v. lange paden. */
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.name,
      item: `${BASE}${it.path}`,
    })),
  }
}

// ────────────────────────────────────────────────────────────────────────
// Galerie / categorie
// ────────────────────────────────────────────────────────────────────────

export function imageGalleryJsonLd(input: {
  name: string
  description: string
  url: string
  images: Array<{ url: string; caption?: string | null }>
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: input.name,
    description: input.description,
    url: input.url,
    associatedMedia: input.images.map((img) => ({
      '@type': 'ImageObject',
      contentUrl: img.url,
      ...(img.caption ? { caption: img.caption } : {}),
    })),
  }
}

// ────────────────────────────────────────────────────────────────────────
// FAQ — voor /comment-ca-marche
// ────────────────────────────────────────────────────────────────────────

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((qa) => ({
      '@type': 'Question',
      name: qa.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: qa.answer,
      },
    })),
  }
}
