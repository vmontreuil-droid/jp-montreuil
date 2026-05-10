import createMollieClient, { type MollieClient, type Payment } from '@mollie/api-client'

/**
 * Mollie client + payment-init voor de webshop. Werkt enkel als
 * MOLLIE_API_KEY env var gezet is (test_xxx of live_xxx). Zonder key:
 * payment-init returnt null en de order blijft pending — Vincent kan
 * dan manueel de status omzetten in admin.
 */

let cached: MollieClient | null = null
function client(): MollieClient | null {
  const key = process.env.MOLLIE_API_KEY
  if (!key) return null
  if (!cached) cached = createMollieClient({ apiKey: key })
  return cached
}

export type CreatePaymentInput = {
  reference: string       // order.reference, gebruikt als externalId
  amountCents: number
  currency?: string       // EUR
  description: string
  redirectUrl: string     // klant landt hier na betaling
  webhookUrl: string      // Mollie POST hier bij status-changes
  email: string
  locale: string
}

export async function createMolliePayment(
  input: CreatePaymentInput,
): Promise<{ id: string; checkoutUrl: string } | null> {
  const c = client()
  if (!c) {
    console.warn('[mollie] MOLLIE_API_KEY ontbreekt — payment overgeslagen')
    return null
  }
  try {
    // Cast naar Payment — Mollie SDK 4.x heeft een overload-quirk waar
    // payments.create getypeerd is als `Promise<Payment> & void`.
    const payment = (await c.payments.create({
      amount: {
        currency: input.currency ?? 'EUR',
        value: (input.amountCents / 100).toFixed(2),
      },
      description: input.description,
      redirectUrl: input.redirectUrl,
      webhookUrl: input.webhookUrl,
      metadata: { reference: input.reference, email: input.email },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locale: mollieLocale(input.locale) as any,
    })) as unknown as Payment
    const checkoutUrl = payment.getCheckoutUrl()
    if (!checkoutUrl) return null
    return { id: payment.id, checkoutUrl }
  } catch (e) {
    console.error('[mollie] payment create failed:', e)
    return null
  }
}

export async function getMolliePaymentStatus(paymentId: string): Promise<string | null> {
  const c = client()
  if (!c) return null
  try {
    const p = (await c.payments.get(paymentId)) as unknown as Payment
    return p.status
  } catch (e) {
    console.error('[mollie] get payment status failed:', e)
    return null
  }
}

/**
 * Mollie verwacht een ISO-639/3166 locale (fr_BE, nl_BE, en_US).
 * Mappen onze app-locale naar wat Mollie ondersteunt.
 */
function mollieLocale(locale: string): 'fr_BE' | 'nl_BE' | 'en_GB' {
  if (locale === 'nl') return 'nl_BE'
  if (locale === 'en') return 'en_GB'
  return 'fr_BE'
}
