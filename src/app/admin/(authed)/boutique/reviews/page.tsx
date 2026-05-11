import Link from 'next/link'
import { ArrowLeft, MessageSquare, BadgeCheck, Star, Mail } from 'lucide-react'
import { listAllReviews, type ReviewStatus } from '@/lib/shop/reviews'
import { setReviewStatusAction } from './actions'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'En attente',
  approved: 'Publié',
  rejected: 'Rejeté',
}

const STATUS_BADGE: Record<ReviewStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-(--color-frame)/40 text-(--color-stone)',
}

const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium', timeStyle: 'short' })

export default async function ReviewsModerationPage() {
  const reviews = await listAllReviews()
  const pending = reviews.filter((r) => r.status === 'pending')
  const others = reviews.filter((r) => r.status !== 'pending')

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Boutique
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Avis clients</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-(--color-bronze)" />
          Avis clients
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-1">
          Validez ou rejetez les avis avant qu&apos;ils n&apos;apparaissent sur la boutique.
        </p>
      </header>

      {pending.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
            À modérer ({pending.length})
          </h2>
          <ul className="space-y-3">
            {pending.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
            Historique ({others.length})
          </h2>
          <ul className="space-y-3">
            {others.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </ul>
        </section>
      )}

      {reviews.length === 0 && (
        <div className="bg-(--color-paper) border border-(--color-frame) p-12 text-center">
          <MessageSquare className="w-10 h-10 mx-auto mb-4 text-(--color-stone)/40" />
          <p className="text-(--color-charcoal)">Aucun avis pour le moment.</p>
        </div>
      )}
    </main>
  )
}

function ReviewCard({ review }: { review: Awaited<ReturnType<typeof listAllReviews>>[number] }) {
  return (
    <li className="bg-(--color-paper) border border-(--color-frame) p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-medium text-(--color-ink) inline-flex items-center gap-2">
            {review.name}
            {review.is_verified_purchase && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-700">
                <BadgeCheck className="w-3 h-3" /> Achat vérifié
              </span>
            )}
          </p>
          <p className="text-xs text-(--color-stone)">
            {dateFmt.format(new Date(review.created_at))}
            {review.email && (
              <>
                {' · '}
                <a href={`mailto:${review.email}`} className="hover:text-(--color-ink) inline-flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {review.email}
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`w-4 h-4 ${
                  n <= review.rating ? 'fill-(--color-bronze) text-(--color-bronze)' : 'text-(--color-frame)'
                }`}
                strokeWidth={1.5}
              />
            ))}
          </span>
          <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${STATUS_BADGE[review.status]}`}>
            {STATUS_LABELS[review.status]}
          </span>
        </div>
      </div>

      {review.title && (
        <p className="font-[family-name:var(--font-display)] text-lg text-(--color-ink) mb-1">
          {review.title}
        </p>
      )}
      {review.body && (
        <p className="text-sm text-(--color-charcoal) leading-relaxed whitespace-pre-line mb-3">
          {review.body}
        </p>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-(--color-frame)/60">
        {review.status !== 'approved' && (
          <form action={setReviewStatusAction.bind(null, review.id, 'approved')}>
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 text-xs uppercase tracking-widest"
            >
              Approuver
            </button>
          </form>
        )}
        {review.status !== 'rejected' && (
          <form action={setReviewStatusAction.bind(null, review.id, 'rejected')}>
            <button
              type="submit"
              className="px-3 py-1.5 bg-(--color-frame)/60 text-(--color-charcoal) hover:bg-red-100 hover:text-red-900 text-xs uppercase tracking-widest"
            >
              Rejeter
            </button>
          </form>
        )}
        {review.status !== 'pending' && (
          <form action={setReviewStatusAction.bind(null, review.id, 'pending')}>
            <button
              type="submit"
              className="px-3 py-1.5 text-(--color-stone) hover:text-(--color-ink) text-xs uppercase tracking-widest"
            >
              Remettre en attente
            </button>
          </form>
        )}
      </div>
    </li>
  )
}
