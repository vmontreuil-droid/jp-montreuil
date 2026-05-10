import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Save, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getShopPhotoById, shopPhotoUrl } from '@/lib/shop/photos'
import {
  updateShopPhoto,
  deleteShopPhoto,
  togglePublishedShopPhoto,
} from '../actions'

export default async function EditShopPhotoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  const { id } = await params
  const photo = await getShopPhotoById(id)
  if (!photo) notFound()

  const updateBound = updateShopPhoto.bind(null, id)
  const deleteBound = deleteShopPhoto.bind(null, id)
  const toggleBound = togglePublishedShopPhoto.bind(null, id, !photo.is_published)

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <Link
        href="/admin/boutique/photos"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft size={14} /> Retour aux photos
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Preview */}
        <div>
          <div className="bg-white border border-stone-200 rounded overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shopPhotoUrl(photo.storage_path)}
              alt={photo.title ?? photo.slug}
              className="w-full h-auto"
            />
          </div>
          <dl className="mt-3 text-xs text-stone-500 space-y-1">
            <div><dt className="inline text-stone-700">Slug :</dt> <dd className="inline">{photo.slug}</dd></div>
            <div><dt className="inline text-stone-700">Chemin :</dt> <dd className="inline">{photo.storage_path}</dd></div>
            {photo.width && photo.height && (
              <div><dt className="inline text-stone-700">Dimensions :</dt> <dd className="inline">{photo.width} × {photo.height}</dd></div>
            )}
          </dl>
        </div>

        {/* Edit form */}
        <form action={updateBound} className="bg-white border border-stone-200 rounded p-6 space-y-4">
          <Field label="Titre" name="title" defaultValue={photo.title ?? ''} />
          <Field label="Espèce" name="species" defaultValue={photo.species ?? ''} />
          <Field label="Lieu" name="taken_at_location" defaultValue={photo.taken_at_location ?? ''} />
          <Field label="Date" name="taken_at" type="date" defaultValue={photo.taken_at ?? ''} />
          <TextArea label="Description" name="description" defaultValue={photo.description ?? ''} />
          <TextArea label="Texte alternatif (alt)" name="alt_text" defaultValue={photo.alt_text ?? ''} />
          <Field label="Ordre d'affichage" name="sort_order" type="number" defaultValue={String(photo.sort_order)} />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_published" defaultChecked={photo.is_published} className="w-4 h-4" />
            <span className="text-sm">Visible publiquement</span>
          </label>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-stone-200">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded"
            >
              <Save size={16} /> Enregistrer
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={toggleBound}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-stone-300 hover:border-stone-500 text-sm rounded"
          >
            {photo.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
            {photo.is_published ? 'Repasser en brouillon' : 'Publier'}
          </button>
        </form>
        <form action={deleteBound}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm rounded"
          >
            <Trash2 size={16} /> Supprimer
          </button>
        </form>
      </div>
    </main>
  )
}

function Field({
  label, name, defaultValue, type = 'text',
}: {
  label: string; name: string; defaultValue?: string; type?: string
}) {
  return (
    <label className="block">
      <span className="text-sm text-stone-700 mb-1 block">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
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
      <span className="text-sm text-stone-700 mb-1 block">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
      />
    </label>
  )
}
