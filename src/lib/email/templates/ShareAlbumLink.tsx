import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors, fonts } from '../components/Layout'

type Props = {
  recipientName: string
  /** Optionele persoonlijke boodschap */
  message?: string
  albumTitle: string
  albumUrl: string
  /** Aantal foto's, voor in de tekst — optioneel */
  photoCount?: number
  locale: 'fr' | 'nl'
}

export function ShareAlbumLink({
  recipientName,
  message,
  albumTitle,
  albumUrl,
  photoCount,
  locale,
}: Props) {
  const isFR = locale === 'fr'

  const greeting = recipientName
    ? isFR
      ? `Bonjour ${recipientName},`
      : `Beste ${recipientName},`
    : isFR
      ? 'Bonjour,'
      : 'Hallo,'

  const intro = isFR
    ? `Voici le lien privé vers l'album photo « ${albumTitle} ».`
    : `Hier is de privé link naar het foto-album "${albumTitle}".`

  const explainer = isFR
    ? photoCount
      ? `L'album contient ${photoCount} photo${photoCount > 1 ? 's' : ''} que vous pouvez visualiser et télécharger en taille originale.`
      : 'Vous pouvez visualiser et télécharger les photos en taille originale.'
    : photoCount
      ? `Het album bevat ${photoCount} foto${photoCount > 1 ? '\'s' : ''} die u kunt bekijken en downloaden in originele grootte.`
      : 'U kunt de foto\'s bekijken en downloaden in originele grootte.'

  const buttonLabel = isFR ? 'Voir l\'album' : 'Album bekijken'

  const fallbackHint = isFR
    ? 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :'
    : 'Werkt de knop niet? Kopieer deze link in uw browser:'

  const privateNote = isFR
    ? 'Ce lien est privé — merci de ne pas le partager publiquement.'
    : 'Deze link is privé — gelieve hem niet publiek te delen.'

  const signoff = isFR ? 'Cordialement,' : 'Met vriendelijke groeten,'
  const preheader = isFR
    ? `Album photo « ${albumTitle} » — Atelier Montreuil`
    : `Foto-album "${albumTitle}" — Atelier Montreuil`

  return (
    <Layout preheader={preheader} lang={locale}>
      <Text style={{ ...text.body, marginBottom: 18 }}>{greeting}</Text>

      <Text style={{ ...text.body, marginBottom: 12 }}>{intro}</Text>

      {message && message.trim() && (
        <div
          style={{
            fontFamily: text.body.fontFamily,
            fontSize: text.body.fontSize,
            lineHeight: text.body.lineHeight,
            color: colors.ink,
            whiteSpace: 'pre-wrap',
            margin: '18px 0 22px',
            padding: '14px 16px',
            backgroundColor: colors.bronzeSoft,
            borderLeft: `3px solid ${colors.bronze}`,
          }}
        >
          {message}
        </div>
      )}

      <Text style={{ ...text.body, marginBottom: 24 }}>{explainer}</Text>

      {/* CTA-knop — bulletproof button via table om door alle clients te
          renderen (Outlook gebruikt VML niet hier omdat 't gewoon padding+bg
          is, maar table-cell zorgt dat 't centeert) */}
      <Section style={{ textAlign: 'center', margin: '8px 0 28px' }}>
        <table cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: '0 auto' }}>
          <tbody>
            <tr>
              <td
                style={{
                  backgroundColor: colors.bronze,
                  borderRadius: 4,
                  padding: '14px 32px',
                }}
              >
                <Link
                  href={albumUrl}
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: colors.white,
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  {buttonLabel}
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Text style={{ ...text.small, marginBottom: 6 }}>{fallbackHint}</Text>
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: 12,
          color: colors.charcoal,
          wordBreak: 'break-all',
          margin: '0 0 24px',
          padding: '8px 12px',
          backgroundColor: colors.canvas,
          border: `1px solid ${colors.border}`,
          borderRadius: 4,
        }}
      >
        {albumUrl}
      </Text>

      <Hr style={{ borderColor: colors.border, margin: '20px 0 18px' }} />
      <Text style={{ ...text.small, fontStyle: 'italic', marginBottom: 22 }}>{privateNote}</Text>

      <Text style={{ ...text.body, marginBottom: 4 }}>{signoff}</Text>
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
        {isFR ? 'Artiste peintre · Atelier Montreuil' : 'Kunstschilder · Atelier Montreuil'}
      </Text>
    </Layout>
  )
}
