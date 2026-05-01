import * as React from 'react'
import { Img } from '@react-email/components'
import { Layout, Section, Text, Hr, Link, text, colors } from '../components/Layout'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

type Attachment = {
  filename: string
  size: number
  /** Base64 data URL voor inline-preview (alleen voor afbeeldingen ≤ 500KB) */
  previewDataUrl?: string
}

type Props = {
  name: string
  email: string
  phone: string
  message: string
  locale: 'fr' | 'nl'
  attachments: Attachment[]
  ip?: string | null
  submittedAt: Date
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export function NewContactMessage({
  name,
  email,
  phone,
  message,
  locale,
  attachments,
  ip,
  submittedAt,
}: Props) {
  const isFR = locale === 'fr'
  const preheader = isFR
    ? `Nouveau message de ${name}`
    : `Nieuw bericht van ${name}`

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
    fontSize: 15,
    lineHeight: '1.5',
    color: colors.ink,
    margin: '0 0 16px',
  } as const

  return (
    <Layout preheader={preheader} lang={locale}>
      <Text style={text.eyebrow}>
        {isFR ? 'Nouveau message via le site' : 'Nieuw bericht via de website'}
      </Text>
      <Text style={text.h1}>{name}</Text>
      <Text style={{ ...text.small, marginBottom: 24 }}>
        {submittedAt.toLocaleString(isFR ? 'fr-BE' : 'nl-BE', {
          dateStyle: 'long',
          timeStyle: 'short',
        })}
      </Text>

      <Hr style={{ borderColor: colors.border, margin: '0 0 24px' }} />

      <Section>
        <Text style={labelStyle}>Email</Text>
        <Text style={valueStyle}>
          <Link href={`mailto:${email}`} style={{ color: colors.bronze, textDecoration: 'none' }}>
            {email}
          </Link>
        </Text>

        <Text style={labelStyle}>{isFR ? 'Téléphone' : 'Telefoon'}</Text>
        <Text style={valueStyle}>
          <Link
            href={`tel:${phone.replace(/\s/g, '')}`}
            style={{ color: colors.bronze, textDecoration: 'none' }}
          >
            {phone}
          </Link>
        </Text>

        <Text style={labelStyle}>{isFR ? 'Message' : 'Bericht'}</Text>
        <Text
          style={{
            ...valueStyle,
            whiteSpace: 'pre-wrap',
            backgroundColor: colors.canvas,
            border: `1px solid ${colors.border}`,
            padding: 16,
            borderRadius: 4,
          }}
        >
          {message}
        </Text>

        {attachments.length > 0 && (
          <>
            <Text style={labelStyle}>
              {isFR
                ? `Pièces jointes (${attachments.length})`
                : `Bijlagen (${attachments.length})`}
            </Text>

            {/* Inline-previews voor afbeeldingen die niet te groot zijn */}
            {attachments.some((a) => a.previewDataUrl) && (
              <div style={{ margin: '0 0 16px' }}>
                {attachments
                  .filter((a) => a.previewDataUrl)
                  .map((a) => (
                    <div
                      key={a.filename}
                      style={{
                        marginBottom: 12,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.canvas,
                        padding: 8,
                      }}
                    >
                      <Img
                        src={a.previewDataUrl!}
                        alt={a.filename}
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          display: 'block',
                          margin: '0 auto',
                        }}
                      />
                      <Text
                        style={{
                          fontFamily: text.body.fontFamily,
                          fontSize: 11,
                          color: colors.stone,
                          textAlign: 'center',
                          margin: '8px 0 0',
                        }}
                      >
                        {a.filename} · {formatBytes(a.size)}
                      </Text>
                    </div>
                  ))}
              </div>
            )}

            {/* Volledige lijst (incl. niet-preview-bare bestanden) */}
            <ul style={{ margin: '0 0 20px', paddingLeft: 20 }}>
              {attachments.map((a) => (
                <li
                  key={a.filename}
                  style={{
                    fontFamily: text.body.fontFamily,
                    fontSize: 13,
                    color: colors.charcoal,
                    margin: '0 0 4px',
                  }}
                >
                  {a.filename}{' '}
                  <span style={{ color: colors.stone, fontSize: 11 }}>({formatBytes(a.size)})</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Hr style={{ borderColor: colors.border, margin: '8px 0 20px' }} />

      <Text style={{ ...text.small, marginBottom: 16 }}>
        {isFR
          ? 'Connectez-vous à l\'admin pour répondre et télécharger les pièces jointes.'
          : 'Log in op admin om te beantwoorden en bijlagen te bekijken.'}
      </Text>

      <Link
        href={`${PUBLIC_BASE_URL}/admin/messages`}
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          backgroundColor: colors.bronze,
          color: colors.white,
          textDecoration: 'none',
          fontFamily: text.body.fontFamily,
          fontSize: 13,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          borderRadius: 4,
        }}
      >
        {isFR ? 'Ouvrir admin' : 'Open admin'}
      </Link>

      {ip && (
        <Text style={{ ...text.small, marginTop: 24, fontSize: 11, color: colors.stone }}>
          {isFR ? 'Adresse IP' : 'IP-adres'}: {ip} · Locale: {locale}
        </Text>
      )}
    </Layout>
  )
}
