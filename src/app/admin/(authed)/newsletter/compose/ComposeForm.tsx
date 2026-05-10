'use client'

import { useState, useTransition } from 'react'
import { Send, Eye, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { sendNewsletterIssue } from '../actions'

type Props = {
  counts: { fr: number; nl: number; total: number }
}

export default function ComposeForm({ counts }: Props) {
  const [subjectFr, setSubjectFr] = useState('')
  const [subjectNl, setSubjectNl] = useState('')
  const [bodyFr, setBodyFr] = useState('')
  const [bodyNl, setBodyNl] = useState('')
  const [previewLang, setPreviewLang] = useState<'fr' | 'nl'>('fr')
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<
    | null
    | { ok: true; sentFr: number; sentNl: number; errors: number }
    | { ok: false; error: string }
  >(null)

  const isValid =
    subjectFr.trim().length > 0 &&
    subjectNl.trim().length > 0 &&
    bodyFr.trim().length > 0 &&
    bodyNl.trim().length > 0

  function onSend() {
    if (!isValid) return
    if (!confirm(
      `Envoyer cette newsletter à ${counts.total} abonnés (${counts.fr} FR, ${counts.nl} NL) ?`
    )) return
    setResult(null)
    startTransition(async () => {
      const r = await sendNewsletterIssue({
        subject_fr: subjectFr.trim(),
        subject_nl: subjectNl.trim(),
        body_fr: bodyFr,
        body_nl: bodyNl,
      })
      setResult(r)
      if (r.ok) {
        setSubjectFr('')
        setSubjectNl('')
        setBodyFr('')
        setBodyNl('')
      }
    })
  }

  return (
    <div className="space-y-6">
      {result?.ok && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 inline-flex items-start gap-2 w-full">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-emerald-900 font-medium">Newsletter envoyée !</p>
            <p className="text-xs text-emerald-800 mt-1">
              {result.sentFr} FR + {result.sentNl} NL = {result.sentFr + result.sentNl} envois
              {result.errors > 0 && ` · ${result.errors} erreur${result.errors !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      )}
      {result && !result.ok && (
        <div className="bg-amber-50 border border-amber-200 p-4 inline-flex items-start gap-2 w-full">
          <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-900">{result.error}</p>
        </div>
      )}

      <section className="bg-(--color-paper) border border-(--color-frame) p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">Version FR</h2>
        <Field label="Objet (FR) *" value={subjectFr} onChange={setSubjectFr} placeholder="Nouvelles oeuvres ce printemps" />
        <Body label="Contenu (FR) *" value={bodyFr} onChange={setBodyFr} />
      </section>

      <section className="bg-(--color-paper) border border-(--color-frame) p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">Version NL</h2>
        <Field label="Onderwerp (NL) *" value={subjectNl} onChange={setSubjectNl} placeholder="Nieuwe werken dit voorjaar" />
        <Body label="Inhoud (NL) *" value={bodyNl} onChange={setBodyNl} />
      </section>

      {/* Preview */}
      <section className="bg-(--color-paper) border border-(--color-frame) p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) inline-flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            Aperçu
          </h2>
          <div className="flex items-center gap-1">
            {(['fr', 'nl'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setPreviewLang(l)}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-widest border ${
                  previewLang === l
                    ? 'bg-(--color-bronze) text-white border-(--color-bronze)'
                    : 'bg-transparent border-(--color-frame) text-(--color-charcoal)'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-(--color-canvas) border border-(--color-frame)/60 p-5">
          <p className="text-xs text-(--color-stone) mb-1">Objet :</p>
          <p className="font-[family-name:var(--font-display)] text-xl text-(--color-ink) mb-4">
            {(previewLang === 'fr' ? subjectFr : subjectNl) || <em className="text-(--color-stone)/60">— vide —</em>}
          </p>
          <hr className="border-(--color-frame)/60 mb-4" />
          {/* eslint-disable-next-line react/no-danger */}
          <div
            className="prose prose-sm max-w-none text-(--color-charcoal)"
            dangerouslySetInnerHTML={{ __html: previewLang === 'fr' ? bodyFr : bodyNl }}
          />
        </div>
      </section>

      <div className="sticky bottom-2 bg-(--color-paper) border border-(--color-frame) p-3 flex items-center justify-between gap-3 shadow-lg">
        <p className="text-xs text-(--color-stone)">
          Sera envoyée à <strong className="text-(--color-ink)">{counts.total}</strong> abonnés actifs
        </p>
        <button
          type="button"
          onClick={onSend}
          disabled={!isValid || pending}
          className="inline-flex items-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {pending ? 'Envoi en cours…' : 'Envoyer maintenant'}
        </button>
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-(--color-stone) mb-1.5 block">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
      />
    </label>
  )
}

function Body({
  label, value, onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-(--color-stone) mb-1.5 block">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        placeholder={'<p>Bonjour,</p>\n\n<p>Voici les dernières œuvres…</p>'}
        className="w-full px-3 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm font-mono focus:border-(--color-bronze) focus:outline-none resize-y"
      />
    </label>
  )
}
