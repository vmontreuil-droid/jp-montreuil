'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, AlertCircle } from 'lucide-react'
import { createAboutSection } from './actions'

export default function NewAboutForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(() => {
      void (async () => {
        const r = await createAboutSection(fd)
        if (r && 'error' in r) {
          setError(r.error === 'title_required' ? 'Titre obligatoire' : `Erreur: ${r.error}`)
        }
      })()
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label
          htmlFor="new-title-fr"
          className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1"
        >
          Titre FR *
        </label>
        <input
          id="new-title-fr"
          name="title_fr"
          type="text"
          required
          placeholder="Mon parcours"
          className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </div>
      <div>
        <label
          htmlFor="new-title-nl"
          className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1"
        >
          Titel NL
        </label>
        <input
          id="new-title-nl"
          name="title_nl"
          type="text"
          placeholder="Mijn parcours"
          className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </div>

      {error && (
        <p className="md:col-span-2 inline-flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.15em] disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Créer la section
        </button>
      </div>
    </form>
  )
}
