'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Edit3, Loader2 } from 'lucide-react'

type Mode = 'ai' | 'manual'

/**
 * Wizard om nieuwe post te starten:
 *  - "AI": JP geeft sujet + 3-5 mots-clés → Claude maakt draft → editor
 *  - "Manuel": gewoon een lege post met titel → editor
 */
export default function NewPostForm({
  action,
}: {
  action: (form: FormData) => Promise<void>
}) {
  const [mode, setMode] = useState<Mode>('ai')
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('mode', mode)
    startTransition(async () => {
      await action(fd)
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Mode-tabs */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('ai')}
          className={`p-4 border text-left transition-colors ${
            mode === 'ai'
              ? 'border-(--color-bronze) bg-(--color-bronze)/5'
              : 'border-(--color-frame) hover:border-(--color-bronze)'
          }`}
        >
          <div className="inline-flex items-center gap-2 mb-1 text-(--color-bronze)">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-medium">Draft IA</span>
          </div>
          <p className="text-sm text-(--color-charcoal)">
            Claude rédige une première version FR + NL en ~10s.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`p-4 border text-left transition-colors ${
            mode === 'manual'
              ? 'border-(--color-bronze) bg-(--color-bronze)/5'
              : 'border-(--color-frame) hover:border-(--color-bronze)'
          }`}
        >
          <div className="inline-flex items-center gap-2 mb-1 text-(--color-stone)">
            <Edit3 className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-medium">Page blanche</span>
          </div>
          <p className="text-sm text-(--color-charcoal)">
            Vous écrivez tout vous-même.
          </p>
        </button>
      </div>

      {mode === 'ai' ? (
        <div className="space-y-4 bg-(--color-paper) border border-(--color-frame) p-5">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">
              Sujet de l&apos;article *
            </span>
            <input
              name="topic"
              type="text"
              required
              placeholder="Ex : Comment je peins un portrait de cheval — étape par étape"
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">
              Mots-clés (séparés par des virgules) *
            </span>
            <input
              name="keywords"
              type="text"
              required
              placeholder="cheval, portrait, aquarelle, anatomie, regard"
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
            <span className="text-[11px] text-(--color-stone)/80 mt-1 block">
              Ces mots seront incorporés naturellement et boosteront le SEO.
            </span>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">
              Notes pour Claude (optionnel)
            </span>
            <textarea
              name="notes"
              rows={3}
              placeholder="Ex : ton intime, raconter mon premier portrait commandé en 1995, mentionner mon atelier d'Anzegem"
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4 bg-(--color-paper) border border-(--color-frame) p-5">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">
              Titre français *
            </span>
            <input
              name="title_fr"
              type="text"
              required
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">
              Titel Nederlands
            </span>
            <input
              name="title_nl"
              type="text"
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </label>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-6 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {mode === 'ai' ? 'Claude rédige…' : 'Création…'}
            </>
          ) : (
            <>
              {mode === 'ai' ? <Sparkles className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {mode === 'ai' ? 'Générer le draft' : 'Créer et éditer'}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
