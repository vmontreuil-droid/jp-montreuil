/**
 * Email design tokens — gedeeld tussen alle email templates.
 * Bewust geen CSS-vars of Tailwind: emails worden inline gestyled.
 * Emails altijd op licht/cream achtergrond — donkere modus is in mail-
 * clients onbetrouwbaar.
 */

export const colors = {
  canvas: '#faf8f5',          // mail bg — warm gebroken wit
  paper: '#f3eee6',
  cream: '#ede4d6',
  frame: '#e3dccf',
  stone: '#807870',
  charcoal: '#2a2622',
  ink: '#1c1916',             // hoofdtekst
  bronze: '#8b6f47',
  bronzeDark: '#6f5736',
  bronzeSoft: 'rgba(139, 111, 71, 0.08)',
  white: '#ffffff',
  border: 'rgba(128, 120, 112, 0.20)',
  borderWarm: 'rgba(139, 111, 71, 0.28)',
}

export const fonts = {
  display: '"Cormorant Garamond", "Times New Roman", Georgia, serif',
  sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: '"SF Mono", Menlo, Consolas, Monaco, monospace',
}

export const text = {
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: '1.65',
    color: colors.ink,
    margin: '0 0 14px',
  } as const,
  small: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: '1.6',
    color: colors.stone,
    margin: '0 0 8px',
  } as const,
  eyebrow: {
    fontFamily: fonts.sans,
    fontSize: 11,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: colors.stone,
    fontWeight: 500,
    margin: '0 0 8px',
  } as const,
  h1: {
    fontFamily: fonts.display,
    fontWeight: 400,
    fontSize: 32,
    lineHeight: '1.2',
    color: colors.ink,
    margin: '0 0 12px',
    letterSpacing: '-0.005em',
  } as const,
  h2: {
    fontFamily: fonts.display,
    fontWeight: 400,
    fontSize: 22,
    lineHeight: '1.3',
    color: colors.ink,
    margin: '0 0 10px',
  } as const,
  label: {
    fontFamily: fonts.sans,
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: colors.stone,
    fontWeight: 600,
    margin: '0 0 4px',
  } as const,
}
