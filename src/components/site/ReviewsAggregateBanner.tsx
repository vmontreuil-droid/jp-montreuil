'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, Quote, ArrowRight } from 'lucide-react'
import type { ReviewAggregate, ReviewWithPhoto } from '@/lib/shop/reviews'

/**
 * Sociaal-bewijs banner voor de homepage (client-component voor
 * auto-rotatie van quotes). Toont:
 *  - Overall sterren + gemiddelde + count
 *  - Wisselende quote (auto-rotate elke 7s, fade-transition)
 *  - "Voir tous les avis" → /[locale]/avis (verschijnt enkel wanneer
 *    count >= 10 — anders nog niet de moeite van een aparte pagina)
 *  - "Laisser un avis" → naar boutique (klant kiest foto + scrollt
 *    naar reviews-form onderaan)
 *
 * Drempel: minimum 3 reviews om enige indicatie te geven.
 */

const MIN_REVIEWS_TO_SHOW = 3
const MIN_REVIEWS_FOR_PAGE_LINK = 10
const ROTATE_INTERVAL_MS = 7000

export function ReviewsAggregateBanner({
  aggregate,
  recentReviews,
  locale,
  labels,
}: {
  aggregate: ReviewAggregate
  recentReviews: ReviewWithPhoto[]
  locale: 'fr' | 'nl'
  labels: {
    eyebrow: string
    basedOn: string
    seeAll: string
    on: string
    leaveReview: string
  }
}) {
  // Filter quotes met body — anders is er niets om te roteren
  const quotes = recentReviews.filter((r) => r.body && r.body.trim().length > 0)
  const [idx, setIdx] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)

  useEffect(() => {
    if (quotes.length < 2) return
    const id = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setIdx((i) => (i + 1) % quotes.length)
        setFadeIn(true)
      }, 250) // fade-out duur
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [quotes.length])

  if (aggregate.count < MIN_REVIEWS_TO_SHOW || aggregate.average == null) return null

  const dateFmt = new Intl.DateTimeFormat(locale === 'nl' ? 'nl-BE' : 'fr-BE', {
    year: 'numeric', month: 'long',
  })
  const showPageLink = aggregate.count >= MIN_REVIEWS_FOR_PAGE_LINK
  const rounded = Math.round(aggregate.average)
  const quote = quotes[idx]

  return (
    <section
      className="bg-(--color-paper)/40 border-y border-(--color-frame)"
      aria-labelledby="reviews-banner-heading"
    >
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-14 grid md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-center">
        {/* Aggregate links */}
        <div className="flex flex-col items-start md:items-center text-center md:text-left md:border-r md:border-(--color-frame) md:pr-12">
          <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-3">
            {labels.eyebrow}
          </p>
          <div className="inline-flex items-center gap-1 mb-2" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`w-5 h-5 ${
                  n <= rounded
                    ? 'text-(--color-bronze) fill-(--color-bronze)'
                    : 'text-(--color-frame)'
                }`}
                strokeWidth={1.4}
              />
            ))}
          </div>
          <p
            id="reviews-banner-heading"
            className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-(--color-ink) leading-none"
          >
            {aggregate.average.toFixed(1)}<span className="text-(--color-stone) text-xl"> / 5</span>
          </p>
          <p className="text-xs text-(--color-charcoal) mt-2">
            {labels.basedOn.replace('{{n}}', String(aggregate.count))}
          </p>
          {/* Indicator-puntjes wanneer >1 quote */}
          {quotes.length > 1 && (
            <div className="mt-4 inline-flex gap-1.5" aria-hidden>
              {quotes.map((_, i) => (
                <span
                  key={i}
                  className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                    i === idx ? 'bg-(--color-bronze)' : 'bg-(--color-frame)'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quote rechts — fade-transition */}
        {quote && (
          <div
            className="flex flex-col gap-3 transition-opacity duration-300"
            style={{ opacity: fadeIn ? 1 : 0 }}
          >
            <Quote className="w-6 h-6 text-(--color-bronze)/60" aria-hidden />
            <blockquote className="text-base md:text-lg text-(--color-ink) leading-relaxed italic min-h-[3em]">
              {(quote.body ?? '').slice(0, 220)}
              {(quote.body ?? '').length > 220 ? '…' : ''}
            </blockquote>
            <footer className="text-xs text-(--color-stone) flex items-center gap-2 flex-wrap">
              <span className="font-medium text-(--color-charcoal) not-italic">{quote.name}</span>
              {quote.photo && (
                <>
                  <span>·</span>
                  <span>{labels.on} </span>
                  <Link
                    href={`/shop/boutique/photo/${quote.photo.slug}`}
                    className="text-(--color-bronze) hover:underline"
                  >
                    {quote.photo.title ?? quote.photo.slug}
                  </Link>
                </>
              )}
              <span>·</span>
              <span>{dateFmt.format(new Date(quote.created_at))}</span>
            </footer>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {showPageLink && (
                <Link
                  href={locale === 'nl' ? '/nl/avis' : '/fr/avis'}
                  className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-(--color-bronze) hover:text-(--color-bronze-dark) transition-colors"
                >
                  {labels.seeAll} <ArrowRight className="w-3 h-3" />
                </Link>
              )}
              <Link
                href="/shop/boutique"
                className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-bronze) transition-colors"
              >
                {labels.leaveReview} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
