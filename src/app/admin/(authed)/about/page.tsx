import { User, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import NewAboutForm from './NewAboutForm'
import AboutListItem from './AboutListItem'

export const dynamic = 'force-dynamic'

type Section = {
  id: string
  sort_order: number
  title_fr: string
  title_nl: string
  body_fr: string
  body_nl: string
  image_path: string | null
}

export default async function AboutAdminPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('about_sections')
    .select('id, sort_order, title_fr, title_nl, body_fr, body_nl, image_path')
    .order('sort_order', { ascending: true })
    .returns<Section[]>()

  const sections = data ?? []

  return (
    <div className="p-8 md:p-12 max-w-4xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          À propos
        </h1>
        <p className="mt-2 text-sm text-(--color-stone)">
          Sections affichées sur la page <code>/a-propos</code>. Réordonne avec les flèches,
          édite via le titre.
        </p>
      </header>

      <div className="mb-10 bg-(--color-paper) border border-(--color-frame) p-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          Nouvelle section
        </h2>
        <NewAboutForm />
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-(--color-stone) bg-(--color-paper) border border-(--color-frame)">
          <User className="w-12 h-12 mb-4 opacity-50" />
          <p>Aucune section pour le moment.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sections.map((s, i) => (
            <AboutListItem
              key={s.id}
              section={s}
              isFirst={i === 0}
              isLast={i === sections.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
