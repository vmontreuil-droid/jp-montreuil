/**
 * Reviews helpers — server-side queries voor klantbeoordelingen.
 *
 * Public reads: gebruikt service-role om approved-only te tonen, omdat
 * we geen authed klanten verplichten om reviews te lezen.
 * Public submits: vanaf de form via server-action; status start altijd
 * pending zodat admin (Vincent) kan modereren.
 */

import { createShopAdminClient } from './supabase'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export type ShopReview = {
  id: string
  photo_id: string
  order_id: string | null
  name: string
  email: string | null
  rating: number
  title: string | null
  body: string | null
  status: ReviewStatus
  is_verified_purchase: boolean
  created_at: string
  reviewed_at: string | null
}

export type ReviewAggregate = {
  count: number
  average: number | null
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

export async function listApprovedReviewsForPhoto(photoId: string): Promise<ShopReview[]> {
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('reviews')
    .select('*')
    .eq('photo_id', photoId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ShopReview[]
}

export function aggregateReviews(reviews: ShopReview[]): ReviewAggregate {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewAggregate['distribution']
  if (reviews.length === 0) {
    return { count: 0, average: null, distribution }
  }
  let sum = 0
  for (const r of reviews) {
    sum += r.rating
    const key = r.rating as 1 | 2 | 3 | 4 | 5
    if (distribution[key] !== undefined) distribution[key]++
  }
  return {
    count: reviews.length,
    average: Math.round((sum / reviews.length) * 10) / 10,
    distribution,
  }
}

export async function listAllReviews(opts?: { status?: ReviewStatus }): Promise<ShopReview[]> {
  const sb = createShopAdminClient()
  let q = sb.from('reviews').select('*').order('created_at', { ascending: false })
  if (opts?.status) q = q.eq('status', opts.status)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ShopReview[]
}

/**
 * Batch-fetch approved reviews voor een lijst foto-IDs en geef per
 * photo_id een aggregate. Gebruikt voor sterren-badges in de
 * boutique-grid (1 query i.p.v. N).
 */
export async function aggregatesForPhotos(
  photoIds: string[],
): Promise<Map<string, ReviewAggregate>> {
  const out = new Map<string, ReviewAggregate>()
  if (photoIds.length === 0) return out
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('reviews')
    .select('photo_id, rating')
    .in('photo_id', photoIds)
    .eq('status', 'approved')
  if (error) throw error
  // Groepeer per photo_id
  const grouped = new Map<string, ShopReview[]>()
  for (const row of (data ?? []) as Array<{ photo_id: string; rating: number }>) {
    const arr = grouped.get(row.photo_id) ?? []
    arr.push({ ...row } as ShopReview)
    grouped.set(row.photo_id, arr)
  }
  for (const [pid, list] of grouped.entries()) {
    out.set(pid, aggregateReviews(list))
  }
  return out
}

/** Snelle COUNT-query — gebruikt door de footer om de /avis-link
 *  enkel te tonen wanneer er voldoende reviews zijn. */
export async function getApprovedReviewsCount(): Promise<number> {
  const sb = createShopAdminClient()
  const { count, error } = await sb
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')
  if (error) return 0
  return count ?? 0
}

/**
 * Site-wide aggregate over alle approved reviews. Gebruikt door de
 * homepage-banner en de /avis pagina-header.
 */
export async function getOverallReviewsAggregate(): Promise<ReviewAggregate> {
  const sb = createShopAdminClient()
  const { data, error } = await sb
    .from('reviews')
    .select('rating')
    .eq('status', 'approved')
  if (error) return { count: 0, average: null, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
  return aggregateReviews((data ?? []) as ShopReview[])
}

/**
 * Recente goedgekeurde reviews — voor de homepage-quote-rotatie en
 * de /avis pagina. Voegt de foto-titel + slug + thumbnail toe via een
 * aparte fetch.
 */
export type ReviewWithPhoto = ShopReview & {
  photo: { slug: string; title: string | null; storage_path: string; bucket: string } | null
}

export async function listRecentApprovedReviewsWithPhoto(
  limit = 20,
): Promise<ReviewWithPhoto[]> {
  const sb = createShopAdminClient()
  const { data: reviews, error } = await sb
    .from('reviews')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !reviews) return []
  const photoIds = (reviews as ShopReview[]).map((r) => r.photo_id)
  if (photoIds.length === 0) return reviews as ReviewWithPhoto[]
  const { data: photos } = await sb
    .from('photos')
    .select('id, slug, title, storage_path, bucket')
    .in('id', photoIds)
  const byId = new Map(
    ((photos ?? []) as Array<{ id: string; slug: string; title: string | null; storage_path: string; bucket: string }>)
      .map((p) => [p.id, p]),
  )
  return (reviews as ShopReview[]).map((r) => ({
    ...r,
    photo: byId.get(r.photo_id) ? {
      slug: byId.get(r.photo_id)!.slug,
      title: byId.get(r.photo_id)!.title,
      storage_path: byId.get(r.photo_id)!.storage_path,
      bucket: byId.get(r.photo_id)!.bucket,
    } : null,
  }))
}

export async function setReviewStatus(
  id: string,
  status: ReviewStatus,
  reviewerId?: string,
): Promise<void> {
  const sb = createShopAdminClient()
  const { error } = await sb
    .from('reviews')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId ?? null,
    })
    .eq('id', id)
  if (error) throw error
}
