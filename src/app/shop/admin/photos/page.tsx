import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Image as ImageIcon, Upload, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listShopPhotos, shopPhotoUrl, photoAlt } from '@/lib/shop/photos'
import { uploadShopPhoto } from './actions'

/**
 * /shop/admin/photos — overzicht + upload-form. Klikken op een
 * thumbnail opent /shop/admin/photos/[id] voor edit.
 */
export default async function ShopPhotosPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login?next=/shop/admin/photos')

  const photos = await listShopPhotos()
  const published = photos.filter((p) => p.is_published).length

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/shop/admin" className="text-stone-500 hover:text-stone-900 inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Admin
        </Link>
        <span className="text-stone-300">/</span>
        <span className="text-stone-900">Photos</span>
      </div>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold mb-1 inline-flex items-center gap-2">
            <ImageIcon size={24} /> Photos
          </h1>
          <p className="text-sm text-stone-600">
            {photos.length} foto{photos.length === 1 ? '' : "'s"} · {published} gepubliceerd
          </p>
        </div>
      </header>

      {/* Upload form */}
      <section className="bg-white border border-stone-200 rounded-lg p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500 mb-3">
          Nouvelle photo
        </h2>
        <form action={uploadShopPhoto} className="grid sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-sm text-stone-700 mb-1 block">Fichier</span>
            <input
              type="file"
              name="file"
              accept="image/*"
              required
              className="w-full text-sm border border-stone-300 rounded p-2"
            />
          </label>
          <Field label="Slug (optionnel)" name="slug" placeholder="auto vanaf bestandsnaam" />
          <Field label="Titre" name="title" />
          <Field label="Espèce" name="species" placeholder="ex. cerf, lynx" />
          <Field label="Lieu" name="taken_at_location" />
          <Field label="Date" name="taken_at" type="date" />
          <Field label="Ordre" name="sort_order" type="number" defaultValue="0" />
          <label className="block sm:col-span-2">
            <span className="text-sm text-stone-700 mb-1 block">Description</span>
            <textarea
              name="description"
              rows={2}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="is_published" className="w-4 h-4" />
            <span className="text-sm">Publier directement</span>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded"
            >
              <Upload size={16} /> Téléverser
            </button>
          </div>
        </form>
      </section>

      {/* Grid */}
      {photos.length === 0 ? (
        <p className="text-center text-stone-500 py-10">
          Pas encore de photos. Téléversez votre première ci-dessus.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((p) => (
            <Link
              key={p.id}
              href={`/shop/admin/photos/${p.id}`}
              className={`block group relative aspect-square overflow-hidden bg-stone-100 border border-stone-200 rounded ${
                p.is_published ? '' : 'opacity-60'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shopPhotoUrl(p.storage_path)}
                alt={photoAlt(p)}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                loading="lazy"
              />
              <div className="absolute top-2 right-2">
                {p.is_published ? (
                  <Eye size={14} className="text-white drop-shadow" />
                ) : (
                  <EyeOff size={14} className="text-white drop-shadow" />
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white text-xs truncate">{p.title ?? p.slug}</p>
              </div>
            </Link>
          ))}
        </div>
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
      <span className="text-sm text-stone-700 mb-1 block">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
      />
    </label>
  )
}
