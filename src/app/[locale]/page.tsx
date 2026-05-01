import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { localePath, workImageUrl } from '@/lib/links'
import { createClient } from '@/lib/supabase/server'
import HeroSlideshow, { type HeroSlide } from '@/components/site/HeroSlideshow'

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

// Volgorde van slides in de hero — papa's photos eerst, daarna gevarieerd
// over schilder-categorieën. JP kan dit later via admin per-cover aanpassen.
const SLIDE_ORDER = [
  'photos',
  'portraits',
  'chevaux',
  'voitures',
  'chasse',
  'chiens-chats',
  'oiseaux',
  'bronze',
  'bafra-art',
  'expos',
]

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale as Locale)

  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, slug, sort_order, label_fr, label_nl, cover:works!categories_cover_work_id_fkey(storage_path)')
    .returns<CategoryWithCover[]>()

  const categories = data ?? []

  // Sorteer volgens SLIDE_ORDER; categorieën zonder cover overslaan.
  const orderIndex = (slug: string) => {
    const i = SLIDE_ORDER.indexOf(slug)
    return i === -1 ? 999 : i
  }
  const slides: HeroSlide[] = [...categories]
    .filter((c) => c.cover?.storage_path)
    .sort((a, b) => orderIndex(a.slug) - orderIndex(b.slug))
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

      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <p className="text-lg md:text-xl text-(--color-charcoal) leading-relaxed">
          {t.home.intro}
        </p>
      </section>
    </>
  )
}
