import Link from 'next/link'
import { Brush, ChevronRight, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const STORAGE_BUCKET = 'commission-references'
const SIGNED_URL_TTL = 60 * 60

export const dynamic = 'force-dynamic'

const STATUS_FILTERS = ['nieuw', 'in_behandeling', 'devis_envoye', 'accepte', 'refuse', 'complete'] as const
type StatusKey = typeof STATUS_FILTERS[number]

const STATUS_LABEL: Record<StatusKey, string> = {
  nieuw: 'Nouvelle',
  in_behandeling: 'En cours',
  devis_envoye: 'Devis envoyé',
  accepte: 'Acceptée',
  refuse: 'Refusée',
  complete: 'Terminée',
}

const STATUS_BADGE: Record<StatusKey, string> = {
  nieuw: 'bg-(--color-bronze)/15 text-(--color-bronze) border-(--color-bronze)/30',
  in_behandeling: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  devis_envoye: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  accepte: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  refuse: 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30',
  complete: 'bg-stone-700/15 text-stone-800 dark:text-stone-200 border-stone-700/30',
}

const TECHNIQUE_LABEL_FR: Record<string, string> = {
  crayon_nb: 'Crayon noir & blanc',
  aquarelle_couleur: 'Aquarelle couleur',
  acrylique_toile: 'Acrylique sur toile',
  autre: 'À discuter',
}

type Props = {
  searchParams: Promise<{ status?: string }>
}

type CommissionRow = {
  id: string
  name: string
  email: string
  locale: string
  technique: string
  width_cm: number | null
  height_cm: number | null
  status: StatusKey
  read_at: string | null
  created_at: string
  commission_attachments: { id: string; storage_path: string }[]
}

export default async function AdminCommissionsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('commission_requests')
    .select(
      'id, name, email, locale, technique, width_cm, height_cm, status, read_at, created_at,' +
        ' commission_attachments(id, storage_path)'
    )
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (status && (STATUS_FILTERS as readonly string[]).includes(status)) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.returns<CommissionRow[]>()

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-400">Erreur : {error.message}</p>
      </div>
    )
  }

  const list = data ?? []
  const unread = list.filter((c) => !c.read_at).length

  // Genereer thumbnail-URLs voor de eerste foto van elke aanvraag
  const admin = createAdminClient()
  const thumbnails = new Map<string, string>()
  await Promise.all(
    list.map(async (c) => {
      const first = c.commission_attachments?.[0]
      if (!first) return
      const { data } = await admin.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(first.storage_path, SIGNED_URL_TTL)
      if (data?.signedUrl) thumbnails.set(c.id, data.signedUrl)
    })
  )

  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Demandes de devis
        </h1>
        <p className="mt-2 text-sm text-(--color-stone)">
          {list.length} demande{list.length === 1 ? '' : 's'}
          {unread > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-(--color-bronze)/15 text-(--color-bronze) text-xs">
              {unread} non lue{unread > 1 ? 's' : ''}
            </span>
          )}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/commissions"
          className={`px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
            !status
              ? 'border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-ink)'
              : 'border-(--color-frame) text-(--color-charcoal) hover:border-(--color-stone)'
          }`}
        >
          Toutes
        </Link>
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={`/admin/commissions?status=${s}`}
            className={`px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
              status === s
                ? 'border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-ink)'
                : 'border-(--color-frame) text-(--color-charcoal) hover:border-(--color-stone)'
            }`}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="border border-(--color-frame) bg-(--color-paper) p-10 text-center">
          <Brush className="w-10 h-10 mx-auto mb-4 text-(--color-stone) opacity-50" />
          <p className="text-sm text-(--color-charcoal)">Aucune demande pour le moment.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => {
            const refsCount = c.commission_attachments?.length ?? 0
            const sizeStr =
              c.width_cm && c.height_cm ? `${c.width_cm} × ${c.height_cm} cm` : '—'
            const isUnread = !c.read_at
            const thumbUrl = thumbnails.get(c.id)
            return (
              <li key={c.id}>
                <Link
                  href={`/admin/commissions/${c.id}`}
                  className="group flex items-start gap-3 p-4 bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) transition-colors"
                >
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt=""
                      className={`mt-0.5 w-12 h-12 shrink-0 object-cover border ${
                        isUnread ? 'border-(--color-bronze) ring-2 ring-(--color-bronze)/40' : 'border-(--color-frame)'
                      }`}
                    />
                  ) : (
                    <span
                      className={`mt-0.5 flex w-12 h-12 shrink-0 items-center justify-center bg-(--color-bronze)/12 text-(--color-bronze) border ${
                        isUnread ? 'border-(--color-bronze) ring-2 ring-(--color-bronze)/40' : 'border-(--color-frame)'
                      }`}
                    >
                      <Brush className="w-4 h-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm text-(--color-ink) ${isUnread ? 'font-semibold' : ''}`}
                      >
                        {c.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] border ${
                          STATUS_BADGE[c.status] ?? STATUS_BADGE.nieuw
                        }`}
                      >
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">
                        {c.locale}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-(--color-stone) truncate">{c.email}</p>
                    <p className="mt-1 text-xs text-(--color-charcoal)">
                      {TECHNIQUE_LABEL_FR[c.technique] ?? c.technique} · {sizeStr} ·{' '}
                      {new Date(c.created_at).toLocaleDateString('fr-BE', {
                        dateStyle: 'medium',
                      })}
                      {refsCount > 0 && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="inline-flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            {refsCount}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="mt-2 w-4 h-4 shrink-0 text-(--color-stone) group-hover:text-(--color-bronze)" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
