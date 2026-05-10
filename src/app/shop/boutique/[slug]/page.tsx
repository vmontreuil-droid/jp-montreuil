import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  getShopProductBySlug,
  listShopVariants,
  formatPrice,
  isSoldOut,
} from '@/lib/shop/products'
import { getShopPhotoById, shopPhotoUrl } from '@/lib/shop/photos'
import { AddToCartButton } from '@/components/shop/AddToCartButton'
import { VariantPicker } from '@/components/shop/VariantPicker'

export default async function ShopProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getShopProductBySlug(slug)
  if (!product || !product.is_published) notFound()

  const [variants, cover] = await Promise.all([
    product.kind === 'print' ? listShopVariants(product.id) : Promise.resolve([]),
    product.cover_photo_id ? getShopPhotoById(product.cover_photo_id) : Promise.resolve(null),
  ])
  const sold = isSoldOut(product, variants)

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <Link
        href="/shop/boutique"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 mb-6"
      >
        <ArrowLeft size={14} /> Boutique
      </Link>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-[4/5] bg-stone-100 border border-stone-200 rounded overflow-hidden">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shopPhotoUrl(cover.storage_path)}
              alt={cover.title ?? product.title_fr}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200" />
          )}
        </div>

        <div className="flex flex-col">
          <p className="text-xs text-stone-500 tracking-widest uppercase mb-2">
            {product.kind === 'calendar' ? 'Calendrier' :
             product.kind === 'print' ? 'Tirage' :
             product.kind === 'download' ? 'Téléchargement' : 'Sur commande'}
          </p>
          <h1 className="text-3xl font-semibold mb-4">{product.title_fr}</h1>

          {product.description_fr && (
            <p className="text-sm text-stone-600 mb-6 whitespace-pre-line leading-relaxed">
              {product.description_fr}
            </p>
          )}

          <div className="mt-auto">
            {product.kind === 'commission' ? (
              <Link
                href="/contact"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-700 text-white hover:bg-stone-900 text-sm rounded transition-colors"
              >
                Demander un devis
              </Link>
            ) : product.kind === 'print' && variants.length > 0 ? (
              <VariantPicker
                productId={product.id}
                slug={product.slug}
                title={product.title_fr}
                storagePath={cover?.storage_path ?? null}
                variants={variants.map((v) => ({
                  id: v.id,
                  label: v.label,
                  priceCents: v.price_cents,
                  priceFormatted: formatPrice(v.price_cents),
                  soldOut: v.stock !== null && v.stock <= 0,
                }))}
              />
            ) : (
              <div>
                <p className="text-3xl font-semibold mb-4 tabular-nums">
                  {product.price_cents != null ? formatPrice(product.price_cents) : '—'}
                </p>
                {product.price_cents != null ? (
                  <AddToCartButton
                    payload={{
                      kind: product.kind,
                      productId: product.id,
                      variantId: null,
                      slug: product.slug,
                      title: product.title_fr,
                      variantLabel: null,
                      unitPriceCents: product.price_cents,
                      storagePath: cover?.storage_path ?? null,
                    }}
                    disabled={sold}
                    label={sold ? 'Épuisé' : 'Ajouter au panier'}
                  />
                ) : (
                  <p className="text-sm text-stone-500">Prix non défini</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
