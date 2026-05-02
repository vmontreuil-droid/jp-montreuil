'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save,
  Trash2,
  Upload,
  X,
  Check,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react'
import TranslateButton from '@/components/admin/TranslateButton'
import { createClient as createBrowserSupabase } from '@/lib/supabase/client'
import { updateAboutSection, deleteAboutSection, setAboutImage, clearAboutImage } from '../actions'

type Props = {
  section: {
    id: string
    sort_order: number
    title_fr: string
    title_nl: string
    body_fr: string
    body_nl: string
    imageUrl: string
  }
}

function safeFilename(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200)
}

export default function AboutEdit({ section }: Props) {
  const router = useRouter()

  const [titleFr, setTitleFr] = useState(section.title_fr)
  const [titleNl, setTitleNl] = useState(section.title_nl)
  const [bodyFr, setBodyFr] = useState(section.body_fr)
  const [bodyNl, setBodyNl] = useState(section.body_nl)
  const [savePending, startSave] = useTransition()
  const [deletePending, startDelete] = useTransition()
  const [saveOk, setSaveOk] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imgPending, setImgPending] = useState(false)
  const [imgError, setImgError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaveErr(null)
    setSaveOk(false)
    const fd = new FormData()
    fd.set('id', section.id)
    fd.set('title_fr', titleFr)
    fd.set('title_nl', titleNl)
    fd.set('body_fr', bodyFr)
    fd.set('body_nl', bodyNl)
    startSave(() => {
      void (async () => {
        const r = await updateAboutSection(fd)
        if (r && 'error' in r) {
          setSaveErr(`Erreur: ${r.error}`)
        } else {
          setSaveOk(true)
          setTimeout(() => setSaveOk(false), 1500)
        }
      })()
    })
  }

  function onDelete() {
    if (!confirm(`Supprimer la section « ${section.title_fr || section.title_nl} » ?`)) return
    startDelete(() => {
      void deleteAboutSection(section.id)
    })
  }

  async function uploadImage(file: File) {
    setImgError(null)
    if (!file.type.startsWith('image/')) {
      setImgError('Type non autorisé')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setImgError('Trop volumineuse (max 15MB)')
      return
    }
    setImgPending(true)
    try {
      const safe = safeFilename(file.name)
      const storagePath = `about/${section.id}-${Date.now()}_${safe}`
      const sb = createBrowserSupabase()
      const { error: upErr } = await sb.storage.from('works').upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: '31536000',
      })
      if (upErr) {
        setImgError(`Upload: ${upErr.message}`)
        return
      }
      const r = await setAboutImage({ id: section.id, storage_path: storagePath })
      if (!r.ok) {
        await sb.storage.from('works').remove([storagePath])
        setImgError(`DB-update: ${r.error}`)
        return
      }
      router.refresh()
    } catch (err) {
      setImgError(`Erreur: ${(err as Error).message}`)
    } finally {
      setImgPending(false)
    }
  }

  async function onClearImage() {
    if (!confirm('Supprimer cette image ?')) return
    setImgPending(true)
    try {
      await clearAboutImage(section.id)
      router.refresh()
    } finally {
      setImgPending(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void uploadImage(f)
  }

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1">
          À propos · #{section.sort_order}
        </p>
        <h1 className="text-3xl text-(--color-ink) font-[family-name:var(--font-display)] leading-tight">
          {section.title_fr || section.title_nl || 'Sans titre'}
        </h1>
      </header>

      {/* Image-slot */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5" />
          Image
        </h2>
        <div className="bg-(--color-paper) border border-(--color-frame) p-4 max-w-md">
          <div className="relative aspect-[4/5] bg-(--color-canvas) border border-(--color-frame) overflow-hidden mb-3 flex items-center justify-center">
            {imgPending ? (
              <Loader2 className="w-7 h-7 animate-spin text-(--color-bronze)" />
            ) : section.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={section.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={onClearImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-900/80 text-white"
                  aria-label="Supprimer l'image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-(--color-stone) text-xs">
                <ImageIcon className="w-8 h-8 opacity-40" />
                <span>Aucune image</span>
              </div>
            )}
          </div>

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
            className={`flex flex-col items-center gap-1 border border-dashed transition-colors cursor-pointer p-3 text-center text-xs ${
              dragOver
                ? 'border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-bronze)'
                : 'border-(--color-frame) hover:border-(--color-stone) text-(--color-stone) hover:text-(--color-charcoal)'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{section.imageUrl ? 'Remplacer' : 'Téléverser'}</span>
            <span className="text-[10px] opacity-70">JPG/PNG/WEBP, max 15MB</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void uploadImage(f)
              e.target.value = ''
            }}
            className="hidden"
          />

          {imgError && (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-red-300">
              <AlertCircle className="w-3 h-3" />
              {imgError}
            </p>
          )}
        </div>
      </section>

      {/* Tekst */}
      <form onSubmit={onSave} className="space-y-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">Texte</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">
                Titre FR
              </label>
              <TranslateButton
                getSource={() => titleNl}
                from="nl"
                to="fr"
                onTranslated={setTitleFr}
              />
            </div>
            <input
              type="text"
              value={titleFr}
              onChange={(e) => setTitleFr(e.target.value)}
              required
              className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">
                Titel NL
              </label>
              <TranslateButton
                getSource={() => titleFr}
                from="fr"
                to="nl"
                onTranslated={setTitleNl}
              />
            </div>
            <input
              type="text"
              value={titleNl}
              onChange={(e) => setTitleNl(e.target.value)}
              required
              className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">
                Texte FR
              </label>
              <TranslateButton
                getSource={() => bodyNl}
                from="nl"
                to="fr"
                onTranslated={setBodyFr}
              />
            </div>
            <textarea
              value={bodyFr}
              onChange={(e) => setBodyFr(e.target.value)}
              rows={10}
              placeholder="Texte de la section en français…"
              className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">
                Tekst NL
              </label>
              <TranslateButton
                getSource={() => bodyFr}
                from="fr"
                to="nl"
                onTranslated={setBodyNl}
              />
            </div>
            <textarea
              value={bodyNl}
              onChange={(e) => setBodyNl(e.target.value)}
              rows={10}
              placeholder="Tekst van de sectie in het Nederlands…"
              className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
            />
          </div>
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
            className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 border border-red-900/60 text-red-300 hover:bg-red-950/30 text-xs uppercase tracking-[0.15em] disabled:opacity-50"
          >
            {deletePending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Supprimer
          </button>
        </div>
      </form>
    </div>
  )
}
