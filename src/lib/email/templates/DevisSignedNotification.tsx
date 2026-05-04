import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors } from '../components/Layout'
import { PUBLIC_BASE_URL } from '@/lib/public-url'
import { formatEur } from '@/lib/atelier-config'

type Props = {
  id: string
  clientName: string
  clientEmail: string
  signerName: string
  signedAt: Date
  devisNumber: string
  total: number
  acompteEur: number
  paymentReference: string
}

export function DevisSignedNotification(p: Props) {
  const preheader = `Devis ${p.devisNumber} signé par ${p.signerName}`

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
    margin: '0 0 14px',
  } as const

  return (
    <Layout preheader={preheader} lang="fr">
      <Text style={text.eyebrow}>Devis signé</Text>
      <Text style={text.h1}>{p.signerName}</Text>
      <Text style={{ ...text.small, marginBottom: 18 }}>
        {p.signedAt.toLocaleString('fr-BE', { dateStyle: 'long', timeStyle: 'short' })}
      </Text>

      <Hr style={{ borderColor: colors.border, margin: '0 0 18px' }} />

      <Section>
        <Text style={labelStyle}>Devis</Text>
        <Text style={valueStyle}>{p.devisNumber}</Text>

        <Text style={labelStyle}>Client</Text>
        <Text style={valueStyle}>
          {p.clientName} —{' '}
          <Link href={`mailto:${p.clientEmail}`} style={{ color: colors.bronze, textDecoration: 'none' }}>
            {p.clientEmail}
          </Link>
        </Text>

        <Text style={labelStyle}>Total</Text>
        <Text style={valueStyle}>{formatEur(p.total)}</Text>

        <Text style={labelStyle}>Acompte attendu</Text>
        <Text style={{ ...valueStyle, color: colors.bronze, fontWeight: 600 }}>
          {formatEur(p.acompteEur)}
        </Text>

        <Text style={labelStyle}>Communication à attendre</Text>
        <Text style={valueStyle}>{p.paymentReference}</Text>
      </Section>

      <Hr style={{ borderColor: colors.border, margin: '8px 0 20px' }} />

      <Link
        href={`${PUBLIC_BASE_URL}/admin/commissions/${p.id}`}
        style={{
          display: 'inline-block',
          padding: '12px 22px',
          backgroundColor: colors.bronze,
          color: colors.white,
          textDecoration: 'none',
          fontFamily: text.body.fontFamily,
          fontSize: 13,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          borderRadius: 4,
        }}
      >
        Ouvrir la demande
      </Link>
    </Layout>
  )
}
