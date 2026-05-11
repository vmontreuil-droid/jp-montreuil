import Link from 'next/link'
import { ArrowLeft, Truck, Plus, Phone, Mail, Check, X } from 'lucide-react'
import { listSuppliers } from '@/lib/shop/suppliers'

export const dynamic = 'force-dynamic'

const MEDIA_LABELS: Record<string, string> = {
  fine_art: 'Fine-Art',
  canvas: 'Canvas',
  aluminum: 'Dibond',
  plexi: 'Plexi',
}

export default async function SuppliersListPage() {
  const suppliers = await listSuppliers()

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Boutique
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Imprimeurs</span>
      </div>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
            <Truck className="w-6 h-6 text-(--color-bronze)" />
            Imprimeurs
          </h1>
          <p className="text-sm text-(--color-charcoal)">
            {suppliers.length} imprimeur{suppliers.length === 1 ? '' : 's'}
            {' · '}
            {suppliers.filter((s) => s.is_active).length} actif{suppliers.filter((s) => s.is_active).length === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/admin/boutique/imprimeurs/nouveau"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em]"
        >
          <Plus className="w-4 h-4" />
          Nouvel imprimeur
        </Link>
      </header>

      {suppliers.length === 0 ? (
        <div className="bg-(--color-paper) border border-(--color-frame) p-12 text-center">
          <Truck className="w-10 h-10 mx-auto mb-4 text-(--color-stone)/40" />
          <p className="text-sm text-(--color-charcoal)">
            Aucun imprimeur. Ajoutez-en un pour pouvoir envoyer des bons de production.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {suppliers.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/boutique/imprimeurs/${s.id}`}
                className={`block bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) p-5 transition-colors ${
                  s.is_active ? '' : 'opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-display)] text-xl text-(--color-ink) leading-snug">
                      {s.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--color-stone)">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> {s.email}
                      </span>
                      {s.phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-3 h-3" /> {s.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-1 ${
                    s.is_active ? 'bg-emerald-100 text-emerald-900' : 'bg-(--color-frame)/40 text-(--color-stone)'
                  }`}>
                    {s.is_active ? <><Check className="w-3 h-3" /> Actif</> : <><X className="w-3 h-3" /> Inactif</>}
                  </span>
                </div>

                {s.default_for_media.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.default_for_media.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] uppercase tracking-widest text-(--color-bronze) border border-(--color-bronze)/40 bg-(--color-bronze)/10 px-2 py-0.5"
                      >
                        {MEDIA_LABELS[m] ?? m}
                      </span>
                    ))}
                  </div>
                )}
                {s.notes && (
                  <p className="mt-3 text-xs text-(--color-charcoal) italic line-clamp-2">
                    {s.notes}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
