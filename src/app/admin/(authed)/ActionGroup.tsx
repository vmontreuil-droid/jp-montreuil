'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

type Action = {
  href: string
  icon: React.ElementType
  label: string
  primary?: boolean
  badge?: number
}

type Props = {
  title: string
  icon: React.ElementType
  actions: Action[]
  defaultOpen?: boolean
}

export default function ActionGroup({ title, icon: Icon, actions, defaultOpen }: Props) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const totalBadges = actions.reduce((sum, a) => sum + (a.badge ?? 0), 0)

  return (
    <div className="bg-(--color-paper) border border-(--color-frame) overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-(--color-canvas)/40 text-left"
      >
        <Icon className="w-4 h-4 text-(--color-bronze)" />
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-ink) font-semibold flex-1">
          {title}
        </span>
        {totalBadges > 0 && (
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold text-white bg-red-600 rounded-full">
            {totalBadges > 99 ? '99+' : totalBadges}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-(--color-stone) transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1 border-t border-(--color-frame)/40">
          <div className="flex flex-wrap gap-2">
            {actions.map(({ href, icon: ActionIcon, label, primary, badge }) => (
              <Link
                key={href}
                href={href}
                className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-[0.15em] transition-colors ${
                  primary
                    ? 'bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark)'
                    : 'border border-(--color-frame) text-(--color-charcoal) hover:text-(--color-ink) hover:border-(--color-stone)'
                }`}
              >
                <ActionIcon className="w-4 h-4" />
                {label}
                {badge != null && badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-bold text-white bg-red-600 rounded-full">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
