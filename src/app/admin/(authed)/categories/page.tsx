import Image from 'next/image'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { workImageUrl } from '@/lib/links'
import CategoryRow from './CategoryRow'
import NewCategoryButton from './NewCategoryButton'

export const dynamic = 'force-dynamic'

type Work = {
  id: string
  storage_path: string
  title_fr: string | null
  sort_order: number
}

export type CategoryWithWorks = {
  id: string
  slug: string
  sort_order: number
  label_fr: string
  label_nl: string
  description_fr: string | null
  description_nl: string | null
  cover_work_id: string | null
  cover: { storage_path: string } | null
  works: Work[]
}

export default async function CategoriesAdminPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select(`
      id, slug, sort_order, label_fr, label_nl, description_fr, description_nl, cover_work_id,
      cover:works!categories_cover_work_id_fkey(storage_path),
      works:works!works_category_id_fkey(id, storage_path, title_fr, sort_order)
    `)
    .order('sort_order', { ascending: true })
    .returns<CategoryWithWorks[]>()

  if (error) {
    return <div className="p-8 text-red-400">Erreur: {error.message}</div>
  }
  const categories = data ?? []

  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <header className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
            Atelier Montreuil
          </p>
          <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
            Catégories
          </h1>
          <p className="mt-2 text-sm text-(--color-stone)">
            Crée, renomme, réordonne, choisis la photo de couverture.
          </p>
        </div>
        <NewCategoryButton />
      </header>

      <div className="space-y-3">
        {categories.map((cat, i) => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            isFirst={i === 0}
            isLast={i === categories.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
