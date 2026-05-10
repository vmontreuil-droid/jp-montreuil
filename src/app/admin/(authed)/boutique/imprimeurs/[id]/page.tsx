import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { getSupplierById } from '@/lib/shop/suppliers'
import SupplierForm from '../SupplierForm'
import { updateSupplier, deleteSupplier } from '../actions'

export const dynamic = 'force-dynamic'

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supplier = await getSupplierById(id)
  if (!supplier) notFound()

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique/imprimeurs" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Imprimeurs
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink) truncate max-w-xs">{supplier.name}</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink)">
          {supplier.name}
        </h1>
      </header>

      <SupplierForm action={updateSupplier.bind(null, id)} initial={supplier} />

      <form action={deleteSupplier.bind(null, id)}>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-3 py-2 bg-(--color-paper) border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm rounded"
        >
          <Trash2 className="w-4 h-4" /> Supprimer cet imprimeur
        </button>
      </form>
    </main>
  )
}
