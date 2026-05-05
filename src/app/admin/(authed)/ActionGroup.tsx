'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ChevronDown,
  Plus,
  Image as ImageIcon,
  FolderTree,
  Camera,
  Send,
  BookOpen,
  Inbox,
  Mail,
  Tags,
  Sparkles,
  Brush,
  Users,
  Activity,
  PenTool,
  Globe,
  User as UserIcon,
  Calendar,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  Plus,
  ImageIcon,
  FolderTree,
  Camera,
  Send,
  BookOpen,
  Inbox,
  Mail,
  Tags,
  Sparkles,
  Brush,
  Users,
  Activity,
  PenTool,
  Globe,
  UserIcon,
  Calendar,
}

export type ActionIconName = keyof typeof ICONS

type Action = {
  href: string
  icon: ActionIconName
  label: string
  primary?: boolean
  badge?: number
}

type Props = {
  title: string
  icon: ActionIconName
  actions: Action[]
  defaultOpen?: boolean
}

export default function ActionGroup({ title, icon, actions, defaultOpen }: Props) {
  const Icon = ICONS[icon] ?? Brush
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
            {actions.map(({ href, icon: actionIcon, label, primary, badge }) => {
              const ActionIcon = ICONS[actionIcon] ?? Brush
              return (
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
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
