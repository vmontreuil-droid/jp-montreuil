'use client'

import { Maximize2, Minimize2 } from 'lucide-react'
import { useAdminWidth } from './AdminWidthContext'

/**
 * Floating toggle bovenaan rechts — wisselt tussen compacte (max-w-7xl)
 * en wide (full-width) layout. Persisteert in localStorage. Tijdens
 * SSR/voor hydratatie wordt niets getoond zodat we geen flash krijgen.
 */
export default function AdminWidthToggle() {
  const { wide, toggle, hydrated } = useAdminWidth()
  if (!hydrated) return null

  return (
    <button
      type="button"
      onClick={toggle}
      title={wide ? 'Largeur compacte' : 'Pleine largeur'}
      aria-label={wide ? 'Largeur compacte' : 'Pleine largeur'}
      className="fixed top-3 right-3 z-30 inline-flex items-center justify-center w-9 h-9 bg-(--color-paper) border border-(--color-frame) text-(--color-stone) hover:text-(--color-bronze) hover:border-(--color-bronze) rounded-sm transition-colors"
    >
      {wide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
    </button>
  )
}
