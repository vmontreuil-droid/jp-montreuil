'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Lock, Truck, Building2, BadgeCheck, AlertCircle, Loader2,
} from 'lucide-react'
import { useCart } from '@/components/shop/CartProvider'
import { cartSubtotal } from '@/lib/shop/cart'
import { estimateShopShipping, prepareShopOrder } from './actions'

const fmt = new Intl.NumberFormat('fr-BE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
})
const formatPrice = (cents: number) => fmt.format(cents / 100)

export type CheckoutPrefill = {
  email: string
  full_name: string
  phone: string
  street: string
  postal_code: string
  city: string
  country: string
  is_b2b: boolean
  company: string
  vat_number: string
}

type ViesState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; name: string | null }
  | { status: 'invalid'; reason: string }
  | { status: 'unavailable' }

export function CheckoutFormClient({
  prefill,
  loggedIn,
}: {
  prefill: CheckoutPrefill | null
  loggedIn: boolean
}) {
  const { items, hydrated, clear } = useCart()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<
    | { ok: true; reference: string; checkoutUrl: string | null }
    | { ok: false; msg: string }
    | null
  >(null)

  // Form-state met prefill
  const [email, setEmail] = useState(prefill?.email ?? '')
  const [fullName, setFullName] = useState(prefill?.full_name ?? '')
  const [phone, setPhone] = useState(prefill?.phone ?? '')
  const [street, setStreet] = useState(prefill?.street ?? '')
  const [postal, setPostal] = useState(prefill?.postal_code ?? '')
  const [city, setCity] = useState(prefill?.city ?? '')
  const [country, setCountry] = useState(prefill?.country ?? 'BE')
  const [notes, setNotes] = useState('')

  const [isB2B, setIsB2B] = useState(prefill?.is_b2b ?? false)
  const [company, setCompany] = useState(prefill?.company ?? '')
  const [vat, setVat] = useState(prefill?.vat_number ?? '')
  const [vies, setVies] = useState<ViesState>({ status: 'idle' })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Live VIES-check (debounced 600ms)
  useEffect(() => {
    if (!isB2B) {
      setVies({ status: 'idle' })
      return
    }
    const trimmed = vat.trim()
    if (trimmed.length < 8) {
      setVies({ status: 'idle' })
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void runViesCheck(trimmed)
    }, 600)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vat, isB2B])

  async function runViesCheck(value: string) {
    setVies({ status: 'checking' })
    try {
      const res = await fetch('/api/shop/vies-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vat_number: value }),
      })
      const json = await res.json()
      if (json.ok) {
        setVies({ status: 'ok', name: json.name ?? null })
        if (json.name && !company) setCompany(json.name)
      } else if (json.unavailable) {
        setVies({ status: 'unavailable' })
      } else {
        setVies({ status: 'invalid', reason: json.reason ?? 'Invalide' })
      }
    } catch {
      setVies({ status: 'unavailable' })
    }
  }

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
        {loggedIn && (
          <p className="text-xs text-stone-500">
            <Link
              href={`/portail/commandes/${result.reference}`}
              className="text-stone-700 underline hover:text-stone-900"
            >
              Voir ma commande dans mon espace
            </Link>
          </p>
        )}
      </div>
    )
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const payload = {
      email: email.trim(),
      full_name: fullName.trim(),
      phone: phone.trim(),
      shipping_address: {
        street: street.trim(),
        postal_code: postal.trim(),
        city: city.trim(),
        country: country.trim(),
        notes: notes.trim(),
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
      is_b2b: isB2B,
      company_name: isB2B ? company.trim() : null,
      vat_number: isB2B ? vat.trim() : null,
    }
    startTransition(async () => {
      try {
        const res = await prepareShopOrder(payload)
        setResult({ ok: true, reference: res.reference, checkoutUrl: res.checkoutUrl })
        clear()
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
        <Field label="Nom complet *" name="full_name" value={fullName} onChange={setFullName} required autoComplete="name" />
        <Field label="Email *" name="email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
        <Field label="Téléphone (optionnel)" name="phone" type="tel" value={phone} onChange={setPhone} autoComplete="tel" />

        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500 pt-3">Adresse de livraison</h2>
        <Field label="Rue + numéro *" name="street" value={street} onChange={setStreet} required autoComplete="address-line1" />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code postal *" name="postal_code" value={postal} onChange={setPostal} required autoComplete="postal-code" />
          <div className="col-span-2">
            <Field label="Ville *" name="city" value={city} onChange={setCity} required autoComplete="address-level2" />
          </div>
        </div>
        <label className="block">
          <span className="text-sm text-stone-700 mb-1 block">Pays</span>
          <select
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
          />
        </label>

        {/* B2B section */}
        <div className="border-t border-stone-200 pt-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isB2B}
              onChange={(e) => setIsB2B(e.target.checked)}
              className="mt-1 w-4 h-4"
            />
            <span>
              <span className="block text-sm font-medium text-stone-800 inline-flex items-center gap-2">
                <Building2 className="w-4 h-4 text-stone-600" />
                Je commande en tant que professionnel (B2B)
              </span>
              <span className="block text-xs text-stone-500 mt-0.5">
                Une facture avec votre n° TVA sera générée.
              </span>
            </span>
          </label>

          {isB2B && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label="Nom de l'entreprise *"
                name="company_name"
                value={company}
                onChange={setCompany}
                required
                autoComplete="organization"
              />
              <div>
                <label className="block">
                  <span className="text-sm text-stone-700 mb-1 block">N° TVA *</span>
                  <input
                    type="text"
                    value={vat}
                    onChange={(e) => setVat(e.target.value)}
                    placeholder="BE0123456789"
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm font-mono"
                  />
                </label>
                <ViesLine state={vies} />
              </div>
            </div>
          )}
        </div>

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
  label, name, type = 'text', required, autoComplete, value, onChange,
}: {
  label: string; name: string; type?: string; required?: boolean; autoComplete?: string
  value: string; onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="text-sm text-stone-700 mb-1 block">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
      />
    </label>
  )
}

function ViesLine({ state }: { state: ViesState }) {
  if (state.status === 'idle') return null
  if (state.status === 'checking') {
    return (
      <p className="mt-1.5 text-xs text-stone-500 inline-flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" />
        Vérification VIES…
      </p>
    )
  }
  if (state.status === 'ok') {
    return (
      <p className="mt-1.5 text-xs text-emerald-700 inline-flex items-center gap-1.5">
        <BadgeCheck className="w-3.5 h-3.5" />
        Numéro valide
        {state.name && <span className="text-stone-500"> — {state.name}</span>}
      </p>
    )
  }
  if (state.status === 'invalid') {
    return (
      <p className="mt-1.5 text-xs text-red-700 inline-flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" />
        Numéro non valide ({state.reason})
      </p>
    )
  }
  return (
    <p className="mt-1.5 text-xs text-amber-700 inline-flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5" />
      VIES indisponible — vérifié par le serveur
    </p>
  )
}
