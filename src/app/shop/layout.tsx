import Link from 'next/link'
import { ShoppingBag, ArrowLeft, LayoutDashboard } from 'lucide-react'
import { CartProvider } from '@/components/shop/CartProvider'
import { CartIcon } from '@/components/shop/CartIcon'

/**
 * Layout voor de webshop-module — geïsoleerd van de hoofdsite-shell.
 * Eigen mini-header met link terug naar /admin + cart-icoon. CartProvider
 * wrapt alle pagina's zodat /shop/boutique, /shop/panier etc. dezelfde
 * cart delen via localStorage.
 */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-stone-50 text-stone-900">
        <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <Link href="/shop" className="inline-flex items-center gap-2 font-semibold">
              <ShoppingBag size={18} className="text-stone-700" />
              <span>Webshop</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/shop/boutique" className="text-stone-700 hover:text-stone-900">
                Boutique
              </Link>
              <Link href="/shop/admin" className="text-stone-700 hover:text-stone-900">
                Admin
              </Link>
              <span className="text-stone-300">·</span>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-900"
              >
                <ArrowLeft size={12} />
                <LayoutDashboard size={12} />
                JP
              </Link>
              <CartIcon />
            </nav>
          </div>
        </header>
        {children}
      </div>
    </CartProvider>
  )
}
