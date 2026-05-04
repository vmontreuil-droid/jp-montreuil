'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { savePricing, type PricingState } from './actions'

const initial: PricingState = { status: 'idle' }

type Defaults = {
  format_40x60: number
  format_57x77: number
  format_60x90: number
  format_130x160: number
  frame_simple: number
  frame_standard: number
  frame_travaille: number
  frame_sur_mesure: number | null
  supplement_background: number
  supplement_complex_decor: number
  supplement_high_detail: number
  supplement_hyperrealism: number
  supplement_rush: number
  extra_portrait: number
}

type Props = {
  defaults: Defaults
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-[0.2em] disabled:opacity-50"
    >
      <Save className="w-4 h-4" />
      {pending ? 'Enregistrement…' : 'Enregistrer'}
    </button>
  )
}

function PriceField({
  name,
  label,
  defaultValue,
  required = true,
  hint,
}: {
  name: string
  label: string
  defaultValue: number | null
  required?: boolean
  hint?: string
}) {
  return (
    <div className="grid grid-cols-2 gap-3 items-center">
      <div>
        <p className="text-sm text-(--color-ink)">{label}</p>
        {hint && <p className="text-[10px] text-(--color-stone) mt-0.5">{hint}</p>}
      </div>
      <div className="relative">
        <input
          type="number"
          name={name}
          min="0"
          step="0.01"
          required={required}
          defaultValue={defaultValue ?? ''}
          placeholder={required ? '0' : 'Sur devis'}
          className="w-full px-4 py-2 pr-10 input-elev bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) text-right tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-stone) text-sm">
          €
        </span>
      </div>
    </div>
  )
}

export default function PricingForm({ defaults }: Props) {
  const [state, action] = useActionState(savePricing, initial)

  return (
    <form action={action} className="space-y-8">
      {/* Section 1: Prix de base par format */}
      <section className="border border-(--color-frame) bg-(--color-paper) p-6 space-y-3">
        <header className="mb-3">
          <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)]">
            1. Prix de base par format
          </h2>
          <p className="text-xs text-(--color-stone) mt-1">
            Œuvre sans cadre, 1 portrait, fond simple. Identique pour les 3 techniques.
          </p>
        </header>
        <PriceField name="format_40x60" label="40 × 60 cm" defaultValue={defaults.format_40x60} />
        <PriceField name="format_57x77" label="57 × 77 cm" defaultValue={defaults.format_57x77} />
        <PriceField name="format_60x90" label="60 × 90 cm" defaultValue={defaults.format_60x90} />
        <PriceField
          name="format_130x160"
          label="130 × 160 cm"
          defaultValue={defaults.format_130x160}
        />
      </section>

      {/* Section 2: Cadres */}
      <section className="border border-(--color-frame) bg-(--color-paper) p-6 space-y-3">
        <header className="mb-3">
          <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)]">
            2. Suppléments cadre
          </h2>
          <p className="text-xs text-(--color-stone) mt-1">
            Quel que soit le format de l'œuvre.
          </p>
        </header>
        <PriceField
          name="frame_simple"
          label="Cadre simple (bois naturel)"
          defaultValue={defaults.frame_simple}
        />
        <PriceField
          name="frame_standard"
          label="Cadre standard (peint / coloré)"
          defaultValue={defaults.frame_standard}
        />
        <PriceField
          name="frame_travaille"
          label="Cadre travaillé (moulures, dorures…)"
          defaultValue={defaults.frame_travaille}
        />
        <PriceField
          name="frame_sur_mesure"
          label="Cadre sur mesure"
          defaultValue={defaults.frame_sur_mesure}
          required={false}
          hint="Laissez vide pour afficher « sur devis » au client."
        />
      </section>

      {/* Section 3: Suppléments options */}
      <section className="border border-(--color-frame) bg-(--color-paper) p-6 space-y-3">
        <header className="mb-3">
          <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)]">
            3. Suppléments options
          </h2>
          <p className="text-xs text-(--color-stone) mt-1">
            Quel que soit le format de l'œuvre.
          </p>
        </header>
        <PriceField
          name="supplement_background"
          label="Arrière-plan travaillé (paysage, intérieur…)"
          defaultValue={defaults.supplement_background}
        />
        <PriceField
          name="supplement_complex_decor"
          label="Décor complexe"
          defaultValue={defaults.supplement_complex_decor}
        />
        <PriceField
          name="supplement_high_detail"
          label="Niveau de détail élevé"
          defaultValue={defaults.supplement_high_detail}
        />
        <PriceField
          name="supplement_hyperrealism"
          label="Hyper-réalisme"
          defaultValue={defaults.supplement_hyperrealism}
        />
        <PriceField
          name="supplement_rush"
          label="Délai express"
          defaultValue={defaults.supplement_rush}
        />
      </section>

      {/* Section 4: Portrait supplémentaire */}
      <section className="border border-(--color-frame) bg-(--color-paper) p-6 space-y-3">
        <header className="mb-3">
          <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)]">
            4. Portrait supplémentaire
          </h2>
          <p className="text-xs text-(--color-stone) mt-1">
            Quel que soit le format de l'œuvre.
          </p>
        </header>
        <PriceField
          name="extra_portrait"
          label="Par portrait en plus sur la même œuvre"
          defaultValue={defaults.extra_portrait}
        />
      </section>

      {state.status === 'error' && (
        <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-900 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{state.message}</p>
        </div>
      )}

      {state.status === 'success' && (
        <div className="flex items-start gap-2 p-3 bg-emerald-950/40 border border-emerald-900 text-emerald-200 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Tarifs enregistrés.</p>
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  )
}
