import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CheckoutFormClient } from './CheckoutFormClient'

export default function ShopCheckoutPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <Link
        href="/shop/panier"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 mb-6"
      >
        <ArrowLeft size={14} /> Mon panier
      </Link>

      <h1 className="text-3xl font-semibold mb-1">Commande</h1>
      <p className="text-sm text-stone-600 mb-8">
        Renseignez vos coordonnées de livraison. Le paiement se fait via Mollie après confirmation.
      </p>

      <CheckoutFormClient />
    </main>
  )
}
