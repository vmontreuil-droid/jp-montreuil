import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Plus, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listShopPhotos } from '@/lib/shop/photos'
import { createShopProduct } from '../actions'

export default async function NewShopProductPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login?next=/admin/boutique/products/nieuw')

  const photos = await listShopPhotos()

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <Link href="/admin/boutique/products" className="inline-flex items-center gap-2 text-sm text-(--color-stone) hover:text-(--color-ink)">
        <ArrowLeft size={14} /> Produits
      </Link>

      <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
        <Plus size={24} /> Nouveau produit
      </h1>

      <form action={createShopProduct} className="bg-(--color-paper) border border-(--color-frame) rounded p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-(--color-charcoal) mb-1 block">Type *</span>
            <select name="kind" required className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) rounded text-sm">
              <option value="print">Tirage classique (avec variants)</option>
              <option value="download">Téléchargement digital</option>
              <option value="commission">Sur commande / commission</option>
            </select>
            <span className="text-xs text-(--color-stone) mt-1 block">
              Voor printbare foto&apos;s gebruik je Photos + Configurateur
              (geen klassiek product nodig).
            </span>
          </label>
          <Field label="Slug (optionnel)" name="slug" placeholder="auto vanaf titel" />
        </div>

        <Field label="Titre FR *" name="title_fr" required />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Titre NL" name="title_nl" />
          <Field label="Titre EN" name="title_en" />
        </div>

        <TextArea label="Description FR" name="description_fr" />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextArea label="Description NL" name="description_nl" />
          <TextArea label="Description EN" name="description_en" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Prix de base (€) — laisser vide pour produit avec variants" name="price_eur" type="number" step="0.01" />
          <Field label="Ordre d'affichage" name="sort_order" type="number" defaultValue="0" />
        </div>

        <label className="block">
          <span className="text-sm text-(--color-charcoal) mb-1 block">Photo de couverture</span>
          <select name="cover_photo_id" className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) rounded text-sm">
            <option value="">— aucune —</option>
            {photos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title ?? p.slug}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 pt-2">
          <input type="checkbox" name="is_published" className="w-4 h-4" />
          <span className="text-sm">Publier directement</span>
        </label>

        <div className="pt-3 border-t border-(--color-frame)">
          <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm rounded">
            <Save size={16} /> Créer
          </button>
        </div>
      </form>
    </main>
  )
}

function Field({
  label, name, type = 'text', placeholder, defaultValue, required, step,
}: {
  label: string; name: string; type?: string; placeholder?: string
  defaultValue?: string; required?: boolean; step?: string
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
