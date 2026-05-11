import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Save, Trash2, Star, BadgeCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getShopPhotoById, shopPhotoUrl } from '@/lib/shop/photos'
import {
  updateShopPhoto,
  deleteShopPhoto,
  togglePublishedShopPhoto,
  toggleFeaturedShopPhoto,
} from '../actions'
import GenerateAltButton from './GenerateAltButton'

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
  const featuredBound = toggleFeaturedShopPhoto.bind(null, id, !((photo as { is_featured?: boolean }).is_featured))
  const isFeatured = (photo as { is_featured?: boolean }).is_featured ?? false
  const aiAltGeneratedAt = (photo as { ai_alt_generated_at?: string | null }).ai_alt_generated_at ?? null

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <Link
        href="/admin/boutique/photos"
        className="inline-flex items-center gap-2 text-sm text-(--color-stone) hover:text-(--color-ink)"
      >
        <ArrowLeft size={14} /> Retour aux photos
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Preview */}
        <div>
          <div className="bg-(--color-paper) border border-(--color-frame) rounded overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shopPhotoUrl(photo.storage_path)}
              alt={photo.title ?? photo.slug}
              className="w-full h-auto"
            />
          </div>
          <dl className="mt-3 text-xs text-(--color-stone) space-y-1">
            <div><dt className="inline text-(--color-charcoal)">Slug :</dt> <dd className="inline">{photo.slug}</dd></div>
            <div><dt className="inline text-(--color-charcoal)">Chemin :</dt> <dd className="inline">{photo.storage_path}</dd></div>
            {photo.width && photo.height && (
              <div><dt className="inline text-(--color-charcoal)">Dimensions :</dt> <dd className="inline">{photo.width} × {photo.height}</dd></div>
            )}
          </dl>
        </div>

        {/* Edit form */}
        <form action={updateBound} className="bg-(--color-paper) border border-(--color-frame) rounded p-6 space-y-4">
          <Field label="Titre" name="title" defaultValue={photo.title ?? ''} />
          <Field label="Espèce" name="species" defaultValue={photo.species ?? ''} />
          <Field label="Lieu" name="taken_at_location" defaultValue={photo.taken_at_location ?? ''} />
          <Field label="Date" name="taken_at" type="date" defaultValue={photo.taken_at ?? ''} />
          <TextArea label="Description" name="description" defaultValue={photo.description ?? ''} />
          <div>
            <TextArea label="Texte alternatif (alt)" name="alt_text" defaultValue={photo.alt_text ?? ''} />
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-[11px] text-(--color-stone)">
                {aiAltGeneratedAt ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <BadgeCheck className="w-3 h-3" />
                    Généré par IA le {new Date(aiAltGeneratedAt).toLocaleDateString('fr-BE')}
                  </span>
                ) : (
                  <span>Généré automatiquement par Claude vision</span>
                )}
              </p>
              <GenerateAltButton id={id} />
            </div>
          </div>
          <Field label="Ordre d'affichage" name="sort_order" type="number" defaultValue={String(photo.sort_order)} />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_published" defaultChecked={photo.is_published} className="w-4 h-4" />
            <span className="text-sm">Visible publiquement</span>
          </label>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-(--color-frame)">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm rounded"
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
            className="inline-flex items-center gap-2 px-3 py-2 bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) text-sm rounded"
          >
            {photo.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
            {photo.is_published ? 'Repasser en brouillon' : 'Publier'}
          </button>
        </form>
        <form action={featuredBound}>
          <button
            type="submit"
            className={`inline-flex items-center gap-2 px-3 py-2 border text-sm rounded transition-colors ${
              isFeatured
                ? 'bg-(--color-bronze) text-white border-(--color-bronze) hover:bg-(--color-bronze-dark)'
                : 'bg-(--color-paper) border-(--color-frame) hover:border-(--color-bronze)'
            }`}
          >
            <Star size={16} className={isFeatured ? 'fill-white' : ''} />
            {isFeatured ? 'Coup de cœur — retirer' : 'Marquer comme coup de cœur'}
          </button>
        </form>
        <form action={deleteBound}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-3 py-2 bg-(--color-paper) border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm rounded"
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
      <span className="text-sm text-(--color-charcoal) mb-1 block">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
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
        rows={3}
        className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) rounded text-sm"
      />
    </label>
  )
}
