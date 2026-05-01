import Link from 'next/link'
import { Plus, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import WorksList from './WorksList'

export const dynamic = 'force-dynamic'

type Category = {
  id: string
  slug: string
  label_fr: string
  label_nl: string
  works_count: number
}

type Work = {
  id: string
  category_id: string
  storage_path: string
  title_fr: string | null
  title_nl: string | null
  year: number | null
  technique_fr: string | null
  technique_nl: string | null
  dimensions: string | null
  sort_order: number
  original_source_url: string | null
}

type Props = {
  searchParams: Promise<{ cat?: string }>
}

export default async function WorksAdminPage({ searchParams }: Props) {
  const { cat: catSlug } = await searchParams
  const supabase = await createClient()

  // Categories met work-count
  const { data: catsRaw } = await supabase
    .from('categories')
    .select('id, slug, label_fr, label_nl, works(id)')
    .order('sort_order', { ascending: true })

  const categories: Category[] = (catsRaw ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    label_fr: c.label_fr,
    label_nl: c.label_nl,
    works_count: Array.isArray(c.works) ? c.works.length : 0,
  }))

  const activeSlug = catSlug || categories[0]?.slug
  const activeCat = categories.find((c) => c.slug === activeSlug)

  let works: Work[] = []
  if (activeCat) {
    const { data } = await supabase
      .from('works')
      .select('*')
      .eq('category_id', activeCat.id)
      .order('sort_order', { ascending: true })
      .returns<Work[]>()
    works = data ?? []
  }

  return (
    <div className="p-8 md:p-12 max-w-6xl">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
            Atelier Montreuil
          </p>
          <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
            Œuvres
          </h1>
        </div>
        <Link
          href="/admin/works/upload"
          className="inline-flex items-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.15em]"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </Link>
      </header>

      {/* Categorie-tabs */}
      <nav className="flex flex-wrap gap-1 mb-8 border-b border-(--color-frame)">
        {categories.map((c) => {
          const isActive = c.slug === activeSlug
          return (
            <Link
              key={c.id}
              href={`/admin/works?cat=${c.slug}`}
              className={`px-4 py-2 text-sm uppercase tracking-[0.15em] border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-(--color-bronze) text-(--color-ink)'
                  : 'border-transparent text-(--color-stone) hover:text-(--color-charcoal)'
              }`}
            >
              {c.label_fr}
              <span className="ml-2 text-xs opacity-70">{c.works_count}</span>
            </Link>
          )
        })}
      </nav>

      {!activeCat ? (
        <p className="text-(--color-stone)">Aucune catégorie.</p>
      ) : works.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-(--color-stone)">
          <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
          <p>Aucune œuvre dans cette catégorie.</p>
        </div>
      ) : (
        <WorksList works={works} categories={categories} />
      )}
    </div>
  )
}
