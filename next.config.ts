import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // Vercel-optimizer free-tier (1000 src/maand) raakte op → 402 op nieuwe
    // beelden in galerieën. Plaatjes worden nu direct uit Supabase Storage
    // geserveerd via hun Cloudflare-CDN. Geen webp-conversie meer maar wel
    // betrouwbaar laden voor de hele site.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'usercontent.one' },
    ],
  },
  experimental: {
    serverActions: {
      // Ibook-PDF's tot 50MB + contactform-bijlagen tot 25MB. Buffer tot 60MB.
      bodySizeLimit: '60mb',
    },
  },
  /**
   * iOS Safari (iPad/iPhone) cachte HTML over deploys heen, met als gevolg
   * dat het oude `_next/static/chunks/abc.js`-paden bleef opvragen die na
   * een nieuwe deploy 404'en → 'This page couldn't load'.
   *
   * Door HTML expliciet 'must-revalidate' (max-age=0) mee te geven, blijft
   * Vercel's edge nog steeds cachen (s-maxage uit Next.js), maar moet de
   * browser bij élke pageload bij ons valideren — dus krijg je nooit meer
   * een stuk HTML te zien dat naar verouderde chunks wijst.
   *
   * Statische assets onder /_next/static blijven onaangeroerd: die zijn
   * hash-gestempeld en mogen 1 jaar `immutable` gecached worden zoals
   * Next standaard al doet.
   */
  async headers() {
    return [
      {
        source: '/:path((?!_next/static|_next/image|images|fonts|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|ttf|otf|css|js|map)$).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default nextConfig
