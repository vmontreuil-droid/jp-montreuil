import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors, fonts } from '../components/Layout'

type Props = {
  recipientName: string
  locale: 'fr' | 'nl'
  devisSubject: string | null
  totalEur: number | null
  acompteEur: number | null
  validUntil: Date
  signUrl: string
  /** Op welke mail mag de klant gewoon reageren met vragen */
  replyEmail: string
}

const COPY = {
  fr: {
    preheader: 'Votre devis expire demain — Atelier Montreuil',
    eyebrow: 'Petit rappel amical',
    title: 'Votre devis expire demain',
    greeting: (n: string) => `Bonjour ${n},`,
    intro:
      'Un petit message amical pour vous rappeler que votre devis arrive à échéance demain. Si vous souhaitez confirmer votre commande, il suffit de signer le devis en ligne — c’est l’affaire de quelques secondes.',
    summaryHeading: 'Récapitulatif',
    subjectLabel: 'Objet',
    totalLabel: 'Total TTC',
    acompteLabel: 'Acompte demandé',
    validUntilLabel: 'Valide jusqu’au',
    cta: 'Signer mon devis',
    questionTitle: 'Une question ? Un doute ?',
    questionBody:
      'N’hésitez surtout pas à répondre directement à cet e-mail. Jean-Pierre prendra le temps de vous répondre personnellement — un détail à clarifier, un délai à adapter, une option à ajouter… tout est possible.',
    noPressure:
      'Aucune pression : si le moment n’est pas idéal, vous pouvez toujours nous recontacter plus tard pour relancer la demande.',
    signoff: 'Bien à vous,',
    role: 'Artiste peintre · Atelier Montreuil',
  },
  nl: {
    preheader: 'Uw offerte vervalt morgen — Atelier Montreuil',
    eyebrow: 'Een vriendelijke herinnering',
    title: 'Uw offerte vervalt morgen',
    greeting: (n: string) => `Beste ${n},`,
    intro:
      'Een vriendelijk berichtje om u eraan te herinneren dat uw offerte morgen vervalt. Wenst u uw bestelling te bevestigen, dan volstaat het om de offerte online te ondertekenen — een kwestie van enkele seconden.',
    summaryHeading: 'Samenvatting',
    subjectLabel: 'Onderwerp',
    totalLabel: 'Totaal incl. BTW',
    acompteLabel: 'Gevraagd voorschot',
    validUntilLabel: 'Geldig tot',
    cta: 'Mijn offerte ondertekenen',
    questionTitle: 'Vragen of twijfels?',
    questionBody:
      'Antwoord gerust rechtstreeks op deze e-mail. Jean-Pierre neemt de tijd om u persoonlijk te antwoorden — een detail dat verduidelijkt moet worden, een termijn die aangepast wil zijn, een optie om toe te voegen… alles kan.',
    noPressure:
      'Geen druk: past het moment niet, dan kunt u altijd later contact opnemen om de aanvraag opnieuw op te starten.',
    signoff: 'Met vriendelijke groet,',
    role: 'Kunstschilder · Atelier Montreuil',
  },
} as const

function formatEur(value: number, locale: 'fr' | 'nl'): string {
  return `${value.toLocaleString(locale === 'fr' ? 'fr-BE' : 'nl-BE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

export function DevisExpiringReminder(p: Props) {
  const c = COPY[p.locale]
  const dateLocale = p.locale === 'fr' ? 'fr-BE' : 'nl-BE'

  const labelStyle = {
    fontFamily: text.label.fontFamily,
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: colors.stone,
    fontWeight: 600,
    margin: '0 0 4px',
  }

  const valueStyle = {
    fontFamily: text.body.fontFamily,
    fontSize: 14,
    lineHeight: '1.5',
    color: colors.ink,
    margin: '0 0 12px',
  }

  return (
    <Layout preheader={c.preheader} lang={p.locale}>
      <Text style={text.eyebrow}>{c.eyebrow}</Text>
      <Text style={text.h1}>{c.title}</Text>

      <Text style={{ ...text.body, marginBottom: 18 }}>{c.greeting(p.recipientName)}</Text>
      <Text style={{ ...text.body, marginBottom: 24 }}>{c.intro}</Text>

      {/* Récap */}
      <Section
        style={{
          backgroundColor: colors.canvas,
          border: `1px solid ${colors.border}`,
          padding: '20px 22px',
          marginBottom: 26,
          borderRadius: 4,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 18,
            color: colors.ink,
            margin: '0 0 14px',
          }}
        >
          {c.summaryHeading}
        </Text>

        {p.devisSubject && (
          <>
            <Text style={labelStyle}>{c.subjectLabel}</Text>
            <Text style={valueStyle}>{p.devisSubject}</Text>
          </>
        )}

        {p.totalEur != null && (
          <>
            <Text style={labelStyle}>{c.totalLabel}</Text>
            <Text
              style={{
                ...valueStyle,
                color: colors.bronze,
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              {formatEur(p.totalEur, p.locale)}
            </Text>
          </>
        )}

        {p.acompteEur != null && (
          <>
            <Text style={labelStyle}>{c.acompteLabel}</Text>
            <Text style={valueStyle}>{formatEur(p.acompteEur, p.locale)}</Text>
          </>
        )}

        <Text style={labelStyle}>{c.validUntilLabel}</Text>
        <Text style={{ ...valueStyle, fontWeight: 600, color: colors.bronze, margin: 0 }}>
          {p.validUntil.toLocaleDateString(dateLocale, { dateStyle: 'long' })}
        </Text>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: 'center', marginBottom: 28 }}>
        <Link
          href={p.signUrl}
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            backgroundColor: colors.bronze,
            color: colors.white,
            textDecoration: 'none',
            fontFamily: fonts.sans,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            borderRadius: 4,
          }}
        >
          {c.cta}
        </Link>
      </Section>

      <Hr style={{ borderColor: colors.border, margin: '0 0 22px' }} />

      {/* Question */}
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 18,
          color: colors.ink,
          margin: '0 0 8px',
        }}
      >
        {c.questionTitle}
      </Text>
      <Text style={{ ...text.body, marginBottom: 14 }}>{c.questionBody}</Text>
      <Text style={{ ...text.small, fontStyle: 'italic', marginBottom: 24 }}>{c.noPressure}</Text>

      <Hr style={{ borderColor: colors.border, margin: '0 0 18px' }} />

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
      <Text style={{ ...text.small, margin: 0 }}>{c.role}</Text>
    </Layout>
  )
}
