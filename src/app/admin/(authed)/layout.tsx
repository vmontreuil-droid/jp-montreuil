import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'
import ThemeToggle from '@/components/site/ThemeToggle'
import AdminShell from './AdminShell'
import SidebarNav, { type SidebarGroup, type SidebarItem } from './SidebarNav'

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
    { count: albumsCount },
    { count: ibooksCount },
    { count: exhibitionsCount },
    { count: unreadCommissions },
  ] = await Promise.all([
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('works').select('*', { count: 'exact', head: true }),
    supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null)
      .is('deleted_at', null),
    supabase.from('event_albums').select('*', { count: 'exact', head: true }),
    supabase.from('ibooks').select('*', { count: 'exact', head: true }),
    supabase.from('exhibitions').select('*', { count: 'exact', head: true }),
    supabase
      .from('commission_requests')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null)
      .is('archived_at', null),
  ])

  const pinned: SidebarItem[] = [
    { href: '/admin', label: 'Dashboard', icon: 'LayoutGrid' },
  ]

  const groups: SidebarGroup[] = [
    {
      id: 'commandes',
      title: 'Commandes & clients',
      icon: 'Brush',
      defaultOpen: true,
      items: [
        {
          href: '/admin/commissions',
          label: 'Toutes les commandes',
          icon: 'Brush',
          badge: unreadCommissions ?? null,
          badgeStyle: 'accent',
        },
        { href: '/admin/clients', label: 'Liste clients', icon: 'Users' },
        {
          href: '/admin/messages',
          label: 'Messages',
          icon: 'Inbox',
          badge: unreadCount ?? null,
          badgeStyle: 'accent',
        },
        { href: '/admin/commissions/pricing', label: 'Tarifs commission', icon: 'Tags' },
        {
          href: '/admin/commissions/devis-examples',
          label: 'Exemples /devis',
          icon: 'Sparkles',
        },
      ],
    },
    {
      id: 'oeuvres',
      title: 'Œuvres & catalogue',
      icon: 'ImageIcon',
      items: [
        {
          href: '/admin/works',
          label: 'Œuvres',
          icon: 'ImageIcon',
          badge: worksCount ?? null,
          badgeStyle: 'subtle',
        },
        {
          href: '/admin/categories',
          label: 'Catégories',
          icon: 'FolderTree',
          badge: categoriesCount ?? null,
          badgeStyle: 'subtle',
        },
      ],
    },
    {
      id: 'albums',
      title: 'Albums & partage',
      icon: 'Camera',
      items: [
        {
          href: '/admin/events',
          label: 'Albums clients',
          icon: 'Camera',
          badge: albumsCount ?? null,
          badgeStyle: 'subtle',
        },
        { href: '/admin/compose', label: 'Composer & partager', icon: 'Send' },
        {
          href: '/admin/ibook',
          label: 'Ibook',
          icon: 'BookOpen',
          badge: ibooksCount ?? null,
          badgeStyle: 'subtle',
        },
      ],
    },
    {
      id: 'site',
      title: 'Site & contenus',
      icon: 'Globe',
      items: [
        { href: '/admin/about', label: 'À propos', icon: 'UserIcon' },
        {
          href: '/admin/exhibitions',
          label: 'Expositions',
          icon: 'CalendarDays',
          badge: exhibitionsCount ?? null,
          badgeStyle: 'subtle',
        },
        { href: '/admin/social', label: 'Réseaux sociaux', icon: 'Share2' },
        { href: '/admin/analytics', label: 'Activité web', icon: 'Activity' },
        { href: '/admin/signature', label: 'Signature mail', icon: 'PenTool' },
      ],
    },
  ]

  const sidebar = (
    <>
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

      <SidebarNav pinned={pinned} groups={groups} />

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
    </>
  )

  return <AdminShell sidebar={sidebar}>{children}</AdminShell>
}
