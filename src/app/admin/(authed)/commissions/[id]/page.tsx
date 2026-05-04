import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Mail,
  Phone,
  Trash2,
  User,
  CheckCircle2,
  Wallet,
  Truck,
  Hammer,
  Flag,
  Ban,
  Copy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ATELIER,
  formatEur,
  priceBreakdown,
  FORMATS,
  type FrameType,
  type PriceLineItem,
} from '@/lib/atelier-config'
import { loadPricing } from '@/lib/commission-pricing'
import { localePath } from '@/lib/links'

const SUPPLEMENT_LABEL_FR: Record<string, string> = {
  background: 'Arrière-plan travaillé',
  complex_decor: 'Décor complexe',
  high_detail: 'Niveau de détail élevé',
  hyperrealism: 'Hyper-réalisme',
  rush: 'Délai express',
}

const FORMAT_LABEL_FR: Record<string, string> = {
  '40x60': '40 × 60 cm',
  '57x77': '57 × 77 cm',
  '60x90': '60 × 90 cm',
  '130x160': '130 × 160 cm',
  custom: 'Format sur mesure',
}

function detectFormatId(width: number | null, height: number | null): string {
  if (!width || !height) return 'custom'
  for (const f of FORMATS) {
    if (f.width === width && f.height === height) return f.id
  }
  return 'custom'
}

function formatLineLabel(line: PriceLineItem): string {
  if (line.key.startsWith('format:')) {
    const id = line.key.split(':')[1]
    return FORMAT_LABEL_FR[id] || id
  }
  if (line.key.startsWith('frame:')) {
    const id = line.key.split(':')[1]
    return FRAME_TYPE_LABEL_FR[id] || id
  }
  if (line.key === 'extra_portraits') {
    const n = line.qty ?? 0
    return `${n} portrait${n > 1 ? 's' : ''} supplémentaire${n > 1 ? 's' : ''}`
  }
  if (line.key.startsWith('supplement:')) {
    const id = line.key.split(':')[1]
    return SUPPLEMENT_LABEL_FR[id] || id
  }
  return line.key
}
import {
  markRead,
  updateCommissionStatus,
  saveCommissionNotes,
  deleteCommission,
  markAcompteReceived,
  markInProgress,
  markDelivered,
  markComplete,
  markRefused,
} from '../actions'
import DevisComposeForm from './DevisComposeForm'
import MessageWithTranslate from './MessageWithTranslate'

export const dynamic = 'force-dynamic'

const STORAGE_BUCKET = 'commission-references'
const SIGNED_URL_TTL = 60 * 60

const STATUSES = [
  'nieuw',
  'in_behandeling',
  'devis_envoye',
  'signe',
  'refuse',
  'acompte_recu',
  'en_cours',
  'livre',
  'complete',
] as const
type StatusKey = (typeof STATUSES)[number]

const STATUS_LABEL_FR: Record<StatusKey, string> = {
  nieuw: 'Reçue',
  in_behandeling: 'En traitement',
  devis_envoye: 'Devis envoyé',
  signe: 'Devis signé',
  refuse: 'Refusée',
  acompte_recu: 'Acompte reçu',
  en_cours: 'En cours',
  livre: 'Livrée',
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

const FRAME_TYPE_LABEL_FR: Record<string, string> = {
  aucun: 'Sans cadre',
  simple: 'Cadre simple',
  standard: 'Cadre standard',
  travaille: 'Cadre travaillé',
  sur_mesure: 'Cadre sur mesure',
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

type DevisLine = { description: string; quantity: number; unit_price: number }

type CommissionRow = {
  id: string
  name: string
  email: string
  phone: string | null
  locale: 'fr' | 'nl'
  technique: string
  support: string | null
  width_cm: number | null
  height_cm: number | null
  framing: string | null
  frame_type: string | null
  budget_indication: string | null
  portrait_count: number | null
  supplements: string[] | null
  message: string
  status: StatusKey
  admin_notes: string | null
  read_at: string | null
  created_at: string

  devis_subject: string | null
  devis_intro: string | null
  devis_lines: DevisLine[]
  devis_total_eur: number | null
  devis_acompte_pct: number | null
  devis_acompte_eur: number | null
  devis_valid_until: string | null
  devis_payment_reference: string | null
  devis_sent_at: string | null

  signature_token: string | null
  signature_data: string | null
  signer_name: string | null
  signed_at: string | null

  acompte_received_at: string | null
  in_progress_at: string | null
  delivered_at: string | null
  completed_at: string | null
  refused_at: string | null

  commission_attachments: Attachment[]
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleString('fr-BE', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

export default async function CommissionDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: req, error } = await supabase
    .from('commission_requests')
    .select(
      '*, commission_attachments(id, storage_path, filename, content_type, size_bytes)'
    )
    .eq('id', id)
    .single<CommissionRow>()

  if (error || !req) notFound()

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
  const submittedAt = formatDateTime(req.created_at)
  const isDevisSent = !!req.devis_sent_at
  const isSigned = !!req.signed_at

  // Live prijsschatting met huidige tarieven
  const pricing = await loadPricing()
  const formatId = detectFormatId(req.width_cm, req.height_cm)
  const breakdown = priceBreakdown({
    formatId,
    frameType: (req.frame_type as FrameType | null) ?? 'aucun',
    portraitCount: req.portrait_count ?? 1,
    supplements: req.supplements ?? [],
    pricing,
  })

  const devisLines = (req.devis_lines ?? []) as DevisLine[]
  const signUrl = req.signature_token
    ? localePath(req.locale, `/devis-signature/${req.signature_token}`)
    : null

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
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">Contact</h2>
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
                  <a href={`tel:${req.phone.replace(/\s/g, '')}`} className="hover:text-(--color-bronze)">
                    {req.phone}
                  </a>
                </li>
              )}
            </ul>
          </section>

          {/* Demande initiale */}
          <section className="border border-(--color-frame) bg-(--color-paper) p-6">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
              Demande initiale
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
              {(req.frame_type || req.framing) && (
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                    Encadrement
                  </dt>
                  <dd className="text-(--color-ink)">
                    {req.frame_type
                      ? FRAME_TYPE_LABEL_FR[req.frame_type] ?? req.frame_type
                      : FRAMING_LABEL_FR[req.framing!] ?? req.framing}
                  </dd>
                </div>
              )}
              {req.portrait_count != null && req.portrait_count > 0 && (
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                    Nb de portraits
                  </dt>
                  <dd className="text-(--color-ink)">{req.portrait_count}</dd>
                </div>
              )}
              {req.supplements && req.supplements.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                    Suppléments
                  </dt>
                  <dd className="text-(--color-ink)">
                    {req.supplements
                      .map(
                        (s) =>
                          ({
                            background: 'Arrière-plan travaillé',
                            complex_decor: 'Décor complexe',
                            high_detail: 'Niveau de détail élevé',
                            hyperrealism: 'Hyper-réalisme',
                            rush: 'Délai express',
                          }[s] ?? s)
                      )
                      .join(' · ')}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-5">
              <MessageWithTranslate text={req.message} />
            </div>
          </section>

          {/* Prix indicatif */}
          {breakdown.lines.length > 0 && (
            <section className="border border-(--color-bronze)/40 bg-(--color-bronze)/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
                  Prix indicatif (tarifs actuels)
                </h2>
                <Link
                  href="/admin/commissions/pricing"
                  className="text-[10px] uppercase tracking-[0.15em] text-(--color-bronze) hover:text-(--color-bronze-dark)"
                >
                  Modifier les tarifs →
                </Link>
              </div>
              <ul className="space-y-1.5 text-sm">
                {breakdown.lines.map((line) => (
                  <li
                    key={line.key}
                    className="flex items-baseline justify-between gap-3 border-b border-(--color-bronze)/15 pb-1.5"
                  >
                    <span className="text-(--color-charcoal)">{formatLineLabel(line)}</span>
                    <span className="text-(--color-ink) tabular-nums whitespace-nowrap">
                      {line.onRequest ? 'Sur devis' : formatEur(line.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between gap-3 pt-3 mt-2 border-t-2 border-(--color-bronze)/40">
                <span className="text-sm uppercase tracking-[0.15em] text-(--color-stone)">
                  Total
                </span>
                <span className="text-2xl font-[family-name:var(--font-display)] text-(--color-ink)">
                  {breakdown.total == null ? 'Sur devis' : formatEur(breakdown.total)}
                </span>
              </div>
              <p className="mt-3 text-xs text-(--color-stone)">
                Calcul d’après les tarifs actuels et les choix du client.
                Le prix final reste celui que vous indiquez dans le devis.
              </p>
            </section>
          )}

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

          {/* Devis */}
          <section className="border border-(--color-frame) bg-(--color-paper) p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">Devis</h2>
              {isDevisSent && signUrl && (
                <Link
                  href={signUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs uppercase tracking-[0.15em] text-(--color-bronze) hover:text-(--color-bronze-dark)"
                >
                  Page client →
                </Link>
              )}
            </div>

            {!isDevisSent ? (
              <DevisComposeForm
                id={req.id}
                defaultSubject={req.devis_subject || ''}
                defaultIntro={req.devis_intro || ''}
                defaultAcomptePct={req.devis_acompte_pct ?? ATELIER.defaultAcomptePct}
                initialLines={
                  devisLines.length > 0
                    ? devisLines.map((l, i) => ({
                        id: i + 1,
                        description: l.description,
                        quantity: l.quantity,
                        unitPrice: l.unit_price,
                      }))
                    : undefined
                }
              />
            ) : (
              <div className="space-y-4 text-sm">
                <h3 className="text-base text-(--color-ink) font-[family-name:var(--font-display)]">
                  {req.devis_subject}
                </h3>
                {req.devis_intro && (
                  <p className="text-(--color-charcoal) whitespace-pre-wrap leading-relaxed">
                    {req.devis_intro}
                  </p>
                )}
                <div className="space-y-1.5">
                  {devisLines.map((l, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-3 py-1.5 border-b border-(--color-frame)/50"
                    >
                      <span className="text-(--color-ink) flex-1">
                        {l.description}{' '}
                        <span className="text-(--color-stone) text-xs">× {l.quantity}</span>
                      </span>
                      <span className="text-(--color-ink) whitespace-nowrap">
                        {formatEur(l.quantity * l.unit_price)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-(--color-canvas) border border-(--color-frame) px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-(--color-charcoal)">Total</span>
                    <span className="text-(--color-ink) font-semibold">
                      {formatEur(req.devis_total_eur ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-(--color-stone) text-xs">
                      Acompte ({req.devis_acompte_pct ?? 50}%)
                    </span>
                    <span className="text-(--color-bronze) font-semibold">
                      {formatEur(req.devis_acompte_eur ?? 0)}
                    </span>
                  </div>
                </div>

                {req.devis_payment_reference && (
                  <div className="text-xs text-(--color-stone) inline-flex items-center gap-1.5">
                    <Copy className="w-3 h-3" />
                    Communication : <span className="text-(--color-ink)">{req.devis_payment_reference}</span>
                  </div>
                )}

                {/* Signature */}
                {isSigned && (
                  <div className="border border-(--color-frame) bg-(--color-canvas) p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs uppercase tracking-[0.15em] text-(--color-stone)">
                        Signé par {req.signer_name} · {formatDateTime(req.signed_at)}
                      </span>
                    </div>
                    {req.signature_data && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={req.signature_data}
                        alt="Signature"
                        className="max-h-28 bg-white border border-(--color-frame)"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

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
          {/* Timeline */}
          <section className="border border-(--color-frame) bg-(--color-paper) p-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
              Suivi
            </h2>
            <ul className="space-y-2 text-xs">
              <TimelineRow label="Demande reçue" value={formatDateTime(req.created_at)} active />
              <TimelineRow label="Devis envoyé" value={formatDateTime(req.devis_sent_at)} active={!!req.devis_sent_at} />
              <TimelineRow label="Signé" value={formatDateTime(req.signed_at)} active={!!req.signed_at} />
              <TimelineRow
                label="Acompte reçu"
                value={formatDateTime(req.acompte_received_at)}
                active={!!req.acompte_received_at}
              />
              <TimelineRow label="En cours" value={formatDateTime(req.in_progress_at)} active={!!req.in_progress_at} />
              <TimelineRow label="Livrée" value={formatDateTime(req.delivered_at)} active={!!req.delivered_at} />
              <TimelineRow label="Terminée" value={formatDateTime(req.completed_at)} active={!!req.completed_at} />
            </ul>
          </section>

          {/* Quick actions */}
          {isSigned && req.status !== 'complete' && req.status !== 'refuse' && (
            <section className="border border-(--color-frame) bg-(--color-paper) p-5 space-y-2">
              <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
                Actions rapides
              </h2>
              {!req.acompte_received_at && (
                <ActionButton id={req.id} action={markAcompteReceived} icon={<Wallet className="w-3.5 h-3.5" />} label="Acompte reçu" />
              )}
              {req.acompte_received_at && !req.in_progress_at && (
                <ActionButton id={req.id} action={markInProgress} icon={<Hammer className="w-3.5 h-3.5" />} label="Marquer en cours" />
              )}
              {req.in_progress_at && !req.delivered_at && (
                <ActionButton id={req.id} action={markDelivered} icon={<Truck className="w-3.5 h-3.5" />} label="Œuvre livrée" />
              )}
              {req.delivered_at && !req.completed_at && (
                <ActionButton id={req.id} action={markComplete} icon={<Flag className="w-3.5 h-3.5" />} label="Solde reçu — clôturer" />
              )}
            </section>
          )}

          {!isSigned && isDevisSent && req.status !== 'refuse' && (
            <section className="border border-(--color-frame) bg-(--color-paper) p-5 space-y-2">
              <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
                En attente de signature
              </h2>
              <p className="text-xs text-(--color-stone) leading-relaxed">
                Le client a reçu le devis avec un lien personnel. Si le client a refusé verbalement, vous pouvez marquer ci-dessous.
              </p>
              <ActionButton id={req.id} action={markRefused} icon={<Ban className="w-3.5 h-3.5" />} label="Marquer refusé" variant="muted" />
            </section>
          )}

          {/* Manuele status — fallback voor uitzonderingen */}
          <section className="border border-(--color-frame) bg-(--color-paper) p-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
              Statut (manuel)
            </h2>
            <form action={updateCommissionStatus} className="space-y-2">
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
                className="w-full px-3 py-2 text-xs uppercase tracking-[0.2em] border border-(--color-frame) text-(--color-charcoal) hover:bg-(--color-canvas)"
              >
                Forcer le statut
              </button>
            </form>
          </section>

          {/* Atelier-info reminder */}
          <section className="border border-(--color-frame) bg-(--color-canvas) p-5 text-xs space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">
              Coordonnées de virement
            </p>
            <p className="text-(--color-ink)">{ATELIER.ibanHolder}</p>
            <p className="text-(--color-ink) font-mono">{ATELIER.iban}</p>
          </section>

          {/* Delete */}
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

function TimelineRow({ label, value, active }: { label: string; value: string | null; active: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={`mt-1 inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
          active ? 'bg-(--color-bronze)' : 'bg-(--color-frame)'
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className={`text-(--color-charcoal) ${active ? 'font-semibold' : 'opacity-60'}`}>
          {label}
        </p>
        {value && <p className="text-[10px] text-(--color-stone)">{value}</p>}
      </div>
    </li>
  )
}

function ActionButton({
  id,
  action,
  icon,
  label,
  variant = 'primary',
}: {
  id: string
  action: (formData: FormData) => Promise<void>
  icon: React.ReactNode
  label: string
  variant?: 'primary' | 'muted'
}) {
  const cls =
    variant === 'primary'
      ? 'bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark)'
      : 'bg-(--color-canvas) text-(--color-charcoal) border border-(--color-frame) hover:bg-(--color-paper)'
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.15em] ${cls}`}
      >
        {icon}
        {label}
      </button>
    </form>
  )
}
