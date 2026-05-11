import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getIssue } from '@/lib/newsletter'

export const dynamic = 'force-dynamic'

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const { id } = await params
  const issue = await getIssue(id)
  if (!issue) notFound()

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/newsletter" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Newsletter
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Détail</span>
      </div>

      <header>
        <p className="text-xs text-(--color-stone) inline-flex items-center gap-1.5 mb-2">
          <Clock className="w-3 h-3" />
          Envoyée le {new Date(issue.sent_at).toLocaleString('fr-BE', { dateStyle: 'long', timeStyle: 'short' })}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-charcoal)">
          {issue.recipients_fr} envois FR · {issue.recipients_nl} envois NL
          {issue.errors > 0 && <span className="text-amber-700"> · {issue.errors} erreur{issue.errors !== 1 ? 's' : ''}</span>}
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-4">
        <IssueColumn lang="FR" subject={issue.subject_fr} body={issue.body_fr} />
        <IssueColumn lang="NL" subject={issue.subject_nl} body={issue.body_nl} />
      </section>
    </main>
  )
}

function IssueColumn({ lang, subject, body }: { lang: string; subject: string; body: string }) {
  return (
    <div className="bg-(--color-paper) border border-(--color-frame) p-5">
      <p className="text-[10px] uppercase tracking-widest text-(--color-bronze) mb-2">{lang}</p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) mb-4 leading-snug">
        {subject}
      </h2>
      {/* eslint-disable-next-line react/no-danger */}
      <div
        className="text-sm text-(--color-charcoal) leading-relaxed prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  )
}
