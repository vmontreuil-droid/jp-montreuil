import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors, fonts } from '../components/Layout'

type Props = {
  recipientName: string
  /** Personalized link voor wachtwoord-setup (recovery flow) */
  setupPasswordUrl: string
  /** Lijn naar de portail-dashboard (na inloggen) */
  portalUrl: string
  locale: 'fr' | 'nl'
}

/**
 * Mail die verstuurd wordt aan een nieuwe klant zodra JP een devis voor
 * hen aanmaakt. Geeft de eerste indruk van het klantenportaal en zet de
 * klant aan om een wachtwoord aan te maken voor hun account.
 */
export function PortalWelcome({
  recipientName,
  setupPasswordUrl,
  portalUrl,
  locale,
}: Props) {
  const isFR = locale === 'fr'

  const greeting = isFR ? `Bonjour ${recipientName},` : `Beste ${recipientName},`

  const intro = isFR
    ? 'Votre espace client est prêt. C’est ici que vous suivez votre commande de bout en bout : devis, signature, paiement et avancement de l’œuvre.'
    : 'Uw klantenportaal is klaar. Hier volgt u uw bestelling van begin tot einde op: offerte, ondertekening, betaling en uitvoering.'

  const action = isFR
    ? 'Pour activer votre accès, choisissez un mot de passe en cliquant ci-dessous.'
    : 'Om uw toegang te activeren, kiest u een wachtwoord via onderstaande knop.'

  const buttonLabel = isFR ? 'Définir mon mot de passe' : 'Mijn wachtwoord instellen'

  const after = isFR
    ? 'Une fois votre mot de passe défini, vous accéderez à votre espace via cette adresse :'
    : 'Zodra uw wachtwoord ingesteld is, vindt u uw portaal via dit adres:'

  const features = isFR
    ? [
        'Suivi en temps réel de votre commande',
        'Devis et facture téléchargeables',
        'Coordonnées de paiement à portée de main',
        'Communication directe avec Jean-Pierre',
      ]
    : [
        'Realtime opvolging van uw bestelling',
        'Offerte en factuur te downloaden',
        'Betalingsgegevens onder handbereik',
        'Rechtstreekse communicatie met Jean-Pierre',
      ]

  const signoff = isFR ? 'Cordialement,' : 'Met vriendelijke groeten,'

  const preheader = isFR
    ? 'Activez votre espace client — Atelier Montreuil'
    : 'Activeer uw klantenportaal — Atelier Montreuil'

  return (
    <Layout preheader={preheader} lang={locale}>
      <Text style={{ ...text.body, marginBottom: 18 }}>{greeting}</Text>
      <Text style={{ ...text.body, marginBottom: 18 }}>{intro}</Text>

      <ul style={{ paddingLeft: 18, margin: '0 0 22px' }}>
        {features.map((f) => (
          <li
            key={f}
            style={{
              fontFamily: text.body.fontFamily,
              fontSize: 14,
              color: colors.charcoal,
              marginBottom: 6,
              lineHeight: '1.6',
            }}
          >
            {f}
          </li>
        ))}
      </ul>

      <Text style={{ ...text.body, marginBottom: 24 }}>{action}</Text>

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
                  href={setupPasswordUrl}
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

      <Text style={{ ...text.small, marginBottom: 4 }}>{after}</Text>
      <Text style={{ ...text.small, marginBottom: 22 }}>
        <Link href={portalUrl} style={{ color: colors.bronze, textDecoration: 'none' }}>
          {portalUrl}
        </Link>
      </Text>

      <Hr style={{ borderColor: colors.border, margin: '20px 0 18px' }} />

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
