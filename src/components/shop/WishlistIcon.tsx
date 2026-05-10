'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useWishlist } from './WishlistProvider'

/**
 * Floating wishlist-knop, parallel aan CartIcon. Verschijnt alleen
 * met fill als er items in de wishlist zitten. Klikken → /shop/favoris.
 */
export function WishlistIcon() {
  const { count, hydrated } = useWishlist()
  const active = hydrated && count > 0

  return (
    <Link
      href="/shop/favoris"
      aria-label={`Favoris (${count})`}
      title="Mes favoris"
      className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full border transition-all shadow-lg ${
        active
          ? 'bg-(--color-paper) text-(--color-bronze) border-(--color-bronze) hover:bg-(--color-bronze)/10'
          : 'bg-(--color-paper) text-(--color-charcoal) border-(--color-frame) hover:border-(--color-bronze) hover:text-(--color-bronze)'
      }`}
    >
      <Heart className={`w-5 h-5 ${active ? 'fill-(--color-bronze)' : ''}`} strokeWidth={1.6} />
      {active && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 text-[10px] font-bold px-1.5 rounded-full bg-(--color-ink) text-(--color-canvas) ring-2 ring-(--color-canvas)">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
