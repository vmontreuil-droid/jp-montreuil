import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { getDictionary } from '@/i18n/dictionaries'
import { getShopLocale } from '@/lib/shop/locale'

/**
 * Layout voor de webshop-module — gebruikt de site-Header + Footer.
 * Locale wordt cookie-gebaseerd gelezen (gedeeld met /portail). De
 * Header krijgt `portailMode` zodat de FR/NL-knop een cookie zet i.p.v.
 * naar /nl te navigeren — er bestaat geen /nl/shop route.
 */
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getShopLocale()
  const t = getDictionary(locale)

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} t={t} portailMode />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} t={t} />
    </div>
  )
}
