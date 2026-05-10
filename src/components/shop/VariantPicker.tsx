'use client'

import { useState } from 'react'
import { ShoppingBag, Check } from 'lucide-react'
import { useCart } from './CartProvider'

type VariantOption = {
  id: string
  label: string
  priceCents: number
  priceFormatted: string
  soldOut: boolean
}

/**
 * Variant-keuze + add-to-cart voor klassieke producten met variants.
 * Pre-formatted prijs via priceFormatted (geen function-prop van
 * Server -> Client).
 */
export function VariantPicker({
  productId,
  slug,
  title,
  storagePath,
  variants,
}: {
  productId: string
  slug: string
  title: string
  storagePath: string | null
  variants: VariantOption[]
}) {
  const { add } = useCart()
  const firstAvail = variants.find((v) => !v.soldOut) ?? null
  const [selectedId, setSelectedId] = useState<string | null>(firstAvail?.id ?? null)
  const [done, setDone] = useState(false)

  const selected = variants.find((v) => v.id === selectedId) ?? null

  function onAdd() {
    if (!selected) return
    add({
      kind: 'print',
      productId,
      variantId: selected.id,
      slug,
      title,
      variantLabel: selected.label,
      unitPriceCents: selected.priceCents,
      storagePath,
    })
    setDone(true)
    setTimeout(() => setDone(false), 1500)
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Format</p>
      <div className="space-y-2 mb-6">
        {variants.map((v) => {
          const sel = selectedId === v.id
          return (
            <button
              key={v.id}
              type="button"
              disabled={v.soldOut}
              onClick={() => !v.soldOut && setSelectedId(v.id)}
              className={`flex items-center justify-between gap-4 w-full px-4 py-3 border text-left rounded transition-colors ${
                v.soldOut
                  ? 'border-stone-200 opacity-50 cursor-not-allowed'
                  : sel
                    ? 'border-stone-900 bg-stone-50'
                    : 'border-stone-300 hover:border-stone-500'
              }`}
            >
              <span className="text-sm flex items-center gap-2">
                {sel && !v.soldOut && (
                  <span className="w-2 h-2 rounded-full bg-stone-900" aria-hidden />
                )}
                {v.label}
              </span>
              <span className="text-sm font-medium tabular-nums">
                {v.soldOut ? 'Épuisé' : v.priceFormatted}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={onAdd}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm rounded transition-colors"
      >
        {done ? <Check size={16} /> : <ShoppingBag size={16} />}
        {done ? 'Ajouté' : !selected ? 'Choisissez un format' : 'Ajouter au panier'}
      </button>
    </div>
  )
}
