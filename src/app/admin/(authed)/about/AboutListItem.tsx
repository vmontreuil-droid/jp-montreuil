'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { ArrowUp, ArrowDown, User as UserIcon, Image as ImageIcon, Loader2 } from 'lucide-react'
import { workImageUrl } from '@/lib/links'
import { moveAboutSection } from './actions'

type Props = {
  section: {
    id: string
    sort_order: number
    title_fr: string
    title_nl: string
    body_fr: string
    body_nl: string
    image_path: string | null
  }
  isFirst: boolean
  isLast: boolean
}

export default function AboutListItem({ section: s, isFirst, isLast }: Props) {
  const [pending, startTransition] = useTransition()

  function move(dir: 'up' | 'down') {
    startTransition(() => {
      void moveAboutSection(s.id, dir)
    })
  }

  const bodyPreview = (s.body_fr || s.body_nl).slice(0, 120)
  const hasContent = !!(s.body_fr || s.body_nl)

  return (
    <li className="bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze)/50 transition-colors">
      <div className="flex items-stretch gap-4 p-3">
        {/* Image thumb */}
        <Link
          href={`/admin/about/${s.id}`}
          className="relative w-20 h-24 shrink-0 bg-(--color-canvas) border border-(--color-frame) overflow-hidden"
        >
          {s.image_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={workImageUrl(s.image_path)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-(--color-stone)">
              <ImageIcon className="w-6 h-6 opacity-40" />
            </div>
          )}
        </Link>

        {/* Info */}
        <Link
          href={`/admin/about/${s.id}`}
          className="flex-1 min-w-0 flex flex-col justify-center"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">
              #{s.sort_order}
            </span>
            {!hasContent && (
              <span className="text-[10px] uppercase tracking-[0.15em] text-red-300">
                · vide
              </span>
            )}
          </div>
          <p className="text-(--color-ink) font-[family-name:var(--font-display)] text-lg leading-tight truncate">
            {s.title_fr || 'Sans titre'}
          </p>
          {s.title_nl && s.title_nl !== s.title_fr && (
            <p className="text-xs text-(--color-stone) truncate">{s.title_nl}</p>
          )}
          {bodyPreview && (
            <p className="mt-1 text-xs text-(--color-stone) truncate">
              {bodyPreview}
              {bodyPreview.length === 120 ? '…' : ''}
            </p>
          )}
        </Link>

        {/* Reorder */}
        <div className="flex flex-col items-end justify-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => move('up')}
            disabled={isFirst || pending}
            aria-label="Monter"
            className="p-1.5 text-(--color-stone) hover:text-(--color-ink) disabled:opacity-30"
          >
            {pending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowUp className="w-3.5 h-3.5" />
            )}
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
    </li>
  )
}
