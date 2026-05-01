import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale as Locale)

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-(--color-stone) mb-6">
          {t.brand}
        </p>
        <h1 className="text-5xl md:text-6xl text-(--color-ink) mb-6">
          Jean-Pierre Montreuil
        </h1>
        <p className="text-lg text-(--color-charcoal) italic">{t.tagline}</p>
        <p className="mt-12 text-sm text-(--color-stone)">
          {locale === 'fr' ? 'Site en construction.' : 'Site in opbouw.'}
        </p>
      </div>
    </main>
  )
}
