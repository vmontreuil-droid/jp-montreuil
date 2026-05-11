import { Suspense } from 'react'
import { CartView } from './CartView'
import { getShopLocale } from '@/lib/shop/locale'
import { getDictionary } from '@/i18n/dictionaries'

export const dynamic = 'force-dynamic'

export default async function ShopCartPage() {
  const locale = await getShopLocale()
  const t = getDictionary(locale).boutique.panier

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) mb-6">{t.title}</h1>
      <Suspense fallback={<p className="text-stone-500">…</p>}>
        <CartView labels={t} />
      </Suspense>
    </main>
  )
}
