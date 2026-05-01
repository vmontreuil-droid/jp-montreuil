import * as React from 'react'
import { Layout, Section, Text, Hr, text, colors } from '../components/Layout'

type Props = {
  recipientName: string
  body: string
  locale: 'fr' | 'nl'
  /** Quote-blok van het oorspronkelijke bericht (optioneel) */
  originalMessage?: { date: Date; preview: string }
}

export function ReplyToMessage({ recipientName, body, locale, originalMessage }: Props) {
  const isFR = locale === 'fr'
  const greeting = isFR ? `Bonjour ${recipientName},` : `Beste ${recipientName},`
  const signoff = isFR ? 'Cordialement,' : 'Met vriendelijke groeten,'
  const preheader = isFR
    ? `Réponse de Jean-Pierre Montreuil`
    : `Antwoord van Jean-Pierre Montreuil`

  return (
    <Layout preheader={preheader} lang={locale}>
      <Text style={{ ...text.body, marginBottom: 18 }}>{greeting}</Text>

      <div
        style={{
          fontFamily: text.body.fontFamily,
          fontSize: text.body.fontSize,
          lineHeight: text.body.lineHeight,
          color: colors.ink,
          whiteSpace: 'pre-wrap',
          marginBottom: 28,
        }}
      >
        {body}
      </div>

      <Text style={{ ...text.body, marginBottom: 4 }}>{signoff}</Text>
      <Text
        style={{
          fontFamily: text.h2.fontFamily,
          fontSize: 22,
          color: colors.ink,
          margin: '0 0 4px',
        }}
      >
        Jean-Pierre Montreuil
      </Text>
      <Text style={{ ...text.small, margin: '0 0 24px' }}>
        {isFR ? 'Peintre · Atelier Montreuil' : 'Schilder · Atelier Montreuil'}
      </Text>

      {originalMessage && (
        <>
          <Hr style={{ borderColor: colors.border, margin: '8px 0 20px' }} />
          <Text style={{ ...text.eyebrow, marginBottom: 8 }}>
            {isFR
              ? `Votre message du ${originalMessage.date.toLocaleDateString('fr-BE', { dateStyle: 'long' })}`
              : `Uw bericht van ${originalMessage.date.toLocaleDateString('nl-BE', { dateStyle: 'long' })}`}
          </Text>
          <Section
            style={{
              backgroundColor: colors.canvas,
              border: `1px solid ${colors.border}`,
              padding: 14,
              borderRadius: 4,
            }}
          >
            <Text
              style={{
                fontFamily: text.body.fontFamily,
                fontSize: 13,
                lineHeight: '1.5',
                color: colors.charcoal,
                fontStyle: 'italic',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {originalMessage.preview}
            </Text>
          </Section>
        </>
      )}
    </Layout>
  )
}
