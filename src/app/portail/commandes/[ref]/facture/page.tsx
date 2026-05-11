import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getMyShopOrderByReference,
  listMyShopOrderItems,
  getPhotosByIds,
} from '@/lib/shop/customer-portal'
import { shopPhotoUrl } from '@/lib/shop/photo-url'
import { PrintButton } from '@/components/shop/PrintButton'
import { getShopLocale } from '@/lib/shop/locale'
import { getDictionary } from '@/i18n/dictionaries'

export const dynamic = 'force-dynamic'

/**
 * /portail/commandes/[ref]/facture — printvriendelijke factuur voor de
 * ingelogde klant. Toont B2B-velden (company_name + VAT) wanneer
 * aanwezig.
 */
export default async function PortailInvoicePage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const { ref } = await params
  const locale = await getShopLocale()
  const t = getDictionary(locale).boutique.facture

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    redirect(`/portail/login?next=${encodeURIComponent(`/portail/commandes/${ref}/facture`)}`)
  }

  const order = await getMyShopOrderByReference(user.email, ref)
  if (!order) notFound()

  const items = await listMyShopOrderItems(order.id)
  const photoIds = items.map((i) => i.photo_id).filter((x): x is string => !!x)
  const photoMap = await getPhotosByIds(photoIds)

  const intlLoc = locale === 'nl' ? 'nl-BE' : 'fr-BE'
  const fmt = new Intl.NumberFormat(intlLoc, {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  })
  const formatPrice = (cents: number) => fmt.format(cents / 100)
  const dateFmt = new Intl.DateTimeFormat(intlLoc, {
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
            href={`/portail/commandes/${order.reference}`}
            className="text-sm text-stone-500 hover:text-stone-900"
          >
            {t.back}
          </a>
          <PrintButton />
        </div>

        <div className="bg-white border border-stone-200 rounded p-10 invoice-page">
          <header className="flex justify-between items-start mb-8 pb-6 border-b border-stone-200">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Atelier JP Montreuil</h1>
              <p className="text-stone-500 text-sm uppercase tracking-widest">{t.brandTagline}</p>
              <p className="text-stone-500 text-xs mt-3">{t.brandLocation}</p>
            </div>
            <div className="text-right">
              <span
                aria-hidden
                className="inline-flex items-center justify-center bg-stone-900 text-white tracking-wider rounded-sm select-none"
                style={{ width: 56, height: 56, fontSize: 22, lineHeight: 1 }}
              >
                JP
              </span>
            </div>
          </header>

          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">{t.invoiceNo}</p>
              <p className="font-mono text-lg">{order.reference}</p>
              <p className="text-sm text-stone-600 mt-3">
                {t.orderDate} : {dateFmt.format(new Date(order.created_at))}
              </p>
              {order.paid_at && (
                <p className="text-sm text-stone-600">
                  {t.paidDate} : {dateFmt.format(new Date(order.paid_at))}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">{t.billedTo}</p>
              {order.company_name && (
                <p className="font-semibold">{order.company_name}</p>
              )}
              <p className={order.company_name ? 'text-sm text-stone-700' : 'font-medium'}>{order.full_name}</p>
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
              {order.vat_number && (
                <p className="text-xs text-stone-600 mt-3 font-mono">
                  {t.vatLabel} : {order.vat_number}
                </p>
              )}
            </div>
          </div>

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
                <th className="py-2 font-medium">{t.colArticle}</th>
                <th className="py-2 font-medium text-right whitespace-nowrap">{t.colQty}</th>
                <th className="py-2 font-medium text-right whitespace-nowrap">{t.colUnitPrice}</th>
                <th className="py-2 font-medium text-right whitespace-nowrap">{t.colLineTotal}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const photo = it.photo_id ? photoMap.get(it.photo_id) : null
                return (
                  <tr key={it.id} className="border-b border-stone-200">
                    <td className="py-3 align-top">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={shopPhotoUrl(photo.storage_path)}
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
                <td className="py-3" colSpan={4}>{t.shippingFees}</td>
                <td className="py-3 text-right whitespace-nowrap">
                  {order.shipping_cents > 0 ? formatPrice(order.shipping_cents) : t.free}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="py-4 text-right font-medium whitespace-nowrap">{t.total}</td>
                <td className="py-4 text-right text-2xl font-semibold whitespace-nowrap">
                  {formatPrice(order.amount_cents)}
                </td>
              </tr>
            </tfoot>
          </table>

          <p className="text-xs text-stone-500 leading-relaxed border-t border-stone-200 pt-4">
            {t.vatExempt}
          </p>
          <p className="text-center text-stone-500 text-sm italic mt-6">
            {t.thankYou}
          </p>
        </div>
      </div>
    </>
  )
}
