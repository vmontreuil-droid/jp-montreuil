'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { importWorksAction } from './actions'
import type { ImportWorksReport } from '@/lib/shop/import-works'

/**
 * "Importer œuvres" knop — kopieert public.works (excl. bronze) naar
 * shop.photos. Idempotent: herhaling voegt enkel nieuwe rijen toe.
 */
export default function ImportWorksButton() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ImportWorksReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    if (!confirm('Importer toutes les œuvres du portfolio (sauf bronze) dans la boutique ?')) return
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const r = await importWorksAction()
        setResult(r)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur')
      }
    })
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-(--color-paper) border border-(--color-bronze) text-(--color-bronze) hover:bg-(--color-bronze) hover:text-white text-xs uppercase tracking-[0.2em] disabled:opacity-50 transition-colors"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {pending ? 'Import…' : 'Importer œuvres'}
      </button>
      {result && (
        <div className="text-[11px] text-(--color-charcoal) inline-flex items-start gap-1.5 max-w-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 mt-0.5 shrink-0" />
          <span>
            <strong className="text-emerald-700">{result.inserted}</strong> ajoutées,{' '}
            {result.skipped} déjà présentes
            {Object.keys(result.byCategory).length > 0 && (
              <>
                {' · '}
                {Object.entries(result.byCategory)
                  .map(([slug, n]) => `${slug}: ${n}`)
                  .join(', ')}
              </>
            )}
          </span>
        </div>
      )}
      {error && (
        <p className="text-[11px] text-amber-700 inline-flex items-start gap-1.5 max-w-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
