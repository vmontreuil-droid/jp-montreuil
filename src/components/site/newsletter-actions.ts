'use server'

import { headers } from 'next/headers'
import { subscribeToNewsletter, type NewsletterLocale } from '@/lib/newsletter'
import { checkRateLimitMem } from '@/lib/rate-limit-mem'

export type SubscribeResult =
  | { ok: true; alreadySubscribed: boolean }
  | { ok: false; error: string }

export async function subscribeToNewsletterAction(input: {
  email: string
  locale: NewsletterLocale
}): Promise<SubscribeResult> {
  // Rate-limit per IP — anti-spam
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? 'unknown'
  const rl = checkRateLimitMem('newsletter_subscribe', ip, { max: 5, windowSec: 60 })
  if (!rl.ok) return { ok: false, error: 'Trop de tentatives' }

  return subscribeToNewsletter(input)
}
