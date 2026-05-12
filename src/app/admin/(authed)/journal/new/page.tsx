import Link from 'next/link'
import { ArrowLeft, Sparkles, Edit3 } from 'lucide-react'
import { createPostActionAndRedirect } from '../actions'
import NewPostForm from './NewPostForm'

export const dynamic = 'force-dynamic'

export default function NewJournalPostPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/journal" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Journal
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Nouvel article</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink)">
          Nouvel article
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-1">
          Choisissez de partir d&apos;un draft IA ou d&apos;une page blanche.
        </p>
      </header>

      <NewPostForm action={createPostActionAndRedirect} />
    </main>
  )
}
