import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors } from '../components/Layout'
import { PUBLIC_BASE_URL } from '@/lib/public-url'
import { localePath } from '@/lib/links'

type Status =
  | 'acompte_recu'
  | 'en_cours'
  | 'livre'
  | 'complete'

const COPY_FR: Record<Status, { title: string; body: string }> = {
  acompte_recu: {
    title: 'Acompte bien reçu',
    body: 'Merci, votre acompte a bien été reçu. Jean-Pierre commence dès à présent la réalisation de votre œuvre. Vous recevrez une nouvelle notification quand elle sera terminée.',
  },
  en_cours: {
    title: 'Votre œuvre est en cours',
    body: 'Jean-Pierre travaille actuellement à votre œuvre. Comptez 5 à 20 jours ouvrables selon la complexité — vous recevrez un message dès qu’elle sera prête.',
  },
  livre: {
    title: 'Œuvre livrée — merci !',
    body:
      'Votre œuvre vous a été remise en mains propres. Le solde ayant déjà été réglé, tout est en ordre — il ne vous reste qu’à profiter pleinement de votre tableau. Jean-Pierre vous remercie sincèrement pour la confiance que vous lui avez accordée et espère que cette œuvre vous accompagnera longtemps.',
  },
  complete: {
    title: 'Commande clôturée',
    body: 'Le solde a bien été reçu. Merci pour votre confiance — au plaisir de retravailler avec vous.',
  },
}

const COPY_NL: Record<Status, { title: string; body: string }> = {
  acompte_recu: {
    title: 'Voorschot ontvangen',
    body: 'Bedankt, uw voorschot is goed ontvangen. Jean-Pierre begint nu aan de uitvoering van uw werk. U krijgt een nieuwe melding zodra het klaar is.',
  },
  en_cours: {
    title: 'Uw werk is in uitvoering',
    body: 'Jean-Pierre werkt nu aan uw werk. Reken op 5 tot 20 werkdagen afhankelijk van de complexiteit — u krijgt een bericht zodra het klaar is.',
  },
  livre: {
    title: 'Werk afgeleverd — bedankt!',
    body:
      'Uw werk is persoonlijk overhandigd. Het saldo is reeds vereffend, dus alles is in orde — u hoeft enkel nog te genieten van uw schilderij. Jean-Pierre dankt u oprecht voor het vertrouwen en hoopt dat dit werk u nog lang vergezelt.',
  },
  complete: {
    title: 'Bestelling afgerond',
    body: 'Het saldo is goed ontvangen. Bedankt voor uw vertrouwen — graag tot een volgende keer.',
  },
}

type Props = {
  clientName: string
  status: Status
  locale: 'fr' | 'nl'
  signToken: string | null
  paymentReference: string | null
  paymentAmountEur: number | null
}

export function StatusUpdate(p: Props) {
  const isFR = p.locale === 'fr'
  const copy = isFR ? COPY_FR[p.status] : COPY_NL[p.status]
  const linkUrl = p.signToken
    ? `${PUBLIC_BASE_URL}${localePath(p.locale, `/devis-signature/${p.signToken}`)}`
    : null
  const linkLabel = isFR ? 'Voir le devis' : 'Bekijk de offerte'

  return (
    <Layout preheader={copy.title} lang={p.locale}>
      <Text style={text.eyebrow}>
        {isFR ? 'Mise à jour de votre commande' : 'Update van uw bestelling'}
      </Text>
      <Text style={text.h1}>{copy.title}</Text>
      <Text style={{ ...text.small, marginBottom: 18 }}>{p.clientName}</Text>

      <Hr style={{ borderColor: colors.border, margin: '0 0 18px' }} />

      <Text style={{ ...text.body, marginBottom: 18 }}>{copy.body}</Text>

      {p.status === 'acompte_recu' && p.paymentAmountEur != null && p.paymentAmountEur > 0 && (
        <Section
          style={{
            backgroundColor: colors.canvas,
            border: `1px solid ${colors.border}`,
            padding: '14px 18px',
            marginBottom: 22,
          }}
        >
          <Text style={{ ...text.small, margin: '0 0 6px' }}>
            {isFR ? 'À régler à la livraison (solde)' : 'Nog te betalen bij levering (saldo)'}
          </Text>
          <Text
            style={{
              ...text.body,
              fontWeight: 600,
              margin: 0,
              color: colors.bronze,
            }}
          >
            {p.paymentAmountEur.toFixed(2)} €
          </Text>
        </Section>
      )}

      {linkUrl && (
        <Link
          href={linkUrl}
          style={{
            display: 'inline-block',
            padding: '12px 22px',
            backgroundColor: colors.bronze,
            color: colors.white,
            textDecoration: 'none',
            fontFamily: text.body.fontFamily,
            fontSize: 13,
            letterSpacing: '0.15em',
            textTransform: 'uppercase' as const,
            borderRadius: 4,
          }}
        >
          {linkLabel}
        </Link>
      )}
    </Layout>
  )
}
