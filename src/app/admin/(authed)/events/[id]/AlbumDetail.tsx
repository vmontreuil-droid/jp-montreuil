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
  Mail,
  Send,
  MessageCircle,
  KeyRound,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  updateAlbum,
  deleteAlbum,
  toggleAlbumActive,
  registerPhoto,
  deletePhoto,
  shareAlbumByEmail,
  inviteClientToPortal,
} from '../actions'

export type AlbumDetailRow = {
  id: string
  slug: string
  title: string
  client_name: string | null
  client_email: string | null
  client_locale: 'fr' | 'nl'
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
  const [tab, setTab] = useState<'photos' | 'share' | 'settings'>('photos')

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
            { key: 'share', label: 'Partager' },
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

      {/* === Share tab === */}
      {tab === 'share' && (
        <SharePanel album={album} photoCount={photos.length} publicUrl={publicUrl} />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <div>
              <span className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1">
                Langue du client
              </span>
              <div className="flex gap-2">
                {(['fr', 'nl'] as const).map((loc) => (
                  <label
                    key={loc}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-(--color-frame) bg-(--color-paper) text-xs uppercase tracking-[0.15em] text-(--color-charcoal) cursor-pointer has-[:checked]:border-(--color-bronze) has-[:checked]:text-(--color-ink)"
                  >
                    <input
                      type="radio"
                      name="client_locale"
                      value={loc}
                      defaultChecked={album.client_locale === loc}
                      className="sr-only"
                    />
                    {loc === 'fr' ? 'Français' : 'Nederlands'}
                  </label>
                ))}
              </div>
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

// ============================================================================
// SharePanel — verzendt album-link via mail of WhatsApp, met live preview
// ============================================================================

type SharePanelProps = {
  album: AlbumDetailRow
  photoCount: number
  publicUrl: string
}

function SharePanel({ album, photoCount, publicUrl }: SharePanelProps) {
  const [locale, setLocale] = useState<'fr' | 'nl'>('fr')
  const [recipientName, setRecipientName] = useState(album.client_name ?? '')
  const [email, setEmail] = useState(album.client_email ?? '')
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [sendOk, setSendOk] = useState(false)
  const [sendErr, setSendErr] = useState<string | null>(null)
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'portal'>('email')

  // Lokale URL aangepast aan locale (FR / NL)
  const localizedUrl = useMemo(() => {
    const origin = publicUrl.replace(/\/album\/.+$/, '').replace(/\/$/, '')
    return locale === 'fr' ? `${origin}/album/${album.slug}` : `${origin}/nl/album/${album.slug}`
  }, [publicUrl, locale, album.slug])

  // === Email send ===
  async function onSendEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSendErr(null)
    setSendOk(false)
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setSendErr('Adresse e-mail invalide')
      return
    }
    if (!album.is_active) {
      setSendErr('Le lien est désactivé — réactivez-le dans Paramètres avant d\'envoyer.')
      return
    }
    setSending(true)
    const r = await shareAlbumByEmail({
      album_id: album.id,
      to: email.trim(),
      recipient_name: recipientName.trim(),
      message: message.trim(),
      locale,
    })
    setSending(false)
    if (r.ok) {
      setSendOk(true)
      setTimeout(() => setSendOk(false), 3000)
    } else {
      const msg =
        r.error === 'invalid_email'
          ? 'Adresse e-mail invalide'
          : r.error === 'no_api_key'
            ? 'Service mail non configuré'
            : r.error === 'album_inactive'
              ? 'Lien désactivé — réactivez d\'abord l\'album'
              : `Erreur: ${r.error}`
      setSendErr(msg)
    }
  }

  // === WhatsApp link bouwen ===
  const whatsappText = useMemo(() => {
    const greet = recipientName.trim()
      ? locale === 'fr'
        ? `Bonjour ${recipientName.trim()},`
        : `Hallo ${recipientName.trim()},`
      : locale === 'fr'
        ? 'Bonjour,'
        : 'Hallo,'
    const intro =
      locale === 'fr'
        ? `voici le lien privé vers l'album photo « ${album.title} » :`
        : `hier is de privé link naar het foto-album "${album.title}":`
    const personal = message.trim() ? `\n\n${message.trim()}` : ''
    return `${greet} ${intro}\n${localizedUrl}${personal}`
  }, [recipientName, locale, album.title, message, localizedUrl])

  const whatsappHref = useMemo(() => {
    const cleanedPhone = phone.replace(/[^\d]/g, '')
    const base = cleanedPhone ? `https://wa.me/${cleanedPhone}` : 'https://wa.me/'
    return `${base}?text=${encodeURIComponent(whatsappText)}`
  }, [phone, whatsappText])

  const greetingPreview = recipientName.trim()
    ? locale === 'fr'
      ? `Bonjour ${recipientName.trim()},`
      : `Beste ${recipientName.trim()},`
    : locale === 'fr'
      ? 'Bonjour,'
      : 'Hallo,'

  const introPreview =
    locale === 'fr'
      ? `Voici le lien privé vers l'album photo « ${album.title} ».`
      : `Hier is de privé link naar het foto-album "${album.title}".`

  const explainerPreview =
    locale === 'fr'
      ? photoCount
        ? `L'album contient ${photoCount} photo${photoCount > 1 ? 's' : ''} que vous pouvez visualiser et télécharger en taille originale.`
        : 'Vous pouvez visualiser et télécharger les photos en taille originale.'
      : photoCount
        ? `Het album bevat ${photoCount} foto${photoCount > 1 ? '\'s' : ''} die u kunt bekijken en downloaden in originele grootte.`
        : 'U kunt de foto\'s bekijken en downloaden in originele grootte.'

  const buttonLabelPreview = locale === 'fr' ? 'Voir l\'album' : 'Album bekijken'
  const fallbackHintPreview =
    locale === 'fr'
      ? 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :'
      : 'Werkt de knop niet? Kopieer deze link in uw browser:'
  const privateNotePreview =
    locale === 'fr'
      ? 'Ce lien est privé — merci de ne pas le partager publiquement.'
      : 'Deze link is privé — gelieve hem niet publiek te delen.'
  const signoffPreview = locale === 'fr' ? 'Cordialement,' : 'Met vriendelijke groeten,'
  const roleLine =
    locale === 'fr' ? 'Artiste peintre · Atelier Montreuil' : 'Kunstschilder · Atelier Montreuil'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* === LINKER KOLOM — form === */}
      <div className="space-y-5">
        {/* Channel switcher */}
        <div className="inline-flex border border-(--color-frame) rounded-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.15em] transition-colors ${
              channel === 'email'
                ? 'bg-(--color-bronze) text-white'
                : 'text-(--color-charcoal) hover:bg-(--color-paper)'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </button>
          <button
            type="button"
            onClick={() => setChannel('whatsapp')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.15em] transition-colors ${
              channel === 'whatsapp'
                ? 'bg-(--color-bronze) text-white'
                : 'text-(--color-charcoal) hover:bg-(--color-paper)'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setChannel('portal')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.15em] transition-colors ${
              channel === 'portal'
                ? 'bg-(--color-bronze) text-white'
                : 'text-(--color-charcoal) hover:bg-(--color-paper)'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Portail
          </button>
        </div>

        {/* Language */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1.5">
            Langue du message
          </label>
          <div className="inline-flex border border-(--color-frame) rounded-sm overflow-hidden">
            {(['fr', 'nl'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={`px-3 py-1.5 text-xs uppercase tracking-[0.15em] transition-colors ${
                  locale === l
                    ? 'bg-(--color-paper) text-(--color-ink)'
                    : 'text-(--color-stone) hover:text-(--color-charcoal)'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Recipient name (gedeeld) */}
        <div>
          <label htmlFor="share-name" className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1.5">
            Nom du destinataire
          </label>
          <input
            id="share-name"
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Jean Dupont"
            className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
          />
        </div>

        {/* Persoonlijke boodschap (gedeeld) */}
        <div>
          <label htmlFor="share-message" className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1.5">
            Message personnel <span className="text-(--color-stone)/60">(facultatif)</span>
          </label>
          <textarea
            id="share-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder={
              locale === 'fr'
                ? 'Quelques mots à ajouter avant le lien...'
                : 'Een paar woorden om bij de link te zetten...'
            }
            className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
          />
        </div>

        {channel === 'email' && (
          <form onSubmit={onSendEmail} className="space-y-4">
            <div>
              <label htmlFor="share-email" className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1.5">
                Adresse e-mail *
              </label>
              <input
                id="share-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jean.dupont@example.com"
                className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
              />
            </div>

            {sendErr && (
              <p className="inline-flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-3.5 h-3.5" />
                {sendErr}
              </p>
            )}
            {sendOk && (
              <p className="inline-flex items-center gap-2 text-xs text-(--color-bronze)">
                <Check className="w-3.5 h-3.5" />
                E-mail envoyé !
              </p>
            )}

            <button
              type="submit"
              disabled={sending || !album.is_active}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.15em] disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer l&apos;e-mail
            </button>

            {!album.is_active && (
              <p className="text-xs text-(--color-stone)">
                ⚠ Le lien est désactivé — réactivez-le dans Paramètres pour pouvoir envoyer.
              </p>
            )}
          </form>
        )}

        {channel === 'whatsapp' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="share-phone" className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1.5">
                Numéro WhatsApp <span className="text-(--color-stone)/60">(facultatif — sinon choisir contact dans WhatsApp)</span>
              </label>
              <input
                id="share-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+32 475 ..."
                className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-(--color-stone)">
                Format international avec indicatif (ex. +32...). Vide = ouvre WhatsApp et vous choisissez le contact.
              </p>
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.15em]"
            >
              <MessageCircle className="w-4 h-4" />
              Ouvrir WhatsApp
            </a>
          </div>
        )}

        {channel === 'portal' && (
          <PortalInviteForm
            albumId={album.id}
            clientEmail={album.client_email ?? ''}
            recipientName={recipientName}
            message={message}
            locale={locale}
            isActive={album.is_active}
          />
        )}
      </div>

      {/* === RECHTER KOLOM — preview === */}
      <div className="lg:sticky lg:top-6 self-start">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" />
          Aperçu
        </p>

        {channel === 'email' ? (
          <div
            className="border border-(--color-frame) overflow-hidden"
            style={{ backgroundColor: '#faf8f5' }}
          >
            {/* Mail-header */}
            <div className="text-center py-8 px-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-dark.png"
                alt="Atelier Montreuil"
                className="h-10 inline-block mx-auto mb-2"
              />
              <p
                className="text-[11px] uppercase font-semibold mt-2"
                style={{ letterSpacing: '0.3em', color: '#2a2622' }}
              >
                {locale === 'fr' ? 'Artiste peintre' : 'Kunstschilder'}
              </p>
              <div
                className="inline-block mt-3.5"
                style={{ width: 40, height: 1, backgroundColor: '#8b6f47' }}
              />
            </div>

            {/* Mail card */}
            <div
              className="mx-4 mb-4 px-7 py-8 text-[15px] leading-[1.65]"
              style={{
                backgroundColor: '#ffffff',
                color: '#1c1916',
                border: '1px solid rgba(128, 120, 112, 0.20)',
                boxShadow: '0 12px 40px -16px rgba(28, 25, 22, 0.18)',
                borderRadius: 8,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <p className="mb-4">{greetingPreview}</p>
              <p className="mb-3">{introPreview}</p>

              {message.trim() && (
                <div
                  className="my-4 px-4 py-3.5 whitespace-pre-wrap text-[15px]"
                  style={{
                    backgroundColor: 'rgba(139, 111, 71, 0.08)',
                    borderLeft: '3px solid #8b6f47',
                    color: '#1c1916',
                  }}
                >
                  {message}
                </div>
              )}

              <p className="mb-6">{explainerPreview}</p>

              {/* CTA-knop */}
              <div className="text-center my-6">
                <span
                  className="inline-block px-8 py-3.5 text-[13px] font-semibold uppercase"
                  style={{
                    backgroundColor: '#8b6f47',
                    color: '#ffffff',
                    letterSpacing: '0.18em',
                    borderRadius: 4,
                  }}
                >
                  {buttonLabelPreview}
                </span>
              </div>

              <p className="text-[13px] mb-1.5" style={{ color: '#807870' }}>
                {fallbackHintPreview}
              </p>
              <p
                className="text-[12px] break-all px-3 py-2 mb-6"
                style={{
                  fontFamily: 'monospace',
                  color: '#2a2622',
                  backgroundColor: '#faf8f5',
                  border: '1px solid rgba(128, 120, 112, 0.20)',
                  borderRadius: 4,
                }}
              >
                {localizedUrl}
              </p>

              <div className="border-t my-5" style={{ borderColor: 'rgba(128, 120, 112, 0.20)' }} />
              <p className="text-[13px] italic mb-5" style={{ color: '#807870' }}>
                {privateNotePreview}
              </p>

              <p className="mb-1">{signoffPreview}</p>
              <p
                className="text-[22px] mb-1"
                style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1c1916' }}
              >
                Jean-Pierre Montreuil
              </p>
              <p className="text-[13px]" style={{ color: '#807870' }}>
                {roleLine}
              </p>
            </div>
          </div>
        ) : (
          // WhatsApp chat-bubble preview
          <div
            className="border border-(--color-frame) overflow-hidden p-6"
            style={{ backgroundColor: '#0d1418' }}
          >
            <p
              className="text-center text-[10px] uppercase tracking-[0.2em] mb-4"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              WhatsApp
            </p>
            <div className="flex justify-end">
              <div
                className="max-w-[85%] px-3 py-2 text-[14px] leading-[1.45] whitespace-pre-wrap"
                style={{
                  backgroundColor: '#005c4b',
                  color: '#e9edef',
                  borderRadius: '8px 8px 2px 8px',
                  fontFamily: '-apple-system, sans-serif',
                }}
              >
                {whatsappText}
                <span
                  className="text-[10px] ml-2 inline-block opacity-70"
                  style={{ color: 'rgba(233,237,239,0.7)' }}
                >
                  ✓✓
                </span>
              </div>
            </div>
            <p
              className="text-center text-[10px] mt-4"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Aperçu — message qui sera prérempli dans WhatsApp
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// PortalInviteForm — verstuur magic-link uitnodiging naar de opdrachtgever
// ============================================================================

function PortalInviteForm({
  albumId,
  clientEmail,
  recipientName,
  message,
  locale,
  isActive,
}: {
  albumId: string
  clientEmail: string
  recipientName: string
  message: string
  locale: 'fr' | 'nl'
  isActive: boolean
}) {
  const [sending, setSending] = useState(false)
  const [sendOk, setSendOk] = useState(false)
  const [sendErr, setSendErr] = useState<string | null>(null)

  async function onInvite() {
    setSendErr(null)
    setSendOk(false)
    if (!isActive) {
      setSendErr('Le lien est désactivé — réactivez l\'album dans Paramètres avant d\'inviter.')
      return
    }
    if (!clientEmail) {
      setSendErr('Aucun e-mail client. Renseignez-le dans Paramètres.')
      return
    }
    setSending(true)
    const r = await inviteClientToPortal({
      album_id: albumId,
      message,
      locale,
    })
    setSending(false)
    if (r.ok) {
      setSendOk(true)
      setTimeout(() => setSendOk(false), 3000)
    } else {
      const map: Record<string, string> = {
        invalid_email: 'Adresse e-mail invalide',
        album_inactive: 'Album désactivé — réactivez-le d\'abord',
        album_not_found: 'Album introuvable',
        magiclink_failed: 'Échec génération du lien',
        no_api_key: 'Service mail non configuré',
        send_failed: 'Échec envoi',
      }
      setSendErr(map[r.error] ?? `Erreur: ${r.error}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-(--color-bronze)/10 border border-(--color-bronze)/30 p-4 text-sm text-(--color-charcoal)">
        <p className="font-semibold text-(--color-ink) mb-2">Espace client privé</p>
        <p className="text-xs leading-relaxed mb-2">
          Le client reçoit un e-mail avec un lien de connexion automatique. Une fois
          connecté, il accède à <code className="font-mono text-(--color-bronze)">/portail</code> où
          tous ses albums sont listés.
        </p>
        <p className="text-xs leading-relaxed">
          Idéal pour les clients réguliers — ils retrouvent tout en un endroit, sans
          mot de passe à retenir.
        </p>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.15em] text-(--color-stone) mb-1.5">
          E-mail du client
        </label>
        <input
          type="email"
          value={clientEmail}
          readOnly
          className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-charcoal) text-sm cursor-not-allowed"
        />
        <p className="mt-1 text-[10px] text-(--color-stone)">
          Modifie l&apos;e-mail dans l&apos;onglet Paramètres si nécessaire.
        </p>
      </div>

      {sendErr && (
        <p className="inline-flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5" />
          {sendErr}
        </p>
      )}
      {sendOk && (
        <p className="inline-flex items-center gap-2 text-xs text-(--color-bronze)">
          <Check className="w-3.5 h-3.5" />
          Invitation envoyée — le client peut maintenant se connecter.
        </p>
      )}

      <button
        type="button"
        onClick={onInvite}
        disabled={sending || !isActive || !clientEmail}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.15em] disabled:opacity-50"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
        Envoyer l&apos;invitation
      </button>
    </div>
  )
}
