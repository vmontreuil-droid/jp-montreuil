'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, User, Share2, Mail } from 'lucide-react'

type IconName = 'home' | 'collection' | 'about' | 'social' | 'contact'

const ICONS: Record<IconName, React.ElementType> = {
  home: Home,
  collection: LayoutGrid,
  about: User,
  social: Share2,
  contact: Mail,
}

type Item = {
  href: string
  label: string
  iconName: IconName
}

type Props = {
  items: Item[]
}

export default function DesktopNav({ items }: Props) {
  const pathname = usePathname()

  const isActive = (href: string): boolean => {
    if (href === '/' || href === '/nl') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="hidden md:flex items-center gap-1 text-xs tracking-[0.15em] uppercase">
      {items.map((item) => {
        const Icon = ICONS[item.iconName]
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`group relative inline-flex items-center gap-1.5 px-3 py-2 transition-colors ${
              active
                ? 'text-(--color-ink) font-semibold'
                : 'text-(--color-charcoal) hover:text-(--color-bronze)'
            }`}
          >
            <Icon
              className={`w-4 h-4 transition-colors ${
                active
                  ? 'text-(--color-bronze)'
                  : 'text-(--color-stone) group-hover:text-(--color-bronze)'
              }`}
              strokeWidth={active ? 2 : 1.5}
            />
            <span>{item.label}</span>
            {active ? (
              <span
                aria-hidden="true"
                className="absolute left-2 right-2 bottom-0 h-[2px] bg-(--color-bronze)"
              />
            ) : (
              <span
                aria-hidden="true"
                className="absolute left-3 right-3 bottom-0 h-px bg-(--color-bronze) origin-left scale-x-0 group-hover:scale-x-100 transition-transform"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
