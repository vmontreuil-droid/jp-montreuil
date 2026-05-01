import Link from 'next/link'
import { FolderTree, Image as ImageIcon, Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [{ count: categoriesCount }, { count: worksCount }, { count: messagesCount }, { count: unreadCount }] = await Promise.all([
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('works').select('*', { count: 'exact', head: true }),
    supabase.from('contact_messages').select('*', { count: 'exact', head: true }),
    supabase.from('contact_messages').select('*', { count: 'exact', head: true }).is('read_at', null),
  ])

  const cards = [
    {
      href: '/admin/categories',
      label: 'Catégories',
      value: categoriesCount ?? 0,
      icon: FolderTree,
    },
    {
      href: '/admin/works',
      label: 'Œuvres',
      value: worksCount ?? 0,
      icon: ImageIcon,
    },
    {
      href: '/admin/messages',
      label: 'Messages',
      value: messagesCount ?? 0,
      hint: unreadCount ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}` : undefined,
      icon: Inbox,
    },
  ]

  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Tableau de bord
        </h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.href}
              href={c.href}
              className="block p-6 bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
                  {c.label}
                </span>
                <Icon className="w-5 h-5 text-(--color-bronze)" />
              </div>
              <p className="text-3xl font-[family-name:var(--font-display)] text-(--color-ink)">
                {c.value}
              </p>
              {c.hint && (
                <p className="mt-1 text-xs text-(--color-bronze)">{c.hint}</p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
