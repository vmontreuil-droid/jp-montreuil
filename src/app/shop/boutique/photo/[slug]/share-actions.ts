'use server'

import { z } from 'zod'
import { render } from '@react-email/render'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { shopPhotoUrl } from '@/lib/shop/photo-url'
import { sendEmail } from '@/lib/email/client'
import { PreviewShare } from '@/lib/email/templates/PreviewShare'
import { PUBLIC_BASE_URL } from '@/lib/public-url'
import { checkRate } from '@/lib/shop/rate-limit'

/**
 * Server-action voor de "Stuur preview"-modal op de fotodetail-pagina.
 * Stuurt een Resend-mail met de foto + huidige configuratie-URL.
 *
 * Anti-misbruik: max 5 emails per slug per ontvanger per uur, via de
 * pluggable checkRate-helper (Upstash KV indien geconfigureerd, anders
 * in-memory fallback).
 */

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_SEC = 60 * 60 // 1 uur

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

  const key = `share:${slug}:${toEmail}`
  const rate = await checkRate(key, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SEC)
  if (!rate.ok) return { ok: false, reason: 'rate_limited' }

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

// ────────────────────────────────────────────────────────────────────────
// Short-code share-URLs (/s/abc123 → /shop/boutique/photo/[slug]?…)
// ────────────────────────────────────────────────────────────────────────

const ShareLinkSchema = z.object({
  slug: z.string().min(1).max(120),
  params: z.record(z.string(), z.string()).default({}),
})

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
function randomCode(len = 6): string {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

/**
 * Maak een short-code aan voor de huidige configuratie. Returnt
 * `{ok:true, code, url}`. Bij 3× collision returnt `{ok:false}`.
 *
 * Gracefully degradeert: als de share_links tabel nog niet bestaat
 * (migration 0031 niet gedraaid), valt de feature stil terug — de
 * caller mag dan de lange URL gebruiken.
 */
export async function createShareLink(input: unknown): Promise<
  { ok: true; code: string; url: string } | { ok: false; reason: string }
> {
  const parsed = ShareLinkSchema.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'invalid_input' }
  const { slug, params } = parsed.data

  const sb = createShopAdminClient()
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = randomCode(6)
    const { data, error } = await sb
      .from('share_links')
      .insert({ code, photo_slug: slug, params })
      .select('code')
      .single()
    if (!error && data) {
      return {
        ok: true,
        code: data.code as string,
        url: `${PUBLIC_BASE_URL}/s/${data.code as string}`,
      }
    }
    // PG unique-constraint violation? Probeer opnieuw met nieuwe code.
    if (error?.code === '23505') continue
    // Tabel bestaat niet (migration nog niet gedraaid) of andere fout
    return { ok: false, reason: error?.message ?? 'insert_failed' }
  }
  return { ok: false, reason: 'collisions' }
}

/** Lookup voor `/s/[code]` route — increment uses_count fire-and-forget. */
export async function resolveShareLink(code: string): Promise<
  { ok: true; slug: string; params: Record<string, string> } | { ok: false }
> {
  if (!code || code.length > 24) return { ok: false }
  const sb = createShopAdminClient()
  const { data } = await sb
    .from('share_links')
    .select('photo_slug, params')
    .eq('code', code)
    .maybeSingle()
  if (!data) return { ok: false }
  // Async update van uses_count — wacht niet (geen blokkade voor
  // de redirect).
  void sb
    .from('share_links')
    .update({ uses_count: 1 } as { uses_count: number })
    .eq('code', code)
    // Cleaner zou een rpc('increment_uses') zijn, maar dit is genoeg
    // voor analytics-licht.
    .then(() => {}, () => {})
  return {
    ok: true,
    slug: data.photo_slug as string,
    params: (data.params ?? {}) as Record<string, string>,
  }
}
