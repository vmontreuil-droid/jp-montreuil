import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Truck, ArrowLeft, Plus, Trash2, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { adminListZones } from '@/lib/shop/shipping'
import { createZone, updateZone, deleteZone } from './actions'

export default async function ShopShippingAdminPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login?next=/admin/boutique/shipping')

  const zones = await adminListZones()

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Admin
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Frais de port</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <Truck size={24} /> Frais de port
        </h1>
        <p className="text-sm text-(--color-charcoal)">
          Définissez vos zones d&apos;expédition. Une zone marquée{' '}
          <Star size={11} className="inline -mt-0.5" /> <em>défaut</em> sert d&apos;attrape-tout.
        </p>
      </header>

      {zones.length === 0 ? (
        <p className="text-(--color-stone)">Geen zones — voeg er minstens 1 toe.</p>
      ) : (
        <div className="bg-(--color-paper) border border-(--color-frame) rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-(--color-frame) bg-(--color-canvas)">
              <tr className="text-left text-xs text-(--color-stone) uppercase tracking-wider">
                <th className="p-3">Nom</th>
                <th className="p-3">Pays (ISO-2)</th>
                <th className="p-3 w-24">Base (€)</th>
                <th className="p-3 w-28">Gratuit dès (€)</th>
                <th className="p-3 w-16">Ordre</th>
                <th className="p-3 w-16 text-center">Actif</th>
                <th className="p-3 w-16 text-center">Défaut</th>
                <th className="p-3 w-32" />
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => {
                const upd = updateZone.bind(null, z.id)
                return (
                  <tr key={z.id} className="border-b border-(--color-frame)/60">
                    <td className="p-2">
                      <form id={`z-${z.id}`} action={upd} className="contents">
                        <input type="text" name="name" defaultValue={z.name} required
                          className="w-full px-2 py-1 bg-(--color-paper) border border-(--color-frame) rounded text-sm" />
                      </form>
                    </td>
                    <td className="p-2">
                      <input form={`z-${z.id}`} type="text" name="countries"
                        defaultValue={z.countries.join(', ')}
                        placeholder="BE, NL, LU"
                        className="w-full px-2 py-1 bg-(--color-paper) border border-(--color-frame) rounded text-xs font-mono" />
                    </td>
                    <td className="p-2">
                      <input form={`z-${z.id}`} type="number" step="0.01" name="base_eur"
                        defaultValue={(z.base_cents / 100).toFixed(2)}
                        className="w-full px-2 py-1 bg-(--color-paper) border border-(--color-frame) rounded text-sm" />
                    </td>
                    <td className="p-2">
                      <input form={`z-${z.id}`} type="number" step="0.01" name="free_above_eur"
                        defaultValue={z.free_above_cents != null ? (z.free_above_cents / 100).toFixed(2) : ''}
                        placeholder="—"
                        className="w-full px-2 py-1 bg-(--color-paper) border border-(--color-frame) rounded text-sm" />
                    </td>
                    <td className="p-2">
                      <input form={`z-${z.id}`} type="number" name="sort_order"
                        defaultValue={String(z.sort_order)}
                        className="w-full px-2 py-1 bg-(--color-paper) border border-(--color-frame) rounded text-sm" />
                    </td>
                    <td className="p-2 text-center">
                      <input form={`z-${z.id}`} type="checkbox" name="is_active" defaultChecked={z.is_active} className="w-4 h-4" />
                    </td>
                    <td className="p-2 text-center">
                      <input form={`z-${z.id}`} type="checkbox" name="is_default" defaultChecked={z.is_default} className="w-4 h-4" />
                    </td>
                    <td className="p-2 flex gap-1 justify-end">
                      <button form={`z-${z.id}`} type="submit"
                        className="px-3 py-1 bg-(--color-bronze) text-white text-xs rounded hover:bg-(--color-bronze-dark)">
                        ✓
                      </button>
                      <form action={deleteZone.bind(null, z.id)}>
                        <button type="submit" className="p-1.5 text-(--color-stone)/70 hover:text-amber-700">
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

      {/* Nieuwe zone */}
      <section className="bg-(--color-paper) border border-(--color-frame) rounded p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-(--color-stone) mb-3">
          Nouvelle zone
        </h2>
        <form action={createZone} className="grid sm:grid-cols-3 gap-2 items-end">
          <Field label="Nom *" name="name" required placeholder="Belgique" />
          <Field label="Pays (ISO-2, séparés par virgule)" name="countries" placeholder="BE, NL" />
          <Field label="Ordre" name="sort_order" type="number" defaultValue="0" />
          <Field label="Base (€) *" name="base_eur" type="number" step="0.01" required placeholder="5.95" />
          <Field label="Gratuit dès (€)" name="free_above_eur" type="number" step="0.01" placeholder="75" />
          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" defaultChecked className="w-4 h-4" /> Actif
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_default" className="w-4 h-4" /> Défaut
            </label>
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="inline-flex items-center gap-2 px-3 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm rounded">
              <Plus size={14} /> Ajouter zone
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

function Field({
  label, name, type = 'text', placeholder, defaultValue, required, step,
}: {
  label: string; name: string; type?: string; placeholder?: string
  defaultValue?: string; required?: boolean; step?: string
}) {
  return (
    <label className="block">
      <span className="text-xs text-(--color-charcoal) mb-1 block">{label}</span>
      <input
        type={type} name={name} placeholder={placeholder} defaultValue={defaultValue}
        required={required} step={step}
        className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) rounded text-sm"
      />
    </label>
  )
}
