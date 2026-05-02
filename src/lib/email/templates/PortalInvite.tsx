import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors, fonts } from '../components/Layout'

type Props = {
  recipientName?: string
  /** Optional persoonlijke boodschap van JP */
  message?: string
  albumTitle: string
  /** Magic-link URL — laat de bezoeker meteen inloggen op /portail */
  actionUrl: string
  /** Aantal foto's, voor in de tekst */
  photoCount?: number
  locale: 'fr' | 'nl'
}

export function PortalInvite({
  recipientName,
  message,
  albumTitle,
  actionUrl,
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
    ? `J'ai créé pour vous un espace privé où retrouver vos photos de « ${albumTitle} » à tout moment.`
    : `Ik heb een privé-ruimte voor u aangemaakt waar u uw foto's van "${albumTitle}" altijd kunt terugvinden.`

  const explainer = isFR
    ? photoCount
      ? `L'album contient ${photoCount} photo${photoCount > 1 ? 's' : ''} en haute résolution.`
      : 'Vos photos vous y attendent en haute résolution.'
    : photoCount
      ? `Het album bevat ${photoCount} foto${photoCount > 1 ? '\'s' : ''} in hoge resolutie.`
      : 'Uw foto\'s staan klaar in hoge resolutie.'

  const portalNote = isFR
    ? 'Cliquez sur le bouton ci-dessous — vous serez automatiquement connecté(e). Aucun mot de passe à retenir.'
    : 'Klik op de knop hieronder — u wordt automatisch ingelogd. Geen wachtwoord om te onthouden.'

  const buttonLabel = isFR ? 'Accéder à mes photos' : 'Mijn foto\'s bekijken'

  const validityNote = isFR
    ? 'Ce lien est valide 1 heure. Si vous le manquez, demandez-en un nouveau sur montreuil.be/portail/login.'
    : 'Deze link is 1 uur geldig. Mist u hem, vraag dan een nieuwe aan op montreuil.be/portail/login.'

  const futureNote = isFR
    ? 'À l\'avenir, vous pourrez vous reconnecter à tout moment via /portail pour retrouver tous vos albums en un clic.'
    : 'In de toekomst kunt u zich op elk moment opnieuw aanmelden via /portail om al uw albums in één klik terug te vinden.'

  const signoff = isFR ? 'Cordialement,' : 'Met vriendelijke groeten,'
  const preheader = isFR
    ? `Vos photos « ${albumTitle} » — Atelier Montreuil`
    : `Uw foto's "${albumTitle}" — Atelier Montreuil`

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

      <Text style={{ ...text.body, marginBottom: 8 }}>{explainer}</Text>
      <Text style={{ ...text.body, marginBottom: 24 }}>{portalNote}</Text>

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
                  href={actionUrl}
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

      <Text style={{ ...text.small, fontStyle: 'italic', marginBottom: 22 }}>{validityNote}</Text>

      <Hr style={{ borderColor: colors.border, margin: '20px 0 18px' }} />
      <Text style={{ ...text.small, marginBottom: 22 }}>{futureNote}</Text>

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
