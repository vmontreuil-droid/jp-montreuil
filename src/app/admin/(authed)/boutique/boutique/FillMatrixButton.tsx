'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { fillMissingPrices } from './actions'

/**
 * "Compléter la matrice" — vult alle ontbrekende prijs-cellen met een
 * basis-prijs (per medium) × size-multiplier. Idempotent: bestaande
 * cellen worden NIET overschreven. Met 1 click krijgt elk medium alle
 * size-formaten beschikbaar.
 */
export default function FillMatrixButton() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    if (!confirm('Compléter automatiquement les cellules vides de la matrice ?')) return
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const r = await fillMissingPrices()
        setResult(r)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-2 px-3 py-2 bg-(--color-paper) border border-(--color-bronze) text-(--color-bronze) hover:bg-(--color-bronze) hover:text-white text-xs uppercase tracking-[0.15em] disabled:opacity-50 transition-colors"
      >
        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {pending ? 'Remplissage…' : 'Compléter la matrice'}
      </button>
      {result && (
        <p className="text-[11px] text-emerald-700 inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {result.added} cellules ajoutées · {result.skipped} déjà présentes
        </p>
      )}
      {error && (
        <p className="text-[11px] text-amber-700 inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}
