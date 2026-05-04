import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors, fonts } from '../components/Layout'

type Props = {
  recipientName: string
  paidAt: Date
  /** Lijn naar de portail-detailpagina van het devis (waar de date-picker staat) */
  portalUrl: string
  locale: 'fr' | 'nl'
}

const COPY = {
  fr: {
    preheader: 'Solde bien reçu — choisissez votre date de livraison',
    eyebrow: 'Solde reçu',
    title: 'Merci, votre solde est bien reçu',
    lead: 'Le solde de votre commande est arrivé. Il ne reste plus qu’à convenir d’un moment pour la livraison en main propre.',
    instructions: 'Connectez-vous à votre espace client pour proposer une date et une heure, indiquer l’adresse de livraison et préciser ce que nous devons faire si vous n’êtes pas chez vous.',
    cta: 'Choisir ma date de livraison',
    confirmation: 'Dès que Jean-Pierre confirme votre proposition, vous recevrez un e-mail de confirmation avec le rendez-vous final.',
    signoff: 'Cordialement,',
    paidLine: 'Solde reçu le',
  },
  nl: {
    preheader: 'Saldo ontvangen — kies uw leveringsdatum',
    eyebrow: 'Saldo ontvangen',
    title: 'Bedankt, uw saldo is goed ontvangen',
    lead: 'Het saldo van uw bestelling is binnen. Nu rest enkel nog een afspraak voor de persoonlijke levering.',
    instructions: 'Log in op uw klantenportaal om een datum en uur voor te stellen, het leveringsadres op te geven en aan te duiden wat we moeten doen indien u niet thuis bent.',
    cta: 'Mijn leveringsdatum kiezen',
    confirmation: 'Zodra Jean-Pierre uw voorstel bevestigt, krijgt u een bevestigingsmail met de definitieve afspraak.',
    signoff: 'Met vriendelijke groeten,',
    paidLine: 'Saldo ontvangen op',
  },
} as const

export function DeliveryDateRequest(p: Props) {
  const c = COPY[p.locale]
  const dateLocale = p.locale === 'fr' ? 'fr-BE' : 'nl-BE'

  return (
    <Layout preheader={c.preheader} lang={p.locale}>
      <Text style={text.eyebrow}>{c.eyebrow}</Text>
      <Text style={text.h1}>{c.title}</Text>
      <Text style={{ ...text.body, marginBottom: 12 }}>
        {p.locale === 'fr' ? `Bonjour ${p.recipientName},` : `Beste ${p.recipientName},`}
      </Text>
      <Text style={{ ...text.small, fontStyle: 'italic', marginBottom: 18 }}>
        {c.paidLine}{' '}
        {p.paidAt.toLocaleDateString(dateLocale, { dateStyle: 'long' })}
      </Text>

      <Text style={{ ...text.body, marginBottom: 20 }}>{c.lead}</Text>
      <Text style={{ ...text.body, marginBottom: 24 }}>{c.instructions}</Text>

      <Section style={{ textAlign: 'center', margin: '8px 0 28px' }}>
        <Link
          href={p.portalUrl}
          style={{
            display: 'inline-block',
            padding: '14px 28px',
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
          {c.cta}
        </Link>
      </Section>

      <Text style={{ ...text.small, marginBottom: 22, fontStyle: 'italic' }}>{c.confirmation}</Text>

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
