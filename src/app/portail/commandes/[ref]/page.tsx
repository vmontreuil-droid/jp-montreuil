import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Lock, Receipt, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  getMyShopOrderByReference,
  listMyShopOrderItems,
} from '@/lib/shop/customer-portal'
import {
  getOrderStatusLabels,
  ORDER_STATUS_COLORS,
} from '@/lib/shop/orders'
import { getShopLocale } from '@/lib/shop/locale'
import { getDictionary } from '@/i18n/dictionaries'

export const dynamic = 'force-dynamic'

/**
 * /portail/commandes/[ref] — session-based order tracking voor
 * ingelogde klanten. Vervangt het oude `?email=…` patroon van
 * /shop/portail/commande/[ref] (dat blijft bestaan voor
 * niet-ingelogde klanten via de bevestigingsmail-link).
 */
export default async function PortailOrderDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const { ref } = await params
  const locale = await getShopLocale()
  const t = getDictionary(locale).boutique.commande

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    redirect(`/portail/login?next=${encodeURIComponent(`/portail/commandes/${ref}`)}`)
  }

  const order = await getMyShopOrderByReference(user.email, ref)
  if (!order) notFound()

  const items = await listMyShopOrderItems(order.id)
  const statusLabels = getOrderStatusLabels(t)

  const intlLoc = locale === 'nl' ? 'nl-BE' : 'fr-BE'
  const fmtEur = new Intl.NumberFormat(intlLoc, {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  })
  const formatPrice = (cents: number) => fmtEur.format(cents / 100)

  const addr = (order.shipping_address ?? {}) as Record<string, string>
  const isCanLookFinished = order.status === 'paid' || order.status === 'shipped' || order.status === 'fulfilled'

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <Link
        href="/portail"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink)"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t.backLink}
      </Link>

      <header>
        <p className="text-xs text-(--color-stone) uppercase tracking-widest mb-1">{t.reference}</p>
        <h1 className="text-3xl font-mono text-(--color-ink)">{order.reference}</h1>
        <p className="text-sm text-(--color-charcoal) mt-2">
          {t.orderedOn} {new Date(order.created_at).toLocaleDateString(intlLoc, { dateStyle: 'long' })}
        </p>
        <span className={`inline-block mt-3 px-2.5 py-1 text-xs ${ORDER_STATUS_COLORS[order.status]}`}>
          {statusLabels[order.status]}
        </span>
      </header>

      {order.status === 'pending' && order.mollie_checkout_url && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-amber-900">
            {t.pendingAlert}
          </p>
          <a
            href={order.mollie_checkout_url}
            className="inline-flex items-center gap-2 px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm rounded"
          >
            <Lock size={14} /> {t.payNow}
          </a>
        </div>
      )}

      <section className="bg-(--color-paper) border border-(--color-frame) p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-3">{t.articles}</h2>
        <ul className="divide-y divide-(--color-frame) text-sm">
          {items.map((it) => (
            <li key={it.id} className="py-2 flex justify-between gap-3">
              <span className="text-(--color-ink)">
                {it.title}
                <span className="text-xs text-(--color-stone)"> × {it.quantity}</span>
              </span>
              <span className="font-medium tabular-nums text-(--color-ink)">
                {formatPrice(it.unit_price_cents * it.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-(--color-frame) mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-(--color-stone)">
            <span className="inline-flex items-center gap-1.5"><Truck size={12} /> {t.shippingFees}</span>
            <span className="tabular-nums">
              {order.shipping_cents > 0 ? formatPrice(order.shipping_cents) : t.free}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-(--color-frame)">
            <span className="text-sm uppercase tracking-widest text-(--color-stone)">{t.total}</span>
            <span className="text-2xl font-semibold tabular-nums text-(--color-ink)">
              {formatPrice(order.amount_cents)}
            </span>
          </div>
        </div>
      </section>

      {(order.is_b2b || order.company_name || order.vat_number) && (
        <section className="bg-(--color-paper) border border-(--color-frame) p-5 text-sm">
          <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-2">
            {t.b2bSection}
          </h2>
          {order.company_name && <p className="font-medium text-(--color-ink)">{order.company_name}</p>}
          {order.vat_number && (
            <p className="text-(--color-charcoal) font-mono text-xs mt-1">
              {t.vatLabel} : {order.vat_number}
              {order.vat_validated_at && (
                <span className="ml-2 text-emerald-700">{t.viesVerified}</span>
              )}
            </p>
          )}
        </section>
      )}

      {order.shipping_address && (
        <section className="bg-(--color-paper) border border-(--color-frame) p-5 text-sm">
          <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-2">{t.shipping}</h2>
          <p className="font-medium text-(--color-ink)">{order.full_name}</p>
          <p className="text-(--color-charcoal)">{order.email}</p>
          <address className="not-italic text-(--color-charcoal) mt-2 leading-relaxed">
            {addr.street}<br />
            {addr.country ? `${addr.country} - ` : ''}
            {addr.postal_code} {addr.city}
          </address>
          {order.tracking_number && (
            <p className="mt-3 text-xs text-(--color-stone)">
              {t.tracking} : <span className="font-mono text-(--color-ink)">{order.tracking_number}</span>
              {order.tracking_carrier && <> ({order.tracking_carrier})</>}
            </p>
          )}
        </section>
      )}

      {isCanLookFinished && (
        <Link
          href={`/portail/commandes/${order.reference}/facture`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm rounded"
        >
          <Receipt size={14} /> {t.viewInvoice}
        </Link>
      )}
    </main>
  )
}
