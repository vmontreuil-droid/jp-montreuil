'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createPost,
  updatePost,
  deletePost,
  slugifyTitle,
  type JournalStatus,
} from '@/lib/journal'
import { generateJournalDraft } from '@/lib/ai-journal'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
}

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim()
}

/**
 * Maak een nieuwe post — optioneel via AI-draft.
 * Velden:
 *  - mode = 'manual' | 'ai'
 *  - topic, keywords, notes (alleen voor mode='ai')
 *  - title_fr, title_nl, etc. (alleen voor mode='manual')
 */
export async function createPostAction(form: FormData): Promise<{ id: string }> {
  await requireAdmin()
  const mode = str(form, 'mode')

  if (mode === 'ai') {
    const topic = str(form, 'topic')
    if (!topic) throw new Error('Sujet manquant pour le draft IA')
    const keywords = str(form, 'keywords').split(',').map((k) => k.trim()).filter(Boolean)
    const notes = str(form, 'notes') || null

    const draft = await generateJournalDraft({ topic, keywords, notes })
    const slug = await uniqueSlug(slugifyTitle(draft.title_fr || topic))
    const post = await createPost({
      slug,
      ...draft,
      ai_drafted_at: new Date().toISOString(),
    })
    revalidatePath('/admin/journal')
    return { id: post.id }
  }

  // mode='manual' — minimum: titel of slug
  const titleFr = str(form, 'title_fr') || str(form, 'topic')
  const slug = await uniqueSlug(slugifyTitle(titleFr || `post-${Date.now().toString(36)}`))
  const post = await createPost({
    slug,
    title_fr: titleFr,
    title_nl: str(form, 'title_nl'),
  })
  revalidatePath('/admin/journal')
  return { id: post.id }
}

export async function createPostActionAndRedirect(form: FormData): Promise<void> {
  const { id } = await createPostAction(form)
  redirect(`/admin/journal/${id}/edit`)
}

export async function updatePostAction(id: string, form: FormData): Promise<void> {
  await requireAdmin()
  const status = str(form, 'status') as JournalStatus
  const validStatuses: JournalStatus[] = ['draft', 'published', 'archived']
  const finalStatus: JournalStatus = validStatuses.includes(status) ? status : 'draft'

  // Bij overgang naar 'published' zonder published_at → zet nu
  const publishedAtRaw = str(form, 'published_at')
  let publishedAt: string | null = publishedAtRaw || null
  if (finalStatus === 'published' && !publishedAt) {
    publishedAt = new Date().toISOString()
  }

  const tagsRaw = str(form, 'tags')
  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []

  await updatePost(id, {
    slug: str(form, 'slug'),
    status: finalStatus,
    title_fr: str(form, 'title_fr'),
    title_nl: str(form, 'title_nl'),
    excerpt_fr: str(form, 'excerpt_fr'),
    excerpt_nl: str(form, 'excerpt_nl'),
    body_fr: str(form, 'body_fr'),
    body_nl: str(form, 'body_nl'),
    cover_image_path: str(form, 'cover_image_path') || null,
    tags,
    published_at: publishedAt,
  })

  revalidatePath('/admin/journal')
  revalidatePath(`/admin/journal/${id}/edit`)
  revalidatePath('/journal', 'layout')
  revalidatePath('/nl/journal', 'layout')
}

export async function deletePostAction(id: string): Promise<void> {
  await requireAdmin()
  await deletePost(id)
  revalidatePath('/admin/journal')
  revalidatePath('/journal', 'layout')
  redirect('/admin/journal')
}

/**
 * Server action voor de "Verbeter via AI" knop in de editor: genereert
 * opnieuw een draft, maar overschrijft niet — returnt voor preview.
 */
export async function regenerateDraftAction(form: FormData): Promise<{
  title_fr: string; title_nl: string
  excerpt_fr: string; excerpt_nl: string
  body_fr: string; body_nl: string
  tags: string[]
}> {
  await requireAdmin()
  const topic = str(form, 'topic')
  const keywords = str(form, 'keywords').split(',').map((k) => k.trim()).filter(Boolean)
  if (!topic) throw new Error('Sujet manquant')
  return await generateJournalDraft({ topic, keywords, notes: str(form, 'notes') || null })
}

// ───────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────

async function uniqueSlug(base: string): Promise<string> {
  const supabase = await createClient()
  let slug = base
  let n = 1
  while (true) {
    const { data } = await supabase.from('journal_posts').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    n += 1
    slug = `${base}-${n}`
    if (n > 100) return `${base}-${Date.now().toString(36)}`
  }
}
