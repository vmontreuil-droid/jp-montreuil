import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Brush,
  CheckCircle2,
  Clock,
  Copy,
  ImageIcon,
  PenLine,
  Wallet,
  Truck,
  Hammer,
  Flag,
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
  type PriceLineItem,
} from '@/lib/atelier-config'
import { loadPricing } from '@/lib/commission-pricing'
import { generateEpcQrDataUrl } from '@/lib/epc-qr'

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
  devis_sent_at: string | null
  signature_token: string | null
  signed_at: string | null
  signer_name: string | null
  acompte_received_at: string | null
  in_progress_at: string | null
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
  livre: 'Livrée',
  complete: 'Terminée',
} as const

const STEP_LABELS_NL = {
  reçue: 'Ontvangen',
  devis_envoye: 'Offerte verzonden',
  signe: 'Ondertekend',
  acompte: 'Voorschot',
  en_cours: 'In uitvoering',
  livre: 'Afgeleverd',
  complete: 'Afgerond',
} as const

export default async function PortailDevisDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) redirect('/portail/login')

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

  // Veiligheid: enkel de eigenaar mag z'n eigen devis bekijken
  if (req.email.toLowerCase() !== user.email.toLowerCase()) {
    notFound()
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

  // Saldo voor na levering
  const balanceEur =
    devisTotal != null && acompteEur != null
      ? Math.round((devisTotal - acompteEur) * 100) / 100
      : null

  let qrBalanceUrl: string | null = null
  if (req.delivered_at && !req.completed_at && balanceEur && reference) {
    try {
      qrBalanceUrl = await generateEpcQrDataUrl({
        beneficiaryName: ATELIER.ibanHolder,
        iban: ATELIER.iban,
        amountEur: balanceEur,
        communication: reference,
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
    { key: 'delivered', label: stepLabels.livre, at: req.delivered_at },
    { key: 'complete', label: stepLabels.complete, at: req.completed_at },
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

      {/* Timeline horizontaal */}
      <section className="bg-(--color-paper) border border-(--color-frame) p-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-5">
          {isFR ? 'Avancement' : 'Voortgang'}
        </h2>
        <div className="relative">
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
                  className="flex flex-col items-center gap-1.5 text-center"
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
                  <span
                    className={`text-[10px] uppercase tracking-[0.1em] leading-tight ${
                      done ? 'text-(--color-ink) font-semibold' : 'text-(--color-stone)'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.at && (
                    <span className="text-[9px] text-(--color-stone)">
                      {new Date(step.at).toLocaleDateString(dateLocale, {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Hero photo (eerste referentie-upload van de klant) */}
      <div className="relative aspect-[16/9] md:aspect-[21/9] bg-(--color-paper) border border-(--color-frame) overflow-hidden">
        {heroPhotoUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroPhotoUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-(--color-canvas)/70 to-transparent"
            />
            <div className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 bg-(--color-canvas)/70 backdrop-blur-sm border border-(--color-bronze)/30">
              <ImageIcon className="w-3 h-3 text-(--color-bronze)" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-white">
                {isFR ? 'Votre photo de référence' : 'Uw referentiefoto'}
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-(--color-paper) via-(--color-paper) to-(--color-bronze)/10">
            <div className="flex h-12 w-12 items-center justify-center bg-(--color-bronze)/10 text-(--color-bronze)">
              <Brush className="w-6 h-6" />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
              {isFR ? 'Aucune photo de référence' : 'Geen referentiefoto'}
            </p>
          </div>
        )}
      </div>

      {/* Action card — wat moet de klant nu doen? */}
      {!isComplete && (
        <NextActionCard
          locale={locale}
          isFR={isFR}
          isSigned={isSigned}
          isAcompteReceived={isAcompteReceived}
          isInProgress={!!req.in_progress_at}
          isDelivered={!!req.delivered_at}
          signUrl={signUrl}
          qrDataUrl={qrDataUrl}
          qrBalanceUrl={qrBalanceUrl}
          acompteEur={acompteEur}
          balanceEur={balanceEur}
          reference={reference}
        />
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
  locale,
  isFR,
  isSigned,
  isAcompteReceived,
  isInProgress,
  isDelivered,
  signUrl,
  qrDataUrl,
  qrBalanceUrl,
  acompteEur,
  balanceEur,
  reference,
}: {
  locale: string
  isFR: boolean
  isSigned: boolean
  isAcompteReceived: boolean
  isInProgress: boolean
  isDelivered: boolean
  signUrl: string | null
  qrDataUrl: string | null
  qrBalanceUrl: string | null
  acompteEur: number | null
  balanceEur: number | null
  reference: string | null
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

  // Stap 3 — wachtt op uitvoering / in cours
  if (isAcompteReceived && !isInProgress) {
    return (
      <ActionShell
        icon={<Clock className="w-5 h-5" />}
        title={isFR ? 'Acompte bien reçu' : 'Voorschot ontvangen'}
        body={
          isFR
            ? 'Merci ! Jean-Pierre va commencer votre œuvre dans les prochains jours. Vous recevrez une notification dès qu’elle sera en cours.'
            : 'Bedankt! Jean-Pierre begint binnenkort aan uw werk. U krijgt een melding zodra het in uitvoering is.'
        }
      />
    )
  }

  if (isInProgress && !isDelivered) {
    return (
      <ActionShell
        icon={<Hammer className="w-5 h-5" />}
        title={isFR ? 'Œuvre en cours' : 'Werk in uitvoering'}
        body={
          isFR
            ? 'Jean-Pierre travaille actuellement à votre œuvre. Délai standard : 5 à 20 jours ouvrables.'
            : 'Jean-Pierre werkt nu aan uw werk. Standaardtermijn: 5 tot 20 werkdagen.'
        }
      />
    )
  }

  // Stap 4 — geleverd, saldo betalen
  if (isDelivered && balanceEur && reference) {
    return (
      <ActionShell
        icon={<Truck className="w-5 h-5" />}
        title={isFR ? 'Œuvre livrée — solde à régler' : 'Werk afgeleverd — saldo betalen'}
        body={
          isFR
            ? `Votre œuvre est livrée. Réglez le solde de ${formatEur(balanceEur)} avec la même communication.`
            : `Uw werk is afgeleverd. Betaal het saldo van ${formatEur(balanceEur)} met dezelfde mededeling.`
        }
      >
        <PaymentDetails
          locale={locale}
          isFR={isFR}
          amount={balanceEur}
          reference={reference}
          qrDataUrl={qrBalanceUrl}
        />
      </ActionShell>
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
