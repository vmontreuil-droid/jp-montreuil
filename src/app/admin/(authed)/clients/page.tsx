import Link from 'next/link'
import {
  ArrowLeft,
  Brush,
  Camera,
  Mail,
  Phone,
  Search,
  Users,
  Wallet,
  ChevronRight,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type CommissionLite = {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  devis_total_eur: number | null
  devis_acompte_eur: number | null
  acompte_received_at: string | null
  balance_received_at: string | null
  signed_at: string | null
  completed_at: string | null
  created_at: string
}

type AlbumLite = {
  id: string
  client_email: string | null
  client_name: string | null
}

type MessageLite = {
  id: string
  email: string
  read_at: string | null
}

type ClientAggregate = {
  emailKey: string
  displayEmail: string
  name: string
  phone: string | null
  commissionsCount: number
  signedCount: number
  closedCount: number
  totalSigned: number
  totalReceived: number
  outstanding: number
  lastActivity: string
  albumsCount: number
  unreadMessages: number
  lastStatus: string
}

const STATUS_LABEL_FR: Record<string, string> = {
  nieuw: 'Nouvelle',
  in_behandeling: 'En préparation',
  devis_envoye: 'Devis envoyé',
  signe: 'Signée',
  refuse: 'Refusée',
  acompte_recu: 'Acompte reçu',
  en_cours: 'En cours',
  pret: 'Prête',
  solde_recu: 'Solde reçu',
  livraison_planifiee: 'Livraison fixée',
  livre: 'Livrée',
  complete: 'Clôturée',
}

function formatEurCompact(value: number): string {
  if (value === 0) return '0 €'
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString('fr-BE', { maximumFractionDigits: 1 })} k€`
  }
  return `${Math.round(value).toLocaleString('fr-BE')} €`
}

type Props = {
  searchParams: Promise<{ q?: string }>
}

export default async function AdminClientsPage({ searchParams }: Props) {
  const sp = await searchParams
  const query = (sp.q ?? '').trim().toLowerCase()

  // Auth check — alleen admins
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/admin/login')

  // Service-role client zodat RLS geen aggregatie blokkeert
  const admin = createAdminClient()

  // Probeer eerst met balance_received_at (post-migratie 0018). Als die
  // kolom niet bestaat, val terug op een minimale set zodat de pagina
  // toch klanten toont en we de gebruiker waarschuwen.
  let commissionsRaw: CommissionLite[] | null = null
  let missingMigration = false
  {
    const { data, error } = await admin
      .from('commission_requests')
      .select(
        'id, name, email, phone, status, devis_total_eur, devis_acompte_eur, acompte_received_at, balance_received_at, signed_at, completed_at, created_at'
      )
      .order('created_at', { ascending: false })
      .returns<CommissionLite[]>()

    if (error && /balance_received_at|column.*does not exist/i.test(error.message)) {
      missingMigration = true
      const fallback = await admin
        .from('commission_requests')
        .select(
          'id, name, email, phone, status, devis_total_eur, devis_acompte_eur, acompte_received_at, signed_at, completed_at, created_at'
        )
        .order('created_at', { ascending: false })
      commissionsRaw = (fallback.data ?? []).map((c) => ({
        ...(c as Omit<CommissionLite, 'balance_received_at'>),
        balance_received_at: null,
      }))
    } else if (error) {
      console.error('[admin/clients] commissions query failed:', error.message)
    } else {
      commissionsRaw = data
    }
  }

  const [{ data: albumsRaw }, { data: messagesRaw }] = await Promise.all([
    admin.from('event_albums').select('id, client_email, client_name').returns<AlbumLite[]>(),
    admin
      .from('contact_messages')
      .select('id, email, read_at')
      .is('deleted_at', null)
      .returns<MessageLite[]>(),
  ])

  // Aggregeer per email
  const map = new Map<string, ClientAggregate>()

  for (const c of commissionsRaw ?? []) {
    const key = c.email.toLowerCase()
    if (!map.has(key)) {
      map.set(key, {
        emailKey: key,
        displayEmail: c.email,
        name: c.name,
        phone: c.phone,
        commissionsCount: 0,
        signedCount: 0,
        closedCount: 0,
        totalSigned: 0,
        totalReceived: 0,
        outstanding: 0,
        lastActivity: c.created_at,
        albumsCount: 0,
        unreadMessages: 0,
        lastStatus: c.status,
      })
    }
    const agg = map.get(key)!
    agg.commissionsCount++
    if (c.signed_at && c.status !== 'refuse') {
      agg.signedCount++
      const total = Number(c.devis_total_eur) || 0
      agg.totalSigned += total
      let received = 0
      if (c.balance_received_at) received = total
      else if (c.acompte_received_at) received = Number(c.devis_acompte_eur) || 0
      agg.totalReceived += received
      agg.outstanding += Math.max(0, total - received)
    }
    if (c.completed_at) agg.closedCount++
    if (new Date(c.created_at) > new Date(agg.lastActivity)) {
      agg.lastActivity = c.created_at
      agg.lastStatus = c.status
      agg.name = c.name
      agg.phone = c.phone || agg.phone
    }
  }

  for (const a of albumsRaw ?? []) {
    if (!a.client_email) continue
    const key = a.client_email.toLowerCase()
    if (!map.has(key)) {
      map.set(key, {
        emailKey: key,
        displayEmail: a.client_email,
        name: a.client_name || a.client_email,
        phone: null,
        commissionsCount: 0,
        signedCount: 0,
        closedCount: 0,
        totalSigned: 0,
        totalReceived: 0,
        outstanding: 0,
        lastActivity: '1970-01-01',
        albumsCount: 0,
        unreadMessages: 0,
        lastStatus: '',
      })
    }
    map.get(key)!.albumsCount++
  }

  for (const m of messagesRaw ?? []) {
    if (!m.email) continue
    if (m.read_at) continue
    const key = m.email.toLowerCase()
    if (!map.has(key)) continue
    map.get(key)!.unreadMessages++
  }

  let clients = Array.from(map.values()).sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  )

  if (query) {
    clients = clients.filter(
      (c) =>
        c.displayEmail.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        (c.phone || '').toLowerCase().includes(query)
    )
  }

  const totalRevenue = clients.reduce((s, c) => s + c.totalReceived, 0)
  const totalOutstanding = clients.reduce((s, c) => s + c.outstanding, 0)

  return (
    <div className="p-8 md:p-12 max-w-7xl">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Tableau de bord
        </Link>
      </div>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)] inline-flex items-center gap-3">
          <Users className="w-8 h-8 text-(--color-bronze)" />
          Mes clients
        </h1>
        <p className="mt-2 text-sm text-(--color-charcoal)">
          {clients.length} client{clients.length > 1 ? 's' : ''} — agrégés par adresse e-mail
        </p>
      </header>

      {missingMigration && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-sm text-red-700">
          <strong>Migration en attente :</strong> Exécutez{' '}
          <code className="font-mono text-xs">0018_delivery_flow.sql</code> dans Supabase
          pour activer le suivi complet (solde, livraisons). Affichage actuellement en mode dégradé.
        </div>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <div className="p-5 bg-(--color-paper) border border-(--color-frame)">
          <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">Clients</p>
          <p className="text-3xl font-[family-name:var(--font-display)] text-(--color-ink)">
            {clients.length}
          </p>
        </div>
        <div className="p-5 bg-(--color-paper) border border-(--color-frame)">
          <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
            Encaissé total
          </p>
          <p className="text-3xl font-[family-name:var(--font-display)] text-(--color-ink)">
            {formatEurCompact(totalRevenue)}
          </p>
        </div>
        <div className="p-5 bg-(--color-paper) border border-(--color-frame) relative">
          <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
            Reste à recevoir
          </p>
          <p
            className={`text-3xl font-[family-name:var(--font-display)] ${
              totalOutstanding > 0 ? 'text-red-600 font-semibold' : 'text-(--color-ink)'
            }`}
          >
            {formatEurCompact(totalOutstanding)}
          </p>
        </div>
      </section>

      <form action="/admin/clients" method="get" className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-stone)" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Rechercher par nom, e-mail ou téléphone…"
            className="w-full pl-10 pr-4 py-2.5 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
          />
        </div>
      </form>

      {clients.length === 0 ? (
        <div className="bg-(--color-paper) border border-(--color-frame) p-10 text-center text-sm text-(--color-stone)">
          {query ? 'Aucun client ne correspond.' : 'Pas encore de client.'}
        </div>
      ) : (
        <ul className="bg-(--color-paper) border border-(--color-frame) divide-y divide-(--color-frame)/50">
          {clients.map((c) => (
            <li key={c.emailKey}>
              <Link
                href={`/admin/clients/${encodeURIComponent(c.emailKey)}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-(--color-canvas)/40 group relative"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base text-(--color-ink) font-[family-name:var(--font-display)] truncate group-hover:text-(--color-bronze) transition-colors">
                      {c.name}
                    </span>
                    {c.unreadMessages > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold text-white bg-red-600 rounded-full shrink-0">
                        {c.unreadMessages}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--color-stone)">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {c.displayEmail}
                    </span>
                    {c.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {c.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-3 text-xs">
                  {c.commissionsCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-(--color-canvas) border border-(--color-frame) text-(--color-charcoal)">
                      <Brush className="w-3 h-3 text-(--color-bronze)" />
                      {c.commissionsCount}
                    </span>
                  )}
                  {c.albumsCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-(--color-canvas) border border-(--color-frame) text-(--color-charcoal)">
                      <Camera className="w-3 h-3 text-(--color-bronze)" />
                      {c.albumsCount}
                    </span>
                  )}
                </div>

                <div className="hidden lg:flex flex-col items-end shrink-0 w-32 text-xs">
                  {c.totalSigned > 0 && (
                    <span className="text-(--color-bronze) font-semibold tabular-nums">
                      {formatEurCompact(c.totalSigned)}
                    </span>
                  )}
                  {c.outstanding > 0 && (
                    <span className="text-red-600 inline-flex items-center gap-1 mt-0.5">
                      <Wallet className="w-3 h-3" />
                      {formatEurCompact(c.outstanding)}
                    </span>
                  )}
                </div>

                {c.lastStatus && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] border border-(--color-bronze)/30 bg-(--color-bronze)/10 text-(--color-ink) shrink-0">
                    {STATUS_LABEL_FR[c.lastStatus] ?? c.lastStatus}
                  </span>
                )}

                <ChevronRight className="w-4 h-4 text-(--color-stone) group-hover:text-(--color-bronze) shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
