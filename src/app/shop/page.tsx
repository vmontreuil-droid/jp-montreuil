import Link from 'next/link'
import { ShoppingBag, Settings, AlertCircle, CheckCircle2 } from 'lucide-react'
import { checkShopHealth } from '@/lib/shop/health'

/**
 * /shop landing — voorlopige placeholder. Toont de status van de
 * webshop-module (schema bereikbaar, aantal items per tabel) en linkt
 * naar de admin-zone. Pas zinvol als publieke landing zodra producten
 * beheerd kunnen worden via /shop/admin.
 */
export default async function ShopHomePage() {
  const health = await checkShopHealth()

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-center space-y-8">
      <div>
        <ShoppingBag size={32} className="mx-auto text-stone-400 mb-4" />
        <h1 className="text-3xl font-semibold mb-2">Webshop</h1>
        <p className="text-stone-600">
          Module geport vanuit allardphilippe. Volledig geïsoleerd via PostgreSQL
          schema <code className="bg-stone-100 px-1 py-0.5 rounded text-sm">shop</code> —
          geen interferentie met de bestaande jp-montreuil tabellen.
        </p>
      </div>

      <div
        className={`p-4 rounded-lg border ${
          health.ok
            ? 'bg-green-50 border-green-200 text-green-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <p className="inline-flex items-center gap-2 font-medium">
          {health.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {health.message}
        </p>
        {health.ok && (
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            <Stat label="Photos" value={health.counts.photos} />
            <Stat label="Products" value={health.counts.products} />
            <Stat label="Customers" value={health.counts.customers} />
            <Stat label="Orders" value={health.counts.orders} />
          </ul>
        )}
      </div>

      <div className="flex justify-center">
        <Link
          href="/shop/admin"
          className="inline-flex items-center gap-2 px-5 py-3 bg-stone-900 text-white hover:bg-stone-800 transition-colors text-sm tracking-wide rounded"
        >
          <Settings size={16} />
          Naar admin
        </Link>
      </div>

      <p className="text-xs text-stone-400">
        Volgende stappen: producten + configurator-matrix porten →
        publieke /shop/boutique → cart + Mollie checkout.
      </p>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <li className="bg-white border border-stone-200 rounded p-3">
      <p className="text-xs text-stone-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value ?? '—'}</p>
    </li>
  )
}
