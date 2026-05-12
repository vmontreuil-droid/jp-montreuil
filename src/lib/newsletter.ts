/**
 * Newsletter helpers — subscribers + issues. Gebruikt admin-client
 * (service-role) zodat we altijd door de RLS heen kunnen. RLS blokkeert
 * publieke selects + updates; alleen anonieme INSERT (subscribe) is
 * toegestaan en die gaat via dezelfde anon-client (geen helper nodig).
 */

import { createAdminClient } from '@/lib/supabase/admin'

export type NewsletterLocale = 'fr' | 'nl'

export type NewsletterSubscriber = {
  id: string
  email: string
  email_normalized: string
  locale: NewsletterLocale
  unsubscribe_token: string
  subscribed_at: string
  unsubscribed_at: string | null
}

export type NewsletterIssue = {
  id: string
  subject_fr: string
  subject_nl: string
  body_fr: string
  body_nl: string
  sent_at: string
  recipients_fr: number
  recipients_nl: number
  errors: number
}

export async function listSubscribers(opts?: {
  active?: boolean
  locale?: NewsletterLocale
}): Promise<NewsletterSubscriber[]> {
  const sb = createAdminClient()
  let q = sb
    .from('newsletter_subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false })
  if (opts?.active === true) q = q.is('unsubscribed_at', null)
  if (opts?.active === false) q = q.not('unsubscribed_at', 'is', null)
  if (opts?.locale) q = q.eq('locale', opts.locale)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as NewsletterSubscriber[]
}

/**
 * Detecteer "table missing" zodat we de admin-UI een nette empty-state
 * kunnen tonen i.p.v. een 500-error wanneer migratie 0009 nog niet is
 * toegepast op deze omgeving.
 */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || /Could not find the table/i.test(error.message ?? '')
}

export async function countActiveSubscribers(): Promise<{ fr: number; nl: number; total: number }> {
  const sb = createAdminClient()
  const [a, b] = await Promise.all([
    sb.from('newsletter_subscribers').select('*', { count: 'exact', head: true })
      .is('unsubscribed_at', null).eq('locale', 'fr'),
    sb.from('newsletter_subscribers').select('*', { count: 'exact', head: true })
      .is('unsubscribed_at', null).eq('locale', 'nl'),
  ])
  if (isMissingTable(a.error) || isMissingTable(b.error)) {
    return { fr: 0, nl: 0, total: 0 }
  }
  return { fr: a.count ?? 0, nl: b.count ?? 0, total: (a.count ?? 0) + (b.count ?? 0) }
}

export async function listIssues(): Promise<NewsletterIssue[]> {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('newsletter_issues')
    .select('*')
    .order('sent_at', { ascending: false })
  if (isMissingTable(error)) return []
  if (error) throw error
  return (data ?? []) as NewsletterIssue[]
}

/**
 * Check of de newsletter-tables bestaan in de DB — gebruikt door de
 * admin-pagina om een banner te tonen wanneer de migratie nog niet
 * gedraaid is.
 */
export async function newsletterTablesExist(): Promise<boolean> {
  const sb = createAdminClient()
  const { error } = await sb.from('newsletter_subscribers').select('id', { head: true, count: 'exact' }).limit(1)
  return !isMissingTable(error)
}

export async function getIssue(id: string): Promise<NewsletterIssue | null> {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('newsletter_issues')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as NewsletterIssue | null) ?? null
}

/**
 * Subscribe — vanuit publieke server action. Anon-client volstaat want
 * RLS staat insert toe. We doen client-side normalisatie zodat dubbele
 * subscribes idempotent zijn (de unique-index op email_normalized
 * gooit een 23505 die we netjes terugvertalen naar "al ingeschreven").
 */
export async function subscribeToNewsletter(input: {
  email: string
  locale: NewsletterLocale
}): Promise<{ ok: true; alreadySubscribed: boolean } | { ok: false; error: string }> {
  const email = input.email.trim()
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: 'Adresse invalide' }
  }
  const sb = createAdminClient()
  // Check eerst — voor mooiere "already subscribed" feedback
  const { data: existing } = await sb
    .from('newsletter_subscribers')
    .select('id, unsubscribed_at')
    .eq('email_normalized', email.toLowerCase().trim())
    .maybeSingle<{ id: string; unsubscribed_at: string | null }>()

  if (existing) {
    if (existing.unsubscribed_at) {
      // Re-subscribe: clear unsubscribed_at + set locale
      const { error } = await sb
        .from('newsletter_subscribers')
        .update({
          unsubscribed_at: null,
          subscribed_at: new Date().toISOString(),
          locale: input.locale,
        })
        .eq('id', existing.id)
      if (error) return { ok: false, error: error.message }
      return { ok: true, alreadySubscribed: false }
    }
    return { ok: true, alreadySubscribed: true }
  }

  const { error } = await sb
    .from('newsletter_subscribers')
    .insert({ email, locale: input.locale })
  if (error) {
    if (error.code === '23505') return { ok: true, alreadySubscribed: true }
    return { ok: false, error: error.message }
  }
  return { ok: true, alreadySubscribed: false }
}

/**
 * Unsubscribe via token uit de email-link. Idempotent — al uitgeschreven
 * = ok.
 */
export async function unsubscribeByToken(token: string): Promise<{
  ok: boolean
  email: string | null
}> {
  const sb = createAdminClient()
  const { data: row } = await sb
    .from('newsletter_subscribers')
    .select('id, email, unsubscribed_at')
    .eq('unsubscribe_token', token)
    .maybeSingle<{ id: string; email: string; unsubscribed_at: string | null }>()
  if (!row) return { ok: false, email: null }
  if (row.unsubscribed_at) return { ok: true, email: row.email }
  const { error } = await sb
    .from('newsletter_subscribers')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('id', row.id)
  if (error) return { ok: false, email: row.email }
  return { ok: true, email: row.email }
}
