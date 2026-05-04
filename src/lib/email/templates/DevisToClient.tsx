import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors } from '../components/Layout'
import { PUBLIC_BASE_URL } from '@/lib/public-url'
import { localePath } from '@/lib/links'
import { formatEur } from '@/lib/atelier-config'

type DevisLine = {
  description: string
  quantity: number
  unit_price: number
}

type Props = {
  clientName: string
  devisNumber: string
  subject: string
  intro: string | null
  lines: DevisLine[]
  total: number
  acomptePct: number
  acompteEur: number
  validUntil: string | null
  signToken: string
  locale: 'fr' | 'nl'
}

export function DevisToClient(p: Props) {
  const isFR = p.locale === 'fr'
  const preheader = isFR
    ? `Votre devis ${p.devisNumber} est prêt`
    : `Uw offerte ${p.devisNumber} is klaar`

  const cellTh = {
    fontFamily: text.body.fontFamily,
    fontSize: 11,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: colors.stone,
    fontWeight: 600,
    padding: '8px 6px',
    borderBottom: `1px solid ${colors.border}`,
  }
  const cellTd = {
    fontFamily: text.body.fontFamily,
    fontSize: 13,
    color: colors.ink,
    padding: '10px 6px',
    borderBottom: `1px solid ${colors.border}`,
    verticalAlign: 'top' as const,
  }
  const numCell = { ...cellTd, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }

  const signUrl = `${PUBLIC_BASE_URL}${localePath(p.locale, `/devis-signature/${p.signToken}`)}`

  return (
    <Layout preheader={preheader} lang={p.locale}>
      <Text style={text.eyebrow}>{isFR ? 'Devis sur mesure' : 'Offerte op maat'}</Text>
      <Text style={text.h1}>{p.clientName}</Text>
      <Text style={{ ...text.small, marginBottom: 18 }}>
        {isFR ? `N° ${p.devisNumber}` : `Nr. ${p.devisNumber}`}
        {p.validUntil && (
          <>
            {' · '}
            {isFR ? 'Valable jusqu’au' : 'Geldig tot'}{' '}
            {new Date(p.validUntil).toLocaleDateString(isFR ? 'fr-BE' : 'nl-BE', {
              dateStyle: 'long',
            })}
          </>
        )}
      </Text>

      <Hr style={{ borderColor: colors.border, margin: '0 0 18px' }} />

      <Text style={{ ...text.h2, marginTop: 0 }}>{p.subject}</Text>

      {p.intro && (
        <Text
          style={{
            ...text.body,
            whiteSpace: 'pre-wrap' as const,
            marginBottom: 18,
            color: colors.charcoal,
          }}
        >
          {p.intro}
        </Text>
      )}

      <Section>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
          <thead>
            <tr>
              <th style={{ ...cellTh, textAlign: 'left' }}>
                {isFR ? 'Description' : 'Beschrijving'}
              </th>
              <th style={{ ...cellTh, textAlign: 'right' }}>{isFR ? 'Qté' : 'Aant.'}</th>
              <th style={{ ...cellTh, textAlign: 'right' }}>{isFR ? 'P.U.' : 'Prijs'}</th>
              <th style={{ ...cellTh, textAlign: 'right' }}>{isFR ? 'Total' : 'Totaal'}</th>
            </tr>
          </thead>
          <tbody>
            {p.lines.map((line, i) => (
              <tr key={i}>
                <td style={cellTd}>{line.description}</td>
                <td style={numCell}>{line.quantity}</td>
                <td style={numCell}>{formatEur(line.unit_price)}</td>
                <td style={numCell}>{formatEur(line.quantity * line.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section
        style={{
          backgroundColor: colors.canvas,
          border: `1px solid ${colors.border}`,
          padding: '14px 18px',
          marginBottom: 22,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td
                style={{
                  fontFamily: text.body.fontFamily,
                  fontSize: 13,
                  color: colors.charcoal,
                  padding: '4px 0',
                }}
              >
                {isFR ? 'Total' : 'Totaal'}
              </td>
              <td
                style={{
                  fontFamily: text.body.fontFamily,
                  fontSize: 18,
                  color: colors.ink,
                  textAlign: 'right',
                  fontWeight: 600,
                  padding: '4px 0',
                }}
              >
                {formatEur(p.total)}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  fontFamily: text.body.fontFamily,
                  fontSize: 12,
                  color: colors.stone,
                  padding: '4px 0',
                }}
              >
                {isFR ? `Acompte (${p.acomptePct}%)` : `Voorschot (${p.acomptePct}%)`}
              </td>
              <td
                style={{
                  fontFamily: text.body.fontFamily,
                  fontSize: 14,
                  color: colors.bronze,
                  textAlign: 'right',
                  fontWeight: 600,
                  padding: '4px 0',
                }}
              >
                {formatEur(p.acompteEur)}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Text style={{ ...text.body, marginBottom: 22 }}>
        {isFR
          ? 'Pour valider la commande, signez le devis en ligne. Vous recevrez ensuite les coordonnées de virement pour l’acompte.'
          : 'Om de bestelling te valideren, ondertekent u de offerte online. Daarna ontvangt u de overschrijvingsgegevens voor het voorschot.'}
      </Text>

      <Link
        href={signUrl}
        style={{
          display: 'inline-block',
          padding: '14px 28px',
          backgroundColor: colors.bronze,
          color: colors.white,
          textDecoration: 'none',
          fontFamily: text.body.fontFamily,
          fontSize: 13,
          letterSpacing: '0.2em',
          textTransform: 'uppercase' as const,
          borderRadius: 4,
          fontWeight: 600,
        }}
      >
        {isFR ? 'Voir & signer le devis' : 'Bekijk & onderteken de offerte'}
      </Link>

      <Text style={{ ...text.small, marginTop: 24, fontSize: 11, color: colors.stone }}>
        {isFR
          ? 'Ce lien est personnel. Si vous avez la moindre question, répondez simplement à cet e-mail.'
          : 'Deze link is persoonlijk. Bij vragen kunt u gewoon op deze e-mail antwoorden.'}
      </Text>
    </Layout>
  )
}
