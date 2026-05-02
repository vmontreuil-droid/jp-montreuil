'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import {
  ArrowUp,
  ArrowDown,
  BookOpen,
  Eye,
  EyeOff,
  FileText,
  Loader2,
} from 'lucide-react'
import { ibookUrl } from '@/lib/ibook-url'
import { moveIbook } from './actions'

type Props = {
  ibook: {
    id: string
    title_fr: string
    title_nl: string
    cover_path: string | null
    pdf_path: string | null
    sort_order: number
    is_active: boolean
  }
  isFirst: boolean
  isLast: boolean
}

export default function IbookListItem({ ibook, isFirst, isLast }: Props) {
  const [pending, startTransition] = useTransition()

  function move(dir: 'up' | 'down') {
    startTransition(() => {
      void moveIbook(ibook.id, dir)
    })
  }

  return (
    <li className="bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze)/50 transition-colors">
      <div className="flex items-stretch gap-4 p-3">
        {/* Cover thumb */}
        <Link
          href={`/admin/ibook/${ibook.id}`}
          className="relative w-20 h-24 shrink-0 bg-(--color-canvas) border border-(--color-frame) overflow-hidden"
        >
          {ibook.cover_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ibookUrl(ibook.cover_path)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-(--color-stone)">
              <BookOpen className="w-6 h-6 opacity-50" />
            </div>
          )}
        </Link>

        {/* Info */}
        <Link
          href={`/admin/ibook/${ibook.id}`}
          className="flex-1 min-w-0 flex flex-col justify-center"
        >
          <p className="text-(--color-ink) font-[family-name:var(--font-display)] text-lg leading-tight truncate">
            {ibook.title_fr || ibook.title_nl || 'Sans titre'}
          </p>
          {ibook.title_nl && ibook.title_fr !== ibook.title_nl && (
            <p className="text-xs text-(--color-stone) truncate">{ibook.title_nl}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--color-stone)">
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {ibook.pdf_path ? (
                'PDF présent'
              ) : (
                <span className="text-red-300">PDF manquant</span>
              )}
            </span>
            <span>#{ibook.sort_order}</span>
          </div>
        </Link>

        {/* Reorder + status */}
        <div className="flex flex-col items-end justify-between gap-2 shrink-0">
          <div
            className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-[0.15em] border ${
              ibook.is_active
                ? 'border-(--color-bronze) text-(--color-bronze)'
                : 'border-(--color-frame) text-(--color-stone)'
            }`}
          >
            {ibook.is_active ? (
              <>
                <Eye className="w-3 h-3" /> Visible
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3" /> Caché
              </>
            )}
          </div>
          <div className="inline-flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => move('up')}
              disabled={isFirst || pending}
              aria-label="Monter"
              className="p-1.5 text-(--color-stone) hover:text-(--color-ink) disabled:opacity-30"
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => move('down')}
              disabled={isLast || pending}
              aria-label="Descendre"
              className="p-1.5 text-(--color-stone) hover:text-(--color-ink) disabled:opacity-30"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}
