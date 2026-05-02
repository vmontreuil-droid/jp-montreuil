import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

const BASE = PUBLIC_BASE_URL.replace(/\/$/, '')

const STATIC_PATHS = [
  { path: '/', priority: 1.0 },
  { path: '/galerie', priority: 0.9 },
  { path: '/a-propos', priority: 0.7 },
  { path: '/social', priority: 0.7 },
  { path: '/contact', priority: 0.8 },
  { path: '/mentions-legales', priority: 0.3 },
  { path: '/confidentialite', priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const { data: cats } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .order('sort_order', { ascending: true })

  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  // Statisch — FR (zonder prefix) + NL (/nl prefix)
  for (const { path, priority } of STATIC_PATHS) {
    const fr = `${BASE}${path}`
    const nl = `${BASE}/nl${path === '/' ? '' : path}`
    entries.push({
      url: fr,
      lastModified: now,
      changeFrequency: 'weekly',
      priority,
      alternates: { languages: { fr, nl } },
    })
    entries.push({
      url: nl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority,
      alternates: { languages: { fr, nl } },
    })
  }

  // Dynamische categorie-pagina's
  for (const c of cats ?? []) {
    const fr = `${BASE}/galerie/${c.slug}`
    const nl = `${BASE}/nl/galerie/${c.slug}`
    const lastModified = c.updated_at ? new Date(c.updated_at) : now
    entries.push({
      url: fr,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: { languages: { fr, nl } },
    })
    entries.push({
      url: nl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: { languages: { fr, nl } },
    })
  }

  return entries
}
