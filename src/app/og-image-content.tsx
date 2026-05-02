/**
 * Gedeelde JSX voor de programmatische Open Graph- en Twitter-images.
 * Wordt gerenderd door next/og's ImageResponse op 1200×630.
 *
 * Bewust geen Megrim-font: ImageResponse moet de fonts mee-bundelen via
 * `fonts` optie en dat is overkill voor de OG. We gebruiken een serif-stack
 * die elk OS heeft, voor een vergelijkbaar atelier-gevoel.
 */
export function OgImageContent() {
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
      <div
        style={{
          fontSize: 24,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          color: '#807870',
          marginBottom: 24,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        Jean-Pierre Montreuil
      </div>

      <div
        style={{
          fontSize: 130,
          color: '#1c1916',
          lineHeight: 1,
          marginBottom: 32,
        }}
      >
        Atelier Montreuil
      </div>

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
          fontSize: 32,
          color: '#807870',
          fontStyle: 'italic',
        }}
      >
        L&apos;intermédiaire entre vous et la toile
      </div>
    </div>
  )
}
