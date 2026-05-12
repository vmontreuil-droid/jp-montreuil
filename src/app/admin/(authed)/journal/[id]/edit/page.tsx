import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { getPostById } from '@/lib/journal'
import { updatePostAction, deletePostAction } from '../../actions'
import EditPostForm from './EditPostForm'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function EditJournalPostPage({ params }: Props) {
  const { id } = await params
  const post = await getPostById(id)
  if (!post) notFound()

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/journal" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Journal
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink) truncate">{post.title_fr || post.slug}</span>
      </div>

      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink)">
            Édition
          </h1>
          <p className="text-xs text-(--color-stone) mt-1">
            Slug : <code className="bg-(--color-paper) px-1">/{post.slug}</code>
          </p>
        </div>
        {post.status === 'published' && (
          <Link
            href={`/journal/${post.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-(--color-frame) hover:border-(--color-bronze) text-xs uppercase tracking-widest text-(--color-charcoal) hover:text-(--color-bronze)"
          >
            <ExternalLink className="w-3 h-3" />
            Voir publié
          </Link>
        )}
      </header>

      <EditPostForm
        post={post}
        updateAction={updatePostAction}
        deleteAction={deletePostAction}
      />
    </main>
  )
}
