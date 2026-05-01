import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Text,
  Hr,
  Link,
  Preview,
  Tailwind,
  Font,
} from '@react-email/components'
import * as React from 'react'
import { colors, fonts } from '../theme'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

type Props = {
  preheader: string
  lang?: 'fr' | 'nl'
  children: React.ReactNode
}

export function Layout({ preheader, lang = 'fr', children }: Props) {
  const year = new Date().getFullYear()

  return (
    <Html lang={lang}>
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
        <style>{`
          :root { color-scheme: light only; }
          [data-ogsc], [data-ogsb] { color-scheme: light only !important; }
          @media (prefers-color-scheme: dark) {
            html, body, table, td, div, p, a, span { color-scheme: light only !important; }
          }
        `}</style>
        <Font
          fontFamily="Cormorant Garamond"
          fallbackFontFamily="Georgia"
          webFont={{
            url: 'https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjQAllvuQWJ5heb_w.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preheader}</Preview>
      <Tailwind>
        <Body
          style={{
            margin: 0,
            padding: 0,
            backgroundColor: colors.canvas,
            fontFamily: fonts.sans,
            color: colors.ink,
          }}
        >
          <Container
            style={{
              maxWidth: 600,
              margin: '0 auto',
              padding: '40px 16px',
            }}
          >
            {/* Brand header — donkere wordmark op cream bg (logo-dark.png is
                een vooraf-zwart-gemaakte versie zodat we geen CSS-filter nodig
                hebben — die worden door veel email-clients gestripped). */}
            <Section style={{ textAlign: 'center', paddingBottom: 32 }}>
              <Img
                src={`${PUBLIC_BASE_URL}/logo-dark.png`}
                width="200"
                height="69"
                alt="Atelier Montreuil"
                style={{ display: 'inline-block', margin: '0 auto 10px' }}
              />
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 11,
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: colors.charcoal,
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                {lang === 'nl' ? 'Kunstschilder' : 'Artiste peintre'}
              </Text>
              <div
                style={{
                  display: 'inline-block',
                  width: 40,
                  height: 1,
                  backgroundColor: colors.bronze,
                  marginTop: 14,
                }}
              />
            </Section>

            {/* Content card */}
            <Section
              style={{
                backgroundColor: colors.white,
                borderRadius: 8,
                padding: '36px 36px 32px',
                boxShadow: '0 12px 40px -16px rgba(28, 25, 22, 0.18)',
                border: `1px solid ${colors.border}`,
              }}
            >
              {children}
            </Section>

            {/* Footer */}
            <Section
              style={{
                paddingTop: 28,
                paddingBottom: 12,
                textAlign: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 18,
                  color: colors.ink,
                  margin: '0 0 6px',
                }}
              >
                Jean-Pierre Montreuil
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: colors.stone,
                  margin: '0 0 4px',
                  lineHeight: '1.6',
                }}
              >
                Heuntjesstraat 6 · 8570 Anzegem · BE
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: colors.stone,
                  margin: '0 0 4px',
                }}
              >
                <Link
                  href="mailto:jp@montreuil.be"
                  style={{ color: colors.bronze, textDecoration: 'none' }}
                >
                  jp@montreuil.be
                </Link>
                {' · '}
                <Link
                  href="tel:+32475616838"
                  style={{ color: colors.bronze, textDecoration: 'none' }}
                >
                  +32 475 61 68 38
                </Link>
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 11,
                  color: colors.stone,
                  margin: '12px 0 0',
                  letterSpacing: '0.05em',
                }}
              >
                <Link
                  href={PUBLIC_BASE_URL}
                  style={{ color: colors.stone, textDecoration: 'none' }}
                >
                  {PUBLIC_BASE_URL.replace(/^https?:\/\//, '')}
                </Link>
              </Text>
              <Hr
                style={{
                  borderColor: 'rgba(128, 120, 112, 0.2)',
                  margin: '20px 0 12px',
                }}
              />
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 10,
                  color: colors.stone,
                  margin: 0,
                  letterSpacing: '0.04em',
                }}
              >
                © {year} Atelier Montreuil
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export { Section, Text, Img, Link, Hr }
export { text, colors, fonts } from '../theme'
