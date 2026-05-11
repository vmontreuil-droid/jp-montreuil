import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft, Send, Check, Hammer, PackageCheck, X, Save,
  ExternalLink, Truck, Calendar, AlertCircle,
} from 'lucide-react'
import { getSupplierOrderDetail, SUPPLIER_ORDER_STATUS_LABELS, SUPPLIER_ORDER_STATUS_COLORS } from '@/lib/shop/supplier-orders'
import { listSuppliers } from '@/lib/shop/suppliers'
import { shopPhotoUrl } from '@/lib/shop/photo-url'
import {
  sendToSupplierAction, changeStatusAction, reassignSupplierAction,
  updateNotesAction, setExternalRefAction,
} from '../actions'

export const dynamic = 'force-dynamic'

const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium', timeStyle: 'short' })

export default async function SupplierOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getSupplierOrderDetail(id)
  if (!detail) notFound()
  const { bon, supplier, order, item, photo } = detail
  const allSuppliers = await listSuppliers({ activeOnly: true })

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique/production" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Bons
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink) font-mono text-xs">{order.reference}</span>
      </div>

      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1">
            Bon de production
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink)">
            {item.title}
          </h1>
        </div>
        <span className={`inline-block px-3 py-1.5 text-xs uppercase tracking-widest ${SUPPLIER_ORDER_STATUS_COLORS[bon.status]}`}>
          {SUPPLIER_ORDER_STATUS_LABELS[bon.status]}
        </span>
      </header>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        {/* Left: specs + actions */}
        <div className="space-y-6">
          {/* Foto + specs */}
          <section className="bg-(--color-paper) border border-(--color-frame) overflow-hidden">
            {photo && (
              <div className="aspect-video bg-(--color-canvas) overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shopPhotoUrl(photo.storage_path)}
                  alt={photo.title ?? photo.slug}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <dl className="p-5 grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <Row label="Photo" value={photo?.title ?? photo?.slug ?? '—'} />
              <Row label="Slug" value={<span className="font-mono text-xs">{photo?.slug ?? '—'}</span>} />
              <Row label="Support" value={item.print_media_slug ?? '—'} />
              <Row label="Format" value={item.print_size_label ?? item.print_size_slug ?? '—'} />
              <Row label="Quantité" value={<strong>{item.quantity}</strong>} />
              <Row label="Prix unitaire" value={`${(item.unit_price_cents / 100).toFixed(2)} €`} />
            </dl>
          </section>

          {/* Status actions */}
          <section className="bg-(--color-paper) border border-(--color-frame) p-5 space-y-3">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">Actions</h2>

            {bon.status === 'pending' && (
              <>
                {!supplier && (
                  <p className="text-xs text-amber-700 inline-flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Assignez d&apos;abord un imprimeur ci-contre.
                  </p>
                )}
                <form action={sendToSupplierAction.bind(null, id)}>
                  <button
                    type="submit"
                    disabled={!supplier}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Envoyer à l&apos;imprimeur
                  </button>
                </form>
              </>
            )}

            {bon.status === 'sent' && (
              <form action={changeStatusAction.bind(null, id, 'acked', null)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs uppercase tracking-[0.2em]"
                >
                  <Check className="w-4 h-4" />
                  Marquer comme confirmée
                </button>
              </form>
            )}

            {bon.status === 'acked' && (
              <form action={changeStatusAction.bind(null, id, 'in_production', null)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white hover:bg-violet-700 text-xs uppercase tracking-[0.2em]"
                >
                  <Hammer className="w-4 h-4" />
                  Marquer en production
                </button>
              </form>
            )}

            {bon.status === 'in_production' && (
              <form action={changeStatusAction.bind(null, id, 'received_by_studio', null)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white hover:bg-emerald-800 text-xs uppercase tracking-[0.2em]"
                >
                  <PackageCheck className="w-4 h-4" />
                  Reçue à l&apos;atelier
                </button>
              </form>
            )}

            {(bon.status === 'received_by_studio' || bon.status === 'cancelled') && (
              <p className="text-sm text-(--color-stone) italic">Cycle terminé.</p>
            )}

            {bon.status !== 'cancelled' && bon.status !== 'received_by_studio' && (
              <form action={changeStatusAction.bind(null, id, 'cancelled', null)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-(--color-paper) border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs uppercase tracking-widest"
                >
                  <X className="w-3.5 h-3.5" />
                  Annuler ce bon
                </button>
              </form>
            )}
          </section>

          {/* External ref + notes */}
          <section className="bg-(--color-paper) border border-(--color-frame) p-5 space-y-4">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">Suivi interne</h2>
            <form action={setExternalRefAction.bind(null, id)} className="flex gap-2">
              <input
                type="text"
                name="external_ref"
                defaultValue={bon.external_ref ?? ''}
                placeholder="N° de commande imprimeur"
                className="flex-1 px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-sm focus:border-(--color-bronze) focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-widest"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
            </form>
            <form action={updateNotesAction.bind(null, id)} className="space-y-2">
              <textarea
                name="notes"
                defaultValue={bon.notes ?? ''}
                rows={4}
                placeholder="Délais, observations qualité, problèmes…"
                className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-widest"
              >
                <Save className="w-3.5 h-3.5" />
                Enregistrer notes
              </button>
            </form>
          </section>
        </div>

        {/* Right sidebar: imprimeur + klant + timeline */}
        <aside className="space-y-4">
          {/* Imprimeur assignment */}
          <section className="bg-(--color-paper) border border-(--color-frame) p-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">Imprimeur</h2>
            {bon.status === 'pending' ? (
              <form action={reassignSupplierAction.bind(null, id)} className="space-y-2">
                <select
                  name="supplier_id"
                  defaultValue={bon.supplier_id ?? ''}
                  className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-sm focus:border-(--color-bronze) focus:outline-none"
                >
                  <option value="">— aucun —</option>
                  {allSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-widest"
                >
                  <Save className="w-3.5 h-3.5" />
                  Assigner
                </button>
              </form>
            ) : (
              <p className="text-sm text-(--color-ink)">
                {supplier ? (
                  <>
                    <span className="font-medium">{supplier.name}</span>
                    <br />
                    <a href={`mailto:${supplier.email}`} className="text-xs text-(--color-bronze) hover:text-(--color-bronze-dark)">
                      {supplier.email}
                    </a>
                  </>
                ) : (
                  <em className="text-(--color-stone)">Aucun</em>
                )}
              </p>
            )}
          </section>

          {/* Customer */}
          <section className="bg-(--color-paper) border border-(--color-frame) p-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">Client</h2>
            <p className="text-sm text-(--color-ink) font-medium">{order.full_name}</p>
            <a href={`mailto:${order.email}`} className="text-xs text-(--color-bronze) hover:text-(--color-bronze-dark)">
              {order.email}
            </a>
            <Link
              href={`/admin/boutique/orders/${order.id}`}
              className="mt-3 inline-flex items-center gap-1 text-xs text-(--color-stone) hover:text-(--color-ink)"
            >
              <ExternalLink className="w-3 h-3" />
              Commande {order.reference}
            </Link>
          </section>

          {/* Timeline */}
          <section className="bg-(--color-paper) border border-(--color-frame) p-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">Timeline</h2>
            <ul className="space-y-2 text-xs">
              <Tline icon={Calendar} label="Créée" date={bon.created_at} />
              <Tline icon={Send} label="Envoyée" date={bon.sent_at} />
              <Tline icon={Check} label="Confirmée" date={bon.acked_at} />
              <Tline icon={Hammer} label="En production" date={null} when={bon.status === 'in_production' ? bon.updated_at : null} />
              <Tline icon={PackageCheck} label="Reçue" date={bon.received_at} />
              <Tline icon={X} label="Annulée" date={bon.cancelled_at} />
              {bon.signed_url_expires_at && (
                <Tline icon={Truck} label="Lien expire" date={bon.signed_url_expires_at} mode="future" />
              )}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-widest text-(--color-stone)">{label}</dt>
      <dd className="text-(--color-ink)">{value}</dd>
    </>
  )
}

function Tline({
  icon: Icon, label, date, when, mode,
}: {
  icon: React.ElementType
  label: string
  date: string | null
  when?: string | null
  mode?: 'future'
}) {
  const at = date ?? when
  const cls = at
    ? mode === 'future'
      ? 'text-amber-700'
      : 'text-(--color-charcoal)'
    : 'text-(--color-stone)/40'
  return (
    <li className={`inline-flex items-center gap-2 ${cls}`}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
      {at && <span className="ml-auto text-[10px]">{dateFmt.format(new Date(at))}</span>}
    </li>
  )
}
