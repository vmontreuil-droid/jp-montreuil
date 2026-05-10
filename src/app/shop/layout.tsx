import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { getDictionary } from '@/i18n/dictionaries'

/**
 * Layout voor de webshop-module — gebruikt de site-Header + Footer.
 * CartProvider + WishlistProvider zitten globaal in de root layout
 * (zodat de header-icoontjes overal werken). De floating FAB-buttons
 * zijn vervangen door de header-icoontjes.
 */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = 'fr' as const
  const t = getDictionary(locale)

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} t={t} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} t={t} />
    </div>
  )
}
