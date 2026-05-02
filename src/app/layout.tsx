import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Megrim, Montserrat } from 'next/font/google'
import { getRequestLocale } from '@/i18n/server'
import { getDictionary } from '@/i18n/dictionaries'
import { htmlLang } from '@/i18n/config'

// Megrim — geometrische display-font, zelfde als oude jp.montreuil.be
const megrim = Megrim({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale()
  const t = getDictionary(locale)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://montreuil.be'

  return {
    title: { default: t.og.title, template: `%s — ${t.brand}` },
    description: t.og.description,
    metadataBase: new URL(baseUrl),
    openGraph: {
      type: 'website',
      locale: locale === 'fr' ? 'fr_BE' : 'nl_BE',
      url: baseUrl,
      siteName: t.brand,
      title: t.og.title,
      description: t.og.description,
      images: [
        {
          url: '/logo-dark.png',
          width: 743,
          height: 258,
          alt: t.brand,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.og.title,
      description: t.og.description,
      images: ['/logo-dark.png'],
    },
    alternates: {
      canonical: baseUrl,
      languages: {
        'fr-BE': baseUrl,
        'nl-BE': `${baseUrl}/nl`,
      },
    },
    keywords: [
      'Jean-Pierre Montreuil',
      'artiste peintre',
      'kunstschilder',
      'atelier',
      'Anzegem',
      'portrait',
      'cheval',
      'chien',
      'art animalier',
    ],
    authors: [{ name: 'Jean-Pierre Montreuil' }],
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#8b6f47',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getRequestLocale()

  return (
    <html lang={htmlLang[locale]} className={`${megrim.variable} ${montserrat.variable}`}>
      <head>
        {/* Theme init — donker is default; lees voorkeur uit localStorage
            vóór paint om flash van verkeerd thema te voorkomen. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light');}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
