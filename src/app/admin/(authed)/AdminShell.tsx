'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

type Props = {
  sidebar: React.ReactNode
  children: React.ReactNode
}

/**
 * Responsive shell rond de admin-sidebar.
 *  - md+ : sidebar staat vast naast de main content (zoals voorheen)
 *  - <md : sidebar is een drawer die ingeklapt opent. Hamburger linksboven
 *          opent, klikken op een nav-link of de backdrop sluit weer.
 *
 * Beginsituatie op mobiel = ingeklapt (useState(false)).
 */
export default function AdminShell({ sidebar, children }: Props) {
  const [open, setOpen] = useState(false)

  // Esc + body scroll-lock zolang drawer open is
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = original
    }
  }, [open])

  // Klik op een <a> binnen de sidebar op mobiel → drawer sluiten
  const handleSidebarClick = (e: React.MouseEvent) => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return
    if ((e.target as HTMLElement).closest('a')) {
      setOpen(false)
    }
  }

  return (
    <div className="h-screen md:flex">
      {/* Mobile hamburger — alleen visible <md, fixed linksboven */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        aria-expanded={open}
        className={`md:hidden fixed top-3 left-3 z-30 inline-flex items-center justify-center w-10 h-10 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) rounded-sm shadow-sm transition-opacity ${
          open ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop op mobiel */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`md:hidden fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar */}
      <aside
        onClick={handleSidebarClick}
        className={`fixed md:sticky top-0 left-0 z-50 w-64 h-screen shrink-0 border-r border-(--color-frame) bg-(--color-paper) flex flex-col overflow-y-auto transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sluit-knop alleen op mobiel rechtsboven binnen de drawer */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Sluiten"
          className="md:hidden absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 text-(--color-stone) hover:text-(--color-ink) z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {sidebar}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-(--color-canvas) topo-overlay">
        {children}
      </main>
    </div>
  )
}
