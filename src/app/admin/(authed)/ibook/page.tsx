import { BookOpen, Plus } from 'lucide-react'
import { getAllIbooks } from '@/lib/ibook'
import NewIbookForm from './NewIbookForm'
import IbookListItem from './IbookListItem'

export const dynamic = 'force-dynamic'

export default async function IbookAdminPage() {
  const ibooks = await getAllIbooks()

  return (
    <div className="p-8 md:p-12 max-w-4xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Ibook
        </h1>
        <p className="mt-2 text-sm text-(--color-stone) max-w-2xl">
          PDF-boeken (catalogue, expo&apos;s...) die op de site getoond worden in een
          popup-viewer. Elk ibook heeft eigen cover-foto, QR-code en PDF.
        </p>
      </header>

      {/* Nouvel ibook */}
      <div className="mb-10 bg-(--color-paper) border border-(--color-frame) p-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          Nouvel ibook
        </h2>
        <NewIbookForm />
      </div>

      {ibooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-(--color-stone) bg-(--color-paper) border border-(--color-frame)">
          <BookOpen className="w-12 h-12 mb-4 opacity-50" />
          <p>Aucun ibook pour le moment.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {ibooks.map((b, i) => (
            <IbookListItem
              key={b.id}
              ibook={b}
              isFirst={i === 0}
              isLast={i === ibooks.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
