import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShoppingBag, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listAllMedia, listAllSizes, listAllPrices, formatEur } from '@/lib/shop/print-shop'
import {
  createMedium, deleteMedium,
  createSize, deleteSize,
  setPriceCell,
} from './actions'
import FillMatrixButton from './FillMatrixButton'

/**
 * /admin/boutique/boutique — beheer van de configurator: print-media (4
 * default), sizes (5 default) en de prijs-matrix per (media, size) cel.
 *
 * Layout: 3 secties — Media beheer (table), Sizes beheer (table),
 * Prijs-matrix (grid van cellen, elk een mini-form voor edit).
 */
export default async function ShopBoutiqueAdminPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login?next=/admin/boutique/boutique')

  const [media, sizes, prices] = await Promise.all([
    listAllMedia(),
    listAllSizes(),
    listAllPrices(),
  ])

  // Lookup map (mediaId|sizeId) → cell
  const cellByKey = new Map(prices.map((p) => [`${p.media_id}|${p.size_id}`, p]))

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Admin
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Boutique (configurator)</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) mb-1 inline-flex items-center gap-2">
          <ShoppingBag size={24} /> Boutique — configurator
        </h1>
        <p className="text-sm text-(--color-charcoal)">
          Beheer de matrix van <strong>materialen × formaten × prijzen</strong> voor
          de print-on-demand configurator.
        </p>
      </header>

      {/* MEDIA */}
      <section className="bg-(--color-paper) border border-(--color-frame) rounded p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-3">
          Matériaux ({media.length})
        </h2>
        {media.length === 0 ? (
          <p className="text-sm text-(--color-stone) mb-4">
            Aucun matériau. Ajoutez-en au moins un (ex. fine_art, canvas, aluminum, plexi).
          </p>
        ) : (
          <ul className="divide-y divide-stone-200 mb-4">
            {media.map((m) => (
              <li key={m.id} className={`py-2 flex items-center justify-between gap-3 ${m.is_active ? '' : 'opacity-60'}`}>
                <div className="text-sm">
                  <span className="font-mono text-xs text-(--color-stone)">{m.slug}</span>
                  {' · '}
                  <span>{m.name_fr}</span>
                  {!m.is_active && <span className="text-xs text-(--color-stone)/70 ml-2">(inactif)</span>}
                </div>
                <form action={deleteMedium.bind(null, m.id)}>
                  <button type="submit" className="p-1.5 text-(--color-stone)/70 hover:text-amber-700" aria-label="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={createMedium} className="grid sm:grid-cols-3 gap-2 items-end">
          <Field label="Slug *" name="slug" placeholder="fine_art" required />
          <Field label="Nom FR *" name="name_fr" placeholder="Fine-Art papier" required />
          <Field label="Ordre" name="sort_order" type="number" defaultValue="0" />
          <Field label="Nom NL" name="name_nl" />
          <Field label="Nom EN" name="name_en" />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_active" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Actif</span>
          </label>
          <div className="sm:col-span-3">
            <button type="submit" className="inline-flex items-center gap-2 px-3 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm rounded">
              <Plus size={14} /> Ajouter matériau
            </button>
          </div>
        </form>
      </section>

      {/* SIZES */}
      <section className="bg-(--color-paper) border border-(--color-frame) rounded p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-3">
          Formats ({sizes.length})
        </h2>
        {sizes.length === 0 ? (
          <p className="text-sm text-(--color-stone) mb-4">
            Aucun format. Ajoutez-en quelques-uns (ex. S 30×45, M 50×75, L 70×100, …).
          </p>
        ) : (
          <ul className="divide-y divide-stone-200 mb-4">
            {sizes.map((s) => (
              <li key={s.id} className={`py-2 flex items-center justify-between gap-3 ${s.is_active ? '' : 'opacity-60'}`}>
                <div className="text-sm">
                  <span className="font-mono text-xs text-(--color-stone)">{s.slug}</span>{' · '}<span>{s.label}</span>
                  {!s.is_active && <span className="text-xs text-(--color-stone)/70 ml-2">(inactif)</span>}
                </div>
                <form action={deleteSize.bind(null, s.id)}>
                  <button type="submit" className="p-1.5 text-(--color-stone)/70 hover:text-amber-700" aria-label="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={createSize} className="grid sm:grid-cols-3 gap-2 items-end">
          <Field label="Slug *" name="slug" placeholder="m" required />
          <Field label="Label *" name="label" placeholder="M — 50×75 cm" required />
          <Field label="Ordre" name="sort_order" type="number" defaultValue="0" />
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="is_active" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Actif</span>
          </label>
          <button type="submit" className="inline-flex items-center gap-2 px-3 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm rounded">
            <Plus size={14} /> Ajouter format
          </button>
        </form>
      </section>

      {/* PRICE MATRIX — apparaît dès qu'il y a au moins 1 matériau et
          1 format. Sinon, message d'explication clair. */}
      {(media.length === 0 || sizes.length === 0) && (
        <section className="bg-amber-50 border border-amber-200 text-amber-900 rounded p-5">
          <p className="font-medium mb-2">Matrice de prix non disponible</p>
          <p className="text-sm">
            La matrice où vous saisissez les prix (ex. €60) apparaît dès qu&apos;il
            y a au moins <strong>1 matériau</strong> et <strong>1 format</strong>.
          </p>
          <ul className="text-sm mt-2 list-disc pl-5 space-y-0.5">
            {media.length === 0 && (
              <li>Ajoutez un matériau (remplissez <strong>Slug</strong> + <strong>Nom FR</strong> et cliquez sur &quot;Ajouter matériau&quot;).</li>
            )}
            {sizes.length === 0 && (
              <li>Ajoutez un format (Slug + Label).</li>
            )}
          </ul>
        </section>
      )}

      {media.length > 0 && sizes.length > 0 && (
        <section className="bg-(--color-paper) border border-(--color-frame) rounded p-5 overflow-x-auto">
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone)">
              Matrice de prix (€)
            </h2>
            <FillMatrixButton />
          </div>
          <p className="text-xs text-(--color-stone) mb-4">
            Cliquez sur une cellule pour modifier le prix. Cellule vide = combinaison non disponible.
            Utilisez <strong>« Compléter la matrice »</strong> pour remplir automatiquement
            toutes les cellules vides (base × multiplicateur 1.0 / 2.4 / 4.0 / 6.5 / 10.0).
          </p>
          <table className="text-sm border-collapse min-w-full">
            <thead>
              <tr className="border-b border-(--color-frame)">
                <th className="text-left p-2 font-medium text-(--color-stone)">Materiaal \\ Formaat</th>
                {sizes.map((s) => (
                  <th key={s.id} className="p-2 text-center font-medium">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {media.map((m) => (
                <tr key={m.id} className="border-b border-(--color-frame)/60">
                  <td className="p-2 font-medium">{m.name_fr}</td>
                  {sizes.map((s) => {
                    const cell = cellByKey.get(`${m.id}|${s.id}`)
                    return (
                      <td key={s.id} className="p-1">
                        <form action={setPriceCell} className="flex items-center gap-1">
                          <input type="hidden" name="media_id" value={m.id} />
                          <input type="hidden" name="size_id" value={s.id} />
                          <input
                            type="number"
                            step="0.01"
                            name="price_eur"
                            defaultValue={cell ? (cell.price_cents / 100).toFixed(2) : ''}
                            placeholder="—"
                            className="w-20 px-2 py-1 border border-(--color-frame) rounded text-sm text-right tabular-nums"
                          />
                          <input
                            type="checkbox"
                            name="is_available"
                            defaultChecked={cell ? cell.is_available : true}
                            className="w-3 h-3"
                            title="Disponible"
                          />
                          <button type="submit" className="text-xs text-(--color-stone)/70 hover:text-(--color-ink)">↵</button>
                        </form>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-(--color-stone)/70 mt-3">
            Astuce : laissez le champ prix vide et appuyez sur Entrée pour supprimer une cellule.
            Vink het check-vakje uit om de combo tijdelijk te deactiveren zonder de prijs te verliezen.
          </p>
        </section>
      )}
    </main>
  )
}

function Field({
  label, name, type = 'text', placeholder, defaultValue, required,
}: {
  label: string; name: string; type?: string; placeholder?: string
  defaultValue?: string; required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-xs text-(--color-charcoal) mb-1 block">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) rounded text-sm"
      />
    </label>
  )
}
