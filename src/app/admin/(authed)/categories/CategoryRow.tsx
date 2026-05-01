'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUp, ArrowDown, ChevronDown, Save, Loader2, Trash2, Image as ImageIcon, Plus } from 'lucide-react'
import { workImageUrl } from '@/lib/links'
import { updateCategory, moveCategory, deleteCategory } from './actions'
import type { CategoryWithWorks } from './page'

type Props = {
  cat: CategoryWithWorks
  isFirst: boolean
  isLast: boolean
}

export default function CategoryRow({ cat, isFirst, isLast }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [saving, startSave] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const coverPath = cat.cover?.storage_path

  function move(dir: 'up' | 'down') {
    startTransition(() => {
      void moveCategory(cat.id, dir)
    })
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('id', cat.id)
    startSave(() => {
      void updateCategory(fd)
    })
  }

  function onDelete() {
    const count = cat.works.length
    const confirmMsg = count > 0
      ? `Supprimer "${cat.label_fr}" ? Cette action supprimera aussi les ${count} œuvre(s) et leurs photos.\n\nIRRÉVERSIBLE.`
      : `Supprimer "${cat.label_fr}" ?`
    if (!confirm(confirmMsg)) return
    setDeleteError(null)
    startDelete(() => {
      void (async () => {
        const r = await deleteCategory(cat.id)
        if (!r.ok) setDeleteError(r.error ?? 'Erreur')
      })()
    })
  }

  return (
    <div className="bg-(--color-paper) border border-(--color-frame)">
      <div className="flex items-stretch gap-3 p-3">
        {/* Cover thumb */}
        <div className="relative w-20 h-24 shrink-0 bg-(--color-canvas) overflow-hidden">
          {coverPath && (
            <Image
              src={workImageUrl(coverPath)}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          )}
        </div>

        {/* Info */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex-1 text-left min-w-0"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-[0.15em] text-(--color-stone)">
              #{cat.sort_order} · /{cat.slug}
            </span>
          </div>
          <p className="text-(--color-ink) font-[family-name:var(--font-display)] text-xl">
            {cat.label_fr}
          </p>
          <p className="text-sm text-(--color-stone)">{cat.label_nl}</p>
          <p className="text-xs text-(--color-stone) mt-1">
            {cat.works.length} {cat.works.length === 1 ? 'œuvre' : 'œuvres'}
          </p>
        </button>

        {/* Actions */}
        <div className="flex flex-col items-center justify-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => move('up')}
            disabled={isFirst || pending}
            aria-label="Monter"
            className="p-1 text-(--color-stone) hover:text-(--color-ink) disabled:opacity-30"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => move('down')}
            disabled={isLast || pending}
            aria-label="Descendre"
            className="p-1 text-(--color-stone) hover:text-(--color-ink) disabled:opacity-30"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Fermer' : 'Ouvrir'}
          className="p-2 text-(--color-stone) hover:text-(--color-ink) self-center"
        >
          <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="border-t border-(--color-frame) p-5 space-y-4 bg-(--color-canvas)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
                Label FR
              </label>
              <input
                name="label_fr"
                defaultValue={cat.label_fr}
                required
                className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
                Label NL
              </label>
              <input
                name="label_nl"
                defaultValue={cat.label_nl}
                required
                className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
                Description FR
              </label>
              <textarea
                name="description_fr"
                defaultValue={cat.description_fr ?? ''}
                rows={2}
                className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) resize-y"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
                Description NL
              </label>
              <textarea
                name="description_nl"
                defaultValue={cat.description_nl ?? ''}
                rows={2}
                className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) resize-y"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
              Photo de couverture
            </label>
            <select
              name="cover_work_id"
              defaultValue={cat.cover_work_id ?? ''}
              className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
            >
              <option value="">— aucune —</option>
              {cat.works
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title_fr || w.storage_path.split('/').pop()}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-(--color-frame)">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.15em] disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>

            <Link
              href={`/admin/works?cat=${cat.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-(--color-frame) text-(--color-charcoal) hover:text-(--color-ink) hover:border-(--color-stone) text-sm uppercase tracking-[0.15em]"
            >
              <ImageIcon className="w-4 h-4" />
              Gérer les photos ({cat.works.length})
            </Link>

            <Link
              href={`/admin/works/upload?cat=${cat.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-(--color-frame) text-(--color-charcoal) hover:text-(--color-ink) hover:border-(--color-stone) text-sm uppercase tracking-[0.15em]"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </Link>

            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 border border-red-900/40 text-red-300 hover:bg-red-950/40 text-sm uppercase tracking-[0.15em] disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Supprimer
            </button>
          </div>

          {deleteError && (
            <p className="text-sm text-red-300 bg-red-950/40 border border-red-900 px-3 py-2">
              {deleteError}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
