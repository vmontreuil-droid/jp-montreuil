import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Truck, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  getShopOrderById,
  listShopOrderItems,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  type OrderStatus,
} from '@/lib/shop/orders'
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

  const transitions = NEXT_STATUS[order.status] ?? []

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <Link
        href="/shop/admin/orders"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft size={14} /> Bestellingen
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-widest">Référence</p>
          <h1 className="text-3xl font-mono">{order.reference}</h1>
          <p className="text-sm text-stone-500 mt-2">
            {new Date(order.created_at).toLocaleString('fr-BE')}
          </p>
        </div>
        <span className={`inline-block px-3 py-1 text-sm ${ORDER_STATUS_COLORS[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </header>

      {/* Status-acties */}
      {transitions.length > 0 && (
        <section className="bg-white border border-stone-200 rounded p-5">
          <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500 mb-3">
            Acties
          </h2>
          <div className="flex flex-wrap gap-2">
            {transitions.map((s) => (
              <form key={s} action={updateOrderStatus.bind(null, order.id, s)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded"
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
        <div className="bg-white border border-stone-200 rounded p-5">
          <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500 mb-2">Client</h2>
          <p className="font-medium">{order.full_name}</p>
          <p className="text-sm text-stone-600">
            <a href={`mailto:${order.email}`} className="hover:text-stone-900">{order.email}</a>
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded p-5">
          <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500 mb-2">Livraison</h2>
          <address className="not-italic text-sm text-stone-700 leading-relaxed">
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
      <section className="bg-white border border-stone-200 rounded p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500 mb-3">Articles</h2>
        <ul className="divide-y divide-stone-200 text-sm">
          {items.map((it) => (
            <li key={it.id} className="py-2 flex justify-between gap-3">
              <span>
                {it.title}
                <span className="text-xs text-stone-500"> × {it.quantity}</span>
              </span>
              <span className="font-medium tabular-nums">{formatPrice(it.unit_price_cents * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-stone-200 mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-stone-500">
            <span>Frais de port</span>
            <span className="tabular-nums">
              {order.shipping_cents > 0 ? formatPrice(order.shipping_cents) : 'gratuit'}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-stone-200">
            <span className="text-sm uppercase tracking-widest text-stone-500">Total</span>
            <span className="text-2xl font-semibold tabular-nums">{formatPrice(order.amount_cents)}</span>
          </div>
        </div>
      </section>

      {/* Tracking */}
      <section className="bg-white border border-stone-200 rounded p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500 mb-3 inline-flex items-center gap-2">
          <Truck size={14} /> Tracking
        </h2>
        <form action={setTracking.bind(null, order.id)} className="grid grid-cols-2 gap-3 items-end">
          <label className="block">
            <span className="text-xs text-stone-700 mb-1 block">Transporteur</span>
            <input
              type="text"
              name="carrier"
              defaultValue={order.tracking_carrier ?? ''}
              placeholder="bpost, DPD, …"
              className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-stone-700 mb-1 block">Numéro</span>
            <input
              type="text"
              name="number"
              defaultValue={order.tracking_number ?? ''}
              className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded text-sm font-mono"
            />
          </label>
          <div className="col-span-2">
            <button type="submit" className="inline-flex items-center gap-2 px-3 py-2 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded">
              <Save size={14} /> Enregistrer
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
