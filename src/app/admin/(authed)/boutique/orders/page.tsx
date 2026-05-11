import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShoppingCart, ArrowLeft, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listShopOrders, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/shop/orders'

const fmt = new Intl.NumberFormat('fr-BE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
})
const formatPrice = (cents: number) => fmt.format(cents / 100)

export default async function ShopOrdersAdminPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login?next=/admin/boutique/orders')

  const orders = await listShopOrders()

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Admin
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Commandes</span>
      </div>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
            <ShoppingCart size={24} /> Commandes
          </h1>
          <p className="text-sm text-(--color-charcoal)">{orders.length} commande{orders.length === 1 ? '' : 's'}</p>
        </div>
        {orders.length > 0 && (
          <a
            href="/api/admin/shop-orders-csv"
            download
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) text-(--color-charcoal) hover:text-(--color-bronze) text-xs uppercase tracking-[0.2em] transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        )}
      </header>

      {orders.length === 0 ? (
        <p className="text-center text-(--color-stone) py-10">Aucune commande.</p>
      ) : (
        <div className="bg-(--color-paper) border border-(--color-frame) rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-(--color-frame) bg-(--color-canvas)">
              <tr className="text-left text-xs text-(--color-stone) uppercase tracking-wider">
                <th className="p-3">Référence</th>
                <th className="p-3">Client</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-(--color-frame)/60 hover:bg-(--color-canvas)">
                  <td className="p-3">
                    <Link href={`/admin/boutique/orders/${o.id}`} className="font-mono text-(--color-ink) hover:underline">
                      {o.reference}
                    </Link>
                  </td>
                  <td className="p-3">
                    {o.full_name}
                    <p className="text-xs text-(--color-stone)">{o.email}</p>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 text-xs ${ORDER_STATUS_COLORS[o.status]}`}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="p-3 text-right font-medium tabular-nums">{formatPrice(o.amount_cents)}</td>
                  <td className="p-3 text-xs text-(--color-stone)">
                    {new Date(o.created_at).toLocaleDateString('fr-BE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
