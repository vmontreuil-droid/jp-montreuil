import Link from 'next/link'
import { Newspaper, Plus, Sparkles, Edit3, AlertTriangle, ArrowRight } from 'lucide-react'
import {
  listAllPosts,
  journalTablesExist,
  type JournalStatus,
} from '@/lib/journal'

export const dynamic = 'force-dynamic'

const STATUS_BADGE: Record<JournalStatus, string> = {
  draft: 'bg-amber-100 text-amber-900',
  published: 'bg-emerald-100 text-emerald-900',
  archived: 'bg-(--color-frame)/40 text-(--color-stone)',
}

const STATUS_LABEL: Record<JournalStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
}

const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium' })

export default async function JournalAdminPage() {
  const tablesExist = await journalTablesExist()
  const posts = await listAllPosts()

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-(--color-bronze)" />
            Journal
          </h1>
          <p className="text-sm text-(--color-charcoal) mt-1">
            Articles de blog bilingues — IA propose, vous éditez, vous publiez.
          </p>
        </div>
        <Link
          href="/admin/journal/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em]"
        >
          <Plus className="w-4 h-4" />
          Nouvel article
        </Link>
      </header>

      {!tablesExist && (
        <div className="bg-amber-50 border border-amber-300 p-5">
          <p className="font-medium text-amber-900 inline-flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" />
            Migration 0032_journal pas encore appliquée
          </p>
          <p className="text-sm text-amber-900/90 mb-3">
            Plak <code className="bg-amber-100 px-1">supabase/migrations/0032_journal.sql</code>{' '}
            dans le Supabase SQL Editor en run.
          </p>
          <a
            href="https://supabase.com/dashboard/project/_/sql/new"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-700 text-white hover:bg-amber-800 text-xs uppercase tracking-widest"
          >
            Open Supabase SQL Editor <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="bg-(--color-paper) border border-(--color-frame) p-12 text-center">
          <Newspaper className="w-10 h-10 mx-auto mb-4 text-(--color-stone)/40" />
          <p className="text-(--color-charcoal) mb-6">
            Aucun article pour le moment. Lancez votre premier journal de bord.
          </p>
          <Link
            href="/admin/journal/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Créer le premier article
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/journal/${p.id}/edit`}
                className="block bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${STATUS_BADGE[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                      {p.ai_drafted_at && (
                        <span className="text-[10px] uppercase tracking-widest text-(--color-bronze) inline-flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> Draft IA
                        </span>
                      )}
                      <span className="text-xs text-(--color-stone)">/{p.slug}</span>
                    </div>
                    <p className="font-[family-name:var(--font-display)] text-xl text-(--color-ink) leading-snug">
                      {p.title_fr || <span className="italic text-(--color-stone)">(sans titre FR)</span>}
                    </p>
                    {p.title_nl && (
                      <p className="text-xs text-(--color-stone) mt-1">
                        <span className="text-(--color-charcoal)">NL :</span> {p.title_nl}
                      </p>
                    )}
                    {p.excerpt_fr && (
                      <p className="text-sm text-(--color-charcoal) mt-2 leading-relaxed line-clamp-2">
                        {p.excerpt_fr}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-(--color-stone)">
                      {dateFmt.format(new Date(p.updated_at))}
                    </p>
                    {p.tags.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap justify-end max-w-[200px]">
                        {p.tags.slice(0, 4).map((t) => (
                          <span key={t} className="text-[10px] text-(--color-stone) bg-(--color-canvas) px-1.5 py-0.5 border border-(--color-frame)">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-(--color-bronze)">
                  <Edit3 className="w-3 h-3" /> Éditer
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
