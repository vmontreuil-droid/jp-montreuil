import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminShell from './AdminShell'
import SidebarNav, { type SidebarGroup, type SidebarItem } from './SidebarNav'
import SidebarHeader from './SidebarHeader'
import SidebarFooter from './SidebarFooter'
import { createShopAdminClient } from '@/lib/shop/supabase'

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

  // Webshop pending-counts (orders + reviews + production-bons + abandoned)
  let pendingShopOrders: number | null = null
  let pendingReviews: number | null = null
  let pendingBons: number | null = null
  let pendingAbandoned: number | null = null
  try {
    const shop = createShopAdminClient()
    const [
      { count: ordersCount },
      { count: reviewsCount },
      { count: bonsCount },
      { count: abandonedCount },
    ] = await Promise.all([
      shop.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      shop.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      shop.from('supplier_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      shop.from('abandoned_carts').select('*', { count: 'exact', head: true })
        .is('reminder_sent_at', null).is('recovered_order_id', null),
    ])
    pendingShopOrders = ordersCount ?? 0
    pendingReviews = reviewsCount ?? 0
    pendingBons = bonsCount ?? 0
    pendingAbandoned = abandonedCount ?? 0
  } catch {
    // negeer
  }

  // Errors + GDPR open counts
  let openErrors: number | null = null
  let openGdpr: number | null = null
  try {
    const [{ count: errs }, { count: gdpr }] = await Promise.all([
      supabase.from('error_log').select('*', { count: 'exact', head: true }).eq('is_acknowledged', false),
      supabase.from('gdpr_requests').select('*', { count: 'exact', head: true }).in('status', ['received', 'in_progress']),
    ])
    openErrors = errs ?? 0
    openGdpr = gdpr ?? 0
  } catch {
    // negeer
  }

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
    {
      id: 'boutique',
      title: 'Boutique',
      icon: 'ShoppingBag',
      items: [
        { href: '/admin/boutique', label: 'Tableau de bord', icon: 'ShoppingBag' },
        {
          href: '/admin/boutique/orders',
          label: 'Commandes',
          icon: 'ShoppingCart',
          badge: pendingShopOrders,
          badgeStyle: 'accent',
        },
        { href: '/admin/boutique/products', label: 'Produits', icon: 'Receipt' },
        { href: '/admin/boutique/boutique', label: 'Configurateur tirages', icon: 'Sliders' },
        { href: '/admin/boutique/photos', label: 'Photos boutique', icon: 'ImageIcon' },
        { href: '/admin/boutique/customers', label: 'Clients boutique', icon: 'Users' },
        { href: '/admin/boutique/shipping', label: 'Frais de port', icon: 'Truck' },
        { href: '/admin/boutique/mollie-setup', label: 'Paiements (Mollie)', icon: 'CreditCard' },
        { href: '/admin/boutique/discounts', label: 'Codes promo', icon: 'Tags' },
        {
          href: '/admin/boutique/reviews',
          label: 'Avis clients',
          icon: 'MessageSquare',
          badge: pendingReviews,
          badgeStyle: 'accent',
        },
        { href: '/admin/boutique/imprimeurs', label: 'Imprimeurs', icon: 'Truck' },
        {
          href: '/admin/boutique/production',
          label: 'Bons de production',
          icon: 'FileText',
          badge: pendingBons,
          badgeStyle: 'accent',
        },
        { href: '/admin/boutique/gift-cards', label: 'Cartes-cadeaux', icon: 'Gift' },
        {
          href: '/admin/boutique/abandoned-carts',
          label: 'Paniers abandonnés',
          icon: 'ShoppingCart',
          badge: pendingAbandoned,
          badgeStyle: 'subtle',
        },
      ],
    },
    {
      id: 'communication',
      title: 'Communication',
      icon: 'Send',
      items: [
        { href: '/admin/newsletter', label: 'Newsletter', icon: 'Newspaper' },
      ],
    },
    {
      id: 'compte',
      title: 'Compte & configuration',
      icon: 'Settings',
      items: [
        { href: '/admin/account', label: 'Mon compte', icon: 'UserCircle' },
        { href: '/admin/settings', label: 'Paramètres du site', icon: 'Settings' },
        {
          href: '/admin/errors',
          label: 'Erreurs',
          icon: 'AlertTriangle',
          badge: openErrors,
          badgeStyle: 'accent',
        },
        {
          href: '/admin/gdpr',
          label: 'RGPD',
          icon: 'Shield',
          badge: openGdpr,
          badgeStyle: 'subtle',
        },
      ],
    },
  ]

  const sidebar = (
    <>
      <SidebarHeader />
      <SidebarNav pinned={pinned} groups={groups} />
      <SidebarFooter email={profile.email ?? user.email ?? ''} />
    </>
  )

  return <AdminShell sidebar={sidebar}>{children}</AdminShell>
}
