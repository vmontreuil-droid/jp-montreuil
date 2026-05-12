import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Star, MessageSquare, BadgeCheck, ShoppingBag } from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/og'
import {
  getOverallReviewsAggregate,
  listRecentApprovedReviewsWithPhoto,
} from '@/lib/shop/reviews'
import { shopPhotoUrl } from '@/lib/shop/photo-url'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDictionary(locale as Locale)
  return pageMetadata({
    locale: locale as Locale,
    title: t.avis.title,
    description: t.avis.lead,
  })
}

export default async function AvisPage({ params }: Props) {
  const { locale: localeParam } = await params
  if (!isLocale(localeParam)) notFound()
  const locale = localeParam as Locale
  const t = getDictionary(locale).avis

  const [overall, reviews] = await Promise.all([
    getOverallReviewsAggregate(),
    // Locale-filter: standaard tonen we de reviews in de juiste taal
    listRecentApprovedReviewsWithPhoto(100, locale as 'fr' | 'nl'),
  ])

  const dateFmt = new Intl.DateTimeFormat(locale === 'nl' ? 'nl-BE' : 'fr-BE', {
    year: 'numeric', month: 'long',
  })

  return (
    <main className="bg-(--color-canvas)">
      {/* Header */}
      <section className="border-b border-(--color-frame) bg-(--color-paper)/40">
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
          <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-3 inline-flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" /> {t.eyebrow}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-(--color-ink) mb-4">
            {t.title}
          </h1>
          <p className="text-(--color-charcoal) max-w-2xl mb-6">
            {t.lead}
          </p>

          {overall.average != null && overall.count > 0 && (
            <div className="inline-flex items-center gap-3 bg-(--color-canvas) border border-(--color-frame) px-5 py-3 rounded">
              <div className="inline-flex items-center gap-0.5" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`w-5 h-5 ${
                      n <= Math.round(overall.average!)
                        ? 'text-(--color-bronze) fill-(--color-bronze)'
                        : 'text-(--color-frame)'
                    }`}
                    strokeWidth={1.4}
                  />
                ))}
              </div>
              <span className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) tabular-nums">
                {overall.average.toFixed(1)}
              </span>
              <span className="text-(--color-stone) text-sm">/ 5</span>
              <span className="text-(--color-stone)">·</span>
              <span className="text-sm text-(--color-charcoal)">
                {overall.count} {locale === 'fr' ? (overall.count === 1 ? 'avis' : 'avis') : (overall.count === 1 ? 'beoordeling' : 'beoordelingen')}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Reviews list */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        {reviews.length === 0 ? (
          <div className="bg-(--color-paper) border border-(--color-frame) p-12 text-center">
            <MessageSquare className="w-10 h-10 mx-auto mb-4 text-(--color-stone)/40" />
            <p className="text-(--color-charcoal) mb-6">{t.empty}</p>
            <Link
              href="/shop/boutique"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              {locale === 'fr' ? 'Découvrir la boutique' : 'Ontdek de boutique'}
            </Link>
          </div>
        ) : (
          <ul className="space-y-6">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="bg-(--color-paper) border border-(--color-frame) p-5 md:p-6 grid grid-cols-[64px_1fr] md:grid-cols-[88px_1fr] gap-4 md:gap-6"
              >
                {/* Photo thumbnail */}
                {r.photo ? (
                  <Link
                    href={`/shop/boutique/photo/${r.photo.slug}`}
                    className="block aspect-square overflow-hidden border border-(--color-frame) hover:border-(--color-bronze) transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shopPhotoUrl(r.photo.storage_path, r.photo.bucket)}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </Link>
                ) : (
                  <div className="aspect-square bg-(--color-frame)/40 border border-(--color-frame)" />
                )}

                {/* Content */}
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                    <div className="inline-flex items-center gap-2">
                      <span className="font-medium text-(--color-ink)">{r.name}</span>
                      {r.is_verified_purchase && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">
                          <BadgeCheck className="w-2.5 h-2.5" />
                          {t.verified}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-(--color-stone)">
                      {dateFmt.format(new Date(r.created_at))}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-0.5 mb-2" aria-hidden>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-3.5 h-3.5 ${
                          n <= r.rating
                            ? 'text-(--color-bronze) fill-(--color-bronze)'
                            : 'text-(--color-frame)'
                        }`}
                        strokeWidth={1.4}
                      />
                    ))}
                  </div>

                  {r.title && (
                    <p className="font-medium text-(--color-ink) mb-1.5">{r.title}</p>
                  )}
                  {r.body && (
                    <p className="text-sm text-(--color-charcoal) leading-relaxed mb-3">
                      {r.body}
                    </p>
                  )}

                  {r.photo && (
                    <p className="text-xs text-(--color-stone)">
                      {t.on}{' '}
                      <Link
                        href={`/shop/boutique/photo/${r.photo.slug}`}
                        className="text-(--color-bronze) hover:underline"
                      >
                        {r.photo.title ?? r.photo.slug}
                      </Link>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* "Hoe een review achterlaten" — duidelijke 3-stappen sectie */}
        <div className="mt-16 bg-(--color-paper) border border-(--color-frame) p-8 md:p-10">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-2 inline-flex items-center gap-2">
              <Star className="w-3 h-3 fill-(--color-bronze)" />
              {t.leaveReview}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-3">
              {locale === 'fr'
                ? 'Vous avez reçu un tirage ?'
                : 'Heeft u een print ontvangen?'}
            </h2>
            <p className="text-sm text-(--color-charcoal) max-w-xl mx-auto">
              {t.leaveReviewBody}
            </p>
          </div>

          <ol className="grid md:grid-cols-3 gap-5 mb-8">
            {[
              {
                step: '1',
                title: locale === 'fr' ? 'Ouvrez votre œuvre' : 'Open uw werk',
                body: locale === 'fr'
                  ? 'Cliquez sur la photo dans la boutique ou sur le lien dans votre e-mail de confirmation.'
                  : 'Klik op de foto in de boutique of op de link in uw bevestigingsmail.',
              },
              {
                step: '2',
                title: locale === 'fr' ? 'Descendez à « Avis »' : 'Scroll naar "Avis"',
                body: locale === 'fr'
                  ? 'En bas de la page, le formulaire vous attend.'
                  : 'Onderaan de pagina staat het formulier voor u klaar.',
              },
              {
                step: '3',
                title: locale === 'fr' ? 'Notez & envoyez' : 'Beoordeel & verstuur',
                body: locale === 'fr'
                  ? 'Choisissez vos étoiles, écrivez quelques mots — Jean-Pierre lit chaque avis.'
                  : 'Kies uw sterren, schrijf enkele woorden — Jean-Pierre leest elke beoordeling.',
              },
            ].map((s) => (
              <li key={s.step} className="bg-(--color-canvas) border border-(--color-frame) p-5 relative">
                <span className="absolute -top-3 left-5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-(--color-bronze) text-white text-xs font-bold">
                  {s.step}
                </span>
                <h3 className="font-medium text-(--color-ink) mt-2 mb-1.5">{s.title}</h3>
                <p className="text-xs text-(--color-charcoal) leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="text-center">
            <Link
              href="/shop/boutique"
              className="inline-flex items-center gap-2 px-6 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              {locale === 'fr' ? 'Choisir mon œuvre' : 'Kies mijn werk'}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
