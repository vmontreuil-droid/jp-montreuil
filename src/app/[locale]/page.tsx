import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { localePath, workImageUrl } from '@/lib/links'
import { createClient } from '@/lib/supabase/server'
import HeroSlideshow, { type HeroSlide } from '@/components/site/HeroSlideshow'
import ShareButtons from '@/components/site/ShareButtons'

type Props = {
  params: Promise<{ locale: string }>
}

type CategoryWithCover = {
  id: string
  slug: string
  sort_order: number
  label_fr: string
  label_nl: string
  cover: { storage_path: string } | null
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale as Locale)

  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, slug, sort_order, label_fr, label_nl, cover:works!categories_cover_work_id_fkey(storage_path)')
    .order('sort_order', { ascending: true })
    .returns<CategoryWithCover[]>()

  const categories = data ?? []

  // Slides volgen de admin sort_order; categorieën zonder cover overslaan.
  const slides: HeroSlide[] = categories
    .filter((c) => c.cover?.storage_path)
    .map((c) => ({
      src: workImageUrl(c.cover!.storage_path),
      label: locale === 'fr' ? c.label_fr : c.label_nl,
      href: localePath(locale as Locale, `/galerie/${c.slug}`),
    }))

  return (
    <>
      <HeroSlideshow
        slides={slides}
        brandName="Jean-Pierre Montreuil"
        tagline={t.tagline}
        ctaLabel={t.home.seeCollection}
        ctaHref={localePath(locale as Locale, '/galerie')}
        contactLabel={t.nav.contact}
        contactHref={localePath(locale as Locale, '/contact')}
        indicatorLabel={locale === 'fr' ? 'Découvrir' : 'Bekijk'}
      />

      <section className="max-w-3xl mx-auto px-6 py-20 md:py-24 text-center">
        <div className="flex items-center gap-4 mb-10">
          <span className="flex-1 h-px bg-(--color-frame)" />
          <p className="text-sm md:text-base uppercase tracking-[0.2em] text-(--color-ink) whitespace-nowrap">
            {t.tagline}
          </p>
          <span className="flex-1 h-px bg-(--color-frame)" />
        </div>
        <p className="text-base md:text-lg text-(--color-charcoal) leading-relaxed mb-10">
          {t.home.intro}
        </p>
        <div className="flex justify-center">
          <ShareButtons title="Atelier Montreuil — Jean-Pierre Montreuil" locale={locale} />
        </div>
      </section>
    </>
  )
}
