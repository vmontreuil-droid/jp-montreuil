import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import SupplierForm from '../SupplierForm'
import { createSupplier } from '../actions'

export default function NewSupplierPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique/imprimeurs" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Imprimeurs
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Nouveau</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <Plus className="w-6 h-6 text-(--color-bronze)" />
          Nouvel imprimeur
        </h1>
      </header>

      <SupplierForm action={createSupplier} submitLabel="Créer" />
    </main>
  )
}
