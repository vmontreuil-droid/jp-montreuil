import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { localePath, workImageUrl } from '@/lib/links'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ locale: string }>
}

type CategoryWithCover = {
  id: string
  slug: string
  label_fr: string
  label_nl: string
  cover: { storage_path: string } | null
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale as Locale)

  // Toon de eerste 6 categorieën als teaser op de homepage
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, slug, label_fr, label_nl, cover:works!categories_cover_work_id_fkey(storage_path)')
    .order('sort_order', { ascending: true })
    .limit(6)
    .returns<CategoryWithCover[]>()

  const teaserCategories = data ?? []

  return (
    <>
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-(--color-stone) mb-6">
          Atelier Montreuil
        </p>
        <h1 className="text-5xl md:text-7xl text-(--color-ink) mb-6 font-[family-name:var(--font-display)]">
          Jean-Pierre Montreuil
        </h1>
        <p className="text-xl md:text-2xl text-(--color-charcoal) italic max-w-2xl mx-auto mb-8">
          {t.tagline}
        </p>
        <p className="text-(--color-charcoal) max-w-2xl mx-auto mb-10">{t.home.intro}</p>
        <Link
          href={localePath(locale as Locale, '/galerie')}
          className="inline-flex items-center gap-2 px-7 py-3 bg-(--color-bronze) text-(--color-canvas) hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-wider"
        >
          {t.home.seeCollection}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          {teaserCategories.map((cat) => {
            const label = locale === 'fr' ? cat.label_fr : cat.label_nl
            const href = localePath(locale as Locale, `/galerie/${cat.slug}`)
            return (
              <Link
                key={cat.id}
                href={href}
                className="group relative aspect-square overflow-hidden bg-(--color-paper)"
              >
                {cat.cover?.storage_path && (
                  <Image
                    src={workImageUrl(cat.cover.storage_path)}
                    alt={label}
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <p className="absolute inset-x-0 bottom-0 p-4 text-(--color-canvas) text-lg md:text-xl font-[family-name:var(--font-display)]">
                  {label}
                </p>
              </Link>
            )
          })}
        </div>
      </section>
    </>
  )
}
