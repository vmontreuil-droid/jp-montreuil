'use client'

import { useState, useTransition } from 'react'
import { Star, Check, Loader2 } from 'lucide-react'
import { submitReview } from '@/app/shop/boutique/photo/[slug]/review-actions'

/**
 * Compact "snel een ster geven"-widget voor de fotodetail-pagina.
 * Geen body of email vereist — enkel 5 sterren-keuze + naam. Klant
 * kan in 2 kliks een review geven; uitgebreide tekst kan via de
 * volledige ReviewsSection onderaan.
 *
 * UX-flow:
 *   1. 5 sterren zichtbaar — klik op ster N → naam-input verschijnt
 *   2. Naam invullen + Enter / "Versturen" → submit
 *   3. Bevestigingstoast "Bedankt — Jean-Pierre leest uw beoordeling"
 *
 * Submit valt door naar pending status (admin modereert).
 */
export function QuickStarRating({
  photoId,
  labels,
}: {
  photoId: string
  labels: {
    eyebrow: string         // "Snel beoordelen" / "Notation rapide"
    yourName: string        // "Uw naam" / "Votre prénom"
    submit: string          // "Versturen" / "Envoyer"
    sending: string         // "Verzenden..." / "Envoi..."
    thanks: string          // "Bedankt!" / "Merci !"
    tooShort: string        // "Naam vereist" / "Nom requis"
    leaveDetail: string     // "Ook iets schrijven?" / "Vous voulez en dire plus ?"
    leaveDetailLink: string // "Volledige beoordeling →" / "Avis complet →"
  }
}) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [name, setName] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function trySubmit(finalRating: number) {
    setError(null)
    if (!name.trim()) {
      setError(labels.tooShort)
      return
    }
    startTransition(async () => {
      const r = await submitReview({
        photoId,
        name: name.trim(),
        email: null,
        rating: finalRating,
        title: null,
        body: null, // expliciet leeg — quick mode
      })
      if (r.ok) setDone(true)
      else setError(r.error)
    })
  }

  if (done) {
    return (
      <div className="mb-5 inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900">
        <Check className="w-3.5 h-3.5" />
        {labels.thanks}
      </div>
    )
  }

  return (
    <div className="mb-5 bg-(--color-paper)/60 border border-(--color-frame) rounded p-3.5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-(--color-stone) mb-2 inline-flex items-center gap-1.5">
        <Star className="w-3 h-3 text-(--color-bronze) fill-(--color-bronze)" />
        {labels.eyebrow}
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        {/* 5 sterren */}
        <div className="inline-flex items-center gap-0.5" role="radiogroup" aria-label={labels.eyebrow}>
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n} / 5`}
                aria-checked={rating === n}
                role="radio"
                className="p-0.5"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    active
                      ? 'text-(--color-bronze) fill-(--color-bronze)'
                      : 'text-(--color-frame) hover:text-(--color-bronze)/60'
                  }`}
                  strokeWidth={1.4}
                />
              </button>
            )
          })}
        </div>

        {/* Naam-input verschijnt na rating-keuze */}
        {rating > 0 && (
          <form
            className="flex items-center gap-2 flex-1 min-w-0"
            onSubmit={(e) => {
              e.preventDefault()
              trySubmit(rating)
            }}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null) }}
              placeholder={labels.yourName}
              maxLength={80}
              autoComplete="given-name"
              className="flex-1 min-w-0 px-2.5 py-1.5 text-sm bg-(--color-canvas) border border-(--color-frame) rounded focus:outline-none focus:border-(--color-bronze)"
            />
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs uppercase tracking-widest rounded transition-colors"
            >
              {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {pending ? labels.sending : labels.submit}
            </button>
          </form>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs text-amber-700">{error}</p>
      )}
      {rating > 0 && !done && (
        <p className="mt-2 text-[11px] text-(--color-stone)">
          {labels.leaveDetail}{' '}
          <a href="#reviews" className="text-(--color-bronze) hover:underline">
            {labels.leaveDetailLink}
          </a>
        </p>
      )}
    </div>
  )
}
