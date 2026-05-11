import * as React from 'react'
import { Img } from '@react-email/components'
import { Layout, Section, Text, Hr, Link, text, colors } from '../components/Layout'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

type Props = {
  fromName: string | null
  message: string | null
  photoTitle: string
  photoImageUrl: string
  configUrl: string
  configSummary: string
  locale: 'fr' | 'nl'
}

export function PreviewShare({
  fromName,
  message,
  photoTitle,
  photoImageUrl,
  configUrl,
  configSummary,
  locale,
}: Props) {
  const isFR = locale === 'fr'
  const greeting = isFR ? 'Bonjour,' : 'Hallo,'
  const intro = fromName
    ? isFR
      ? `${fromName} souhaite partager un aperçu d'une œuvre avec vous.`
      : `${fromName} wil graag een werk met u delen.`
    : isFR
      ? 'Voici un aperçu d\'une œuvre que je voulais partager avec vous.'
      : 'Hier is een werk dat ik graag met u wilde delen.'
  const seeBtn = isFR ? 'Voir avec ma configuration' : 'Bekijk met mijn instellingen'
  const config = isFR ? 'Configuration choisie' : 'Gekozen instellingen'

  return (
    <Layout preheader={`${photoTitle} — ${isFR ? 'aperçu personnalisé' : 'persoonlijke voorvertoning'}`} lang={locale}>
      <Section>
        <Text style={text.body}>{greeting}</Text>
        <Text style={text.body}>{intro}</Text>

        {message && (
          <Text
            style={{
              ...text.body,
              fontStyle: 'italic',
              color: colors.charcoal,
              borderLeft: `2px solid ${colors.bronze}`,
              paddingLeft: 12,
              margin: '16px 0',
            }}
          >
            « {message} »
          </Text>
        )}
      </Section>

      <Hr />

      <Section>
        <Img
          src={photoImageUrl}
          alt={photoTitle}
          width="520"
          style={{ width: '100%', maxWidth: 520, height: 'auto', borderRadius: 4, display: 'block' }}
        />
        <Text style={{ ...text.label, textAlign: 'center', marginTop: 12 }}>
          {photoTitle}
        </Text>
      </Section>

      <Section>
        <Text style={text.label}>{config}</Text>
        <Text style={text.body}>{configSummary}</Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link href={configUrl} style={{
          display: 'inline-block',
          background: colors.ink,
          color: '#fff',
          padding: '12px 24px',
          textDecoration: 'none',
          borderRadius: 4,
          fontSize: 13,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}>
          {seeBtn}
        </Link>
      </Section>

      <Hr />

      <Section>
        <Text style={{ ...text.small, color: colors.stone, textAlign: 'center' }}>
          {isFR
            ? 'Atelier Jean-Pierre Montreuil — '
            : 'Atelier Jean-Pierre Montreuil — '}
          <Link href={PUBLIC_BASE_URL} style={{ color: colors.bronze }}>
            jp.montreuil.be
          </Link>
        </Text>
      </Section>
    </Layout>
  )
}
