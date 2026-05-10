'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { generateShopPhotoAltText } from '../actions'

/**
 * Trigger Claude Vision om alt-text te genereren voor deze foto.
 * Result wordt direct in DB gezet — page-reload haalt nieuwe waarde op.
 */
export default function GenerateAltButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    setError(null)
    startTransition(async () => {
      const r = await generateShopPhotoAltText(id)
      if (!r.ok) {
        setError(r.error)
      } else {
        // Reload zodat het nieuwe alt-text in het input-veld staat
        window.location.reload()
      }
    })
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && (
        <span className="text-[11px] text-amber-700 inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-[11px] uppercase tracking-widest disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        {pending ? 'Génération…' : 'Générer alt-text (IA)'}
      </button>
    </span>
  )
}
