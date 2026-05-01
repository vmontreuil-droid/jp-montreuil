'use client'

import { useState, useTransition } from 'react'
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
} from 'lucide-react'
import { markRead, markUnread, deleteMessage, getAttachmentUrl, sendReply } from './actions'

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
  const isUnread = !message.read_at

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
            <h3 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">Message</h3>
            <p className="bg-(--color-canvas) border border-(--color-frame) p-4 text-(--color-ink) whitespace-pre-wrap text-sm leading-relaxed">
              {message.message}
            </p>
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
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<'success' | string | null>(null)

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
        <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1">
          Objet
        </label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-sm text-(--color-ink)"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1">
          Message
        </label>
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
