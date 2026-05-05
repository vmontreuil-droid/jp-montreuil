'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Send, CheckCircle2, AlertCircle, ImagePlus, X, Upload, Minus, Plus, Clock, Loader2 } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import {
  FORMATS,
  FRAME_TYPES,
  SUPPLEMENT_IDS,
  PORTRAIT_COUNT_MIN,
  PORTRAIT_COUNT_MAX,
  priceBreakdown,
  type SupplementId,
  type FrameType,
  type Pricing,
  type PriceLineItem,
} from '@/lib/atelier-config'
import { submitCommission, type CommissionState } from './actions'
import { compressImage } from './compress-image'

const initial: CommissionState = { status: 'idle' }
const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
// Expliciet — iOS Safari opent dan rechtstreeks Foto's (HEIC of JPEG),
// geen verwarring met bestandsbeheerder of camera-app.
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/*'
const TECHNIQUES = ['crayon_nb', 'aquarelle_couleur', 'acrylique_toile'] as const
const SUPPORTS = ['papier_aquarelle', 'toile_lin'] as const
type FormatChoice = (typeof FORMATS)[number]['id'] | 'custom'

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

function SubmitButton({
  label,
  sendingLabel,
  externallyDisabled,
  externalLabel,
}: {
  label: string
  sendingLabel: string
  externallyDisabled?: boolean
  externalLabel?: string
}) {
  const { pending } = useFormStatus()
  const disabled = pending || !!externallyDisabled
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex items-center gap-2 px-7 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-[0.2em] disabled:opacity-50"
      >
        {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {pending ? sendingLabel : externallyDisabled ? externalLabel ?? sendingLabel : label}
      </button>
      {disabled && (
        <div className="w-full max-w-xs h-1 bg-(--color-frame) overflow-hidden rounded-full">
          <div className="h-full w-1/3 bg-(--color-bronze) rounded-full devis-progress-bar" />
        </div>
      )}
    </div>
  )
}

type Props = {
  locale: Locale
  t: Dictionary
  pricing: Pricing
}

export default function CommissionForm({ locale, t, pricing }: Props) {
  const tt = t.devis
  const [state, action] = useActionState(submitCommission, initial)
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [selectedTechnique, setSelectedTechnique] = useState<typeof TECHNIQUES[number]>('aquarelle_couleur')
  const [selectedSupport, setSelectedSupport] = useState<typeof SUPPORTS[number]>('papier_aquarelle')
  const [selectedFrame, setSelectedFrame] = useState<FrameType>('aucun')
  const [selectedFormat, setSelectedFormat] = useState<FormatChoice>('40x60')
  const [customWidth, setCustomWidth] = useState('')
  const [customHeight, setCustomHeight] = useState('')
  const [portraitCount, setPortraitCount] = useState(1)
  const [selectedSupplements, setSelectedSupplements] = useState<Set<SupplementId>>(new Set())
  const [discussMode, setDiscussMode] = useState(false)

  const toggleSupplement = (id: SupplementId) => {
    setSelectedSupplements((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatPreset = FORMATS.find((f) => f.id === selectedFormat)
  const effectiveWidth =
    selectedFormat === 'custom' ? customWidth : formatPreset ? String(formatPreset.width) : ''
  const effectiveHeight =
    selectedFormat === 'custom' ? customHeight : formatPreset ? String(formatPreset.height) : ''

  const breakdown = priceBreakdown({
    formatId: selectedFormat,
    frameType: selectedFrame,
    portraitCount,
    supplements: Array.from(selectedSupplements),
    pricing,
  })
  const estimatedPrice = breakdown.total

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale === 'fr' ? 'fr-BE' : 'nl-BE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount)

  const lineLabel = (line: PriceLineItem): string => {
    if (line.key.startsWith('format:')) {
      const id = line.key.split(':')[1]
      if (id === 'custom') return tt.formatOptions.custom
      return tt.formatOptions[id as keyof typeof tt.formatOptions] || id
    }
    if (line.key.startsWith('frame:')) {
      const id = line.key.split(':')[1]
      return tt.frameTypeOptions[id as keyof typeof tt.frameTypeOptions] || id
    }
    if (line.key === 'extra_portraits') {
      const n = line.qty ?? 0
      return locale === 'fr'
        ? `${n} portrait${n > 1 ? 's' : ''} supplémentaire${n > 1 ? 's' : ''}`
        : `${n} extra portret${n > 1 ? 'ten' : ''}`
    }
    if (line.key.startsWith('supplement:')) {
      const id = line.key.split(':')[1]
      return tt.supplementOptions[id as keyof typeof tt.supplementOptions] || id
    }
    return line.key
  }

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

  const [compressing, setCompressing] = useState(false)

  const addFiles = async (newFiles: FileList | File[]) => {
    setLocalError(null)
    const arr = Array.from(newFiles)
    const initialValid: File[] = []
    for (const f of arr) {
      // Op iPhone heeft de FileList soms een lege MIME ('') voor HEIC.
      // We accepteren alles wat er minstens als image binnenkomt of een
      // bekende foto-extensie heeft.
      const looksLikeImage =
        f.type.startsWith('image/') || /\.(heic|heif|jpg|jpeg|png|webp|gif)$/i.test(f.name)
      if (!looksLikeImage) {
        setLocalError(tt.errors.unsupportedFile)
        continue
      }
      if (f.size > MAX_FILE_SIZE * 4) {
        // Boven de 40MB überhaupt niet proberen — telefoon-camera's halen
        // dat nooit. Anders leggen we de browser plat met canvas-decoding.
        setLocalError(tt.errors.fileTooBig)
        continue
      }
      initialValid.push(f)
    }

    // Compressie: groot HEIC/JPEG → max 1800px JPEG q=0.85. Kritiek voor
    // iPhone uploads waar 5×8MB = 40MB anders door de timeout zou ploffen.
    setCompressing(true)
    try {
      const compressed = await Promise.all(initialValid.map((f) => compressImage(f)))
      const valid = compressed.filter((f) => {
        if (f.size > MAX_FILE_SIZE) {
          setLocalError(tt.errors.fileTooBig)
          return false
        }
        return true
      })
      setFiles((prev) => {
        const combined = [...prev, ...valid].slice(0, MAX_FILES)
        if (prev.length + valid.length > MAX_FILES) {
          setLocalError(tt.errors.tooManyFiles)
        }
        return combined
      })
    } finally {
      setCompressing(false)
    }
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
    setLocalError(null)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) void addFiles(e.dataTransfer.files)
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

      {/* Discuss-mode toggle */}
      <label
        className={`flex items-start gap-3 cursor-pointer px-4 py-3 border transition-colors ${
          discussMode
            ? 'border-(--color-bronze) bg-(--color-bronze)/10'
            : 'border-(--color-frame) bg-(--color-paper) hover:border-(--color-stone)'
        }`}
      >
        <input
          type="checkbox"
          name="discuss_only"
          checked={discussMode}
          onChange={(e) => setDiscussMode(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-(--color-bronze)"
        />
        <div>
          <span className="block text-sm text-(--color-ink)">{tt.discussModeLabel}</span>
          <span className="block mt-1 text-xs text-(--color-stone) leading-relaxed">
            {tt.discussModeHint}
          </span>
        </div>
      </label>

      {!discussMode && (
        <>
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
          {tt.sizeLabel} <span className="text-(--color-bronze)">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {([...FORMATS.map((f) => f.id), 'custom'] as FormatChoice[]).map((fid) => {
            const active = selectedFormat === fid
            const label =
              fid === 'custom' ? tt.formatOptions.custom : tt.formatOptions[fid]
            return (
              <label
                key={fid}
                className={`cursor-pointer text-center px-2 py-3 text-xs sm:text-sm border transition-colors ${
                  active
                    ? 'border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-ink)'
                    : 'border-(--color-frame) bg-(--color-paper) text-(--color-charcoal) hover:border-(--color-stone)'
                }`}
              >
                <input
                  type="radio"
                  name="format_choice"
                  value={fid}
                  checked={active}
                  onChange={() => setSelectedFormat(fid)}
                  className="sr-only"
                />
                {label}
              </label>
            )
          })}
        </div>
        <input type="hidden" name="width_cm" value={effectiveWidth} />
        <input type="hidden" name="height_cm" value={effectiveHeight} />
        {selectedFormat === 'custom' && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input
                type="number"
                min="1"
                step="0.1"
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                placeholder={tt.widthLabel}
                required
                className="w-full px-4 py-3 input-elev bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
              />
              <input
                type="number"
                min="1"
                step="0.1"
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                placeholder={tt.heightLabel}
                required
                className="w-full px-4 py-3 input-elev bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
              />
            </div>
            <p className="mt-2 text-xs text-(--color-stone)">{tt.sizeHint}</p>
          </>
        )}
      </div>

      {/* Aantal portretten */}
      <div>
        <label className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {tt.portraitCountLabel}
        </label>
        <div className="inline-flex items-center border border-(--color-frame) bg-(--color-paper)">
          <button
            type="button"
            onClick={() => setPortraitCount((v) => Math.max(PORTRAIT_COUNT_MIN, v - 1))}
            disabled={portraitCount <= PORTRAIT_COUNT_MIN}
            className="px-3 py-2.5 text-(--color-charcoal) hover:bg-(--color-canvas) disabled:opacity-30"
            aria-label="−"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-12 text-center text-(--color-ink) tabular-nums">
            {portraitCount}
          </span>
          <button
            type="button"
            onClick={() => setPortraitCount((v) => Math.min(PORTRAIT_COUNT_MAX, v + 1))}
            disabled={portraitCount >= PORTRAIT_COUNT_MAX}
            className="px-3 py-2.5 text-(--color-charcoal) hover:bg-(--color-canvas) disabled:opacity-30"
            aria-label="+"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <input type="hidden" name="portrait_count" value={portraitCount} />
        <p className="mt-2 text-xs text-(--color-stone)">{tt.portraitCountHint}</p>
      </div>

      {/* Supplementen */}
      <div>
        <label className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {tt.supplementsLabel}
        </label>
        <div className="space-y-2">
          {SUPPLEMENT_IDS.map((sid) => {
            const active = selectedSupplements.has(sid)
            return (
              <label
                key={sid}
                className={`flex items-center gap-3 cursor-pointer px-4 py-3 border transition-colors ${
                  active
                    ? 'border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-ink)'
                    : 'border-(--color-frame) bg-(--color-paper) text-(--color-charcoal) hover:border-(--color-stone)'
                }`}
              >
                <input
                  type="checkbox"
                  name="supplements"
                  value={sid}
                  checked={active}
                  onChange={() => toggleSupplement(sid)}
                  className="w-4 h-4 accent-(--color-bronze)"
                />
                <span className="text-sm">{tt.supplementOptions[sid]}</span>
              </label>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-(--color-stone)">{tt.supplementsHint}</p>
      </div>

      {/* Frame type */}
      <div>
        <label className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {tt.frameTypeLabel}
        </label>
        <div className="space-y-2">
          {FRAME_TYPES.map((f) => {
            const active = selectedFrame === f
            return (
              <label
                key={f}
                className={`flex items-center gap-3 cursor-pointer px-4 py-3 border transition-colors ${
                  active
                    ? 'border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-ink)'
                    : 'border-(--color-frame) bg-(--color-paper) text-(--color-charcoal) hover:border-(--color-stone)'
                }`}
              >
                <input
                  type="radio"
                  name="frame_type"
                  value={f}
                  checked={active}
                  onChange={() => setSelectedFrame(f)}
                  className="w-4 h-4 accent-(--color-bronze)"
                />
                <span className="text-sm">{tt.frameTypeOptions[f]}</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
        <div className="min-w-0 flex flex-col">
          <label htmlFor="email" className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2 min-h-[3rem] leading-tight">
            {tt.emailLabel} <span className="text-(--color-bronze)">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder={tt.emailPlaceholder}
            className="w-full min-w-0 px-4 py-3 input-elev bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
          />
        </div>
        <div className="min-w-0 flex flex-col">
          <label htmlFor="phone" className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2 min-h-[3rem] leading-tight">
            {tt.phoneLabel} <span className="text-(--color-bronze)">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            placeholder={tt.phonePlaceholder}
            className="w-full min-w-0 px-4 py-3 input-elev bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
          />
        </div>
      </div>

      {/* Prix indicatif (live) — détail par ligne + BTW */}
      <div className="bg-(--color-bronze)/10 border border-(--color-bronze)/40 px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-3">
          {tt.estimateLabel}
        </p>
        <ul className="space-y-1.5 mb-3 text-sm">
          {breakdown.lines.map((line) => (
            <li
              key={line.key}
              className="flex items-baseline justify-between gap-3 border-b border-(--color-bronze)/20 pb-1.5 last:border-b-0 last:pb-0"
            >
              <span className="text-(--color-charcoal)">{lineLabel(line)}</span>
              <span className="text-(--color-ink) tabular-nums whitespace-nowrap">
                {line.onRequest
                  ? tt.estimateCustom
                  : formatCurrency(line.amount)}
              </span>
            </li>
          ))}
        </ul>

        {estimatedPrice != null && (() => {
          // Lijnen op /devis zijn TTC (BTW inbegrepen) — extraheer BTW.
          const ttc = estimatedPrice
          const ht =
            pricing.defaultVatRate > 0
              ? Math.round((ttc / (1 + pricing.defaultVatRate / 100)) * 100) / 100
              : ttc
          const vat = Math.round((ttc - ht) * 100) / 100
          return (
            <div className="space-y-1 text-sm pt-2 border-t border-(--color-bronze)/30">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-(--color-charcoal) text-xs">
                  {locale === 'fr' ? 'Sous-total HT' : 'Subtotaal excl. BTW'}
                </span>
                <span className="text-(--color-ink) tabular-nums">{formatCurrency(ht)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-(--color-charcoal) text-xs">
                  {locale === 'fr'
                    ? `TVA (${pricing.defaultVatRate}%)`
                    : `BTW (${pricing.defaultVatRate}%)`}
                </span>
                <span className="text-(--color-ink) tabular-nums">{formatCurrency(vat)}</span>
              </div>
            </div>
          )
        })()}

        <div className="flex items-baseline justify-between gap-3 pt-2 mt-2 border-t-2 border-(--color-bronze)/40">
          <span className="text-sm uppercase tracking-[0.15em] text-(--color-stone)">
            {estimatedPrice != null && pricing.defaultVatRate > 0
              ? locale === 'fr'
                ? 'Total TTC'
                : 'Totaal incl. BTW'
              : tt.estimateTotal}
          </span>
          <span className="text-2xl font-[family-name:var(--font-display)] text-(--color-ink)">
            {estimatedPrice == null ? tt.estimateCustom : formatCurrency(estimatedPrice)}
          </span>
        </div>
        <p className="mt-3 text-xs text-(--color-stone) leading-relaxed">{tt.estimateHint}</p>
      </div>
        </>
      )}

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
          {tt.referencesLabel} <span className="text-(--color-bronze)">*</span>
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
            if (e.target.files) void addFiles(e.target.files)
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

      <SubmitButton
        label={tt.sendBtn}
        sendingLabel={tt.sending}
        externallyDisabled={compressing}
        externalLabel={locale === 'fr' ? 'Préparation des photos…' : 'Foto’s voorbereiden…'}
      />
    </form>
  )
}
