import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors, fonts } from '../components/Layout'

type Props = {
  /** Magic-link URL die de bezoeker doorstuurt naar /portail */
  actionUrl: string
  locale: 'fr' | 'nl'
}

/**
 * Mail die verstuurd wordt wanneer een bestaande klant op /portail/login
 * een nieuwe login-link aanvraagt. Sober, kort, geen marketing — gewoon
 * de link met een knop.
 */
export function PortalMagicLink({ actionUrl, locale }: Props) {
  const isFR = locale === 'fr'

  const greeting = isFR ? 'Bonjour,' : 'Hallo,'

  const intro = isFR
    ? 'Voici votre lien de connexion personnel pour accéder à vos photos. Cliquez sur le bouton ci-dessous — vous serez automatiquement connecté(e). Aucun mot de passe à retenir.'
    : "Hier is uw persoonlijke login-link om uw foto's te bekijken. Klik op de knop hieronder — u wordt automatisch ingelogd. Geen wachtwoord om te onthouden."

  const buttonLabel = isFR ? 'Accéder à mes photos' : "Mijn foto's bekijken"

  const validityNote = isFR
    ? 'Ce lien est valide 1 heure. Vous pouvez en demander un nouveau à tout moment sur montreuil.be/portail/login.'
    : 'Deze link is 1 uur geldig. U kunt op elk moment een nieuwe aanvragen via montreuil.be/portail/login.'

  const securityNote = isFR
    ? "Vous n'avez pas demandé cet e-mail ? Vous pouvez l'ignorer en toute sécurité — votre compte n'a pas été modifié."
    : 'Hebt u deze e-mail niet aangevraagd? U kunt hem veilig negeren — uw account is niet gewijzigd.'

  const signoff = isFR ? 'Cordialement,' : 'Met vriendelijke groeten,'

  const preheader = isFR
    ? 'Votre lien de connexion — Atelier Montreuil'
    : 'Uw login-link — Atelier Montreuil'

  return (
    <Layout preheader={preheader} lang={locale}>
      <Text style={{ ...text.body, marginBottom: 18 }}>{greeting}</Text>

      <Text style={{ ...text.body, marginBottom: 24 }}>{intro}</Text>

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
      <Text style={{ ...text.small, marginBottom: 18 }}>{securityNote}</Text>

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
