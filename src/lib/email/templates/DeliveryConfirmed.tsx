import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors, fonts } from '../components/Layout'

type Props = {
  recipientName: string
  /** Bevestigde datum en uur van levering */
  confirmedDate: Date
  deliveryAddress: string | null
  altInstruction: string | null
  portalUrl: string
  locale: 'fr' | 'nl'
}

const COPY = {
  fr: {
    preheader: 'Livraison confirmée',
    eyebrow: 'Livraison',
    title: 'Votre livraison est confirmée',
    lead: 'Jean-Pierre a confirmé votre proposition. Voici le rendez-vous final pour la remise de votre œuvre.',
    whenLabel: 'Date & heure',
    addressLabel: 'Adresse de livraison',
    altLabel: 'En cas d’absence',
    portalCta: 'Voir mon dossier',
    note: 'Nous nous donnons rendez-vous comme convenu. En cas d’imprévu, contactez Jean-Pierre directement par e-mail ou téléphone.',
    signoff: 'À très bientôt,',
  },
  nl: {
    preheader: 'Levering bevestigd',
    eyebrow: 'Levering',
    title: 'Uw levering is bevestigd',
    lead: 'Jean-Pierre heeft uw voorstel bevestigd. Hier de definitieve afspraak voor de overhandiging van uw werk.',
    whenLabel: 'Datum & uur',
    addressLabel: 'Leveringsadres',
    altLabel: 'Bij afwezigheid',
    portalCta: 'Mijn dossier bekijken',
    note: 'We zien elkaar zoals afgesproken. Mocht er iets onverwacht tussenkomen, contacteer Jean-Pierre rechtstreeks via e-mail of telefoon.',
    signoff: 'Tot snel,',
  },
} as const

export function DeliveryConfirmed(p: Props) {
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
    whiteSpace: 'pre-wrap' as const,
  }

  return (
    <Layout preheader={c.preheader} lang={p.locale}>
      <Text style={text.eyebrow}>{c.eyebrow}</Text>
      <Text style={text.h1}>{c.title}</Text>
      <Text style={{ ...text.body, marginBottom: 18 }}>
        {p.locale === 'fr' ? `Bonjour ${p.recipientName},` : `Beste ${p.recipientName},`}
      </Text>
      <Text style={{ ...text.body, marginBottom: 22 }}>{c.lead}</Text>

      <Section
        style={{
          backgroundColor: colors.canvas,
          border: `1px solid ${colors.border}`,
          padding: '20px 22px',
          marginBottom: 22,
        }}
      >
        <Text style={labelStyle}>{c.whenLabel}</Text>
        <Text style={{ ...valueStyle, color: colors.bronze, fontWeight: 600, fontSize: 16 }}>
          {p.confirmedDate.toLocaleString(dateLocale, {
            dateStyle: 'long',
            timeStyle: 'short',
          })}
        </Text>

        {p.deliveryAddress && (
          <>
            <Text style={labelStyle}>{c.addressLabel}</Text>
            <Text style={valueStyle}>{p.deliveryAddress}</Text>
          </>
        )}

        {p.altInstruction && (
          <>
            <Text style={labelStyle}>{c.altLabel}</Text>
            <Text style={{ ...valueStyle, fontStyle: 'italic' }}>{p.altInstruction}</Text>
          </>
        )}
      </Section>

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
          }}
        >
          {c.portalCta}
        </Link>
      </Section>

      <Text style={{ ...text.small, marginBottom: 22 }}>{c.note}</Text>

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
