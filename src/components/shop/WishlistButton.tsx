'use client'

import { Heart } from 'lucide-react'
import { useWishlist } from './WishlistProvider'

/**
 * Hartje-toggle voor een foto. Plaatsbaar als overlay op een
 * gallery-thumbnail (absolute positioned) of inline bij een
 * foto-detail. SSR-safe: niet gehydreerd → zelfde dimensies maar
 * onzichtbaar (geen layout-shift). Geport van allardphilippe.
 */
export function WishlistButton({
  photoId,
  className = '',
  size = 16,
  ariaLabel = 'Ajouter aux favoris',
}: {
  photoId: string
  className?: string
  size?: number
  ariaLabel?: string
}) {
  const { has, toggle, hydrated } = useWishlist()
  if (!hydrated) {
    return <span className={className} style={{ width: size + 14, height: size + 14 }} aria-hidden />
  }
  const active = has(photoId)
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(photoId) }}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`inline-flex items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
        active
          ? 'bg-(--color-bronze)/90 text-white hover:bg-(--color-bronze)'
          : 'bg-(--color-canvas)/80 text-(--color-charcoal) hover:bg-(--color-canvas) hover:text-(--color-bronze)'
      } ${className}`}
      style={{ width: size + 14, height: size + 14 }}
    >
      <Heart size={size} className={active ? 'fill-white' : ''} />
    </button>
  )
}
