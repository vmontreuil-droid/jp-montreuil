import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Users, Download, Trash2, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listSubscribers } from '@/lib/newsletter'
import { deleteSubscriber } from '../actions'

export const dynamic = 'force-dynamic'

export default async function SubscribersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login?next=/admin/newsletter/subscribers')

  const subscribers = await listSubscribers()
  const active = subscribers.filter((s) => !s.unsubscribed_at)
  const unsubscribed = subscribers.filter((s) => s.unsubscribed_at)

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/newsletter" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Newsletter
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Abonnés</span>
      </div>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
            <Users className="w-6 h-6 text-(--color-bronze)" />
            Abonnés
          </h1>
          <p className="text-sm text-(--color-charcoal)">
            {active.length} actif{active.length !== 1 ? 's' : ''}
            {unsubscribed.length > 0 && ` · ${unsubscribed.length} désabonné${unsubscribed.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {active.length > 0 && (
          <a
            href="/api/admin/newsletter-csv"
            download
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) text-(--color-charcoal) hover:text-(--color-bronze) text-xs uppercase tracking-[0.2em]"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        )}
      </header>

      {subscribers.length === 0 ? (
        <p className="bg-(--color-paper) border border-(--color-frame) p-12 text-center text-(--color-stone)">
          Aucun abonné pour le moment.
        </p>
      ) : (
        <div className="bg-(--color-paper) border border-(--color-frame) overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-(--color-frame) bg-(--color-canvas)/40">
              <tr className="text-left text-xs text-(--color-stone) uppercase tracking-widest">
                <th className="p-3">Email</th>
                <th className="p-3 w-20">Langue</th>
                <th className="p-3 w-40">Inscrit le</th>
                <th className="p-3 w-40">Désabonné le</th>
                <th className="p-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-b border-(--color-frame)/60">
                  <td className="p-3">
                    <a href={`mailto:${s.email}`} className="text-(--color-ink) hover:text-(--color-bronze) inline-flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      {s.email}
                    </a>
                  </td>
                  <td className="p-3 text-xs uppercase tracking-widest text-(--color-charcoal)">{s.locale}</td>
                  <td className="p-3 text-xs text-(--color-stone)">
                    {new Date(s.subscribed_at).toLocaleDateString('fr-BE')}
                  </td>
                  <td className="p-3 text-xs text-(--color-stone)">
                    {s.unsubscribed_at ? new Date(s.unsubscribed_at).toLocaleDateString('fr-BE') : '—'}
                  </td>
                  <td className="p-3 text-right">
                    <form action={deleteSubscriber.bind(null, s.id)}>
                      <button
                        type="submit"
                        aria-label={`Supprimer ${s.email}`}
                        title="Supprimer définitivement"
                        className="p-1.5 text-(--color-stone) hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
