import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Truck, Save, Building2, BadgeCheck, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  getShopOrderById,
  listShopOrderItems,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  type OrderStatus,
} from '@/lib/shop/orders'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { shopPhotoUrl } from '@/lib/shop/photo-url'
import { updateOrderStatus, setTracking } from '../actions'

const fmt = new Intl.NumberFormat('fr-BE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
})
const formatPrice = (cents: number) => fmt.format(cents / 100)

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ['paid', 'canceled'],
  paid: ['shipped', 'refunded'],
  shipped: ['fulfilled', 'refunded'],
}

export default async function ShopOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  const { id } = await params
  const order = await getShopOrderById(id)
  if (!order) notFound()
  const items = await listShopOrderItems(order.id)
  const addr = (order.shipping_address ?? {}) as Record<string, string>
  // Hydrate photo storage_paths voor thumbnails naast elke order-line
  const photoIds = items.map((i) => i.photo_id).filter((x): x is string => !!x)
  const shopSb = createShopAdminClient()
  const { data: photoRows } = photoIds.length
    ? await shopSb.from('photos').select('id, storage_path, bucket').in('id', photoIds)
    : { data: [] as Array<{ id: string; storage_path: string; bucket: string }> }
  const photoById = new Map((photoRows ?? []).map((p) => [p.id, p]))

  const transitions = NEXT_STATUS[order.status] ?? []

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <Link
        href="/admin/boutique/orders"
        className="inline-flex items-center gap-2 text-sm text-(--color-stone) hover:text-(--color-ink)"
      >
        <ArrowLeft size={14} /> Bestellingen
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-(--color-stone) uppercase tracking-widest">Référence</p>
          <h1 className="text-3xl font-mono text-(--color-ink)">{order.reference}</h1>
          <p className="text-sm text-(--color-stone) mt-2">
            {new Date(order.created_at).toLocaleString('fr-BE')}
          </p>
        </div>
        <span className={`inline-block px-3 py-1 text-sm ${ORDER_STATUS_COLORS[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </header>

      {/* Status-acties */}
      {transitions.length > 0 && (
        <section className="bg-(--color-paper) border border-(--color-frame) rounded p-5">
          <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-3">
            Acties
          </h2>
          <div className="flex flex-wrap gap-2">
            {transitions.map((s) => (
              <form key={s} action={updateOrderStatus.bind(null, order.id, s)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm rounded"
                >
                  Marquer comme {ORDER_STATUS_LABELS[s].toLowerCase()}
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      {/* Klant + adres */}
      <section className="grid sm:grid-cols-2 gap-4">
        <div className="bg-(--color-paper) border border-(--color-frame) rounded p-5">
          <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-2">Client</h2>
          {order.is_b2b && (
            <p className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-2 bg-(--color-bronze) text-white text-[10px] uppercase tracking-widest rounded-sm">
              <Building2 size={11} /> B2B
            </p>
          )}
          {order.company_name && (
            <p className="font-semibold text-(--color-ink)">{order.company_name}</p>
          )}
          <p className={order.company_name ? 'text-sm text-(--color-charcoal)' : 'font-medium'}>{order.full_name}</p>
          <p className="text-sm text-(--color-charcoal)">
            <a href={`mailto:${order.email}`} className="hover:text-(--color-ink)">{order.email}</a>
          </p>
          {order.vat_number && (
            <p className="mt-2 text-xs font-mono text-(--color-charcoal) inline-flex items-center gap-1.5">
              TVA : {order.vat_number}
              {order.vat_validated_at ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-700">
                  <BadgeCheck size={11} /> VIES
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-amber-700">
                  <AlertCircle size={11} /> non validé
                </span>
              )}
            </p>
          )}
          {order.vat_company_name && order.vat_company_name !== order.company_name && (
            <p className="text-xs text-(--color-stone) mt-1">
              VIES retourne : <em>{order.vat_company_name}</em>
            </p>
          )}
        </div>
        <div className="bg-(--color-paper) border border-(--color-frame) rounded p-5">
          <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-2">Livraison</h2>
          <address className="not-italic text-sm text-(--color-charcoal) leading-relaxed">
            {addr.street && <div>{addr.street}</div>}
            {(addr.postal_code || addr.city) && (
              <div>
                {addr.country ? `${addr.country} - ` : ''}
                {[addr.postal_code, addr.city].filter(Boolean).join(' ')}
              </div>
            )}
          </address>
        </div>
      </section>

      {/* Items */}
      <section className="bg-(--color-paper) border border-(--color-frame) rounded p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-3">Articles</h2>
        <ul className="divide-y divide-stone-200 text-sm">
          {items.map((it) => {
            const photo = it.photo_id ? photoById.get(it.photo_id) : null
            return (
              <li key={it.id} className="py-2.5 flex items-start gap-3">
                {photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={shopPhotoUrl(photo.storage_path, photo.bucket)}
                    alt=""
                    className="w-12 h-12 object-cover rounded-sm border border-(--color-frame) shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 bg-(--color-frame)/40 rounded-sm border border-(--color-frame) shrink-0" aria-hidden />
                )}
                <span className="flex-1 min-w-0">
                  <span className="block">{it.title}</span>
                  <span className="text-xs text-(--color-stone)">× {it.quantity}</span>
                </span>
                <span className="font-medium tabular-nums shrink-0">{formatPrice(it.unit_price_cents * it.quantity)}</span>
              </li>
            )
          })}
        </ul>
        <div className="border-t border-(--color-frame) mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-(--color-stone)">
            <span>Frais de port</span>
            <span className="tabular-nums">
              {order.shipping_cents > 0 ? formatPrice(order.shipping_cents) : 'gratuit'}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-(--color-frame)">
            <span className="text-sm uppercase tracking-widest text-(--color-stone)">Total</span>
            <span className="text-2xl font-semibold tabular-nums">{formatPrice(order.amount_cents)}</span>
          </div>
        </div>
      </section>

      {/* Tracking */}
      <section className="bg-(--color-paper) border border-(--color-frame) rounded p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-3 inline-flex items-center gap-2">
          <Truck size={14} /> Tracking
        </h2>
        <form action={setTracking.bind(null, order.id)} className="grid grid-cols-2 gap-3 items-end">
          <label className="block">
            <span className="text-xs text-(--color-charcoal) mb-1 block">Transporteur</span>
            <input
              type="text"
              name="carrier"
              defaultValue={order.tracking_carrier ?? ''}
              placeholder="bpost, DPD, …"
              className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) rounded text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-(--color-charcoal) mb-1 block">Numéro</span>
            <input
              type="text"
              name="number"
              defaultValue={order.tracking_number ?? ''}
              className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) rounded text-sm font-mono"
            />
          </label>
          <div className="col-span-2">
            <button type="submit" className="inline-flex items-center gap-2 px-3 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm rounded">
              <Save size={14} /> Enregistrer
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
