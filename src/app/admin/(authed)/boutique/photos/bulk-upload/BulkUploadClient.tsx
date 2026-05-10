'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Upload, X, Loader2, Check, AlertTriangle, Trash2, MapPin, Calendar,
  Image as ImageIcon, Settings,
} from 'lucide-react'
import { extractExifFromFile, readImageDimensions, type Exif } from '@/lib/exif'
import { uploadShopPhotoOne } from '../actions'
import { slugify } from '@/lib/shop/photo-url'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'

type FileStatus = 'idle' | 'uploading' | 'done' | 'error'

type FileEntry = {
  id: string
  file: File
  preview: string
  slug: string
  title: string
  species: string
  location: string
  width: number
  height: number
  takenAt: string | null
  takenAtFull: string | null
  gpsLabel: string | null
  status: FileStatus
  error: string | null
}

type Defaults = {
  species: string
  location: string
  is_published: boolean
}

let entryCounter = 0

/**
 * Bulk-upload client met drag-and-drop, EXIF-extractie en sequentiële
 * upload. Geport van allardphilippe BulkUploadClient en aangepast aan
 * jp-montreuil's shop-actions + tokens.
 */
export default function BulkUploadClient() {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [isOver, setIsOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [defaults, setDefaults] = useState<Defaults>({
    species: '',
    location: '',
    is_published: false,
  })
  const inputRef = useRef<HTMLInputElement>(null)

  // Cleanup object-URL's bij unmount
  useEffect(() => {
    return () => {
      entries.forEach((e) => URL.revokeObjectURL(e.preview))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function add(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const newEntries: FileEntry[] = []
    for (const file of list) {
      const id = `entry-${++entryCounter}`
      const preview = URL.createObjectURL(file)
      const baseSlug = slugify(file.name.replace(/\.[^.]+$/, ''))
      // Lees EXIF + dimensions parallel
      const [exif, dims] = await Promise.all([
        extractExifFromFile(file).catch(() => ({} as Exif)),
        readImageDimensions(file),
      ])
      newEntries.push({
        id,
        file,
        preview,
        slug: baseSlug,
        title: '',
        species: '',
        location: '',
        width: dims.width,
        height: dims.height,
        takenAt: exif.takenAt ?? null,
        takenAtFull: exif.takenAtFull ?? null,
        gpsLabel: exif.gpsLabel ?? null,
        status: 'idle',
        error: null,
      })
    }
    setEntries((prev) => [...prev, ...newEntries])
  }

  function remove(id: string) {
    setEntries((prev) => {
      const e = prev.find((x) => x.id === id)
      if (e) URL.revokeObjectURL(e.preview)
      return prev.filter((x) => x.id !== id)
    })
  }

  function patch(id: string, fields: Partial<FileEntry>) {
    setEntries((prev) => prev.map((x) => (x.id === id ? { ...x, ...fields } : x)))
  }

  function clearDone() {
    setEntries((prev) => {
      prev.filter((x) => x.status === 'done').forEach((e) => URL.revokeObjectURL(e.preview))
      return prev.filter((x) => x.status !== 'done')
    })
  }

  async function uploadAll() {
    setBusy(true)
    try {
      // Sequentieel — anders krijg je race-condities op slug-conflicts
      for (const entry of entries) {
        if (entry.status === 'done') continue
        patch(entry.id, { status: 'uploading', error: null })
        const fd = new FormData()
        fd.append('file', entry.file)
        fd.append('slug', entry.slug)
        fd.append('title', entry.title || '')
        fd.append('description', '')
        fd.append('taken_at', entry.takenAt ?? '')
        fd.append(
          'taken_at_location',
          (entry.location || defaults.location || entry.gpsLabel || '').trim(),
        )
        fd.append('species', (entry.species || defaults.species).trim())
        fd.append('width', String(entry.width || 0))
        fd.append('height', String(entry.height || 0))
        if (defaults.is_published) fd.append('is_published', 'on')

        try {
          const r = await uploadShopPhotoOne(fd)
          if (r.ok) {
            patch(entry.id, { status: 'done' })
          } else {
            patch(entry.id, { status: 'error', error: r.error })
          }
        } catch (err) {
          patch(entry.id, {
            status: 'error',
            error: err instanceof Error ? err.message : 'Erreur',
          })
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const idleCount = entries.filter((e) => e.status === 'idle' || e.status === 'error').length
  const doneCount = entries.filter((e) => e.status === 'done').length
  const errorCount = entries.filter((e) => e.status === 'error').length

  return (
    <div className="space-y-5">
      {/* Defaults panel */}
      <section className="bg-(--color-paper) border border-(--color-frame) p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3 inline-flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-(--color-bronze)" />
          Défauts (appliqués si le champ est vide pour la photo)
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-(--color-stone) mb-1 block">
              Sujet / espèce
            </span>
            <input
              type="text"
              value={defaults.species}
              onChange={(e) => setDefaults((d) => ({ ...d, species: e.target.value }))}
              placeholder="ex. portrait, paysage, lynx"
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-(--color-stone) mb-1 block">
              Lieu
            </span>
            <input
              type="text"
              value={defaults.location}
              onChange={(e) => setDefaults((d) => ({ ...d, location: e.target.value }))}
              placeholder="ex. Forêt de Soignes"
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={defaults.is_published}
              onChange={(e) => setDefaults((d) => ({ ...d, is_published: e.target.checked }))}
              className="w-4 h-4"
            />
            <span className="text-sm text-(--color-charcoal)">Publier directement</span>
          </label>
        </div>
      </section>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsOver(true) }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsOver(false)
          if (e.dataTransfer.files.length) void add(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          isOver
            ? 'border-(--color-bronze) bg-(--color-bronze)/5'
            : 'border-(--color-frame) bg-(--color-paper) hover:border-(--color-bronze)/60'
        }`}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-(--color-bronze)" />
        <p className="font-[family-name:var(--font-display)] text-xl text-(--color-ink) mb-1">
          Glissez vos photos ici
        </p>
        <p className="text-xs text-(--color-stone)">
          ou cliquez pour sélectionner — JPEG, PNG, WebP, AVIF
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(e) => {
            if (e.target.files?.length) void add(e.target.files)
            e.target.value = ''
          }}
          className="hidden"
        />
      </div>

      {/* Bar met counts + actions */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3 bg-(--color-paper) border border-(--color-frame) px-4 py-3">
          <p className="text-xs text-(--color-charcoal)">
            <span className="font-medium text-(--color-ink)">{entries.length}</span> photo{entries.length > 1 ? 's' : ''}
            {doneCount > 0 && <span className="text-emerald-700"> · {doneCount} OK</span>}
            {errorCount > 0 && <span className="text-amber-700"> · {errorCount} erreur{errorCount > 1 ? 's' : ''}</span>}
          </p>
          <div className="flex gap-2">
            {doneCount > 0 && (
              <button
                type="button"
                onClick={clearDone}
                className="text-xs text-(--color-stone) hover:text-(--color-ink) px-3 py-1.5"
              >
                Retirer les OK
              </button>
            )}
            <button
              type="button"
              onClick={uploadAll}
              disabled={busy || idleCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {busy ? 'Upload…' : `Upload ${idleCount} photo${idleCount > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Lijst */}
      {entries.length > 0 && (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`bg-(--color-paper) border p-4 grid grid-cols-[100px_1fr_auto] gap-4 items-start ${
                entry.status === 'done' ? 'border-emerald-300/60' :
                entry.status === 'error' ? 'border-amber-300/60' :
                'border-(--color-frame)'
              }`}
            >
              {/* Preview */}
              <div className="relative w-[100px] h-[100px] bg-(--color-canvas) border border-(--color-frame) overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.preview} alt="" className="w-full h-full object-cover" />
                {entry.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/40 inline-flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                {entry.status === 'done' && (
                  <div className="absolute inset-0 bg-emerald-700/70 inline-flex items-center justify-center">
                    <Check className="w-7 h-7 text-white" />
                  </div>
                )}
                {entry.status === 'error' && (
                  <div className="absolute inset-0 bg-amber-700/70 inline-flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-white" />
                  </div>
                )}
              </div>

              {/* Velden */}
              <div className="min-w-0 grid sm:grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-widest text-(--color-stone) mb-1 block">Titre</span>
                  <input
                    type="text"
                    value={entry.title}
                    onChange={(e) => patch(entry.id, { title: e.target.value })}
                    placeholder={entry.slug}
                    disabled={entry.status === 'done' || entry.status === 'uploading'}
                    className="w-full px-2 py-1 bg-(--color-canvas) border border-(--color-frame) text-sm disabled:opacity-50"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-widest text-(--color-stone) mb-1 block">Slug</span>
                  <input
                    type="text"
                    value={entry.slug}
                    onChange={(e) => patch(entry.id, { slug: slugify(e.target.value) })}
                    disabled={entry.status === 'done' || entry.status === 'uploading'}
                    className="w-full px-2 py-1 bg-(--color-canvas) border border-(--color-frame) text-sm font-mono disabled:opacity-50"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-widest text-(--color-stone) mb-1 block">Espèce / sujet</span>
                  <input
                    type="text"
                    value={entry.species}
                    onChange={(e) => patch(entry.id, { species: e.target.value })}
                    placeholder={defaults.species || '—'}
                    disabled={entry.status === 'done' || entry.status === 'uploading'}
                    className="w-full px-2 py-1 bg-(--color-canvas) border border-(--color-frame) text-sm disabled:opacity-50"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-widest text-(--color-stone) mb-1 block">Lieu</span>
                  <input
                    type="text"
                    value={entry.location}
                    onChange={(e) => patch(entry.id, { location: e.target.value })}
                    placeholder={defaults.location || entry.gpsLabel || '—'}
                    disabled={entry.status === 'done' || entry.status === 'uploading'}
                    className="w-full px-2 py-1 bg-(--color-canvas) border border-(--color-frame) text-sm disabled:opacity-50"
                  />
                </label>
                <p className="sm:col-span-2 text-[11px] text-(--color-stone) flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  {entry.takenAt && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {entry.takenAt}
                    </span>
                  )}
                  {entry.gpsLabel && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {entry.gpsLabel}
                    </span>
                  )}
                  {entry.width > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {entry.width}×{entry.height}
                    </span>
                  )}
                  <span>{Math.round(entry.file.size / 1024)} KB</span>
                </p>
                {entry.error && (
                  <p className="sm:col-span-2 text-xs text-amber-700 inline-flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{entry.error}</span>
                  </p>
                )}
              </div>

              {/* Verwijder-knop */}
              <button
                type="button"
                onClick={() => remove(entry.id)}
                disabled={entry.status === 'uploading'}
                aria-label="Retirer"
                className="p-1 text-(--color-stone) hover:text-red-700 disabled:opacity-30"
              >
                {entry.status === 'done' ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
