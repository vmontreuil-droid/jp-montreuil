import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Check, Trash2, Globe, User, Server, Cloud } from 'lucide-react'
import { listErrors, type ErrorSource } from '@/lib/error-log'
import { acknowledgeErrorAction, deleteErrorAction } from './actions'

export const dynamic = 'force-dynamic'

const SOURCE_LABELS: Record<ErrorSource, string> = {
  client: 'Browser',
  server: 'Serveur',
  cron: 'Cron',
  webhook: 'Webhook',
}

const SOURCE_ICONS: Record<ErrorSource, React.ElementType> = {
  client: Globe,
  server: Server,
  cron: Cloud,
  webhook: Cloud,
}

const SOURCE_COLORS: Record<ErrorSource, string> = {
  client: 'bg-sky-100 text-sky-900',
  server: 'bg-amber-100 text-amber-900',
  cron: 'bg-violet-100 text-violet-900',
  webhook: 'bg-indigo-100 text-indigo-900',
}

const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium', timeStyle: 'short' })

export default async function ErrorsPage() {
  const errors = await listErrors({ limit: 200 })
  const open = errors.filter((e) => !e.is_acknowledged)
  const acked = errors.filter((e) => e.is_acknowledged)

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-(--color-bronze)" />
          Erreurs
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-1">
          Erreurs serveur, route, webhook et navigateur. Marquez-les vues pour les masquer.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-3">
        <Stat label="À traiter" value={open.length} accent />
        <Stat label="Vues" value={acked.length} />
      </div>

      {open.length > 0 && (
        <Section title={`À traiter (${open.length})`} rows={open} />
      )}
      {acked.length > 0 && (
        <Section title={`Historique (${acked.length})`} rows={acked} muted />
      )}
      {errors.length === 0 && (
        <p className="bg-(--color-paper) border border-(--color-frame) p-12 text-center text-(--color-stone)">
          Aucune erreur enregistrée. 🎉
        </p>
      )}
    </main>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`bg-(--color-paper) border p-5 ${accent && value > 0 ? 'border-amber-300' : 'border-(--color-frame)'}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">{label}</p>
      <p className={`font-[family-name:var(--font-display)] text-3xl ${accent && value > 0 ? 'text-amber-700' : 'text-(--color-ink)'}`}>
        {value}
      </p>
    </div>
  )
}

function Section({ title, rows, muted }: { title: string; rows: Awaited<ReturnType<typeof listErrors>>; muted?: boolean }) {
  return (
    <section className={muted ? 'opacity-70' : ''}>
      <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">{title}</h2>
      <ul className="space-y-2">
        {rows.map((e) => {
          const Icon = SOURCE_ICONS[e.source as ErrorSource] ?? AlertTriangle
          return (
            <li key={e.id} className="bg-(--color-paper) border border-(--color-frame) p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-widest ${SOURCE_COLORS[e.source as ErrorSource] ?? 'bg-(--color-frame)/40'}`}>
                      <Icon className="w-3 h-3" />
                      {SOURCE_LABELS[e.source as ErrorSource] ?? e.source}
                    </span>
                    <span className="text-[11px] text-(--color-stone)">
                      {dateFmt.format(new Date(e.occurred_at))}
                    </span>
                  </div>
                  <p className="text-sm text-(--color-ink) font-mono break-words">{e.message}</p>
                  {e.url && (
                    <p className="text-[11px] text-(--color-stone) mt-1 truncate">
                      <Globe className="w-3 h-3 inline mr-1" />
                      {e.url}
                    </p>
                  )}
                  {e.user_email && (
                    <p className="text-[11px] text-(--color-stone) mt-0.5">
                      <User className="w-3 h-3 inline mr-1" />
                      {e.user_email}
                    </p>
                  )}
                  {e.stack && (
                    <details className="mt-2">
                      <summary className="text-[11px] text-(--color-bronze) cursor-pointer">Stack trace</summary>
                      <pre className="mt-2 text-[10px] text-(--color-charcoal) bg-(--color-canvas) p-3 overflow-x-auto whitespace-pre-wrap">
                        {e.stack}
                      </pre>
                    </details>
                  )}
                  {e.context && (
                    <details className="mt-1">
                      <summary className="text-[11px] text-(--color-bronze) cursor-pointer">Context</summary>
                      <pre className="mt-2 text-[10px] text-(--color-charcoal) bg-(--color-canvas) p-3 overflow-x-auto">
                        {JSON.stringify(e.context, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {!e.is_acknowledged && (
                    <form action={acknowledgeErrorAction.bind(null, e.id)}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 text-[10px] uppercase tracking-widest"
                      >
                        <Check className="w-3 h-3" /> Vu
                      </button>
                    </form>
                  )}
                  <form action={deleteErrorAction.bind(null, e.id)}>
                    <button
                      type="submit"
                      aria-label="Supprimer"
                      className="inline-flex items-center justify-center p-1.5 text-(--color-stone) hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
