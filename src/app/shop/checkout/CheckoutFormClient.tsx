'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Lock, Truck } from 'lucide-react'
import { useCart } from '@/components/shop/CartProvider'
import { cartSubtotal } from '@/lib/shop/cart'
import { estimateShopShipping, prepareShopOrder } from './actions'

const fmt = new Intl.NumberFormat('fr-BE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
})
const formatPrice = (cents: number) => fmt.format(cents / 100)

export function CheckoutFormClient() {
  const { items, hydrated, clear } = useCart()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<
    | { ok: true; reference: string; checkoutUrl: string | null }
    | { ok: false; msg: string }
    | null
  >(null)
  const [country, setCountry] = useState('BE')
  const [shipping, setShipping] = useState<{ cents: number; zoneName: string | null; freeAbove: number | null } | null>(null)

  const subtotalForShipping = cartSubtotal(items)

  useEffect(() => {
    if (!hydrated || items.length === 0) return
    let cancelled = false
    estimateShopShipping({ country, subtotalCents: subtotalForShipping })
      .then((r) => { if (!cancelled) setShipping(r) })
      .catch(() => { if (!cancelled) setShipping(null) })
    return () => { cancelled = true }
  }, [country, subtotalForShipping, hydrated, items.length])

  if (!hydrated) {
    return (
      <div className="py-16 text-center">
        <span className="inline-block w-5 h-5 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
    )
  }

  if (items.length === 0 && !result) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-stone-500">Votre panier est vide.</p>
        <Link href="/shop/boutique" className="inline-block px-5 py-2.5 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded">
          Retour à la boutique
        </Link>
      </div>
    )
  }

  if (result?.ok) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-8 text-center space-y-4">
        <p className="text-xs text-stone-500 uppercase tracking-widest">Référence</p>
        <p className="font-mono text-2xl">{result.reference}</p>
        <p className="text-stone-700">Merci pour votre commande !</p>
        {result.checkoutUrl ? (
          <a
            href={result.checkoutUrl}
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded transition-colors"
          >
            <Lock size={16} /> Procéder au paiement (Mollie)
          </a>
        ) : (
          <p className="text-sm text-stone-500 italic">
            Vous recevrez un email avec les instructions de paiement.
          </p>
        )}
      </div>
    )
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      email: String(fd.get('email') || '').trim(),
      full_name: String(fd.get('full_name') || '').trim(),
      shipping_address: {
        street: String(fd.get('street') || '').trim(),
        postal_code: String(fd.get('postal_code') || '').trim(),
        city: String(fd.get('city') || '').trim(),
        country: String(fd.get('country') || 'BE').trim(),
        notes: String(fd.get('notes') || '').trim(),
      },
      items: items.map((i) => ({
        product_id: i.productId,
        variant_id: i.variantId,
        title: i.variantLabel ? `${i.title} — ${i.variantLabel}` : i.title,
        unit_price_cents: i.unitPriceCents,
        quantity: i.quantity,
        photo_id: i.photoId ?? null,
        print_media_slug: i.mediaSlug ?? null,
        print_size_slug: i.sizeSlug ?? null,
        print_size_label: i.variantLabel ?? null,
      })),
      locale: 'fr',
    }
    startTransition(async () => {
      try {
        const res = await prepareShopOrder(payload)
        setResult({ ok: true, reference: res.reference, checkoutUrl: res.checkoutUrl })
        clear()
        // Auto-redirect naar Mollie checkout indien beschikbaar
        if (res.checkoutUrl) {
          setTimeout(() => { window.location.href = res.checkoutUrl! }, 800)
        }
      } catch (err) {
        setResult({ ok: false, msg: err instanceof Error ? err.message : 'Erreur' })
      }
    })
  }

  const subtotal = cartSubtotal(items)
  const total = subtotal + (shipping?.cents ?? 0)

  return (
    <form onSubmit={onSubmit} className="grid lg:grid-cols-[1fr_320px] gap-8">
      <div className="bg-white border border-stone-200 rounded p-6 space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500">Coordonnées</h2>
        <Field label="Nom complet *" name="full_name" required autoComplete="name" />
        <Field label="Email *" name="email" type="email" required autoComplete="email" />

        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500 pt-3">Adresse de livraison</h2>
        <Field label="Rue + numéro *" name="street" required autoComplete="address-line1" />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code postal *" name="postal_code" required autoComplete="postal-code" />
          <div className="col-span-2">
            <Field label="Ville *" name="city" required autoComplete="address-level2" />
          </div>
        </div>
        <label className="block">
          <span className="text-sm text-stone-700 mb-1 block">Pays</span>
          <select
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
            className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
          >
            <option value="BE">Belgique</option>
            <option value="FR">France</option>
            <option value="NL">Pays-Bas</option>
            <option value="LU">Luxembourg</option>
            <option value="DE">Allemagne</option>
            <option value="OTHER">Autre / International</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-stone-700 mb-1 block">Remarques (optionnel)</span>
          <textarea
            name="notes"
            rows={2}
            className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
          />
        </label>

        {result && !result.ok && (
          <p className="px-4 py-3 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded">
            {result.msg}
          </p>
        )}
      </div>

      <aside className="bg-white border border-stone-200 rounded p-5 h-fit lg:sticky lg:top-20 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500">Récapitulatif</h2>
        <ul className="text-sm divide-y divide-stone-200">
          {items.map((it) => (
            <li key={it.key} className="py-2 flex justify-between gap-2">
              <span className="min-w-0">
                <span className="block truncate">{it.title}</span>
                {it.variantLabel && <span className="text-xs text-stone-500">{it.variantLabel}</span>}
                <span className="text-xs text-stone-500"> × {it.quantity}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatPrice(it.unitPriceCents * it.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-1 border-t border-stone-200 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Sous-total</span>
            <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500 flex items-center gap-1">
              <Truck size={11} /> Livraison
              {shipping?.zoneName && <span className="text-[10px]">({shipping.zoneName})</span>}
            </span>
            <span className="font-medium tabular-nums">
              {shipping
                ? shipping.cents === 0
                  ? <em className="text-green-700 not-italic">gratuit</em>
                  : formatPrice(shipping.cents)
                : '—'}
            </span>
          </div>
          {shipping?.freeAbove != null && shipping.cents > 0 && subtotal < shipping.freeAbove && (
            <p className="text-[11px] text-stone-500 pt-0.5">
              Encore {formatPrice(shipping.freeAbove - subtotal)} pour la livraison gratuite.
            </p>
          )}
          <div className="flex justify-between pt-2 border-t border-stone-200 mt-2">
            <span className="text-sm uppercase tracking-widest text-stone-500">Total</span>
            <span className="text-2xl font-semibold tabular-nums">{formatPrice(total)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 text-sm rounded transition-colors"
        >
          <Lock size={16} />
          {isPending ? 'Création…' : 'Confirmer & payer'}
        </button>
        <p className="text-[11px] text-stone-400 text-center">
          Paiement sécurisé via Mollie · Bancontact, carte, Apple Pay, etc.
        </p>
      </aside>
    </form>
  )
}

function Field({
  label, name, type = 'text', required, autoComplete,
}: {
  label: string; name: string; type?: string; required?: boolean; autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="text-sm text-stone-700 mb-1 block">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
      />
    </label>
  )
}
