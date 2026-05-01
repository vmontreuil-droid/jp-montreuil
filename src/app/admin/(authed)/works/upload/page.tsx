import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import UploadForm from './UploadForm'

export const dynamic = 'force-dynamic'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, slug, label_fr, label_nl')
    .order('sort_order', { ascending: true })

  const categories = data ?? []

  return (
    <div className="p-8 md:p-12 max-w-3xl">
      <Link
        href="/admin/works"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink) mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux œuvres
      </Link>

      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Ajouter des œuvres
        </h1>
        <p className="mt-2 text-sm text-(--color-stone)">
          Glisse-dépose ou choisis des photos. JPG, PNG, WEBP — max 20MB par photo.
        </p>
      </header>

      <UploadForm categories={categories} />
    </div>
  )
}
