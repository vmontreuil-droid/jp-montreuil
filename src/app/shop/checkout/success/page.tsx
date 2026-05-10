import Link from 'next/link'
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react'
import { getShopOrderByReference } from '@/lib/shop/orders'

/**
 * Landing-page na Mollie redirect (al dan niet betaald). We tonen de
 * status zoals we 'm op dit moment kennen; de webhook update 'm
 * asynchroon. Klant kan via /shop/portail/commande/[ref] later opnieuw
 * checken.
 */
export default async function ShopCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const sp = await searchParams
  const ref = sp.ref ?? null
  const order = ref ? await getShopOrderByReference(ref) : null

  return (
    <main className="max-w-xl mx-auto px-6 py-16 text-center space-y-6">
      <CheckCircle2 size={48} className="mx-auto text-green-600" />
      <h1 className="text-3xl font-semibold">Merci pour votre commande</h1>
      {ref && (
        <p className="text-stone-600">
          Référence : <span className="font-mono">{ref}</span>
        </p>
      )}
      {order && (
        <div className="bg-white border border-stone-200 rounded p-5 text-left text-sm space-y-2">
          <p>
            <span className="text-stone-500">Statut actuel :</span>{' '}
            <strong>{order.status === 'paid' ? 'Payée ✓' : 'En attente de paiement'}</strong>
          </p>
          <p className="text-stone-500 text-xs">
            La confirmation est envoyée à <strong className="text-stone-700">{order.email}</strong>.
            Le statut peut prendre quelques secondes à s&apos;actualiser après le paiement.
          </p>
        </div>
      )}
      <p className="text-sm text-stone-500">
        Un mail de confirmation est en route avec les détails de la commande
        et le lien de paiement (si pas encore réglé).
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {ref && order && (
          <Link
            href={`/shop/portail/commande/${ref}?email=${encodeURIComponent(order.email)}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded transition-colors"
          >
            <Mail size={16} /> Voir ma commande
            <ArrowRight size={14} />
          </Link>
        )}
        <Link
          href="/shop/boutique"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-stone-300 hover:border-stone-500 text-sm rounded"
        >
          Retour à la boutique
        </Link>
      </div>
    </main>
  )
}
