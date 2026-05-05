import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Brush,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ImageIcon,
  MapPin,
  PenLine,
  Wallet,
  Truck,
  Hammer,
  PackageCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDictionary } from '@/i18n/dictionaries'
import { getPortailLocale } from '@/app/portail/locale'
import { localePath } from '@/lib/links'
import {
  ATELIER,
  formatEur,
  priceBreakdown,
  FORMATS,
  type FrameType,
} from '@/lib/atelier-config'
import { loadPricing } from '@/lib/commission-pricing'
import { generateEpcQrDataUrl } from '@/lib/epc-qr'
import DeliveryForm from './DeliveryForm'
import MessageForm from '@/app/portail/compte/MessageForm'

export const dynamic = 'force-dynamic'

const STORAGE_BUCKET = 'commission-references'
const SIGNED_URL_TTL = 60 * 60

type Props = {
  params: Promise<{ id: string }>
}

type Commission = {
  id: string
  name: string
  email: string
  phone: string | null
  locale: 'fr' | 'nl'
  technique: string
  width_cm: number | null
  height_cm: number | null
  support: string | null
  framing: string | null
  frame_type: string | null
  portrait_count: number | null
  supplements: string[] | null
  message: string
  status: string
  devis_subject: string | null
  devis_intro: string | null
  devis_lines: { description: string; quantity: number; unit_price: number }[]
  devis_subtotal_eur: number | null
  devis_vat_rate: number | null
  devis_total_eur: number | null
  devis_acompte_pct: number | null
  devis_acompte_eur: number | null
  devis_valid_until: string | null
  devis_payment_reference: string | null
  devis_balance_reference: string | null
  devis_sent_at: string | null
  signature_token: string | null
  signed_at: string | null
  signer_name: string | null
  acompte_received_at: string | null
  in_progress_at: string | null
  ready_at: string | null
  balance_received_at: string | null
  delivery_proposed_at: string | null
  delivery_proposed_date: string | null
  delivery_confirmed_at: string | null
  delivery_confirmed_date: string | null
  delivery_address: string | null
  delivery_alt_option: string | null
  delivery_alt_specs: string | null
  delivered_at: string | null
  completed_at: string | null
  created_at: string
}

function detectFormatId(width: number | null, height: number | null): string {
  if (!width || !height) return 'custom'
  for (const f of FORMATS) {
    if (f.width === width && f.height === height) return f.id
  }
  return 'custom'
}

const STEP_LABELS_FR = {
  reçue: 'Reçue',
  devis_envoye: 'Devis envoyé',
  signe: 'Signée',
  acompte: 'Acompte',
  en_cours: 'En cours',
  pret: 'Prête',
  solde: 'Solde reçu',
  livraison: 'Livraison fixée',
  livre: 'Livrée',
  complete: 'Terminée',
} as const

const STEP_LABELS_NL = {
  reçue: 'Ontvangen',
  devis_envoye: 'Offerte verzonden',
  signe: 'Ondertekend',
  acompte: 'Voorschot',
  en_cours: 'In uitvoering',
  pret: 'Klaar',
  solde: 'Saldo ontvangen',
  livraison: 'Levering vastgelegd',
  livre: 'Afgeleverd',
  complete: 'Afgerond',
} as const

export default async function PortailDevisDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const next = encodeURIComponent(`/portail/devis/${id}`)
  if (!user || !user.email) {
    redirect(`/portail/login?next=${next}`)
  }

  const locale = await getPortailLocale()
  const t = getDictionary(locale)
  const isFR = locale === 'fr'
  const dateLocale = isFR ? 'fr-BE' : 'nl-BE'

  const admin = createAdminClient()
  const { data: req } = await admin
    .from('commission_requests')
    .select('*')
    .eq('id', id)
    .single<Commission>()

  if (!req) notFound()

  // Eigenaar-check: ander account ingelogd → terug naar login (niet 404),
  // zodat klant duidelijk ziet dat hij met het verkeerde account inlogde.
  if (req.email.toLowerCase() !== user.email.toLowerCase()) {
    redirect(`/portail/login?err=wrong_account&next=${next}`)
  }

  // Photos
  const { data: attachmentsRaw } = await admin
    .from('commission_attachments')
    .select('id, storage_path, filename')
    .eq('request_id', req.id)
    .order('created_at', { ascending: true })

  const attachments = await Promise.all(
    (attachmentsRaw ?? []).map(async (a) => {
      const { data } = await admin.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(a.storage_path, SIGNED_URL_TTL)
      return { ...a, url: data?.signedUrl ?? null }
    })
  )
  const heroPhotoUrl = attachments[0]?.url ?? null

  // Progress updates (foto's tijdens uitvoering)
  const { data: progressRaw } = await admin
    .from('commission_progress_updates')
    .select(
      `id, caption, created_at,
       photos:commission_progress_photos(id, storage_path, filename, sort_order)`
    )
    .eq('commission_id', req.id)
    .order('created_at', { ascending: false })

  type ProgressRow = {
    id: string
    caption: string | null
    created_at: string
    photos: { id: string; storage_path: string; filename: string; sort_order: number }[] | null
  }
  const progressUpdates = await Promise.all(
    ((progressRaw ?? []) as ProgressRow[]).map(async (u) => {
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

  // Pricing breakdown (op huidige tarieven, voor info — definitief is wat in devis_lines staat)
  const pricing = await loadPricing()
  const formatId = detectFormatId(req.width_cm, req.height_cm)
  const liveBreakdown = priceBreakdown({
    formatId,
    frameType: (req.frame_type as FrameType | null) ?? 'aucun',
    portraitCount: req.portrait_count ?? 1,
    supplements: req.supplements ?? [],
    pricing,
  })

  // Devis lines (zoals JP ze heeft samengesteld) — bron van waarheid voor totaal
  const devisLines = (req.devis_lines ?? []) as Commission['devis_lines']
  const devisTotal = req.devis_total_eur ?? null
  const devisSubtotal = req.devis_subtotal_eur ?? null
  const vatRate = Number(req.devis_vat_rate ?? 0)
  const vatAmount =
    devisTotal != null && devisSubtotal != null
      ? Math.round((devisTotal - devisSubtotal) * 100) / 100
      : null
  const acompteEur = req.devis_acompte_eur ?? null
  const reference = req.devis_payment_reference ?? null

  // EPC QR voor acompte (alleen tonen na ondertekening, vóór acompte_received_at)
  let qrDataUrl: string | null = null
  if (req.signed_at && !req.acompte_received_at && acompteEur && reference) {
    try {
      qrDataUrl = await generateEpcQrDataUrl({
        beneficiaryName: ATELIER.ibanHolder,
        iban: ATELIER.iban,
        amountEur: acompteEur,
        communication: reference,
      })
    } catch {
      qrDataUrl = null
    }
  }

  // Saldo
  const balanceEur =
    devisTotal != null && acompteEur != null
      ? Math.round((devisTotal - acompteEur) * 100) / 100
      : null

  // Het saldo gebruikt een aparte gestructureerde mededeling
  const balanceReference = req.devis_balance_reference ?? reference

  // QR voor het saldo (na 'pret', vóór balance_received_at)
  let qrBalanceUrl: string | null = null
  if (
    req.ready_at &&
    !req.balance_received_at &&
    balanceEur &&
    balanceEur > 0 &&
    balanceReference
  ) {
    try {
      qrBalanceUrl = await generateEpcQrDataUrl({
        beneficiaryName: ATELIER.ibanHolder,
        iban: ATELIER.iban,
        amountEur: balanceEur,
        communication: balanceReference,
      })
    } catch {
      qrBalanceUrl = null
    }
  }

  const stepLabels = isFR ? STEP_LABELS_FR : STEP_LABELS_NL

  const steps = [
    { key: 'created', label: stepLabels['reçue'], at: req.created_at },
    { key: 'devis_sent', label: stepLabels.devis_envoye, at: req.devis_sent_at },
    { key: 'signed', label: stepLabels.signe, at: req.signed_at },
    { key: 'acompte', label: stepLabels.acompte, at: req.acompte_received_at },
    { key: 'in_progress', label: stepLabels.en_cours, at: req.in_progress_at },
    { key: 'ready', label: stepLabels.pret, at: req.ready_at },
    { key: 'balance', label: stepLabels.solde, at: req.balance_received_at },
    {
      key: 'delivery_set',
      label: stepLabels.livraison,
      at: req.delivery_confirmed_at,
    },
    { key: 'delivered', label: stepLabels.livre, at: req.delivered_at },
  ]
  const lastDoneIdx = steps.reduce((acc, s, i) => (s.at ? i : acc), -1)
  const progressPct = (lastDoneIdx / (steps.length - 1)) * 100

  const signUrl = req.signature_token
    ? localePath(req.locale, `/devis-signature/${req.signature_token}`)
    : null

  const isSigned = !!req.signed_at
  const isAcompteReceived = !!req.acompte_received_at
  const isComplete = !!req.completed_at

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      {/* Back link */}
      <div>
        <Link
          href="/portail"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isFR ? 'Mes commandes' : 'Mijn bestellingen'}
        </Link>
      </div>

      {/* Header */}
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {t.portail.dashboard.eyebrow}
        </p>
        <h1 className="text-3xl md:text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          {req.devis_subject || (isFR ? 'Votre commande' : 'Uw bestelling')}
        </h1>
      </header>

      {/* Timeline horizontaal + kleine thumbnail van eerste referentiefoto */}
      <section className="bg-(--color-paper) border border-(--color-frame) p-6">
        <div className="flex items-start gap-4 mb-5">
          {heroPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroPhotoUrl}
              alt={isFR ? 'Photo de référence' : 'Referentiefoto'}
              className="hidden sm:block w-16 h-16 object-cover border border-(--color-frame) shrink-0"
            />
          ) : (
            <div className="hidden sm:flex w-16 h-16 items-center justify-center bg-(--color-canvas) border border-(--color-frame) text-(--color-stone) shrink-0">
              <Brush className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
              {isFR ? 'Avancement' : 'Voortgang'}
            </h2>
            {req.devis_subject && (
              <p className="mt-0.5 text-sm text-(--color-charcoal) truncate">
                {req.devis_subject}
              </p>
            )}
          </div>
        </div>
        {/* Mobile (< md) — verticale tijdlijn, leesbaar zonder overlap */}
        <ol className="md:hidden relative space-y-3 pl-2">
          <div
            aria-hidden
            className="absolute left-[14px] top-3 bottom-3 w-px bg-(--color-frame)"
          />
          {steps.map((step, idx) => {
            const done = !!step.at
            const isLastDone = idx === lastDoneIdx
            return (
              <li key={step.key} className="relative flex items-start gap-3">
                <span
                  className={`relative z-10 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 shrink-0 ${
                    done
                      ? 'border-(--color-bronze) bg-(--color-bronze) text-white'
                      : 'border-(--color-frame) bg-(--color-paper) text-(--color-stone)'
                  } ${isLastDone ? 'ring-4 ring-(--color-bronze)/20' : ''}`}
                >
                  {done && <CheckCircle2 className="w-3 h-3" />}
                </span>
                <div className="flex-1 min-w-0 pt-1">
                  <p
                    className={`text-[11px] uppercase tracking-[0.15em] leading-tight ${
                      done ? 'text-(--color-ink) font-semibold' : 'text-(--color-stone)'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.at && (
                    <p className="text-[10px] text-(--color-stone) mt-0.5">
                      {new Date(step.at).toLocaleDateString(dateLocale, {
                        day: '2-digit',
                        month: 'long',
                      })}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        {/* Desktop (md+) — horizontale tijdlijn met geroteerde labels */}
        <div className="hidden md:block relative pb-12">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-3 h-0.5 bg-(--color-frame)"
          />
          <div
            aria-hidden
            className="absolute left-0 top-3 h-0.5 bg-(--color-bronze) transition-all duration-300"
            style={{ width: `${Math.max(0, progressPct)}%` }}
          />
          <ol className="relative flex justify-between">
            {steps.map((step, idx) => {
              const done = !!step.at
              const isLastDone = idx === lastDoneIdx
              return (
                <li
                  key={step.key}
                  className="flex flex-col items-center text-center relative"
                  style={{ width: `${100 / steps.length}%` }}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                      done
                        ? 'border-(--color-bronze) bg-(--color-bronze) text-white'
                        : 'border-(--color-frame) bg-(--color-paper) text-(--color-stone)'
                    } ${isLastDone ? 'ring-4 ring-(--color-bronze)/20' : ''}`}
                  >
                    {done && <CheckCircle2 className="w-3 h-3" />}
                  </span>
                  <div className="absolute top-9 left-1/2 -translate-x-1/2 origin-top -rotate-45 whitespace-nowrap">
                    <span
                      className={`block text-[10px] uppercase tracking-[0.1em] ${
                        done ? 'text-(--color-ink) font-semibold' : 'text-(--color-stone)'
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.at && (
                      <span className="block text-[9px] text-(--color-stone) mt-0.5">
                        {new Date(step.at).toLocaleDateString(dateLocale, {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Action card — wat moet de klant nu doen? */}
      {!isComplete && (
        <NextActionCard
          id={req.id}
          locale={locale}
          isFR={isFR}
          isSigned={isSigned}
          isAcompteReceived={isAcompteReceived}
          isInProgress={!!req.in_progress_at}
          isReady={!!req.ready_at}
          isBalanceReceived={!!req.balance_received_at}
          isDeliveryProposed={!!req.delivery_proposed_at}
          isDeliveryConfirmed={!!req.delivery_confirmed_at}
          isDelivered={!!req.delivered_at}
          signUrl={signUrl}
          qrDataUrl={qrDataUrl}
          qrBalanceUrl={qrBalanceUrl}
          balanceReference={balanceReference}
          deliveryProposedDate={req.delivery_proposed_date}
          deliveryConfirmedDate={req.delivery_confirmed_date}
          deliveryAddress={req.delivery_address}
          acompteEur={acompteEur}
          balanceEur={balanceEur}
          reference={reference}
          dateLocale={dateLocale}
        />
      )}

      {/* Voortgangsfoto's van JP */}
      {progressUpdates.length > 0 && (
        <section className="bg-(--color-paper) border border-(--color-bronze)/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) inline-flex items-center gap-2">
              <Brush className="w-3.5 h-3.5 text-(--color-bronze)" />
              {isFR ? 'Avancement de votre œuvre' : 'Voortgang van uw werk'} ({progressUpdates.length})
            </h2>
          </div>
          <div className="space-y-6">
            {progressUpdates.map((u) => (
              <article key={u.id} className="space-y-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-bronze)">
                  {new Date(u.created_at).toLocaleString(dateLocale, {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </p>
                {u.caption && (
                  <p className="text-sm text-(--color-charcoal) italic whitespace-pre-wrap border-l-2 border-(--color-bronze)/40 pl-3">
                    {u.caption}
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {u.photos.map((p) => (
                    <a
                      key={p.id}
                      href={p.url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-[4/3] overflow-hidden border border-(--color-frame) bg-(--color-canvas)"
                    >
                      {p.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.url}
                          alt={p.filename}
                          className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                        />
                      )}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Devis details */}
      {req.devis_sent_at && devisLines.length > 0 && (
        <section className="bg-(--color-paper) border border-(--color-frame) p-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
            {isFR ? 'Détail du devis' : 'Details van de offerte'}
          </h2>
          {req.devis_intro && (
            <p className="text-sm text-(--color-charcoal) whitespace-pre-wrap leading-relaxed mb-5">
              {req.devis_intro}
            </p>
          )}

          <ul className="space-y-1.5 text-sm mb-4">
            {devisLines.map((l, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-3 border-b border-(--color-frame)/50 pb-1.5"
              >
                <span className="text-(--color-ink)">
                  {l.description}{' '}
                  <span className="text-(--color-stone) text-xs">× {l.quantity}</span>
                </span>
                <span className="text-(--color-ink) tabular-nums whitespace-nowrap">
                  {formatEur(l.quantity * l.unit_price)}
                </span>
              </li>
            ))}
          </ul>

          <div className="bg-(--color-canvas) border border-(--color-frame) px-4 py-3 space-y-1 text-sm">
            {devisSubtotal != null && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-(--color-stone) text-xs">
                    {isFR ? 'Sous-total HT' : 'Subtotaal excl. BTW'}
                  </span>
                  <span className="text-(--color-charcoal) tabular-nums">
                    {formatEur(devisSubtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-(--color-stone) text-xs">
                    {isFR ? `TVA (${vatRate}%)` : `BTW (${vatRate}%)`}
                  </span>
                  <span className="text-(--color-charcoal) tabular-nums">
                    {formatEur(vatAmount ?? 0)}
                  </span>
                </div>
              </>
            )}
            <div
              className={`flex items-center justify-between ${
                devisSubtotal != null ? 'pt-1.5 border-t border-(--color-frame)/50' : ''
              }`}
            >
              <span className="text-(--color-charcoal)">
                {devisSubtotal != null
                  ? isFR
                    ? 'Total TTC'
                    : 'Totaal incl. BTW'
                  : isFR
                    ? 'Total'
                    : 'Totaal'}
              </span>
              <span className="text-(--color-ink) font-semibold">
                {devisTotal != null ? formatEur(devisTotal) : '—'}
              </span>
            </div>
            {acompteEur != null && (
              <div className="flex items-center justify-between">
                <span className="text-(--color-stone) text-xs">
                  {isFR ? 'Acompte' : 'Voorschot'} ({req.devis_acompte_pct ?? 50}%)
                </span>
                <span className="text-(--color-bronze) font-semibold">
                  {formatEur(acompteEur)}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Betalingsoverzicht */}
      {(req.acompte_received_at || req.balance_received_at || (req.devis_total_eur != null && req.signed_at)) && (
        <section className="bg-(--color-paper) border border-(--color-frame) p-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
            {isFR ? 'Paiements' : 'Betalingen'}
          </h2>
          <ul className="space-y-2 text-sm">
            {acompteEur != null && (
              <li className="flex items-center justify-between gap-3 py-1.5 border-b border-(--color-frame)/50">
                <div className="min-w-0 flex-1">
                  <p className="text-(--color-ink)">
                    {isFR ? 'Acompte' : 'Voorschot'}
                  </p>
                  {req.acompte_received_at ? (
                    <p className="text-[10px] text-(--color-bronze) inline-flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      {isFR ? 'Reçu le' : 'Ontvangen op'}{' '}
                      {new Date(req.acompte_received_at).toLocaleDateString(dateLocale, {
                        dateStyle: 'long',
                      })}
                    </p>
                  ) : (
                    <p className="text-[10px] text-(--color-stone) italic mt-0.5">
                      {isFR ? 'En attente' : 'In afwachting'}
                    </p>
                  )}
                </div>
                <span className="tabular-nums text-(--color-ink)">{formatEur(acompteEur)}</span>
              </li>
            )}
            {balanceEur != null && balanceEur > 0 && (
              <li className="flex items-center justify-between gap-3 py-1.5 border-b border-(--color-frame)/50">
                <div className="min-w-0 flex-1">
                  <p className="text-(--color-ink)">{isFR ? 'Solde' : 'Saldo'}</p>
                  {req.balance_received_at ? (
                    <p className="text-[10px] text-(--color-bronze) inline-flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      {isFR ? 'Reçu le' : 'Ontvangen op'}{' '}
                      {new Date(req.balance_received_at).toLocaleDateString(dateLocale, {
                        dateStyle: 'long',
                      })}
                    </p>
                  ) : (
                    <p className="text-[10px] text-(--color-stone) italic mt-0.5">
                      {isFR ? 'À payer à la livraison' : 'Te betalen voor levering'}
                    </p>
                  )}
                </div>
                <span className="tabular-nums text-(--color-ink)">{formatEur(balanceEur)}</span>
              </li>
            )}
            {devisTotal != null && (
              <li className="flex items-center justify-between gap-3 pt-2">
                <span className="text-(--color-charcoal) font-semibold">
                  {isFR ? 'Total' : 'Totaal'}
                </span>
                <span className="text-(--color-ink) font-semibold tabular-nums">
                  {formatEur(devisTotal)}
                </span>
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Vraag stellen aan JP — vanuit dit dossier */}
      <MessageForm
        locale={locale}
        commissionId={req.id}
        labels={t.portail.account.message}
      />

      {/* Reference photos */}
      {attachments.length > 0 && (
        <section className="bg-(--color-paper) border border-(--color-frame) p-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5" />
            {isFR ? 'Photos de référence' : 'Referentiefoto’s'} ({attachments.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {attachments.map((a) => (
              <a
                key={a.id}
                href={a.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden border border-(--color-frame) bg-(--color-canvas)"
              >
                {a.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.url}
                    alt={a.filename}
                    className="aspect-square w-full object-cover hover:opacity-80 transition-opacity"
                  />
                )}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function NextActionCard({
  id,
  locale,
  isFR,
  isSigned,
  isAcompteReceived,
  isInProgress,
  isReady,
  isBalanceReceived,
  isDeliveryProposed,
  isDeliveryConfirmed,
  isDelivered,
  signUrl,
  qrDataUrl,
  qrBalanceUrl,
  balanceReference,
  deliveryProposedDate,
  deliveryConfirmedDate,
  deliveryAddress,
  acompteEur,
  balanceEur,
  reference,
  dateLocale,
}: {
  id: string
  locale: string
  isFR: boolean
  isSigned: boolean
  isAcompteReceived: boolean
  isInProgress: boolean
  isReady: boolean
  isBalanceReceived: boolean
  isDeliveryProposed: boolean
  isDeliveryConfirmed: boolean
  isDelivered: boolean
  signUrl: string | null
  qrDataUrl: string | null
  qrBalanceUrl: string | null
  balanceReference: string | null
  deliveryProposedDate: string | null
  deliveryConfirmedDate: string | null
  deliveryAddress: string | null
  acompteEur: number | null
  balanceEur: number | null
  reference: string | null
  dateLocale: string
}) {
  // Stap 1 — moet nog tekenen
  if (!isSigned && signUrl) {
    return (
      <ActionShell
        icon={<PenLine className="w-5 h-5" />}
        title={isFR ? 'Signez votre devis' : 'Onderteken uw offerte'}
        body={
          isFR
            ? 'Pour valider votre commande, signez le devis en ligne. Vous recevrez ensuite les coordonnées de virement pour l’acompte.'
            : 'Onderteken de offerte online om uw bestelling te valideren. Daarna krijgt u de overschrijvingsgegevens voor het voorschot.'
        }
      >
        <Link
          href={signUrl}
          className="inline-flex items-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.18em]"
        >
          {isFR ? 'Voir & signer' : 'Bekijk & onderteken'}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </ActionShell>
    )
  }

  // Stap 2 — moet acompte betalen
  if (isSigned && !isAcompteReceived && acompteEur && reference) {
    return (
      <ActionShell
        icon={<Wallet className="w-5 h-5" />}
        title={isFR ? 'Réglez votre acompte' : 'Betaal uw voorschot'}
        body={
          isFR
            ? `Effectuez un virement de ${formatEur(acompteEur)} avec la communication ci-dessous. Dès réception, Jean-Pierre commence votre œuvre. Scannez le QR avec votre app bancaire pour aller plus vite.`
            : `Doe een overschrijving van ${formatEur(acompteEur)} met onderstaande mededeling. Zodra Jean-Pierre het ontvangt, start hij uw werk. Scan de QR-code met uw bank-app voor sneller invullen.`
        }
      >
        <PaymentDetails
          locale={locale}
          isFR={isFR}
          amount={acompteEur}
          reference={reference}
          qrDataUrl={qrDataUrl}
        />
      </ActionShell>
    )
  }

  // Stap 3 — acompte ontvangen, nog niet in uitvoering
  if (isAcompteReceived && !isInProgress && !isReady) {
    const balanceNote =
      balanceEur && balanceEur > 0
        ? isFR
          ? ` Solde à régler à la livraison : ${formatEur(balanceEur)}.`
          : ` Saldo te betalen bij levering: ${formatEur(balanceEur)}.`
        : ''
    return (
      <ActionShell
        icon={<Clock className="w-5 h-5" />}
        title={isFR ? 'Acompte bien reçu' : 'Voorschot ontvangen'}
        body={
          isFR
            ? `Merci ! Jean-Pierre va commencer votre œuvre dans les prochains jours.${balanceNote} Vous recevrez une notification dès qu'elle sera en cours.`
            : `Bedankt! Jean-Pierre begint binnenkort aan uw werk.${balanceNote} U krijgt een melding zodra het in uitvoering is.`
        }
      />
    )
  }

  // Stap 4 — in uitvoering, nog niet klaar
  if (isInProgress && !isReady) {
    const balanceNote =
      balanceEur && balanceEur > 0
        ? isFR
          ? ` Solde à régler à la livraison : ${formatEur(balanceEur)}.`
          : ` Saldo te betalen bij levering: ${formatEur(balanceEur)}.`
        : ''
    return (
      <ActionShell
        icon={<Hammer className="w-5 h-5" />}
        title={isFR ? 'Œuvre en cours' : 'Werk in uitvoering'}
        body={
          isFR
            ? `Jean-Pierre travaille actuellement à votre œuvre. Délai standard : 5 à 20 jours ouvrables.${balanceNote}`
            : `Jean-Pierre werkt nu aan uw werk. Standaardtermijn: 5 tot 20 werkdagen.${balanceNote}`
        }
      />
    )
  }

  // Stap 5 — klaar, saldo te betalen
  if (isReady && !isBalanceReceived && balanceEur && balanceEur > 0 && balanceReference) {
    return (
      <ActionShell
        icon={<PackageCheck className="w-5 h-5" />}
        title={isFR ? 'Œuvre prête — réglez le solde' : 'Werk klaar — betaal het saldo'}
        body={
          isFR
            ? `Excellente nouvelle : votre œuvre est terminée. Réglez le solde de ${formatEur(balanceEur)} avec la communication structurée ci-dessous. Dès réception, vous pourrez fixer une date de livraison.`
            : `Goed nieuws: uw werk is af. Betaal het saldo van ${formatEur(balanceEur)} met de gestructureerde mededeling hieronder. Zodra Jean-Pierre het ontvangt, kunt u een leveringsdatum kiezen.`
        }
      >
        <PaymentDetails
          locale={locale}
          isFR={isFR}
          amount={balanceEur}
          reference={balanceReference}
          qrDataUrl={qrBalanceUrl}
        />
      </ActionShell>
    )
  }

  // Stap 6 — saldo ontvangen, klant moet datum + adres + alt-optie kiezen
  if (isBalanceReceived && !isDeliveryProposed && !isDeliveryConfirmed) {
    return (
      <ActionShell
        icon={<CalendarCheck className="w-5 h-5" />}
        title={isFR ? 'Choisissez votre date de livraison' : 'Kies uw leveringsdatum'}
        body={
          isFR
            ? 'Solde bien reçu — merci ! Indiquez la date et l’heure souhaitées, votre adresse de livraison, et ce qu’il faut faire si vous n’êtes pas chez vous. Jean-Pierre confirmera le rendez-vous.'
            : 'Saldo goed ontvangen — bedankt! Geef de gewenste datum en uur, uw leveringsadres en wat te doen als u niet thuis bent. Jean-Pierre zal de afspraak bevestigen.'
        }
      >
        <DeliveryForm id={id} isFR={isFR} defaultAddress={deliveryAddress} />
      </ActionShell>
    )
  }

  // Stap 7 — voorstel ingediend, wacht op JP
  if (isDeliveryProposed && !isDeliveryConfirmed && deliveryProposedDate) {
    const proposed = new Date(deliveryProposedDate).toLocaleString(dateLocale, {
      dateStyle: 'long',
      timeStyle: 'short',
    })
    return (
      <ActionShell
        icon={<Clock className="w-5 h-5" />}
        title={isFR ? 'Proposition envoyée' : 'Voorstel verzonden'}
        body={
          isFR
            ? `Votre proposition (${proposed}) a bien été transmise à Jean-Pierre. Il vous confirmera le rendez-vous par e-mail dès que possible.`
            : `Uw voorstel (${proposed}) is goed bij Jean-Pierre aangekomen. Hij bevestigt de afspraak per e-mail zodra het kan.`
        }
      />
    )
  }

  // Stap 8 — datum bevestigd
  if (isDeliveryConfirmed && !isDelivered && deliveryConfirmedDate) {
    const confirmed = new Date(deliveryConfirmedDate).toLocaleString(dateLocale, {
      dateStyle: 'long',
      timeStyle: 'short',
    })
    return (
      <ActionShell
        icon={<CalendarCheck className="w-5 h-5" />}
        title={isFR ? 'Livraison confirmée' : 'Levering bevestigd'}
        body={
          isFR
            ? `Rendez-vous confirmé pour le ${confirmed}. Jean-Pierre passera vous remettre votre œuvre en personne.`
            : `Afspraak bevestigd op ${confirmed}. Jean-Pierre komt uw werk persoonlijk overhandigen.`
        }
      >
        {deliveryAddress && (
          <div className="bg-(--color-paper) border border-(--color-frame) p-4 text-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1 inline-flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {isFR ? 'Adresse' : 'Adres'}
            </p>
            <p className="text-(--color-ink) whitespace-pre-wrap">{deliveryAddress}</p>
          </div>
        )}
      </ActionShell>
    )
  }

  // Stap 9 — geleverd
  if (isDelivered) {
    return (
      <ActionShell
        icon={<Truck className="w-5 h-5" />}
        title={isFR ? 'Œuvre livrée' : 'Werk afgeleverd'}
        body={
          isFR
            ? 'Votre œuvre vous a été remise. Merci pour votre confiance — Jean-Pierre espère qu’elle vous accompagnera longtemps.'
            : 'Uw werk is overhandigd. Bedankt voor uw vertrouwen — Jean-Pierre hoopt dat het u nog lang vergezelt.'
        }
      />
    )
  }

  return null
}

function ActionShell({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode
  title: string
  body: string
  children?: React.ReactNode
}) {
  return (
    <section className="bg-(--color-bronze)/10 border border-(--color-bronze)/40 p-6 md:p-8">
      <div className="flex items-start gap-4 mb-4">
        <span className="flex h-10 w-10 items-center justify-center bg-(--color-bronze) text-white shrink-0">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl text-(--color-ink) font-[family-name:var(--font-display)] mb-2">
            {title}
          </h2>
          <p className="text-sm text-(--color-charcoal) leading-relaxed">{body}</p>
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  )
}

function PaymentDetails({
  isFR,
  amount,
  reference,
  qrDataUrl,
}: {
  locale: string
  isFR: boolean
  amount: number
  reference: string
  qrDataUrl: string | null
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start bg-(--color-paper) border border-(--color-frame) p-5">
      <dl className="space-y-2.5 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
            {isFR ? 'Bénéficiaire' : 'Begunstigde'}
          </dt>
          <dd className="text-(--color-ink)">{ATELIER.ibanHolder}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
            IBAN
          </dt>
          <dd className="text-(--color-ink) font-mono">{ATELIER.iban}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
            {isFR ? 'Montant' : 'Bedrag'}
          </dt>
          <dd className="text-(--color-bronze) font-semibold">{formatEur(amount)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
            {isFR ? 'Communication' : 'Mededeling'}
          </dt>
          <dd className="text-(--color-ink) font-mono bg-(--color-canvas) border border-(--color-frame) px-3 py-1.5 inline-block">
            {reference}
          </dd>
        </div>
      </dl>
      {qrDataUrl && (
        <div className="flex flex-col items-center bg-white border border-(--color-frame) p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="EPC QR" className="w-32 h-32" />
          <p className="mt-1 text-[9px] uppercase tracking-[0.15em] text-stone-700 text-center">
            {isFR ? 'Scanner avec votre app bancaire' : 'Scan met uw bank-app'}
          </p>
        </div>
      )}
    </div>
  )
}
