'use client'

import { useState } from 'react'
import { Languages, X } from 'lucide-react'
import BiTranslate from '@/components/admin/BiTranslate'

type Props = {
  text: string
}

export default function MessageWithTranslate({ text }: Props) {
  const [translation, setTranslation] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">
          Message du client
        </h3>
        <div className="flex items-center gap-2">
          <Languages className="w-3.5 h-3.5 text-(--color-stone)" />
          <BiTranslate getSource={() => text} onTranslated={setTranslation} />
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm text-(--color-charcoal) leading-relaxed bg-(--color-canvas) border border-(--color-frame) p-4">
        {text}
      </p>
      {translation && (
        <div className="border border-(--color-bronze)/40 bg-(--color-bronze)/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-[0.15em] text-(--color-bronze)">
              Traduction
            </p>
            <button
              type="button"
              onClick={() => setTranslation(null)}
              className="text-(--color-stone) hover:text-(--color-ink)"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-(--color-ink) leading-relaxed">
            {translation}
          </p>
        </div>
      )}
    </div>
  )
}
