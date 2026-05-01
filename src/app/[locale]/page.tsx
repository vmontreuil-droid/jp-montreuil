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

  // Eerste category-cover wordt als hero gebruikt — "voitures" staat eerst.
  const heroPath = teaserCategories[0]?.cover?.storage_path

  return (
    <>
      {/* Full-bleed hero met groot kunstwerk */}
      <section className="relative h-[85vh] min-h-[500px] -mt-[1px] overflow-hidden">
        {heroPath && (
          <Image
            src={workImageUrl(heroPath)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6 text-(--color-canvas)">
          <p className="text-xs md:text-sm uppercase tracking-[0.5em] mb-6 opacity-90">
            Atelier Montreuil
          </p>
          <h1 className="text-5xl md:text-8xl mb-8 font-[family-name:var(--font-display)] drop-shadow-lg">
            Jean-Pierre Montreuil
          </h1>
          <p className="text-xl md:text-3xl italic max-w-3xl mb-12 drop-shadow-md">
            {t.tagline}
          </p>
          <Link
            href={localePath(locale as Locale, '/galerie')}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-(--color-canvas) text-(--color-ink) hover:bg-(--color-bronze) hover:text-(--color-canvas) transition-colors text-sm uppercase tracking-wider"
          >
            {t.home.seeCollection}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Intro */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-lg md:text-xl text-(--color-charcoal) leading-relaxed">
          {t.home.intro}
        </p>
      </section>

      {/* Categorie-teasers */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          {teaserCategories.map((cat) => {
            const label = locale === 'fr' ? cat.label_fr : cat.label_nl
            const href = localePath(locale as Locale, `/galerie/${cat.slug}`)
            return (
              <Link
                key={cat.id}
                href={href}
                className="group relative aspect-[4/5] overflow-hidden bg-(--color-paper)"
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <p className="absolute inset-x-0 bottom-0 p-5 text-(--color-canvas) text-2xl md:text-3xl font-[family-name:var(--font-display)]">
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
