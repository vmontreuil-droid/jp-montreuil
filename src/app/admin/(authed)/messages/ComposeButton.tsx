'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  Plus,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  ImagePlus,
} from 'lucide-react'
import { sendComposed } from './actions'
import BiTranslate from '@/components/admin/BiTranslate'

export default function ComposeButton() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.15em]"
      >
        <Plus className="w-4 h-4" />
        Nouveau message
      </button>
    )
  }

  return <ComposeModal onClose={() => setOpen(false)} />
}

function ComposeModal({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [locale, setLocale] = useState<'fr' | 'nl'>('fr')
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
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 10))
  }

  function onSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setResult(null)
    const fd = new FormData(e.currentTarget)
    fd.set('to', to)
    fd.set('recipient_name', recipientName)
    fd.set('subject', subject)
    fd.set('body', body)
    fd.set('locale', locale)
    startTransition(() => {
      void (async () => {
        const r = await sendComposed(fd)
        if (r.ok) {
          setResult('success')
          setTimeout(() => onClose(), 1800)
        } else {
          setResult(r.error)
        }
      })()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <form
        onSubmit={onSend}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-(--color-paper) border border-(--color-frame) p-6 my-8 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink)">
            Nouveau message
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-1 text-(--color-stone) hover:text-(--color-ink)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1">
              À (email) *
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              placeholder="client@exemple.com"
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1">
              Nom destinataire
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="(salutation: Bonjour …)"
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
              <label className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
                Objet *
              </label>
              <BiTranslate getSource={() => subject} onTranslated={setSubject} />
            </div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1">
              Langue
            </label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'fr' | 'nl')}
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
            >
              <option value="fr">FR</option>
              <option value="nl">NL</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
            <label className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
              Message *
            </label>
            <BiTranslate getSource={() => body} onTranslated={setBody} />
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={10}
            className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) resize-y leading-relaxed"
          />
          <p className="mt-1 text-xs text-(--color-stone)">
            {body.length} / 10000 — envoyé depuis{' '}
            <span className="text-(--color-bronze)">noreply@montreuil.be</span> avec retour à{' '}
            <span className="text-(--color-bronze)">jp@montreuil.be</span>
          </p>
        </div>

        {/* Drop-zone */}
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1">
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
                : 'border-(--color-frame) hover:border-(--color-stone) bg-(--color-canvas)'
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
                  className="flex items-center gap-2 px-2 py-1 bg-(--color-canvas) border border-(--color-frame) text-xs"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-(--color-bronze) shrink-0" />
                  <span className="flex-1 truncate text-(--color-ink)">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, x) => x !== i))}
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
            Message envoyé
          </p>
        )}
        {result && result !== 'success' && (
          <p className="flex items-center gap-2 text-sm text-red-300 bg-red-950/40 border border-red-900 px-3 py-2">
            <AlertCircle className="w-4 h-4" />
            Erreur : {result}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={pending || result === 'success'}
            className="inline-flex items-center gap-2 px-5 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.15em] disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer
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
    </div>
  )
}
