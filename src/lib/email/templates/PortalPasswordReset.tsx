import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors, fonts } from '../components/Layout'

type Props = {
  actionUrl: string
  locale: 'fr' | 'nl'
}

/**
 * Mail die verstuurd wordt wanneer een klant op /portail/login op
 * "wachtwoord vergeten" klikt. Bevat een one-time link die hen via
 * /auth/confirm doorstuurt naar /portail/reset-password.
 */
export function PortalPasswordReset({ actionUrl, locale }: Props) {
  const isFR = locale === 'fr'

  const greeting = isFR ? 'Bonjour,' : 'Hallo,'

  const intro = isFR
    ? 'Vous avez demandé à réinitialiser le mot de passe de votre espace client. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.'
    : 'U heeft gevraagd om het wachtwoord van uw klantenportaal opnieuw in te stellen. Klik op de knop hieronder om een nieuw wachtwoord te kiezen.'

  const buttonLabel = isFR ? 'Définir un nouveau mot de passe' : 'Nieuw wachtwoord instellen'

  const validityNote = isFR
    ? 'Ce lien est valide 1 heure et ne peut être utilisé qu’une seule fois.'
    : 'Deze link is 1 uur geldig en kan slechts één keer gebruikt worden.'

  const securityNote = isFR
    ? "Vous n'avez pas demandé de réinitialisation ? Vous pouvez ignorer cet e-mail — votre mot de passe actuel reste valide."
    : 'Hebt u geen reset aangevraagd? U kunt deze e-mail negeren — uw huidige wachtwoord blijft geldig.'

  const signoff = isFR ? 'Cordialement,' : 'Met vriendelijke groeten,'

  const preheader = isFR
    ? 'Réinitialisation de votre mot de passe — Atelier Montreuil'
    : 'Wachtwoord opnieuw instellen — Atelier Montreuil'

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
