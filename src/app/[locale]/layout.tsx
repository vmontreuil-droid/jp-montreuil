import { notFound } from 'next/navigation'
import { isLocale, locales, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { localePath } from '@/lib/links'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import AnalyticsTracker from '@/components/site/AnalyticsTracker'
import AnnouncementBar from '@/components/site/AnnouncementBar'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale as Locale)

  const isFR = locale === 'fr'

  return (
    <>
      <AnalyticsTracker />
      <AnnouncementBar
        href={localePath(locale as Locale, '/devis')}
        badge={isFR ? 'Nouveau' : 'Nieuw'}
        message={
          isFR
            ? 'Œuvres originales réalisées à la main — portraits et scènes sur mesure.'
            : 'Originele werken, met de hand gemaakt — portretten en taferelen op maat.'
        }
        cta={isFR ? 'Découvrir' : 'Ontdek'}
      />
      <Header locale={locale as Locale} t={t} />
      <main className="min-h-[calc(100vh-200px)]">{children}</main>
      <Footer locale={locale as Locale} t={t} />
    </>
  )
}
