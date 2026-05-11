import Link from 'next/link'
import { ArrowLeft, Check, Brush, Star, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { workImageUrl } from '@/lib/links'
import { toggleDevisExample } from './actions'

export const dynamic = 'force-dynamic'

type Category = {
  id: string
  label_fr: string
  works: WorkRow[]
}

type WorkRow = {
  id: string
  storage_path: string
  title_fr: string | null
  title_nl: string | null
  technique_fr: string | null
  category_id: string
  sort_order: number
  is_devis_example: boolean | null
}

export default async function DevisExamplesAdminPage() {
  const supabase = await createClient()
  const { data: categoriesRaw, error } = await supabase
    .from('categories')
    .select(`
      id, label_fr,
      works:works!works_category_id_fkey(id, storage_path, title_fr, title_nl, technique_fr, category_id, sort_order, is_devis_example)
    `)
    .order('sort_order', { ascending: true })

  if (error) {
    return <div className="p-8 text-red-400">Erreur: {error.message}</div>
  }

  const categories: Category[] =
    (categoriesRaw ?? []).map((c) => ({
      id: c.id as string,
      label_fr: c.label_fr as string,
      works: ((c.works ?? []) as WorkRow[]).sort((a, b) => a.sort_order - b.sort_order),
    }))

  const selectedWorks = categories
    .flatMap((c) => c.works.filter((w) => w.is_devis_example))
    .sort((a, b) => a.sort_order - b.sort_order)
  const totalSelected = selectedWorks.length

  return (
    <div className="p-8 md:p-12 max-w-7xl">
      <div className="mb-6">
        <Link
          href="/admin/commissions"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux demandes
        </Link>
      </div>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Exemples sur la page Devis
        </h1>
        <p className="mt-2 text-sm text-(--color-charcoal) max-w-2xl">
          Cochez les œuvres qui apparaîtront dans la grille « Quelques exemples »
          sur <code>/devis</code> et <code>/nl/devis</code>. Maximum 12 affichés,
          dans l’ordre de tri normal. Si vous n’en cochez aucune, les 8
          premières œuvres sont utilisées par défaut.
        </p>
        <p className="mt-2 text-xs text-(--color-bronze) font-semibold">
          {totalSelected > 0
            ? `${totalSelected} œuvre${totalSelected > 1 ? 's' : ''} sélectionnée${totalSelected > 1 ? 's' : ''}`
            : 'Aucune sélection — les 8 premières œuvres sont affichées par défaut.'}
        </p>
      </header>

      {/* Huidige selectie bovenaan — overzicht in volgorde van weergave op /devis */}
      {totalSelected > 0 && (
        <section className="mb-10 border border-(--color-bronze)/40 bg-(--color-bronze)/5 p-6">
          <h2 className="text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-(--color-bronze)" />
            Sélection actuelle ({totalSelected})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {selectedWorks.map((w) => (
              <form key={w.id} action={toggleDevisExample}>
                <input type="hidden" name="id" value={w.id} />
                <input type="hidden" name="value" value="false" />
                <button
                  type="submit"
                  title="Cliquer pour retirer de la sélection"
                  className="group relative block w-full aspect-square overflow-hidden border-2 border-(--color-bronze) shadow-md shadow-(--color-bronze)/20"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={workImageUrl(w.storage_path)}
                    alt={w.title_fr || ''}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute inset-0 bg-(--color-ink)/0 group-hover:bg-(--color-ink)/60 transition-colors flex items-center justify-center">
                    <X className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </button>
              </form>
            ))}
          </div>
          <p className="mt-3 text-xs text-(--color-stone) italic">
            Cliquez sur une œuvre pour la retirer · ordre = ordre d’affichage sur /devis.
          </p>
        </section>
      )}

      <div className="space-y-10">
        {categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-3 inline-flex items-center gap-2">
              <Brush className="w-3.5 h-3.5 text-(--color-bronze)" />
              {cat.label_fr}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {cat.works.map((w) => {
                const isSelected = !!w.is_devis_example
                return (
                  <form key={w.id} action={toggleDevisExample}>
                    <input type="hidden" name="id" value={w.id} />
                    <input
                      type="hidden"
                      name="value"
                      value={(!isSelected).toString()}
                    />
                    <button
                      type="submit"
                      className={`relative block w-full aspect-square overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-(--color-bronze) shadow-lg shadow-(--color-bronze)/30'
                          : 'border-(--color-frame) hover:border-(--color-stone) opacity-70 hover:opacity-100'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={workImageUrl(w.storage_path)}
                        alt={w.title_fr || ''}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center bg-(--color-bronze) text-white">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  </form>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
