import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  Brush,
  Check,
  PenLine,
  Wallet,
  Hammer,
  Truck,
  ClipboardList,
  Mail,
  ArrowRight,
  ChevronDown,
} from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/og'
import { localePath, workImageUrl } from '@/lib/links'
import { loadPricing } from '@/lib/commission-pricing'
import { createClient } from '@/lib/supabase/server'
import CommissionForm from './CommissionForm'

export const dynamic = 'force-dynamic'
// Server-action voor formulier-submit kan tot ~25s duren op trage 4G:
// upload naar Supabase storage + 2 react-email renders + 2 Resend POSTs.
// Default 10s/15s is te krap → Safari 'this page couldn't load'.
export const maxDuration = 60

type Props = {
  params: Promise<{ locale: string }>
}

const STEP_ICONS = [ClipboardList, Mail, PenLine, Wallet, Hammer, Truck]

type WorkRow = {
  id: string
  storage_path: string
  title_fr: string | null
  title_nl: string | null
  technique_fr: string | null
  technique_nl: string | null
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
  const isFR = locale === 'fr'
  const pricing = await loadPricing()

  // Voorbeeld-werken voor de inspiratie-grid — JP kiest deze in admin.
  // Als er nog geen geselecteerd zijn, valt de query terug op de eerste 8.
  const supabase = await createClient()
  const { data: selectedWorks } = await supabase
    .from('works')
    .select('id, storage_path, title_fr, title_nl, technique_fr, technique_nl')
    .eq('is_devis_example', true)
    .order('sort_order', { ascending: true })
    .limit(12)
    .returns<WorkRow[]>()

  let works: WorkRow[] = selectedWorks ?? []
  if (works.length === 0) {
    const { data: fallback } = await supabase
      .from('works')
      .select('id, storage_path, title_fr, title_nl, technique_fr, technique_nl')
      .order('sort_order', { ascending: true })
      .limit(8)
      .returns<WorkRow[]>()
    works = fallback ?? []
  }

  // Hero-foto: eerste werk als achtergrond
  const heroPhoto = works[0]?.storage_path ? workImageUrl(works[0].storage_path) : null

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden bg-(--color-canvas)">
        {heroPhoto && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroPhoto}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-(--color-canvas)/40 via-(--color-canvas)/60 to-(--color-canvas)"
            />
          </>
        )}
        <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-28">
          <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-4">
            {tt.eyebrow}
          </p>
          <h1 className="text-4xl md:text-6xl font-[family-name:var(--font-display)] text-(--color-ink) mb-6 leading-tight">
            {tt.title}
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-(--color-charcoal) leading-relaxed mb-8">
            {tt.lead}
          </p>
          <a
            href="#commande"
            className="inline-flex items-center gap-2 px-7 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.2em] shadow-lg shadow-(--color-bronze)/30"
          >
            <Brush className="w-4 h-4" />
            {tt.sendBtn}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Scroll-indicator onderaan de hero */}
        <a
          href="#how-it-works"
          aria-label={isFR ? 'Faire défiler' : 'Scrollen'}
          className="group absolute left-1/2 -translate-x-1/2 bottom-6 inline-flex flex-col items-center gap-2 text-(--color-stone) hover:text-(--color-bronze) transition-colors"
        >
          <span className="text-[10px] uppercase tracking-[0.3em]">
            {isFR ? 'Découvrir' : 'Ontdek'}
          </span>
          <span className="flex h-9 w-9 items-center justify-center border border-current rounded-full animate-bounce">
            <ChevronDown className="w-4 h-4" />
          </span>
        </a>
      </section>

      {/* HOE WERKT HET */}
      <section id="how-it-works" className="scroll-mt-32 bg-(--color-canvas)">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <header className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-3">
              {isFR ? 'Étapes' : 'Stappen'}
            </p>
            <h2 className="text-3xl md:text-4xl text-(--color-ink) font-[family-name:var(--font-display)] mb-3">
              {tt.howItWorksTitle}
            </h2>
            <p className="text-(--color-charcoal) max-w-xl mx-auto">{tt.howItWorksLead}</p>
          </header>

          <ol className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tt.howItWorksSteps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? Brush
              return (
                <li
                  key={i}
                  className="relative bg-(--color-paper) border border-(--color-frame) p-6 hover:border-(--color-bronze)/40 transition-colors"
                >
                  <span className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center bg-(--color-bronze) text-white">
                    <Icon className="w-4 h-4" />
                  </span>
                  <h3 className="text-base text-(--color-ink) font-[family-name:var(--font-display)] mb-2 mt-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-(--color-charcoal) leading-relaxed">{step.body}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* VOORBEELDEN */}
      {works.length > 0 && (
        <section className="border-y border-(--color-frame) bg-(--color-paper)">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <header className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-3">
                {isFR ? 'Inspiration' : 'Inspiratie'}
              </p>
              <h2 className="text-3xl md:text-4xl text-(--color-ink) font-[family-name:var(--font-display)] mb-3">
                {tt.examplesTitle}
              </h2>
              <p className="text-(--color-charcoal) max-w-xl mx-auto">{tt.examplesLead}</p>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {works.map((w) => {
                const title = (locale === 'fr' ? w.title_fr : w.title_nl) || ''
                return (
                  <div
                    key={w.id}
                    className="aspect-square overflow-hidden bg-(--color-canvas) border border-(--color-frame) group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={workImageUrl(w.storage_path)}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                )
              })}
            </div>

            <div className="text-center">
              <Link
                href={localePath(locale as Locale, '/galerie')}
                className="inline-flex items-center gap-2 px-5 py-3 border border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-ink) text-xs uppercase tracking-[0.2em] transition-colors"
              >
                {tt.examplesViewAll}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FORM SECTIE — 2 kolommen : voorwaarden links, formulier rechts */}
      <section id="commande" className="scroll-mt-32 bg-(--color-canvas)">
        <div className="max-w-6xl mx-auto px-6 pt-[105px] pb-20">
          <header className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-3">
              {isFR ? 'Commande' : 'Bestelling'}
            </p>
            <h2 className="text-3xl md:text-4xl text-(--color-ink) font-[family-name:var(--font-display)] mb-3">
              {tt.ctaTitle}
            </h2>
            <p className="text-(--color-charcoal) max-w-xl mx-auto">{tt.ctaLead}</p>
          </header>

          <div className="grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-8">
            {/* Voorwaarden / supports & techniques (links) */}
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="bg-(--color-paper) border border-(--color-frame) p-6">
                <div className="flex items-center gap-2 mb-4 text-(--color-bronze)">
                  <Brush className="w-4 h-4" />
                  <h3 className="text-xs uppercase tracking-[0.2em]">{tt.introTitle}</h3>
                </div>
                <ul className="space-y-3 text-sm text-(--color-charcoal)">
                  {tt.introBody.map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-(--color-bronze) shrink-0 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* Formulier (rechts) */}
            <div className="bg-(--color-paper) border border-(--color-frame) p-6 md:p-8">
              <CommissionForm locale={locale as Locale} t={t} pricing={pricing} />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
