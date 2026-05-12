import Link from 'next/link'
import { ArrowLeft, MessageSquare, BadgeCheck, Star, Mail, ExternalLink } from 'lucide-react'
import {
  listAllReviewsWithPhoto,
  listShopPhotosForPicker,
  type ReviewStatus,
  type ReviewWithPhoto,
} from '@/lib/shop/reviews'
import { shopPhotoUrl } from '@/lib/shop/photo-url'
import { setReviewStatusAction, updateReviewAction } from './actions'

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
  const [reviews, photos] = await Promise.all([
    listAllReviewsWithPhoto(),
    listShopPhotosForPicker(),
  ])
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
          Validez ou rejetez les avis. Vous pouvez aussi corriger le titre, le commentaire ou la photo associée.
        </p>
      </header>

      {pending.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
            À modérer ({pending.length})
          </h2>
          <ul className="space-y-3">
            {pending.map((r) => (
              <ReviewCard key={r.id} review={r} photos={photos} />
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
              <ReviewCard key={r.id} review={r} photos={photos} />
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

function ReviewCard({
  review,
  photos,
}: {
  review: ReviewWithPhoto
  photos: Array<{ id: string; slug: string; title: string | null; storage_path: string; bucket: string }>
}) {
  return (
    <li className="bg-(--color-paper) border border-(--color-frame) p-5 grid grid-cols-1 md:grid-cols-[120px_1fr] gap-5">
      {/* Foto-thumbnail */}
      <div>
        {review.photo ? (
          <Link
            href={`/shop/boutique/photo/${review.photo.slug}`}
            target="_blank"
            rel="noreferrer"
            className="block aspect-square overflow-hidden border border-(--color-frame) hover:border-(--color-bronze) transition-colors group relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shopPhotoUrl(review.photo.storage_path, review.photo.bucket)}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-1 right-1 bg-(--color-canvas)/90 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-3 h-3 text-(--color-bronze)" />
            </span>
          </Link>
        ) : (
          <div className="aspect-square bg-(--color-frame)/40 border border-(--color-frame) flex items-center justify-center text-[10px] uppercase tracking-widest text-(--color-stone)">
            (foto introuvable)
          </div>
        )}
        {review.photo && (
          <p className="text-[10px] text-(--color-stone) mt-1.5 truncate">
            {review.photo.title ?? review.photo.slug}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
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

        {/* Edit-form: title + body + photo-koppeling — server action,
            geen JS nodig. Defaults zijn de huidige waarden. */}
        <details className="group">
          <summary className="cursor-pointer text-xs uppercase tracking-widest text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1 mb-2 select-none">
            <span className="group-open:hidden">▸ Modifier titre / commentaire / photo</span>
            <span className="hidden group-open:inline">▾ Édition en cours</span>
          </summary>
          <form action={updateReviewAction} className="space-y-3 mb-3 bg-(--color-canvas)/60 p-3 border border-(--color-frame)/60">
            <input type="hidden" name="id" value={review.id} />

            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-(--color-stone) block mb-1">Titre</span>
              <input
                type="text"
                name="title"
                defaultValue={review.title ?? ''}
                maxLength={100}
                className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) text-sm text-(--color-ink) focus:border-(--color-bronze) focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-(--color-stone) block mb-1">Commentaire</span>
              <textarea
                name="body"
                rows={4}
                maxLength={2000}
                defaultValue={review.body ?? ''}
                className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) text-sm text-(--color-ink) focus:border-(--color-bronze) focus:outline-none resize-y"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-(--color-stone) block mb-1">
                Photo associée
              </span>
              <select
                name="photo_id"
                defaultValue={review.photo_id}
                className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) text-sm text-(--color-ink) focus:border-(--color-bronze) focus:outline-none"
              >
                {photos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title ?? p.slug} ({p.slug})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-widest"
            >
              Enregistrer les modifications
            </button>
          </form>
        </details>

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

        <div className="flex items-center gap-2 pt-3 border-t border-(--color-frame)/60 flex-wrap">
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
      </div>
    </li>
  )
}
