'use client'

import { useEffect, useState, useTransition } from 'react'
import { Mail, X, Send, Check } from 'lucide-react'
import { sendPreviewShare } from '@/app/shop/boutique/photo/[slug]/share-actions'

export type PreviewMailLabels = {
  title: string
  lead: string
  fromName: string
  to: string
  note: string
  send: string
  sending: string
  sent: string
  failed: string
  rateLimited: string
  cancel: string
}

/**
 * Modal voor "Stuur preview per mail". Verzamelt destinataire-mail
 * + optionele afzender-naam + boodschap, en roept sendPreviewShare
 * aan met de huidige photo-slug, de URL (incl. config-params), en
 * een leesbare configuratie-samenvatting.
 */
export function PreviewMailModal({
  open,
  onClose,
  slug,
  configUrl,
  configSummary,
  locale,
  labels,
}: {
  open: boolean
  onClose: () => void
  slug: string
  configUrl: string
  configSummary: string
  locale: 'fr' | 'nl'
  labels: PreviewMailLabels
}) {
  const [pending, startTransition] = useTransition()
  const [fromName, setFromName] = useState('')
  const [toEmail, setToEmail] = useState('')
  const [note, setNote] = useState('')
  const [result, setResult] = useState<
    | null
    | { ok: true }
    | { ok: false; reason: string }
  >(null)

  // Reset state wanneer modal sluit
  useEffect(() => {
    if (!open) {
      setResult(null)
    }
  }, [open])

  // ESC sluit
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!toEmail.trim()) return
    startTransition(async () => {
      const r = await sendPreviewShare({
        slug,
        toEmail: toEmail.trim(),
        fromName: fromName.trim() || null,
        message: note.trim() || null,
        configUrl,
        configSummary,
        locale,
      })
      setResult(r)
      if (r.ok) {
        setTimeout(() => onClose(), 1400)
      }
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-stone-400 hover:text-stone-700"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) mb-1 inline-flex items-center gap-2">
          <Mail className="w-5 h-5 text-(--color-bronze)" />
          {labels.title}
        </h2>
        <p className="text-sm text-(--color-charcoal) mb-5">{labels.lead}</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-stone-500 mb-1 block">
              {labels.fromName}
            </span>
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              maxLength={80}
              autoComplete="given-name"
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-widest text-stone-500 mb-1 block">
              {labels.to} *
            </span>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-widest text-stone-500 mb-1 block">
              {labels.note}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-sm"
            />
          </label>

          <p className="text-[11px] text-stone-500 italic">
            {configSummary}
          </p>

          {result && !result.ok && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              {result.reason === 'rate_limited' ? labels.rateLimited : labels.failed}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !toEmail.trim() || (result?.ok === true)}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 text-sm rounded transition-colors"
          >
            {result?.ok ? (
              <><Check className="w-4 h-4" /> {labels.sent}</>
            ) : pending ? (
              <>{labels.sending}</>
            ) : (
              <><Send className="w-4 h-4" /> {labels.send}</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
