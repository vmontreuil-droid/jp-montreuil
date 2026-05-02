'use client'

import { useRef, useState } from 'react'
import { Copy, Check, Apple, Smartphone } from 'lucide-react'

type Info = {
  name: string
  roleFr: string
  roleNl: string
  atelier: string
  address: string
  phone: string
  phoneTel: string
  email: string
  website: string
  websiteUrl: string
  websiteUrlNl: string
  facebook: string
  logoUrl: string
  taglineFr: string
  taglineNl: string
}

type Props = {
  info: Info
}

export default function SignatureDesigns({ info }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const ref1 = useRef<HTMLDivElement>(null)
  const ref2 = useRef<HTMLDivElement>(null)
  const ref3 = useRef<HTMLDivElement>(null)
  const ref4 = useRef<HTMLDivElement>(null)
  const ref5 = useRef<HTMLDivElement>(null)

  async function copySignature(ref: React.RefObject<HTMLDivElement | null>, key: string) {
    const node = ref.current
    if (!node) return
    try {
      const html = node.innerHTML
      const text = node.innerText
      // ClipboardItem met text/html + text/plain — rich-text wordt geplakt
      // in Apple Mail, plain als fallback
      if ('ClipboardItem' in window && navigator.clipboard.write) {
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        })
        await navigator.clipboard.write([item])
      } else {
        // Fallback: selecteer + execCommand voor oudere browsers
        const range = document.createRange()
        range.selectNode(node)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
        document.execCommand('copy')
        sel?.removeAllRanges()
      }
      setCopied(key)
      setTimeout(() => setCopied(null), 2500)
    } catch {
      // Laatste fallback: gewoon selecteren zodat user Cmd+C kan
      const range = document.createRange()
      range.selectNode(node)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }

  return (
    <div className="space-y-10">
      {/* === Design 1 — Classic minimal === */}
      <DesignBlock
        number={1}
        title="Classique minimaliste"
        description="Sobre, lisible, fonctionne dans tous les clients mail."
        copied={copied === 'd1'}
        onCopy={() => copySignature(ref1, 'd1')}
      >
        <div ref={ref1}>
          <Design1 info={info} />
        </div>
      </DesignBlock>

      {/* === Design 2 — Elegant met bronzen rand === */}
      <DesignBlock
        number={2}
        title="Élégant avec accent bronze"
        description="Avec petit logo et liseré bronze à gauche — plus signé."
        copied={copied === 'd2'}
        onCopy={() => copySignature(ref2, 'd2')}
      >
        <div ref={ref2}>
          <Design2 info={info} />
        </div>
      </DesignBlock>

      {/* === Design 3 — Compact horizontal === */}
      <DesignBlock
        number={3}
        title="Compact horizontal"
        description="Logo + ligne unique, idéal pour les réponses courtes."
        copied={copied === 'd3'}
        onCopy={() => copySignature(ref3, 'd3')}
      >
        <div ref={ref3}>
          <Design3 info={info} />
        </div>
      </DesignBlock>

      {/* === Design 4 — Carte (boxed) === */}
      <DesignBlock
        number={4}
        title="Carte encadrée"
        description="Style carte de visite avec encadrement subtil."
        copied={copied === 'd4'}
        onCopy={() => copySignature(ref4, 'd4')}
      >
        <div ref={ref4}>
          <Design4 info={info} />
        </div>
      </DesignBlock>

      {/* === Design 5 — Centré formel === */}
      <DesignBlock
        number={5}
        title="Centré formel"
        description="Logo grand format, mise en page centrée — élégant et formel."
        copied={copied === 'd5'}
        onCopy={() => copySignature(ref5, 'd5')}
      >
        <div ref={ref5}>
          <Design5 info={info} />
        </div>
      </DesignBlock>

      {/* === Instructies === */}
      <Instructions />
    </div>
  )
}

// ============================================================================
// Container voor één design
// ============================================================================

function DesignBlock({
  number,
  title,
  description,
  children,
  copied,
  onCopy,
}: {
  number: number
  title: string
  description: string
  children: React.ReactNode
  copied: boolean
  onCopy: () => void
}) {
  return (
    <section className="bg-(--color-paper) border border-(--color-frame)">
      <header className="flex items-start justify-between gap-4 p-5 border-b border-(--color-frame)">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-bronze) mb-1">
            Design {number}
          </p>
          <h2 className="text-xl text-(--color-ink) font-[family-name:var(--font-display)] leading-tight">
            {title}
          </h2>
          <p className="mt-1 text-sm text-(--color-stone)">{description}</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.15em] transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copié !' : 'Sélectionner et copier'}
        </button>
      </header>
      {/* Light-mode preview-canvas — emails worden bijna altijd op licht
          getoond, dus we tonen 't ook hier op cream achtergrond */}
      <div className="bg-[#faf8f5] p-8 md:p-10">{children}</div>
    </section>
  )
}

// ============================================================================
// Tagline — bilingual website-zin met juiste links
// ============================================================================

function Tagline({ info, align = 'left' }: { info: Info; align?: 'left' | 'center' }) {
  return (
    <p
      style={{
        margin: '14px 0 0',
        paddingTop: 10,
        borderTop: '1px solid rgba(128, 120, 112, 0.25)',
        fontSize: 11,
        lineHeight: '1.6',
        color: '#807870',
        fontStyle: 'italic',
        textAlign: align,
      }}
    >
      <a
        href={info.websiteUrl}
        style={{ color: '#8b6f47', textDecoration: 'none' }}
      >
        {info.taglineFr}
      </a>
      <span style={{ margin: '0 8px', color: '#c9c0b3', fontStyle: 'normal' }}>·</span>
      <a
        href={info.websiteUrlNl}
        style={{ color: '#8b6f47', textDecoration: 'none' }}
      >
        {info.taglineNl}
      </a>
    </p>
  )
}

// ============================================================================
// Design 1 — Classic minimal
// ============================================================================

function Design1({ info }: { info: Info }) {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      style={{ borderCollapse: 'collapse', fontFamily: 'Helvetica, Arial, sans-serif', color: '#1c1916' }}
    >
      <tbody>
        <tr>
          <td style={{ padding: '0 0 14px 0' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={info.logoUrl}
              alt={info.atelier}
              width={140}
              height={48}
              style={{ display: 'block', height: 'auto', width: 140, border: 0 }}
            />
          </td>
        </tr>
        <tr>
          <td style={{ padding: 0 }}>
            <p
              style={{
                margin: 0,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 22,
                lineHeight: '1.2',
                color: '#1c1916',
                fontWeight: 400,
              }}
            >
              {info.name}
            </p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12,
                lineHeight: '1.5',
                color: '#807870',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {info.roleFr} · {info.atelier}
            </p>
            <table
              cellPadding={0}
              cellSpacing={0}
              style={{ borderCollapse: 'collapse', marginTop: 14 }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      backgroundColor: '#8b6f47',
                      width: 32,
                      height: 1,
                      lineHeight: '1px',
                      fontSize: 1,
                    }}
                  >
                    &nbsp;
                  </td>
                </tr>
              </tbody>
            </table>
            <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: '1.7', color: '#1c1916' }}>
              {info.address}
              <br />
              <a
                href={`tel:${info.phoneTel}`}
                style={{ color: '#1c1916', textDecoration: 'none' }}
              >
                {info.phone}
              </a>
              <br />
              <a
                href={`mailto:${info.email}`}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.email}
              </a>
              <br />
              <a
                href={info.websiteUrl}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.website}
              </a>
            </p>
            <Tagline info={info} />
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// ============================================================================
// Design 2 — Elegant with bronze left border
// ============================================================================

function Design2({ info }: { info: Info }) {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      style={{ borderCollapse: 'collapse', fontFamily: 'Helvetica, Arial, sans-serif', color: '#1c1916' }}
    >
      <tbody>
        <tr>
          {/* Logo-kolom */}
          <td
            style={{
              paddingRight: 18,
              verticalAlign: 'top',
              borderRight: '2px solid #8b6f47',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={info.logoUrl}
              alt={info.atelier}
              width={120}
              height={42}
              style={{ display: 'block', height: 'auto', width: 120, border: 0 }}
            />
          </td>
          {/* Info-kolom */}
          <td
            style={{
              paddingLeft: 18,
              verticalAlign: 'top',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 24,
                lineHeight: '1.2',
                color: '#1c1916',
                fontWeight: 400,
              }}
            >
              {info.name}
            </p>
            <p
              style={{
                margin: '6px 0 14px',
                fontSize: 11,
                lineHeight: '1.4',
                color: '#8b6f47',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {info.roleFr} · {info.roleNl}
            </p>
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td
                    style={{
                      paddingRight: 8,
                      fontSize: 12,
                      color: '#807870',
                      lineHeight: '1.7',
                      verticalAlign: 'top',
                      width: 70,
                    }}
                  >
                    Atelier
                  </td>
                  <td style={{ fontSize: 13, color: '#1c1916', lineHeight: '1.7' }}>
                    {info.address}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      paddingRight: 8,
                      fontSize: 12,
                      color: '#807870',
                      lineHeight: '1.7',
                      verticalAlign: 'top',
                    }}
                  >
                    Tél
                  </td>
                  <td style={{ fontSize: 13, lineHeight: '1.7' }}>
                    <a
                      href={`tel:${info.phoneTel}`}
                      style={{ color: '#1c1916', textDecoration: 'none' }}
                    >
                      {info.phone}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      paddingRight: 8,
                      fontSize: 12,
                      color: '#807870',
                      lineHeight: '1.7',
                      verticalAlign: 'top',
                    }}
                  >
                    Mail
                  </td>
                  <td style={{ fontSize: 13, lineHeight: '1.7' }}>
                    <a
                      href={`mailto:${info.email}`}
                      style={{ color: '#8b6f47', textDecoration: 'none' }}
                    >
                      {info.email}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      paddingRight: 8,
                      fontSize: 12,
                      color: '#807870',
                      lineHeight: '1.7',
                      verticalAlign: 'top',
                    }}
                  >
                    Web
                  </td>
                  <td style={{ fontSize: 13, lineHeight: '1.7' }}>
                    <a
                      href={info.websiteUrl}
                      style={{ color: '#8b6f47', textDecoration: 'none' }}
                    >
                      {info.website}
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
            <Tagline info={info} />
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// ============================================================================
// Design 3 — Compact horizontal (one-liner)
// ============================================================================

function Design3({ info }: { info: Info }) {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      style={{ borderCollapse: 'collapse', fontFamily: 'Helvetica, Arial, sans-serif' }}
    >
      <tbody>
        <tr>
          {/* Logo links */}
          <td style={{ paddingRight: 14, verticalAlign: 'middle' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={info.logoUrl}
              alt={info.atelier}
              width={90}
              height={31}
              style={{ display: 'block', height: 'auto', width: 90, border: 0 }}
            />
          </td>
          {/* Tekst rechts */}
          <td
            style={{
              paddingLeft: 14,
              verticalAlign: 'middle',
              borderLeft: '1px solid rgba(139, 111, 71, 0.4)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 18,
                color: '#1c1916',
                fontWeight: 400,
              }}
            >
              {info.name}
              <span
                style={{
                  fontFamily: 'Helvetica, Arial, sans-serif',
                  fontSize: 11,
                  color: '#8b6f47',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginLeft: 12,
                }}
              >
                {info.roleFr}
              </span>
            </p>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 12,
                color: '#807870',
                lineHeight: '1.6',
              }}
            >
              <a
                href={`tel:${info.phoneTel}`}
                style={{ color: '#807870', textDecoration: 'none' }}
              >
                {info.phone}
              </a>
              <span style={{ margin: '0 8px', color: '#c9c0b3' }}>·</span>
              <a
                href={`mailto:${info.email}`}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.email}
              </a>
              <span style={{ margin: '0 8px', color: '#c9c0b3' }}>·</span>
              <a
                href={info.websiteUrl}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.website}
              </a>
            </p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 11,
                color: '#807870',
                fontStyle: 'italic',
              }}
            >
              <a
                href={info.websiteUrl}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.taglineFr}
              </a>
              <span style={{ margin: '0 6px', color: '#c9c0b3', fontStyle: 'normal' }}>·</span>
              <a
                href={info.websiteUrlNl}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.taglineNl}
              </a>
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// ============================================================================
// Design 4 — Boxed card style
// ============================================================================

function Design4({ info }: { info: Info }) {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      style={{
        borderCollapse: 'collapse',
        fontFamily: 'Helvetica, Arial, sans-serif',
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              padding: 20,
              backgroundColor: '#ffffff',
              border: '1px solid #e3dccf',
              boxShadow: '0 4px 16px -8px rgba(28, 25, 22, 0.12)',
            }}
          >
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: 16, verticalAlign: 'top' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={info.logoUrl}
                      alt={info.atelier}
                      width={110}
                      height={38}
                      style={{ display: 'block', height: 'auto', width: 110, border: 0 }}
                    />
                  </td>
                  <td
                    style={{
                      verticalAlign: 'top',
                      paddingLeft: 16,
                      borderLeft: '1px solid #e3dccf',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: 20,
                        color: '#1c1916',
                      }}
                    >
                      {info.name}
                    </p>
                    <p
                      style={{
                        margin: '3px 0 0',
                        fontSize: 10,
                        color: '#8b6f47',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {info.roleFr} · {info.roleNl}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>

            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid #e3dccf',
                fontSize: 12,
                lineHeight: '1.7',
                color: '#1c1916',
              }}
            >
              <span style={{ color: '#807870' }}>{info.address}</span>
              <br />
              <a
                href={`tel:${info.phoneTel}`}
                style={{ color: '#1c1916', textDecoration: 'none' }}
              >
                {info.phone}
              </a>
              <span style={{ margin: '0 8px', color: '#c9c0b3' }}>·</span>
              <a
                href={`mailto:${info.email}`}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.email}
              </a>
              <span style={{ margin: '0 8px', color: '#c9c0b3' }}>·</span>
              <a
                href={info.websiteUrl}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.website}
              </a>
            </div>

            <p
              style={{
                margin: '12px 0 0',
                fontSize: 11,
                color: '#807870',
                fontStyle: 'italic',
              }}
            >
              <a
                href={info.websiteUrl}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.taglineFr}
              </a>
              <span style={{ margin: '0 8px', color: '#c9c0b3', fontStyle: 'normal' }}>·</span>
              <a
                href={info.websiteUrlNl}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.taglineNl}
              </a>
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// ============================================================================
// Design 5 — Centered formal
// ============================================================================

function Design5({ info }: { info: Info }) {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      style={{
        borderCollapse: 'collapse',
        fontFamily: 'Helvetica, Arial, sans-serif',
        textAlign: 'center',
        margin: '0 auto',
      }}
    >
      <tbody>
        <tr>
          <td style={{ textAlign: 'center', padding: '0 0 14px 0' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={info.logoUrl}
              alt={info.atelier}
              width={180}
              height={62}
              style={{ display: 'inline-block', height: 'auto', width: 180, border: 0 }}
            />
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>
            <p
              style={{
                margin: 0,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 26,
                color: '#1c1916',
                lineHeight: '1.2',
              }}
            >
              {info.name}
            </p>
            <table
              cellPadding={0}
              cellSpacing={0}
              style={{ borderCollapse: 'collapse', margin: '6px auto 0' }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      backgroundColor: '#8b6f47',
                      width: 32,
                      height: 1,
                      lineHeight: '1px',
                      fontSize: 1,
                    }}
                  >
                    &nbsp;
                  </td>
                </tr>
              </tbody>
            </table>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 11,
                color: '#8b6f47',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {info.roleFr} · {info.roleNl}
            </p>
            <p
              style={{
                margin: '14px 0 0',
                fontSize: 12,
                color: '#807870',
                lineHeight: '1.7',
              }}
            >
              {info.address}
              <br />
              <a
                href={`tel:${info.phoneTel}`}
                style={{ color: '#1c1916', textDecoration: 'none' }}
              >
                {info.phone}
              </a>
              <span style={{ margin: '0 8px', color: '#c9c0b3' }}>·</span>
              <a
                href={`mailto:${info.email}`}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.email}
              </a>
              <br />
              <a
                href={info.websiteUrl}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.website}
              </a>
            </p>
            <p
              style={{
                margin: '12px 0 0',
                fontSize: 11,
                color: '#807870',
                fontStyle: 'italic',
              }}
            >
              <a
                href={info.websiteUrl}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.taglineFr}
              </a>
              <span style={{ margin: '0 8px', color: '#c9c0b3', fontStyle: 'normal' }}>·</span>
              <a
                href={info.websiteUrlNl}
                style={{ color: '#8b6f47', textDecoration: 'none' }}
              >
                {info.taglineNl}
              </a>
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// ============================================================================
// Instructions
// ============================================================================

function Instructions() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="bg-(--color-paper) border border-(--color-frame) p-6">
        <h3 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
          <Apple className="w-3.5 h-3.5" />
          Apple Mail · Mac
        </h3>
        <ol className="space-y-2.5 text-sm text-(--color-charcoal) list-decimal pl-4">
          <li>Sur cette page, clique <strong>« Sélectionner et copier »</strong> sous le design choisi.</li>
          <li>Ouvre <strong>Mail</strong>.</li>
          <li>Menu <strong>Mail → Réglages → Signatures</strong>.</li>
          <li>
            Sélectionne ton compte mail à gauche, clique sur le <strong>+</strong> en
            bas pour créer une nouvelle signature.
          </li>
          <li>
            Donne-lui un nom (ex. <em>Atelier</em>), puis dans le panneau de droite
            <strong> efface tout le texte par défaut</strong>.
          </li>
          <li>
            <strong>Décoche</strong> « Toujours utiliser ma police par défaut » en bas
            (sinon Mail écrase la mise en page).
          </li>
          <li>
            Clique dans le panneau de droite et fais <strong>Cmd + V</strong> pour
            coller la signature.
          </li>
          <li>
            Glisse la signature sur ton compte à gauche pour l&apos;activer, puis
            choisis-la dans le menu déroulant <strong>« Choisir la signature »</strong>.
          </li>
          <li>Ferme la fenêtre. Ouvre un nouveau message pour tester.</li>
        </ol>
      </div>

      <div className="bg-(--color-paper) border border-(--color-frame) p-6">
        <h3 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
          <Smartphone className="w-3.5 h-3.5" />
          Mail · iPhone
        </h3>
        <p className="text-xs text-(--color-stone) mb-3">
          iOS ne permet pas de coller du texte enrichi directement dans les
          réglages. Astuce : envoie-toi la signature par mail, puis copie-la
          depuis le mail reçu.
        </p>
        <ol className="space-y-2.5 text-sm text-(--color-charcoal) list-decimal pl-4">
          <li>
            Sur ton Mac, copie d&apos;abord la signature comme expliqué à gauche, puis
            envoie-toi un mail à toi-même contenant uniquement la signature collée.
          </li>
          <li>Sur l&apos;iPhone, ouvre le mail que tu viens de recevoir.</li>
          <li>
            Appuie longuement sur la signature, choisis <strong>« Tout sélectionner »</strong>{' '}
            puis <strong>« Copier »</strong>.
          </li>
          <li>
            Ouvre <strong>Réglages → Mail → Signature</strong>.
          </li>
          <li>Si tu as plusieurs comptes, choisis « Par compte ».</li>
          <li>
            Efface le texte existant, appuie longuement et choisis{' '}
            <strong>« Coller »</strong>.
          </li>
          <li>
            Une fois collée, secoue ton iPhone (ou appuie longuement → « Annuler la
            modification ») pour récupérer la mise en forme — astuce iOS.
          </li>
          <li>
            Reviens à l&apos;écran d&apos;accueil et écris un nouveau mail pour tester.
          </li>
        </ol>
      </div>
    </section>
  )
}
