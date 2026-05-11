import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Mail, Users, Send, ArrowRight, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { countActiveSubscribers, listIssues } from '@/lib/newsletter'

export const dynamic = 'force-dynamic'

export default async function NewsletterDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login?next=/admin/newsletter')

  const [counts, issues] = await Promise.all([
    countActiveSubscribers(),
    listIssues(),
  ])

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <Mail className="w-6 h-6 text-(--color-bronze)" />
          Newsletter
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-1">
          Newsletters bilingues vers les abonnés actifs (FR + NL).
        </p>
      </header>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard label="Abonnés FR" value={counts.fr} />
        <StatCard label="Abonnés NL" value={counts.nl} />
        <StatCard label="Total actifs" value={counts.total} />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/newsletter/compose"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em]"
        >
          <Send className="w-4 h-4" />
          Composer une newsletter
        </Link>
        <Link
          href="/admin/newsletter/subscribers"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) text-(--color-charcoal) hover:text-(--color-bronze) text-xs uppercase tracking-[0.2em]"
        >
          <Users className="w-4 h-4" />
          Voir les abonnés
        </Link>
      </div>

      {/* Recent issues */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
          Newsletters envoyées
        </h2>
        {issues.length === 0 ? (
          <p className="bg-(--color-paper) border border-(--color-frame) p-6 text-sm text-(--color-stone) italic">
            Aucune newsletter envoyée pour le moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/admin/newsletter/issues/${issue.id}`}
                  className="block bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-[family-name:var(--font-display)] text-lg text-(--color-ink) leading-snug truncate">
                        {issue.subject_fr}
                      </p>
                      <p className="text-xs text-(--color-stone) mt-1">
                        <span className="text-(--color-charcoal)">NL :</span> {issue.subject_nl}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-(--color-stone) inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(issue.sent_at).toLocaleDateString('fr-BE', { dateStyle: 'medium' })}
                      </p>
                      <p className="text-xs text-(--color-charcoal) mt-1">
                        FR {issue.recipients_fr} · NL {issue.recipients_nl}
                        {issue.errors > 0 && <span className="text-amber-700"> · {issue.errors} err</span>}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-(--color-bronze)">
                    Voir détails
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-(--color-paper) border border-(--color-frame) p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink)">{value}</p>
    </div>
  )
}
