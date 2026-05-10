/**
 * Cart-types — pure data, geen DOM/localStorage. Wordt gebruikt door
 * zowel CartProvider (client) als evt server-side checkout-logica.
 */

export type CartItem = {
  /** Onveranderlijke key per cart-rij. Voor klassieke producten:
   *  `${productId}:${variantId ?? ''}`. Voor configurator-prints:
   *  `photo:${photoId}:${mediaSlug}:${sizeSlug}`. */
  key: string
  productId: string | null
  variantId: string | null
  slug: string
  title: string
  variantLabel: string | null
  unitPriceCents: number
  quantity: number
  storagePath: string | null
  kind: 'calendar' | 'print' | 'download' | 'commission' | 'photo_print'
  /* Enkel voor `photo_print` (configurator) */
  photoId?: string
  photoSlug?: string
  mediaSlug?: string
  sizeSlug?: string
}

export function cartItemKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? ''}`
}

export function photoPrintKey(photoId: string, mediaSlug: string, sizeSlug: string): string {
  return `photo:${photoId}:${mediaSlug}:${sizeSlug}`
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((acc, it) => acc + it.unitPriceCents * it.quantity, 0)
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((acc, it) => acc + it.quantity, 0)
}
