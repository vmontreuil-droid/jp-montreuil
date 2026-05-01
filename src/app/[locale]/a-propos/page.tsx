import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { createClient } from '@/lib/supabase/server'

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
    <article className="max-w-3xl mx-auto px-6 py-16">
      <header className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-(--color-stone) mb-3">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl md:text-5xl text-(--color-ink)">{t.about.title}</h1>
      </header>

      {sections.length === 0 ? (
        <p className="text-center text-(--color-stone) italic">
          {locale === 'fr' ? 'Contenu à venir.' : 'Inhoud volgt binnenkort.'}
        </p>
      ) : (
        <div className="space-y-12">
          {sections.map((s) => {
            const title = locale === 'fr' ? s.title_fr : s.title_nl
            const body = locale === 'fr' ? s.body_fr : s.body_nl
            return (
              <section key={s.id}>
                <h2 className="text-2xl md:text-3xl text-(--color-ink) mb-4">{title}</h2>
                <div className="prose prose-stone max-w-none whitespace-pre-line text-(--color-charcoal) leading-relaxed">
                  {body}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </article>
  )
}
