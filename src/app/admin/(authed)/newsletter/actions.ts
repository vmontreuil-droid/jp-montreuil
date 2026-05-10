'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, REPLY_TO } from '@/lib/email/client'
import { listSubscribers, type NewsletterLocale } from '@/lib/newsletter'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

export type SendIssueResult =
  | { ok: true; sentFr: number; sentNl: number; errors: number }
  | { ok: false; error: string }

/**
 * Send een newsletter naar alle actieve subscribers in beide talen.
 * - Per locale: 1 batch sequentieel gestuurd
 * - Per email: unsubscribe-link uniek per subscriber
 * - Bewaart 1 newsletter_issues rij met counts en errors
 *
 * Voor lage volumes (< 1000 abonnees) is sequentiële send OK. Voor
 * grotere lijsten zou je naar batched of queue-based send willen
 * (Resend batches zijn 100 emails / call).
 */
export async function sendNewsletterIssue(input: {
  subject_fr: string
  subject_nl: string
  body_fr: string
  body_nl: string
}): Promise<SendIssueResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  if (!input.subject_fr.trim() || !input.subject_nl.trim() ||
      !input.body_fr.trim() || !input.body_nl.trim()) {
    return { ok: false, error: 'Onderwerp + inhoud vereist in beide talen' }
  }

  const [frSubs, nlSubs] = await Promise.all([
    listSubscribers({ active: true, locale: 'fr' }),
    listSubscribers({ active: true, locale: 'nl' }),
  ])

  if (frSubs.length === 0 && nlSubs.length === 0) {
    return { ok: false, error: 'Aucun abonné actif' }
  }

  const origin = PUBLIC_BASE_URL.replace(/\/$/, '')
  let sentFr = 0
  let sentNl = 0
  let errors = 0

  for (const sub of frSubs) {
    const r = await sendOne({
      to: sub.email,
      subject: input.subject_fr,
      bodyHtml: input.body_fr,
      locale: 'fr',
      unsubscribeToken: sub.unsubscribe_token,
      origin,
    })
    if (r.ok) sentFr++
    else errors++
  }
  for (const sub of nlSubs) {
    const r = await sendOne({
      to: sub.email,
      subject: input.subject_nl,
      bodyHtml: input.body_nl,
      locale: 'nl',
      unsubscribeToken: sub.unsubscribe_token,
      origin,
    })
    if (r.ok) sentNl++
    else errors++
  }

  // Log issue
  const admin = createAdminClient()
  await admin.from('newsletter_issues').insert({
    subject_fr: input.subject_fr,
    subject_nl: input.subject_nl,
    body_fr: input.body_fr,
    body_nl: input.body_nl,
    recipients_fr: sentFr,
    recipients_nl: sentNl,
    errors,
  })

  revalidatePath('/admin/newsletter')
  return { ok: true, sentFr, sentNl, errors }
}

async function sendOne(input: {
  to: string
  subject: string
  bodyHtml: string
  locale: NewsletterLocale
  unsubscribeToken: string
  origin: string
}): Promise<{ ok: boolean }> {
  const unsubUrl = `${input.origin}/newsletter/unsubscribe?token=${encodeURIComponent(input.unsubscribeToken)}`
  const isFr = input.locale === 'fr'
  const unsubLabel = isFr
    ? 'Se désinscrire de cette newsletter'
    : 'Uitschrijven van deze nieuwsbrief'

  const html = `<!DOCTYPE html>
<html lang="${input.locale}">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f3ee;font-family:Georgia,serif;color:#2a2520;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #d8d2c5;max-width:600px;width:100%;">
        <tr><td style="padding:32px;">
          <p style="font-family:Georgia,serif;font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#8a8478;margin:0 0 8px;">
            Atelier Montreuil
          </p>
          <h1 style="font-family:Georgia,serif;font-size:24px;line-height:1.25;color:#2a2520;margin:0 0 24px;font-weight:normal;">
            ${escapeHtml(input.subject)}
          </h1>
          <div style="font-size:15px;line-height:1.6;color:#3d3a35;">
            ${input.bodyHtml}
          </div>
        </td></tr>
        <tr><td style="border-top:1px solid #d8d2c5;padding:20px 32px;font-size:11px;color:#8a8478;">
          <p style="margin:0 0 6px;">
            <a href="${input.origin}" style="color:#b89668;text-decoration:none;">jp.montreuil.be</a>
            · Jean-Pierre Montreuil
          </p>
          <p style="margin:0;">
            <a href="${unsubUrl}" style="color:#8a8478;text-decoration:underline;">${escapeHtml(unsubLabel)}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = stripHtml(input.bodyHtml) + `\n\n---\n${unsubLabel}: ${unsubUrl}`

  const result = await sendEmail({
    to: input.to,
    subject: input.subject,
    html,
    text,
    replyTo: REPLY_TO,
    // List-Unsubscribe header zou hier ideaal zijn, maar Resend SDK
    // ondersteunt geen custom headers (yet). Voor RFC 8058 compliance
    // zouden we een transactional-only API moeten gebruiken.
  })
  return { ok: result.ok }
}

export async function deleteSubscriber(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  await admin.from('newsletter_subscribers').delete().eq('id', id)
  revalidatePath('/admin/newsletter/subscribers')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
