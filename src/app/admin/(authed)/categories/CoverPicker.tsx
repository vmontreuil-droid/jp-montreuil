'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, X } from 'lucide-react'
import { workImageUrl } from '@/lib/links'

type Work = {
  id: string
  storage_path: string
  title_fr: string | null
  sort_order: number
}

type Props = {
  works: Work[]
  defaultValue: string | null
  name: string
}

export default function CoverPicker({ works, defaultValue, name }: Props) {
  const [selected, setSelected] = useState<string | null>(defaultValue)
  const sorted = [...works].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div>
      <input type="hidden" name={name} value={selected ?? ''} />

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {/* "Aucune" tegel */}
        <button
          type="button"
          onClick={() => setSelected(null)}
          className={`relative aspect-square flex flex-col items-center justify-center gap-1 border transition-colors ${
            selected === null
              ? 'border-(--color-bronze) bg-(--color-bronze)/10'
              : 'border-(--color-frame) bg-(--color-paper) hover:border-(--color-stone)'
          }`}
          aria-label="Aucune photo"
          aria-pressed={selected === null}
        >
          <X className="w-5 h-5 text-(--color-stone)" />
          <span className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">
            aucune
          </span>
          {selected === null && (
            <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-(--color-bronze) text-white flex items-center justify-center">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
          )}
        </button>

        {sorted.map((w) => {
          const active = selected === w.id
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelected(w.id)}
              className={`relative aspect-square overflow-hidden border-2 transition-colors ${
                active
                  ? 'border-(--color-bronze)'
                  : 'border-(--color-frame) hover:border-(--color-stone)'
              }`}
              aria-label={w.title_fr || `Œuvre ${w.sort_order}`}
              aria-pressed={active}
            >
              <Image
                src={workImageUrl(w.storage_path)}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
              {active && (
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-(--color-bronze) text-white flex items-center justify-center z-10">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-(--color-stone) italic mt-2">
          Aucune œuvre dans cette catégorie. Ajoute d&apos;abord des photos.
        </p>
      )}
    </div>
  )
}
