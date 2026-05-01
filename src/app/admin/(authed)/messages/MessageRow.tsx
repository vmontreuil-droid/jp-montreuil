'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  Mail,
  Phone,
  Clock,
  Paperclip,
  Eye,
  EyeOff,
  Trash2,
  Download,
  ChevronDown,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  ImagePlus,
  X,
} from 'lucide-react'
import { markRead, markUnread, deleteMessage, getAttachmentUrl, sendReply } from './actions'
import TranslateButton from '@/components/admin/TranslateButton'

type Attachment = {
  id: string
  filename: string
  storage_path: string
  content_type: string | null
  size_bytes: number | null
}

type Message = {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  locale: string | null
  ip: string | null
  read_at: string | null
  created_at: string
  contact_attachments: Attachment[]
}

function formatBytes(b: number | null): string {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(s: string): string {
  const d = new Date(s)
  return d.toLocaleString('fr-BE', { dateStyle: 'short', timeStyle: 'short' })
}

export default function MessageRow({ message }: { message: Message }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [replyOpen, setReplyOpen] = useState(false)
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})
  const [translation, setTranslation] = useState<string | null>(null)
  const isUnread = !message.read_at
  const sourceLang = (message.locale === 'nl' ? 'nl' : 'fr') as 'fr' | 'nl'
  const targetLang = sourceLang === 'fr' ? 'nl' : 'fr'

  // Lazy: laad signed URLs voor foto-bijlagen wanneer rij openklapt
  useEffect(() => {
    if (!open) return
    const imageAtts = message.contact_attachments.filter((a) =>
      (a.content_type ?? '').startsWith('image/')
    )
    const missing = imageAtts.filter((a) => !thumbUrls[a.id])
    if (missing.length === 0) return

    let cancelled = false
    Promise.all(
      missing.map(async (a) => {
        const url = await getAttachmentUrl(a.storage_path)
        return { id: a.id, url }
      })
    ).then((results) => {
      if (cancelled) return
      const next: Record<string, string> = {}
      for (const r of results) {
        if (r.url) next[r.id] = r.url
      }
      setThumbUrls((prev) => ({ ...prev, ...next }))
    })
    return () => {
      cancelled = true
    }
  }, [open, message.contact_attachments, thumbUrls])

  function toggle() {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && isUnread) {
      startTransition(() => {
        void markRead(message.id)
      })
    }
  }

  function onToggleRead(e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(() => {
      void (isUnread ? markRead(message.id) : markUnread(message.id))
    })
  }

  function onDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Supprimer le message de ${message.name} ?`)) return
    startTransition(() => {
      void deleteMessage(message.id)
    })
  }

  async function downloadAttachment(att: Attachment) {
    const url = await getAttachmentUrl(att.storage_path)
    if (!url) {
      alert('Erreur lors de la génération du lien')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className={`border transition-colors ${
        isUnread
          ? 'border-(--color-bronze)/40 bg-(--color-bronze)/5'
          : 'border-(--color-frame) bg-(--color-paper)'
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-4 p-4 text-left"
        aria-expanded={open}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isUnread ? 'bg-(--color-bronze)' : 'bg-(--color-frame)'
          }`}
          aria-label={isUnread ? 'Non lu' : 'Lu'}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className={`text-sm ${isUnread ? 'font-semibold text-(--color-ink)' : 'text-(--color-charcoal)'}`}>
              {message.name}
            </span>
            <span className="text-xs text-(--color-stone) truncate">{message.email}</span>
            {message.contact_attachments.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-(--color-stone)">
                <Paperclip className="w-3 h-3" />
                {message.contact_attachments.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-(--color-stone) truncate">{message.message}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-(--color-stone) shrink-0">
          <span className="hidden sm:inline">{formatDate(message.created_at)}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-(--color-frame) p-5 space-y-4">
          {/* Acties */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleRead}
              disabled={pending}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs uppercase tracking-[0.15em] border border-(--color-frame) text-(--color-stone) hover:text-(--color-ink) hover:border-(--color-stone) transition-colors disabled:opacity-50"
            >
              {isUnread ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {isUnread ? 'Marquer lu' : 'Marquer non lu'}
            </button>
            <button
              type="button"
              onClick={() => setReplyOpen(!replyOpen)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs uppercase tracking-[0.15em] bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Répondre
            </button>
            {message.phone && (
              <a
                href={`tel:${message.phone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs uppercase tracking-[0.15em] border border-(--color-frame) text-(--color-stone) hover:text-(--color-ink) hover:border-(--color-stone) transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                Appeler
              </a>
            )}
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs uppercase tracking-[0.15em] border border-red-900/30 text-red-300 hover:bg-red-950/40 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </button>
          </div>

          {/* Contactgegevens */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1">Email</dt>
              <dd>
                <a href={`mailto:${message.email}`} className="text-(--color-ink) hover:text-(--color-bronze)">
                  {message.email}
                </a>
              </dd>
            </div>
            {message.phone && (
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1">Téléphone</dt>
                <dd>
                  <a href={`tel:${message.phone.replace(/\s/g, '')}`} className="text-(--color-ink) hover:text-(--color-bronze)">
                    {message.phone}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1">Date</dt>
              <dd className="text-(--color-charcoal)">
                <Clock className="inline w-3.5 h-3.5 mr-1" />
                {formatDate(message.created_at)}
              </dd>
            </div>
            {message.locale && (
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1">Langue</dt>
                <dd className="text-(--color-charcoal) uppercase">{message.locale}</dd>
              </div>
            )}
          </dl>

          {/* Bericht */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
                Message {sourceLang === 'nl' && <span className="ml-1 text-(--color-bronze)">(NL)</span>}
              </h3>
              <TranslateButton
                getSource={() => message.message}
                from={sourceLang}
                to={targetLang}
                onTranslated={setTranslation}
                label={`Traduire → ${targetLang.toUpperCase()}`}
              />
            </div>
            <p className="bg-(--color-canvas) border border-(--color-frame) p-4 text-(--color-ink) whitespace-pre-wrap text-sm leading-relaxed">
              {message.message}
            </p>
            {translation && (
              <div className="mt-2 bg-(--color-bronze)/5 border border-(--color-bronze)/30 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-bronze) mb-2">
                  Traduction → {targetLang.toUpperCase()}
                </p>
                <p className="text-(--color-ink) whitespace-pre-wrap text-sm leading-relaxed">
                  {translation}
                </p>
              </div>
            )}
          </div>

          {/* Reply form */}
          {replyOpen && (
            <ReplyForm
              message={message}
              onClose={() => setReplyOpen(false)}
            />
          )}

          {/* Bijlagen */}
          {message.contact_attachments.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
                Pièces jointes ({message.contact_attachments.length})
              </h3>

              {/* Foto-grid met thumbnails (klik = open op volle grootte in nieuw venster) */}
              {(() => {
                const images = message.contact_attachments.filter((a) =>
                  (a.content_type ?? '').startsWith('image/')
                )
                if (images.length === 0) return null
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                    {images.map((a) => {
                      const url = thumbUrls[a.id]
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => downloadAttachment(a)}
                          className="group relative aspect-square bg-(--color-canvas) border border-(--color-frame) hover:border-(--color-bronze) overflow-hidden transition-colors"
                          title={`${a.filename} — ${formatBytes(a.size_bytes)}`}
                        >
                          {url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={a.filename}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-(--color-stone)">
                              <Loader2 className="w-5 h-5 animate-spin" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] truncate text-left">
                            {a.filename}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Volledige lijst (alle types, ook PDF/etc) */}
              <ul className="space-y-1">
                {message.contact_attachments.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => downloadAttachment(a)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-(--color-canvas) border border-(--color-frame) hover:border-(--color-bronze) transition-colors text-sm text-left"
                    >
                      <Paperclip className="w-4 h-4 text-(--color-bronze) shrink-0" />
                      <span className="flex-1 truncate text-(--color-ink)">{a.filename}</span>
                      <span className="text-xs text-(--color-stone)">{formatBytes(a.size_bytes)}</span>
                      <Download className="w-4 h-4 text-(--color-stone)" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReplyForm({
  message,
  onClose,
}: {
  message: Message
  onClose: () => void
}) {
  const isFR = (message.locale ?? 'fr') === 'fr'
  const defaultSubject = isFR
    ? `Re : votre message`
    : `Re: uw bericht`
  const placeholder = isFR
    ? `Bonjour ${message.name},\n\nMerci pour votre message…`
    : `Beste ${message.name},\n\nBedankt voor uw bericht…`

  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<'success' | string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hiddenInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!hiddenInputRef.current) return
    const dt = new DataTransfer()
    files.forEach((f) => dt.items.add(f))
    hiddenInputRef.current.files = dt.files
  }, [files])

  function addFiles(list: FileList | File[]) {
    const arr = Array.from(list)
    setFiles((prev) => [...prev, ...arr].slice(0, 10))
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  function onSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setResult(null)
    const fd = new FormData(e.currentTarget)
    fd.set('message_id', message.id)
    fd.set('subject', subject)
    fd.set('body', body)
    startTransition(() => {
      void (async () => {
        const r = await sendReply(fd)
        if (r.ok) {
          setResult('success')
          setTimeout(() => {
            onClose()
            setResult(null)
            setBody('')
            setFiles([])
          }, 2000)
        } else {
          setResult(r.error)
        }
      })()
    })
  }

  return (
    <form
      onSubmit={onSend}
      className="border border-(--color-bronze)/30 bg-(--color-canvas) p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
          Réponse à {message.name} ({message.email})
        </h3>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone)">
            Objet
            {!isFR && (
              <span className="ml-2 normal-case tracking-normal text-(--color-bronze)">
                — écrivez en FR puis traduisez
              </span>
            )}
          </label>
          {!isFR && (
            <TranslateButton
              getSource={() => subject}
              from="fr"
              to="nl"
              onTranslated={setSubject}
              label="Traduire → NL"
            />
          )}
        </div>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-sm text-(--color-ink)"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone)">
            Message
          </label>
          {!isFR && (
            <TranslateButton
              getSource={() => body}
              from="fr"
              to="nl"
              onTranslated={setBody}
              label="Traduire → NL"
            />
          )}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={8}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-sm text-(--color-ink) resize-y leading-relaxed"
        />
        <p className="mt-1 text-xs text-(--color-stone)">
          {body.length} / 10000 — la réponse sera envoyée depuis{' '}
          <span className="text-(--color-bronze)">noreply@montreuil.be</span>{' '}
          avec retour à <span className="text-(--color-bronze)">jp@montreuil.be</span>
        </p>
      </div>

      {/* Bijlage drop-zone */}
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1">
          Pièces jointes (optionnel)
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
          }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed cursor-pointer p-4 text-center transition-colors text-xs ${
            dragOver
              ? 'border-(--color-bronze) bg-(--color-bronze)/5'
              : 'border-(--color-frame) hover:border-(--color-stone) bg-(--color-paper)'
          }`}
        >
          <Upload className="w-5 h-5 text-(--color-stone)" />
          <p className="text-(--color-charcoal)">
            Glisser-déposer ou cliquer — JPG, PNG, WEBP, PDF
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
          className="hidden"
        />
        <input ref={hiddenInputRef} type="file" name="files" multiple className="hidden" />

        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 px-2 py-1 bg-(--color-paper) border border-(--color-frame) text-xs"
              >
                <ImagePlus className="w-3.5 h-3.5 text-(--color-bronze) shrink-0" />
                <span className="flex-1 truncate text-(--color-ink)">{f.name}</span>
                <span className="text-[10px] text-(--color-stone)">
                  {f.size < 1024 * 1024
                    ? `${(f.size / 1024).toFixed(0)} KB`
                    : `${(f.size / 1024 / 1024).toFixed(1)} MB`}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label="Retirer"
                  className="text-(--color-stone) hover:text-(--color-ink) p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {result === 'success' && (
        <p className="flex items-center gap-2 text-sm text-(--color-bronze)">
          <CheckCircle2 className="w-4 h-4" />
          Réponse envoyée
        </p>
      )}
      {result && result !== 'success' && (
        <p className="flex items-center gap-2 text-sm text-red-300 bg-red-950/40 border border-red-900 px-3 py-2">
          <AlertCircle className="w-4 h-4" />
          Erreur : {result}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || result === 'success'}
          className="inline-flex items-center gap-2 px-5 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.15em] disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Envoi…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Envoyer
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center px-4 py-2 border border-(--color-frame) text-(--color-stone) hover:text-(--color-ink) hover:border-(--color-stone) text-sm uppercase tracking-[0.15em]"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
