import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Brush,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  User,
  Wallet,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import NotesForm from './NotesForm'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ email: string }>
}

type CommissionLite = {
  id: string
  name: string
  status: string
  devis_subject: string | null
  devis_total_eur: number | null
  devis_acompte_eur: number | null
  acompte_received_at: string | null
  balance_received_at: string | null
  signed_at: string | null
  delivered_at: string | null
  completed_at: string | null
  created_at: string
}

type AlbumLite = {
  id: string
  slug: string
  title: string
  is_active: boolean
  event_date: string | null
  created_at: string
}

type MessageLite = {
  id: string
  message: string
  read_at: string | null
  created_at: string
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

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-BE', { dateStyle: 'medium' })
}

export default async function AdminClientDetailPage({ params }: Props) {
  const { email: emailRaw } = await params
  const email = decodeURIComponent(emailRaw).toLowerCase()

  const supabase = await createClient()
  const [
    { data: commissionsRaw },
    { data: albumsRaw },
    { data: messagesRaw },
    { data: noteRow },
  ] = await Promise.all([
    supabase
      .from('commission_requests')
      .select(
        'id, name, status, devis_subject, devis_total_eur, devis_acompte_eur, acompte_received_at, balance_received_at, signed_at, delivered_at, completed_at, created_at, email, phone'
      )
      .ilike('email', email)
      .order('created_at', { ascending: false }),
    supabase
      .from('event_albums')
      .select('id, slug, title, is_active, event_date, created_at, client_email')
      .ilike('client_email', email)
      .order('created_at', { ascending: false }),
    supabase
      .from('contact_messages')
      .select('id, message, read_at, created_at, email')
      .ilike('email', email)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('client_notes').select('notes, updated_at').eq('email', email).maybeSingle<{
      notes: string
      updated_at: string
    }>(),
  ])

  // Geen klant gevonden in geen enkele tabel? → 404
  if (
    (!commissionsRaw || commissionsRaw.length === 0) &&
    (!albumsRaw || albumsRaw.length === 0) &&
    (!messagesRaw || messagesRaw.length === 0)
  ) {
    notFound()
  }

  const commissions = (commissionsRaw ?? []) as (CommissionLite & {
    email: string
    phone: string | null
  })[]
  const albums = (albumsRaw ?? []) as AlbumLite[]
  const messages = (messagesRaw ?? []) as MessageLite[]
  const noteText = noteRow?.notes ?? ''
  const noteUpdated = noteRow?.updated_at ?? null

  // Display info
  const latestCommission = commissions[0]
  const displayName = latestCommission?.name || email
  const displayPhone = latestCommission?.phone || null
  const displayEmail = latestCommission?.email || email

  // Aggregaten
  const totalSigned = commissions
    .filter((c) => c.signed_at && c.status !== 'refuse')
    .reduce((sum, c) => sum + (Number(c.devis_total_eur) || 0), 0)
  const totalReceived = commissions.reduce((sum, c) => {
    if (c.balance_received_at) return sum + (Number(c.devis_total_eur) || 0)
    if (c.acompte_received_at) return sum + (Number(c.devis_acompte_eur) || 0)
    return sum
  }, 0)
  const outstanding = Math.max(0, totalSigned - totalReceived)
  const unreadMessages = messages.filter((m) => !m.read_at).length

  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <div className="mb-6">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Liste clients
        </Link>
      </div>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)] inline-flex items-center gap-3">
          <User className="w-8 h-8 text-(--color-bronze)" />
          {displayName}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-(--color-charcoal)">
          <a href={`mailto:${displayEmail}`} className="inline-flex items-center gap-2 hover:text-(--color-bronze)">
            <Mail className="w-4 h-4 text-(--color-bronze)" />
            {displayEmail}
          </a>
          {displayPhone && (
            <a
              href={`tel:${displayPhone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 hover:text-(--color-bronze)"
            >
              <Phone className="w-4 h-4 text-(--color-bronze)" />
              {displayPhone}
            </a>
          )}
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatBlock label="Commandes" value={commissions.length} icon={Brush} />
        <StatBlock label="CA signé" value={formatEurCompact(totalSigned)} icon={Wallet} />
        <StatBlock
          label="Reçu"
          value={formatEurCompact(totalReceived)}
          icon={CheckCircle2}
        />
        <StatBlock
          label="Reste à recevoir"
          value={formatEurCompact(outstanding)}
          icon={Wallet}
          highlight={outstanding > 0}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Commissions */}
          <section className="bg-(--color-paper) border border-(--color-frame) p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)] inline-flex items-center gap-2">
                <Brush className="w-4 h-4 text-(--color-bronze)" />
                Toutes les commandes ({commissions.length})
              </h2>
            </div>
            {commissions.length === 0 ? (
              <p className="text-sm text-(--color-stone) italic">Pas encore de commande.</p>
            ) : (
              <ul className="divide-y divide-(--color-frame)/50">
                {commissions.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/commissions/${c.id}`}
                      className="block py-3 hover:bg-(--color-canvas)/40 -mx-2 px-2 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-(--color-ink) font-semibold truncate group-hover:text-(--color-bronze) transition-colors">
                            {c.devis_subject || 'Demande sans sujet'}
                          </p>
                          <p className="text-xs text-(--color-stone) inline-flex items-center gap-3 mt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(c.created_at)}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] border border-(--color-bronze)/30 bg-(--color-bronze)/10 text-(--color-charcoal)">
                              {STATUS_LABEL_FR[c.status] ?? c.status}
                            </span>
                          </p>
                        </div>
                        {c.devis_total_eur != null && (
                          <span className="text-sm text-(--color-bronze) font-semibold tabular-nums shrink-0">
                            {formatEurCompact(c.devis_total_eur)}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Berichten */}
          <section className="bg-(--color-paper) border border-(--color-frame) p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)] inline-flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-(--color-bronze)" />
                Messages ({messages.length})
                {unreadMessages > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold text-white bg-red-600 rounded-full">
                    {unreadMessages}
                  </span>
                )}
              </h2>
              <Link
                href="/admin/messages"
                className="text-xs text-(--color-bronze) hover:text-(--color-bronze-dark)"
              >
                Voir tous
              </Link>
            </div>
            {messages.length === 0 ? (
              <p className="text-sm text-(--color-stone) italic">Aucun message.</p>
            ) : (
              <ul className="space-y-3">
                {messages.slice(0, 5).map((m) => (
                  <li
                    key={m.id}
                    className="text-sm text-(--color-charcoal) border-l-2 border-(--color-bronze)/40 pl-3"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-0.5">
                      <span className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">
                        {formatDate(m.created_at)}
                      </span>
                      {!m.read_at && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] bg-red-600 text-white rounded-sm">
                          Non lu
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap">{m.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Albums */}
          {albums.length > 0 && (
            <section className="bg-(--color-paper) border border-(--color-frame) p-6">
              <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)] inline-flex items-center gap-2 mb-4">
                <Camera className="w-4 h-4 text-(--color-bronze)" />
                Albums partagés ({albums.length})
              </h2>
              <ul className="divide-y divide-(--color-frame)/50">
                {albums.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/admin/events/${a.id}`}
                      className="flex items-center gap-3 py-2 -mx-2 px-2 hover:bg-(--color-canvas)/40 group"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          a.is_active ? 'bg-(--color-bronze)' : 'bg-(--color-stone)'
                        }`}
                      />
                      <span className="text-sm text-(--color-ink) font-[family-name:var(--font-display)] flex-1 truncate group-hover:text-(--color-bronze) transition-colors">
                        {a.title}
                      </span>
                      {a.event_date && (
                        <span className="text-xs text-(--color-stone) inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(a.event_date)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Side: notities */}
        <aside className="space-y-6">
          <section className="bg-(--color-paper) border border-(--color-frame) p-6">
            <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)] inline-flex items-center gap-2 mb-3">
              <StickyNote className="w-4 h-4 text-(--color-bronze)" />
              Notes privées
            </h2>
            <NotesForm email={email} defaultNotes={noteText} />
            {noteUpdated && (
              <p className="mt-2 text-[10px] text-(--color-stone) italic">
                Mis à jour le {formatDate(noteUpdated)}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function StatBlock({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  highlight?: boolean
}) {
  return (
    <div className="p-4 bg-(--color-paper) border border-(--color-frame)">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone)">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 text-(--color-bronze)" />
      </div>
      <p
        className={`text-2xl font-[family-name:var(--font-display)] leading-none ${
          highlight ? 'text-red-600 font-semibold' : 'text-(--color-ink)'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
