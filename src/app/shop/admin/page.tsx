import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Settings,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { checkShopHealth } from '@/lib/shop/health'

/**
 * /shop/admin — voorlopig dashboard. Vereist een ingelogde user
 * (gebruikt dezelfde Supabase auth als de rest van jp-montreuil).
 *
 * Toont enkel scaffolding: welke modules nog geïmplementeerd moeten
 * worden, met aantallen uit het shop-schema waar al data is.
 */
export default async function ShopAdminPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login?next=/shop/admin')

  const health = await checkShopHealth()

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold mb-1 inline-flex items-center gap-2">
          <Settings size={24} />
          Webshop · Administration
        </h1>
        <p className="text-sm text-stone-600">
          Beheer producten, bestellingen, klanten en drukkerijen.
        </p>
      </header>

      {!health.ok && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
          <p className="inline-flex items-center gap-2 font-medium">
            <AlertCircle size={16} />
            Setup niet compleet
          </p>
          <p className="text-sm">{health.message}</p>
          <ol className="text-sm list-decimal pl-5 space-y-1">
            <li>
              Run <code className="bg-amber-100 px-1 rounded">supabase/migrations/0011_create_shop_schema.sql</code> in
              de Supabase SQL Editor.
            </li>
            <li>
              Ga naar <strong>Project Settings → API → Data API Settings → Exposed schemas</strong> en
              vink <code className="bg-amber-100 px-1 rounded">shop</code> aan.
            </li>
            <li>Klik <strong>Save</strong> → wacht ~30s tot PostgREST de schema reload.</li>
          </ol>
        </div>
      )}

      <section>
        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500 mb-3">
          Modules
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ModuleCard
            icon={ImageIcon}
            label="Photos"
            count={health.counts.photos}
            href="/shop/admin/photos"
            description="Foto's voor de print-on-demand configurator"
            disabled
          />
          <ModuleCard
            icon={Package}
            label="Producten"
            count={health.counts.products}
            href="/shop/admin/products"
            description="Klassieke producten + configurator-matrix"
            disabled
          />
          <ModuleCard
            icon={ShoppingCart}
            label="Bestellingen"
            count={health.counts.orders}
            href="/shop/admin/orders"
            description="Klant-orders met status-flow"
            disabled
          />
          <ModuleCard
            icon={Users}
            label="Klanten"
            count={health.counts.customers}
            href="/shop/admin/customers"
            description="Klantenfiches + B2B-gegevens"
            disabled
          />
          <ModuleCard
            icon={Truck}
            label="Drukkerijen"
            count={null}
            href="/shop/admin/suppliers"
            description="Suppliers + auto bons de production"
            disabled
          />
          <ModuleCard
            icon={Settings}
            label="Instellingen"
            count={null}
            href="/shop/admin/settings"
            description="Verzendzones, betalingen, branding"
            disabled
          />
        </div>
        <p className="text-xs text-stone-400 mt-3">
          De modules zijn nog niet geïmplementeerd in deze scaffolding-commit.
          Volgende stap: producten + configurator porten uit allardphilippe.
        </p>
      </section>
    </main>
  )
}

function ModuleCard({
  icon: Icon,
  label,
  count,
  href,
  description,
  disabled,
}: {
  icon: typeof Settings
  label: string
  count: number | null
  href: string
  description: string
  disabled?: boolean
}) {
  const inner = (
    <div
      className={`bg-white border border-stone-200 rounded-lg p-5 ${
        disabled ? 'opacity-60' : 'hover:border-stone-400 transition-colors'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} className="text-stone-600" />
        {count !== null && (
          <span className="text-2xl font-semibold tabular-nums">{count}</span>
        )}
      </div>
      <p className="font-medium">{label}</p>
      <p className="text-xs text-stone-500 mt-1">{description}</p>
      {disabled && (
        <p className="text-[10px] text-stone-400 uppercase tracking-wider mt-3">
          Komt eraan
        </p>
      )}
    </div>
  )

  return disabled ? (
    inner
  ) : (
    <Link href={href} className="block">
      {inner}
    </Link>
  )
}
