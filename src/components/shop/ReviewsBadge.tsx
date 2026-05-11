import { Star } from 'lucide-react'
import type { ReviewAggregate } from '@/lib/shop/reviews'

/**
 * Compact reviews-badge boven de configurator. Toont avg-rating +
 * sterren + jump-link naar de volledige sectie. Verbergt zich wanneer
 * er nog geen reviews zijn (geen "0/5" als sociale anti-proof).
 */
export function ReviewsBadge({
  aggregate,
  jumpHref = '#reviews',
  labelSeeAll,
}: {
  aggregate: ReviewAggregate
  jumpHref?: string
  labelSeeAll: string
}) {
  if (aggregate.count === 0 || aggregate.average == null) return null
  const avg = aggregate.average
  const rounded = Math.round(avg)

  return (
    <a
      href={jumpHref}
      className="mb-4 inline-flex items-center gap-2 text-xs text-(--color-charcoal) hover:text-(--color-bronze) transition-colors group"
      aria-label={`${avg.toFixed(1)} / 5 — ${labelSeeAll}`}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`w-3.5 h-3.5 ${
              n <= rounded
                ? 'text-(--color-bronze) fill-(--color-bronze)'
                : 'text-(--color-frame)'
            }`}
            strokeWidth={1.5}
          />
        ))}
      </span>
      <span className="font-medium tabular-nums">{avg.toFixed(1)}</span>
      <span className="text-(--color-stone)">·</span>
      <span className="underline decoration-dotted underline-offset-2 group-hover:decoration-solid">
        {aggregate.count} {labelSeeAll}
      </span>
    </a>
  )
}
