import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ChevronLeft } from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { localePath, workImageUrl } from '@/lib/links'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}
  const supabase = await createClient()
  const { data: cat } = await supabase
    .from('categories')
    .select('label_fr, label_nl')
    .eq('slug', slug)
    .single()
  if (!cat) return {}
  return { title: locale === 'fr' ? cat.label_fr : cat.label_nl }
}

type Work = {
  id: string
  storage_path: string
  title_fr: string | null
  title_nl: string | null
  year: number | null
  technique_fr: string | null
  technique_nl: string | null
  dimensions: string | null
  sort_order: number
}

export default async function CategoryDetailPage({ params }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale as Locale)

  const supabase = await createClient()
  const { data: category } = await supabase
    .from('categories')
    .select('id, slug, label_fr, label_nl, description_fr, description_nl, cover:works!categories_cover_work_id_fkey(storage_path)')
    .eq('slug', slug)
    .single<{
      id: string
      slug: string
      label_fr: string
      label_nl: string
      description_fr: string | null
      description_nl: string | null
      cover: { storage_path: string } | null
    }>()

  if (!category) notFound()

  const { data: worksData } = await supabase
    .from('works')
    .select('id, storage_path, title_fr, title_nl, year, technique_fr, technique_nl, dimensions, sort_order')
    .eq('category_id', category.id)
    .order('sort_order', { ascending: true })
    .returns<Work[]>()

  const works = worksData ?? []
  const label = locale === 'fr' ? category.label_fr : category.label_nl
  const description = locale === 'fr' ? category.description_fr : category.description_nl

  return (
    <>
      {/* Banner-header met cover-foto */}
      <section className="relative h-[60vh] min-h-[360px] overflow-hidden">
        {category.cover?.storage_path && (
          <Image
            src={workImageUrl(category.cover.storage_path)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6 text-(--color-canvas)">
          <p className="text-xs uppercase tracking-[0.4em] mb-4 opacity-90">
            Atelier Montreuil
          </p>
          <h1 className="text-5xl md:text-7xl font-[family-name:var(--font-display)] drop-shadow-lg">
            {label}
          </h1>
          {description && (
            <p className="mt-4 max-w-2xl italic drop-shadow-md">{description}</p>
          )}
          <p className="mt-6 text-xs uppercase tracking-wider opacity-80">
            {works.length} {locale === 'fr' ? 'œuvres' : 'werken'}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link
          href={localePath(locale as Locale, '/galerie')}
          className="inline-flex items-center gap-1 text-sm text-(--color-stone) hover:text-(--color-ink) mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          {t.nav.collection}
        </Link>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {works.map((work) => {
          const title = locale === 'fr' ? work.title_fr : work.title_nl
          return (
            <a
              key={work.id}
              href={workImageUrl(work.storage_path)}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square bg-(--color-paper) overflow-hidden"
            >
              <Image
                src={workImageUrl(work.storage_path)}
                alt={title || ''}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {title && (
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {title}
                  {work.year ? ` · ${work.year}` : ''}
                </div>
              )}
            </a>
          )
        })}
        </div>
      </div>
    </>
  )
}
