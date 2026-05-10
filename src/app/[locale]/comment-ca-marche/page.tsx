import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ShoppingBag, Brush, ArrowRight, HelpCircle } from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { localePath } from '@/lib/links'
import { pageMetadata } from '@/lib/og'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDictionary(locale as Locale).hoeWerkt
  return pageMetadata({
    locale: locale as Locale,
    title: t.title,
    description: t.lead,
  })
}

export default async function CommentCaMarchePage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale as Locale).hoeWerkt

  return (
    <article className="bg-(--color-canvas)">
      {/* Hero */}
      <header className="border-b border-(--color-frame) bg-(--color-paper)/40">
        <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-4 inline-flex items-center gap-2 justify-center">
            <HelpCircle className="w-3.5 h-3.5" />
            {t.eyebrow}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-6xl text-(--color-ink) leading-tight mb-4">
            {t.title}
          </h1>
          <p className="text-(--color-charcoal) text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            {t.lead}
          </p>
        </div>
      </header>

      {/* Steps */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <ol className="space-y-10 md:space-y-14">
          {t.steps.map((step, i) => (
            <li
              key={step.number}
              className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 md:gap-10 items-start"
            >
              <div className="flex md:flex-col items-baseline md:items-start gap-3">
                <span className="font-[family-name:var(--font-display)] text-5xl md:text-7xl text-(--color-bronze) leading-none">
                  {step.number}
                </span>
                {i < t.steps.length - 1 && (
                  <span aria-hidden className="hidden md:block w-px h-12 bg-(--color-frame) mt-3" />
                )}
              </div>
              <div className="border-l-2 md:border-l-0 border-(--color-bronze)/30 pl-4 md:pl-0">
                <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-3 leading-snug">
                  {step.title}
                </h2>
                <p className="text-(--color-charcoal) text-base leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Boutique CTA */}
      <section className="border-t border-(--color-frame) bg-(--color-paper)/40">
        <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-3 inline-flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5" />
              Boutique
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-(--color-ink) mb-3">
              {t.boutiqueCtaTitle}
            </h2>
            <p className="text-(--color-charcoal) text-base mb-6">{t.boutiqueCtaBody}</p>
            <Link
              href="/shop/boutique"
              className="inline-flex items-center gap-2 px-6 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.2em] transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              {t.boutiqueCtaLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-(--color-paper) border border-(--color-frame) p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-3 inline-flex items-center gap-2">
              <Brush className="w-3.5 h-3.5" />
              {t.questionsTitle}
            </p>
            <h3 className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) mb-3 leading-snug">
              {t.customCommissionTitle}
            </h3>
            <p className="text-sm text-(--color-charcoal) mb-4 leading-relaxed">
              {t.customCommissionBody}
            </p>
            <Link
              href={localePath(locale as Locale, '/devis')}
              className="inline-flex items-center gap-2 text-sm text-(--color-bronze) hover:text-(--color-bronze-dark) underline-offset-4 hover:underline"
            >
              {t.customCommissionCta}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Questions footer */}
      <section className="max-w-3xl mx-auto px-6 py-12 text-center">
        <p className="text-sm text-(--color-stone)">
          {t.questionsBody}{' '}
          <Link
            href={localePath(locale as Locale, '/devis')}
            className="text-(--color-bronze) hover:text-(--color-bronze-dark) underline-offset-4 hover:underline"
          >
            « {t.questionsLinkLabel} »
          </Link>
          .
        </p>
      </section>
    </article>
  )
}
