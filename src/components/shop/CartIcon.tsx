'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCart } from './CartProvider'
import { cartCount } from '@/lib/shop/cart'

/**
 * Floating cart-knop in jp-montreuil bronze-stijl. Toont enkel een
 * subtiele dot zonder cijfer als de cart leeg is — wordt zichtbaar met
 * count + bronzen highlight zodra er items in zitten.
 */
export function CartIcon() {
  const { items, hydrated } = useCart()
  const count = hydrated ? cartCount(items) : 0
  const hasItems = count > 0

  return (
    <Link
      href="/shop/panier"
      aria-label={`Panier (${count})`}
      className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full border transition-all shadow-lg ${
        hasItems
          ? 'bg-(--color-bronze) text-white border-(--color-bronze) hover:bg-(--color-bronze-dark)'
          : 'bg-(--color-paper) text-(--color-charcoal) border-(--color-frame) hover:border-(--color-bronze) hover:text-(--color-bronze)'
      }`}
    >
      <ShoppingCart className="w-5 h-5" strokeWidth={1.6} />
      {hasItems && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 text-[10px] font-bold px-1.5 rounded-full bg-(--color-ink) text-(--color-canvas) ring-2 ring-(--color-canvas)">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
