'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Lock, Truck, Building2, BadgeCheck, AlertCircle, Loader2,
} from 'lucide-react'
import { Tag, X } from 'lucide-react'
import { useCart } from '@/components/shop/CartProvider'
import { cartSubtotal } from '@/lib/shop/cart'
import { Gift } from 'lucide-react'
import {
  estimateShopShipping, prepareShopOrder, previewDiscount,
  previewGiftCard, captureAbandonedCartAction,
} from './actions'

const fmtFR = new Intl.NumberFormat('fr-BE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
})
const fmtNL = new Intl.NumberFormat('nl-BE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
})
const makeFormatPrice = (locale: 'fr' | 'nl') => (cents: number) =>
  (locale === 'nl' ? fmtNL : fmtFR).format(cents / 100)

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

type CheckoutLabels = {
  title: string
  lead: string
  loginCta: string
  loginBtn: string
  loggedAs: string
  coords: string
  fullName: string
  email: string
  phone: string
  shipping: string
  street: string
  postal: string
  city: string
  country: string
  notes: string
  b2bToggle: string
  b2bHint: string
  company: string
  vat: string
  summary: string
  delivery: string
  free: string
  total: string
  promoPlaceholder: string
  giftPlaceholder: string
  remove: string
  submit: string
  submitting: string
  payNow: string
  payByEmail: string
  thanks: string
  reference: string
  goToOrder: string
  paymentSecure: string
  countryFr: Record<string, string>
  freeShippingHint: string
  viesChecking: string
  viesValid: string
  viesInvalid: string
  viesUnavailable: string
  subtotal: string
  emptyCart: string
  backToBoutique: string
  removeCode: string
  removeCard: string
  codePrefix: string
  giftCard: string
  genericError: string
}

const DEFAULT_LABELS: CheckoutLabels = {
  title: 'Commande',
  lead: 'Renseignez vos coordonnées de livraison.',
  loginCta: 'Déjà client ? Connectez-vous.',
  loginBtn: 'Se connecter',
  loggedAs: 'Connecté en tant que',
  coords: 'Coordonnées',
  fullName: 'Nom complet',
  email: 'Email',
  phone: 'Téléphone',
  shipping: 'Adresse de livraison',
  street: 'Rue + numéro',
  postal: 'Code postal',
  city: 'Ville',
  country: 'Pays',
  notes: 'Remarques (optionnel)',
  b2bToggle: 'Je commande en tant que professionnel (B2B)',
  b2bHint: 'Une facture avec votre n° TVA sera générée.',
  company: "Nom de l'entreprise",
  vat: 'N° TVA',
  summary: 'Récapitulatif',
  delivery: 'Livraison',
  free: 'gratuit',
  total: 'Total',
  promoPlaceholder: 'Code promo',
  giftPlaceholder: 'Carte-cadeau',
  remove: 'Retirer',
  submit: 'Confirmer & payer',
  submitting: 'Création…',
  payNow: 'Procéder au paiement (Mollie)',
  payByEmail: 'Vous recevrez un email avec les instructions de paiement.',
  thanks: 'Merci pour votre commande !',
  reference: 'Référence',
  goToOrder: 'Voir ma commande dans mon espace',
  paymentSecure: 'Paiement sécurisé via Mollie · Bancontact, carte, Apple Pay, etc.',
  countryFr: { BE: 'Belgique', FR: 'France', NL: 'Pays-Bas', LU: 'Luxembourg', DE: 'Allemagne', OTHER: 'Autre / International' },
  freeShippingHint: 'Encore {{amount}} pour la livraison gratuite.',
  viesChecking: 'Vérification VIES…',
  viesValid: 'Numéro valide',
  viesInvalid: 'Numéro non valide',
  viesUnavailable: 'VIES indisponible — vérifié par le serveur',
  subtotal: 'Sous-total',
  emptyCart: 'Votre panier est vide.',
  backToBoutique: 'Retour à la boutique',
  removeCode: 'Retirer le code',
  removeCard: 'Retirer la carte',
  codePrefix: 'Code',
  giftCard: 'Carte-cadeau',
  genericError: 'Erreur',
}

export function CheckoutFormClient({
  prefill,
  loggedIn,
  labels = DEFAULT_LABELS,
  locale = 'fr',
}: {
  prefill: CheckoutPrefill | null
  loggedIn: boolean
  labels?: CheckoutLabels
  locale?: 'fr' | 'nl'
}) {
  const formatPrice = makeFormatPrice(locale)
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

  // Promo-code state
  const [promoInput, setPromoInput] = useState('')
  const [promoApplied, setPromoApplied] = useState<
    | null
    | { code: string; discountCents: number; description: string | null }
  >(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoChecking, setPromoChecking] = useState(false)

  // Gift-card state — werkt op (subtotal + shipping − discount)
  const [giftInput, setGiftInput] = useState('')
  const [giftApplied, setGiftApplied] = useState<
    | null
    | { code: string; appliedCents: number; remainingAfter: number }
  >(null)
  const [giftError, setGiftError] = useState<string | null>(null)
  const [giftChecking, setGiftChecking] = useState(false)

  // Abandoned-cart capture — debounced wanneer email getypt is + items > 0
  const abandonedRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Capture abandoned-cart 5s na elke email-wijziging zodra valid +
  // items > 0. Server-side dedup voorkomt spam.
  useEffect(() => {
    if (abandonedRef.current) clearTimeout(abandonedRef.current)
    if (!hydrated || items.length === 0) return
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return
    abandonedRef.current = setTimeout(() => {
      void captureAbandonedCartAction({
        email: email.trim(),
        fullName: fullName.trim() || undefined,
        locale,
        items: items.map((i) => ({
          title: i.variantLabel ? `${i.title} — ${i.variantLabel}` : i.title,
          unit_price_cents: i.unitPriceCents,
          quantity: i.quantity,
        })),
        subtotalCents: cartSubtotal(items),
      }).catch(() => {})
    }, 5000)
    return () => {
      if (abandonedRef.current) clearTimeout(abandonedRef.current)
    }
  }, [email, fullName, hydrated, items])

  // Auto-apply BUNDLE3 wanneer ≥ 3 print-lijnen in de cart zitten en de
  // klant nog geen andere promo-code heeft ingegeven. Verwijderen
  // wanneer de drempel niet meer gehaald wordt en BUNDLE3 nog actief
  // was — voorkomt verkeerde korting als items uit de cart vliegen.
  useEffect(() => {
    if (!hydrated) return
    const printCount = items
      .filter((i) => i.kind === 'photo_print')
      .reduce((acc, i) => acc + i.quantity, 0)
    const subtotalNow = cartSubtotal(items)
    if (printCount >= 3) {
      if (promoApplied?.code === 'BUNDLE3') return
      if (promoApplied) return // klant heeft een eigen code, niet overschrijven
      void previewDiscount({ code: 'BUNDLE3', subtotalCents: subtotalNow }).then((r) => {
        if (r.ok) {
          setPromoApplied({
            code: 'BUNDLE3',
            discountCents: r.discountCents,
            description: r.description,
          })
        }
      })
    } else if (promoApplied?.code === 'BUNDLE3') {
      setPromoApplied(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, hydrated])

  async function applyGift() {
    setGiftError(null)
    if (!giftInput.trim()) return
    setGiftChecking(true)
    try {
      const totalSoFar = cartSubtotal(items) + (shipping?.cents ?? 0) - (promoApplied?.discountCents ?? 0)
      const r = await previewGiftCard({
        code: giftInput.trim(),
        totalCents: Math.max(0, totalSoFar),
      })
      if (r.ok) {
        setGiftApplied({
          code: giftInput.trim().toUpperCase(),
          appliedCents: r.appliedCents,
          remainingAfter: r.remainingAfter,
        })
        setGiftInput('')
      } else {
        setGiftError(r.reason)
      }
    } finally {
      setGiftChecking(false)
    }
  }
  function removeGift() {
    setGiftApplied(null)
    setGiftError(null)
  }

  async function applyPromo() {
    setPromoError(null)
    if (!promoInput.trim()) return
    setPromoChecking(true)
    try {
      const r = await previewDiscount({
        code: promoInput.trim(),
        subtotalCents: cartSubtotal(items),
      })
      if (r.ok) {
        setPromoApplied({
          code: promoInput.trim().toUpperCase(),
          discountCents: r.discountCents,
          description: r.description,
        })
        setPromoInput('')
      } else {
        setPromoError(r.reason)
      }
    } finally {
      setPromoChecking(false)
    }
  }

  function removePromo() {
    setPromoApplied(null)
    setPromoError(null)
  }

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
        <p className="text-stone-500">{labels.emptyCart}</p>
        <Link href="/shop/boutique" className="inline-block px-5 py-2.5 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded">
          {labels.backToBoutique}
        </Link>
      </div>
    )
  }

  if (result?.ok) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-8 text-center space-y-4">
        <p className="text-xs text-stone-500 uppercase tracking-widest">{labels.reference}</p>
        <p className="font-mono text-2xl">{result.reference}</p>
        <p className="text-stone-700">{labels.thanks}</p>
        {result.checkoutUrl ? (
          <a
            href={result.checkoutUrl}
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded transition-colors"
          >
            <Lock size={16} /> {labels.payNow}
          </a>
        ) : (
          <p className="text-sm text-stone-500 italic">
            {labels.payByEmail}
          </p>
        )}
        {loggedIn && (
          <p className="text-xs text-stone-500">
            <Link
              href={`/portail/commandes/${result.reference}`}
              className="text-stone-700 underline hover:text-stone-900"
            >
              {labels.goToOrder}
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
      locale,
      is_b2b: isB2B,
      company_name: isB2B ? company.trim() : null,
      vat_number: isB2B ? vat.trim() : null,
      discount_code: promoApplied?.code ?? null,
      gift_card_code: giftApplied?.code ?? null,
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
        setResult({ ok: false, msg: err instanceof Error ? err.message : labels.genericError })
      }
    })
  }

  const subtotal = cartSubtotal(items)
  const discount = promoApplied?.discountCents ?? 0
  const giftAmt = giftApplied?.appliedCents ?? 0
  const total = Math.max(0, subtotal + (shipping?.cents ?? 0) - discount - giftAmt)

  return (
    <form onSubmit={onSubmit} className="grid lg:grid-cols-[1fr_320px] gap-8">
      <div className="bg-white border border-stone-200 rounded p-6 space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500">{labels.coords}</h2>
        <Field label={`${labels.fullName} *`} name="full_name" value={fullName} onChange={setFullName} required autoComplete="name" />
        <Field label={`${labels.email} *`} name="email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
        <Field label={`${labels.phone} *`} name="phone" type="tel" value={phone} onChange={setPhone} required autoComplete="tel" />

        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500 pt-3">{labels.shipping}</h2>
        <Field label={`${labels.street} *`} name="street" value={street} onChange={setStreet} required autoComplete="address-line1" />
        <div className="grid grid-cols-3 gap-3">
          <Field label={`${labels.postal} *`} name="postal_code" value={postal} onChange={setPostal} required autoComplete="postal-code" />
          <div className="col-span-2">
            <Field label={`${labels.city} *`} name="city" value={city} onChange={setCity} required autoComplete="address-level2" />
          </div>
        </div>
        <label className="block">
          <span className="text-sm text-stone-700 mb-1 block">{labels.country} *</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
            className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
          >
            <option value="BE">{labels.countryFr.BE}</option>
            <option value="FR">{labels.countryFr.FR}</option>
            <option value="NL">{labels.countryFr.NL}</option>
            <option value="LU">{labels.countryFr.LU}</option>
            <option value="DE">{labels.countryFr.DE}</option>
            <option value="OTHER">{labels.countryFr.OTHER}</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-stone-700 mb-1 block">{labels.notes}</span>
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
                {labels.b2bToggle}
              </span>
              <span className="block text-xs text-stone-500 mt-0.5">
                {labels.b2bHint}
              </span>
            </span>
          </label>

          {isB2B && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label={`${labels.company} *`}
                name="company_name"
                value={company}
                onChange={setCompany}
                required
                autoComplete="organization"
              />
              <div>
                <label className="block">
                  <span className="text-sm text-stone-700 mb-1 block">{labels.vat} *</span>
                  <input
                    type="text"
                    value={vat}
                    onChange={(e) => setVat(e.target.value)}
                    placeholder="BE0123456789"
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm font-mono"
                  />
                </label>
                <ViesLine state={vies} labels={labels} />
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

      <aside className="bg-white border border-stone-200 rounded p-5 h-fit lg:sticky lg:top-24 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500">{labels.summary}</h2>
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
            <span className="text-stone-500">{labels.subtotal}</span>
            <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500 flex items-center gap-1">
              <Truck size={11} /> {labels.delivery}
              {shipping?.zoneName && <span className="text-[10px]">({shipping.zoneName})</span>}
            </span>
            <span className="font-medium tabular-nums">
              {shipping
                ? shipping.cents === 0
                  ? <em className="text-green-700 not-italic">{labels.free}</em>
                  : formatPrice(shipping.cents)
                : '—'}
            </span>
          </div>
          {shipping?.freeAbove != null && shipping.cents > 0 && subtotal < shipping.freeAbove && (
            <p className="text-[11px] text-stone-500 pt-0.5">
              {labels.freeShippingHint.replace('{{amount}}', formatPrice(shipping.freeAbove - subtotal))}
            </p>
          )}

          {/* Promo-code */}
          <div className="pt-3 border-t border-stone-200 mt-2 space-y-2">
            {promoApplied ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-xs">
                <span className="inline-flex items-center gap-1.5 text-emerald-900 font-medium">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span className="font-mono">{promoApplied.code}</span>
                  <span className="text-emerald-700">−{formatPrice(promoApplied.discountCents)}</span>
                </span>
                <button
                  type="button"
                  onClick={removePromo}
                  aria-label={labels.removeCode}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value); setPromoError(null) }}
                    placeholder={labels.promoPlaceholder}
                    className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded text-xs font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={applyPromo}
                    disabled={promoChecking || !promoInput.trim()}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 text-xs uppercase tracking-widest rounded"
                  >
                    <Tag className="w-3 h-3" />
                    OK
                  </button>
                </div>
                {promoError && (
                  <p className="text-[11px] text-amber-700">{promoError}</p>
                )}
              </>
            )}
            {promoApplied && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">{labels.codePrefix} {promoApplied.code}</span>
                <span className="font-medium tabular-nums text-emerald-700">
                  −{formatPrice(discount)}
                </span>
              </div>
            )}
          </div>

          {/* Gift-card */}
          <div className="pt-2 space-y-2">
            {giftApplied ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-(--color-bronze)/10 border border-(--color-bronze)/30 rounded text-xs">
                <span className="inline-flex items-center gap-1.5 text-(--color-ink) font-medium">
                  <Gift className="w-3.5 h-3.5 text-(--color-bronze)" />
                  <span className="font-mono">{giftApplied.code}</span>
                  <span className="text-(--color-bronze)">−{formatPrice(giftAmt)}</span>
                </span>
                <button
                  type="button"
                  onClick={removeGift}
                  aria-label={labels.removeCard}
                  className="text-(--color-stone) hover:text-(--color-ink)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={giftInput}
                    onChange={(e) => { setGiftInput(e.target.value); setGiftError(null) }}
                    placeholder={labels.giftPlaceholder}
                    className="flex-1 min-w-0 px-3 py-2 bg-white border border-stone-300 rounded text-xs font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={applyGift}
                    disabled={giftChecking || !giftInput.trim()}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) disabled:opacity-50 text-xs uppercase tracking-widest rounded"
                  >
                    <Gift className="w-3 h-3" />
                    OK
                  </button>
                </div>
                {giftError && (
                  <p className="text-[11px] text-amber-700">{giftError}</p>
                )}
              </>
            )}
            {giftApplied && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">{labels.giftCard}</span>
                <span className="font-medium tabular-nums text-(--color-bronze)">
                  −{formatPrice(giftAmt)}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2 border-t border-stone-200 mt-2">
            <span className="text-sm uppercase tracking-widest text-stone-500">{labels.total}</span>
            <span className="text-2xl font-semibold tabular-nums">{formatPrice(total)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 text-sm rounded transition-colors"
        >
          <Lock size={16} />
          {isPending ? labels.submitting : labels.submit}
        </button>
        <p className="text-[11px] text-stone-400 text-center">
          {labels.paymentSecure}
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

function ViesLine({ state, labels }: { state: ViesState; labels: CheckoutLabels }) {
  if (state.status === 'idle') return null
  if (state.status === 'checking') {
    return (
      <p className="mt-1.5 text-xs text-stone-500 inline-flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" />
        {labels.viesChecking}
      </p>
    )
  }
  if (state.status === 'ok') {
    return (
      <p className="mt-1.5 text-xs text-emerald-700 inline-flex items-center gap-1.5">
        <BadgeCheck className="w-3.5 h-3.5" />
        {labels.viesValid}
        {state.name && <span className="text-stone-500"> — {state.name}</span>}
      </p>
    )
  }
  if (state.status === 'invalid') {
    return (
      <p className="mt-1.5 text-xs text-red-700 inline-flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" />
        {labels.viesInvalid} ({state.reason})
      </p>
    )
  }
  return (
    <p className="mt-1.5 text-xs text-amber-700 inline-flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5" />
      {labels.viesUnavailable}
    </p>
  )
}
