'use client'

import { useState } from 'react'
import { Languages, Loader2, AlertCircle } from 'lucide-react'

type Lang = 'fr' | 'nl'

type Props = {
  /** Lees-hier-vandaan-input (bron-tekst) */
  getSource: () => string
  /** Bron-taal */
  from: Lang
  /** Doel-taal */
  to: Lang
  /** Callback met vertaalde tekst */
  onTranslated: (translated: string) => void
  /** Optioneel custom label; default = "FR → NL" of omgekeerd */
  label?: string
  className?: string
}

export default function TranslateButton({
  getSource,
  from,
  to,
  onTranslated,
  label,
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function translate() {
    const text = getSource().trim()
    if (!text) {
      setError(from === 'fr' ? 'Champ FR vide' : 'NL veld leeg')
      setTimeout(() => setError(null), 2000)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, from, to }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 503) {
          setError('Vertalen niet geconfigureerd (API-sleutel ontbreekt)')
        } else if (res.status === 429) {
          setError('Rate limit — probeer opnieuw')
        } else {
          setError(`Erreur (${res.status}): ${data.error ?? 'unknown'}`)
        }
        return
      }
      const data = (await res.json()) as { translation: string }
      onTranslated(data.translation)
    } catch (err) {
      setError(`Fout: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={translate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] border border-(--color-frame) text-(--color-stone) hover:text-(--color-bronze) hover:border-(--color-bronze) transition-colors disabled:opacity-50"
        title={`Traduire ${from.toUpperCase()} → ${to.toUpperCase()}`}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Languages className="w-3 h-3" />
        )}
        {label ?? `${from.toUpperCase()} → ${to.toUpperCase()}`}
      </button>
      {error && (
        <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-red-300">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}
