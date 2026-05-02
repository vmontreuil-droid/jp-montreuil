import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BookOpen } from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { workImageUrl } from '@/lib/links'
import { createClient } from '@/lib/supabase/server'
import { getIbookConfig, ibookUrl } from '@/lib/ibook'
import IbookViewer from '@/components/site/IbookViewer'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDictionary(locale as Locale)
  return { title: t.about.title }
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
  const ibook = await getIbookConfig()
  const showIbook = !!ibook.pdfPath
  const ibookTitle = locale === 'fr' ? ibook.titleFr : ibook.titleNl
  const ibookDescription = locale === 'fr' ? ibook.descriptionFr : ibook.descriptionNl

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
        <div className="space-y-16 md:space-y-24 pb-12 md:pb-16">
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

      {showIbook && (
        <section className="max-w-5xl mx-auto px-6 pb-24">
          {ibookTitle && (
            <header className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.2em] text-(--color-bronze) mb-3 inline-flex items-center gap-2 justify-center">
                <BookOpen className="w-3.5 h-3.5" />
                {locale === 'fr' ? 'Le livre' : 'Het boek'}
              </p>
              <h2 className="text-3xl md:text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
                {ibookTitle}
              </h2>
              {ibookDescription && (
                <p className="mt-4 max-w-2xl mx-auto text-(--color-charcoal) leading-relaxed">
                  {ibookDescription}
                </p>
              )}
            </header>
          )}

          <div className="bg-(--color-paper) border border-(--color-frame) p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:gap-8 items-center">
              {/* Cover */}
              {ibook.coverPath && (
                <div className="relative aspect-[4/3] md:aspect-auto md:h-64 bg-(--color-canvas) overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ibookUrl(ibook.coverPath)}
                    alt={ibookTitle || 'Ibook'}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              )}

              {/* QR */}
              {ibook.qrPath && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-32 h-32 md:w-40 md:h-40 bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ibookUrl(ibook.qrPath)}
                      alt={locale === 'fr' ? 'Code QR vers le livre' : 'QR-code naar het boek'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone)">
                    {locale === 'fr' ? 'Scanner' : 'Scannen'}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3 pt-6 border-t border-(--color-frame)">
              <IbookViewer
                pdfUrl={ibookUrl(ibook.pdfPath)}
                title={ibookTitle || (locale === 'fr' ? 'Le livre' : 'Het boek')}
                closeLabel={locale === 'fr' ? 'Fermer' : 'Sluiten'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-[0.2em]"
              >
                <BookOpen className="w-4 h-4" />
                {locale === 'fr' ? 'Visualiser' : 'Bekijken'}
              </IbookViewer>
            </div>
          </div>
        </section>
      )}
    </article>
  )
}
