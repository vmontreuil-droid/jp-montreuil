import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Megrim, Montserrat } from 'next/font/google'
import { getRequestLocale } from '@/i18n/server'
import { getDictionary } from '@/i18n/dictionaries'
import { htmlLang } from '@/i18n/config'
import { CartProvider } from '@/components/shop/CartProvider'
import { WishlistProvider } from '@/components/shop/WishlistProvider'
import JsonLd from '@/components/seo/JsonLd'
import {
  personJsonLd,
  localBusinessJsonLd,
  webSiteJsonLd,
} from '@/lib/seo/structured-data'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

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
      // images niet expliciet — Next.js injecteert automatisch de
      // 1200×630 image gegenereerd door app/opengraph-image.tsx
    },
    twitter: {
      card: 'summary_large_image',
      title: t.og.title,
      description: t.og.description,
      // idem — twitter-image.tsx levert de afbeelding
    },
    alternates: {
      canonical: baseUrl,
      languages: {
        'fr-BE': baseUrl,
        'nl-BE': `${baseUrl}/nl`,
      },
      types: {
        // <link rel="alternate" type="application/rss+xml" /> voor
        // Feedly + browser-extensions die RSS-feeds detecteren
        'application/rss+xml': `${baseUrl}/journal/rss.xml`,
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
    // Webmaster verification: plak je code uit Google Search Console /
    // Bing Webmaster Tools / Yandex in Vercel env-vars en je bent
    // geverifieerd zonder code-wijziging. Lege strings ⇒ Next.js skipt
    // de meta-tag, dus geen rare lege tags in HTML.
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      yandex: process.env.YANDEX_SITE_VERIFICATION || undefined,
      other: process.env.BING_SITE_VERIFICATION
        ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION }
        : undefined,
    },
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
  const t = getDictionary(locale)
  const base = PUBLIC_BASE_URL.replace(/\/$/, '')

  // Site-wide structured data — verschijnt op elke page. Person en
  // ProfessionalService voeden de Google Knowledge Panel + Maps; WebSite
  // is voor sitelinks-search.
  const siteJsonLd = [
    personJsonLd({
      name: 'Jean-Pierre Montreuil',
      url: base,
      image: `${base}/opengraph-image`,
      description: t.tagline,
      sameAs: ['https://www.facebook.com/jeanpierre.montreuil.3'],
    }),
    localBusinessJsonLd({
      name: t.brand,
      url: base,
      image: `${base}/opengraph-image`,
      telephone: t.contact.phoneValue,
      email: t.contact.emailValue,
      street: 'Heuntjesstraat 6',
      postalCode: '8570',
      city: 'Anzegem',
      country: 'BE',
      description: t.tagline,
    }),
    webSiteJsonLd({ name: t.brand, url: base }),
  ]

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
        <JsonLd data={siteJsonLd} />
      </head>
      <body>
        {/* Cart + Wishlist providers globaal — header heeft die counts
            nodig op alle pagina's, niet enkel /shop. localStorage-only,
            geen runtime-cost op pagina's zonder cart-content. */}
        <WishlistProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </WishlistProvider>
      </body>
    </html>
  )
}
