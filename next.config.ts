import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
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
