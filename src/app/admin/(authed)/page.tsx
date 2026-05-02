import Link from 'next/link'
import {
  FolderTree,
  Image as ImageIcon,
  Inbox,
  Mail,
  Plus,
  TrendingUp,
  Eye,
  ShoppingBag,
  CreditCard,
  Package,
  Truck,
  ArrowUpRight,
  Clock,
  Camera,
  BookOpen,
  Send,
  Activity,
  PenTool,
  User,
  Users,
  Calendar,
  Globe,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ibookUrl } from '@/lib/ibook-url'
import { workImageUrl } from '@/lib/links'

export const dynamic = 'force-dynamic'

type RecentMessage = {
  id: string
  name: string
  email: string
  message: string
  created_at: string
  read_at: string | null
}

type AlbumRow = {
  id: string
  title: string
  client_name: string | null
  event_date: string | null
  is_active: boolean
  created_at: string
  photos: { id: string }[] | null
}

type IbookRow = {
  id: string
  title_fr: string
  title_nl: string
  cover_path: string | null
  is_active: boolean
}

type AnalyticsRow = {
  created_at: string
  event_type: string
  path: string
  country: string | null
  session_id: string
  work_id: string | null
}

type DailyCount = { date: string; visitors: number }

const COUNTRY_NAMES: Record<string, string> = {
  BE: 'Belgique',
  FR: 'France',
  NL: 'Pays-Bas',
  DE: 'Allemagne',
  LU: 'Luxembourg',
  GB: 'Royaume-Uni',
  US: 'États-Unis',
  IT: 'Italie',
  ES: 'Espagne',
  CH: 'Suisse',
  CA: 'Canada',
  AT: 'Autriche',
  PT: 'Portugal',
}

function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return '🌍'
  const A = 0x1f1e6 - 65
  return String.fromCodePoint(code.charCodeAt(0) + A, code.charCodeAt(1) + A)
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const start5min = new Date(now.getTime() - 5 * 60 * 1000)

  const [
    { count: categoriesCount },
    { count: worksCount },
    { count: messagesCount },
    { count: unreadCount },
    { count: albumsCount },
    { count: activeAlbumsCount },
    { count: ibooksCount },
    { data: recentMessages },
    { data: recentAlbums },
    { data: ibooks },
    { data: worksByCat },
    { data: events30 },
  ] = await Promise.all([
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('works').select('*', { count: 'exact', head: true }),
    supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null)
      .is('deleted_at', null),
    supabase.from('event_albums').select('*', { count: 'exact', head: true }),
    supabase
      .from('event_albums')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase.from('ibooks').select('*', { count: 'exact', head: true }),
    supabase
      .from('contact_messages')
      .select('id, name, email, message, created_at, read_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<RecentMessage[]>(),
    supabase
      .from('event_albums')
      .select('id, title, client_name, event_date, is_active, created_at, photos:event_photos(id)')
      .order('created_at', { ascending: false })
      .limit(4)
      .returns<AlbumRow[]>(),
    supabase
      .from('ibooks')
      .select('id, title_fr, title_nl, cover_path, is_active')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .returns<IbookRow[]>(),
    supabase
      .from('categories')
      .select('id, label_fr, sort_order, works:works!works_category_id_fkey(id)')
      .order('sort_order', { ascending: true }),
    supabase
      .from('analytics_events')
      .select('created_at, event_type, path, country, session_id, work_id')
      .gte('created_at', start30d.toISOString())
      .order('created_at', { ascending: false })
      .returns<AnalyticsRow[]>(),
  ])

  const recent = events30 ?? []
  const todayEvents = recent.filter((e) => new Date(e.created_at) >= startOfToday)
  const sevenDayEvents = recent.filter((e) => new Date(e.created_at) >= start7d)

  const uniqueSessions = (rows: AnalyticsRow[]) =>
    new Set(rows.map((r) => r.session_id)).size

  const visitorsToday = uniqueSessions(todayEvents)
  const visitors7d = uniqueSessions(sevenDayEvents)
  const visitors30d = uniqueSessions(recent)
  const liveSessions = new Set(
    recent.filter((e) => new Date(e.created_at) >= start5min).map((e) => e.session_id)
  ).size

  // Visitors per dag chart (30 dagen tot vandaag)
  const dayBuckets = new Map<string, Set<string>>()
  const todayUtc = new Date(now)
  todayUtc.setUTCHours(0, 0, 0, 0)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayUtc)
    d.setUTCDate(d.getUTCDate() - i)
    dayBuckets.set(d.toISOString().slice(0, 10), new Set<string>())
  }
  for (const e of recent) {
    if (e.event_type !== 'page_view') continue
    const key = e.created_at.slice(0, 10)
    if (!dayBuckets.has(key)) continue
    dayBuckets.get(key)!.add(e.session_id)
  }
  const chartData: DailyCount[] = Array.from(dayBuckets.entries()).map(([date, set]) => ({
    date,
    visitors: set.size,
  }))
  const maxCount = Math.max(1, ...chartData.map((d) => d.visitors))

  // Top pages 30d
  const pathCounts = new Map<string, number>()
  for (const e of recent.filter((r) => r.event_type === 'page_view')) {
    pathCounts.set(e.path, (pathCounts.get(e.path) ?? 0) + 1)
  }
  const topPaths = [...pathCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Top countries
  const countryCounts = new Map<string, number>()
  for (const e of recent.filter((r) => r.event_type === 'page_view')) {
    const k = e.country || '—'
    countryCounts.set(k, (countryCounts.get(k) ?? 0) + 1)
  }
  const topCountries = [...countryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Werken per categorie
  const worksByCatList = (worksByCat ?? []).map((c) => ({
    label: c.label_fr,
    count: Array.isArray(c.works) ? c.works.length : 0,
  }))
  const maxWorks = Math.max(1, ...worksByCatList.map((c) => c.count))

  const totalAlbumPhotos = (recentAlbums ?? []).reduce(
    (sum, a) => sum + (a.photos?.length ?? 0),
    0
  )

  return (
    <div className="p-8 md:p-12 max-w-6xl">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Tableau de bord
        </h1>
        <p className="mt-2 text-sm text-(--color-stone)">
          {new Date().toLocaleDateString('fr-BE', { dateStyle: 'long' })}
          {liveSessions > 0 && (
            <span className="ml-3 inline-flex items-center gap-1.5 text-(--color-bronze)">
              <span className="w-1.5 h-1.5 rounded-full bg-(--color-bronze) animate-pulse" />
              {liveSessions} en ligne maintenant
            </span>
          )}
        </p>
      </header>

      {/* HERO STATS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard
          href="/admin/analytics"
          icon={Users}
          label="Visiteurs aujourd'hui"
          value={visitorsToday}
          hint={`${visitors7d} sur 7j`}
          accent
        />
        <StatCard
          href="/admin/messages"
          icon={Inbox}
          label="Messages"
          value={messagesCount ?? 0}
          hint={
            unreadCount && unreadCount > 0
              ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`
              : 'Tout lu'
          }
          highlight={!!unreadCount && unreadCount > 0}
        />
        <StatCard
          href="/admin/events"
          icon={Camera}
          label="Albums clients"
          value={albumsCount ?? 0}
          hint={`${activeAlbumsCount ?? 0} actif${(activeAlbumsCount ?? 0) > 1 ? 's' : ''}`}
        />
        <StatCard
          href="/admin/works"
          icon={ImageIcon}
          label="Œuvres"
          value={worksCount ?? 0}
          hint={`${categoriesCount ?? 0} catégories`}
        />
      </section>

      {/* ANALYTICS ROW */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-8">
        <div className="lg:col-span-2 bg-(--color-paper) border border-(--color-frame) p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
                Visiteurs uniques · 30 jours
              </p>
              <p className="mt-1 text-2xl text-(--color-ink) font-[family-name:var(--font-display)]">
                {visitors30d}
              </p>
            </div>
            <Link
              href="/admin/analytics"
              className="text-xs text-(--color-bronze) hover:text-(--color-bronze-dark) inline-flex items-center gap-0.5"
            >
              Détails <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <VisitorsChart daily={chartData} maxCount={maxCount} />
        </div>

        <div className="bg-(--color-paper) border border-(--color-frame) p-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3 flex items-center gap-2">
              <Eye className="w-3 h-3" />
              Top pages
            </p>
            {topPaths.length === 0 ? (
              <p className="text-xs text-(--color-stone) italic">Aucune donnée</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {topPaths.map(([path, count]) => (
                  <li key={path} className="flex items-baseline justify-between gap-2">
                    <code className="truncate text-(--color-charcoal) font-mono text-[11px]">
                      {path}
                    </code>
                    <span className="text-(--color-stone)">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3 flex items-center gap-2">
              <Globe className="w-3 h-3" />
              Pays
            </p>
            {topCountries.length === 0 ? (
              <p className="text-xs text-(--color-stone) italic">Aucune donnée</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {topCountries.map(([code, count]) => (
                  <li key={code} className="flex items-baseline justify-between gap-2">
                    <span className="text-(--color-charcoal)">
                      {flagEmoji(code === '—' ? null : code)}{' '}
                      {COUNTRY_NAMES[code] ?? (code === '—' ? 'Inconnu' : code)}
                    </span>
                    <span className="text-(--color-stone)">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* RECENT CONTENT ROW */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
        {/* Messages récents */}
        <div className="bg-(--color-paper) border border-(--color-frame) p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) inline-flex items-center gap-2">
              <Mail className="w-3 h-3" />
              Messages récents
            </p>
            <Link
              href="/admin/messages"
              className="text-xs text-(--color-bronze) hover:text-(--color-bronze-dark) inline-flex items-center gap-0.5"
            >
              Tout voir <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {(recentMessages ?? []).length === 0 ? (
            <p className="text-sm text-(--color-stone) italic">Aucun message</p>
          ) : (
            <ul className="space-y-3">
              {(recentMessages ?? []).map((m) => (
                <li key={m.id}>
                  <Link href="/admin/messages" className="block group">
                    <div className="flex items-center gap-2 mb-0.5">
                      {!m.read_at && (
                        <span className="w-1.5 h-1.5 rounded-full bg-(--color-bronze) shrink-0" />
                      )}
                      <span
                        className={`text-sm truncate ${
                          !m.read_at
                            ? 'font-semibold text-(--color-ink)'
                            : 'text-(--color-charcoal)'
                        } group-hover:text-(--color-bronze) transition-colors`}
                      >
                        {m.name}
                      </span>
                      <span className="ml-auto text-[10px] text-(--color-stone) shrink-0">
                        {new Date(m.created_at).toLocaleDateString('fr-BE', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-(--color-stone) truncate">{m.message}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Albums clients récents */}
        <div className="bg-(--color-paper) border border-(--color-frame) p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) inline-flex items-center gap-2">
              <Camera className="w-3 h-3" />
              Albums récents
            </p>
            <Link
              href="/admin/events"
              className="text-xs text-(--color-bronze) hover:text-(--color-bronze-dark) inline-flex items-center gap-0.5"
            >
              Tout voir <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {(recentAlbums ?? []).length === 0 ? (
            <p className="text-sm text-(--color-stone) italic">Aucun album</p>
          ) : (
            <ul className="space-y-3">
              {(recentAlbums ?? []).map((a) => {
                const photoCount = a.photos?.length ?? 0
                return (
                  <li key={a.id}>
                    <Link href={`/admin/events/${a.id}`} className="block group">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            a.is_active ? 'bg-(--color-bronze)' : 'bg-(--color-stone)'
                          }`}
                        />
                        <span className="text-sm truncate text-(--color-ink) font-[family-name:var(--font-display)] group-hover:text-(--color-bronze) transition-colors">
                          {a.title}
                        </span>
                        <span className="ml-auto text-[10px] text-(--color-stone) shrink-0">
                          {photoCount} photo{photoCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-xs text-(--color-stone) truncate inline-flex items-center gap-2">
                        {a.client_name && (
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {a.client_name}
                          </span>
                        )}
                        {a.event_date && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(a.event_date).toLocaleDateString('fr-BE')}
                          </span>
                        )}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {recentAlbums && recentAlbums.length > 0 && (
            <p className="mt-4 pt-3 border-t border-(--color-frame) text-[10px] text-(--color-stone)">
              {totalAlbumPhotos} photos au total dans ces albums
            </p>
          )}
        </div>
      </section>

      {/* CATALOGUE ROW */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
        {/* Werken per categorie */}
        <div className="bg-(--color-paper) border border-(--color-frame) p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) inline-flex items-center gap-2">
              <FolderTree className="w-3 h-3" />
              Œuvres par catégorie
            </p>
            <Link
              href="/admin/categories"
              className="text-xs text-(--color-bronze) hover:text-(--color-bronze-dark) inline-flex items-center gap-0.5"
            >
              Gérer <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {worksByCatList.map((c) => {
              const pct = (c.count / maxWorks) * 100
              return (
                <div key={c.label} className="flex items-center gap-3 text-sm">
                  <span className="w-24 sm:w-28 shrink-0 truncate text-(--color-charcoal)">
                    {c.label}
                  </span>
                  <div className="flex-1 h-1.5 bg-(--color-canvas) overflow-hidden rounded-sm">
                    <div
                      className="h-full bg-(--color-bronze) transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-(--color-stone)">
                    {c.count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ibooks */}
        <div className="bg-(--color-paper) border border-(--color-frame) p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) inline-flex items-center gap-2">
              <BookOpen className="w-3 h-3" />
              Ibook ({ibooksCount ?? 0})
            </p>
            <Link
              href="/admin/ibook"
              className="text-xs text-(--color-bronze) hover:text-(--color-bronze-dark) inline-flex items-center gap-0.5"
            >
              Gérer <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {(ibooks ?? []).length === 0 ? (
            <p className="text-sm text-(--color-stone) italic">Aucun ibook publié</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(ibooks ?? []).slice(0, 8).map((b) => (
                <Link
                  key={b.id}
                  href={`/admin/ibook/${b.id}`}
                  className="block group"
                  title={b.title_fr || b.title_nl}
                >
                  <div
                    className={`relative aspect-[3/4] bg-(--color-canvas) border overflow-hidden ${
                      b.is_active
                        ? 'border-(--color-frame)'
                        : 'border-(--color-frame) opacity-50'
                    }`}
                  >
                    {b.cover_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ibookUrl(b.cover_path)}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-(--color-stone)">
                        <BookOpen className="w-6 h-6 opacity-40" />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* WEBSHOP — placeholder */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
              Boutique en ligne
            </p>
            <p className="mt-1 text-sm text-(--color-charcoal)">
              <Clock className="inline w-3.5 h-3.5 mr-1 text-(--color-bronze)" />
              Bientôt disponible — paiements automatiques
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <PlaceholderCard icon={ShoppingBag} label="Commandes" />
          <PlaceholderCard icon={CreditCard} label="Revenus (mois)" />
          <PlaceholderCard icon={Package} label="Produits" />
          <PlaceholderCard icon={Truck} label="Livraisons" />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section>
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
          Actions rapides
        </p>
        <div className="flex flex-wrap gap-2">
          <QuickAction
            href="/admin/works/upload"
            icon={Plus}
            label="Téléverser œuvres"
            primary
          />
          <QuickAction href="/admin/events" icon={Camera} label="Nouvel album" />
          <QuickAction href="/admin/compose" icon={Send} label="Composer & partager" />
          <QuickAction href="/admin/ibook" icon={BookOpen} label="Ibook" />
          <QuickAction href="/admin/analytics" icon={Activity} label="Activité web" />
          <QuickAction href="/admin/signature" icon={PenTool} label="Signature mail" />
        </div>
      </section>
    </div>
  )
}

// ────────────────────────── components ──────────────────────────

function StatCard({
  href,
  icon: Icon,
  label,
  value,
  hint,
  accent,
  highlight,
}: {
  href: string
  icon: React.ElementType
  label: string
  value: number | string
  hint?: string
  accent?: boolean
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`card-elev card-elev-lift block p-5 border group ${
        accent
          ? 'bg-(--color-bronze)/10 border-(--color-bronze)/40 hover:border-(--color-bronze)'
          : 'bg-(--color-paper) border-(--color-frame) hover:border-(--color-bronze)'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
          {label}
        </span>
        <Icon
          className={`w-4 h-4 ${
            accent
              ? 'text-(--color-bronze)'
              : 'text-(--color-stone) group-hover:text-(--color-bronze)'
          } transition-colors`}
        />
      </div>
      <p className="text-3xl font-[family-name:var(--font-display)] text-(--color-ink) leading-none">
        {value}
      </p>
      {hint && (
        <p
          className={`mt-2 text-xs ${
            highlight ? 'text-(--color-bronze) font-medium' : 'text-(--color-stone)'
          }`}
        >
          {hint}
        </p>
      )}
    </Link>
  )
}

function PlaceholderCard({
  icon: Icon,
  label,
}: {
  icon: React.ElementType
  label: string
}) {
  return (
    <div className="p-5 bg-(--color-paper)/50 border border-(--color-frame) opacity-60">
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
          {label}
        </span>
        <Icon className="w-4 h-4 text-(--color-stone)" />
      </div>
      <p className="text-3xl font-[family-name:var(--font-display)] text-(--color-stone) leading-none">
        —
      </p>
      <p className="mt-2 text-xs text-(--color-stone) italic">en préparation</p>
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  primary,
}: {
  href: string
  icon: React.ElementType
  label: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-[0.15em] transition-colors ${
        primary
          ? 'bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark)'
          : 'border border-(--color-frame) text-(--color-charcoal) hover:text-(--color-ink) hover:border-(--color-stone)'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  )
}

function VisitorsChart({
  daily,
  maxCount,
}: {
  daily: DailyCount[]
  maxCount: number
}) {
  const width = 600
  const height = 120
  const padX = 4
  const innerW = width - padX * 2
  const stepX = daily.length > 1 ? innerW / (daily.length - 1) : 0

  const points = daily.map((d, i) => ({
    x: padX + i * stepX,
    y: height - 10 - (d.visitors / maxCount) * (height - 20),
    ...d,
  }))

  const linePath =
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : ''
  const areaPath =
    points.length > 0
      ? `M ${points[0].x} ${height} ${points
          .map((p) => `L ${p.x} ${p.y}`)
          .join(' ')} L ${points[points.length - 1].x} ${height} Z`
      : ''

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
        {areaPath && <path d={areaPath} fill="var(--color-bronze)" opacity={0.12} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-bronze)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {points.map((p) => (
          <circle
            key={p.date}
            cx={p.x}
            cy={p.y}
            r={2}
            fill="var(--color-bronze)"
          >
            <title>
              {p.date}: {p.visitors} visiteur{p.visitors !== 1 ? 's' : ''}
            </title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-(--color-stone) mt-1 px-1">
        <span>{daily[0]?.date.slice(5).replace('-', '/')}</span>
        <span>
          {daily[Math.floor(daily.length / 2)]?.date.slice(5).replace('-', '/')}
        </span>
        <span>
          {daily[daily.length - 1]?.date.slice(5).replace('-', '/')}
        </span>
      </div>
    </div>
  )
}
