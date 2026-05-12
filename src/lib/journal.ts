/**
 * Journal/blog helpers — posts in FR + NL voor SEO long-tail traffic.
 *
 * Public read: gebruikt admin-client want RLS staat het toe (status =
 * published) maar service-role is sneller voor SSG/SSR.
 * Mutations: enkel via /admin (RLS via is_admin policy).
 */

import { createAdminClient } from '@/lib/supabase/admin'

export type JournalStatus = 'draft' | 'published' | 'archived'

export type JournalPost = {
  id: string
  slug: string
  status: JournalStatus
  title_fr: string
  title_nl: string
  excerpt_fr: string
  excerpt_nl: string
  body_fr: string
  body_nl: string
  cover_image_path: string | null
  tags: string[]
  published_at: string | null
  ai_drafted_at: string | null
  created_at: string
  updated_at: string
}

/** Detecteer "table missing" zodat de admin een nette empty-state krijgt
 *  wanneer migratie 0032 nog niet is toegepast. */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || /Could not find the table/i.test(error.message ?? '')
}

export async function journalTablesExist(): Promise<boolean> {
  const sb = createAdminClient()
  const { error } = await sb.from('journal_posts').select('id', { head: true, count: 'exact' }).limit(1)
  return !isMissingTable(error)
}

/** Publieke lijst — enkel gepubliceerd, in volgorde van published_at desc. */
export async function listPublishedPosts(opts?: { limit?: number }): Promise<JournalPost[]> {
  const sb = createAdminClient()
  const nowIso = new Date().toISOString()
  let q = sb
    .from('journal_posts')
    .select('*')
    .eq('status', 'published')
    .lte('published_at', nowIso)
    .order('published_at', { ascending: false, nullsFirst: false })
  if (opts?.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (isMissingTable(error)) return []
  if (error) throw error
  return (data ?? []) as JournalPost[]
}

/** Eén publieke post via slug. Returns null voor draft/archived/missing. */
export async function getPublishedPostBySlug(slug: string): Promise<JournalPost | null> {
  const sb = createAdminClient()
  const nowIso = new Date().toISOString()
  const { data, error } = await sb
    .from('journal_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', nowIso)
    .maybeSingle()
  if (isMissingTable(error)) return null
  if (error) throw error
  return (data as JournalPost | null) ?? null
}

/** Admin-lijst — alle statussen. */
export async function listAllPosts(): Promise<JournalPost[]> {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('journal_posts')
    .select('*')
    .order('updated_at', { ascending: false })
  if (isMissingTable(error)) return []
  if (error) throw error
  return (data ?? []) as JournalPost[]
}

export async function getPostById(id: string): Promise<JournalPost | null> {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('journal_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (isMissingTable(error)) return null
  if (error) throw error
  return (data as JournalPost | null) ?? null
}

export async function createPost(input: {
  slug: string
  title_fr?: string
  title_nl?: string
  excerpt_fr?: string
  excerpt_nl?: string
  body_fr?: string
  body_nl?: string
  cover_image_path?: string | null
  tags?: string[]
  ai_drafted_at?: string | null
}): Promise<JournalPost> {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('journal_posts')
    .insert({
      slug: input.slug,
      title_fr: input.title_fr ?? '',
      title_nl: input.title_nl ?? '',
      excerpt_fr: input.excerpt_fr ?? '',
      excerpt_nl: input.excerpt_nl ?? '',
      body_fr: input.body_fr ?? '',
      body_nl: input.body_nl ?? '',
      cover_image_path: input.cover_image_path ?? null,
      tags: input.tags ?? [],
      ai_drafted_at: input.ai_drafted_at ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as JournalPost
}

export async function updatePost(
  id: string,
  patch: Partial<Omit<JournalPost, 'id' | 'created_at' | 'updated_at'>>,
): Promise<void> {
  const sb = createAdminClient()
  const { error } = await sb.from('journal_posts').update(patch).eq('id', id)
  if (error) throw error
}

export async function deletePost(id: string): Promise<void> {
  const sb = createAdminClient()
  const { error } = await sb.from('journal_posts').delete().eq('id', id)
  if (error) throw error
}

/** Generate slug uit titel — voor de "new post"-flow. */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `post-${Date.now().toString(36)}`
}
