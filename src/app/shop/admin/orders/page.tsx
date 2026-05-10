import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShoppingCart, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listShopOrders, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/shop/orders'

const fmt = new Intl.NumberFormat('fr-BE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
})
const formatPrice = (cents: number) => fmt.format(cents / 100)

export default async function ShopOrdersAdminPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login?next=/shop/admin/orders')

  const orders = await listShopOrders()

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/shop/admin" className="text-stone-500 hover:text-stone-900 inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Admin
        </Link>
        <span className="text-stone-300">/</span>
        <span className="text-stone-900">Bestellingen</span>
      </div>

      <header>
        <h1 className="text-3xl font-semibold inline-flex items-center gap-2">
          <ShoppingCart size={24} /> Bestellingen
        </h1>
        <p className="text-sm text-stone-600">{orders.length} bestelling{orders.length === 1 ? '' : 'en'}</p>
      </header>

      {orders.length === 0 ? (
        <p className="text-center text-stone-500 py-10">Geen bestellingen.</p>
      ) : (
        <div className="bg-white border border-stone-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50">
              <tr className="text-left text-xs text-stone-500 uppercase tracking-wider">
                <th className="p-3">Référence</th>
                <th className="p-3">Client</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="p-3">
                    <Link href={`/shop/admin/orders/${o.id}`} className="font-mono text-stone-900 hover:underline">
                      {o.reference}
                    </Link>
                  </td>
                  <td className="p-3">
                    {o.full_name}
                    <p className="text-xs text-stone-500">{o.email}</p>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 text-xs ${ORDER_STATUS_COLORS[o.status]}`}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="p-3 text-right font-medium tabular-nums">{formatPrice(o.amount_cents)}</td>
                  <td className="p-3 text-xs text-stone-500">
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
