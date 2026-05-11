import { notFound, redirect } from 'next/navigation'
import { resolveShareLink } from '@/app/shop/boutique/photo/[slug]/share-actions'

export const dynamic = 'force-dynamic'

/**
 * /s/[code] — short-URL resolver. Lookup de code in shop.share_links
 * en redirect naar /shop/boutique/photo/{slug}?material=…&size=…&...
 *
 * Gebruikt door de "Partager"-knop in de configurator (zie
 * FramedPreview onShare). Lange URLs blijven werken; deze route is
 * enkel voor compactere deelbare links.
 */
export default async function ShareCodePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const r = await resolveShareLink(code)
  if (!r.ok) notFound()
  const sp = new URLSearchParams(r.params)
  const target = `/shop/boutique/photo/${r.slug}${sp.toString() ? `?${sp.toString()}` : ''}`
  redirect(target)
}
