import { Save } from 'lucide-react'

const MEDIA = [
  { slug: 'fine_art', label: 'Fine-Art papier' },
  { slug: 'canvas', label: 'Canvas' },
  { slug: 'aluminum', label: 'Aluminium dibond' },
  { slug: 'plexi', label: 'Plexiglas' },
]

type Initial = {
  name?: string
  email?: string
  phone?: string | null
  default_for_media?: string[]
  notes?: string | null
  sort_order?: number
  is_active?: boolean
}

/**
 * Server-side form (no client state). Wordt zowel in /nouveau als
 * /[id] gebruikt — actie wordt door de parent geleverd.
 */
export default function SupplierForm({
  action,
  initial,
  submitLabel = 'Enregistrer',
}: {
  action: (form: FormData) => void | Promise<void>
  initial?: Initial
  submitLabel?: string
}) {
  const i = initial ?? {}
  return (
    <form action={action} className="bg-(--color-paper) border border-(--color-frame) p-6 space-y-4">
      <Field label="Nom *" name="name" required defaultValue={i.name ?? ''} placeholder="Imprimerie De Vries" />
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Email *" name="email" type="email" required defaultValue={i.email ?? ''} placeholder="orders@…" />
        <Field label="Téléphone" name="phone" type="tel" defaultValue={i.phone ?? ''} placeholder="+32 …" />
      </div>

      <fieldset>
        <legend className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Médias par défaut
        </legend>
        <p className="text-[11px] text-(--color-stone) mb-3">
          Cochez les supports pour lesquels cet imprimeur sera choisi automatiquement
          lors d&apos;une nouvelle commande payée.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {MEDIA.map((m) => (
            <label key={m.slug} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`media_${m.slug}`}
                defaultChecked={(i.default_for_media ?? []).includes(m.slug)}
                className="w-4 h-4"
              />
              <span className="text-(--color-charcoal)">{m.label}</span>
              <span className="text-[10px] text-(--color-stone) font-mono">({m.slug})</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5 block">
          Notes (privé)
        </span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={i.notes ?? ''}
          placeholder="Délais habituels, contact privilégié, prix négociés…"
          className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-3 items-center">
        <Field label="Ordre d'affichage" name="sort_order" type="number" defaultValue={String(i.sort_order ?? 0)} />
        <label className="flex items-center gap-2 text-sm mt-6">
          <input type="checkbox" name="is_active" defaultChecked={i.is_active ?? true} className="w-4 h-4" />
          <span className="text-(--color-charcoal)">Actif (sélectionnable pour les bons)</span>
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex items-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em]"
      >
        <Save className="w-4 h-4" />
        {submitLabel}
      </button>
    </form>
  )
}

function Field({
  label, name, type = 'text', required, defaultValue, placeholder,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5 block">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
      />
    </label>
  )
}
