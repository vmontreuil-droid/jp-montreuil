import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Brush, Check } from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/og'
import { loadPricing } from '@/lib/commission-pricing'
import CommissionForm from './CommissionForm'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDictionary(locale as Locale)
  const isFR = locale === 'fr'
  return pageMetadata({
    locale: locale as Locale,
    title: t.devis.title,
    description: isFR
      ? "Demandez un devis sur mesure pour une œuvre unique : crayon noir & blanc, aquarelle ou acrylique sur toile."
      : 'Vraag een offerte op maat aan voor een uniek werk: zwart-wit potlood, aquarel of acryl op linnen.',
  })
}

export default async function DevisPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale as Locale)
  const tt = t.devis
  const pricing = await loadPricing()

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
          {tt.eyebrow}
        </p>
        <h1 className="text-4xl md:text-5xl text-(--color-ink) mb-6 font-[family-name:var(--font-display)]">
          {tt.title}
        </h1>
        <p className="text-(--color-charcoal) mb-8 leading-relaxed">{tt.lead}</p>

        <section className="border border-(--color-frame) bg-(--color-paper) p-6">
          <div className="flex items-center gap-2 mb-4 text-(--color-bronze)">
            <Brush className="w-5 h-5" />
            <h2 className="text-sm uppercase tracking-[0.2em]">{tt.introTitle}</h2>
          </div>
          <ul className="space-y-3 text-sm text-(--color-charcoal)">
            {tt.introBody.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-(--color-bronze) shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div>
        <CommissionForm locale={locale as Locale} t={t} pricing={pricing} />
      </div>
    </div>
  )
}
