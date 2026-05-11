import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Lock, Receipt, ArrowRight } from 'lucide-react'
import {
  getShopOrderByReference,
  listShopOrderItems,
  getOrderStatusLabels,
  ORDER_STATUS_COLORS,
} from '@/lib/shop/orders'
import { createClient } from '@/lib/supabase/server'
import { getShopLocale } from '@/lib/shop/locale'
import { getDictionary } from '@/i18n/dictionaries'

/**
 * /shop/portail/commande/[ref]?email=…
 * Klant tracking-page: vereist correct e-mailadres in querystring om
 * andermans bestellingen niet te tonen. Geen login flow nodig (dat is
 * v4).
 */
export default async function ShopOrderTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>
  searchParams: Promise<{ email?: string }>
}) {
  const { ref } = await params
  const sp = await searchParams
  const emailParam = (sp.email ?? '').trim().toLowerCase()
  const locale = await getShopLocale()
  const t = getDictionary(locale).boutique.commande
  const intlLoc = locale === 'nl' ? 'nl-BE' : 'fr-BE'
  const fmt = new Intl.NumberFormat(intlLoc, {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  })
  const formatPrice = (cents: number) => fmt.format(cents / 100)

  // Session-aware: ingelogde klanten gaan naar de nieuwe portail-route
  // (geen email-querystring nodig, B2B-velden worden ook getoond).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email) {
    redirect(`/portail/commandes/${ref}`)
  }

  const order = await getShopOrderByReference(ref)
  if (!order) notFound()
  if (!emailParam || order.email.toLowerCase() !== emailParam) {
    return (
      <main className="max-w-md mx-auto px-6 py-16 text-center space-y-4">
        <h1 className="text-2xl font-semibold">{t.verifTitle}</h1>
        <p className="text-sm text-stone-600">
          {t.verifBody}
        </p>
        <code className="block bg-stone-100 p-2 rounded text-xs break-all">
          /shop/portail/commande/{ref}?email={locale === 'nl' ? 'uw@email.com' : 'votre@email.com'}
        </code>
        <p className="text-xs text-stone-500">
          {t.verifHint}
        </p>
      </main>
    )
  }

  const items = await listShopOrderItems(order.id)
  const statusLabels = getOrderStatusLabels(t)

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header>
        <p className="text-xs text-stone-500 uppercase tracking-widest mb-1">{t.reference}</p>
        <h1 className="text-3xl font-mono">{order.reference}</h1>
        <p className="text-sm text-stone-600 mt-2">
          {t.orderedOn} {new Date(order.created_at).toLocaleDateString(intlLoc)}
        </p>
        <span className={`inline-block mt-3 px-2 py-1 text-xs ${ORDER_STATUS_COLORS[order.status]}`}>
          {statusLabels[order.status]}
        </span>
      </header>

      {/* Pay button als pending én checkout-URL */}
      {order.status === 'pending' && order.mollie_checkout_url && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-amber-900">
            {t.pendingAlert}
          </p>
          <a
            href={order.mollie_checkout_url}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded"
          >
            <Lock size={14} /> {t.payNow}
          </a>
        </div>
      )}

      {/* Items + totaal */}
      <section className="bg-white border border-stone-200 rounded p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500 mb-3">{t.articles}</h2>
        <ul className="divide-y divide-stone-200 text-sm">
          {items.map((it) => (
            <li key={it.id} className="py-2 flex justify-between gap-3">
              <span>
                {it.title}
                <span className="text-xs text-stone-500"> × {it.quantity}</span>
              </span>
              <span className="font-medium tabular-nums">
                {formatPrice(it.unit_price_cents * it.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-stone-200 mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-stone-500">
            <span>{t.shippingFees}</span>
            <span className="tabular-nums">
              {order.shipping_cents > 0 ? formatPrice(order.shipping_cents) : t.free}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-stone-200">
            <span className="text-sm uppercase tracking-widest text-stone-500">{t.total}</span>
            <span className="text-2xl font-semibold tabular-nums">{formatPrice(order.amount_cents)}</span>
          </div>
        </div>
      </section>

      {/* Adres */}
      {order.shipping_address && (
        <section className="bg-white border border-stone-200 rounded p-5 text-sm">
          <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500 mb-2">{t.shipping}</h2>
          <p className="font-medium">{order.full_name}</p>
          <p className="text-stone-600">{order.email}</p>
          <address className="not-italic text-stone-700 mt-2 leading-relaxed">
            {(order.shipping_address as Record<string, string>).street}<br />
            {(order.shipping_address as Record<string, string>).country
              ? `${(order.shipping_address as Record<string, string>).country} - `
              : ''}
            {(order.shipping_address as Record<string, string>).postal_code}{' '}
            {(order.shipping_address as Record<string, string>).city}
          </address>
        </section>
      )}

      {order.status === 'paid' && (
        <Link
          href={`/shop/portail/commande/${order.reference}/facture?email=${encodeURIComponent(order.email)}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 hover:border-stone-500 text-sm rounded"
        >
          <Receipt size={14} /> {t.viewInvoice}
          <ArrowRight size={14} />
        </Link>
      )}
    </main>
  )
}
