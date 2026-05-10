'use client'

import Link from 'next/link'
import { Heart, ShoppingCart } from 'lucide-react'
import { useWishlist } from '@/components/shop/WishlistProvider'
import { useCart } from '@/components/shop/CartProvider'
import { cartCount } from '@/lib/shop/cart'

/**
 * Compact wishlist + cart icoontjes voor in de header. Verschijnen
 * altijd (zelfde stijl als Theme/Lang/User-knop), badge enkel bij
 * count > 0. Werkt overal want providers staan in root layout.
 */
export default function HeaderShopIcons({ stack }: { stack?: 'horizontal' | 'mobile' }) {
  const { count: wishCount, hydrated: wishHydrated } = useWishlist()
  const { items, hydrated: cartHydrated } = useCart()
  const cartTotal = cartHydrated ? cartCount(items) : 0

  if (stack === 'mobile') {
    return (
      <div className="flex items-center gap-3">
        <MobileItem
          href="/shop/favoris"
          icon={<Heart className={`w-5 h-5 ${wishHydrated && wishCount > 0 ? 'fill-(--color-bronze) text-(--color-bronze)' : ''}`} />}
          label="Mes favoris"
          count={wishHydrated ? wishCount : 0}
        />
        <MobileItem
          href="/shop/panier"
          icon={<ShoppingCart className={`w-5 h-5 ${cartHydrated && cartTotal > 0 ? 'text-(--color-bronze)' : ''}`} />}
          label="Mon panier"
          count={cartHydrated ? cartTotal : 0}
        />
      </div>
    )
  }

  return (
    <>
      <Link
        href="/shop/favoris"
        aria-label={`Favoris (${wishCount})`}
        title="Mes favoris"
        className="relative inline-flex items-center justify-center w-[34px] h-[34px] text-(--color-stone) hover:text-(--color-bronze) transition-colors border border-(--color-frame) hover:border-(--color-bronze) rounded-sm"
      >
        <Heart className={`w-4 h-4 ${wishHydrated && wishCount > 0 ? 'fill-(--color-bronze) text-(--color-bronze)' : ''}`} />
        {wishHydrated && wishCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full bg-(--color-ink) text-(--color-canvas) ring-2 ring-(--color-canvas)">
            {wishCount > 99 ? '99+' : wishCount}
          </span>
        )}
      </Link>
      <Link
        href="/shop/panier"
        aria-label={`Panier (${cartTotal})`}
        title="Mon panier"
        className="relative inline-flex items-center justify-center w-[34px] h-[34px] text-(--color-stone) hover:text-(--color-bronze) transition-colors border border-(--color-frame) hover:border-(--color-bronze) rounded-sm"
      >
        <ShoppingCart className={`w-4 h-4 ${cartHydrated && cartTotal > 0 ? 'text-(--color-bronze)' : ''}`} />
        {cartHydrated && cartTotal > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full bg-(--color-bronze) text-white ring-2 ring-(--color-canvas)">
            {cartTotal > 99 ? '99+' : cartTotal}
          </span>
        )}
      </Link>
    </>
  )
}

function MobileItem({
  href, icon, label, count,
}: {
  href: string
  icon: React.ReactNode
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative inline-flex items-center justify-center w-9 h-9 text-(--color-charcoal) hover:text-(--color-bronze) transition-colors"
    >
      {icon}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full bg-(--color-bronze) text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
