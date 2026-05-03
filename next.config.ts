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
}

export default nextConfig
