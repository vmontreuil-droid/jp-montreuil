'use client'

import { useState, useTransition } from 'react'
import { CalendarCheck, Loader2, MapPin } from 'lucide-react'
import { proposeDeliveryByClient } from '@/app/admin/(authed)/commissions/actions'

type Props = {
  id: string
  isFR: boolean
  defaultAddress?: string | null
}

const ALT_OPTIONS = [
  { id: 'home', fr: 'Présent à domicile', nl: 'Aanwezig thuis' },
  { id: 'neighbours', fr: 'Remettre aux voisins', nl: 'Bij de buren afgeven' },
  { id: 'door', fr: 'Déposer à la porte', nl: 'Aan de deur leggen' },
  { id: 'safe_place', fr: 'Endroit sûr (à préciser)', nl: 'Veilige plek (preciseren)' },
  { id: 'other', fr: 'Autre (à préciser)', nl: 'Andere (preciseren)' },
] as const

export default function DeliveryForm({ id, isFR, defaultAddress }: Props) {
  const [pending, startTransition] = useTransition()
  const [altOption, setAltOption] = useState<string>('home')
  const showSpecs = altOption === 'safe_place' || altOption === 'other' || altOption === 'neighbours'

  const onSubmit = (formData: FormData) => {
    startTransition(() => {
      void proposeDeliveryByClient(formData)
    })
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="id" value={id} />

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 inline-flex items-center gap-2">
          <CalendarCheck className="w-3.5 h-3.5" />
          {isFR ? 'Date & heure souhaitées' : 'Gewenste datum & uur'} <span className="text-(--color-bronze)">*</span>
        </label>
        <input
          type="datetime-local"
          name="proposed_date"
          required
          className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 inline-flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5" />
          {isFR ? 'Adresse de livraison' : 'Leveringsadres'} <span className="text-(--color-bronze)">*</span>
        </label>
        <textarea
          name="delivery_address"
          rows={3}
          required
          defaultValue={defaultAddress || ''}
          placeholder={
            isFR
              ? 'Rue + numéro\nCode postal Ville\nPays'
              : 'Straat + huisnummer\nPostcode Gemeente\nLand'
          }
          className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {isFR ? 'En cas d’absence' : 'Bij afwezigheid'}
        </label>
        <div className="space-y-2">
          {ALT_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-center gap-3 cursor-pointer px-4 py-2.5 border transition-colors ${
                altOption === opt.id
                  ? 'border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-ink)'
                  : 'border-(--color-frame) bg-(--color-paper) text-(--color-charcoal) hover:border-(--color-stone)'
              }`}
            >
              <input
                type="radio"
                name="delivery_alt_option"
                value={opt.id}
                checked={altOption === opt.id}
                onChange={() => setAltOption(opt.id)}
                className="w-4 h-4 accent-(--color-bronze)"
              />
              <span className="text-sm">{isFR ? opt.fr : opt.nl}</span>
            </label>
          ))}
        </div>
        {showSpecs && (
          <textarea
            name="delivery_alt_specs"
            rows={2}
            placeholder={
              isFR
                ? 'Précisez (ex. nom du voisin, emplacement de la cachette, code…)'
                : 'Preciseer (bv. naam van de buur, schuilplek, code…)'
            }
            className="mt-2 w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
          />
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CalendarCheck className="w-4 h-4" />
        )}
        {isFR ? 'Proposer cette date' : 'Voorstel indienen'}
      </button>
    </form>
  )
}
