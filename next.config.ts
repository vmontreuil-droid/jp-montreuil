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
      // Contact-formulier ondersteunt foto-bijlagen tot ~25MB totaal
      bodySizeLimit: '30mb',
    },
  },
}

export default nextConfig
