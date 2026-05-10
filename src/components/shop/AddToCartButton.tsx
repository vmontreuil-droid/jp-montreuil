'use client'

import { useState } from 'react'
import { ShoppingBag, Check } from 'lucide-react'
import { useCart } from './CartProvider'

type AddPayload =
  | {
      kind: 'calendar' | 'print' | 'download' | 'commission'
      productId: string
      variantId: string | null
      slug: string
      title: string
      variantLabel: string | null
      unitPriceCents: number
      storagePath: string | null
    }
  | {
      kind: 'photo_print'
      photoId: string
      photoSlug: string
      mediaSlug: string
      sizeSlug: string
      slug: string
      title: string
      variantLabel: string
      unitPriceCents: number
      storagePath: string | null
    }

/**
 * Generieke add-to-cart-knop. Kort visueel feedback (✓ Ajouté) na klik.
 * Disabled bij `disabled=true` (bv. soldOut of geen variant gekozen).
 */
export function AddToCartButton({
  payload,
  disabled,
  label = 'Ajouter au panier',
  addedLabel = 'Ajouté',
}: {
  payload: AddPayload
  disabled?: boolean
  label?: string
  addedLabel?: string
}) {
  const { add } = useCart()
  const [done, setDone] = useState(false)

  function onClick() {
    if (disabled) return
    add(payload)
    setDone(true)
    setTimeout(() => setDone(false), 1500)
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm tracking-wide rounded"
    >
      {done ? <Check size={16} /> : <ShoppingBag size={16} />}
      {done ? addedLabel : label}
    </button>
  )
}
