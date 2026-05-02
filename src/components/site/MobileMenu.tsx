'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

type Item = { href: string; label: string }

type Props = {
  items: Item[]
  altHref: string
  altLabel: string
  switchLabel: string
  themeToggle: React.ReactNode
}

export default function MobileMenu({
  items,
  altHref,
  altLabel,
  switchLabel,
  themeToggle,
}: Props) {
  const [open, setOpen] = useState(false)

  // Body scroll-lock + ESC
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        className="md:hidden inline-flex items-center justify-center w-9 h-9 text-(--color-charcoal) hover:text-(--color-ink) transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-[59] bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Drawer panel — slide-in van rechts, fixed eigen container */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        className={`md:hidden fixed top-0 right-0 bottom-0 z-[60] w-[88%] max-w-sm flex flex-col border-l border-(--color-frame) transition-transform duration-300 ease-out ${
          open ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
        }`}
        style={{ backgroundColor: 'var(--color-canvas)' }}
      >
          {/* Top bar in drawer */}
          <div className="flex items-center justify-between p-5 border-b border-(--color-frame)">
            <span className="text-xs uppercase tracking-[0.3em] text-(--color-stone)">
              Menu
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Sluiten"
              className="inline-flex items-center justify-center w-9 h-9 text-(--color-stone) hover:text-(--color-ink) transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto py-4">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-6 py-4 text-base uppercase tracking-[0.2em] text-(--color-charcoal) hover:text-(--color-bronze) hover:bg-(--color-paper) transition-colors border-b border-(--color-frame)/50"
              >
                {item.label}
              </Link>
            ))}
          </nav>

        {/* Bottom: thema + taal */}
        <div className="p-5 border-t border-(--color-frame) flex items-center justify-between gap-3">
          <div>{themeToggle}</div>
          <a
            href={altHref}
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink) transition-colors border border-(--color-frame) px-4 h-[34px] rounded-sm"
            aria-label={switchLabel}
          >
            {altLabel}
          </a>
        </div>
      </aside>
    </>
  )
}
