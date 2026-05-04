'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBag, Camera, UserCircle } from 'lucide-react'

type Props = {
  labels: {
    orders: string
    albums: string
    account: string
  }
}

export default function PortailNav({ labels }: Props) {
  const pathname = usePathname() || '/portail'

  const items = [
    { href: '/portail', label: labels.orders, icon: ShoppingBag, match: (p: string) => p === '/portail' || p.startsWith('/portail/devis') },
    { href: '/portail#albums', label: labels.albums, icon: Camera, match: (p: string) => p.startsWith('/portail/album') },
    { href: '/portail/compte', label: labels.account, icon: UserCircle, match: (p: string) => p.startsWith('/portail/compte') },
  ]

  return (
    <nav className="border-b border-(--color-frame) bg-(--color-paper)/40">
      <div className="max-w-5xl mx-auto px-6 flex items-center gap-1 overflow-x-auto">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-[0.18em] whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? 'border-(--color-bronze) text-(--color-ink) font-semibold'
                  : 'border-transparent text-(--color-stone) hover:text-(--color-ink) hover:border-(--color-frame)'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
