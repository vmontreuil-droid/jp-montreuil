/**
 * Gedeelde JSX voor de programmatische Open Graph- en Twitter-images.
 * Wordt gerenderd door next/og's ImageResponse op 1200×630.
 *
 * Het echte logo PNG (Megrim-typografie) wordt geëmbed via absolute URL.
 * Alleen production-bezoekers zien deze image, dus de site-URL is altijd
 * beschikbaar.
 */
export function OgImageContent() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://montreuil.be'
  const logoSrc = `${baseUrl.replace(/\/$/, '')}/logo-dark.png`

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#faf8f5',
        padding: 80,
        textAlign: 'center',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt="Atelier Montreuil"
        width={820}
        height={285}
        style={{ marginBottom: 36 }}
      />

      <div
        style={{
          width: 80,
          height: 3,
          backgroundColor: '#8b6f47',
          marginBottom: 32,
        }}
      />

      <div
        style={{
          fontSize: 30,
          color: '#807870',
          fontStyle: 'italic',
        }}
      >
        L&apos;intermédiaire entre vous et la toile
      </div>
    </div>
  )
}
