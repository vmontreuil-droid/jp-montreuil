import Link from 'next/link'
import {
  FolderTree,
  Image as ImageIcon,
  Inbox,
  Paperclip,
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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type RecentMessage = {
  id: string
  name: string
  email: string
  message: string
  created_at: string
  read_at: string | null
}

type DailyCount = { date: string; count: number }

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function lastNDays(n: number): Date[] {
  const today = startOfDay(new Date())
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (n - 1 - i))
    return d
  })
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { count: categoriesCount },
    { count: worksCount },
    { count: messagesCount },
    { count: unreadCount },
    { count: attachmentsCount },
    { count: messages30dCount },
    { data: recent },
    { data: messagesForChart },
    { data: worksByCat },
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
    supabase.from('contact_attachments').select('*', { count: 'exact', head: true }),
    supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('contact_messages')
      .select('id, name, email, message, created_at, read_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<RecentMessage[]>(),
    supabase
      .from('contact_messages')
      .select('created_at')
      .is('deleted_at', null)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('categories')
      .select('id, label_fr, sort_order, works:works!works_category_id_fkey(id)')
      .order('sort_order', { ascending: true }),
  ])

  // Bouw daily-counts voor de chart
  const chartDays = lastNDays(30)
  const counts = new Map<string, number>(chartDays.map((d) => [dayKey(d), 0]))
  for (const row of messagesForChart ?? []) {
    const k = dayKey(new Date(row.created_at))
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const daily: DailyCount[] = chartDays.map((d) => ({
    date: dayKey(d),
    count: counts.get(dayKey(d)) ?? 0,
  }))
  const maxCount = Math.max(1, ...daily.map((d) => d.count))

  const worksByCatList = (worksByCat ?? []).map((c) => ({
    label: c.label_fr,
    count: Array.isArray(c.works) ? c.works.length : 0,
  }))
  const maxWorks = Math.max(1, ...worksByCatList.map((c) => c.count))

  const readPct =
    messagesCount && messagesCount > 0
      ? Math.round(((messagesCount - (unreadCount ?? 0)) / messagesCount) * 100)
      : 0

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
          Vue d&apos;ensemble du site — {new Date().toLocaleDateString('fr-BE', { dateStyle: 'long' })}
        </p>
      </header>

      {/* HERO STAT-CARDS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <StatCard
          href="/admin/works"
          icon={ImageIcon}
          label="Œuvres"
          value={worksCount ?? 0}
          accent
        />
        <StatCard
          href="/admin/categories"
          icon={FolderTree}
          label="Catégories"
          value={categoriesCount ?? 0}
        />
        <StatCard
          href="/admin/messages"
          icon={Inbox}
          label="Messages"
          value={messagesCount ?? 0}
          hint={
            unreadCount && unreadCount > 0
              ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`
              : `${readPct}% lus`
          }
          highlight={!!unreadCount && unreadCount > 0}
        />
        <StatCard
          href="/admin/messages"
          icon={Paperclip}
          label="Pièces jointes"
          value={attachmentsCount ?? 0}
        />
      </section>

      {/* CHART + RECENT */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-10">
        <div className="lg:col-span-2 bg-(--color-paper) border border-(--color-frame) p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
                Activité — 30 jours
              </p>
              <p className="mt-1 text-2xl text-(--color-ink) font-[family-name:var(--font-display)]">
                {messages30dCount ?? 0} message{(messages30dCount ?? 0) === 1 ? '' : 's'}
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-(--color-bronze)" />
          </div>
          <ActivityChart daily={daily} maxCount={maxCount} />
        </div>

        <div className="bg-(--color-paper) border border-(--color-frame) p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
              Messages récents
            </p>
            <Link
              href="/admin/messages"
              className="text-xs text-(--color-bronze) hover:text-(--color-bronze-dark) inline-flex items-center gap-0.5"
            >
              Tout voir <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {(recent ?? []).length === 0 ? (
            <p className="text-sm text-(--color-stone) italic">Aucun message</p>
          ) : (
            <ul className="space-y-3">
              {(recent ?? []).map((m) => (
                <li key={m.id}>
                  <Link
                    href="/admin/messages"
                    className="block group"
                  >
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
      </section>

      {/* WERKEN PER CATEGORIE */}
      <section className="bg-(--color-paper) border border-(--color-frame) p-6 mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
          Œuvres par catégorie
        </p>
        <div className="space-y-2">
          {worksByCatList.map((c) => {
            const pct = (c.count / maxWorks) * 100
            return (
              <div key={c.label} className="flex items-center gap-3 text-sm">
                <span className="w-24 sm:w-32 shrink-0 truncate text-(--color-charcoal)">
                  {c.label}
                </span>
                <div className="flex-1 h-2 bg-(--color-canvas) overflow-hidden rounded-sm">
                  <div
                    className="h-full bg-(--color-bronze) transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-(--color-stone)">{c.count}</span>
              </div>
            )
          })}
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
          <QuickAction href="/admin/works/upload" icon={Plus} label="Téléverser œuvres" primary />
          <QuickAction href="/admin/categories" icon={FolderTree} label="Gérer catégories" />
          <QuickAction href="/admin/messages" icon={Mail} label="Voir messages" />
          <QuickAction href="/admin/social" icon={Eye} label="Réseaux sociaux" />
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
      className={`block p-5 border transition-colors group ${
        accent
          ? 'bg-(--color-bronze)/10 border-(--color-bronze)/40 hover:border-(--color-bronze)'
          : 'bg-(--color-paper) border-(--color-frame) hover:border-(--color-bronze)'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">{label}</span>
        <Icon
          className={`w-4 h-4 ${accent ? 'text-(--color-bronze)' : 'text-(--color-stone) group-hover:text-(--color-bronze)'} transition-colors`}
        />
      </div>
      <p className="text-3xl font-[family-name:var(--font-display)] text-(--color-ink) leading-none">
        {value}
      </p>
      {hint && (
        <p
          className={`mt-2 text-xs ${highlight ? 'text-(--color-bronze) font-medium' : 'text-(--color-stone)'}`}
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
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">{label}</span>
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

function ActivityChart({ daily, maxCount }: { daily: DailyCount[]; maxCount: number }) {
  // SVG-based bar chart — geen extra dependency
  const width = 600
  const height = 120
  const barWidth = width / daily.length
  const padding = barWidth * 0.15

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-32"
        preserveAspectRatio="none"
      >
        {daily.map((d, i) => {
          const barHeight = (d.count / maxCount) * (height - 16)
          const x = i * barWidth + padding
          const w = barWidth - padding * 2
          const y = height - barHeight
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={w}
                height={barHeight}
                fill={d.count > 0 ? 'var(--color-bronze)' : 'var(--color-frame)'}
                opacity={d.count > 0 ? 0.85 : 0.4}
                rx={1}
              >
                <title>
                  {d.date}: {d.count}
                </title>
              </rect>
            </g>
          )
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-(--color-stone) mt-1 px-1">
        <span>{daily[0]?.date.slice(5).replace('-', '/')}</span>
        <span>{daily[Math.floor(daily.length / 2)]?.date.slice(5).replace('-', '/')}</span>
        <span>{daily[daily.length - 1]?.date.slice(5).replace('-', '/')}</span>
      </div>
    </div>
  )
}
