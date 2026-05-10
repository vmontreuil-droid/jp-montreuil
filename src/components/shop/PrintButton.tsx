'use client'

import { Printer } from 'lucide-react'

export function PrintButton({ label = 'Imprimer / Enregistrer en PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white hover:bg-stone-800 text-sm rounded"
    >
      <Printer size={14} /> {label}
    </button>
  )
}
