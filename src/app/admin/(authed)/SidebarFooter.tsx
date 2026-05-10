'use client'

import Link from 'next/link'
import { Home, UserCircle } from 'lucide-react'
import ThemeToggle from '@/components/site/ThemeToggle'
import SignOutButton from './SignOutButton'
import { useSidebarCollapse } from './SidebarCollapseContext'

type Props = {
  email: string
}

/**
 * Onderaan de sidebar: terug naar site, theme-toggle, email + signout.
 * In collapsed-mode tonen we enkel de iconen (compacter, ~ 56px breed).
 */
export default function SidebarFooter({ email }: Props) {
  const { collapsed } = useSidebarCollapse()
  return (
    <div
      className={`border-t border-(--color-frame) space-y-1 ${
        collapsed ? 'p-2' : 'p-4'
      }`}
    >
      <Link
        href="/"
        title={collapsed ? 'Retour au site' : undefined}
        className={`flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink) transition-colors ${
          collapsed ? 'md:justify-center md:px-2' : ''
        }`}
      >
        <Home className="w-4 h-4 shrink-0" />
        <span className={collapsed ? 'md:hidden' : ''}>Retour au site</span>
      </Link>

      {/* Account-link verschijnt enkel in collapsed-mode (in expanded staat
          de email-line zichtbaar). Compact icon-only. */}
      {collapsed && (
        <Link
          href="/admin/account"
          title="Mon compte"
          className="hidden md:flex items-center justify-center px-2 py-2 text-(--color-stone) hover:text-(--color-ink) hover:bg-(--color-frame)/50 rounded transition-colors"
        >
          <UserCircle className="w-4 h-4" />
        </Link>
      )}

      <div
        className={`px-3 py-2 flex items-center ${
          collapsed ? 'md:justify-center' : 'justify-between'
        }`}
      >
        <span className={`text-xs uppercase tracking-[0.2em] text-(--color-stone) ${collapsed ? 'md:hidden' : ''}`}>
          Thème
        </span>
        <ThemeToggle
          labelLight={collapsed ? '' : 'Mode clair'}
          labelDark={collapsed ? '' : 'Mode sombre'}
        />
      </div>

      {!collapsed && (
        <Link
          href="/admin/account"
          className="block px-3 pt-3 text-xs text-(--color-stone) truncate hover:text-(--color-ink) transition-colors"
          title="Mon compte"
        >
          {email}
        </Link>
      )}

      <SignOutButton compact={collapsed} />
    </div>
  )
}
