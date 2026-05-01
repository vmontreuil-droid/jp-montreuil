'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Save, Loader2 } from 'lucide-react'
import TranslateButton from '@/components/admin/TranslateButton'
import { createCategory } from './actions'

export default function NewCategoryButton() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [labelFr, setLabelFr] = useState('')
  const [labelNl, setLabelNl] = useState('')

  function reset() {
    setLabelFr('')
    setLabelNl('')
    setError(null)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('label_fr', labelFr)
    fd.set('label_nl', labelNl)
    startTransition(() => {
      void (async () => {
        const r = await createCategory(fd)
        if (!r.ok) {
          setError(r.error ?? 'Erreur')
        } else {
          reset()
          setOpen(false)
        }
      })()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.15em]"
      >
        <Plus className="w-4 h-4" />
        Nouvelle catégorie
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-(--color-paper) border border-(--color-frame) p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink)">
            Nouvelle catégorie
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="p-1 text-(--color-stone) hover:text-(--color-ink)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
              Label FR *
            </label>
            <TranslateButton
              getSource={() => labelNl}
              from="nl"
              to="fr"
              onTranslated={setLabelFr}
            />
          </div>
          <input
            value={labelFr}
            onChange={(e) => setLabelFr(e.target.value)}
            required
            className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
              Label NL *
            </label>
            <TranslateButton
              getSource={() => labelFr}
              from="fr"
              to="nl"
              onTranslated={setLabelNl}
            />
          </div>
          <input
            value={labelNl}
            onChange={(e) => setLabelNl(e.target.value)}
            required
            className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
            Slug URL
            <span className="ml-2 normal-case tracking-normal opacity-70">
              (optionnel — auto-généré si vide)
            </span>
          </label>
          <input
            name="slug"
            placeholder="bv. paysages"
            pattern="[a-z0-9-]+"
            className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) font-mono text-sm"
          />
          <p className="mt-1 text-xs text-(--color-stone)">
            URL: /galerie/<span className="text-(--color-bronze)">slug</span>
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-300 bg-red-950/40 border border-red-900 px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.15em] disabled:opacity-50"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Créer
        </button>
      </form>
    </div>
  )
}
