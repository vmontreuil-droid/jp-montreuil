import * as React from 'react'
import { Img } from '@react-email/components'
import { Layout, Section, Text, Hr, Link, text, colors, fonts } from '../components/Layout'

type Props = {
  recipientName: string
  /** 'acompte' = voorschot vóór uitvoering, 'balance' = saldo na levering */
  paymentType: 'acompte' | 'balance'
  amountEur: number
  reference: string
  iban: string
  ibanHolder: string
  /** EPC QR als data-URL (base64 PNG). Null = QR niet inline tonen. */
  qrDataUrl: string | null
  /** Lijn naar de portail-detailpagina van het devis */
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
    acompte: {
      preheader: 'Coordonnées pour votre acompte',
      eyebrow: 'Acompte',
      title: 'Coordonnées de paiement',
      lead: 'Voici les coordonnées pour régler votre acompte. Si vous avez déjà payé, considérez ce rappel comme non avenu — la confirmation vous parviendra dès que Jean-Pierre reçoit le virement.',
    },
    balance: {
      preheader: 'Coordonnées pour le solde',
      eyebrow: 'Solde',
      title: 'Coordonnées de paiement — solde',
      lead: 'Voici les coordonnées pour régler le solde de votre commande. Une fois le paiement reçu, votre œuvre est entièrement à vous.',
    },
    benefLabel: 'Bénéficiaire',
    ibanLabel: 'IBAN',
    amountLabel: 'Montant',
    refLabel: 'Communication structurée',
    refHint: 'Indiquez exactement cette communication — la plupart des apps bancaires l’insèrent automatiquement en scannant le QR ci-dessous.',
    qrHint: 'Scanner avec votre app bancaire (Bancontact, KBC Mobile, Belfius, ING…).',
    portalCta: 'Voir mon dossier en ligne',
    signoff: 'Cordialement,',
  },
  nl: {
    acompte: {
      preheader: 'Gegevens voor uw voorschot',
      eyebrow: 'Voorschot',
      title: 'Betalingsgegevens',
      lead: 'Hier zijn de gegevens om uw voorschot te betalen. Indien u reeds betaald hebt, mag u deze herinnering negeren — de bevestiging volgt zodra Jean-Pierre de overschrijving ontvangt.',
    },
    balance: {
      preheader: 'Gegevens voor het saldo',
      eyebrow: 'Saldo',
      title: 'Betalingsgegevens — saldo',
      lead: 'Hier zijn de gegevens om het saldo van uw bestelling te betalen. Zodra de betaling ontvangen is, is uw werk volledig van u.',
    },
    benefLabel: 'Begunstigde',
    ibanLabel: 'IBAN',
    amountLabel: 'Bedrag',
    refLabel: 'Gestructureerde mededeling',
    refHint: 'Vermeld exact deze mededeling — de meeste bankapps vullen ze automatisch in bij het scannen van de QR-code hieronder.',
    qrHint: 'Scannen met uw bankapp (Bancontact, KBC Mobile, Belfius, ING…).',
    portalCta: 'Mijn dossier online bekijken',
    signoff: 'Met vriendelijke groeten,',
  },
} as const

export function PaymentReminder(p: Props) {
  const c = COPY[p.locale]
  const variant = c[p.paymentType]
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
    <Layout preheader={variant.preheader} lang={p.locale}>
      <Text style={text.eyebrow}>{variant.eyebrow}</Text>
      <Text style={text.h1}>{variant.title}</Text>
      <Text style={{ ...text.body, marginBottom: 18 }}>
        {p.locale === 'fr' ? `Bonjour ${p.recipientName},` : `Beste ${p.recipientName},`}
      </Text>
      <Text style={{ ...text.body, marginBottom: 22 }}>{variant.lead}</Text>

      <Hr style={{ borderColor: colors.border, margin: '0 0 22px' }} />

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
          {formatEur(p.amountEur)}
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
          <Text
            style={{
              ...text.small,
              marginTop: 8,
              fontStyle: 'italic',
            }}
          >
            {c.qrHint}
          </Text>
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
