'use client'

import { useState, useTransition } from 'react'
import { Save, Trash2, Sparkles, Eye, Loader2 } from 'lucide-react'
import type { JournalPost } from '@/lib/journal'

type Props = {
  post: JournalPost
  updateAction: (id: string, form: FormData) => Promise<void>
  deleteAction: (id: string) => Promise<void>
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
  { value: 'archived', label: 'Archivé' },
] as const

/**
 * Editor met FR + NL kolommen naast elkaar (op desktop), gestapeld op
 * mobile. Live word-count helpt JP de SEO-sweet-spot van 400-700 woorden
 * te raken zonder externe tool.
 */
export default function EditPostForm({ post, updateAction, deleteAction }: Props) {
  const [titleFr, setTitleFr] = useState(post.title_fr)
  const [titleNl, setTitleNl] = useState(post.title_nl)
  const [excerptFr, setExcerptFr] = useState(post.excerpt_fr)
  const [excerptNl, setExcerptNl] = useState(post.excerpt_nl)
  const [bodyFr, setBodyFr] = useState(post.body_fr)
  const [bodyNl, setBodyNl] = useState(post.body_nl)
  const [pending, startTransition] = useTransition()

  const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
  const wordsFr = wordCount(bodyFr)
  const wordsNl = wordCount(bodyNl)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await updateAction(post.id, fd)
    })
  }

  function onDelete() {
    if (!confirm(`Supprimer "${post.title_fr || post.slug}" ?`)) return
    startTransition(async () => {
      await deleteAction(post.id)
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Status + slug + datum */}
      <div className="grid sm:grid-cols-3 gap-4 bg-(--color-paper) border border-(--color-frame) p-5">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">Statut</span>
          <select
            name="status"
            defaultValue={post.status}
            className="w-full px-2 py-1.5 bg-(--color-canvas) border border-(--color-frame) text-sm text-(--color-ink) focus:border-(--color-bronze) focus:outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">Slug</span>
          <input
            name="slug"
            type="text"
            required
            defaultValue={post.slug}
            pattern="[a-z0-9-]+"
            className="w-full px-2 py-1.5 bg-(--color-canvas) border border-(--color-frame) text-sm text-(--color-ink) focus:border-(--color-bronze) focus:outline-none font-mono"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">
            Publication
          </span>
          <input
            name="published_at"
            type="datetime-local"
            defaultValue={post.published_at ? post.published_at.slice(0, 16) : ''}
            className="w-full px-2 py-1.5 bg-(--color-canvas) border border-(--color-frame) text-sm text-(--color-ink) focus:border-(--color-bronze) focus:outline-none"
          />
        </label>
      </div>

      {/* Cover image + tags */}
      <div className="grid sm:grid-cols-2 gap-4 bg-(--color-paper) border border-(--color-frame) p-5">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">
            Image de couverture (path dans bucket &lsquo;works&rsquo;)
          </span>
          <input
            name="cover_image_path"
            type="text"
            defaultValue={post.cover_image_path ?? ''}
            placeholder="ex: portraits/cheval-bai-2025.jpg"
            className="w-full px-2 py-1.5 bg-(--color-canvas) border border-(--color-frame) text-sm text-(--color-ink) focus:border-(--color-bronze) focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">
            Tags (séparés par des virgules)
          </span>
          <input
            name="tags"
            type="text"
            defaultValue={post.tags.join(', ')}
            className="w-full px-2 py-1.5 bg-(--color-canvas) border border-(--color-frame) text-sm text-(--color-ink) focus:border-(--color-bronze) focus:outline-none"
          />
        </label>
      </div>

      {/* FR + NL kolommen */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* FR */}
        <div className="space-y-3 bg-(--color-paper) border border-(--color-frame) p-5">
          <p className="text-[10px] uppercase tracking-widest text-(--color-bronze) font-medium">Français</p>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">Titre</span>
            <input
              name="title_fr"
              type="text"
              required
              value={titleFr}
              onChange={(e) => setTitleFr(e.target.value)}
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">
              Extrait <span className="text-(--color-stone)/60 normal-case tracking-normal">({excerptFr.length}/200)</span>
            </span>
            <textarea
              name="excerpt_fr"
              rows={2}
              value={excerptFr}
              onChange={(e) => setExcerptFr(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">
              Corps (Markdown) <span className={`normal-case tracking-normal ${
                wordsFr >= 400 && wordsFr <= 800 ? 'text-emerald-700' : 'text-(--color-stone)/60'
              }`}>
                — {wordsFr} mots {wordsFr < 400 ? '(min 400)' : wordsFr > 800 ? '(max 800)' : '✓'}
              </span>
            </span>
            <textarea
              name="body_fr"
              rows={20}
              value={bodyFr}
              onChange={(e) => setBodyFr(e.target.value)}
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm font-mono focus:border-(--color-bronze) focus:outline-none resize-y"
            />
          </label>
        </div>

        {/* NL */}
        <div className="space-y-3 bg-(--color-paper) border border-(--color-frame) p-5">
          <p className="text-[10px] uppercase tracking-widest text-(--color-bronze) font-medium">Nederlands</p>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">Titel</span>
            <input
              name="title_nl"
              type="text"
              value={titleNl}
              onChange={(e) => setTitleNl(e.target.value)}
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">
              Samenvatting <span className="text-(--color-stone)/60 normal-case tracking-normal">({excerptNl.length}/200)</span>
            </span>
            <textarea
              name="excerpt_nl"
              rows={2}
              value={excerptNl}
              onChange={(e) => setExcerptNl(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-(--color-stone) block mb-1.5">
              Tekst (Markdown) <span className={`normal-case tracking-normal ${
                wordsNl >= 400 && wordsNl <= 800 ? 'text-emerald-700' : 'text-(--color-stone)/60'
              }`}>
                — {wordsNl} woorden {wordsNl < 400 ? '(min 400)' : wordsNl > 800 ? '(max 800)' : '✓'}
              </span>
            </span>
            <textarea
              name="body_nl"
              rows={20}
              value={bodyNl}
              onChange={(e) => setBodyNl(e.target.value)}
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm font-mono focus:border-(--color-bronze) focus:outline-none resize-y"
            />
          </label>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex items-center gap-2 px-3 py-2 text-(--color-stone) hover:text-red-700 text-xs uppercase tracking-widest disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Supprimer
        </button>

        <div className="flex items-center gap-3">
          {post.status === 'published' && (
            <a
              href={`/journal/${post.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 border border-(--color-frame) hover:border-(--color-bronze) text-xs uppercase tracking-widest text-(--color-charcoal) hover:text-(--color-bronze)"
            >
              <Eye className="w-3.5 h-3.5" /> Voir
            </a>
          )}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>

      {post.ai_drafted_at && (
        <p className="text-[11px] text-(--color-stone) inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-(--color-bronze)" />
          Draft initial généré par Claude le{' '}
          {new Date(post.ai_drafted_at).toLocaleDateString('fr-BE', { dateStyle: 'medium' })}
        </p>
      )}
    </form>
  )
}
