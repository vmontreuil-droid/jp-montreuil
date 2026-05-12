import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { listShopPhotos } from '@/lib/shop/photos'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

const BASE = PUBLIC_BASE_URL.replace(/\/$/, '')

/**
 * STATIC_PATHS = pages onder [locale] die zowel /xxx als /nl/xxx
 * versies hebben. priority hoog → vaak gecrawld.
 */
const STATIC_PATHS = [
  { path: '/', priority: 1.0 },
  { path: '/galerie', priority: 0.9 },
  { path: '/expositions', priority: 0.85 },
  { path: '/a-propos', priority: 0.7 },
  { path: '/social', priority: 0.7 },
  { path: '/contact', priority: 0.8 },
  { path: '/devis', priority: 0.85 },
  { path: '/comment-ca-marche', priority: 0.7 },
  { path: '/presse', priority: 0.6 },
  { path: '/avis', priority: 0.7 },
  { path: '/mentions-legales', priority: 0.3 },
  { path: '/confidentialite', priority: 0.3 },
]

/**
 * Helper: voeg een entry toe met FR + NL hreflang-alternates.
 * Maakt 2 entries (één per taal) zodat beide in Google Search Console
 * apart geïndexeerd worden.
 */
function bilingualEntries(
  path: string,
  priority: number,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly',
): MetadataRoute.Sitemap {
  const fr = `${BASE}${path}`
  const nl = `${BASE}/nl${path === '/' ? '' : path}`
  const alternates = { languages: { fr, nl } }
  return [
    { url: fr, lastModified, changeFrequency, priority, alternates },
    { url: nl, lastModified, changeFrequency, priority, alternates },
  ]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  // ──────────────────────────────────────────────────────────────────
  // Statisch (FR + NL)
  // ──────────────────────────────────────────────────────────────────
  for (const { path, priority } of STATIC_PATHS) {
    entries.push(...bilingualEntries(path, priority, now))
  }

  // ──────────────────────────────────────────────────────────────────
  // Categorieën — /galerie/[slug]
  // ──────────────────────────────────────────────────────────────────
  const { data: cats } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .order('sort_order', { ascending: true })
  for (const c of cats ?? []) {
    const lastModified = c.updated_at ? new Date(c.updated_at) : now
    entries.push(...bilingualEntries(`/galerie/${c.slug}`, 0.8, lastModified))
  }

  // ──────────────────────────────────────────────────────────────────
  // Boutique landing — locale-cookie based, geen [locale] prefix
  // ──────────────────────────────────────────────────────────────────
  entries.push({
    url: `${BASE}/shop/boutique`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.9,
  })

  // ──────────────────────────────────────────────────────────────────
  // Boutique-foto's — /shop/boutique/photo/[slug]
  // Eén entry per gepubliceerde foto (geen FR/NL split — boutique
  // gebruikt cookie-based locale, niet URL-prefix).
  // ──────────────────────────────────────────────────────────────────
  try {
    const photos = await listShopPhotos({ publishedOnly: true })
    for (const p of photos) {
      entries.push({
        url: `${BASE}/shop/boutique/photo/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.75,
      })
    }
  } catch {
    // Shop schema niet beschikbaar → skip stille; sitemap moet altijd 200
  }

  return entries
}
