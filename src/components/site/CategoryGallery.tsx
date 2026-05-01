'use client'

import { useState } from 'react'
import Image from 'next/image'
import { workImageUrl } from '@/lib/links'
import Lightbox, { type LightboxWork } from './Lightbox'

type Props = {
  works: LightboxWork[]
  locale: 'fr' | 'nl'
}

const labels = {
  fr: { prev: 'Précédent', next: 'Suivant', close: 'Fermer' },
  nl: { prev: 'Vorige',    next: 'Volgende', close: 'Sluiten' },
}

export default function CategoryGallery({ works, locale }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const t = labels[locale]

  const blockContext = (e: React.MouseEvent) => e.preventDefault()

  return (
    <>
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
        onContextMenu={blockContext}
      >
        {works.map((work, i) => {
          const title = work.title || ''
          return (
            <button
              key={work.id}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative aspect-square bg-(--color-paper) overflow-hidden cursor-zoom-in no-save"
              aria-label={title || `Image ${i + 1}`}
            >
              <Image
                src={workImageUrl(work.storage_path)}
                alt={title}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                draggable={false}
                className="object-cover transition-transform duration-500 group-hover:scale-105 select-none"
              />
              {/* Onzichtbare overlay om right-click + drag op te vangen */}
              <span
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
              />
              {title && (
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {title}
                  {work.year ? ` · ${work.year}` : ''}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {openIndex !== null && (
        <Lightbox
          works={works}
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          prevLabel={t.prev}
          nextLabel={t.next}
          closeLabel={t.close}
        />
      )}
    </>
  )
}
