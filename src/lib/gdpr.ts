/**
 * GDPR helpers — request-tabel beheer + 1-click klantdata-wisser
 * (anonimiseert orders i.p.v. echte delete zodat boekhouding blijft).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createShopAdminClient } from '@/lib/shop/supabase'

export type GdprRequestStatus = 'received' | 'in_progress' | 'completed' | 'rejected'
export type GdprRequestType = 'export' | 'delete' | 'rectification'

export type GdprRequest = {
  id: string
  email: string
  full_name: string | null
  request_type: GdprRequestType
  message: string | null
  status: GdprRequestStatus
  notes: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}

export async function listGdprRequests(): Promise<GdprRequest[]> {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('gdpr_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as GdprRequest[]
}

export async function setGdprStatus(
  id: string,
  status: GdprRequestStatus,
  notes?: string | null,
  resolverId?: string,
): Promise<void> {
  const sb = createAdminClient()
  const patch: Record<string, unknown> = { status }
  if (notes !== undefined) patch.notes = notes
  if (status === 'completed' || status === 'rejected') {
    patch.resolved_at = new Date().toISOString()
    if (resolverId) patch.resolved_by = resolverId
  }
  const { error } = await sb.from('gdpr_requests').update(patch).eq('id', id)
  if (error) throw error
}

export type DeletionReport = {
  shopCustomersDeleted: number
  shopOrdersAnonymized: number
  contactMessagesDeleted: number
  newsletterUnsubscribed: number
  reviewsAnonymized: number
}

/**
 * Soft-delete: wist contact-messages + newsletter-subscribers + shop
 * customer-rij, en anonimiseert shop_orders + reviews (vervangt
 * naam/email door 'anonymized@…' zodat boekhouding/audit-trail
 * intact blijft).
 *
 * Geeft geen error bij ontbrekende rijen — gewoon counts.
 */
export async function eraseCustomerData(email: string): Promise<DeletionReport> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) throw new Error('Email vereist')

  const admin = createAdminClient()
  const shop = createShopAdminClient()

  const report: DeletionReport = {
    shopCustomersDeleted: 0,
    shopOrdersAnonymized: 0,
    contactMessagesDeleted: 0,
    newsletterUnsubscribed: 0,
    reviewsAnonymized: 0,
  }

  // 1. Shop customer rij verwijderen
  const { count: cust } = await shop
    .from('customers').delete({ count: 'exact' })
    .ilike('email', normalized)
  report.shopCustomersDeleted = cust ?? 0

  // 2. Shop orders anonimiseren (NIET deleten — boekhouding)
  const anonEmail = `anonymized+${Date.now()}@deleted.local`
  const { count: ord } = await shop
    .from('orders').update({
      email: anonEmail,
      full_name: 'Anonymized',
      shipping_address: null,
      company_name: null,
      vat_number: null,
      vat_company_name: null,
      notes: null,
    }, { count: 'exact' })
    .ilike('email', normalized)
  report.shopOrdersAnonymized = ord ?? 0

  // 3. Reviews anonimiseren
  const { count: rev } = await shop
    .from('reviews').update({
      name: 'Anonyme',
      email: null,
    }, { count: 'exact' })
    .ilike('email', normalized)
  report.reviewsAnonymized = rev ?? 0

  // 4. Contact messages — hard delete
  const { count: msg } = await admin
    .from('contact_messages').delete({ count: 'exact' })
    .ilike('email', normalized)
  report.contactMessagesDeleted = msg ?? 0

  // 5. Newsletter — markeer als unsubscribed
  const { count: sub } = await admin
    .from('newsletter_subscribers').update({
      unsubscribed_at: new Date().toISOString(),
    }, { count: 'exact' })
    .ilike('email', normalized)
    .is('unsubscribed_at', null)
  report.newsletterUnsubscribed = sub ?? 0

  return report
}

export type CustomerExport = {
  email: string
  shopOrders: unknown[]
  contactMessages: unknown[]
  newsletter: unknown[]
  reviews: unknown[]
  shopCustomer: unknown | null
}

/**
 * Bundel alle data over een klant — voor manueel export naar JSON.
 */
export async function exportCustomerData(email: string): Promise<CustomerExport> {
  const normalized = email.trim().toLowerCase()
  const admin = createAdminClient()
  const shop = createShopAdminClient()

  const [
    { data: orders },
    { data: messages },
    { data: news },
    { data: reviews },
    { data: customer },
  ] = await Promise.all([
    shop.from('orders').select('*').ilike('email', normalized),
    admin.from('contact_messages').select('*').ilike('email', normalized),
    admin.from('newsletter_subscribers').select('*').ilike('email', normalized),
    shop.from('reviews').select('*').ilike('email', normalized),
    shop.from('customers').select('*').ilike('email', normalized).maybeSingle(),
  ])

  return {
    email: normalized,
    shopOrders: orders ?? [],
    contactMessages: messages ?? [],
    newsletter: news ?? [],
    reviews: reviews ?? [],
    shopCustomer: customer ?? null,
  }
}
