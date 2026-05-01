'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Send, CheckCircle2, AlertCircle, ImagePlus, X, Upload, Clock } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import { submitContact, type ContactState } from './actions'

function scrollIntoView(el: HTMLElement | null) {
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 100
  window.scrollTo({ top, behavior: 'smooth' })
}

const initial: ContactState = { status: 'idle' }
const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-7 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-[0.2em] disabled:opacity-50"
    >
      <Send className="w-4 h-4" />
      {pending ? '…' : label}
    </button>
  )
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

type Props = {
  locale: Locale
  t: Dictionary
}

export default function ContactForm({ locale, t }: Props) {
  const [state, action] = useActionState(submitContact, initial)
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  // Sync onze state-files naar het verborgen input field zodat ze meegaan met FormData
  useEffect(() => {
    if (!hiddenInputRef.current) return
    const dt = new DataTransfer()
    files.forEach((f) => dt.items.add(f))
    hiddenInputRef.current.files = dt.files
  }, [files])

  // Scroll naar boven na submit zodat success/error-bericht zichtbaar is
  useEffect(() => {
    if (state.status === 'success') {
      scrollIntoView(successRef.current)
    } else if (state.status === 'error') {
      scrollIntoView(errorRef.current)
    }
  }, [state.status])

  const addFiles = (newFiles: FileList | File[]) => {
    setLocalError(null)
    const arr = Array.from(newFiles)
    const valid: File[] = []
    for (const f of arr) {
      if (!f.type.startsWith('image/')) {
        setLocalError(
          locale === 'fr' ? `Format non supporté : ${f.name}` : `Niet-ondersteund formaat: ${f.name}`
        )
        continue
      }
      if (f.size > MAX_FILE_SIZE) {
        setLocalError(
          locale === 'fr' ? `Trop volumineuse : ${f.name} (max 10MB)` : `Te groot: ${f.name} (max 10MB)`
        )
        continue
      }
      valid.push(f)
    }
    setFiles((prev) => {
      const combined = [...prev, ...valid].slice(0, MAX_FILES)
      if (prev.length + valid.length > MAX_FILES) {
        setLocalError(
          locale === 'fr' ? `Maximum ${MAX_FILES} photos` : `Maximum ${MAX_FILES} foto's`
        )
      }
      return combined
    })
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
    setLocalError(null)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  if (state.status === 'success') {
    return (
      <div
        ref={successRef}
        className="flex items-start gap-3 p-6 bg-(--color-paper) border border-(--color-bronze)/40"
      >
        <CheckCircle2 className="w-6 h-6 text-(--color-bronze) shrink-0 mt-0.5" />
        <div>
          <p className="text-(--color-ink) text-lg font-[family-name:var(--font-display)] mb-2">
            {locale === 'fr' ? 'Merci pour votre message' : 'Bedankt voor uw bericht'}
          </p>
          <p className="text-(--color-charcoal) flex items-center gap-2">
            <Clock className="w-4 h-4 text-(--color-bronze) shrink-0" />
            {t.contact.responseTime}
          </p>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {/* honeypot — verborgen voor mensen, ingevuld door bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px]"
        aria-hidden="true"
      />

      <div>
        <label htmlFor="name" className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {t.contact.name} <span className="text-(--color-bronze)">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full px-4 py-3 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="email" className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
            {t.contact.email} <span className="text-(--color-bronze)">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-4 py-3 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
            {t.contact.phone} <span className="text-(--color-bronze)">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="w-full px-4 py-3 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
          />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {t.contact.message} <span className="text-(--color-bronze)">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className="w-full px-4 py-3 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) resize-y"
        />
      </div>

      {/* File upload — drag & drop */}
      <div>
        <label className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {t.contact.files}
        </label>

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
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-colors cursor-pointer p-8 text-center ${
            dragOver
              ? 'border-(--color-bronze) bg-(--color-bronze)/5'
              : 'border-(--color-frame) hover:border-(--color-stone) bg-(--color-paper)'
          }`}
        >
          <Upload className="w-8 h-8 text-(--color-stone)" />
          <p className="text-sm text-(--color-charcoal)">{t.contact.filesHelp}</p>
          <p className="text-xs text-(--color-bronze)">{t.contact.filesQuality}</p>
          <p className="text-xs text-(--color-stone) mt-1">
            JPG, PNG, WEBP, HEIC · max 10MB · {MAX_FILES} {locale === 'fr' ? 'photos' : "foto's"}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = '' // reset zodat zelfde file opnieuw kan
          }}
          className="hidden"
        />
        {/* Verborgen input gesynced met state — gaat mee in FormData */}
        <input ref={hiddenInputRef} type="file" name="files" multiple className="hidden" />

        {/* Preview-lijst */}
        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
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
                  onClick={() => removeFile(i)}
                  aria-label={t.contact.removeFile}
                  className="text-(--color-stone) hover:text-(--color-ink) p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(state.status === 'error' || localError) && (
        <div
          ref={errorRef}
          className="flex items-start gap-2 p-4 bg-red-950/40 border border-red-900 text-red-200 text-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{localError ?? (state.status === 'error' ? state.message : '')}</p>
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-(--color-stone)">
        <Clock className="w-3.5 h-3.5" />
        {t.contact.responseTime}
      </p>

      <SubmitButton label={t.contact.send} />
    </form>
  )
}
