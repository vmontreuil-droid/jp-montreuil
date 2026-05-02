import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { workImageUrl } from '@/lib/links'
import { createClient } from '@/lib/supabase/server'
import { pageMetadata } from '@/lib/og'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDictionary(locale as Locale)
  const isFR = locale === 'fr'

  // Eerste about-section met image als share-foto
  const supabase = await createClient()
  const { data: section } = await supabase
    .from('about_sections')
    .select('image_path')
    .not('image_path', 'is', null)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle<{ image_path: string | null }>()
  const imgUrl = section?.image_path ? workImageUrl(section.image_path) : null

  return pageMetadata({
    locale: locale as Locale,
    title: t.about.title,
    description: isFR
      ? 'Découvrez le parcours et la démarche de Jean-Pierre Montreuil, artiste peintre animalier.'
      : 'Ontdek de loopbaan en werkwijze van Jean-Pierre Montreuil, kunstschilder gespecialiseerd in dierenkunst.',
    imageUrl: imgUrl,
  })
}

type AboutSection = {
  id: string
  title_fr: string
  title_nl: string
  body_fr: string
  body_nl: string
  image_path: string | null
  sort_order: number
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale as Locale)

  const supabase = await createClient()
  const { data } = await supabase
    .from('about_sections')
    .select('*')
    .order('sort_order', { ascending: true })
    .returns<AboutSection[]>()

  const sections = data ?? []

  return (
    <article>
      <header className="text-center pt-20 pb-16 px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl md:text-6xl text-(--color-ink)">{t.about.title}</h1>
      </header>

      {sections.length === 0 ? (
        <p className="max-w-3xl mx-auto px-6 pb-20 text-center text-(--color-stone)">
          {locale === 'fr' ? 'Contenu à venir.' : 'Inhoud volgt binnenkort.'}
        </p>
      ) : (
        <div className="space-y-16 md:space-y-24 pb-24">
          {sections.map((s, i) => {
            const title = locale === 'fr' ? s.title_fr : s.title_nl
            const body = locale === 'fr' ? s.body_fr : s.body_nl
            const imgUrl = s.image_path ? workImageUrl(s.image_path) : null
            // Alterneren: pair indices krijgen image links, oneven rechts
            const imageRight = i % 2 === 1

            return (
              <section
                key={s.id}
                className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center"
              >
                {imgUrl && (
                  <div
                    className={`card-elev relative aspect-[4/5] overflow-hidden bg-(--color-paper) ${
                      imageRight ? 'md:order-2' : ''
                    }`}
                  >
                    <Image
                      src={imgUrl}
                      alt={title}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className={imageRight ? 'md:order-1' : ''}>
                  <h2 className="text-3xl md:text-4xl text-(--color-ink) mb-6 font-[family-name:var(--font-display)]">
                    {title}
                  </h2>
                  <div className="text-(--color-charcoal) leading-relaxed whitespace-pre-line">
                    {body}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}

    </article>
  )
}
