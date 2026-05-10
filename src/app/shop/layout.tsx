import { CartProvider } from '@/components/shop/CartProvider'
import { CartIcon } from '@/components/shop/CartIcon'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { getDictionary } from '@/i18n/dictionaries'

/**
 * Layout voor de webshop-module — gebruikt nu dezelfde site-Header +
 * Footer als de hoofdsite (i.p.v. een eigen mini-header). De webshop is
 * niet locale-gerouteerd, dus we gebruiken FR als default — komt overeen
 * met de rest van de shop-content (titels, knoppen). De CartIcon hangt
 * als floating action button rechtsonder, altijd zichtbaar tijdens
 * browsen / configurator / checkout.
 */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = 'fr' as const
  const t = getDictionary(locale)

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        <Header locale={locale} t={t} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} t={t} />

        {/* Floating cart-knop — rechtsonder, sticky, altijd bereikbaar */}
        <div className="fixed bottom-5 right-5 z-30">
          <CartIcon />
        </div>
      </div>
    </CartProvider>
  )
}
