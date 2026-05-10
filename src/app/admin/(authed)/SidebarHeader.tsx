'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSidebarCollapse } from './SidebarCollapseContext'

/**
 * Logo + "Administration" sub-label. Verbergt de tekst in collapsed-mode
 * (alleen op desktop) zodat het 56px-formaat respecteren wordt.
 */
export default function SidebarHeader() {
  const { collapsed } = useSidebarCollapse()
  return (
    <div
      className={`border-b border-(--color-frame) ${collapsed ? 'p-3' : 'p-6'}`}
    >
      <Link
        href="/admin"
        className={`flex items-center ${collapsed ? 'md:justify-center' : 'gap-2'}`}
        title={collapsed ? 'Administration' : undefined}
      >
        <Image
          src="/logo.png"
          alt="Atelier Montreuil"
          width={743}
          height={258}
          className={`w-auto logo-invert ${collapsed ? 'md:h-7' : 'h-9'}`}
        />
      </Link>
      <p
        className={`mt-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) ${
          collapsed ? 'md:hidden' : ''
        }`}
      >
        Administration
      </p>
    </div>
  )
}
