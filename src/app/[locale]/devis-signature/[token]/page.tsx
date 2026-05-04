import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { createAdminClient } from '@/lib/supabase/admin'
import { ATELIER, formatEur } from '@/lib/atelier-config'
import { generateEpcQrDataUrl } from '@/lib/epc-qr'
import SignClient from './SignClient'

type Props = {
  params: Promise<{ locale: string; token: string }>
}

type DevisLine = {
  description: string
  quantity: number
  unit_price: number
}

type Commission = {
  id: string
  name: string
  email: string
  locale: 'fr' | 'nl'
  status: string
  technique: string
  width_cm: number | null
  height_cm: number | null
  support: string | null
  framing: string | null
  devis_subject: string | null
  devis_intro: string | null
  devis_lines: DevisLine[]
  devis_subtotal_eur: number | null
  devis_vat_rate: number | null
  devis_total_eur: number | null
  devis_acompte_pct: number | null
  devis_acompte_eur: number | null
  devis_valid_until: string | null
  devis_payment_reference: string | null
  signature_token: string
  signed_at: string | null
  signer_name: string | null
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Devis — Atelier Montreuil',
    robots: { index: false, follow: false },
  }
}

const TECHNIQUE_LABEL_FR: Record<string, string> = {
  crayon_nb: 'Crayon noir & blanc',
  aquarelle_couleur: 'Aquarelle couleur',
  acrylique_toile: 'Acrylique sur toile',
  autre: 'À discuter',
}
const TECHNIQUE_LABEL_NL: Record<string, string> = {
  crayon_nb: 'Zwart-wit potlood',
  aquarelle_couleur: 'Kleur aquarel',
  acrylique_toile: 'Acryl op linnen',
  autre: 'Te bespreken',
}

const SUPPORT_LABEL_FR: Record<string, string> = {
  papier_aquarelle: 'Papier aquarelle',
  toile_lin: 'Toile de lin',
  peu_importe: 'À discuter',
}
const SUPPORT_LABEL_NL: Record<string, string> = {
  papier_aquarelle: 'Aquarelpapier',
  toile_lin: 'Linnen doek',
  peu_importe: 'Te bespreken',
}

const FRAMING_LABEL_FR: Record<string, string> = {
  oui: 'Oui',
  non: 'Non',
  peu_importe: 'À discuter',
}
const FRAMING_LABEL_NL: Record<string, string> = {
  oui: 'Ja',
  non: 'Nee',
  peu_importe: 'Te bespreken',
}

export default async function DevisSignaturePage({ params }: Props) {
  const { locale: localeParam, token } = await params
  if (!isLocale(localeParam)) notFound()
  const locale = localeParam as Locale
  const t = getDictionary(locale)
  const tt = t.devisSign

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('commission_requests')
    .select(
      'id, name, email, locale, status, technique, width_cm, height_cm, support, framing,' +
        ' devis_subject, devis_intro, devis_lines, devis_subtotal_eur, devis_vat_rate,' +
        ' devis_total_eur, devis_acompte_pct, devis_acompte_eur,' +
        ' devis_valid_until, devis_payment_reference, signature_token, signed_at, signer_name'
    )
    .eq('signature_token', token)
    .single<Commission>()

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">{tt.eyebrow}</p>
        <h1 className="text-3xl text-(--color-ink) mb-4 font-[family-name:var(--font-display)]">
          {tt.notFoundTitle}
        </h1>
        <p className="text-(--color-charcoal)">{tt.notFoundBody}</p>
      </div>
    )
  }

  // Eerste referentiefoto voor de devis-hero
  const { data: firstAttachment } = await admin
    .from('commission_attachments')
    .select('storage_path, filename')
    .eq('request_id', data.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ storage_path: string; filename: string }>()

  let heroImageUrl: string | null = null
  if (firstAttachment?.storage_path) {
    const { data: signed } = await admin.storage
      .from('commission-references')
      .createSignedUrl(firstAttachment.storage_path, 60 * 60)
    heroImageUrl = signed?.signedUrl ?? null
  }

  const isSigned = !!data.signed_at
  const techniqueLabels = locale === 'fr' ? TECHNIQUE_LABEL_FR : TECHNIQUE_LABEL_NL
  const supportLabels = locale === 'fr' ? SUPPORT_LABEL_FR : SUPPORT_LABEL_NL
  const framingLabels = locale === 'fr' ? FRAMING_LABEL_FR : FRAMING_LABEL_NL

  const sizeStr =
    data.width_cm && data.height_cm
      ? `${data.width_cm} × ${data.height_cm} cm`
      : locale === 'fr' ? 'À discuter' : 'Te bespreken'

  const lines = (data.devis_lines ?? []) as DevisLine[]
  const subtotalHt =
    data.devis_subtotal_eur ??
    lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)
  const vatRate = Number(data.devis_vat_rate ?? 0)
  const total = data.devis_total_eur ?? subtotalHt
  const vatAmount = Math.round((total - subtotalHt) * 100) / 100
  const acompteEur = data.devis_acompte_eur ?? Math.round(total * 0.5 * 100) / 100
  const acomptePct = data.devis_acompte_pct ?? 50
  const reference = data.devis_payment_reference || `Devis #${data.id.slice(0, 8)}`

  const validUntilStr = data.devis_valid_until
    ? new Date(data.devis_valid_until).toLocaleDateString(locale === 'fr' ? 'fr-BE' : 'nl-BE', {
        dateStyle: 'long',
      })
    : null

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">{tt.eyebrow}</p>
        <h1 className="text-3xl md:text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          {tt.portalTitle}
        </h1>
      </div>

      {/* Devis details */}
      <section className="bg-(--color-paper) border border-(--color-frame) overflow-hidden">
        {heroImageUrl && (
          <div className="aspect-[16/9] w-full bg-(--color-canvas) overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-6 md:p-8">
        <header className="flex flex-wrap items-end justify-between gap-3 mb-6 pb-4 border-b border-(--color-frame)">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone)">
              {tt.issuedFor}
            </p>
            <p className="text-(--color-ink)">{data.name}</p>
          </div>
          {validUntilStr && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone)">
                {tt.validUntil}
              </p>
              <p className="text-(--color-ink) text-sm">{validUntilStr}</p>
            </div>
          )}
        </header>

        {data.devis_subject && (
          <h2 className="text-xl text-(--color-ink) font-[family-name:var(--font-display)] mb-3">
            {data.devis_subject}
          </h2>
        )}

        {data.devis_intro && (
          <p className="text-sm text-(--color-charcoal) whitespace-pre-wrap mb-6 leading-relaxed">
            {data.devis_intro}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-3 mb-6 text-sm">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
              {tt.technique}
            </dt>
            <dd className="text-(--color-ink)">
              {techniqueLabels[data.technique] ?? data.technique}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
              {tt.format}
            </dt>
            <dd className="text-(--color-ink)">{sizeStr}</dd>
          </div>
          {data.support && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
                {tt.support}
              </dt>
              <dd className="text-(--color-ink)">{supportLabels[data.support] ?? data.support}</dd>
            </div>
          )}
          {data.framing && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
                {tt.framing}
              </dt>
              <dd className="text-(--color-ink)">{framingLabels[data.framing] ?? data.framing}</dd>
            </div>
          )}
        </dl>

        {/* Lines */}
        {lines.length > 0 && (
          <div className="mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone) border-b border-(--color-frame)">
                  <th className="text-left py-2 font-normal">{tt.description}</th>
                  <th className="text-right py-2 font-normal w-12">{tt.qty}</th>
                  <th className="text-right py-2 font-normal w-24">{tt.unitPrice}</th>
                  <th className="text-right py-2 font-normal w-24">{tt.lineTotal}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-(--color-frame)/50">
                    <td className="py-3 align-top text-(--color-ink)">{l.description}</td>
                    <td className="py-3 text-right align-top text-(--color-charcoal)">{l.quantity}</td>
                    <td className="py-3 text-right align-top text-(--color-charcoal) whitespace-nowrap">
                      {formatEur(l.unit_price)}
                    </td>
                    <td className="py-3 text-right align-top text-(--color-ink) whitespace-nowrap">
                      {formatEur(l.quantity * l.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="bg-(--color-canvas) border border-(--color-frame) px-4 py-3 space-y-1.5 text-sm">
          {vatRate > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-(--color-stone) text-xs">
                  {locale === 'fr' ? 'Sous-total HT' : 'Subtotaal excl. BTW'}
                </span>
                <span className="text-(--color-charcoal) tabular-nums">
                  {formatEur(subtotalHt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-(--color-stone) text-xs">
                  {locale === 'fr' ? `TVA (${vatRate}%)` : `BTW (${vatRate}%)`}
                </span>
                <span className="text-(--color-charcoal) tabular-nums">
                  {formatEur(vatAmount)}
                </span>
              </div>
            </>
          )}
          <div
            className={`flex items-center justify-between ${
              vatRate > 0 ? 'pt-1.5 border-t border-(--color-frame)/50' : ''
            }`}
          >
            <span className="text-(--color-charcoal)">
              {vatRate > 0
                ? locale === 'fr'
                  ? 'Total TTC'
                  : 'Totaal incl. BTW'
                : tt.total}
            </span>
            <span className="text-(--color-ink) font-semibold text-base">
              {formatEur(total)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-(--color-stone) text-xs">
              {tt.acompteLabel} ({acomptePct}%)
            </span>
            <span className="text-(--color-bronze) font-semibold">{formatEur(acompteEur)}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-(--color-stone)">{tt.acompteHint}</p>
        <p className="mt-1 text-xs text-(--color-stone)">{tt.deliveryNote}</p>
        </div>
      </section>

      {/* Sign / Payment block */}
      {isSigned ? (
        <PaymentBlockServer
          locale={locale}
          tt={tt}
          acompteEur={acompteEur}
          reference={reference}
        />
      ) : (
        <section className="bg-(--color-paper) border border-(--color-frame) p-6 md:p-8">
          <h2 className="text-xl text-(--color-ink) mb-2 font-[family-name:var(--font-display)]">
            {tt.signTitle}
          </h2>
          <p className="text-sm text-(--color-charcoal) mb-5 leading-relaxed">{tt.signLead}</p>
          <SignClient
            locale={locale}
            t={t}
            token={token}
            defaultName={data.name}
            alreadySigned={isSigned}
          />
        </section>
      )}
    </div>
  )
}

async function PaymentBlockServer({
  locale,
  tt,
  acompteEur,
  reference,
}: {
  locale: Locale
  tt: ReturnType<typeof getDictionary>['devisSign']
  acompteEur: number
  reference: string
}) {
  let qrDataUrl: string | null = null
  try {
    qrDataUrl = await generateEpcQrDataUrl({
      beneficiaryName: ATELIER.ibanHolder,
      iban: ATELIER.iban,
      amountEur: acompteEur,
      communication: reference,
    })
  } catch (err) {
    console.error('[devis-signature] EPC QR generation failed', err)
  }

  return (
    <section className="bg-(--color-paper) border border-(--color-bronze)/40 p-6 md:p-8">
      <h2 className="text-xl text-(--color-ink) mb-2 font-[family-name:var(--font-display)]">
        {tt.paymentTitle}
      </h2>
      <p className="text-sm text-(--color-charcoal) mb-5 leading-relaxed">{tt.paymentInstructions}</p>

      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
              {tt.paymentBeneficiary}
            </dt>
            <dd className="text-(--color-ink)">{ATELIER.ibanHolder}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
              {tt.paymentIban}
            </dt>
            <dd className="text-(--color-ink) font-mono">{ATELIER.iban}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
              {tt.paymentAmount}
            </dt>
            <dd className="text-(--color-bronze) font-semibold">{formatEur(acompteEur)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
              {tt.paymentReference}
            </dt>
            <dd className="text-(--color-ink) font-mono bg-(--color-canvas) border border-(--color-frame) px-3 py-2 inline-block">
              {reference}
            </dd>
          </div>
        </dl>

        {qrDataUrl && (
          <div className="flex flex-col items-center bg-white border border-(--color-frame) p-3 max-w-[180px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="EPC QR — scannez avec votre app bancaire"
              className="w-36 h-36"
            />
            <p className="mt-2 text-[10px] uppercase tracking-[0.15em] text-stone-700 text-center leading-tight">
              {locale === 'fr'
                ? 'Scanner avec votre app bancaire'
                : 'Scan met uw bank-app'}
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-(--color-stone)">{tt.paymentRefHint}</p>
    </section>
  )
}
