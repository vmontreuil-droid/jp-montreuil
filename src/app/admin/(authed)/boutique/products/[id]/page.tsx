import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Save, Trash2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  getShopProductById,
  listShopVariants,
  formatPrice,
} from '@/lib/shop/products'
import { listShopPhotos } from '@/lib/shop/photos'
import {
  updateShopProduct,
  deleteShopProduct,
  createShopVariant,
  deleteShopVariant,
} from '../actions'

export default async function EditShopProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  const { id } = await params
  const [product, variants, photos] = await Promise.all([
    getShopProductById(id),
    listShopVariants(id),
    listShopPhotos(),
  ])
  if (!product) notFound()

  const updateBound = updateShopProduct.bind(null, id)
  const deleteBound = deleteShopProduct.bind(null, id)
  const createVariantBound = createShopVariant.bind(null, id)

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <Link href="/admin/boutique/products" className="inline-flex items-center gap-2 text-sm text-(--color-stone) hover:text-(--color-ink)">
        <ArrowLeft size={14} /> Retour
      </Link>

      <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink)">{product.title_fr}</h1>
      <p className="text-xs text-(--color-stone) font-mono">/{product.slug} · {product.kind}</p>

      <form action={updateBound} className="bg-(--color-paper) border border-(--color-frame) rounded p-6 space-y-4">
        <Field label="Titre FR *" name="title_fr" defaultValue={product.title_fr} required />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Titre NL" name="title_nl" defaultValue={product.title_nl ?? ''} />
          <Field label="Titre EN" name="title_en" defaultValue={product.title_en ?? ''} />
        </div>

        <TextArea label="Description FR" name="description_fr" defaultValue={product.description_fr ?? ''} />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextArea label="Description NL" name="description_nl" defaultValue={product.description_nl ?? ''} />
          <TextArea label="Description EN" name="description_en" defaultValue={product.description_en ?? ''} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field
            label="Prix de base (€)"
            name="price_eur"
            type="number"
            step="0.01"
            defaultValue={product.price_cents != null ? (product.price_cents / 100).toFixed(2) : ''}
          />
          <Field label="Ordre" name="sort_order" type="number" defaultValue={String(product.sort_order)} />
        </div>

        <label className="block">
          <span className="text-sm text-(--color-charcoal) mb-1 block">Photo de couverture</span>
          <select
            name="cover_photo_id"
            defaultValue={product.cover_photo_id ?? ''}
            className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) rounded text-sm"
          >
            <option value="">— aucune —</option>
            {photos.map((p) => (
              <option key={p.id} value={p.id}>{p.title ?? p.slug}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={product.is_published}
            className="w-4 h-4"
          />
          <span className="text-sm">Visible publiquement</span>
        </label>

        <div className="pt-3 border-t border-(--color-frame)">
          <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm rounded">
            <Save size={16} /> Enregistrer
          </button>
        </div>
      </form>

      {/* Variants — alleen voor product-types die ze ondersteunen */}
      {(product.kind === 'print' || product.kind === 'calendar') && (
        <section className="bg-(--color-paper) border border-(--color-frame) rounded p-6">
          <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-3">
            Variants ({variants.length})
          </h2>
          {variants.length === 0 ? (
            <p className="text-sm text-(--color-stone) mb-4">Pas encore de variants pour ce produit.</p>
          ) : (
            <ul className="divide-y divide-stone-200 mb-4">
              {variants.map((v) => (
                <li key={v.id} className="py-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm">{v.label}</p>
                    <p className="text-xs text-(--color-stone)">
                      {formatPrice(v.price_cents)} · stock: {v.stock ?? '∞'}
                    </p>
                  </div>
                  <form action={deleteShopVariant.bind(null, id, v.id)}>
                    <button
                      type="submit"
                      className="p-1.5 text-(--color-stone)/70 hover:text-amber-700"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={createVariantBound} className="grid grid-cols-3 gap-2 items-end">
            <Field label="Label" name="label" placeholder="ex. A4 — papier baryta" />
            <Field label="Prix (€)" name="price_eur" type="number" step="0.01" />
            <Field label="Stock" name="stock" type="number" placeholder="laisser vide = ∞" />
            <div className="col-span-3">
              <button type="submit" className="inline-flex items-center gap-2 px-3 py-2 bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) text-sm rounded">
                <Plus size={14} /> Ajouter une variante
              </button>
            </div>
          </form>
        </section>
      )}

      <form action={deleteBound}>
        <button type="submit" className="inline-flex items-center gap-2 px-3 py-2 bg-(--color-paper) border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm rounded">
          <Trash2 size={16} /> Supprimer le produit
        </button>
      </form>
    </main>
  )
}

function Field({
  label, name, defaultValue, type = 'text', placeholder, required, step,
}: {
  label: string; name: string; defaultValue?: string; type?: string
  placeholder?: string; required?: boolean; step?: string
}) {
  return (
    <label className="block">
      <span className="text-sm text-(--color-charcoal) mb-1 block">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        step={step}
        className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) rounded text-sm"
      />
    </label>
  )
}

function TextArea({
  label, name, defaultValue,
}: {
  label: string; name: string; defaultValue?: string
}) {
  return (
    <label className="block">
      <span className="text-sm text-(--color-charcoal) mb-1 block">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={2}
        className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) rounded text-sm"
      />
    </label>
  )
}
