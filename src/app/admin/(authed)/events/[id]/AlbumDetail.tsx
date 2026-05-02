'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  Save,
  Trash2,
  Upload,
  X,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  updateAlbum,
  deleteAlbum,
  toggleAlbumActive,
  registerPhoto,
  deletePhoto,
} from '../actions'

export type AlbumDetailRow = {
  id: string
  slug: string
  title: string
  client_name: string | null
  client_email: string | null
  event_date: string | null
  is_active: boolean
  created_at: string
}

export type AlbumDetailPhoto = {
  id: string
  storage_path: string
  filename: string | null
  size_bytes: number | null
  sort_order: number
  preview_url: string
}

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB per foto
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

function formatBytes(b: number | null | undefined): string {
  if (!b && b !== 0) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function safeFilename(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200)
}

type UploadJob = {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
  progress?: number
}

type Props = {
  album: AlbumDetailRow
  photos: AlbumDetailPhoto[]
}

export default function AlbumDetail({ album, photos }: Props) {
  const [tab, setTab] = useState<'photos' | 'settings'>('photos')

  // === Settings state ===
  const [savePending, startSaveTransition] = useTransition()
  const [saveOk, setSaveOk] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  // === Toggle active ===
  const [active, setActive] = useState(album.is_active)
  function toggleActive() {
    const next = !active
    setActive(next)
    void toggleAlbumActive(album.id, next)
  }

  // === Delete album ===
  const [deletePending, startDeleteTransition] = useTransition()
  function onDelete() {
    if (!confirm(`Supprimer l'album « ${album.title} » et toutes ses photos ?`)) return
    startDeleteTransition(() => {
      void deleteAlbum(album.id)
    })
  }

  // === Save settings ===
  function onSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaveErr(null)
    setSaveOk(false)
    const fd = new FormData(e.currentTarget)
    fd.set('id', album.id)
    fd.set('is_active', active ? 'true' : 'false')
    startSaveTransition(() => {
      void (async () => {
        const r = await updateAlbum(fd)
        if (r && 'error' in r) {
          setSaveErr(r.error === 'title_required' ? 'Titre obligatoire' : `Erreur: ${r.error}`)
        } else {
          setSaveOk(true)
          setTimeout(() => setSaveOk(false), 1500)
        }
      })()
    })
  }

  // === Public link ===
  const publicUrl = useMemo(() => {
    const origin =
      (typeof window !== 'undefined' && window.location.origin) ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://montreuil.be'
    return `${origin.replace(/\/$/, '')}/album/${album.slug}`
  }, [album.slug])
  const [copied, setCopied] = useState(false)
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  // === Upload state ===
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const [uploading, setUploading] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  function pickFiles(list: FileList | File[]) {
    const arr = Array.from(list)
    const newJobs: UploadJob[] = []
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
          error: 'Trop volumineuse (>25MB)',
        })
        continue
      }
      newJobs.push({ id: crypto.randomUUID(), file: f, status: 'pending' })
    }
    setJobs((prev) => [...prev, ...newJobs])
  }

  async function uploadAll() {
    setUploading(true)
    // Sequentieel uploaden — vermijdt geheugen-piek bij grote albums
    for (const j of jobs) {
      if (j.status !== 'pending') continue
      setJobs((prev) =>
        prev.map((x) => (x.id === j.id ? { ...x, status: 'uploading' } : x))
      )
      try {
        const safe = safeFilename(j.file.name)
        const storagePath = `${album.id}/${Date.now()}_${safe}`

        const { error: upErr } = await supabase.storage
          .from('events')
          .upload(storagePath, j.file, {
            contentType: j.file.type,
            upsert: false,
            cacheControl: '31536000',
          })

        if (upErr) {
          setJobs((prev) =>
            prev.map((x) =>
              x.id === j.id ? { ...x, status: 'error', error: upErr.message } : x
            )
          )
          continue
        }

        const r = await registerPhoto({
          album_id: album.id,
          storage_path: storagePath,
          filename: j.file.name,
          size_bytes: j.file.size,
        })
        if (r && 'error' in r) {
          // Storage upload gelukt maar DB-insert faalde — opruimen
          await supabase.storage.from('events').remove([storagePath])
          setJobs((prev) =>
            prev.map((x) =>
              x.id === j.id ? { ...x, status: 'error', error: r.error } : x
            )
          )
          continue
        }

        setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, status: 'done' } : x)))
      } catch (err) {
        setJobs((prev) =>
          prev.map((x) =>
            x.id === j.id
              ? { ...x, status: 'error', error: (err as Error).message }
              : x
          )
        )
      }
    }
    setUploading(false)
  }

  // Reload page om server data + signed URLs te verversen
  useEffect(() => {
    if (!uploading && jobs.length > 0 && jobs.every((j) => j.status !== 'pending' && j.status !== 'uploading')) {
      const anyDone = jobs.some((j) => j.status === 'done')
      if (anyDone) {
        // klein delay zodat UI staat van "klaar" zichtbaar is
        const t = setTimeout(() => window.location.reload(), 600)
        return () => clearTimeout(t)
      }
    }
  }, [uploading, jobs])

  function removeJob(id: string) {
    setJobs((prev) => prev.filter((x) => x.id !== id))
  }

  function clearDoneJobs() {
    setJobs((prev) => prev.filter((x) => x.status === 'pending' || x.status === 'uploading'))
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) pickFiles(e.dataTransfer.files)
  }

  // === Delete photo ===
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)
  async function onDeletePhoto(p: AlbumDetailPhoto) {
    if (!confirm('Supprimer cette photo ?')) return
    setDeletingPhotoId(p.id)
    await deletePhoto(p.id, album.id)
    setDeletingPhotoId(null)
    window.location.reload()
  }

  return (
    <div>
      {/* === Header === */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1">
            Album client
          </p>
          <h1 className="text-3xl text-(--color-ink) font-[family-name:var(--font-display)] leading-tight">
            {album.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--color-stone)">
            {album.client_name && <span>{album.client_name}</span>}
            {album.event_date && (
              <span>{new Date(album.event_date).toLocaleDateString('fr-BE')}</span>
            )}
            <span>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleActive}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
            active
              ? 'border-(--color-bronze) text-(--color-bronze)'
              : 'border-(--color-frame) text-(--color-stone) hover:text-(--color-charcoal)'
          }`}
          title={active ? 'Désactiver le lien public' : 'Réactiver le lien public'}
        >
          {active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {active ? 'Lien actif' : 'Lien désactivé'}
        </button>
      </header>

      {/* === Public link card === */}
      <section className="mb-8 bg-(--color-paper) border border-(--color-frame) p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Lien à partager avec le client
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-0 truncate px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm">
            {publicUrl}
          </code>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-bronze) text-xs uppercase tracking-[0.15em]"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            Copier
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-bronze) text-xs uppercase tracking-[0.15em]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Aperçu
          </a>
        </div>
        {!active && (
          <p className="mt-2 text-xs text-(--color-stone)">
            Le lien est actuellement désactivé — le client verra une page « Album indisponible ».
          </p>
        )}
      </section>

      {/* === Tabs === */}
      <nav className="flex gap-1 mb-6 border-b border-(--color-frame)">
        {(
          [
            { key: 'photos', label: 'Photos' },
            { key: 'settings', label: 'Paramètres' },
          ] as const
        ).map((t) => {
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm uppercase tracking-[0.15em] border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-(--color-bronze) text-(--color-ink)'
                  : 'border-transparent text-(--color-stone) hover:text-(--color-charcoal)'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      {/* === Photos tab === */}
      {tab === 'photos' && (
        <div className="space-y-6">
          {/* Drop zone */}
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
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-colors cursor-pointer p-10 text-center ${
              dragOver
                ? 'border-(--color-bronze) bg-(--color-bronze)/5'
                : 'border-(--color-frame) hover:border-(--color-stone) bg-(--color-paper)'
            }`}
          >
            <Upload className="w-8 h-8 text-(--color-stone)" />
            <p className="text-(--color-charcoal)">
              Glisse-dépose des photos ou clique pour parcourir
            </p>
            <p className="text-xs text-(--color-stone)">
              JPG, PNG, WEBP, HEIC · max 25MB par photo
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT}
            onChange={(e) => {
              if (e.target.files) pickFiles(e.target.files)
              e.target.value = ''
            }}
            className="hidden"
          />

          {/* Upload queue */}
          {jobs.length > 0 && (
            <div className="bg-(--color-paper) border border-(--color-frame) p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-[0.15em] text-(--color-stone)">
                  File d&apos;attente ({jobs.filter((j) => j.status === 'pending').length} en
                  attente)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={uploadAll}
                    disabled={uploading || jobs.every((j) => j.status !== 'pending')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.15em] disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    Téléverser ({jobs.filter((j) => j.status === 'pending').length})
                  </button>
                  <button
                    type="button"
                    onClick={clearDoneJobs}
                    disabled={uploading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-(--color-frame) text-(--color-stone) hover:text-(--color-charcoal) text-xs uppercase tracking-[0.15em] disabled:opacity-50"
                  >
                    Vider
                  </button>
                </div>
              </div>
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {jobs.map((j) => (
                  <li
                    key={j.id}
                    className="flex items-center gap-3 px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-sm"
                  >
                    {j.status === 'done' ? (
                      <Check className="w-4 h-4 text-(--color-bronze) shrink-0" />
                    ) : j.status === 'uploading' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-(--color-bronze) shrink-0" />
                    ) : j.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-(--color-stone) shrink-0" />
                    )}
                    <span className="flex-1 truncate text-(--color-ink)">{j.file.name}</span>
                    <span className="text-xs text-(--color-stone)">
                      {formatBytes(j.file.size)}
                    </span>
                    {j.error && <span className="text-xs text-red-300">{j.error}</span>}
                    {j.status === 'pending' && !uploading && (
                      <button
                        type="button"
                        onClick={() => removeJob(j.id)}
                        className="p-1 text-(--color-stone) hover:text-(--color-ink)"
                        aria-label="Retirer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Photo grid */}
          {photos.length === 0 ? (
            <p className="text-sm text-(--color-stone) text-center py-12">
              Aucune photo. Téléverse les premières via le bouton ci-dessus.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="relative group bg-(--color-paper) border border-(--color-frame) overflow-hidden"
                >
                  <div className="relative aspect-square bg-(--color-canvas)">
                    {p.preview_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.preview_url}
                        alt={p.filename ?? ''}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-(--color-stone)">
                        <ImageIcon className="w-6 h-6 opacity-40" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeletePhoto(p)}
                      disabled={deletingPhotoId === p.id}
                      aria-label="Supprimer"
                      className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 hover:bg-red-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {deletingPhotoId === p.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="p-2 text-xs">
                    <p className="truncate text-(--color-ink)">{p.filename}</p>
                    <p className="text-(--color-stone) text-[10px]">{formatBytes(p.size_bytes)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === Settings tab === */}
      {tab === 'settings' && (
        <form onSubmit={onSaveSettings} className="space-y-5 max-w-2xl">
          <div>
            <label htmlFor="title" className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1">
              Titre *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={album.title}
              className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="client_name" className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1">
                Nom du client
              </label>
              <input
                id="client_name"
                name="client_name"
                type="text"
                defaultValue={album.client_name ?? ''}
                className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="client_email" className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1">
                E-mail du client
              </label>
              <input
                id="client_email"
                name="client_email"
                type="email"
                defaultValue={album.client_email ?? ''}
                className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="event_date" className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1">
              Date
            </label>
            <input
              id="event_date"
              name="event_date"
              type="date"
              defaultValue={album.event_date ?? ''}
              className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </div>

          {saveErr && (
            <p className="inline-flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-3.5 h-3.5" />
              {saveErr}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={savePending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.15em] disabled:opacity-50"
            >
              {savePending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveOk ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Enregistrer
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deletePending}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-red-900/60 text-red-300 hover:bg-red-950/30 text-xs uppercase tracking-[0.15em] disabled:opacity-50"
            >
              {deletePending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Supprimer l&apos;album
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
