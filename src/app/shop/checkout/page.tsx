import Link from 'next/link'
import { ArrowLeft, UserCircle, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getMyShopCustomer } from '@/lib/shop/customer-portal'
import { CheckoutFormClient, type CheckoutPrefill } from './CheckoutFormClient'

export const dynamic = 'force-dynamic'

export default async function ShopCheckoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let prefill: CheckoutPrefill | null = null
  if (user?.email) {
    const customer = await getMyShopCustomer(user.email).catch(() => null)
    const addr = (customer?.address ?? {}) as Record<string, string>
    prefill = {
      email: user.email,
      full_name: customer?.full_name ?? '',
      phone: customer?.phone ?? '',
      street: addr.street ?? '',
      postal_code: addr.postal_code ?? '',
      city: addr.city ?? '',
      country: addr.country ?? 'BE',
      is_b2b: customer?.is_b2b ?? false,
      company: customer?.company ?? '',
      vat_number: customer?.vat_number ?? '',
    }
  }

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

      {/* Login-CTA voor gast — laat ze naar /portail/login en daarna terug */}
      {!user && (
        <div className="mb-6 bg-stone-50 border border-stone-200 rounded p-4 flex items-center justify-between gap-3 flex-wrap text-sm">
          <span className="inline-flex items-center gap-2 text-stone-700">
            <UserCircle className="w-4 h-4" />
            Déjà client ? Connectez-vous pour pré-remplir vos informations.
          </span>
          <Link
            href="/portail/login?next=/shop/checkout"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-800 text-xs rounded"
          >
            <LogIn className="w-3.5 h-3.5" />
            Se connecter
          </Link>
        </div>
      )}

      {user && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-900 inline-flex items-center gap-2">
          <UserCircle className="w-3.5 h-3.5" />
          Connecté en tant que <strong>{user.email}</strong>
        </div>
      )}

      <CheckoutFormClient prefill={prefill} loggedIn={!!user} />
    </main>
  )
}
