'use client'

import Link from 'next/link'
import { Trash2, Minus, Plus, ShoppingBag, BadgeCheck, Sparkles } from 'lucide-react'
import { useCart } from '@/components/shop/CartProvider'
import { cartSubtotal } from '@/lib/shop/cart'
import { shopPhotoUrl } from '@/lib/shop/photo-url'

const BUNDLE_THRESHOLD = 3
const BUNDLE_DISCOUNT_PCT = 10

const fmt = new Intl.NumberFormat('fr-BE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
})
const formatPrice = (cents: number) => fmt.format(cents / 100)

type Labels = {
  title: string
  empty: string
  backToBoutique: string
  continueShopping: string
  remove: string
  quantity: string
  subtotal: string
  shippingNote: string
  checkout: string
  bundleHint: string
  bundleApplied: string
}

export function CartView({ labels }: { labels: Labels }) {
  const { items, hydrated, remove, setQty, clear } = useCart()

  if (!hydrated) {
    return (
      <div className="py-16 text-center">
        <span className="inline-block w-5 h-5 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <ShoppingBag size={32} className="mx-auto text-stone-300" />
        <p className="text-stone-500">{labels.empty}</p>
        <Link
          href="/shop/boutique"
          className="inline-block px-5 py-2.5 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded transition-colors"
        >
          {labels.continueShopping}
        </Link>
      </div>
    )
  }

  const subtotal = cartSubtotal(items)
  // Bundle: tel hoeveel print-kwantums in de cart zitten. Server past
  // de korting toe via discount-code 'BUNDLE3' (zie checkout-actions);
  // hier tonen we enkel de hint of bevestiging.
  const printCount = items
    .filter((i) => i.kind === 'photo_print')
    .reduce((acc, i) => acc + i.quantity, 0)
  const bundleQualifies = printCount >= BUNDLE_THRESHOLD
  const printsToGo = Math.max(0, BUNDLE_THRESHOLD - printCount)

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-8">
      {/* Items */}
      <div className="space-y-3">
        {/* Bundle banner */}
        {bundleQualifies ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-900 inline-flex items-center gap-2">
            <BadgeCheck className="w-4 h-4" />
            <span>{labels.bundleApplied} ({BUNDLE_DISCOUNT_PCT}%)</span>
          </div>
        ) : printsToGo > 0 && printCount > 0 ? (
          <div className="bg-(--color-bronze)/10 border border-(--color-bronze)/30 rounded p-3 text-xs text-(--color-ink) inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-(--color-bronze)" />
            <span>{labels.bundleHint.replace('{{n}}', String(printsToGo))}</span>
          </div>
        ) : null}

        <ul className="bg-white border border-stone-200 rounded divide-y divide-stone-200">
        {items.map((it) => (
          <li key={it.key} className="p-4 flex gap-4 items-start">
            {it.storagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shopPhotoUrl(it.storagePath, it.storageBucket)}
                alt=""
                className="w-20 h-20 object-cover rounded border border-stone-200 shrink-0"
              />
            ) : (
              <div className="w-20 h-20 bg-stone-100 rounded border border-stone-200 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{it.title}</p>
              {it.variantLabel && (
                <p className="text-xs text-stone-500">{it.variantLabel}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setQty(it.key, it.quantity - 1)}
                  className="p-1 border border-stone-300 rounded hover:bg-stone-100"
                  aria-label="−"
                >
                  <Minus size={12} />
                </button>
                <span className="text-sm tabular-nums w-6 text-center">{it.quantity}</span>
                <button
                  type="button"
                  onClick={() => setQty(it.key, it.quantity + 1)}
                  className="p-1 border border-stone-300 rounded hover:bg-stone-100"
                  aria-label="+"
                >
                  <Plus size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(it.key)}
                  className="ml-auto p-1.5 text-stone-400 hover:text-amber-700"
                  aria-label={labels.remove}
                  title={labels.remove}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-medium tabular-nums">
                {formatPrice(it.unitPriceCents * it.quantity)}
              </p>
              <p className="text-xs text-stone-500 tabular-nums">
                {formatPrice(it.unitPriceCents)} / pc
              </p>
            </div>
          </li>
        ))}
        </ul>
      </div>

      {/* Sticky summary */}
      <aside className="bg-white border border-stone-200 rounded p-5 h-fit lg:sticky lg:top-24 space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500">{labels.subtotal}</h2>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-stone-500">{labels.subtotal}</span>
          <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
        </div>
        <p className="text-xs text-stone-400 italic">{labels.shippingNote}</p>
        <div className="flex items-baseline justify-between pt-3 border-t border-stone-200">
          <span className="text-sm uppercase tracking-widest text-stone-500">{labels.subtotal}</span>
          <span className="text-2xl font-semibold tabular-nums">{formatPrice(subtotal)}</span>
        </div>
        <Link
          href="/shop/checkout"
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded transition-colors"
        >
          <ShoppingBag size={16} />
          {labels.checkout}
        </Link>
        <button
          type="button"
          onClick={clear}
          className="w-full text-xs text-stone-500 hover:text-amber-700 underline"
        >
          {labels.remove}
        </button>
      </aside>
    </div>
  )
}
