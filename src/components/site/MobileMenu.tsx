'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Menu, X, Home, LayoutGrid, User, Share2, Mail, UserCircle } from 'lucide-react'

type IconName = 'home' | 'collection' | 'about' | 'social' | 'contact'

const ICONS: Record<IconName, React.ElementType> = {
  home: Home,
  collection: LayoutGrid,
  about: User,
  social: Share2,
  contact: Mail,
}

type Item = { href: string; label: string; iconName?: IconName }

type Props = {
  items: Item[]
  altHref: string
  altLabel: string
  switchLabel: string
  themeToggle: React.ReactNode
  portalHref?: string
  portalLabel?: string
  /** Wanneer aanwezig: vervangt de URL-based FR/NL-knop. Voor /portail/*
   *  waar er geen /nl-route is — switchen gaat dan via cookie. */
  localeSwitcher?: React.ReactNode
}

export default function MobileMenu({
  items,
  altHref,
  altLabel,
  switchLabel,
  themeToggle,
  portalHref,
  portalLabel,
  localeSwitcher,
}: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Portal mount-detectie (alleen client-side)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Body scroll-lock + ESC + modal-open class (verbergt sticky sub-footer
  // die anders over de theme/taal-knoppen in het drawer-onderbalkje valt)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = original
      document.body.classList.remove('modal-open')
    }
  }, [open])

  const drawer = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Drawer panel — slide-in van rechts */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        className={`fixed top-0 right-0 bottom-0 z-[9999] w-[88%] max-w-sm flex flex-col border-l border-(--color-frame) transition-transform duration-300 ease-out ${
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
            {items.map((item) => {
              const Icon = item.iconName ? ICONS[item.iconName] : null
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-4 px-6 py-4 text-base uppercase tracking-[0.2em] text-(--color-charcoal) hover:text-(--color-bronze) hover:bg-(--color-paper) transition-colors border-b border-(--color-frame)/50 group"
                >
                  {Icon && (
                    <span className="flex items-center justify-center w-8 h-8 text-(--color-bronze)">
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </span>
                  )}
                  <span className="flex-1">{item.label}</span>
                  <span className="text-(--color-stone) group-hover:text-(--color-bronze) group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100">
                    →
                  </span>
                </Link>
              )
            })}
          </nav>

        {/* Klantenportaal link */}
        {portalHref && (
          <Link
            href={portalHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-4 px-6 py-4 text-sm uppercase tracking-[0.2em] text-(--color-charcoal) hover:text-(--color-bronze) hover:bg-(--color-paper) transition-colors border-t border-(--color-frame)"
          >
            <span className="flex items-center justify-center w-8 h-8 text-(--color-bronze)">
              <UserCircle className="w-5 h-5" strokeWidth={1.5} />
            </span>
            <span className="flex-1">{portalLabel ?? 'Espace client'}</span>
          </Link>
        )}

        {/* Bottom: thema + taal */}
        <div className="p-5 border-t border-(--color-frame) flex items-center justify-between gap-3">
          <div>{themeToggle}</div>
          {localeSwitcher ? (
            <div onClick={() => setOpen(false)}>{localeSwitcher}</div>
          ) : (
            <a
              href={altHref}
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink) transition-colors border border-(--color-frame) px-4 h-[34px] rounded-sm"
              aria-label={switchLabel}
            >
              {altLabel}
            </a>
          )}
        </div>
      </aside>
    </>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Sluiten' : 'Menu'}
        aria-expanded={open}
        className={`md:hidden inline-flex items-center justify-center w-9 h-9 transition-colors ${
          open
            ? 'fixed top-4 right-6 z-[10000] text-(--color-ink)'
            : 'relative text-(--color-charcoal) hover:text-(--color-ink)'
        }`}
      >
        {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
      {/* Portal: rendert drawer direct in document.body — ontwijkt
          stacking-context van Header (backdrop-filter creëert nieuwe
          containing block voor fixed children, wat positionering breekt). */}
      {mounted && typeof document !== 'undefined'
        ? createPortal(<div className="md:hidden">{drawer}</div>, document.body)
        : null}
    </>
  )
}
