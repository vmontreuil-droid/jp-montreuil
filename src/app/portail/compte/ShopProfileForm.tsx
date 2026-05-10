'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Building2, Save, CheckCircle2, AlertCircle, Loader2, BadgeCheck } from 'lucide-react'
import type { Dictionary } from '@/i18n/dictionaries'
import { saveShopProfile } from './actions'

type Initial = {
  full_name: string
  phone: string
  street: string
  postal_code: string
  city: string
  country: string
  is_b2b: boolean
  company: string
  vat_number: string
  vat_validated_at: string | null
  vat_company_name: string | null
}

type Props = {
  t: Dictionary['portail']['shopProfile']
  initial: Initial
}

type ViesState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; name: string | null; address: string | null }
  | { status: 'invalid'; reason: string }
  | { status: 'unavailable'; reason: string }

export default function ShopProfileForm({ t, initial }: Props) {
  const [fullName, setFullName] = useState(initial.full_name)
  const [phone, setPhone] = useState(initial.phone)
  const [street, setStreet] = useState(initial.street)
  const [postal, setPostal] = useState(initial.postal_code)
  const [city, setCity] = useState(initial.city)
  const [country, setCountry] = useState(initial.country || 'BE')
  const [isB2B, setIsB2B] = useState(initial.is_b2b)
  const [company, setCompany] = useState(initial.company)
  const [vat, setVat] = useState(initial.vat_number)
  const [vies, setVies] = useState<ViesState>({ status: 'idle' })
  const [pending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Live VIES-check terwijl gebruiker typt — debounced 600ms.
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
        setVies({ status: 'ok', name: json.name ?? null, address: json.address ?? null })
        if (json.name && !company) setCompany(json.name)
      } else if (json.unavailable) {
        setVies({ status: 'unavailable', reason: json.reason ?? 'VIES indisponible' })
      } else {
        setVies({ status: 'invalid', reason: json.reason ?? 'Invalide' })
      }
    } catch {
      setVies({ status: 'unavailable', reason: 'Network' })
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSavedAt(null)
    startTransition(async () => {
      const r = await saveShopProfile({
        full_name: fullName,
        phone,
        street,
        postal_code: postal,
        city,
        country,
        is_b2b: isB2B,
        company,
        vat_number: isB2B ? vat : '',
        vies_validated:
          isB2B && vies.status === 'ok'
            ? { name: vies.name, address: vies.address }
            : null,
      })
      if (r.ok) {
        setSavedAt(Date.now())
      } else {
        setError(r.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="bg-(--color-paper) border border-(--color-frame) p-6 md:p-8 space-y-4">
      <Field label={t.fullNameLabel} value={fullName} onChange={setFullName} autoComplete="name" />
      <Field label={t.phoneLabel} value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
      <Field label={t.streetLabel} value={street} onChange={setStreet} autoComplete="address-line1" />
      <div className="grid grid-cols-3 gap-3">
        <Field label={t.postalLabel} value={postal} onChange={setPostal} autoComplete="postal-code" />
        <div className="col-span-2">
          <Field label={t.cityLabel} value={city} onChange={setCity} autoComplete="address-level2" />
        </div>
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 block">{t.countryLabel}</span>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        >
          <option value="BE">Belgique</option>
          <option value="FR">France</option>
          <option value="NL">Pays-Bas</option>
          <option value="LU">Luxembourg</option>
          <option value="DE">Allemagne</option>
          <option value="OTHER">Autre / International</option>
        </select>
      </label>

      <div className="border-t border-(--color-frame) pt-4 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isB2B}
            onChange={(e) => setIsB2B(e.target.checked)}
            className="mt-1 w-4 h-4 accent-(--color-bronze)"
          />
          <span>
            <span className="block text-sm font-medium text-(--color-ink) inline-flex items-center gap-2">
              <Building2 className="w-4 h-4 text-(--color-bronze)" />
              {t.b2bToggle}
            </span>
            <span className="block text-xs text-(--color-stone) mt-1">{t.b2bHint}</span>
          </span>
        </label>

        {isB2B && (
          <>
            <Field label={t.companyLabel} value={company} onChange={setCompany} autoComplete="organization" />
            <div>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 block">{t.vatLabel}</span>
                <input
                  type="text"
                  value={vat}
                  onChange={(e) => setVat(e.target.value)}
                  placeholder="BE0123456789"
                  className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm font-mono focus:border-(--color-bronze) focus:outline-none"
                />
              </label>
              <ViesLine state={vies} t={t} />
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="inline-flex items-start gap-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {savedAt && (
        <p className="inline-flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t.saved}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {pending ? t.saving : t.saveBtn}
      </button>
    </form>
  )
}

function Field({
  label, value, onChange, type = 'text', autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
      />
    </label>
  )
}

function ViesLine({ state, t }: { state: ViesState; t: Props['t'] }) {
  if (state.status === 'idle') return null
  if (state.status === 'checking') {
    return (
      <p className="mt-2 text-xs text-(--color-stone) inline-flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" />
        {t.vatChecking}
      </p>
    )
  }
  if (state.status === 'ok') {
    return (
      <p className="mt-2 text-xs text-emerald-700 inline-flex items-center gap-1.5">
        <BadgeCheck className="w-3.5 h-3.5" />
        {t.vatValid}
        {state.name && <span className="text-(--color-stone)"> — {state.name}</span>}
      </p>
    )
  }
  if (state.status === 'invalid') {
    return (
      <p className="mt-2 text-xs text-red-700 inline-flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" />
        {t.vatInvalid} ({state.reason})
      </p>
    )
  }
  return (
    <p className="mt-2 text-xs text-amber-700 inline-flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5" />
      {t.vatUnavailable}
    </p>
  )
}
