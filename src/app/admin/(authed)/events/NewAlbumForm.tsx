'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, AlertCircle } from 'lucide-react'
import { createAlbum } from './actions'

export default function NewAlbumForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(() => {
      void (async () => {
        const r = await createAlbum(fd)
        if (r && 'error' in r) {
          if (r.error === 'title_required') setError('Titre obligatoire')
          else setError(`Erreur: ${r.error}`)
        }
      })()
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="md:col-span-2">
        <label htmlFor="title" className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1">
          Titre de l&apos;évènement *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="Mariage Dupont — 12 mai 2026"
          className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="client_name" className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1">
          Nom du client
        </label>
        <input
          id="client_name"
          name="client_name"
          type="text"
          placeholder="Jean Dupont"
          className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="client_email" className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1">
          E-mail du client
        </label>
        <input
          id="client_email"
          name="client_email"
          type="email"
          placeholder="jean.dupont@example.com"
          className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="event_date" className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1">
          Date de l&apos;évènement
        </label>
        <input
          id="event_date"
          name="event_date"
          type="date"
          className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </div>
      <div className="md:col-span-2">
        <span className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1">
          Langue du client
        </span>
        <div className="flex gap-2 max-w-md">
          {(['fr', 'nl'] as const).map((loc, i) => (
            <label
              key={loc}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-(--color-frame) bg-(--color-canvas) text-xs uppercase tracking-[0.15em] text-(--color-charcoal) cursor-pointer has-[:checked]:border-(--color-bronze) has-[:checked]:text-(--color-ink)"
            >
              <input
                type="radio"
                name="client_locale"
                value={loc}
                defaultChecked={i === 0}
                className="sr-only"
              />
              {loc === 'fr' ? 'Français' : 'Nederlands'}
            </label>
          ))}
        </div>
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
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Créer l&apos;album
        </button>
      </div>
    </form>
  )
}
