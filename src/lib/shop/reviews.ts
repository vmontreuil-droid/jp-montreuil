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
