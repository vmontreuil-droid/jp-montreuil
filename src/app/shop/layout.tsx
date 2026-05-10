import Link from 'next/link'
import { ShoppingBag, ArrowLeft, LayoutDashboard } from 'lucide-react'

/**
 * Layout voor de webshop-module — geïsoleerd van de hoofdsite-shell.
 * Eigen mini-header met link terug naar /admin zodat Vincent niet
 * vastzit binnen /shop.
 *
 * In een latere iteratie kan deze layout uitgebreid worden met de
 * gewone jp-montreuil shell (AdminShell), maar voor v1 (scaffolding)
 * houden we 'm bewust simpel zodat we geen styling-conflicten
 * introduceren.
 */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/shop" className="inline-flex items-center gap-2 font-semibold">
            <ShoppingBag size={18} className="text-stone-700" />
            <span>Webshop</span>
            <span className="text-xs text-stone-400 font-normal ml-1">— scaffolding</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/shop" className="text-stone-700 hover:text-stone-900">
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
              Admin JP
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
