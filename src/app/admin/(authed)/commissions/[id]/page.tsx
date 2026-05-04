import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Mail, Phone, Trash2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  markRead,
  updateCommissionStatus,
  saveCommissionNotes,
  deleteCommission,
} from '../actions'

export const dynamic = 'force-dynamic'

const STORAGE_BUCKET = 'commission-references'
const SIGNED_URL_TTL = 60 * 60

const STATUSES = ['nieuw', 'in_behandeling', 'devis_envoye', 'accepte', 'refuse', 'complete'] as const
type StatusKey = typeof STATUSES[number]

const STATUS_LABEL_FR: Record<StatusKey, string> = {
  nieuw: 'Nouvelle',
  in_behandeling: 'En cours',
  devis_envoye: 'Devis envoyé',
  accepte: 'Acceptée',
  refuse: 'Refusée',
  complete: 'Terminée',
}

const TECHNIQUE_LABEL_FR: Record<string, string> = {
  crayon_nb: 'Crayon noir & blanc',
  aquarelle_couleur: 'Aquarelle couleur',
  acrylique_toile: 'Acrylique sur toile',
  autre: 'À discuter',
}

const SUPPORT_LABEL_FR: Record<string, string> = {
  papier_aquarelle: 'Papier aquarelle',
  toile_lin: 'Toile de lin',
  peu_importe: 'Peu importe',
}

const FRAMING_LABEL_FR: Record<string, string> = {
  oui: 'Oui',
  non: 'Non',
  peu_importe: 'Peu importe',
}

type Props = {
  params: Promise<{ id: string }>
}

type Attachment = {
  id: string
  storage_path: string
  filename: string
  content_type: string | null
  size_bytes: number | null
}

type CommissionRow = {
  id: string
  name: string
  email: string
  phone: string | null
  locale: string
  technique: string
  support: string | null
  width_cm: number | null
  height_cm: number | null
  framing: string | null
  budget_indication: string | null
  message: string
  status: StatusKey
  admin_notes: string | null
  ip: string | null
  user_agent: string | null
  read_at: string | null
  created_at: string
  commission_attachments: Attachment[]
}

export default async function CommissionDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: req, error } = await supabase
    .from('commission_requests')
    .select('*, commission_attachments(id, storage_path, filename, content_type, size_bytes)')
    .eq('id', id)
    .single<CommissionRow>()

  if (error || !req) notFound()

  // Mark as read on first view
  if (!req.read_at) {
    await markRead(id)
  }

  const admin = createAdminClient()

  const signed = await Promise.all(
    (req.commission_attachments ?? []).map(async (a) => {
      const { data } = await admin.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(a.storage_path, SIGNED_URL_TTL)
      return { ...a, url: data?.signedUrl ?? null }
    })
  )

  const sizeStr = req.width_cm && req.height_cm ? `${req.width_cm} × ${req.height_cm} cm` : '—'
  const submittedAt = new Date(req.created_at).toLocaleString('fr-BE', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <div className="mb-6">
        <Link
          href="/admin/commissions"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
      </div>

      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
            Atelier Montreuil
          </p>
          <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
            {req.name}
          </h1>
          <p className="mt-2 text-sm text-(--color-stone)">{submittedAt}</p>
        </div>
        <span className="px-3 py-1 text-xs uppercase tracking-[0.15em] border border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-ink)">
          {STATUS_LABEL_FR[req.status] ?? req.status}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Contact */}
          <section className="border border-(--color-frame) bg-(--color-paper) p-6">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
              Contact
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3 text-(--color-charcoal)">
                <User className="w-4 h-4 text-(--color-bronze)" />
                {req.name}
                <span className="ml-auto text-xs text-(--color-stone)">Locale: {req.locale}</span>
              </li>
              <li className="flex items-center gap-3 text-(--color-charcoal)">
                <Mail className="w-4 h-4 text-(--color-bronze)" />
                <a href={`mailto:${req.email}`} className="hover:text-(--color-bronze)">
                  {req.email}
                </a>
              </li>
              {req.phone && (
                <li className="flex items-center gap-3 text-(--color-charcoal)">
                  <Phone className="w-4 h-4 text-(--color-bronze)" />
                  <a
                    href={`tel:${req.phone.replace(/\s/g, '')}`}
                    className="hover:text-(--color-bronze)"
                  >
                    {req.phone}
                  </a>
                </li>
              )}
            </ul>
          </section>

          {/* Détails */}
          <section className="border border-(--color-frame) bg-(--color-paper) p-6">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
              Détails
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                  Technique
                </dt>
                <dd className="text-(--color-ink)">
                  {TECHNIQUE_LABEL_FR[req.technique] ?? req.technique}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                  Format
                </dt>
                <dd className="text-(--color-ink)">{sizeStr}</dd>
              </div>
              {req.support && (
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                    Support
                  </dt>
                  <dd className="text-(--color-ink)">
                    {SUPPORT_LABEL_FR[req.support] ?? req.support}
                  </dd>
                </div>
              )}
              {req.framing && (
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                    Encadrement
                  </dt>
                  <dd className="text-(--color-ink)">
                    {FRAMING_LABEL_FR[req.framing] ?? req.framing}
                  </dd>
                </div>
              )}
              {req.budget_indication && (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                    Budget indicatif
                  </dt>
                  <dd className="text-(--color-ink)">{req.budget_indication}</dd>
                </div>
              )}
            </dl>

            <div className="mt-5">
              <h3 className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-2">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm text-(--color-charcoal) leading-relaxed bg-(--color-canvas) border border-(--color-frame) p-4">
                {req.message}
              </p>
            </div>
          </section>

          {/* References */}
          {signed.length > 0 && (
            <section className="border border-(--color-frame) bg-(--color-paper) p-6">
              <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
                Photos de référence ({signed.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {signed.map((a) => (
                  <a
                    key={a.id}
                    href={a.url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden border border-(--color-frame) bg-(--color-canvas)"
                  >
                    {a.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.url}
                        alt={a.filename}
                        className="aspect-square w-full object-cover hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="aspect-square w-full" />
                    )}
                    <p className="text-[10px] text-(--color-stone) truncate px-2 py-1.5">
                      {a.filename}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          <section className="border border-(--color-frame) bg-(--color-paper) p-6">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
              Notes internes
            </h2>
            <form action={saveCommissionNotes} className="space-y-3">
              <input type="hidden" name="id" value={req.id} />
              <textarea
                name="admin_notes"
                rows={4}
                defaultValue={req.admin_notes || ''}
                placeholder="Notes pour vous-même — non visibles pour le client."
                className="w-full px-4 py-3 input-elev bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) text-sm resize-y"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs uppercase tracking-[0.2em] bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark)"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="border border-(--color-frame) bg-(--color-paper) p-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
              Statut
            </h2>
            <form action={updateCommissionStatus} className="space-y-3">
              <input type="hidden" name="id" value={req.id} />
              <select
                name="status"
                defaultValue={req.status}
                className="w-full px-3 py-2 input-elev bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL_FR[s]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full px-3 py-2 text-xs uppercase tracking-[0.2em] bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark)"
              >
                Mettre à jour
              </button>
            </form>
          </section>

          <section className="border border-red-500/20 bg-red-500/5 p-5">
            <form action={deleteCommission}>
              <input type="hidden" name="id" value={req.id} />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.2em] border border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300 hover:bg-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  )
}
