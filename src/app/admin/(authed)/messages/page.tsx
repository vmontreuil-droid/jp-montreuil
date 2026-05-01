import Link from 'next/link'
import { Inbox, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import MessageRow from './MessageRow'
import ComposeButton from './ComposeButton'

export const dynamic = 'force-dynamic'

type Attachment = {
  id: string
  filename: string
  storage_path: string
  content_type: string | null
  size_bytes: number | null
}

type Message = {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  locale: string | null
  ip: string | null
  user_agent: string | null
  read_at: string | null
  archived_at: string | null
  deleted_at: string | null
  created_at: string
  contact_attachments: Attachment[]
}

type Props = {
  searchParams: Promise<{ view?: string }>
}

export default async function MessagesPage({ searchParams }: Props) {
  const { view } = await searchParams
  const isTrash = view === 'trash'

  const supabase = await createClient()
  const query = supabase
    .from('contact_messages')
    .select('*, contact_attachments(id, filename, storage_path, content_type, size_bytes)')
    .order('created_at', { ascending: false })

  const { data: allData, error } = await query.returns<Message[]>()

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-400">Erreur: {error.message}</p>
      </div>
    )
  }

  const all = allData ?? []
  const active = all.filter((m) => !m.deleted_at)
  const trashed = all.filter((m) => !!m.deleted_at)
  const unread = active.filter((m) => !m.read_at).length

  const visible = isTrash ? trashed : active

  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <header className="mb-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
            Atelier Montreuil
          </p>
          <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
            Messages
          </h1>
          <p className="mt-2 text-sm text-(--color-stone)">
            {active.length} actif{active.length === 1 ? '' : 's'}
            {unread > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-(--color-bronze)/15 text-(--color-bronze) text-xs">
                {unread} non lu{unread > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <ComposeButton />
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-(--color-frame) mb-6">
        <Link
          href="/admin/messages"
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm uppercase tracking-[0.15em] border-b-2 -mb-px transition-colors ${
            !isTrash
              ? 'border-(--color-bronze) text-(--color-ink)'
              : 'border-transparent text-(--color-stone) hover:text-(--color-charcoal)'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Actifs
          <span className="text-xs opacity-70">{active.length}</span>
        </Link>
        <Link
          href="/admin/messages?view=trash"
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm uppercase tracking-[0.15em] border-b-2 -mb-px transition-colors ${
            isTrash
              ? 'border-(--color-bronze) text-(--color-ink)'
              : 'border-transparent text-(--color-stone) hover:text-(--color-charcoal)'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          Corbeille
          <span className="text-xs opacity-70">{trashed.length}</span>
        </Link>
      </nav>

      {isTrash && (
        <div className="mb-4 p-3 bg-(--color-paper) border border-(--color-frame) text-xs text-(--color-stone)">
          Les messages supprimés sont conservés pendant <strong className="text-(--color-bronze)">30 jours</strong> avant suppression définitive automatique.
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-(--color-stone)">
          {isTrash ? (
            <>
              <Trash2 className="w-12 h-12 mb-4 opacity-50" />
              <p>Corbeille vide.</p>
            </>
          ) : (
            <>
              <Inbox className="w-12 h-12 mb-4 opacity-50" />
              <p>Aucun message pour l&apos;instant.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((m) => (
            <MessageRow key={m.id} message={m} isTrash={isTrash} />
          ))}
        </div>
      )}
    </div>
  )
}
