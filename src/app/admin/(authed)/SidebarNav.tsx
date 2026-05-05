'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ChevronDown,
  LayoutGrid,
  FolderTree,
  Image as ImageIcon,
  Share2,
  Inbox,
  Send,
  Camera,
  BookOpen,
  Activity,
  PenTool,
  User as UserIcon,
  CalendarDays,
  Brush,
  Tags,
  Sparkles,
  Users,
  Globe,
  type LucideIcon,
} from 'lucide-react'

// Server component → client component props moeten serialiseerbaar zijn,
// dus geven we icon-NAMEN door (strings) en resolven ze hier.
const ICONS: Record<string, LucideIcon> = {
  LayoutGrid,
  FolderTree,
  ImageIcon,
  Share2,
  Inbox,
  Send,
  Camera,
  BookOpen,
  Activity,
  PenTool,
  UserIcon,
  CalendarDays,
  Brush,
  Tags,
  Sparkles,
  Users,
  Globe,
}

export type IconName = keyof typeof ICONS

export type SidebarItem = {
  href: string
  label: string
  icon: IconName
  badge?: number | null
  badgeStyle?: 'subtle' | 'accent'
}

export type SidebarGroup = {
  id: string
  title: string
  icon: IconName
  items: SidebarItem[]
  /** Default open-state als er nog geen voorkeur in localStorage staat */
  defaultOpen?: boolean
}

type Props = {
  /** Vaste items bovenaan, niet gegroepeerd (bv. Dashboard) */
  pinned: SidebarItem[]
  groups: SidebarGroup[]
}

const STORAGE_KEY = 'admin.sidebar.groups.v1'

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

function NavLink({ item, pathname }: { item: SidebarItem; pathname: string }) {
  const Icon = ICONS[item.icon] ?? LayoutGrid
  const showBadge = item.badge && item.badge > 0
  const isAccent = item.badgeStyle === 'accent'
  const active = isActive(pathname, item.href)
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-(--color-bronze)/15 text-(--color-ink) border-l-2 border-(--color-bronze)'
          : 'text-(--color-charcoal) hover:bg-(--color-frame)/50 hover:text-(--color-ink) border-l-2 border-transparent'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {showBadge && (
        <span
          className={
            isAccent
              ? 'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-600 rounded-full'
              : 'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] text-(--color-stone) bg-(--color-frame)/40 rounded-full'
          }
        >
          {item.badge}
        </span>
      )}
    </Link>
  )
}

export default function SidebarNav({ pinned, groups }: Props) {
  const pathname = usePathname() || ''

  // Open/dicht-state per groep — geïnitialiseerd uit defaultOpen, daarna uit
  // localStorage zodat papa zijn keuze onthouden wordt tussen sessies.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const g of groups) init[g.id] = g.defaultOpen ?? false
    return init
  })

  // Auto-open de groep die de actieve route bevat (one-shot bij eerste render
  // met deze pathname — voorkomt dat de gebruiker iets niet vindt)
  useEffect(() => {
    setOpenMap((prev) => {
      const next = { ...prev }
      for (const g of groups) {
        if (g.items.some((i) => isActive(pathname, i.href))) {
          next[g.id] = true
        }
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Hydrate uit localStorage (na mount, om SSR-mismatch te vermijden)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const stored = JSON.parse(raw) as Record<string, boolean>
      setOpenMap((prev) => ({ ...prev, ...stored }))
    } catch {
      // negeer
    }
  }, [])

  const toggle = (id: string) => {
    setOpenMap((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // negeer
      }
      return next
    })
  }

  return (
    <nav className="flex-1 p-4 space-y-1">
      {/* Vaste items bovenaan */}
      {pinned.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}

      {pinned.length > 0 && groups.length > 0 && (
        <div className="my-3 border-t border-(--color-frame)/50" />
      )}

      {/* Inklapbare groepen */}
      {groups.map((group) => {
        const Icon = ICONS[group.icon] ?? LayoutGrid
        const open = openMap[group.id]
        const totalBadges = group.items.reduce(
          (sum, i) => sum + (i.badge && i.badgeStyle === 'accent' ? i.badge : 0),
          0
        )
        const hasActive = group.items.some((i) => isActive(pathname, i.href))
        return (
          <div key={group.id} className="space-y-1">
            <button
              type="button"
              onClick={() => toggle(group.id)}
              aria-expanded={open}
              className={`w-full flex items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-semibold transition-colors ${
                hasActive
                  ? 'text-(--color-ink)'
                  : 'text-(--color-stone) hover:text-(--color-ink)'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-(--color-bronze)" />
              <span className="flex-1 text-left">{group.title}</span>
              {totalBadges > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[9px] font-bold text-white bg-red-600 rounded-full">
                  {totalBadges}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-(--color-stone) transition-transform ${
                  open ? 'rotate-180' : ''
                }`}
              />
            </button>
            {open && (
              <div className="pl-1 pb-1 space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
