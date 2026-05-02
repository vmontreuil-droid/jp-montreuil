import {
  Activity,
  Eye,
  Globe,
  Image as ImageIcon,
  Smartphone,
  TrendingUp,
  Users,
  Calendar,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { workImageUrl } from '@/lib/links'
import ViewsLineChart from './ViewsLineChart'

export const dynamic = 'force-dynamic'

type EventRow = {
  id: string
  created_at: string
  event_type: string
  path: string
  referrer: string | null
  country: string | null
  device: string | null
  browser: string | null
  os: string | null
  session_id: string
  work_id: string | null
  category_slug: string | null
}

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
  PL: 'Pologne',
  SE: 'Suède',
  NO: 'Norvège',
  DK: 'Danemark',
  FI: 'Finlande',
  IE: 'Irlande',
}

function countryName(code: string | null): string {
  if (!code) return 'Inconnu'
  return COUNTRY_NAMES[code] ?? code
}

function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return '🌍'
  const A = 0x1f1e6 - 65
  return String.fromCodePoint(code.charCodeAt(0) + A, code.charCodeAt(1) + A)
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `il y a ${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `il y a ${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `il y a ${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 30) return `il y a ${day}j`
  return date.toLocaleDateString('fr-BE')
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const start90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Alle relevante events laden (laatste 30 dagen) — daarna client-side
  // aggregeren. Voor JP's volume is 't simpler dan SQL views.
  const { data: events30 } = await supabase
    .from('analytics_events')
    .select('*')
    .gte('created_at', start30d.toISOString())
    .order('created_at', { ascending: false })
    .returns<EventRow[]>()

  const recent = events30 ?? []

  // Counts
  const todayEvents = recent.filter((e) => new Date(e.created_at) >= startOfToday)
  const sevenDayEvents = recent.filter((e) => new Date(e.created_at) >= start7d)

  const uniqueSessions = (rows: EventRow[]) => new Set(rows.map((r) => r.session_id)).size

  const visitorsToday = uniqueSessions(todayEvents)
  const visitors7d = uniqueSessions(sevenDayEvents)
  const visitors30d = uniqueSessions(recent)
  const viewsToday = todayEvents.filter((e) => e.event_type === 'page_view').length
  const views30d = recent.filter((e) => e.event_type === 'page_view').length

  // Totaal aller tijden — head only
  const { count: viewsAllTime } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'page_view')

  // Bezoekers per dag (laatste 30 dagen) voor de chart
  const dayBuckets = new Map<string, Set<string>>()
  for (let i = 0; i < 30; i++) {
    const d = new Date(start30d.getTime() + i * 24 * 60 * 60 * 1000)
    d.setHours(0, 0, 0, 0)
    dayBuckets.set(d.toISOString().slice(0, 10), new Set<string>())
  }
  for (const e of recent) {
    if (e.event_type !== 'page_view') continue
    const key = e.created_at.slice(0, 10)
    if (!dayBuckets.has(key)) continue
    dayBuckets.get(key)!.add(e.session_id)
  }
  const chartData = Array.from(dayBuckets.entries()).map(([date, sessions]) => ({
    date,
    visitors: sessions.size,
  }))

  // Top paths (page_view only)
  const pathCounts = new Map<string, number>()
  for (const e of recent.filter((r) => r.event_type === 'page_view')) {
    pathCounts.set(e.path, (pathCounts.get(e.path) ?? 0) + 1)
  }
  const topPaths = [...pathCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Top countries
  const countryCounts = new Map<string, number>()
  for (const e of recent.filter((r) => r.event_type === 'page_view')) {
    const k = e.country || 'Inconnu'
    countryCounts.set(k, (countryCounts.get(k) ?? 0) + 1)
  }
  const topCountries = [...countryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Devices breakdown
  const deviceCounts = new Map<string, number>()
  const browserCounts = new Map<string, number>()
  for (const e of recent.filter((r) => r.event_type === 'page_view')) {
    if (e.device) deviceCounts.set(e.device, (deviceCounts.get(e.device) ?? 0) + 1)
    if (e.browser) browserCounts.set(e.browser, (browserCounts.get(e.browser) ?? 0) + 1)
  }

  // Top works
  const workCounts = new Map<string, number>()
  for (const e of recent.filter((r) => r.event_type === 'work_view' && r.work_id)) {
    workCounts.set(e.work_id!, (workCounts.get(e.work_id!) ?? 0) + 1)
  }
  let topWorks: { id: string; storage_path: string; title_fr: string | null; views: number }[] = []
  if (workCounts.size > 0) {
    const ids = [...workCounts.keys()].slice(0, 20)
    const { data: works } = await supabase
      .from('works')
      .select('id, storage_path, title_fr')
      .in('id', ids)
    topWorks = (works ?? [])
      .map((w) => ({ ...w, views: workCounts.get(w.id) ?? 0 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8)
  }

  // Live: laatste 5 minuten unieke sessies
  const start5min = new Date(now.getTime() - 5 * 60 * 1000)
  const liveSessions = new Set(
    recent.filter((e) => new Date(e.created_at) >= start5min).map((e) => e.session_id)
  ).size

  // Recente activiteit — top 30
  const recentFeed = recent.slice(0, 30)

  // Total events 90d voor cleanup-context (info)
  const { count: total90d } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start90d.toISOString())

  return (
    <div className="p-8 md:p-12 max-w-6xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Activité web
        </h1>
        <p className="mt-2 text-sm text-(--color-stone)">
          Analyses anonymes (sans cookies) — visiteurs, pages, pays, appareils.
        </p>
      </header>

      {/* Live + stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon={<Activity className="w-4 h-4" />}
          label="En direct"
          value={liveSessions}
          sub="dernières 5 min"
          live={liveSessions > 0}
        />
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Aujourd'hui"
          value={visitorsToday}
          sub={`${viewsToday} pages vues`}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="7 jours"
          value={visitors7d}
          sub="visiteurs"
        />
        <StatCard
          icon={<Calendar className="w-4 h-4" />}
          label="30 jours"
          value={visitors30d}
          sub={`${views30d} pages vues`}
        />
      </div>

      {/* Line chart */}
      <section className="mb-8 bg-(--color-paper) border border-(--color-frame) p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" />
          Visiteurs uniques · 30 derniers jours
        </h2>
        <ViewsLineChart data={chartData} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Top pages */}
        <section className="bg-(--color-paper) border border-(--color-frame) p-5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            Top pages
          </h2>
          {topPaths.length === 0 ? (
            <p className="text-sm text-(--color-stone)">Aucune donnée.</p>
          ) : (
            <BarList
              items={topPaths.map(([path, count]) => ({
                label: path,
                count,
                mono: true,
              }))}
            />
          )}
        </section>

        {/* Top countries */}
        <section className="bg-(--color-paper) border border-(--color-frame) p-5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            Pays
          </h2>
          {topCountries.length === 0 ? (
            <p className="text-sm text-(--color-stone)">Aucune donnée.</p>
          ) : (
            <BarList
              items={topCountries.map(([code, count]) => ({
                label: `${flagEmoji(code === 'Inconnu' ? null : code)} ${countryName(code === 'Inconnu' ? null : code)}`,
                count,
              }))}
            />
          )}
        </section>

        {/* Devices */}
        <section className="bg-(--color-paper) border border-(--color-frame) p-5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5" />
            Appareils
          </h2>
          {deviceCounts.size === 0 ? (
            <p className="text-sm text-(--color-stone)">Aucune donnée.</p>
          ) : (
            <BarList
              items={[...deviceCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([k, count]) => ({
                  label:
                    k === 'mobile'
                      ? '📱 Mobile'
                      : k === 'tablet'
                        ? '📱 Tablette'
                        : '💻 Ordinateur',
                  count,
                }))}
            />
          )}
        </section>

        {/* Browsers */}
        <section className="bg-(--color-paper) border border-(--color-frame) p-5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
            🌐 Navigateurs
          </h2>
          {browserCounts.size === 0 ? (
            <p className="text-sm text-(--color-stone)">Aucune donnée.</p>
          ) : (
            <BarList
              items={[...browserCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([k, count]) => ({
                  label: k.charAt(0).toUpperCase() + k.slice(1),
                  count,
                }))}
            />
          )}
        </section>
      </div>

      {/* Top works */}
      {topWorks.length > 0 && (
        <section className="bg-(--color-paper) border border-(--color-frame) p-5 mb-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5" />
            Œuvres les plus vues
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {topWorks.map((w) => (
              <div key={w.id} className="space-y-2">
                <div className="relative aspect-square bg-(--color-canvas) overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={workImageUrl(w.storage_path)}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <span className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-black/70 text-white text-[10px] uppercase tracking-[0.15em]">
                    {w.views} vues
                  </span>
                </div>
                <p className="text-xs text-(--color-charcoal) truncate">
                  {w.title_fr || '—'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent feed */}
      <section className="bg-(--color-paper) border border-(--color-frame) p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Activité récente
        </h2>
        {recentFeed.length === 0 ? (
          <p className="text-sm text-(--color-stone)">Pas d&apos;activité récente.</p>
        ) : (
          <ul className="divide-y divide-(--color-frame)">
            {recentFeed.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2 text-xs">
                <span className="opacity-70">{flagEmoji(e.country)}</span>
                <code className="text-(--color-charcoal) flex-1 truncate font-mono">
                  {e.path}
                </code>
                <span className="text-(--color-stone) hidden sm:inline">
                  {e.device}
                </span>
                <span className="text-(--color-stone) min-w-[80px] text-right">
                  {relativeTime(new Date(e.created_at))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-[10px] text-(--color-stone) text-center">
        {total90d ?? 0} événements stockés (90 derniers jours)
      </p>
    </div>
  )
}

// ============================================================================
// Subcomponents
// ============================================================================

function StatCard({
  icon,
  label,
  value,
  sub,
  live,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub?: string
  live?: boolean
}) {
  return (
    <div className="bg-(--color-paper) border border-(--color-frame) p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-2">
        <span className="text-(--color-bronze)">{icon}</span>
        {label}
        {live && (
          <span
            className="ml-auto inline-flex items-center gap-1 text-[10px] text-(--color-bronze)"
            aria-label="live"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-(--color-bronze) animate-pulse" />
          </span>
        )}
      </div>
      <p className="text-3xl font-[family-name:var(--font-display)] text-(--color-ink) leading-none">
        {value}
      </p>
      {sub && <p className="mt-1 text-[10px] text-(--color-stone)">{sub}</p>}
    </div>
  )
}

function BarList({ items }: { items: { label: string; count: number; mono?: boolean }[] }) {
  if (items.length === 0) return null
  const max = Math.max(...items.map((i) => i.count))
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="text-xs">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span
              className={`flex-1 truncate text-(--color-charcoal) ${it.mono ? 'font-mono' : ''}`}
            >
              {it.label}
            </span>
            <span className="text-(--color-stone)">{it.count}</span>
          </div>
          <div className="h-1 bg-(--color-canvas) overflow-hidden">
            <div
              className="h-full bg-(--color-bronze)"
              style={{ width: max > 0 ? `${(it.count / max) * 100}%` : '0%' }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
