import Link from 'next/link'
import { ArrowLeft, Users, Mail, Phone, Building2, BadgeCheck, ShoppingBag } from 'lucide-react'
import { createShopAdminClient } from '@/lib/shop/supabase'
import type { ShopCustomer } from '@/lib/shop/customer-portal'
import type { ShopOrder } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'

const fmt = new Intl.NumberFormat('fr-BE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
})
const formatPrice = (cents: number) => fmt.format(cents / 100)

const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium' })

type CustomerWithStats = ShopCustomer & {
  orderCount: number
  lifetimeCents: number
  lastOrderAt: string | null
}

export default async function ShopCustomersPage() {
  const sb = createShopAdminClient()

  // Customers + alle paid/shipped/fulfilled orders parallel
  const [{ data: customersRaw }, { data: ordersRaw }] = await Promise.all([
    sb.from('customers').select('*').order('updated_at', { ascending: false }),
    sb.from('orders').select('email, amount_cents, status, created_at')
      .in('status', ['paid', 'shipped', 'fulfilled']),
  ])

  // Aggregeer orders per email-lower
  const stats = new Map<string, { count: number; lifetime: number; last: string }>()
  for (const o of (ordersRaw ?? []) as Pick<ShopOrder, 'email' | 'amount_cents' | 'created_at'>[]) {
    const key = (o.email ?? '').toLowerCase()
    const cur = stats.get(key) ?? { count: 0, lifetime: 0, last: '' }
    cur.count += 1
    cur.lifetime += o.amount_cents
    if (o.created_at > cur.last) cur.last = o.created_at
    stats.set(key, cur)
  }

  const customers: CustomerWithStats[] = ((customersRaw ?? []) as ShopCustomer[]).map((c) => {
    const s = stats.get(c.email.toLowerCase())
    return {
      ...c,
      orderCount: s?.count ?? 0,
      lifetimeCents: s?.lifetime ?? 0,
      lastOrderAt: s?.last || null,
    }
  })

  // Sort op lifetime spend desc
  customers.sort((a, b) => b.lifetimeCents - a.lifetimeCents)

  const totalRevenue = customers.reduce((sum, c) => sum + c.lifetimeCents, 0)
  const b2bCount = customers.filter((c) => c.is_b2b).length

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Boutique
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Clients</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <Users className="w-6 h-6 text-(--color-bronze)" />
          Clients boutique
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-1">
          Liste agrégée des acheteurs (auto-créés via checkout) + leur historique.
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Clients" value={customers.length} />
        <Stat label="Revenu total" value={formatPrice(totalRevenue)} />
        <Stat label="B2B" value={b2bCount} />
      </div>

      {customers.length === 0 ? (
        <p className="bg-(--color-paper) border border-(--color-frame) p-12 text-center text-(--color-stone)">
          Aucun client encore.
        </p>
      ) : (
        <div className="bg-(--color-paper) border border-(--color-frame) overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-(--color-frame) bg-(--color-canvas)/40">
              <tr className="text-left text-xs text-(--color-stone) uppercase tracking-widest">
                <th className="p-3">Client</th>
                <th className="p-3 w-32 text-right">Lifetime</th>
                <th className="p-3 w-20 text-right">Cmds</th>
                <th className="p-3 w-32">Dernière</th>
                <th className="p-3 w-20 text-center">B2B</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.email} className="border-b border-(--color-frame)/60 hover:bg-(--color-canvas)/20">
                  <td className="p-3">
                    {c.full_name && (
                      <p className="text-(--color-ink) font-medium">{c.full_name}</p>
                    )}
                    {c.company && (
                      <p className="text-xs text-(--color-charcoal) inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {c.company}
                      </p>
                    )}
                    <a href={`mailto:${c.email}`} className="text-xs text-(--color-bronze) inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {c.email}
                    </a>
                    {c.phone && (
                      <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="text-xs text-(--color-stone) inline-flex items-center gap-1 ml-3">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </a>
                    )}
                  </td>
                  <td className="p-3 text-right font-medium tabular-nums text-(--color-ink)">
                    {c.lifetimeCents > 0 ? formatPrice(c.lifetimeCents) : <span className="text-(--color-stone)/60">—</span>}
                  </td>
                  <td className="p-3 text-right tabular-nums text-(--color-charcoal)">
                    {c.orderCount > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-(--color-stone)" />
                        {c.orderCount}
                      </span>
                    ) : (
                      <span className="text-(--color-stone)/60">0</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-(--color-stone)">
                    {c.lastOrderAt ? dateFmt.format(new Date(c.lastOrderAt)) : '—'}
                  </td>
                  <td className="p-3 text-center">
                    {c.is_b2b ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        {c.vat_validated_at && <span className="text-[10px]">VIES</span>}
                      </span>
                    ) : (
                      <span className="text-(--color-stone)/40">—</span>
                    )}
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

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-(--color-paper) border border-(--color-frame) p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) tabular-nums">{value}</p>
    </div>
  )
}
