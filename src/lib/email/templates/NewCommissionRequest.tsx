import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors } from '../components/Layout'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

type Attachment = { filename: string; size: number }

type Props = {
  id: string
  name: string
  email: string
  phone: string
  locale: 'fr' | 'nl'
  technique: string
  techniqueLabel: string
  support: string | null
  supportLabel: string | null
  width: number | null
  height: number | null
  framing: string | null
  framingLabel: string | null
  portraitCount: number
  supplements: string[]
  priceEstimate: number | null
  message: string
  attachments: Attachment[]
  submittedAt: Date
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export function NewCommissionRequest(p: Props) {
  const isFR = p.locale === 'fr'
  const preheader = isFR
    ? `Nouvelle demande de devis — ${p.name}`
    : `Nieuwe offerteaanvraag — ${p.name}`

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

  const sizeStr =
    p.width && p.height
      ? `${p.width} × ${p.height} cm`
      : isFR
        ? 'À discuter'
        : 'Te bespreken'

  return (
    <Layout preheader={preheader} lang={p.locale}>
      <Text style={text.eyebrow}>
        {isFR ? 'Nouvelle demande de devis' : 'Nieuwe offerteaanvraag'}
      </Text>
      <Text style={text.h1}>{p.name}</Text>
      <Text style={{ ...text.small, marginBottom: 24 }}>
        {p.submittedAt.toLocaleString(isFR ? 'fr-BE' : 'nl-BE', {
          dateStyle: 'long',
          timeStyle: 'short',
        })}
      </Text>

      <Hr style={{ borderColor: colors.border, margin: '0 0 24px' }} />

      <Section>
        <Text style={labelStyle}>Email</Text>
        <Text style={valueStyle}>
          <Link href={`mailto:${p.email}`} style={{ color: colors.bronze, textDecoration: 'none' }}>
            {p.email}
          </Link>
        </Text>

        {p.phone && (
          <>
            <Text style={labelStyle}>{isFR ? 'Téléphone' : 'Telefoon'}</Text>
            <Text style={valueStyle}>
              <Link
                href={`tel:${p.phone.replace(/\s/g, '')}`}
                style={{ color: colors.bronze, textDecoration: 'none' }}
              >
                {p.phone}
              </Link>
            </Text>
          </>
        )}

        <Text style={labelStyle}>{isFR ? 'Technique' : 'Techniek'}</Text>
        <Text style={valueStyle}>{p.techniqueLabel}</Text>

        {p.supportLabel && (
          <>
            <Text style={labelStyle}>{isFR ? 'Support' : 'Drager'}</Text>
            <Text style={valueStyle}>{p.supportLabel}</Text>
          </>
        )}

        <Text style={labelStyle}>{isFR ? 'Format' : 'Formaat'}</Text>
        <Text style={valueStyle}>{sizeStr}</Text>

        {p.framingLabel && (
          <>
            <Text style={labelStyle}>{isFR ? 'Encadrement' : 'Inkadering'}</Text>
            <Text style={valueStyle}>{p.framingLabel}</Text>
          </>
        )}

        <Text style={labelStyle}>{isFR ? 'Portraits' : 'Portretten'}</Text>
        <Text style={valueStyle}>{p.portraitCount}</Text>

        {p.supplements.length > 0 && (
          <>
            <Text style={labelStyle}>{isFR ? 'Suppléments' : 'Supplementen'}</Text>
            <Text style={valueStyle}>{p.supplements.join(' · ')}</Text>
          </>
        )}

        <Text style={labelStyle}>{isFR ? 'Estimation' : 'Schatting'}</Text>
        <Text style={{ ...valueStyle, color: colors.bronze, fontWeight: 600 }}>
          {p.priceEstimate != null
            ? `${p.priceEstimate.toLocaleString(isFR ? 'fr-BE' : 'nl-BE')} €`
            : isFR
              ? 'Sur devis (format personnalisé)'
              : 'Op aanvraag (formaat op maat)'}
        </Text>

        <Text style={labelStyle}>{isFR ? 'Description' : 'Beschrijving'}</Text>
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
          {p.message}
        </Text>

        {p.attachments.length > 0 && (
          <>
            <Text style={labelStyle}>
              {isFR
                ? `Photos de référence (${p.attachments.length})`
                : `Referentiefoto's (${p.attachments.length})`}
            </Text>
            <ul style={{ margin: '0 0 20px', paddingLeft: 20 }}>
              {p.attachments.map((a) => (
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
                  <span style={{ color: colors.stone, fontSize: 11 }}>
                    ({formatBytes(a.size)})
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Hr style={{ borderColor: colors.border, margin: '8px 0 20px' }} />

      <Link
        href={`${PUBLIC_BASE_URL}/admin/commissions/${p.id}`}
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
        {isFR ? 'Ouvrir la demande' : 'Open de aanvraag'}
      </Link>

      <Text style={{ ...text.small, marginTop: 24, fontSize: 11, color: colors.stone }}>
        Locale: {p.locale} · ID: {p.id.slice(0, 8)}
      </Text>
    </Layout>
  )
}
