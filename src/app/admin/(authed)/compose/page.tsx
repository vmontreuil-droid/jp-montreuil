import { createClient } from '@/lib/supabase/server'
import ShareComposer, { type ComposerCategory, type ComposerWork } from './ShareComposer'

export const dynamic = 'force-dynamic'

export default async function ComposeAdminPage() {
  const supabase = await createClient()

  const { data: catsRaw } = await supabase
    .from('categories')
    .select('id, slug, label_fr, label_nl')
    .order('sort_order', { ascending: true })

  const categories: ComposerCategory[] = catsRaw ?? []

  const { data: worksRaw } = await supabase
    .from('works')
    .select('id, category_id, storage_path, title_fr, title_nl, year, technique_fr, technique_nl, dimensions')
    .order('sort_order', { ascending: true })
    .returns<ComposerWork[]>()

  const works: ComposerWork[] = worksRaw ?? []

  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Composer & Partager
        </h1>
        <p className="mt-2 text-sm text-(--color-stone) max-w-2xl">
          Préparez un post (caption + image) et publiez-le en un clic sur Facebook ou
          WhatsApp. Sur mobile, le bouton « Partager » ouvre directement le menu de
          partage natif avec photo incluse.
        </p>
      </header>

      <ShareComposer categories={categories} works={works} />
    </div>
  )
}
