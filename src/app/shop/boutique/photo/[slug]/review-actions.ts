'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { checkRateLimitMem } from '@/lib/rate-limit-mem'

export type SubmitReviewInput = {
  photoId: string
  name: string
  email: string | null
  rating: number
  title: string | null
  body: string | null
}

export type SubmitReviewResult = { ok: true } | { ok: false; error: string }

export async function submitReview(input: SubmitReviewInput): Promise<SubmitReviewResult> {
  // Server-validatie
  if (!input.photoId || !input.name?.trim()) {
    return { ok: false, error: 'Champs requis manquants.' }
  }
  if (input.rating < 1 || input.rating > 5) {
    return { ok: false, error: 'Note invalide.' }
  }
  // Body is optioneel — klanten kunnen ook enkel sterren geven.
  // Wanneer wel ingevuld: minimum 10 tekens om flutter-spam te
  // verminderen. Lege body = OK.
  const trimmedBody = input.body?.trim() ?? ''
  if (trimmedBody.length > 0 && trimmedBody.length < 10) {
    return { ok: false, error: 'Commentaire trop court (minimum 10 caractères ou laissez vide).' }
  }

  // Rate-limit per IP — max 5 reviews per uur (anti-spam)
  const h = await headers()
  const ip =
    h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? 'unknown'
  const ua = h.get('user-agent') ?? null
  const rl = checkRateLimitMem('shop_review_submit', ip, { max: 5, windowSec: 3600 })
  if (!rl.ok) {
    return { ok: false, error: 'Trop d\'avis envoyés depuis cette adresse. Réessayez plus tard.' }
  }

  const sb = createShopAdminClient()

  // Heeft deze email al een paid order voor deze photo? → verified purchase
  let isVerified = false
  if (input.email) {
    const { data: items } = await sb
      .from('order_items')
      .select('order_id, photo_id, orders!inner(status,email)')
      .eq('photo_id', input.photoId)
      .ilike('orders.email', input.email)
      .in('orders.status', ['paid', 'shipped', 'fulfilled'])
      .limit(1)
    if (items && items.length > 0) isVerified = true
  }

  const { error } = await sb.from('reviews').insert({
    photo_id: input.photoId,
    name: input.name.trim().slice(0, 80),
    email: input.email?.trim().toLowerCase() ?? null,
    rating: input.rating,
    title: input.title?.trim().slice(0, 100) ?? null,
    body: trimmedBody.length > 0 ? trimmedBody.slice(0, 2000) : null,
    status: 'pending',
    is_verified_purchase: isVerified,
    ip,
    user_agent: ua,
  })
  if (error) {
    console.error('[reviews/submit] insert failed:', error.message)
    return { ok: false, error: 'Erreur serveur — réessayez.' }
  }

  // Geen revalidate — review staat pending, verschijnt pas na admin-validate
  revalidatePath('/admin/boutique/reviews')
  return { ok: true }
}
