'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCart } from './CartProvider'
import { cartCount } from '@/lib/shop/cart'

/**
 * Header cart-icoon met badge. Verschijnt enkel met aantal > 0 zodat
 * de header niet altijd "0" toont.
 */
export function CartIcon() {
  const { items, hydrated } = useCart()
  const count = hydrated ? cartCount(items) : 0

  return (
    <Link
      href="/shop/panier"
      className="relative inline-flex items-center justify-center p-2 -m-2 text-stone-700 hover:text-stone-900"
      aria-label={`Panier (${count})`}
    >
      <ShoppingCart size={18} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-medium px-1 rounded-full bg-stone-900 text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
