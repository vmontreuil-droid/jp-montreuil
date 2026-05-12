import { listPublishedPosts, type JournalPost } from '@/lib/journal'
import { PUBLIC_BASE_URL } from '@/lib/public-url'

export const dynamic = 'force-dynamic'
export const revalidate = 600 // 10 min

const BASE = PUBLIC_BASE_URL.replace(/\/$/, '')

/**
 * RSS 2.0 feed van de journal-posts (FR-versie als default — RSS heeft
 * geen native multilang). Wordt door Feedly + sommige Google features
 * gebruikt.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  let posts: JournalPost[] = []
  try {
    posts = await listPublishedPosts({ limit: 50 })
  } catch {
    // Tables not yet migrated → empty feed
  }

  const items = posts.map((p) => `
    <item>
      <title>${escapeXml(p.title_fr)}</title>
      <link>${BASE}/journal/${p.slug}</link>
      <guid isPermaLink="true">${BASE}/journal/${p.slug}</guid>
      <description>${escapeXml(p.excerpt_fr || p.title_fr)}</description>
      <pubDate>${p.published_at ? new Date(p.published_at).toUTCString() : new Date(p.created_at).toUTCString()}</pubDate>
      ${p.tags.map((t) => `<category>${escapeXml(t)}</category>`).join('')}
    </item>`).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Atelier Montreuil — Journal</title>
    <link>${BASE}/journal</link>
    <description>Le carnet d'atelier de Jean-Pierre Montreuil — réflexions, techniques, vie d'atelier.</description>
    <language>fr-BE</language>
    <atom:link href="${BASE}/journal/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=600',
    },
  })
}
