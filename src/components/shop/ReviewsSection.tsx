'use client'

import { useState, useTransition } from 'react'
import { Star, BadgeCheck, MessageSquare, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { submitReview } from '@/app/shop/boutique/photo/[slug]/review-actions'
import type { ShopReview, ReviewAggregate } from '@/lib/shop/reviews'

type Props = {
  photoId: string
  reviews: ShopReview[]
  aggregate: ReviewAggregate
}

const dateFmt = new Intl.DateTimeFormat('fr-BE', { year: 'numeric', month: 'long' })

/**
 * Reviews-blok onder een foto-detail. Toont gemiddelde + verdeling +
 * lijst van approved reviews + form voor nieuwe submission. Form gaat
 * naar 'pending' status — admin (Vincent) modereert via /admin/boutique/reviews.
 */
export default function ReviewsSection({ photoId, reviews, aggregate }: Props) {
  return (
    <section className="border-t border-(--color-frame) pt-12 mt-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-2 inline-flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5" />
          Avis clients
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink)">
          {aggregate.count === 0
            ? 'Soyez le premier à laisser un avis'
            : 'Ce qu\'en disent les acheteurs'}
        </h2>
        {aggregate.count > 0 && aggregate.average != null && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <Stars rating={aggregate.average} />
            <span className="font-medium text-(--color-ink)">{aggregate.average.toFixed(1)} / 5</span>
            <span className="text-(--color-stone)">·</span>
            <span className="text-(--color-stone)">
              {aggregate.count} avis
            </span>
          </div>
        )}
      </header>

      <div className="grid md:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Lijst */}
        <div>
          {reviews.length === 0 ? (
            <p className="text-sm text-(--color-stone) italic">
              Aucun avis publié pour cette photographie. Le premier sera le vôtre.
            </p>
          ) : (
            <ul className="space-y-5">
              {reviews.map((r) => (
                <li key={r.id} className="bg-(--color-paper) border border-(--color-frame) p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-medium text-(--color-ink) inline-flex items-center gap-2">
                        {r.name}
                        {r.is_verified_purchase && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-700">
                            <BadgeCheck className="w-3 h-3" />
                            Achat vérifié
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-(--color-stone)">
                        {dateFmt.format(new Date(r.created_at))}
                      </p>
                    </div>
                    <Stars rating={r.rating} />
                  </div>
                  {r.title && (
                    <p className="font-[family-name:var(--font-display)] text-lg text-(--color-ink) mb-1">
                      {r.title}
                    </p>
                  )}
                  {r.body && (
                    <p className="text-sm text-(--color-charcoal) leading-relaxed whitespace-pre-line">
                      {r.body}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Form */}
        <ReviewForm photoId={photoId} />
      </div>
    </section>
  )
}

function Stars({ rating, interactive }: { rating: number; interactive?: boolean }) {
  if (interactive) return null
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} étoiles sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${
            n <= Math.round(rating)
              ? 'fill-(--color-bronze) text-(--color-bronze)'
              : 'text-(--color-frame)'
          }`}
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
}

function ReviewForm({ photoId }: { photoId: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!name.trim()) return setError('Indiquez votre nom.')
    if (rating < 1) return setError('Choisissez une note (1 à 5 étoiles).')
    // Body is optioneel — alleen minimum-lengte check als wel ingevuld
    const trimmedBody = body.trim()
    if (trimmedBody.length > 0 && trimmedBody.length < 10) {
      return setError('Le commentaire doit contenir au moins 10 caractères (ou laissez vide).')
    }
    startTransition(async () => {
      const r = await submitReview({
        photoId,
        name: name.trim(),
        email: email.trim() || null,
        rating,
        title: title.trim() || null,
        body: trimmedBody.length > 0 ? trimmedBody : null,
      })
      if (r.ok) {
        setSuccess(true)
        setName('')
        setEmail('')
        setRating(0)
        setTitle('')
        setBody('')
      } else {
        setError(r.error)
      }
    })
  }

  if (success) {
    return (
      <div className="bg-(--color-paper) border border-(--color-frame) p-6">
        <CheckCircle2 className="w-8 h-8 text-emerald-700 mb-3" />
        <h3 className="font-[family-name:var(--font-display)] text-xl text-(--color-ink) mb-2">
          Merci pour votre avis !
        </h3>
        <p className="text-sm text-(--color-charcoal)">
          Votre commentaire est en attente de modération. Il apparaîtra ici dès que Jean-Pierre l&apos;aura validé.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-(--color-paper) border border-(--color-frame) p-6 space-y-3 sticky top-24"
    >
      <h3 className="font-[family-name:var(--font-display)] text-xl text-(--color-ink) mb-2">
        Laisser un avis
      </h3>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5 block">Nom *</span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5 block">Email (optionnel)</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </label>

      <fieldset>
        <legend className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">Note *</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hover || rating) >= n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                className="p-0.5"
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    filled ? 'fill-(--color-bronze) text-(--color-bronze)' : 'text-(--color-frame)'
                  }`}
                  strokeWidth={1.5}
                />
              </button>
            )
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5 block">Titre (optionnel)</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5 block">Commentaire <span className="text-(--color-stone)/60 normal-case tracking-normal">(optionnel)</span></span>
        <textarea
          rows={4}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Vous pouvez laisser uniquement votre note — un commentaire est facultatif."
          className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
        />
      </label>

      {error && (
        <p className="inline-flex items-start gap-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
        {pending ? 'Envoi…' : 'Envoyer mon avis'}
      </button>

      <p className="text-[11px] text-(--color-stone) leading-relaxed">
        Votre avis sera publié après validation. Aucune information personnelle n&apos;est partagée avec les autres visiteurs.
      </p>
    </form>
  )
}
