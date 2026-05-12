import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Newspaper, ArrowRight } from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { localePath, workImageUrl } from '@/lib/links'
import { pageMetadata } from '@/lib/og'
import { listPublishedPosts } from '@/lib/journal'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam } = await params
  if (!isLocale(localeParam)) return {}
  const locale = localeParam as Locale
  const isFR = locale === 'fr'
  return pageMetadata({
    locale,
    title: isFR ? 'Journal' : 'Journaal',
    description: isFR
      ? 'Le carnet de bord de Jean-Pierre Montreuil — réflexions, techniques, vie d\'atelier.'
      : 'Het notitieboek van Jean-Pierre Montreuil — bespiegelingen, techniek, atelier-leven.',
    path: '/journal',
  })
}

export default async function JournalIndexPage({ params }: Props) {
  const { locale: localeParam } = await params
  if (!isLocale(localeParam)) notFound()
  const locale = localeParam as Locale
  const isFR = locale === 'fr'
  const posts = await listPublishedPosts({ limit: 50 })

  const dateFmt = new Intl.DateTimeFormat(isFR ? 'fr-BE' : 'nl-BE', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <main className="bg-(--color-canvas)">
      {/* Header */}
      <section className="border-b border-(--color-frame) bg-(--color-paper)/40">
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
          <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-3 inline-flex items-center gap-2">
            <Newspaper className="w-3.5 h-3.5" /> {isFR ? 'Carnet d\'atelier' : 'Atelier-notities'}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-(--color-ink) mb-4">
            {isFR ? 'Journal' : 'Journaal'}
          </h1>
          <p className="text-(--color-charcoal) max-w-2xl">
            {isFR
              ? "Réflexions sur la peinture, sur les modèles que j'ai eu la chance de représenter, sur les techniques que j'explore — un coin où je partage l'envers du chevalet."
              : 'Bespiegelingen over schilderen, over modellen die ik het geluk had te portretteren, over technieken die ik verken — een hoekje waar ik de achterkant van de ezel deel.'}
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        {posts.length === 0 ? (
          <div className="bg-(--color-paper) border border-(--color-frame) p-12 text-center">
            <Newspaper className="w-10 h-10 mx-auto mb-4 text-(--color-stone)/40" />
            <p className="text-(--color-charcoal)">
              {isFR
                ? 'Le journal vient d\'ouvrir — la première entrée arrive bientôt.'
                : 'Het journaal is net geopend — de eerste post komt binnenkort.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-8">
            {posts.map((p) => {
              const title = isFR ? p.title_fr : (p.title_nl || p.title_fr)
              const excerpt = isFR ? p.excerpt_fr : (p.excerpt_nl || p.excerpt_fr)
              return (
                <li key={p.id}>
                  <Link
                    href={localePath(locale, `/journal/${p.slug}`)}
                    className="block group"
                  >
                    <article className="grid md:grid-cols-[200px_1fr] gap-5 md:gap-7 bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) p-5 md:p-6 transition-colors">
                      {p.cover_image_path ? (
                        <div className="relative aspect-[4/3] md:aspect-square overflow-hidden">
                          <Image
                            src={workImageUrl(p.cover_image_path)}
                            alt={title}
                            fill
                            sizes="(min-width: 768px) 200px, 100vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="bg-(--color-frame)/40 aspect-[4/3] md:aspect-square flex items-center justify-center">
                          <Newspaper className="w-8 h-8 text-(--color-stone)/40" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-xs text-(--color-stone) mb-2">
                          {p.published_at && dateFmt.format(new Date(p.published_at))}
                        </p>
                        <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2 leading-tight group-hover:text-(--color-bronze) transition-colors">
                          {title}
                        </h2>
                        {excerpt && (
                          <p className="text-sm text-(--color-charcoal) leading-relaxed mb-3">
                            {excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          {p.tags.slice(0, 4).map((t) => (
                            <span key={t} className="text-[10px] uppercase tracking-widest text-(--color-stone)">
                              #{t}
                            </span>
                          ))}
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-(--color-bronze)">
                          {isFR ? 'Lire' : 'Lees'} <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </article>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
