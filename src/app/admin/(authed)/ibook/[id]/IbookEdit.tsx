'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save,
  Upload,
  X,
  Check,
  Loader2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Trash2,
  Eye,
  EyeOff,
  QrCode,
  Download,
} from 'lucide-react'
import TranslateButton from '@/components/admin/TranslateButton'
import IbookViewer from '@/components/site/IbookViewer'
import {
  uploadIbookFile,
  clearIbookFile,
  updateIbook,
  deleteIbook,
  toggleIbookActive,
} from '../actions'

type Slot = 'cover' | 'pdf'

type Props = {
  ibook: {
    id: string
    title_fr: string
    title_nl: string
    description_fr: string
    description_nl: string
    is_active: boolean
    coverUrl: string
    pdfUrl: string
    qrDataUrl: string
  }
}

export default function IbookEdit({ ibook }: Props) {
  const router = useRouter()

  const [titleFr, setTitleFr] = useState(ibook.title_fr)
  const [titleNl, setTitleNl] = useState(ibook.title_nl)
  const [descFr, setDescFr] = useState(ibook.description_fr)
  const [descNl, setDescNl] = useState(ibook.description_nl)
  const [active, setActive] = useState(ibook.is_active)
  const [savePending, startSave] = useTransition()
  const [deletePending, startDelete] = useTransition()
  const [saveOk, setSaveOk] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  function toggleActive() {
    const next = !active
    setActive(next)
    void toggleIbookActive(ibook.id, next)
  }

  function onSaveText(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaveErr(null)
    setSaveOk(false)
    const fd = new FormData()
    fd.set('id', ibook.id)
    fd.set('title_fr', titleFr)
    fd.set('title_nl', titleNl)
    fd.set('description_fr', descFr)
    fd.set('description_nl', descNl)
    fd.set('is_active', active ? 'true' : 'false')
    startSave(() => {
      void (async () => {
        const r = await updateIbook(fd)
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
    if (!confirm(`Supprimer cet ibook (${ibook.title_fr || ibook.title_nl}) et ses fichiers ?`))
      return
    startDelete(() => {
      void deleteIbook(ibook.id)
    })
  }

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1">Ibook</p>
          <h1 className="text-3xl text-(--color-ink) font-[family-name:var(--font-display)] leading-tight">
            {ibook.title_fr || ibook.title_nl || 'Sans titre'}
          </h1>
        </div>
        <button
          type="button"
          onClick={toggleActive}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
            active
              ? 'border-(--color-bronze) text-(--color-bronze)'
              : 'border-(--color-frame) text-(--color-stone) hover:text-(--color-charcoal)'
          }`}
        >
          {active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {active ? 'Visible' : 'Caché'}
        </button>
      </header>

      {/* Bestanden */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
          Fichiers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SlotCard
            ibookId={ibook.id}
            slot="cover"
            label="Photo de couverture"
            help="JPG/PNG/WEBP, max 10MB"
            url={ibook.coverUrl}
            icon={<ImageIcon className="w-4 h-4" />}
            accept="image/jpeg,image/png,image/webp"
            onChanged={() => router.refresh()}
          />
          <SlotCard
            ibookId={ibook.id}
            slot="pdf"
            label="Document PDF"
            help="PDF, max 50MB"
            url={ibook.pdfUrl}
            icon={<FileText className="w-4 h-4" />}
            accept="application/pdf"
            onChanged={() => router.refresh()}
          />
          <QrCard ibookId={ibook.id} qrDataUrl={ibook.qrDataUrl} />
        </div>
      </section>

      {/* Tekst */}
      <form onSubmit={onSaveText} className="space-y-5">
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
              className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">
                Description FR <span className="text-(--color-stone)/60">(optionnel)</span>
              </label>
              <TranslateButton
                getSource={() => descNl}
                from="nl"
                to="fr"
                onTranslated={setDescFr}
              />
            </div>
            <textarea
              value={descFr}
              onChange={(e) => setDescFr(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">
                Beschrijving NL <span className="text-(--color-stone)/60">(optioneel)</span>
              </label>
              <TranslateButton
                getSource={() => descFr}
                from="fr"
                to="nl"
                onTranslated={setDescNl}
              />
            </div>
            <textarea
              value={descNl}
              onChange={(e) => setDescNl(e.target.value)}
              rows={3}
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

// ============================================================================
// SlotCard
// ============================================================================

type SlotCardProps = {
  ibookId: string
  slot: Slot
  label: string
  help: string
  url: string
  icon: React.ReactNode
  accept: string
  onChanged: () => void
}

function SlotCard({
  ibookId,
  slot,
  label,
  help,
  url,
  icon,
  accept,
  onChanged,
}: SlotCardProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function upload(file: File) {
    setError(null)
    const fd = new FormData()
    fd.set('ibook_id', ibookId)
    fd.set('slot', slot)
    fd.set('file', file)
    startTransition(() => {
      void (async () => {
        const r = await uploadIbookFile(fd)
        if (r.ok) {
          onChanged()
        } else {
          const map: Record<string, string> = {
            no_file: 'Pas de fichier',
            type_not_allowed: 'Type non autorisé',
            too_large: 'Fichier trop volumineux',
            invalid_slot: 'Slot invalide',
          }
          setError(map[r.error] ?? r.error)
        }
      })()
    })
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) upload(f)
  }

  function onClear() {
    if (!confirm('Supprimer ce fichier ?')) return
    startTransition(() => {
      void (async () => {
        await clearIbookFile(ibookId, slot)
        onChanged()
      })()
    })
  }

  return (
    <div className="bg-(--color-paper) border border-(--color-frame) p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-(--color-charcoal) inline-flex items-center gap-2">
          {icon}
          {label}
        </p>
        {url && (
          <button
            type="button"
            onClick={onClear}
            disabled={pending}
            aria-label="Supprimer"
            className="p-1 text-(--color-stone) hover:text-red-300 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="relative aspect-square bg-(--color-canvas) border border-(--color-frame) overflow-hidden flex items-center justify-center">
        {pending ? (
          <Loader2 className="w-6 h-6 animate-spin text-(--color-bronze)" />
        ) : url ? (
          slot === 'pdf' ? (
            <IbookViewer
              pdfUrl={url}
              title={label}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-(--color-bronze) hover:text-(--color-bronze-dark) transition-colors"
            >
              <FileText className="w-12 h-12" strokeWidth={1.5} />
              <span className="text-xs uppercase tracking-[0.15em]">Aperçu</span>
            </IbookViewer>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={label}
              className="absolute inset-0 w-full h-full object-contain p-2"
            />
          )
        ) : (
          <div className="text-(--color-stone) opacity-50 text-xs uppercase tracking-[0.2em]">
            Vide
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
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={`flex flex-col items-center gap-1 border border-dashed transition-colors cursor-pointer p-3 text-center text-xs ${
          dragOver
            ? 'border-(--color-bronze) bg-(--color-bronze)/10 text-(--color-bronze)'
            : 'border-(--color-frame) hover:border-(--color-stone) text-(--color-stone) hover:text-(--color-charcoal)'
        }`}
      >
        <Upload className="w-4 h-4" />
        <span>{url ? 'Remplacer' : 'Téléverser'}</span>
        <span className="text-[10px] opacity-70">{help}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) upload(f)
          e.target.value = ''
        }}
        className="hidden"
      />

      {error && (
        <p className="inline-flex items-center gap-1 text-[11px] text-red-300">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// QrCard — read-only display van auto-gegenereerd QR + download-knop
// ============================================================================

function QrCard({ ibookId, qrDataUrl }: { ibookId: string; qrDataUrl: string }) {
  return (
    <div className="bg-(--color-paper) border border-(--color-frame) p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-(--color-charcoal) inline-flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          Code QR
        </p>
      </div>

      <div className="relative aspect-square bg-(--color-canvas) border border-(--color-frame) overflow-hidden flex items-center justify-center">
        {qrDataUrl ? (
          <div className="bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR-code" className="block w-full h-auto" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-(--color-stone) text-xs px-4 text-center">
            <QrCode className="w-8 h-8 opacity-40" />
            <span>Téléverse d&apos;abord un PDF</span>
          </div>
        )}
      </div>

      {qrDataUrl ? (
        <a
          href={qrDataUrl}
          download={`qr-ibook-${ibookId}.png`}
          className="flex flex-col items-center gap-1 border border-dashed border-(--color-frame) hover:border-(--color-bronze) text-(--color-stone) hover:text-(--color-bronze) transition-colors p-3 text-center text-xs"
        >
          <Download className="w-4 h-4" />
          <span>Télécharger</span>
          <span className="text-[10px] opacity-70">PNG, généré auto</span>
        </a>
      ) : (
        <div className="flex flex-col items-center gap-1 border border-dashed border-(--color-frame) p-3 text-center text-xs text-(--color-stone) opacity-50">
          <Download className="w-4 h-4" />
          <span>Télécharger</span>
        </div>
      )}
    </div>
  )
}
