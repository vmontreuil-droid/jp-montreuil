import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { LogOut, LayoutGrid, FolderTree, Image as ImageIcon, Share2, Inbox, Home, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'
import ThemeToggle from '@/components/site/ThemeToggle'

export const dynamic = 'force-dynamic'

export default async function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    await supabase.auth.signOut()
    redirect('/admin/login?error=not_admin')
  }

  // Stats voor badges in sidebar
  const [
    { count: categoriesCount },
    { count: worksCount },
    { count: unreadCount },
  ] = await Promise.all([
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('works').select('*', { count: 'exact', head: true }),
    supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null)
      .is('deleted_at', null),
  ])

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
    {
      href: '/admin/categories',
      label: 'Catégories',
      icon: FolderTree,
      badge: categoriesCount ?? null,
      badgeStyle: 'subtle' as const,
    },
    {
      href: '/admin/works',
      label: 'Œuvres',
      icon: ImageIcon,
      badge: worksCount ?? null,
      badgeStyle: 'subtle' as const,
    },
    {
      href: '/admin/messages',
      label: 'Messages',
      icon: Inbox,
      badge: unreadCount ?? null,
      badgeStyle: 'accent' as const,
    },
    { href: '/admin/social', label: 'Réseaux sociaux', icon: Share2 },
    { href: '/admin/compose', label: 'Composer & Partager', icon: Send },
  ] as Array<{
    href: string
    label: string
    icon: typeof LayoutGrid
    badge?: number | null
    badgeStyle?: 'subtle' | 'accent'
  }>

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-(--color-frame) bg-(--color-paper) flex flex-col">
        <div className="p-6 border-b border-(--color-frame)">
          <Link href="/admin" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Atelier Montreuil"
              width={743}
              height={258}
              className="h-9 w-auto logo-invert"
            />
          </Link>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-(--color-stone)">
            Administration
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const showBadge = item.badge && item.badge > 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 text-sm text-(--color-charcoal) hover:bg-(--color-frame)/50 hover:text-(--color-ink) transition-colors"
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span
                    className={
                      item.badgeStyle === 'accent'
                        ? 'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold bg-(--color-bronze) text-white rounded-full'
                        : 'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] text-(--color-stone) bg-(--color-frame)/40 rounded-full'
                    }
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-(--color-frame) space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink) transition-colors"
          >
            <Home className="w-4 h-4" />
            Retour au site
          </Link>
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
              Thème
            </span>
            <ThemeToggle labelLight="Mode clair" labelDark="Mode sombre" />
          </div>
          <p className="px-3 pt-3 text-xs text-(--color-stone) truncate">{profile.email}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-(--color-canvas)">
        {children}
      </main>
    </div>
  )
}
