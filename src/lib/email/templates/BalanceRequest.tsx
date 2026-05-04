import * as React from 'react'
import { Img } from '@react-email/components'
import { Layout, Section, Text, Hr, Link, text, colors, fonts } from '../components/Layout'

type Props = {
  recipientName: string
  /** Totaal TTC (volledige prijs) */
  totalEur: number
  /** Voorschot dat reeds betaald werd */
  acompteEur: number
  /** Datum waarop voorschot binnenkwam */
  acompteReceivedAt: Date | null
  /** Saldo nog te betalen */
  balanceEur: number
  /** Gestructureerde mededeling voor het saldo (anders dan voorschot) */
  reference: string
  iban: string
  ibanHolder: string
  qrDataUrl: string | null
  portalUrl: string
  locale: 'fr' | 'nl'
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}

const COPY = {
  fr: {
    preheader: 'Votre œuvre est prête — solde à régler',
    eyebrow: 'Œuvre prête',
    title: 'Votre œuvre est prête',
    lead: 'Bonne nouvelle : Jean-Pierre vient de terminer votre œuvre. Voici le décompte du solde à régler avant la livraison.',
    statementTitle: 'Décompte',
    totalLabel: 'Total de la commande',
    acompteLabel: 'Acompte versé',
    acompteOn: 'le',
    balanceLabel: 'Solde à régler',
    paymentTitle: 'Coordonnées de paiement',
    paymentLead: 'Pour ce solde, utilisez la nouvelle communication structurée ci-dessous (différente de celle de l’acompte).',
    benefLabel: 'Bénéficiaire',
    ibanLabel: 'IBAN',
    amountLabel: 'Montant',
    refLabel: 'Communication structurée',
    refHint: 'Veillez à utiliser cette nouvelle communication — pas celle de l’acompte.',
    qrHint: 'Scanner avec votre app bancaire (Bancontact, KBC, Belfius, ING…).',
    portalCta: 'Voir mon dossier en ligne',
    nextStep: 'Dès réception du solde, nous vous proposerons de choisir une date pour la livraison.',
    signoff: 'Cordialement,',
  },
  nl: {
    preheader: 'Uw werk is klaar — saldo te betalen',
    eyebrow: 'Werk klaar',
    title: 'Uw werk is klaar',
    lead: 'Goed nieuws: Jean-Pierre heeft uw werk net afgewerkt. Hier de afrekening van het saldo dat nog te betalen valt vóór de levering.',
    statementTitle: 'Afrekening',
    totalLabel: 'Totaal bestelling',
    acompteLabel: 'Voorschot betaald',
    acompteOn: 'op',
    balanceLabel: 'Saldo te betalen',
    paymentTitle: 'Betalingsgegevens',
    paymentLead: 'Voor dit saldo gebruikt u de nieuwe gestructureerde mededeling hieronder (anders dan die van het voorschot).',
    benefLabel: 'Begunstigde',
    ibanLabel: 'IBAN',
    amountLabel: 'Bedrag',
    refLabel: 'Gestructureerde mededeling',
    refHint: 'Gebruik deze nieuwe mededeling — niet die van het voorschot.',
    qrHint: 'Scannen met uw bankapp (Bancontact, KBC, Belfius, ING…).',
    portalCta: 'Mijn dossier online bekijken',
    nextStep: 'Zodra het saldo ontvangen is, vragen we u een datum voor de levering te kiezen.',
    signoff: 'Met vriendelijke groeten,',
  },
} as const

export function BalanceRequest(p: Props) {
  const c = COPY[p.locale]
  const dateLocale = p.locale === 'fr' ? 'fr-BE' : 'nl-BE'
  const labelStyle = {
    fontFamily: text.label.fontFamily,
    fontSize: text.label.fontSize,
    letterSpacing: text.label.letterSpacing,
    textTransform: text.label.textTransform,
    color: colors.stone,
    fontWeight: text.label.fontWeight,
    margin: '0 0 4px',
  } as const
  const valueStyle = {
    fontFamily: text.body.fontFamily,
    fontSize: 14,
    color: colors.ink,
    margin: '0 0 14px',
  } as const

  return (
    <Layout preheader={c.preheader} lang={p.locale}>
      <Text style={text.eyebrow}>{c.eyebrow}</Text>
      <Text style={text.h1}>{c.title}</Text>
      <Text style={{ ...text.body, marginBottom: 18 }}>
        {p.locale === 'fr' ? `Bonjour ${p.recipientName},` : `Beste ${p.recipientName},`}
      </Text>
      <Text style={{ ...text.body, marginBottom: 22 }}>{c.lead}</Text>

      {/* Décompte */}
      <Section
        style={{
          backgroundColor: colors.canvas,
          border: `1px solid ${colors.border}`,
          padding: '18px 22px',
          marginBottom: 22,
        }}
      >
        <Text style={{ ...text.label, color: colors.bronze, margin: '0 0 12px' }}>
          {c.statementTitle}
        </Text>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  color: colors.charcoal,
                  padding: '4px 0',
                }}
              >
                {c.totalLabel}
              </td>
              <td
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 14,
                  color: colors.ink,
                  textAlign: 'right',
                  padding: '4px 0',
                }}
              >
                {formatEur(p.totalEur)}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: colors.stone,
                  padding: '4px 0',
                }}
              >
                − {c.acompteLabel}
                {p.acompteReceivedAt && (
                  <span style={{ color: colors.stone }}>
                    {' '}
                    {c.acompteOn}{' '}
                    {p.acompteReceivedAt.toLocaleDateString(dateLocale, {
                      dateStyle: 'long',
                    })}
                  </span>
                )}
              </td>
              <td
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  color: colors.charcoal,
                  textAlign: 'right',
                  padding: '4px 0',
                }}
              >
                − {formatEur(p.acompteEur)}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 14,
                  color: colors.ink,
                  fontWeight: 600,
                  padding: '8px 0 0',
                  borderTop: `2px solid ${colors.border}`,
                }}
              >
                {c.balanceLabel}
              </td>
              <td
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 18,
                  color: colors.bronze,
                  fontWeight: 600,
                  textAlign: 'right',
                  padding: '8px 0 0',
                  borderTop: `2px solid ${colors.border}`,
                }}
              >
                {formatEur(p.balanceEur)}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Hr style={{ borderColor: colors.border, margin: '0 0 22px' }} />

      <Text style={text.h2}>{c.paymentTitle}</Text>
      <Text style={{ ...text.body, marginBottom: 18 }}>{c.paymentLead}</Text>

      <Section
        style={{
          backgroundColor: colors.canvas,
          border: `1px solid ${colors.border}`,
          padding: '20px 22px',
          marginBottom: 22,
        }}
      >
        <Text style={labelStyle}>{c.benefLabel}</Text>
        <Text style={valueStyle}>{p.ibanHolder}</Text>

        <Text style={labelStyle}>{c.ibanLabel}</Text>
        <Text style={{ ...valueStyle, fontFamily: fonts.mono }}>{p.iban}</Text>

        <Text style={labelStyle}>{c.amountLabel}</Text>
        <Text style={{ ...valueStyle, color: colors.bronze, fontWeight: 600 }}>
          {formatEur(p.balanceEur)}
        </Text>

        <Text style={labelStyle}>{c.refLabel}</Text>
        <Text
          style={{
            ...valueStyle,
            fontFamily: fonts.mono,
            backgroundColor: colors.white,
            border: `1px solid ${colors.border}`,
            padding: '10px 14px',
            margin: '0 0 8px',
          }}
        >
          {p.reference}
        </Text>
        <Text style={{ ...text.small, marginBottom: 0 }}>{c.refHint}</Text>
      </Section>

      {p.qrDataUrl && (
        <Section style={{ textAlign: 'center', margin: '0 0 24px' }}>
          <Img
            src={p.qrDataUrl}
            alt="EPC QR"
            width="180"
            height="180"
            style={{
              display: 'inline-block',
              border: `1px solid ${colors.border}`,
              padding: 8,
              backgroundColor: colors.white,
            }}
          />
          <Text style={{ ...text.small, marginTop: 8, fontStyle: 'italic' }}>{c.qrHint}</Text>
        </Section>
      )}

      <Section style={{ textAlign: 'center', margin: '8px 0 28px' }}>
        <Link
          href={p.portalUrl}
          style={{
            display: 'inline-block',
            padding: '12px 22px',
            backgroundColor: colors.bronze,
            color: colors.white,
            textDecoration: 'none',
            fontFamily: fonts.sans,
            fontSize: 13,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            borderRadius: 4,
            fontWeight: 600,
          }}
        >
          {c.portalCta}
        </Link>
      </Section>

      <Text style={{ ...text.small, marginBottom: 22, fontStyle: 'italic' }}>{c.nextStep}</Text>

      <Hr style={{ borderColor: colors.border, margin: '20px 0 18px' }} />

      <Text style={{ ...text.body, marginBottom: 4 }}>{c.signoff}</Text>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 22,
          color: colors.ink,
          margin: '0 0 4px',
        }}
      >
        Jean-Pierre Montreuil
      </Text>
      <Text style={{ ...text.small, margin: 0 }}>
        {p.locale === 'fr' ? 'Artiste peintre · Atelier Montreuil' : 'Kunstschilder · Atelier Montreuil'}
      </Text>
    </Layout>
  )
}
