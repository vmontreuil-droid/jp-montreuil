import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { localePath, workImageUrl } from '@/lib/links'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDictionary(locale as Locale)
  return { title: t.nav.collection }
}

type CategoryWithCover = {
  id: string
  slug: string
  sort_order: number
  label_fr: string
  label_nl: string
  cover_work_id: string | null
  cover: { storage_path: string } | null
}

export default async function GaleriePage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale as Locale)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, sort_order, label_fr, label_nl, cover_work_id, cover:works!categories_cover_work_id_fkey(storage_path)')
    .order('sort_order', { ascending: true })
    .returns<CategoryWithCover[]>()

  if (error) {
    console.error('Failed to load categories', error)
  }
  const categories = data ?? []

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-[0.3em] text-(--color-stone) mb-3">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl md:text-5xl text-(--color-ink)">{t.nav.collection}</h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const label = locale === 'fr' ? cat.label_fr : cat.label_nl
          const href = localePath(locale as Locale, `/galerie/${cat.slug}`)
          const coverPath = cat.cover?.storage_path

          return (
            <Link
              key={cat.id}
              href={href}
              className="group relative aspect-[4/5] overflow-hidden bg-(--color-paper)"
            >
              {coverPath ? (
                <Image
                  src={workImageUrl(coverPath)}
                  alt={label}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-(--color-frame)" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p className="text-2xl md:text-3xl font-[family-name:var(--font-display)]">
                  {label}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
