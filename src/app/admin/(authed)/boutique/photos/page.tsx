import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Image as ImageIcon, Upload, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listShopPhotos } from '@/lib/shop/photos'
import { uploadShopPhoto } from './actions'
import PhotosGrid from './PhotosGrid'
import ImportWorksButton from './ImportWorksButton'

/**
 * /admin/boutique/photos — overzicht + upload-form. Klikken op een
 * thumbnail opent /admin/boutique/photos/[id] voor edit.
 */
export default async function ShopPhotosPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login?next=/admin/boutique/photos')

  const photos = await listShopPhotos()
  const published = photos.filter((p) => p.is_published).length

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Admin
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Photos</span>
      </div>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) mb-1 inline-flex items-center gap-2">
            <ImageIcon size={24} /> Photos
          </h1>
          <p className="text-sm text-(--color-charcoal)">
            {photos.length} foto{photos.length === 1 ? '' : "'s"} · {published} gepubliceerd
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <ImportWorksButton />
          <Link
            href="/admin/boutique/photos/bulk-upload"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em]"
          >
            <Upload className="w-4 h-4" />
            Import en lot
          </Link>
        </div>
      </header>

      {/* Upload form */}
      <section className="bg-(--color-paper) border border-(--color-frame) rounded-lg p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-3">
          Nouvelle photo
        </h2>
        <form action={uploadShopPhoto} className="grid sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-sm text-(--color-charcoal) mb-1 block">Fichier</span>
            <input
              type="file"
              name="file"
              accept="image/*"
              required
              className="w-full text-sm border border-(--color-frame) rounded p-2"
            />
          </label>
          <Field label="Slug (optionnel)" name="slug" placeholder="auto vanaf bestandsnaam" />
          <Field label="Titre" name="title" />
          <Field label="Espèce" name="species" placeholder="ex. cerf, lynx" />
          <Field label="Lieu" name="taken_at_location" />
          <Field label="Date" name="taken_at" type="date" />
          <Field label="Ordre" name="sort_order" type="number" defaultValue="0" />
          <label className="block sm:col-span-2">
            <span className="text-sm text-(--color-charcoal) mb-1 block">Description</span>
            <textarea
              name="description"
              rows={2}
              className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) rounded text-sm"
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="is_published" className="w-4 h-4" />
            <span className="text-sm">Publier directement</span>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm rounded"
            >
              <Upload size={16} /> Téléverser
            </button>
          </div>
        </form>
      </section>

      {/* Grid + bulk-actions + filter */}
      {photos.length === 0 ? (
        <p className="text-center text-(--color-stone) py-10">
          Pas encore de photos. Téléversez votre première ci-dessus.
        </p>
      ) : (
        <PhotosGrid
          photos={photos.map((p) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            alt_text: p.alt_text,
            storage_path: p.storage_path,
            is_published: p.is_published,
            is_featured: (p as { is_featured?: boolean }).is_featured ?? false,
          }))}
        />
      )}
    </main>
  )
}

function Field({
  label, name, type = 'text', placeholder, defaultValue,
}: {
  label: string; name: string; type?: string; placeholder?: string; defaultValue?: string
}) {
  return (
    <label className="block">
      <span className="text-sm text-(--color-charcoal) mb-1 block">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) rounded text-sm"
      />
    </label>
  )
}
