import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CalendarDays, MapPin, ArrowUpRight } from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { createClient } from '@/lib/supabase/server'
import { workImageUrl } from '@/lib/links'
import { pageMetadata } from '@/lib/og'

export const dynamic = 'force-dynamic'

type ExhibitionRow = {
  id: string
  title_fr: string
  title_nl: string
  description_fr: string
  description_nl: string
  location: string | null
  date_from: string
  date_to: string | null
  image_path: string | null
  external_url: string | null
}

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const isFR = locale === 'fr'

  // Eerstkomende expositie met image als cover, anders meest recente
  const supabase = await createClient()
  const { data: ex } = await supabase
    .from('exhibitions')
    .select('image_path')
    .not('image_path', 'is', null)
    .order('date_from', { ascending: false })
    .limit(1)
    .maybeSingle<{ image_path: string | null }>()
  const imgUrl = ex?.image_path ? workImageUrl(ex.image_path) : null

  return pageMetadata({
    locale: locale as Locale,
    title: isFR ? 'Expositions' : 'Tentoonstellingen',
    description: isFR
      ? 'Expositions, salons et événements à venir et passés de Jean-Pierre Montreuil.'
      : 'Komende en voorbije tentoonstellingen, beurzen en evenementen van Jean-Pierre Montreuil.',
    imageUrl: imgUrl,
  })
}

function formatRange(from: string, to: string | null, locale: Locale): string {
  const lng = locale === 'fr' ? 'fr-BE' : 'nl-BE'
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' }
  const f = new Date(from).toLocaleDateString(lng, opts)
  if (!to || to === from) return f
  const t = new Date(to).toLocaleDateString(lng, opts)
  return `${f} → ${t}`
}

export default async function ExhibitionsPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const isFR = locale === 'fr'

  const supabase = await createClient()
  const { data } = await supabase
    .from('exhibitions')
    .select('*')
    .eq('is_active', true)
    .order('date_from', { ascending: false })
    .returns<ExhibitionRow[]>()

  const all = data ?? []
  const todayKey = new Date().toISOString().slice(0, 10)
  const upcoming = all
    .filter((e) => (e.date_to ?? e.date_from) >= todayKey)
    .reverse() // upcoming oudst-eerst (chronologisch dichtstbij eerst)
  const past = all.filter((e) => (e.date_to ?? e.date_from) < todayKey)

  return (
    <article>
      <header className="text-center pt-20 pb-12 px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl md:text-6xl text-(--color-ink) font-[family-name:var(--font-display)]">
          {isFR ? 'Expositions' : 'Tentoonstellingen'}
        </h1>
      </header>

      <div className="max-w-5xl mx-auto px-6 pb-24">
        {all.length === 0 && (
          <p className="text-center text-(--color-stone) py-20">
            {isFR ? 'Aucune exposition annoncée pour le moment.' : 'Geen tentoonstelling aangekondigd op dit moment.'}
          </p>
        )}

        {upcoming.length > 0 && (
          <section className="mb-16">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-bronze) mb-6">
              {isFR ? 'À venir / en cours' : 'Komende / lopende'}
            </h2>
            <ul className="space-y-6">
              {upcoming.map((e) => (
                <ExhibitionCard key={e.id} ex={e} locale={locale as Locale} highlight />
              ))}
            </ul>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-6">
              {isFR ? 'Passées' : 'Voorbij'}
            </h2>
            <ul className="space-y-6">
              {past.map((e) => (
                <ExhibitionCard key={e.id} ex={e} locale={locale as Locale} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  )
}

function ExhibitionCard({
  ex,
  locale,
  highlight,
}: {
  ex: ExhibitionRow
  locale: Locale
  highlight?: boolean
}) {
  const title = locale === 'fr' ? ex.title_fr : ex.title_nl
  const description = locale === 'fr' ? ex.description_fr : ex.description_nl
  const fallbackTitle = title || ex.title_fr || ex.title_nl

  const cardInner = (
    <article
      className={`card-elev card-elev-lift bg-(--color-paper) border p-6 md:p-8 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 md:gap-10 items-start transition-colors ${
        highlight
          ? 'border-(--color-bronze)/40 hover:border-(--color-bronze)'
          : 'border-(--color-frame) hover:border-(--color-bronze)/50'
      }`}
    >
      {ex.image_path ? (
        <div className="relative aspect-[4/3] md:aspect-square bg-(--color-canvas) overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={workImageUrl(ex.image_path)}
            alt={fallbackTitle}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="hidden md:flex aspect-square bg-(--color-canvas) border border-(--color-frame) items-center justify-center text-(--color-stone)">
          <CalendarDays className="w-10 h-10 opacity-40" />
        </div>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-bronze) mb-2 inline-flex items-center gap-2">
          <CalendarDays className="w-3 h-3" />
          {formatRange(ex.date_from, ex.date_to, locale)}
        </p>
        <h3 className="text-2xl md:text-3xl text-(--color-ink) font-[family-name:var(--font-display)] mb-3 leading-tight">
          {fallbackTitle}
        </h3>
        {ex.location && (
          <p className="text-sm text-(--color-charcoal) mb-3 inline-flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-(--color-stone)" />
            {ex.location}
          </p>
        )}
        {description && (
          <p className="text-(--color-charcoal) leading-relaxed mb-4 whitespace-pre-line">
            {description}
          </p>
        )}
        {ex.external_url && (
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-(--color-bronze)">
            {locale === 'fr' ? 'Plus d\'infos' : 'Meer info'}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </article>
  )

  if (ex.external_url) {
    return (
      <li>
        <a
          href={ex.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {cardInner}
        </a>
      </li>
    )
  }
  return <li>{cardInner}</li>
}
