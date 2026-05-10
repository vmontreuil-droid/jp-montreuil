import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Settings,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Image as ImageIcon,
  Layers,
  AlertCircle,
  TrendingUp,
  Eye,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { checkShopHealth } from '@/lib/shop/health'
import { shopPhotoUrl } from '@/lib/shop/photo-url'

/**
 * /admin/boutique — voorlopig dashboard. Vereist een ingelogde user
 * (gebruikt dezelfde Supabase auth als de rest van jp-montreuil).
 *
 * Toont enkel scaffolding: welke modules nog geïmplementeerd moeten
 * worden, met aantallen uit het shop-schema waar al data is.
 */
export default async function ShopAdminPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login?next=/admin/boutique')

  const health = await checkShopHealth()

  // KPI's laatste 30 dagen
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  let kpiRevenue30d = 0
  let kpiOrders30d = 0
  let kpiAov30d = 0
  let kpiPendingBons = 0
  try {
    const shopSb = createShopAdminClient()
    const [{ data: paidOrders }, { count: bonsCount }] = await Promise.all([
      shopSb.from('orders')
        .select('amount_cents')
        .in('status', ['paid', 'shipped', 'fulfilled'])
        .gte('created_at', since),
      shopSb.from('supplier_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ])
    kpiOrders30d = (paidOrders ?? []).length
    kpiRevenue30d = ((paidOrders ?? []) as { amount_cents: number }[])
      .reduce((sum, o) => sum + o.amount_cents, 0)
    kpiAov30d = kpiOrders30d > 0 ? Math.round(kpiRevenue30d / kpiOrders30d) : 0
    kpiPendingBons = bonsCount ?? 0
  } catch {
    // negeer
  }

  const fmtEur = new Intl.NumberFormat('fr-BE', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 0,
  })

  // Top photos — meest bekeken in de laatste 30 dagen, op basis van
  // shop_photo_view events. Stilte als analytics nog leeg is.
  let topPhotos: Array<{
    id: string; slug: string; title: string | null; storage_path: string; views: number
  }> = []
  try {
    const admin = createAdminClient()
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const { data: events } = await admin
      .from('analytics_events')
      .select('shop_photo_id')
      .eq('event_type', 'shop_photo_view')
      .gte('created_at', since)
      .not('shop_photo_id', 'is', null)
      .limit(2000)
    const counts = new Map<string, number>()
    for (const ev of (events ?? []) as { shop_photo_id: string | null }[]) {
      if (!ev.shop_photo_id) continue
      counts.set(ev.shop_photo_id, (counts.get(ev.shop_photo_id) ?? 0) + 1)
    }
    const topIds = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id)
    if (topIds.length) {
      const shopSb = createShopAdminClient()
      const { data: photos } = await shopSb
        .from('photos').select('id, slug, title, storage_path').in('id', topIds)
      const byId = new Map((photos ?? []).map((p: { id: string; slug: string; title: string | null; storage_path: string }) => [p.id, p]))
      topPhotos = topIds
        .map((id) => {
          const p = byId.get(id)
          if (!p) return null
          return { ...p, views: counts.get(id) ?? 0 }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    }
  } catch {
    // negeer
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) mb-1 inline-flex items-center gap-2">
          <Settings size={24} />
          Webshop · Administration
        </h1>
        <p className="text-sm text-(--color-charcoal)">
          Beheer producten, bestellingen, klanten en drukkerijen.
        </p>
      </header>

      {/* KPI's — laatste 30 dagen */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3 inline-flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-(--color-bronze)" />
          30 derniers jours
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Revenu" value={fmtEur.format(kpiRevenue30d / 100)} />
          <Kpi label="Commandes" value={kpiOrders30d} />
          <Kpi
            label="Panier moyen"
            value={kpiOrders30d > 0 ? fmtEur.format(kpiAov30d / 100) : '—'}
          />
          <Kpi label="Bons à envoyer" value={kpiPendingBons} accent={kpiPendingBons > 0} />
        </ul>
      </section>

      {/* Top photos — laatste 30 dagen */}
      {topPhotos.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3 inline-flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-(--color-bronze)" />
            Top photos · 30 derniers jours
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {topPhotos.map((p, i) => (
              <li key={p.id}>
                <Link
                  href={`/admin/boutique/photos/${p.id}`}
                  className="group block bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) overflow-hidden transition-colors relative"
                >
                  <div className="aspect-square bg-(--color-canvas) overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shopPhotoUrl(p.storage_path)}
                      alt={p.title ?? p.slug}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                    <span className="absolute top-2 left-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-(--color-bronze) text-white text-xs font-bold">
                      {i + 1}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-(--color-ink) truncate font-medium">
                      {p.title ?? p.slug}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-(--color-stone)">
                      <Eye className="w-3 h-3" />
                      {p.views} {p.views === 1 ? 'vue' : 'vues'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!health.ok && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
          <p className="inline-flex items-center gap-2 font-medium">
            <AlertCircle size={16} />
            Configuration incomplète
          </p>
          <p className="text-sm">{health.message}</p>
          <ol className="text-sm list-decimal pl-5 space-y-1">
            <li>
              Exécutez <code className="bg-amber-100 px-1 rounded">supabase/migrations/0011_create_shop_schema.sql</code>
              {' '}dans l&apos;éditeur SQL de Supabase.
            </li>
            <li>
              Allez dans <strong>Project Settings → API → Data API Settings → Exposed schemas</strong> et
              cochez <code className="bg-amber-100 px-1 rounded">shop</code>.
            </li>
            <li>Cliquez sur <strong>Save</strong> → attendez ~30 s que PostgREST recharge le schéma.</li>
          </ol>
        </div>
      )}

      <section>
        <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-3">
          Modules
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ModuleCard
            icon={ImageIcon}
            label="Photos"
            count={health.counts.photos}
            href="/admin/boutique/photos"
            description="Photos pour le configurateur d'impression"
          />
          <ModuleCard
            icon={Package}
            label="Produits"
            count={health.counts.products}
            href="/admin/boutique/products"
            description="Produits classiques + variantes"
          />
          <ModuleCard
            icon={Layers}
            label="Configurateur"
            count={null}
            href="/admin/boutique/boutique"
            description="Matériaux, formats et matrice de prix"
          />
          <ModuleCard
            icon={ShoppingCart}
            label="Commandes"
            count={health.counts.orders}
            href="/admin/boutique/orders"
            description="Commandes clients avec workflow de statut"
          />
          <ModuleCard
            icon={Truck}
            label="Frais de port"
            count={null}
            href="/admin/boutique/shipping"
            description="Zones de livraison + tarifs + seuils gratuits"
          />
          <ModuleCard
            icon={Users}
            label="Clients"
            count={health.counts.customers}
            href="/admin/boutique/customers"
            description="Liste agrégée des acheteurs"
          />
        </div>
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
      className={`bg-(--color-paper) border border-(--color-frame) rounded-lg p-5 ${
        disabled ? 'opacity-60' : 'hover:border-(--color-bronze) transition-colors'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} className="text-(--color-charcoal)" />
        {count !== null && (
          <span className="text-2xl font-semibold tabular-nums">{count}</span>
        )}
      </div>
      <p className="font-medium">{label}</p>
      <p className="text-xs text-(--color-stone) mt-1">{description}</p>
      {disabled && (
        <p className="text-[10px] text-(--color-stone)/70 uppercase tracking-wider mt-3">
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

function Kpi({
  label, value, accent,
}: {
  label: string
  value: number | string
  accent?: boolean
}) {
  return (
    <li className={`bg-(--color-paper) border p-4 ${accent ? 'border-amber-300' : 'border-(--color-frame)'}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">{label}</p>
      <p className={`font-[family-name:var(--font-display)] text-2xl tabular-nums ${accent ? 'text-amber-700' : 'text-(--color-ink)'}`}>
        {value}
      </p>
    </li>
  )
}
