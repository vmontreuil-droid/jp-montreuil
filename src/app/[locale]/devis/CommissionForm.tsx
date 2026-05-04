'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Send, CheckCircle2, AlertCircle, ImagePlus, X, Upload, Clock } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import { submitCommission, type CommissionState } from './actions'

const initial: CommissionState = { status: 'idle' }
const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'
const TECHNIQUES = ['crayon_nb', 'aquarelle_couleur', 'acrylique_toile', 'autre'] as const
const SUPPORTS = ['papier_aquarelle', 'toile_lin', 'peu_importe'] as const
const FRAMINGS = ['oui', 'non', 'peu_importe'] as const

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function scrollIntoView(el: HTMLElement | null) {
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 100
  window.scrollTo({ top, behavior: 'smooth' })
}

function SubmitButton({ label, sendingLabel }: { label: string; sendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-7 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-[0.2em] disabled:opacity-50"
    >
      <Send className="w-4 h-4" />
      {pending ? sendingLabel : label}
    </button>
  )
}

type Props = {
  locale: Locale
  t: Dictionary
}

export default function CommissionForm({ locale, t }: Props) {
  const tt = t.devis
  const [state, action] = useActionState(submitCommission, initial)
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [selectedTechnique, setSelectedTechnique] = useState<typeof TECHNIQUES[number]>('aquarelle_couleur')
  const [selectedSupport, setSelectedSupport] = useState<typeof SUPPORTS[number]>('peu_importe')
  const [selectedFraming, setSelectedFraming] = useState<typeof FRAMINGS[number]>('peu_importe')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hiddenInputRef.current) return
    const dt = new DataTransfer()
    files.forEach((f) => dt.items.add(f))
    hiddenInputRef.current.files = dt.files
  }, [files])

  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  useEffect(() => {
    const urls = files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : ''))
    setPreviewUrls(urls)
    return () => {
      urls.forEach((u) => u && URL.revokeObjectURL(u))
    }
  }, [files])

  useEffect(() => {
    if (state.status === 'success') scrollIntoView(successRef.current)
    else if (state.status === 'error') scrollIntoView(errorRef.current)
  }, [state.status])

  const addFiles = (newFiles: FileList | File[]) => {
    setLocalError(null)
    const arr = Array.from(newFiles)
    const valid: File[] = []
    for (const f of arr) {
      if (!f.type.startsWith('image/')) {
        setLocalError(tt.errors.unsupportedFile)
        continue
      }
      if (f.size > MAX_FILE_SIZE) {
        setLocalError(tt.errors.fileTooBig)
        continue
      }
      valid.push(f)
    }
    setFiles((prev) => {
      const combined = [...prev, ...valid].slice(0, MAX_FILES)
      if (prev.length + valid.length > MAX_FILES) {
        setLocalError(tt.errors.tooManyFiles)
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
            {tt.successTitle}
          </p>
          <p className="text-(--color-charcoal) flex items-center gap-2">
            <Clock className="w-4 h-4 text-(--color-bronze) shrink-0" />
            {tt.successBody}
          </p>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px]"
        aria-hidden="true"
      />

      {/* Technique */}
      <div>
        <label className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {tt.techniqueLabel} <span className="text-(--color-bronze)">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TECHNIQUES.map((tk) => {
            const active = selectedTechnique === tk
            return (
              <label
                key={tk}
                className={`cursor-pointer text-center px-3 py-3 text-sm border transition-colors ${
                  active
                    ? 'border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-ink)'
                    : 'border-(--color-frame) bg-(--color-paper) text-(--color-charcoal) hover:border-(--color-stone)'
                }`}
              >
                <input
                  type="radio"
                  name="technique"
                  value={tk}
                  checked={active}
                  onChange={() => setSelectedTechnique(tk)}
                  className="sr-only"
                />
                {tt.techniqueOptions[tk]}
              </label>
            )
          })}
        </div>
      </div>

      {/* Support */}
      <div>
        <label className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {tt.supportLabel}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SUPPORTS.map((s) => {
            const active = selectedSupport === s
            return (
              <label
                key={s}
                className={`cursor-pointer text-center px-3 py-3 text-sm border transition-colors ${
                  active
                    ? 'border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-ink)'
                    : 'border-(--color-frame) bg-(--color-paper) text-(--color-charcoal) hover:border-(--color-stone)'
                }`}
              >
                <input
                  type="radio"
                  name="support"
                  value={s}
                  checked={active}
                  onChange={() => setSelectedSupport(s)}
                  className="sr-only"
                />
                {tt.supportOptions[s]}
              </label>
            )
          })}
        </div>
      </div>

      {/* Format */}
      <div>
        <label className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {tt.sizeLabel}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="width_cm"
            type="number"
            min="1"
            step="0.1"
            placeholder={tt.widthLabel}
            className="w-full px-4 py-3 input-elev bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
          />
          <input
            name="height_cm"
            type="number"
            min="1"
            step="0.1"
            placeholder={tt.heightLabel}
            className="w-full px-4 py-3 input-elev bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
          />
        </div>
        <p className="mt-2 text-xs text-(--color-stone)">{tt.sizeHint}</p>
      </div>

      {/* Framing */}
      <div>
        <label className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {tt.framingLabel}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {FRAMINGS.map((f) => {
            const active = selectedFraming === f
            return (
              <label
                key={f}
                className={`cursor-pointer text-center px-3 py-3 text-sm border transition-colors ${
                  active
                    ? 'border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-ink)'
                    : 'border-(--color-frame) bg-(--color-paper) text-(--color-charcoal) hover:border-(--color-stone)'
                }`}
              >
                <input
                  type="radio"
                  name="framing"
                  value={f}
                  checked={active}
                  onChange={() => setSelectedFraming(f)}
                  className="sr-only"
                />
                {tt.framingOptions[f]}
              </label>
            )
          })}
        </div>
      </div>

      {/* Identité */}
      <div>
        <label htmlFor="name" className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {tt.nameLabel} <span className="text-(--color-bronze)">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder={tt.namePlaceholder}
          className="w-full px-4 py-3 input-elev bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="email" className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
            {tt.emailLabel} <span className="text-(--color-bronze)">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder={tt.emailPlaceholder}
            className="w-full px-4 py-3 input-elev bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
            {tt.phoneLabel}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder={tt.phonePlaceholder}
            className="w-full px-4 py-3 input-elev bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
          />
        </div>
      </div>

      <div>
        <label htmlFor="budget" className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {tt.budgetLabel}
        </label>
        <input
          id="budget"
          name="budget"
          type="text"
          placeholder={tt.budgetPlaceholder}
          className="w-full px-4 py-3 input-elev bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
        />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {tt.messageLabel} <span className="text-(--color-bronze)">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder={tt.messagePlaceholder}
          className="w-full px-4 py-3 input-elev bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) resize-y"
        />
      </div>

      {/* References */}
      <div>
        <label className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {tt.referencesLabel}
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
          <p className="text-sm text-(--color-charcoal)">{tt.chooseFiles}</p>
          <p className="text-xs text-(--color-stone) mt-1">{tt.referencesHint}</p>
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
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {files.map((f, i) => {
              const url = previewUrls[i]
              return (
                <div
                  key={`${f.name}-${i}`}
                  className="relative group bg-(--color-paper) border border-(--color-frame) overflow-hidden"
                >
                  <div className="relative aspect-square bg-(--color-canvas)">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={f.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-(--color-stone)">
                        <ImagePlus className="w-8 h-8" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(i)
                      }}
                      aria-label={tt.removeFile}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2 text-xs">
                    <p className="truncate text-(--color-ink)">{f.name}</p>
                    <p className="text-(--color-stone) text-[10px]">{formatBytes(f.size)}</p>
                  </div>
                </div>
              )
            })}
          </div>
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

      <p className="text-xs text-(--color-stone)">{tt.askedFields}</p>

      <SubmitButton label={tt.sendBtn} sendingLabel={tt.sending} />
    </form>
  )
}
