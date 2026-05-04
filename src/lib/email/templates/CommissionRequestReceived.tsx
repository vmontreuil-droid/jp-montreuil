import * as React from 'react'
import { Layout, Section, Text, Hr, Link, text, colors, fonts } from '../components/Layout'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

type Props = {
  recipientName: string
  email: string
  locale: 'fr' | 'nl'
  techniqueLabel: string
  supportLabel: string | null
  width: number | null
  height: number | null
  frameTypeLabel: string | null
  portraitCount: number
  supplements: string[]
  message: string
  attachmentCount: number
  priceEstimate: number | null
  submittedAt: Date
}

const COPY = {
  fr: {
    preheader: 'Votre demande est bien arrivée — Atelier Montreuil',
    eyebrow: 'Demande reçue',
    title: 'Merci pour votre demande',
    greeting: (name: string) => `Bonjour ${name},`,
    intro:
      'Votre demande de devis est bien arrivée. Jean-Pierre va l’étudier personnellement et vous reviendra avec une proposition détaillée — habituellement sous 48 heures ouvrables.',
    summaryHeading: 'Récapitulatif de votre demande',
    technique: 'Technique',
    support: 'Support',
    format: 'Format',
    framing: 'Encadrement',
    portraits: 'Portraits',
    supplementsLabel: 'Suppléments',
    photos: (n: number) => `${n} photo${n > 1 ? 's' : ''} de référence transmise${n > 1 ? 's' : ''}`,
    estimate: 'Estimation indicative',
    estimateNote:
      'Le prix définitif sera précisé sur le devis — il peut varier selon les détails que Jean-Pierre identifie sur vos photos.',
    onDevis: 'Sur devis (format personnalisé)',
    yourMessage: 'Votre message',
    stepsHeading: 'Et maintenant ?',
    steps: [
      {
        n: '1',
        title: 'Étude de votre demande',
        body: 'Jean-Pierre regarde attentivement vos photos et votre brief.',
      },
      {
        n: '2',
        title: 'Devis personnalisé par e-mail',
        body: 'Vous recevez une proposition détaillée que vous pouvez signer en ligne.',
      },
      {
        n: '3',
        title: 'Acompte & démarrage',
        body: 'Dès la signature et l’acompte reçu, votre œuvre démarre.',
      },
      {
        n: '4',
        title: 'Solde, livraison & remise',
        body: 'Œuvre terminée → solde → vous choisissez la date — Jean-Pierre vient vous la remettre en personne.',
      },
    ],
    portalEyebrow: 'Suivez votre commande à tout moment',
    portalIntro:
      'Un espace client privé sera créé pour vous dès l’envoi du devis. Vous pourrez y suivre chaque étape, signer, payer et fixer la livraison.',
    portalCta: 'Découvrir l’espace client',
    contactNote:
      'Une question entre-temps ? Répondez simplement à ce mail — il arrive directement chez Jean-Pierre.',
    signoff: 'À très bientôt,',
    role: 'Artiste peintre · Atelier Montreuil',
    received: 'Reçue le',
  },
  nl: {
    preheader: 'Uw aanvraag is goed aangekomen — Atelier Montreuil',
    eyebrow: 'Aanvraag ontvangen',
    title: 'Bedankt voor uw aanvraag',
    greeting: (name: string) => `Beste ${name},`,
    intro:
      'Uw offerteaanvraag is goed bij ons aangekomen. Jean-Pierre bekijkt ze persoonlijk en stuurt u een gedetailleerd voorstel — meestal binnen 48 werkuren.',
    summaryHeading: 'Samenvatting van uw aanvraag',
    technique: 'Techniek',
    support: 'Drager',
    format: 'Formaat',
    framing: 'Inkadering',
    portraits: 'Portretten',
    supplementsLabel: 'Supplementen',
    photos: (n: number) => `${n} referentiefoto${n > 1 ? '’s' : ''} meegestuurd`,
    estimate: 'Indicatieve schatting',
    estimateNote:
      'De definitieve prijs staat op de offerte — die kan licht variëren op basis van wat Jean-Pierre op uw foto’s ziet.',
    onDevis: 'Op aanvraag (formaat op maat)',
    yourMessage: 'Uw bericht',
    stepsHeading: 'En nu?',
    steps: [
      {
        n: '1',
        title: 'Bestudering van uw aanvraag',
        body: 'Jean-Pierre bekijkt uw foto’s en uw brief in detail.',
      },
      {
        n: '2',
        title: 'Persoonlijke offerte per e-mail',
        body: 'U ontvangt een gedetailleerd voorstel dat u online kunt ondertekenen.',
      },
      {
        n: '3',
        title: 'Voorschot & start',
        body: 'Zodra de offerte ondertekend is en het voorschot ontvangen, start uw werk.',
      },
      {
        n: '4',
        title: 'Saldo, levering & overhandiging',
        body: 'Werk klaar → saldo → u kiest de datum — Jean-Pierre komt persoonlijk afleveren.',
      },
    ],
    portalEyebrow: 'Volg uw bestelling op elk moment',
    portalIntro:
      'Een persoonlijk klantenportaal wordt voor u aangemaakt zodra de offerte verstuurd is. Daar volgt u elke stap, tekent u, betaalt u en kiest u de leveringsdatum.',
    portalCta: 'Klantenportaal ontdekken',
    contactNote:
      'Heeft u ondertussen een vraag? Beantwoord gewoon deze mail — die komt rechtstreeks bij Jean-Pierre terecht.',
    signoff: 'Tot binnenkort,',
    role: 'Kunstschilder · Atelier Montreuil',
    received: 'Ontvangen op',
  },
} as const

export function CommissionRequestReceived(p: Props) {
  const c = COPY[p.locale]
  const dateLocale = p.locale === 'fr' ? 'fr-BE' : 'nl-BE'

  const labelStyle = {
    fontFamily: text.label.fontFamily,
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: colors.stone,
    fontWeight: 600,
    margin: '0 0 4px',
  }

  const valueStyle = {
    fontFamily: text.body.fontFamily,
    fontSize: 14,
    lineHeight: '1.5',
    color: colors.ink,
    margin: '0 0 14px',
  }

  const sizeStr =
    p.width && p.height
      ? `${p.width} × ${p.height} cm`
      : p.locale === 'fr'
        ? 'À discuter'
        : 'Te bespreken'

  return (
    <Layout preheader={c.preheader} lang={p.locale}>
      <Text style={text.eyebrow}>{c.eyebrow}</Text>
      <Text style={text.h1}>{c.title}</Text>

      <Text style={{ ...text.body, marginBottom: 18 }}>{c.greeting(p.recipientName)}</Text>
      <Text style={{ ...text.body, marginBottom: 24 }}>{c.intro}</Text>

      {/* Récapitulatif */}
      <Section
        style={{
          backgroundColor: colors.canvas,
          border: `1px solid ${colors.border}`,
          padding: '20px 22px',
          marginBottom: 26,
          borderRadius: 4,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 18,
            color: colors.ink,
            margin: '0 0 14px',
          }}
        >
          {c.summaryHeading}
        </Text>

        <Text style={labelStyle}>{c.technique}</Text>
        <Text style={valueStyle}>{p.techniqueLabel}</Text>

        {p.supportLabel && (
          <>
            <Text style={labelStyle}>{c.support}</Text>
            <Text style={valueStyle}>{p.supportLabel}</Text>
          </>
        )}

        <Text style={labelStyle}>{c.format}</Text>
        <Text style={valueStyle}>{sizeStr}</Text>

        {p.frameTypeLabel && (
          <>
            <Text style={labelStyle}>{c.framing}</Text>
            <Text style={valueStyle}>{p.frameTypeLabel}</Text>
          </>
        )}

        {p.portraitCount > 1 && (
          <>
            <Text style={labelStyle}>{c.portraits}</Text>
            <Text style={valueStyle}>{p.portraitCount}</Text>
          </>
        )}

        {p.supplements.length > 0 && (
          <>
            <Text style={labelStyle}>{c.supplementsLabel}</Text>
            <Text style={valueStyle}>{p.supplements.join(' · ')}</Text>
          </>
        )}

        {p.attachmentCount > 0 && (
          <Text
            style={{
              ...valueStyle,
              fontStyle: 'italic',
              color: colors.charcoal,
              fontSize: 13,
              margin: '4px 0 0',
            }}
          >
            {c.photos(p.attachmentCount)}
          </Text>
        )}
      </Section>

      {/* Estimation indicative */}
      <Section
        style={{
          border: `1px solid ${colors.bronze}`,
          backgroundColor: 'rgba(176, 130, 73, 0.06)',
          padding: '18px 22px',
          marginBottom: 26,
          borderRadius: 4,
        }}
      >
        <Text style={{ ...labelStyle, color: colors.bronze }}>{c.estimate}</Text>
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 26,
            color: colors.bronze,
            fontWeight: 600,
            margin: '4px 0 8px',
          }}
        >
          {p.priceEstimate != null
            ? `${p.priceEstimate.toLocaleString(dateLocale)} €`
            : c.onDevis}
        </Text>
        <Text style={{ ...text.small, color: colors.stone, margin: 0 }}>{c.estimateNote}</Text>
      </Section>

      {/* Votre message */}
      <Text style={labelStyle}>{c.yourMessage}</Text>
      <Text
        style={{
          ...valueStyle,
          whiteSpace: 'pre-wrap',
          backgroundColor: colors.canvas,
          border: `1px solid ${colors.border}`,
          padding: 14,
          borderRadius: 4,
          fontStyle: 'italic',
          color: colors.charcoal,
          marginBottom: 28,
        }}
      >
        {p.message}
      </Text>

      <Hr style={{ borderColor: colors.border, margin: '0 0 24px' }} />

      {/* Étapes */}
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 22,
          color: colors.ink,
          margin: '0 0 18px',
        }}
      >
        {c.stepsHeading}
      </Text>

      {c.steps.map((step) => (
        <table
          key={step.n}
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={{ width: '100%', marginBottom: 14 }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: 44,
                  verticalAlign: 'top',
                  paddingRight: 14,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: colors.bronze,
                    color: colors.white,
                    fontFamily: fonts.display,
                    fontSize: 16,
                    fontWeight: 600,
                    textAlign: 'center',
                    lineHeight: '32px',
                    borderRadius: 16,
                  }}
                >
                  {step.n}
                </div>
              </td>
              <td style={{ verticalAlign: 'top' }}>
                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 14,
                    fontWeight: 600,
                    color: colors.ink,
                    margin: '4px 0 2px',
                  }}
                >
                  {step.title}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 13,
                    lineHeight: '1.55',
                    color: colors.charcoal,
                    margin: 0,
                  }}
                >
                  {step.body}
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      ))}

      <Hr style={{ borderColor: colors.border, margin: '28px 0 22px' }} />

      {/* Klantenportaal */}
      <Text style={{ ...text.eyebrow, marginBottom: 6 }}>{c.portalEyebrow}</Text>
      <Text style={{ ...text.body, marginBottom: 18 }}>{c.portalIntro}</Text>
      <Section style={{ textAlign: 'center', margin: '0 0 26px' }}>
        <Link
          href={`${PUBLIC_BASE_URL.replace(/\/$/, '')}/portail/login`}
          style={{
            display: 'inline-block',
            padding: '12px 26px',
            backgroundColor: colors.bronze,
            color: colors.white,
            textDecoration: 'none',
            fontFamily: fonts.sans,
            fontSize: 13,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            borderRadius: 4,
            fontWeight: 600,
          }}
        >
          {c.portalCta}
        </Link>
      </Section>

      <Text style={{ ...text.small, fontStyle: 'italic', marginBottom: 22 }}>{c.contactNote}</Text>

      <Hr style={{ borderColor: colors.border, margin: '20px 0 18px' }} />

      <Text style={{ ...text.body, marginBottom: 4 }}>{c.signoff}</Text>
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
      <Text style={{ ...text.small, margin: '0 0 14px' }}>{c.role}</Text>

      <Text style={{ ...text.small, color: colors.stone, fontSize: 11, margin: 0 }}>
        {c.received}{' '}
        {p.submittedAt.toLocaleString(dateLocale, {
          dateStyle: 'long',
          timeStyle: 'short',
        })}
      </Text>
    </Layout>
  )
}
