import { Suspense } from 'react'
import { CartView } from './CartView'

export default function ShopCartPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold mb-6">Mon panier</h1>
      <Suspense fallback={<p className="text-stone-500">Chargement…</p>}>
        <CartView />
      </Suspense>
    </main>
  )
}
