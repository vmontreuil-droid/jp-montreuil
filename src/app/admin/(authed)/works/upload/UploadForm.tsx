'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, ImagePlus, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { uploadWorks, type UploadResult } from '../actions'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_FILE_SIZE = 20 * 1024 * 1024

type Category = { id: string; slug: string; label_fr: string; label_nl: string }

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function UploadForm({
  categories,
  preselectedId,
}: {
  categories: Category[]
  preselectedId?: string
}) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [categoryId, setCategoryId] = useState(preselectedId ?? categories[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [pending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hiddenInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!hiddenInputRef.current) return
    const dt = new DataTransfer()
    files.forEach((f) => dt.items.add(f))
    hiddenInputRef.current.files = dt.files
  }, [files])

  function addFiles(list: FileList | File[]) {
    setError(null)
    const arr = Array.from(list)
    const valid: File[] = []
    for (const f of arr) {
      if (!f.type.startsWith('image/')) {
        setError(`Format non supporté: ${f.name}`)
        continue
      }
      if (f.size > MAX_FILE_SIZE) {
        setError(`Trop volumineuse: ${f.name} (max 20MB)`)
        continue
      }
      valid.push(f)
    }
    setFiles((prev) => [...prev, ...valid])
  }

  function remove(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!categoryId || files.length === 0) {
      setError('Choisis une catégorie et au moins une photo')
      return
    }
    const fd = new FormData()
    fd.set('category_id', categoryId)
    files.forEach((f) => fd.append('files', f))

    startTransition(() => {
      void (async () => {
        const r = await uploadWorks(fd)
        setResult(r)
        if (r.added > 0) {
          setFiles([])
          // Redirect naar de juiste category-tab
          const cat = categories.find((c) => c.id === categoryId)
          if (cat) {
            setTimeout(() => router.push(`/admin/works?cat=${cat.slug}`), 1500)
          }
        }
      })()
    })
  }

  if (result && result.added > 0 && result.errors.length === 0) {
    return (
      <div className="flex items-start gap-3 p-6 bg-(--color-paper) border border-(--color-frame)">
        <CheckCircle2 className="w-6 h-6 text-(--color-bronze) shrink-0 mt-0.5" />
        <div>
          <p className="text-(--color-ink) font-[family-name:var(--font-display)] text-xl mb-1">
            {result.added} {result.added === 1 ? 'œuvre ajoutée' : 'œuvres ajoutées'}
          </p>
          <p className="text-sm text-(--color-stone)">Redirection en cours…</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Categorie */}
      <div>
        <label htmlFor="category" className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Catégorie *
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="w-full px-4 py-3 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label_fr} / {c.label_nl}
            </option>
          ))}
        </select>
      </div>

      {/* Drop-zone */}
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
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
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-colors cursor-pointer p-12 text-center ${
            dragOver
              ? 'border-(--color-bronze) bg-(--color-bronze)/5'
              : 'border-(--color-frame) hover:border-(--color-stone) bg-(--color-paper)'
          }`}
        >
          <Upload className="w-10 h-10 text-(--color-stone)" />
          <p className="text-(--color-charcoal)">
            Glisse-dépose des photos ou clique pour parcourir
          </p>
          <p className="text-xs text-(--color-stone)">
            JPG, PNG, WEBP · max 20MB par photo
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
          className="hidden"
        />
        <input ref={hiddenInputRef} type="file" name="files" multiple className="hidden" />

        {files.length > 0 && (
          <ul className="mt-4 space-y-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-3 px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-sm"
              >
                <ImagePlus className="w-4 h-4 text-(--color-bronze) shrink-0" />
                <span className="flex-1 truncate text-(--color-ink)">{f.name}</span>
                <span className="text-xs text-(--color-stone)">{formatBytes(f.size)}</span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Retirer"
                  className="text-(--color-stone) hover:text-(--color-ink) p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-900 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {result && result.errors.length > 0 && (
        <div className="p-3 bg-red-950/40 border border-red-900 text-red-200 text-sm">
          <p className="font-semibold mb-2">
            {result.added > 0 ? `${result.added} ajoutée(s), ` : ''}
            {result.errors.length} erreur(s):
          </p>
          <ul className="space-y-1 list-disc pl-5">
            {result.errors.map((e, i) => (
              <li key={i}>
                <strong>{e.filename}</strong>: {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || files.length === 0}
        className="inline-flex items-center gap-2 px-6 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.15em] disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Envoi en cours…
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Téléverser ({files.length})
          </>
        )}
      </button>
    </form>
  )
}
