import * as React from 'react'
import { Layout, Section, Text, Hr, Link, Img, text, colors, fonts } from '../components/Layout'

type Props = {
  recipientName: string
  locale: 'fr' | 'nl'
  caption: string | null
  photoCount: number
  /** Inline preview (data:base64) van max 1 foto, voor in-mail teaser */
  previewDataUrl: string | null
  portalUrl: string
}

const COPY = {
  fr: {
    preheader: 'De nouvelles photos de votre œuvre',
    eyebrow: 'Nouvelles photos',
    title: 'Jean-Pierre a posté des nouvelles',
    greeting: (n: string) => `Bonjour ${n},`,
    intro: (count: number) =>
      count === 1
        ? 'Jean-Pierre vient d’ajouter une nouvelle photo de l’avancement de votre œuvre. Connectez-vous à votre espace client pour la découvrir.'
        : `Jean-Pierre vient d’ajouter ${count} nouvelles photos de l’avancement de votre œuvre. Connectez-vous à votre espace client pour les découvrir.`,
    captionLabel: 'Mot de Jean-Pierre',
    photoAlt: 'Aperçu',
    moreNote: (count: number) =>
      count > 1
        ? `Cet aperçu n’est qu’une des ${count} photos — connectez-vous pour voir l’ensemble.`
        : '',
    cta: 'Voir mon dossier',
    replyNote:
      'Vous voulez réagir, poser une question ou simplement remercier ? Vous pouvez répondre directement à cet e-mail — Jean-Pierre vous lira personnellement.',
    signoff: 'Bien à vous,',
    role: 'Artiste peintre · Atelier Montreuil',
  },
  nl: {
    preheader: 'Nieuwe foto’s van uw werk',
    eyebrow: 'Nieuwe foto’s',
    title: 'Jean-Pierre heeft nieuws gepost',
    greeting: (n: string) => `Beste ${n},`,
    intro: (count: number) =>
      count === 1
        ? 'Jean-Pierre heeft een nieuwe foto toegevoegd van de voortgang van uw werk. Log in op uw klantenportaal om ze te bekijken.'
        : `Jean-Pierre heeft ${count} nieuwe foto’s toegevoegd van de voortgang van uw werk. Log in op uw klantenportaal om ze te bekijken.`,
    captionLabel: 'Woordje van Jean-Pierre',
    photoAlt: 'Voorvertoning',
    moreNote: (count: number) =>
      count > 1
        ? `Dit is slechts één van de ${count} foto’s — log in om ze allemaal te zien.`
        : '',
    cta: 'Mijn dossier bekijken',
    replyNote:
      'Wenst u te reageren, een vraag te stellen of simpelweg te bedanken? U kunt rechtstreeks op deze mail antwoorden — Jean-Pierre leest u persoonlijk.',
    signoff: 'Met vriendelijke groet,',
    role: 'Kunstschilder · Atelier Montreuil',
  },
} as const

export function ProgressUpdate(p: Props) {
  const c = COPY[p.locale]

  return (
    <Layout preheader={c.preheader} lang={p.locale}>
      <Text style={text.eyebrow}>{c.eyebrow}</Text>
      <Text style={text.h1}>{c.title}</Text>

      <Text style={{ ...text.body, marginBottom: 18 }}>{c.greeting(p.recipientName)}</Text>
      <Text style={{ ...text.body, marginBottom: 24 }}>{c.intro(p.photoCount)}</Text>

      {p.previewDataUrl && (
        <Section style={{ textAlign: 'center', margin: '0 0 24px' }}>
          <Img
            src={p.previewDataUrl}
            alt={c.photoAlt}
            width="520"
            style={{
              maxWidth: '100%',
              height: 'auto',
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              display: 'block',
              margin: '0 auto',
            }}
          />
          {p.photoCount > 1 && (
            <Text
              style={{
                ...text.small,
                fontStyle: 'italic',
                marginTop: 10,
                marginBottom: 0,
              }}
            >
              {c.moreNote(p.photoCount)}
            </Text>
          )}
        </Section>
      )}

      {p.caption && (
        <Section
          style={{
            backgroundColor: colors.canvas,
            border: `1px solid ${colors.border}`,
            borderLeft: `3px solid ${colors.bronze}`,
            padding: '14px 18px',
            marginBottom: 26,
            borderRadius: 4,
          }}
        >
          <Text
            style={{
              fontFamily: text.label.fontFamily,
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              color: colors.stone,
              fontWeight: 600,
              margin: '0 0 8px',
            }}
          >
            {c.captionLabel}
          </Text>
          <Text
            style={{
              ...text.body,
              fontStyle: 'italic',
              whiteSpace: 'pre-wrap',
              margin: 0,
              color: colors.charcoal,
            }}
          >
            {p.caption}
          </Text>
        </Section>
      )}

      <Section style={{ textAlign: 'center', margin: '8px 0 28px' }}>
        <Link
          href={p.portalUrl}
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

      <Hr style={{ borderColor: colors.border, margin: '0 0 18px' }} />
      <Text style={{ ...text.small, fontStyle: 'italic', marginBottom: 22 }}>{c.replyNote}</Text>

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
