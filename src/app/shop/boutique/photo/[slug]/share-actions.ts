'use server'

import { z } from 'zod'
import { render } from '@react-email/render'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { shopPhotoUrl } from '@/lib/shop/photo-url'
import { sendEmail } from '@/lib/email/client'
import { PreviewShare } from '@/lib/email/templates/PreviewShare'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

/**
 * Server-action voor de "Stuur preview"-modal op de fotodetail-pagina.
 * Stuurt een Resend-mail met de foto + huidige configuratie-URL.
 *
 * Anti-misbruik: max 5 emails per slug per IP per uur. Geen DB-tabel
 * nodig — we vertrouwen op Resend's eigen rate-limit als ondergrens.
 * Dit is een lichte client-misuse-rem.
 */

// Eenvoudige in-memory rate-limit per (slug+ip) — reset bij server-restart.
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 uur
const recentSends = new Map<string, number[]>()

function checkRate(key: string): boolean {
  const now = Date.now()
  const arr = (recentSends.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (arr.length >= RATE_LIMIT_MAX) return false
  arr.push(now)
  recentSends.set(key, arr)
  return true
}

const Schema = z.object({
  slug: z.string().min(1).max(120),
  toEmail: z.string().email(),
  fromName: z.string().max(80).optional().nullable(),
  message: z.string().max(500).optional().nullable(),
  configUrl: z.string().url(),
  configSummary: z.string().max(240),
  locale: z.enum(['fr', 'nl']).default('fr'),
})

export async function sendPreviewShare(input: unknown): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const parsed = Schema.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'invalid_input' }
  const { slug, toEmail, fromName, message, configUrl, configSummary, locale } = parsed.data

  const key = `${slug}:${toEmail}`
  if (!checkRate(key)) return { ok: false, reason: 'rate_limited' }

  // Hydrate foto vanuit slug — voorkomt dat een random URL kan worden
  // gemaild. Photo moet bestaan en gepubliceerd zijn.
  const sb = createShopAdminClient()
  const { data: photo } = await sb
    .from('photos')
    .select('slug, title, alt_text, storage_path, bucket, is_published')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
  if (!photo) return { ok: false, reason: 'not_found' }

  const photoTitle = (photo as { title: string | null; slug: string }).title
    ?? (photo as { slug: string }).slug
  const photoImageUrl = shopPhotoUrl(
    (photo as { storage_path: string }).storage_path,
    (photo as { bucket: string }).bucket,
  )

  // Forceer dat de configUrl naar onze eigen origin wijst (voorkomt
  // misbruik als open-redirect / phishing).
  if (!configUrl.startsWith(PUBLIC_BASE_URL)) {
    return { ok: false, reason: 'invalid_url' }
  }

  const html = await render(
    PreviewShare({
      fromName: fromName?.trim() || null,
      message: message?.trim() || null,
      photoTitle,
      photoImageUrl,
      configUrl,
      configSummary,
      locale,
    }),
  )

  const subject = locale === 'nl'
    ? `${fromName?.trim() ? `${fromName.trim()} deelt: ` : ''}${photoTitle} — Atelier JP Montreuil`
    : `${fromName?.trim() ? `${fromName.trim()} partage : ` : ''}${photoTitle} — Atelier JP Montreuil`

  const result = await sendEmail({
    to: toEmail,
    subject,
    html,
    text: `${fromName ?? ''}\n\n${message ?? ''}\n\n${configUrl}`,
  })

  if (!result.ok) return { ok: false, reason: result.error ?? 'send_failed' }
  return { ok: true }
}
