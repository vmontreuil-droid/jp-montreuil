import { Mail, Phone, Clock, Paperclip, Inbox } from 'lucide-react'
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
  created_at: string
  contact_attachments: Attachment[]
}

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*, contact_attachments(id, filename, storage_path, content_type, size_bytes)')
    .order('created_at', { ascending: false })
    .returns<Message[]>()

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-400">Erreur: {error.message}</p>
      </div>
    )
  }

  const messages = data ?? []
  const unread = messages.filter((m) => !m.read_at).length

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
            {messages.length} total{messages.length > 1 ? 'aux' : ''}{' '}
            {unread > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-(--color-bronze)/15 text-(--color-bronze) text-xs">
                {unread} non lu{unread > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <ComposeButton />
      </header>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-(--color-stone)">
          <Inbox className="w-12 h-12 mb-4 opacity-50" />
          <p>Aucun message pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <MessageRow key={m.id} message={m} />
          ))}
        </div>
      )}
    </div>
  )
}
