'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  X,
  Loader2,
  Check,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react'
import { uploadWorks } from '../works/actions'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_FILE_SIZE = 20 * 1024 * 1024

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

type Props = {
  categoryId: string
  categorySlug: string
}

type Job = {
  id: string
  file: File
  status: 'queued' | 'error'
  error?: string
}

export default function InlineWorksUpload({ categoryId, categorySlug }: Props) {
  const router = useRouter()
  const [dragOver, setDragOver] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ added: number; errors: { filename: string; reason: string }[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function pick(list: FileList | File[]) {
    const arr = Array.from(list)
    const newJobs: Job[] = []
    for (const f of arr) {
      if (!f.type.startsWith('image/')) {
        newJobs.push({
          id: crypto.randomUUID(),
          file: f,
          status: 'error',
          error: 'Format non supporté',
        })
        continue
      }
      if (f.size > MAX_FILE_SIZE) {
        newJobs.push({
          id: crypto.randomUUID(),
          file: f,
          status: 'error',
          error: 'Trop volumineuse (>20MB)',
        })
        continue
      }
      newJobs.push({ id: crypto.randomUUID(), file: f, status: 'queued' })
    }
    setJobs((prev) => [...prev, ...newJobs])
  }

  function remove(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id))
  }

  function clearAll() {
    setJobs([])
    setResult(null)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (e.dataTransfer.files) pick(e.dataTransfer.files)
  }

  function upload() {
    const queued = jobs.filter((j) => j.status === 'queued')
    if (queued.length === 0) return
    const fd = new FormData()
    fd.set('category_id', categoryId)
    queued.forEach((j) => fd.append('files', j.file))
    startTransition(() => {
      void (async () => {
        const r = await uploadWorks(fd)
        setResult(r)
        if (r.added > 0) {
          setJobs((prev) => prev.filter((j) => j.status === 'error'))
          // refresh server data zodat counts/cover bijwerken
          router.refresh()
        }
      })()
    })
  }

  // Auto-clear result after success
  useEffect(() => {
    if (result && result.added > 0 && result.errors.length === 0) {
      const t = setTimeout(() => setResult(null), 2500)
      return () => clearTimeout(t)
    }
  }, [result])

  const queuedCount = jobs.filter((j) => j.status === 'queued').length

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragOver(false)
        }}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed transition-colors cursor-pointer p-5 text-center ${
          dragOver
            ? 'border-(--color-bronze) bg-(--color-bronze)/10'
            : 'border-(--color-frame) hover:border-(--color-stone) bg-(--color-paper)'
        }`}
      >
        <Upload className="w-5 h-5 text-(--color-stone)" />
        <p className="text-sm text-(--color-charcoal)">
          Glisse-dépose des photos ici ou clique pour parcourir
        </p>
        <p className="text-[10px] text-(--color-stone)">
          Catégorie /{categorySlug} · JPG, PNG, WEBP · max 20MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT}
        onChange={(e) => {
          if (e.target.files) pick(e.target.files)
          e.target.value = ''
        }}
        className="hidden"
      />

      {jobs.length > 0 && (
        <div className="bg-(--color-paper) border border-(--color-frame) p-3 space-y-2">
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {jobs.map((j) => (
              <li
                key={j.id}
                className="flex items-center gap-2 text-xs px-2 py-1 bg-(--color-canvas) border border-(--color-frame)"
              >
                {j.status === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-(--color-stone) shrink-0" />
                )}
                <span className="flex-1 truncate text-(--color-ink)">{j.file.name}</span>
                <span className="text-(--color-stone)">{formatBytes(j.file.size)}</span>
                {j.error && <span className="text-red-300">{j.error}</span>}
                {!pending && (
                  <button
                    type="button"
                    onClick={() => remove(j.id)}
                    aria-label="Retirer"
                    className="p-0.5 text-(--color-stone) hover:text-(--color-ink)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={upload}
              disabled={pending || queuedCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.15em] disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Téléverser ({queuedCount})
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={pending}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-(--color-frame) text-(--color-stone) hover:text-(--color-charcoal) text-xs uppercase tracking-[0.15em] disabled:opacity-50"
            >
              Vider
            </button>
          </div>
        </div>
      )}

      {result && (
        <div
          className={`flex items-start gap-2 p-2.5 text-xs ${
            result.errors.length === 0
              ? 'bg-(--color-bronze)/10 border border-(--color-bronze)/40 text-(--color-charcoal)'
              : 'bg-red-950/40 border border-red-900 text-red-200'
          }`}
        >
          {result.errors.length === 0 ? (
            <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-(--color-bronze)" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            {result.added > 0 && (
              <p>
                {result.added} {result.added === 1 ? 'œuvre ajoutée' : 'œuvres ajoutées'}
              </p>
            )}
            {result.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    <strong>{e.filename}</strong>: {e.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
