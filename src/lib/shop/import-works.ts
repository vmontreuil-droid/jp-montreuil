/**
 * Import alle werken uit public.works (papa's portfolio) als
 * shop.photos zodat ze in de boutique te bestellen zijn.
 *
 * - Categorie 'bronze' wordt overgeslagen (bronzen sculpturen — geen
 *   prints van te maken).
 * - Idempotent: shop.photos.work_id is unique → herhalen voegt enkel
 *   nieuwe rijen toe.
 * - Storage_path verwijst naar de bestaande 'works' bucket — geen
 *   duplicate data, gebruikt photo-url helper met bucket-arg.
 * - Orientation auto bepaald uit width/height.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createShopAdminClient } from './supabase'
import { slugify, WORKS_BUCKET } from './photo-url'

const EXCLUDED_CATEGORY_SLUGS = ['bronze']

type WorkRow = {
  id: string
  category_id: string
  storage_path: string
  width: number | null
  height: number | null
  title_fr: string | null
  title_nl: string | null
  year: number | null
  technique_fr: string | null
  technique_nl: string | null
  dimensions: string | null
  sort_order: number
}

type CategoryRow = {
  id: string
  slug: string
  label_fr: string
  label_nl: string
}

export type ImportWorksReport = {
  inserted: number
  skipped: number
  excluded: number
  byCategory: Record<string, number>
}

function deriveOrientation(w: number | null, h: number | null): 'portrait' | 'landscape' | 'square' {
  if (!w || !h) return 'portrait'
  if (w === h) return 'square'
  return w > h ? 'landscape' : 'portrait'
}

function buildSlug(work: WorkRow, catSlug: string, takenSlugs: Set<string>): string {
  const titleSlug = work.title_fr ? slugify(work.title_fr) : ''
  let base = titleSlug
    ? `${catSlug}-${titleSlug}`
    : `${catSlug}-${work.id.slice(0, 8)}`
  let slug = base
  let n = 1
  while (takenSlugs.has(slug)) {
    n += 1
    slug = `${base}-${n}`
  }
  takenSlugs.add(slug)
  return slug
}

export async function importWorksAsShopPhotos(): Promise<ImportWorksReport> {
  const admin = createAdminClient()
  const shop = createShopAdminClient()

  // 1) Categorieën ophalen + bronze filteren
  const { data: cats, error: catsErr } = await admin
    .from('categories').select('id, slug, label_fr, label_nl')
  if (catsErr) throw catsErr
  const allowedCats = new Map<string, CategoryRow>()
  let excluded = 0
  for (const c of (cats ?? []) as CategoryRow[]) {
    if (EXCLUDED_CATEGORY_SLUGS.includes(c.slug)) {
      excluded += 1
      continue
    }
    allowedCats.set(c.id, c)
  }

  // 2) Alle werken ophalen
  const { data: works, error: worksErr } = await admin
    .from('works')
    .select('id, category_id, storage_path, width, height, title_fr, title_nl, year, technique_fr, technique_nl, dimensions, sort_order')
  if (worksErr) throw worksErr

  // 3) Bestaande shop.photos.work_id mapping (om dubbels te skippen)
  const { data: existing } = await shop
    .from('photos').select('slug, work_id').not('work_id', 'is', null)
  const existingWorkIds = new Set(
    ((existing ?? []) as { work_id: string }[]).map((r) => r.work_id),
  )
  const takenSlugs = new Set(
    ((existing ?? []) as { slug: string }[]).map((r) => r.slug),
  )
  // Ook bestaande slugs zonder work_id meenemen
  const { data: allSlugs } = await shop.from('photos').select('slug')
  for (const r of (allSlugs ?? []) as { slug: string }[]) takenSlugs.add(r.slug)

  const report: ImportWorksReport = {
    inserted: 0,
    skipped: 0,
    excluded,
    byCategory: {},
  }

  // 4) Per work een shop.photos rij bouwen
  const rows: Record<string, unknown>[] = []
  for (const w of (works ?? []) as WorkRow[]) {
    const cat = allowedCats.get(w.category_id)
    if (!cat) {
      // category niet in allowed (bv. bronze) — skip stilletjes
      continue
    }
    if (existingWorkIds.has(w.id)) {
      report.skipped += 1
      continue
    }
    const slug = buildSlug(w, cat.slug, takenSlugs)
    const titleParts = [w.title_fr ?? '', w.year ? `(${w.year})` : ''].filter(Boolean)
    const description = [w.technique_fr, w.dimensions].filter(Boolean).join(' · ') || null
    rows.push({
      slug,
      title: titleParts.join(' ').trim() || null,
      description,
      alt_text: w.title_fr ?? null,
      storage_path: w.storage_path,
      bucket: WORKS_BUCKET,
      width: w.width,
      height: w.height,
      orientation: deriveOrientation(w.width, w.height),
      is_published: true, // Vincent's wens: alle foto's direct actief
      sort_order: w.sort_order,
      work_id: w.id,
      category_slug: cat.slug,
    })
    report.byCategory[cat.slug] = (report.byCategory[cat.slug] ?? 0) + 1
  }

  if (rows.length === 0) return report

  // 5) Bulk insert (in batches van 100 om PostgREST-limit te respecteren)
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { error } = await shop.from('photos').insert(batch)
    if (error) throw error
  }
  report.inserted = rows.length
  return report
}

/**
 * Lijst beschikbare categorieën in de shop (uniek + telling). Gebruikt
 * door de boutique-landing voor de filter-pills.
 */
export async function listShopCategories(): Promise<Array<{ slug: string; label: string; count: number }>> {
  const admin = createAdminClient()
  const shop = createShopAdminClient()

  const { data: photos } = await shop
    .from('photos')
    .select('category_slug')
    .eq('is_published', true)
    .not('category_slug', 'is', null)

  const counts = new Map<string, number>()
  for (const p of (photos ?? []) as { category_slug: string | null }[]) {
    if (!p.category_slug) continue
    counts.set(p.category_slug, (counts.get(p.category_slug) ?? 0) + 1)
  }

  if (counts.size === 0) return []

  const { data: cats } = await admin
    .from('categories')
    .select('slug, label_fr, sort_order')
    .in('slug', [...counts.keys()])
    .order('sort_order')

  return ((cats ?? []) as { slug: string; label_fr: string; sort_order: number }[])
    .map((c) => ({
      slug: c.slug,
      label: c.label_fr,
      count: counts.get(c.slug) ?? 0,
    }))
}
