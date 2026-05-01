import { Resend } from 'resend'

let cached: Resend | null = null

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!cached) cached = new Resend(key)
  return cached
}

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'Atelier Montreuil <onboarding@resend.dev>'
export const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'jp@montreuil.be'
export const REPLY_TO = process.env.RESEND_REPLY_TO || 'jp@montreuil.be'

export type EmailAttachment = {
  filename: string
  content: Buffer | string
  contentType?: string
}

export type SendEmailInput = {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

/**
 * Stuur email via Resend. Geen-op + warning als RESEND_API_KEY ontbreekt;
 * een mislukte mail mag NOOIT een DB-write of statuswissel breken.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const client = getClient()
  if (!client) {
    console.warn('[email] RESEND_API_KEY ontbreekt — overgeslagen:', input.subject)
    return { ok: false, error: 'no_api_key' }
  }
  try {
    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to: input.to,
      ...(input.cc ? { cc: input.cc } : {}),
      ...(input.bcc ? { bcc: input.bcc } : {}),
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      replyTo: input.replyTo || REPLY_TO,
      ...(input.attachments && input.attachments.length > 0
        ? {
            attachments: input.attachments.map((a) => ({
              filename: a.filename,
              content: typeof a.content === 'string' ? a.content : a.content.toString('base64'),
              contentType: a.contentType,
            })),
          }
        : {}),
    })
    if (error) {
      console.error('[email] Resend error:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (e) {
    console.error('[email] send exception:', e)
    return { ok: false, error: (e as Error).message }
  }
}
