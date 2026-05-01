'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { ArrowUp, ArrowDown, Pencil, Trash2, Save, Loader2, X } from 'lucide-react'
import { workImageUrl } from '@/lib/links'
import { updateWork, deleteWork, moveWork } from './actions'

type Work = {
  id: string
  category_id: string
  storage_path: string
  title_fr: string | null
  title_nl: string | null
  year: number | null
  technique_fr: string | null
  technique_nl: string | null
  dimensions: string | null
  sort_order: number
  original_source_url: string | null
}

type Category = { id: string; slug: string; label_fr: string; label_nl: string }

type Props = {
  works: Work[]
  categories: Category[]
}

export default function WorksList({ works, categories }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function move(id: string, dir: 'up' | 'down') {
    startTransition(() => {
      void moveWork(id, dir)
    })
  }

  function onDelete(work: Work) {
    if (!confirm(`Supprimer cette œuvre ? Le fichier image sera aussi supprimé.`)) return
    startTransition(() => {
      void deleteWork(work.id)
    })
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {works.map((work, i) => {
        const isEditing = editing === work.id
        return (
          <div
            key={work.id}
            className="bg-(--color-paper) border border-(--color-frame) overflow-hidden flex flex-col"
          >
            <div className="relative aspect-square bg-(--color-canvas) overflow-hidden">
              <Image
                src={workImageUrl(work.storage_path)}
                alt={work.title_fr || ''}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
              <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] uppercase tracking-[0.15em]">
                #{work.sort_order}
              </span>
            </div>

            <div className="p-3 text-sm flex-1 flex flex-col">
              <p className="text-(--color-ink) truncate">
                {work.title_fr || <span className="text-(--color-stone) italic">sans titre</span>}
              </p>
              {work.year && <p className="text-xs text-(--color-stone)">{work.year}</p>}

              <div className="mt-3 flex items-center gap-1 mt-auto">
                <button
                  type="button"
                  onClick={() => move(work.id, 'up')}
                  disabled={i === 0 || pending}
                  aria-label="Monter"
                  className="p-1.5 text-(--color-stone) hover:text-(--color-ink) disabled:opacity-30"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(work.id, 'down')}
                  disabled={i === works.length - 1 || pending}
                  aria-label="Descendre"
                  className="p-1.5 text-(--color-stone) hover:text-(--color-ink) disabled:opacity-30"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(isEditing ? null : work.id)}
                  aria-label="Éditer"
                  className="ml-auto p-1.5 text-(--color-stone) hover:text-(--color-bronze)"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(work)}
                  disabled={pending}
                  aria-label="Supprimer"
                  className="p-1.5 text-(--color-stone) hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isEditing && (
              <EditForm
                work={work}
                categories={categories}
                onClose={() => setEditing(null)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function EditForm({
  work,
  categories,
  onClose,
}: {
  work: Work
  categories: Category[]
  onClose: () => void
}) {
  const [saving, startSave] = useTransition()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('id', work.id)
    startSave(() => {
      void (async () => {
        await updateWork(fd)
        onClose()
      })()
    })
  }

  return (
    <form onSubmit={onSubmit} className="border-t border-(--color-frame) p-4 space-y-3 bg-(--color-canvas)">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">Édition</span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-(--color-stone) hover:text-(--color-ink)">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1">
          Titre FR
        </label>
        <input
          name="title_fr"
          defaultValue={work.title_fr ?? ''}
          className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-sm text-(--color-ink)"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1">
          Titel NL
        </label>
        <input
          name="title_nl"
          defaultValue={work.title_nl ?? ''}
          className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-sm text-(--color-ink)"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1">
            Année
          </label>
          <input
            name="year"
            type="number"
            defaultValue={work.year ?? ''}
            className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-sm text-(--color-ink)"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1">
            Dimensions
          </label>
          <input
            name="dimensions"
            placeholder="60 x 80 cm"
            defaultValue={work.dimensions ?? ''}
            className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-sm text-(--color-ink)"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1">
            Technique FR
          </label>
          <input
            name="technique_fr"
            defaultValue={work.technique_fr ?? ''}
            className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-sm text-(--color-ink)"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1">
            Techniek NL
          </label>
          <input
            name="technique_nl"
            defaultValue={work.technique_nl ?? ''}
            className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-sm text-(--color-ink)"
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1">
          Catégorie
        </label>
        <select
          name="category_id"
          defaultValue={work.category_id}
          className="w-full px-2 py-1.5 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-sm text-(--color-ink)"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label_fr}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-(--color-bronze) text-white text-xs uppercase tracking-[0.15em] hover:bg-(--color-bronze-dark) disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Enregistrer
      </button>
    </form>
  )
}
