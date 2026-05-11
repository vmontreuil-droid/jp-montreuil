import Link from 'next/link'
import { ArrowLeft, FileText, Filter } from 'lucide-react'
import { createShopAdminClient } from '@/lib/shop/supabase'
import {
  listSupplierOrders,
  SUPPLIER_ORDER_STATUS_LABELS,
  SUPPLIER_ORDER_STATUS_COLORS,
  type SupplierOrderStatus,
} from '@/lib/shop/supplier-orders'
import { listSuppliers, type Supplier } from '@/lib/shop/suppliers'

export const dynamic = 'force-dynamic'

const FILTER_LABELS: Record<string, string> = {
  open: 'En cours',
  pending: SUPPLIER_ORDER_STATUS_LABELS.pending,
  sent: SUPPLIER_ORDER_STATUS_LABELS.sent,
  acked: SUPPLIER_ORDER_STATUS_LABELS.acked,
  in_production: SUPPLIER_ORDER_STATUS_LABELS.in_production,
  received_by_studio: SUPPLIER_ORDER_STATUS_LABELS.received_by_studio,
  cancelled: SUPPLIER_ORDER_STATUS_LABELS.cancelled,
  all: 'Toutes',
}

const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium' })

export default async function ProductionListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const filter = (sp.status ?? 'open') as keyof typeof FILTER_LABELS

  const [bons, suppliers] = await Promise.all([
    listSupplierOrders(filter === 'all' ? undefined : { status: filter as SupplierOrderStatus | 'open' }),
    listSuppliers(),
  ])

  // Lookup tabellen voor klant + foto in 1 query elk
  const sb = createShopAdminClient()
  const orderIds = [...new Set(bons.map((b) => b.order_id))]
  const itemIds = [...new Set(bons.map((b) => b.order_item_id))]
  const [{ data: orders }, { data: items }] = await Promise.all([
    orderIds.length
      ? sb.from('orders').select('id, reference, full_name, email').in('id', orderIds)
      : Promise.resolve({ data: [] as Array<{ id: string; reference: string; full_name: string; email: string }> }),
    itemIds.length
      ? sb.from('order_items').select('id, title, print_size_label, print_size_slug, print_media_slug, quantity, photo_id').in('id', itemIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; print_size_label: string | null; print_size_slug: string | null; print_media_slug: string | null; quantity: number; photo_id: string | null }> }),
  ])
  const orderById = new Map((orders ?? []).map((o) => [o.id, o]))
  const itemById = new Map((items ?? []).map((i) => [i.id, i]))
  const supplierById = new Map(suppliers.map((s: Supplier) => [s.id, s]))

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Boutique
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Bons de production</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <FileText className="w-6 h-6 text-(--color-bronze)" />
          Bons de production
        </h1>
        <p className="text-sm text-(--color-charcoal)">
          Une ligne par tirage envoyé à un imprimeur. Créées automatiquement quand une commande est marquée payée.
        </p>
      </header>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-(--color-stone)" />
        {(Object.keys(FILTER_LABELS) as Array<keyof typeof FILTER_LABELS>).map((k) => (
          <Link
            key={k}
            href={k === 'open' ? '/admin/boutique/production' : `/admin/boutique/production?status=${k}`}
            className={`inline-flex items-center px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
              filter === k
                ? 'bg-(--color-bronze) text-white border-(--color-bronze)'
                : 'bg-(--color-paper) border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-bronze)'
            }`}
          >
            {FILTER_LABELS[k]}
          </Link>
        ))}
      </div>

      {bons.length === 0 ? (
        <p className="bg-(--color-paper) border border-(--color-frame) p-12 text-center text-(--color-stone)">
          Aucun bon dans cette vue.
        </p>
      ) : (
        <div className="bg-(--color-paper) border border-(--color-frame) overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-(--color-frame) bg-(--color-canvas)/40">
              <tr className="text-left text-xs text-(--color-stone) uppercase tracking-widest">
                <th className="p-3">Statut</th>
                <th className="p-3">Commande</th>
                <th className="p-3">Tirage</th>
                <th className="p-3">Imprimeur</th>
                <th className="p-3 w-32">Créée</th>
              </tr>
            </thead>
            <tbody>
              {bons.map((bon) => {
                const order = orderById.get(bon.order_id)
                const item = itemById.get(bon.order_item_id)
                const supplier = bon.supplier_id ? supplierById.get(bon.supplier_id) : null
                return (
                  <tr key={bon.id} className="border-b border-(--color-frame)/60 hover:bg-(--color-canvas)/20">
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest ${SUPPLIER_ORDER_STATUS_COLORS[bon.status]}`}>
                        {SUPPLIER_ORDER_STATUS_LABELS[bon.status]}
                      </span>
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin/boutique/production/${bon.id}`}
                        className="text-(--color-ink) hover:text-(--color-bronze) font-mono text-xs"
                      >
                        {order?.reference ?? '—'}
                      </Link>
                      <p className="text-[11px] text-(--color-stone) mt-0.5 truncate">
                        {order?.full_name}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="text-(--color-ink) text-xs truncate max-w-xs">{item?.title}</p>
                      <p className="text-[10px] text-(--color-stone) mt-0.5">
                        {item?.print_media_slug ?? '—'} · {item?.print_size_label ?? item?.print_size_slug ?? '—'}
                        {item && ` × ${item.quantity}`}
                      </p>
                    </td>
                    <td className="p-3 text-xs">
                      {supplier ? (
                        <span className="text-(--color-ink)">{supplier.name}</span>
                      ) : (
                        <span className="text-amber-700">— à assigner</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-(--color-stone)">
                      {dateFmt.format(new Date(bon.created_at))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
