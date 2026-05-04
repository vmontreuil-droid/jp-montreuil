'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, X } from 'lucide-react'

const STORAGE_KEY = 'announcement-devis-v1-dismissed'

type Props = {
  href: string
  /** Korte titel ("NOUVEAU") */
  badge: string
  /** Hoofdboodschap (klikbaar) */
  message: string
  /** CTA-label rechts */
  cta: string
}

export default function AnnouncementBar({ href, badge, message, cta }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === '1'
      if (!dismissed) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative bg-(--color-bronze) text-white">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between gap-3">
        <Link
          href={href}
          onClick={dismiss}
          className="flex items-center gap-2 group min-w-0"
        >
          <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] bg-white/15 rounded shrink-0">
            {badge}
          </span>
          <span className="truncate text-xs sm:text-sm">
            {message}{' '}
            <span className="hidden sm:inline-flex items-center gap-1 underline-offset-2 group-hover:underline">
              {cta}
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Sluiten"
          className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
