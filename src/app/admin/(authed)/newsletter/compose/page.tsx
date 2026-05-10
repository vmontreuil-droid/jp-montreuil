import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { countActiveSubscribers } from '@/lib/newsletter'
import ComposeForm from './ComposeForm'

export const dynamic = 'force-dynamic'

export default async function NewsletterComposePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login?next=/admin/newsletter/compose')

  const counts = await countActiveSubscribers()

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/newsletter" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Newsletter
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Composer</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <Send className="w-6 h-6 text-(--color-bronze)" />
          Composer une newsletter
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-1">
          Sera envoyée aux <strong>{counts.fr}</strong> abonnés FR et <strong>{counts.nl}</strong> abonnés NL actifs.
          Vous pouvez utiliser du HTML simple ({'<p>'}, {'<a>'}, {'<strong>'}, etc.).
        </p>
      </header>

      <ComposeForm counts={counts} />
    </main>
  )
}
