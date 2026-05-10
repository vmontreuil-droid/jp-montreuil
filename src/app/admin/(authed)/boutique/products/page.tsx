import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Package, Plus, ArrowLeft, Eye, EyeOff, Calendar, ShoppingBag, Image as ImageIcon, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listShopProducts, formatPrice, type ProductKind } from '@/lib/shop/products'

const KIND_ICON: Record<ProductKind, typeof Package> = {
  calendar: Calendar,
  print: ImageIcon,
  download: ShoppingBag,
  commission: Mail,
}

const KIND_LABEL: Record<ProductKind, string> = {
  calendar: 'Calendrier',
  print: 'Tirage',
  download: 'Téléchargement',
  commission: 'Sur commande',
}

export default async function ShopProductsPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login?next=/admin/boutique/products')

  const products = await listShopProducts()

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Admin
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Produits</span>
      </div>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) mb-1 inline-flex items-center gap-2">
            <Package size={24} /> Produits
          </h1>
          <p className="text-sm text-(--color-charcoal)">
            {products.length} produit{products.length === 1 ? '' : 's'} (kalenders, prints, downloads, commissions).
          </p>
        </div>
        <Link
          href="/admin/boutique/products/nieuw"
          className="inline-flex items-center gap-2 px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm rounded"
        >
          <Plus size={16} /> Nouveau produit
        </Link>
      </header>

      {products.length === 0 ? (
        <p className="text-center text-(--color-stone) py-10">
          Aucun produit. Créez votre premier produit ci-dessus.
        </p>
      ) : (
        <ul className="bg-(--color-paper) border border-(--color-frame) rounded divide-y divide-stone-200">
          {products.map((p) => {
            const Icon = KIND_ICON[p.kind]
            return (
              <li key={p.id}>
                <Link
                  href={`/admin/boutique/products/${p.id}`}
                  className={`flex items-center gap-4 p-4 hover:bg-(--color-canvas) transition-colors ${
                    p.is_published ? '' : 'opacity-60'
                  }`}
                >
                  <Icon size={18} className="text-(--color-stone) shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{p.title_fr}</p>
                    <p className="text-xs text-(--color-stone)">
                      <span className="uppercase tracking-wider">{KIND_LABEL[p.kind]}</span> ·{' '}
                      <span className="font-mono">{p.slug}</span>
                    </p>
                  </div>
                  <div className="text-sm text-(--color-charcoal) shrink-0">
                    {p.price_cents != null ? formatPrice(p.price_cents) : '—'}
                  </div>
                  <div className="shrink-0">
                    {p.is_published ? (
                      <Eye size={14} className="text-(--color-stone)" />
                    ) : (
                      <EyeOff size={14} className="text-(--color-stone)/60" />
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
