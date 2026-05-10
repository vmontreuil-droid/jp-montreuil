import Link from 'next/link'
import { ArrowLeft, Tag, Plus, Trash2, Save } from 'lucide-react'
import { listDiscountCodes } from '@/lib/shop/discount-codes'
import { createDiscount, updateDiscount, deleteDiscount } from './actions'

export const dynamic = 'force-dynamic'

export default async function DiscountsAdminPage() {
  const codes = await listDiscountCodes()

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Boutique
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Codes promo</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <Tag className="w-6 h-6 text-(--color-bronze)" />
          Codes promo
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-1">
          Réductions appliquées au panier via un code (% ou montant fixe).
        </p>
      </header>

      {codes.length === 0 ? (
        <p className="text-(--color-stone)">Aucun code — ajoutez-en un ci-dessous.</p>
      ) : (
        <div className="bg-(--color-paper) border border-(--color-frame) overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-(--color-frame) bg-(--color-canvas)/40">
              <tr className="text-left text-xs text-(--color-stone) uppercase tracking-widest">
                <th className="p-3">Code</th>
                <th className="p-3 w-28">Type</th>
                <th className="p-3 w-24">Valeur</th>
                <th className="p-3 w-32">Min. (€)</th>
                <th className="p-3 w-24">Usages</th>
                <th className="p-3 w-40">Expire</th>
                <th className="p-3 w-16 text-center">Actif</th>
                <th className="p-3 w-32" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const upd = updateDiscount.bind(null, c.id)
                return (
                  <tr key={c.id} className="border-b border-(--color-frame)/60">
                    <td className="p-2">
                      <form id={`d-${c.id}`} action={upd} className="contents">
                        <input
                          type="text"
                          name="code"
                          defaultValue={c.code}
                          required
                          className="w-full px-2 py-1 bg-(--color-canvas) border border-(--color-frame) rounded text-sm font-mono uppercase"
                        />
                      </form>
                    </td>
                    <td className="p-2">
                      <select
                        form={`d-${c.id}`}
                        name="kind"
                        defaultValue={c.kind}
                        className="w-full px-2 py-1 bg-(--color-canvas) border border-(--color-frame) rounded text-sm"
                      >
                        <option value="percent">% Pourcent</option>
                        <option value="fixed_amount">€ Fixe</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        form={`d-${c.id}`}
                        type="number"
                        name="value"
                        defaultValue={c.kind === 'percent' ? c.value : (c.value / 100).toFixed(2)}
                        step={c.kind === 'percent' ? '1' : '0.01'}
                        min="0"
                        className="w-full px-2 py-1 bg-(--color-canvas) border border-(--color-frame) rounded text-sm"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        form={`d-${c.id}`}
                        type="number"
                        name="min_subtotal_eur"
                        defaultValue={(c.min_subtotal_cents / 100).toFixed(2)}
                        step="0.01"
                        min="0"
                        className="w-full px-2 py-1 bg-(--color-canvas) border border-(--color-frame) rounded text-sm"
                      />
                    </td>
                    <td className="p-2 text-xs text-(--color-stone) text-center">
                      {c.uses_count}
                      {c.max_uses != null && ` / ${c.max_uses}`}
                      <input
                        form={`d-${c.id}`}
                        type="number"
                        name="max_uses"
                        defaultValue={c.max_uses ?? ''}
                        placeholder="∞"
                        min="0"
                        className="w-full mt-1 px-2 py-1 bg-(--color-canvas) border border-(--color-frame) rounded text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        form={`d-${c.id}`}
                        type="date"
                        name="expires_at"
                        defaultValue={c.expires_at ? c.expires_at.slice(0, 10) : ''}
                        className="w-full px-2 py-1 bg-(--color-canvas) border border-(--color-frame) rounded text-xs"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        form={`d-${c.id}`}
                        type="checkbox"
                        name="is_active"
                        defaultChecked={c.is_active}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="p-2 flex gap-1 justify-end">
                      <button
                        form={`d-${c.id}`}
                        type="submit"
                        className="px-3 py-1 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs rounded inline-flex items-center gap-1"
                      >
                        <Save size={12} />
                      </button>
                      <form action={deleteDiscount.bind(null, c.id)}>
                        <button
                          type="submit"
                          className="p-1.5 text-(--color-stone) hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Nouveau code */}
      <section className="bg-(--color-paper) border border-(--color-frame) p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
          Nouveau code
        </h2>
        <form action={createDiscount} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Code *" name="code" placeholder="ETE2026" required uppercase />
          <SelectField
            label="Type *"
            name="kind"
            options={[{ value: 'percent', label: '% Pourcent' }, { value: 'fixed_amount', label: '€ Fixe' }]}
          />
          <Field label="Valeur *" name="value" type="number" step="0.01" min="0" placeholder="10" required />
          <Field label="Min. panier (€)" name="min_subtotal_eur" type="number" step="0.01" min="0" placeholder="50" />
          <Field label="Max. usages" name="max_uses" type="number" min="0" placeholder="∞" />
          <Field label="Expire (date)" name="expires_at" type="date" />
          <Field label="Description" name="description" placeholder="Promo été 2026" />
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.2em]"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

function Field({
  label, name, type = 'text', placeholder, required, step, min, uppercase,
}: {
  label: string; name: string; type?: string; placeholder?: string
  required?: boolean; step?: string; min?: string; uppercase?: boolean
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5 block">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        step={step}
        min={min}
        className={`w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none ${uppercase ? 'uppercase font-mono' : ''}`}
      />
    </label>
  )
}

function SelectField({ label, name, options }: { label: string; name: string; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5 block">{label}</span>
      <select
        name={name}
        className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}
