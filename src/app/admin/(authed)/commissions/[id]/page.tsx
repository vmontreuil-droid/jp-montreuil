import Link from 'next/link'
import { notFound } from 'next/navigation'
import { after } from 'next/server'
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
  RefreshCw,
  Send,
  AlertTriangle,
  PackageCheck,
  CalendarCheck,
  Home as HomeIcon,
  MapPin,
  ImageIcon,
  Download,
  Camera,
  Trash,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ATELIER,
  formatEur,
  priceBreakdown,
  seedDevisLinesFromRequest,
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
  deleteProgressUpdate,
  markAcompteReceived,
  markInProgress,
  markReady,
  markBalanceReceived,
  confirmDeliveryDate,
  markDelivered,
  markComplete,
  markRefused,
  resendDevisEmail,
  sendAcompteReminder,
  sendBalanceReminder,
} from '../actions'
import DevisComposeForm from './DevisComposeForm'
import MessageWithTranslate from './MessageWithTranslate'
import CommissionTimeline from './CommissionTimeline'
import ProgressUploadForm from './ProgressUploadForm'

export const dynamic = 'force-dynamic'
// Cold start + veel signed-URL calls (referentiefoto's + progress-foto's
// + EPC-QR generatie) kan voorbij de default 15s timeout gaan op Vercel
// → 'this page couldn't load'. Geef de pagina meer adem.
export const maxDuration = 60

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
  'pret',
  'solde_recu',
  'livraison_planifiee',
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
  pret: 'Œuvre prête',
  solde_recu: 'Solde reçu',
  livraison_planifiee: 'Livraison planifiée',
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
  searchParams?: Promise<{ notice?: string }>
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
  devis_subtotal_eur: number | null
  devis_vat_rate: number | null
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
  ready_at: string | null
  balance_received_at: string | null
  delivery_proposed_at: string | null
  delivery_proposed_date: string | null
  delivery_confirmed_at: string | null
  delivery_confirmed_date: string | null
  delivered_at: string | null
  completed_at: string | null
  refused_at: string | null

  delivery_address: string | null
  delivery_alt_option: string | null
  delivery_alt_specs: string | null
  devis_balance_reference: string | null

  commission_attachments: Attachment[]
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleString('fr-BE', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

export default async function CommissionDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = searchParams ? await searchParams : {}
  const notice = sp.notice
  const supabase = await createClient()

  const { data: req, error } = await supabase
    .from('commission_requests')
    .select(
      '*, commission_attachments(id, storage_path, filename, content_type, size_bytes)'
    )
    .eq('id', id)
    .single<CommissionRow>()

  if (error || !req) notFound()

  // markRead niet meer blokkerend — draaien NA de response zodat de eerste
  // render van de pagina niet hapert door een extra DB-update + auth check.
  if (!req.read_at) {
    after(async () => {
      try {
        await markRead(id)
      } catch (err) {
        console.error('markRead background failed', err)
      }
    })
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

  // Progress updates met foto's
  const { data: progressUpdates } = await admin
    .from('commission_progress_updates')
    .select(
      `id, caption, notification_sent_at, created_at,
       photos:commission_progress_photos(id, storage_path, filename, sort_order)`
    )
    .eq('commission_id', id)
    .order('created_at', { ascending: false })

  type ProgressUpdateRow = {
    id: string
    caption: string | null
    notification_sent_at: string | null
    created_at: string
    photos: { id: string; storage_path: string; filename: string; sort_order: number }[] | null
  }
  const progress = (progressUpdates ?? []) as ProgressUpdateRow[]
  const progressSigned = await Promise.all(
    progress.map(async (u) => {
      const photos = (u.photos ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
      const withUrls = await Promise.all(
        photos.map(async (p) => {
          const { data } = await admin.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(p.storage_path, SIGNED_URL_TTL)
          return { ...p, url: data?.signedUrl ?? null }
        })
      )
      return { ...u, photos: withUrls }
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
    <div className="p-8 md:p-12 max-w-7xl">
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

      {/* Tijdsbalk — horizontale voortgang */}
      <div className="mb-8">
        <CommissionTimeline
          steps={[
            { key: 'created', label: 'Reçue', at: req.created_at },
            { key: 'devis_sent', label: 'Devis envoyé', at: req.devis_sent_at },
            { key: 'signed', label: 'Signée', at: req.signed_at },
            { key: 'acompte', label: 'Acompte', at: req.acompte_received_at },
            { key: 'in_progress', label: 'En cours', at: req.in_progress_at },
            { key: 'ready', label: 'Prête', at: req.ready_at },
            { key: 'balance', label: 'Solde reçu', at: req.balance_received_at },
            {
              key: 'delivery_set',
              label: 'Livraison fixée',
              at: req.delivery_confirmed_at,
            },
            { key: 'delivered', label: 'Livrée', at: req.delivered_at },
          ]}
        />
      </div>

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

          {/* Photos de référence — toujours visibles, JP en a besoin pour peindre */}
          {signed.length > 0 && (
            <section className="border border-(--color-bronze)/40 bg-(--color-bronze)/5 p-6">
              <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-(--color-bronze)" />
                Photos de référence ({signed.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {signed.map((a) => (
                  <div
                    key={a.id}
                    className="group relative border border-(--color-frame) bg-(--color-canvas) overflow-hidden"
                  >
                    {a.url ? (
                      <>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a.url}
                            alt={a.filename}
                            className="aspect-square w-full object-cover group-hover:opacity-80 transition-opacity"
                          />
                        </a>
                        <a
                          href={a.url}
                          download={a.filename}
                          title={`Télécharger ${a.filename}`}
                          className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 bg-(--color-ink)/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-(--color-bronze)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </>
                    ) : (
                      <div className="aspect-square flex items-center justify-center text-(--color-stone) text-xs">
                        {a.filename}
                      </div>
                    )}
                    <p className="px-2 py-1.5 text-[10px] text-(--color-stone) truncate border-t border-(--color-frame)/50">
                      {a.filename}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-(--color-stone) italic">
                Cliquez sur une photo pour l’ouvrir en grand · survolez pour télécharger.
              </p>
            </section>
          )}

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

          {/* Photos d'avancement (envoyer + historique) */}
          <section className="border border-(--color-frame) bg-(--color-paper) p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) inline-flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-(--color-bronze)" />
                Photos d’avancement{progressSigned.length > 0 && ` (${progressSigned.length})`}
              </h2>
            </div>
            <p className="text-xs text-(--color-charcoal) mb-5 leading-relaxed">
              Envoyez quelques photos de la progression — le client recevra
              un mail avec aperçu et lien vers son dossier. Idéal pour
              entretenir l’enthousiasme entre l’acompte et la livraison.
            </p>
            <ProgressUploadForm commissionId={req.id} />

            {progressSigned.length > 0 && (
              <div className="mt-8 space-y-5 border-t border-(--color-frame)/50 pt-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone)">
                  Historique
                </p>
                {progressSigned.map((u) => (
                  <article
                    key={u.id}
                    className="border border-(--color-frame) bg-(--color-canvas)/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-xs text-(--color-charcoal)">
                          {new Date(u.created_at).toLocaleString('fr-BE', {
                            dateStyle: 'long',
                            timeStyle: 'short',
                          })}
                        </p>
                        {u.notification_sent_at && (
                          <p className="text-[10px] text-(--color-bronze) inline-flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            Notification envoyée
                          </p>
                        )}
                      </div>
                      <form action={deleteProgressUpdate}>
                        <input type="hidden" name="update_id" value={u.id} />
                        <input type="hidden" name="commission_id" value={req.id} />
                        <button
                          type="submit"
                          title="Supprimer cet envoi"
                          className="text-[10px] text-(--color-stone) hover:text-red-600 inline-flex items-center gap-1"
                        >
                          <Trash className="w-3 h-3" />
                          Supprimer
                        </button>
                      </form>
                    </div>
                    {u.caption && (
                      <p className="text-sm text-(--color-charcoal) italic whitespace-pre-wrap mb-3 border-l-2 border-(--color-bronze)/40 pl-3">
                        {u.caption}
                      </p>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {u.photos.map((p) => (
                        <a
                          key={p.id}
                          href={p.url ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square overflow-hidden border border-(--color-frame) bg-(--color-paper)"
                        >
                          {p.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.url}
                              alt={p.filename}
                              className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                            />
                          )}
                        </a>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
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
                defaultVatRate={req.devis_vat_rate ?? pricing.defaultVatRate}
                initialLines={
                  devisLines.length > 0
                    ? devisLines.map((l, i) => ({
                        id: i + 1,
                        description: l.description,
                        quantity: l.quantity,
                        unitPrice: l.unit_price,
                      }))
                    : seedDevisLinesFromRequest({
                        technique: req.technique,
                        width_cm: req.width_cm,
                        height_cm: req.height_cm,
                        frame_type: (req.frame_type as FrameType | null) ?? 'aucun',
                        portrait_count: req.portrait_count,
                        supplements: req.supplements,
                        pricing,
                      }).map((l, i) => ({
                        id: i + 1,
                        description: l.description,
                        quantity: l.quantity,
                        unitPrice: l.unit_price,
                      }))
                }
                attachments={signed.map((a) => ({
                  id: a.id,
                  filename: a.filename,
                  url: a.url,
                }))}
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
                  <div className="bg-(--color-canvas) border border-(--color-frame) px-3 py-2 space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) inline-flex items-center gap-1.5">
                      <Copy className="w-3 h-3" />
                      Communication structurée
                    </p>
                    <p className="text-(--color-ink) font-mono text-sm select-all">
                      {req.devis_payment_reference}
                    </p>
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

          {/* Livraison — adres + datums (zichtbaar zodra klant iets heeft ingevuld of JP iets bevestigd) */}
          {(req.delivery_address ||
            req.delivery_proposed_date ||
            req.delivery_confirmed_date ||
            req.devis_balance_reference) && (
            <section className="border border-(--color-frame) bg-(--color-paper) p-6 space-y-4">
              <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) inline-flex items-center gap-2">
                <Truck className="w-3.5 h-3.5" /> Livraison
              </h2>

              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                {req.delivery_address && (
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5 inline-flex items-center gap-1">
                      <HomeIcon className="w-3 h-3" /> Adresse
                    </dt>
                    <dd className="text-(--color-ink) whitespace-pre-wrap">
                      {req.delivery_address}
                    </dd>
                    <a
                      href={`https://maps.apple.com/?q=${encodeURIComponent(req.delivery_address.replace(/\n/g, ', '))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border border-(--color-bronze)/40 bg-(--color-bronze)/10 text-(--color-bronze) hover:bg-(--color-bronze)/20"
                    >
                      <MapPin className="w-3 h-3" />
                      Ouvrir dans Plans
                    </a>
                  </div>
                )}
                {req.delivery_proposed_date && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                      Date proposée par le client
                    </dt>
                    <dd className="text-(--color-ink)">
                      {new Date(req.delivery_proposed_date).toLocaleString('fr-BE', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })}
                    </dd>
                  </div>
                )}
                {req.delivery_confirmed_date && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                      Date confirmée
                    </dt>
                    <dd className="text-(--color-bronze) font-semibold">
                      {new Date(req.delivery_confirmed_date).toLocaleString('fr-BE', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })}
                    </dd>
                    <a
                      href={`/api/admin/commissions/${req.id}/ics`}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border border-(--color-bronze)/40 bg-(--color-bronze)/10 text-(--color-bronze) hover:bg-(--color-bronze)/20"
                    >
                      <CalendarCheck className="w-3 h-3" />
                      Ajouter au calendrier
                    </a>
                  </div>
                )}
                {req.delivery_alt_option && (
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                      En cas d’absence
                    </dt>
                    <dd className="text-(--color-ink)">
                      {
                        ({
                          home: 'Présent à domicile',
                          neighbours: 'Remettre aux voisins',
                          door: 'Déposer à la porte',
                          safe_place: 'Endroit sûr',
                          other: 'Autre',
                        } as Record<string, string>)[req.delivery_alt_option] ||
                          req.delivery_alt_option
                      }
                      {req.delivery_alt_specs && ` — ${req.delivery_alt_specs}`}
                    </dd>
                  </div>
                )}
                {req.devis_balance_reference && (
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5 inline-flex items-center gap-1">
                      <Copy className="w-3 h-3" /> Communication structurée — solde
                    </dt>
                    <dd className="text-(--color-ink) font-mono text-sm select-all bg-(--color-canvas) border border-(--color-frame) px-3 py-2 inline-block mt-1">
                      {req.devis_balance_reference}
                    </dd>
                  </div>
                )}
              </dl>
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
              {req.in_progress_at && !req.ready_at && (
                <ActionButton id={req.id} action={markReady} icon={<PackageCheck className="w-3.5 h-3.5" />} label="Œuvre prête (envoyer solde)" />
              )}
              {req.ready_at && !req.balance_received_at && (
                <ActionButton id={req.id} action={markBalanceReceived} icon={<Wallet className="w-3.5 h-3.5" />} label="Solde reçu (demander date)" />
              )}
              {req.delivery_confirmed_at && !req.delivered_at && (
                <ActionButton id={req.id} action={markDelivered} icon={<Truck className="w-3.5 h-3.5" />} label="Œuvre livrée" />
              )}
              {req.delivered_at && !req.completed_at && (
                <ActionButton id={req.id} action={markComplete} icon={<Flag className="w-3.5 h-3.5" />} label="Clôturer le dossier" />
              )}
            </section>
          )}

          {/* Leveringsvoorstel van de klant — JP keurt goed of past aan */}
          {req.delivery_proposed_at && !req.delivery_confirmed_at && (
            <section className="border border-(--color-bronze)/40 bg-(--color-bronze)/5 p-5 space-y-3">
              <div className="flex items-start gap-2">
                <CalendarCheck className="w-4 h-4 text-(--color-bronze) mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-ink)">
                    Proposition du client
                  </h2>
                  <p className="mt-1 text-[10px] text-(--color-stone) leading-relaxed">
                    Le client propose une date de livraison. Confirmez ou
                    ajustez la date/heure ci-dessous.
                  </p>
                </div>
              </div>
              {req.delivery_proposed_date && (
                <p className="text-sm text-(--color-ink)">
                  <span className="text-(--color-stone) text-xs">Proposé : </span>
                  {new Date(req.delivery_proposed_date).toLocaleString('fr-BE', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </p>
              )}
              {req.delivery_address && (
                <div className="text-xs text-(--color-charcoal)">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Adresse
                  </p>
                  <p className="whitespace-pre-wrap">{req.delivery_address}</p>
                </div>
              )}
              {req.delivery_alt_option && (
                <div className="text-xs text-(--color-charcoal)">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                    En cas d’absence
                  </p>
                  <p>
                    {
                      ({
                        home: 'Présent à domicile',
                        neighbours: 'Remettre aux voisins',
                        door: 'Déposer à la porte',
                        safe_place: 'Endroit sûr',
                        other: 'Autre',
                      } as Record<string, string>)[req.delivery_alt_option] ||
                        req.delivery_alt_option
                    }
                    {req.delivery_alt_specs && ` — ${req.delivery_alt_specs}`}
                  </p>
                </div>
              )}
              <form action={confirmDeliveryDate} className="space-y-2 pt-2 border-t border-(--color-bronze)/20">
                <input type="hidden" name="id" value={req.id} />
                <label className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">
                  Date & heure confirmées
                </label>
                <input
                  type="datetime-local"
                  name="confirmed_date"
                  required
                  defaultValue={
                    req.delivery_proposed_date
                      ? new Date(req.delivery_proposed_date)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  className="w-full px-3 py-2 input-elev bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) text-sm"
                />
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.15em] bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark)"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirmer la livraison
                </button>
              </form>
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

          {/* Boutons de secours — herverstuur mails wanneer de flow hapert */}
          {req.devis_sent_at && (
            <section className="border border-(--color-frame) bg-(--color-paper) p-5 space-y-2">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-(--color-bronze) mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
                    Boutons de secours
                  </h2>
                  <p className="mt-1 text-[10px] text-(--color-stone) leading-relaxed">
                    Au cas où le client n’aurait rien reçu ou aurait perdu les
                    infos. N’écrase rien — envoie juste un nouveau mail.
                  </p>
                </div>
              </div>

              <form action={resendDevisEmail}>
                <input type="hidden" name="id" value={req.id} />
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.15em] bg-(--color-canvas) border border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-ink)"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Renvoyer le devis
                </button>
              </form>

              {req.devis_acompte_eur != null && req.devis_acompte_eur > 0 && (
                <form action={sendAcompteReminder}>
                  <input type="hidden" name="id" value={req.id} />
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.15em] bg-(--color-canvas) border border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-ink)"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Demander l'acompte
                  </button>
                </form>
              )}

              {req.devis_total_eur != null &&
                req.devis_acompte_eur != null &&
                req.devis_total_eur - req.devis_acompte_eur > 0 && (
                  <form action={sendBalanceReminder}>
                    <input type="hidden" name="id" value={req.id} />
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.15em] bg-(--color-canvas) border border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-ink)"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Demander le solde
                    </button>
                  </form>
                )}
            </section>
          )}

          {/* Atelier-info reminder */}
          <section className="border border-(--color-frame) bg-(--color-canvas) p-5 text-xs space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">
              Coordonnées de virement
            </p>
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                Bénéficiaire
              </p>
              <p className="text-(--color-ink)">{ATELIER.ibanHolder}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                IBAN
              </p>
              <p className="text-(--color-ink) font-mono select-all">{ATELIER.iban}</p>
            </div>
            {req.devis_payment_reference && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.15em] text-(--color-stone) mb-0.5">
                  Communication
                </p>
                <p className="text-(--color-ink) font-mono select-all break-all">
                  {req.devis_payment_reference}
                </p>
                <p className="text-[10px] text-(--color-stone) mt-1">
                  À attendre sur le virement du client.
                </p>
              </div>
            )}
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
