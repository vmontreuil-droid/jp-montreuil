import { Shield, Mail, Trash2, Download, Edit, AlertCircle } from 'lucide-react'
import { listGdprRequests, type GdprRequestType, type GdprRequestStatus } from '@/lib/gdpr'
import { setStatusAction, eraseCustomerAction } from './actions'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<GdprRequestType, string> = {
  export: 'Export des données',
  delete: 'Suppression',
  rectification: 'Rectification',
}
const TYPE_ICONS: Record<GdprRequestType, React.ElementType> = {
  export: Download,
  delete: Trash2,
  rectification: Edit,
}
const STATUS_LABELS: Record<GdprRequestStatus, string> = {
  received: 'Reçu',
  in_progress: 'En cours',
  completed: 'Terminé',
  rejected: 'Refusé',
}
const STATUS_COLORS: Record<GdprRequestStatus, string> = {
  received: 'bg-amber-100 text-amber-900',
  in_progress: 'bg-sky-100 text-sky-900',
  completed: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-(--color-frame)/40 text-(--color-stone)',
}
const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium', timeStyle: 'short' })

export default async function GdprPage() {
  const requests = await listGdprRequests()

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <Shield className="w-6 h-6 text-(--color-bronze)" />
          RGPD
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-1">
          Demandes d&apos;export ou de suppression de données. La suppression
          anonymise les commandes (audit) et efface messages, abonnement
          newsletter et profil client.
        </p>
      </header>

      {/* Manuele wisser-tool */}
      <section className="bg-(--color-paper) border border-(--color-frame) p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3 inline-flex items-center gap-2">
          <Trash2 className="w-3.5 h-3.5 text-(--color-bronze)" />
          Effacer toutes les données pour un email
        </h2>
        <p className="text-xs text-(--color-stone) mb-3">
          Anonymise les commandes (NE supprime pas), efface messages contact,
          désabonne de la newsletter, supprime le profil shop et anonymise les
          avis.
        </p>
        <form action={eraseCustomerAction} className="flex gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder="email@…"
            className="flex-1 px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-sm focus:border-(--color-bronze) focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-700 text-white hover:bg-red-800 text-xs uppercase tracking-widest"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Effacer
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
          Demandes ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <p className="bg-(--color-paper) border border-(--color-frame) p-12 text-center text-(--color-stone)">
            Aucune demande pour le moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => {
              const TypeIcon = TYPE_ICONS[r.request_type as GdprRequestType] ?? Download
              return (
                <li key={r.id} className="bg-(--color-paper) border border-(--color-frame) p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-(--color-bronze)">
                          <TypeIcon className="w-3 h-3" />
                          {TYPE_LABELS[r.request_type as GdprRequestType] ?? r.request_type}
                        </span>
                        <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest ${STATUS_COLORS[r.status]}`}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </div>
                      {r.full_name && <p className="text-sm text-(--color-ink) font-medium">{r.full_name}</p>}
                      <a href={`mailto:${r.email}`} className="text-xs text-(--color-bronze) inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {r.email}
                      </a>
                      <p className="text-[11px] text-(--color-stone) mt-1">
                        {dateFmt.format(new Date(r.created_at))}
                      </p>
                      {r.message && (
                        <p className="text-sm text-(--color-charcoal) mt-2 italic">{r.message}</p>
                      )}
                      {r.notes && (
                        <p className="text-xs text-(--color-charcoal) mt-2 px-3 py-1.5 bg-(--color-canvas)/50 border-l-2 border-(--color-bronze)">
                          {r.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {(['received', 'in_progress', 'completed', 'rejected'] as GdprRequestStatus[])
                        .filter((s) => s !== r.status)
                        .map((s) => (
                          <form key={s} action={setStatusAction.bind(null, r.id, s)}>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] uppercase tracking-widest text-(--color-charcoal) hover:text-(--color-ink) hover:bg-(--color-canvas)/50"
                            >
                              → {STATUS_LABELS[s]}
                            </button>
                          </form>
                        ))}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
