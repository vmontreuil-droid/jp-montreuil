import type { MetadataRoute } from 'next'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/auth', '/album/'],
      },
    ],
    sitemap: `${PUBLIC_BASE_URL.replace(/\/$/, '')}/sitemap.xml`,
    host: PUBLIC_BASE_URL.replace(/\/$/, ''),
  }
}
