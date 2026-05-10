'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { CartItem } from '@/lib/shop/cart'
import { cartItemKey, photoPrintKey } from '@/lib/shop/cart'

/**
 * Cart context — localStorage-backed zodat de mand bewaard blijft tussen
 * page-refreshes en tab-switches. SSR-safe: tijdens hydratie blijft
 * `items` leeg en `hydrated=false` zodat we geen cross-render mismatch
 * krijgen tussen server (geen localStorage) en client.
 *
 * Storage-key: 'shop-cart' (apart van de jp-montreuil bestaande cart-
 * implementaties indien aanwezig).
 */

const STORAGE_KEY = 'shop-cart'

type AddInput =
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

type CartContextShape = {
  items: CartItem[]
  hydrated: boolean
  add: (input: AddInput, qty?: number) => void
  remove: (key: string) => void
  setQty: (key: string, qty: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextShape | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[]
        if (Array.isArray(parsed)) setItems(parsed)
      }
    } catch {
      // private mode / corrupt JSON — start leeg
    }
    setHydrated(true)
  }, [])

  // Persist on change (after hydration to avoid wiping)
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // quota exceeded — silent
    }
  }, [items, hydrated])

  const add = useCallback((input: AddInput, qty = 1) => {
    setItems((prev) => {
      const key =
        input.kind === 'photo_print'
          ? photoPrintKey(input.photoId, input.mediaSlug, input.sizeSlug)
          : cartItemKey(input.productId, input.variantId)
      const existing = prev.find((it) => it.key === key)
      if (existing) {
        return prev.map((it) =>
          it.key === key ? { ...it, quantity: it.quantity + qty } : it,
        )
      }
      const newItem: CartItem =
        input.kind === 'photo_print'
          ? {
              key,
              productId: null,
              variantId: null,
              slug: input.slug,
              title: input.title,
              variantLabel: input.variantLabel,
              unitPriceCents: input.unitPriceCents,
              quantity: qty,
              storagePath: input.storagePath,
              kind: 'photo_print',
              photoId: input.photoId,
              photoSlug: input.photoSlug,
              mediaSlug: input.mediaSlug,
              sizeSlug: input.sizeSlug,
            }
          : {
              key,
              productId: input.productId,
              variantId: input.variantId,
              slug: input.slug,
              title: input.title,
              variantLabel: input.variantLabel,
              unitPriceCents: input.unitPriceCents,
              quantity: qty,
              storagePath: input.storagePath,
              kind: input.kind,
            }
      return [...prev, newItem]
    })
  }, [])

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key))
  }, [])

  const setQty = useCallback((key: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((it) => it.key !== key)
        : prev.map((it) => (it.key === key ? { ...it, quantity: qty } : it)),
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  return (
    <CartContext.Provider value={{ items, hydrated, add, remove, setQty, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextShape {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart() moet binnen <CartProvider> gebruikt worden')
  return ctx
}
