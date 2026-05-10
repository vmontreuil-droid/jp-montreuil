import { notFound } from 'next/navigation'
import {
  getShopOrderByReference,
  listShopOrderItems,
} from '@/lib/shop/orders'
import { createShopAdminClient } from '@/lib/shop/supabase'
import { shopPhotoUrl } from '@/lib/shop/photo-url'
import { PrintButton } from '@/components/shop/PrintButton'

const fmt = new Intl.NumberFormat('fr-BE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
})
const formatPrice = (cents: number) => fmt.format(cents / 100)

/**
 * Print-vriendelijke factuur. Browser Cmd/Ctrl+P → save als PDF.
 */
export default async function ShopInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>
  searchParams: Promise<{ email?: string }>
}) {
  const { ref } = await params
  const sp = await searchParams
  const email = (sp.email ?? '').trim().toLowerCase()

  const order = await getShopOrderByReference(ref)
  if (!order) notFound()
  if (!email || order.email.toLowerCase() !== email) notFound()

  const items = await listShopOrderItems(order.id)

  // Hydrate photo storage_paths voor thumbnails
  const sb = createShopAdminClient()
  const photoIds = items.map((i) => i.photo_id).filter((x): x is string => !!x)
  const { data: photoRows } = photoIds.length
    ? await sb.from('photos').select('id, storage_path').in('id', photoIds)
    : { data: [] as Array<{ id: string; storage_path: string }> }
  const photoPathById = new Map((photoRows ?? []).map((p) => [p.id, p.storage_path]))

  const dateFmt = new Intl.DateTimeFormat('fr-BE', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const addr = (order.shipping_address ?? {}) as Record<string, string>

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        @page { size: A4; margin: 18mm; }
      `}</style>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="no-print mb-6 flex items-center justify-between gap-3">
          <a
            href={`/shop/portail/commande/${order.reference}?email=${encodeURIComponent(order.email)}`}
            className="text-sm text-stone-500 hover:text-stone-900"
          >
            ← Retour
          </a>
          <PrintButton />
        </div>

        <div className="bg-white border border-stone-200 rounded p-10 invoice-page">
          {/* Header */}
          <header className="flex justify-between items-start mb-8 pb-6 border-b border-stone-200">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Atelier JP Montreuil</h1>
              <p className="text-stone-500 text-sm uppercase tracking-widest">Tirages d&apos;art</p>
              <p className="text-stone-500 text-xs mt-3">Belgique · jp@montreuil.be</p>
            </div>
            <div className="text-right">
              <span
                aria-hidden
                className="inline-flex items-center justify-center bg-stone-900 text-white font-display tracking-wider rounded-sm select-none"
                style={{ width: 56, height: 56, fontSize: 22, lineHeight: 1 }}
              >
                JP
              </span>
            </div>
          </header>

          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Facture nº</p>
              <p className="font-mono text-lg">{order.reference}</p>
              <p className="text-sm text-stone-600 mt-3">
                Date de commande : {dateFmt.format(new Date(order.created_at))}
              </p>
              {order.paid_at && (
                <p className="text-sm text-stone-600">
                  Date de paiement : {dateFmt.format(new Date(order.paid_at))}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Facturé à</p>
              <p className="font-medium">{order.full_name}</p>
              <p className="text-sm text-stone-600">{order.email}</p>
              <address className="not-italic text-sm text-stone-600 mt-2 leading-relaxed">
                {addr.street && <div>{addr.street}</div>}
                {(addr.postal_code || addr.city) && (
                  <div>
                    {addr.country ? `${addr.country} - ` : ''}
                    {[addr.postal_code, addr.city].filter(Boolean).join(' ')}
                  </div>
                )}
              </address>
            </div>
          </div>

          {/* Items */}
          <table className="w-full text-sm mb-8 border-separate border-spacing-x-3 sm:border-spacing-x-6">
            <colgroup>
              <col className="w-16" />
              <col />
              <col className="w-16" />
              <col className="w-28" />
              <col className="w-28" />
            </colgroup>
            <thead className="border-b-2 border-stone-900">
              <tr className="text-left">
                <th className="py-2" />
                <th className="py-2 font-medium">Article</th>
                <th className="py-2 font-medium text-right whitespace-nowrap">Qté</th>
                <th className="py-2 font-medium text-right whitespace-nowrap">Prix unit.</th>
                <th className="py-2 font-medium text-right whitespace-nowrap">Total ligne</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const photoPath = it.photo_id ? photoPathById.get(it.photo_id) : null
                return (
                  <tr key={it.id} className="border-b border-stone-200">
                    <td className="py-3 align-top">
                      {photoPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={shopPhotoUrl(photoPath)}
                          alt=""
                          className="w-12 h-12 object-cover rounded-sm border border-stone-200"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-stone-100 rounded-sm border border-stone-200" aria-hidden />
                      )}
                    </td>
                    <td className="py-3">{it.title}</td>
                    <td className="py-3 text-right whitespace-nowrap">{it.quantity}</td>
                    <td className="py-3 text-right whitespace-nowrap">{formatPrice(it.unit_price_cents)}</td>
                    <td className="py-3 text-right whitespace-nowrap">{formatPrice(it.unit_price_cents * it.quantity)}</td>
                  </tr>
                )
              })}
              <tr className="border-b border-stone-200">
                <td className="py-3" colSpan={4}>Frais de port</td>
                <td className="py-3 text-right whitespace-nowrap">
                  {order.shipping_cents > 0 ? formatPrice(order.shipping_cents) : 'gratuit'}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="py-4 text-right font-medium whitespace-nowrap">Total</td>
                <td className="py-4 text-right text-2xl font-semibold whitespace-nowrap">
                  {formatPrice(order.amount_cents)}
                </td>
              </tr>
            </tfoot>
          </table>

          <p className="text-xs text-stone-500 leading-relaxed border-t border-stone-200 pt-4">
            Petite entreprise soumise au régime de la franchise de TVA — TVA non applicable,
            art. 56bis du Code de la TVA.
          </p>
          <p className="text-center text-stone-500 text-sm italic mt-6">
            Merci pour votre confiance.
          </p>
        </div>
      </div>
    </>
  )
}
