import { notFound } from 'next/navigation'
import { isLocale, locales, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'

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

  return (
    <>
      <Header locale={locale as Locale} t={t} />
      <main className="min-h-[calc(100vh-200px)]">{children}</main>
      <Footer locale={locale as Locale} t={t} />
    </>
  )
}
