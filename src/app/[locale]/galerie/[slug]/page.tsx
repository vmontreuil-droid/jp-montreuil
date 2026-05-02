import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { LayoutGrid, MessageCircle } from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { localePath, workImageUrl } from '@/lib/links'
import { createClient } from '@/lib/supabase/server'
import CategoryGallery from '@/components/site/CategoryGallery'
import type { LightboxWork } from '@/components/site/Lightbox'
import ShareButtons from '@/components/site/ShareButtons'

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
      {/* Banner-header met cover-foto + frosted card */}
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
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative h-full flex items-center px-6 md:px-12 lg:px-20">
          <div
            className="max-w-2xl w-full p-8 md:p-12 backdrop-blur-md border border-white/15 text-white"
            style={{ background: 'rgba(10, 9, 8, 0.28)' }}
          >
            <p className="text-xs uppercase tracking-[0.2em] mb-3 text-(--color-bronze)">
              Atelier Montreuil
            </p>
            <h1 className="text-5xl md:text-7xl font-[family-name:var(--font-display)] leading-none">
              {label}
            </h1>
            {description && (
              <p className="mt-4 text-white/85">{description}</p>
            )}
            <p className="mt-5 text-xs uppercase tracking-[0.2em] text-white/70">
              {works.length} {locale === 'fr' ? 'œuvres' : 'werken'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={localePath(locale as Locale, '/galerie')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-(--color-bronze) hover:text-white transition-colors text-sm uppercase tracking-[0.2em]"
              >
                <LayoutGrid className="w-4 h-4" />
                {t.nav.collection}
              </Link>
              <Link
                href={localePath(locale as Locale, '/contact')}
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/40 text-white hover:bg-white/10 transition-colors text-sm uppercase tracking-[0.2em]"
              >
                <MessageCircle className="w-4 h-4" />
                {t.nav.contact}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <CategoryGallery
          works={works.map<LightboxWork>((w) => ({
            id: w.id,
            storage_path: w.storage_path,
            title: locale === 'fr' ? w.title_fr : w.title_nl,
            year: w.year,
          }))}
          locale={locale as 'fr' | 'nl'}
        />

        <div className="mt-16 pt-8 border-t border-(--color-frame) flex justify-center">
          <ShareButtons title={`${label} — Atelier Montreuil`} locale={locale as 'fr' | 'nl'} />
        </div>
      </div>
    </>
  )
}
