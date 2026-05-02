'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X, Loader2, AlertCircle } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Worker via CDN — Next/Turbopack vraagt asset-URL en dat is gevoelig voor
// versie-mismatch. Pinning op pdfjs.version voorkomt API-mismatch.
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

type Props = {
  pdfUrl: string
  title?: string
  closeLabel?: string
  className?: string
  children: React.ReactNode
}

export default function IbookViewer({
  pdfUrl,
  title,
  closeLabel = 'Fermer',
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageWidth, setPageWidth] = useState(800)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      else if (e.key === 'ArrowRight') setPage((p) => Math.min(p + 1, numPages || p))
      else if (e.key === 'ArrowLeft') setPage((p) => Math.max(p - 1, 1))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, numPages])

  useEffect(() => {
    if (!open) {
      setPage(1)
      setNumPages(0)
      setError(null)
    }
  }, [open])

  // Width responsive — pagina-breedte is min(container.width - padding, 1200px)
  useEffect(() => {
    if (!open) return
    const calc = () => {
      const w = containerRef.current?.clientWidth ?? window.innerWidth
      setPageWidth(Math.min(w - 32, 1200))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-haspopup="dialog"
      >
        {children}
      </button>

      {mounted && open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-white/10 text-white">
              <p className="text-sm font-[family-name:var(--font-display)] truncate">
                {title || 'PDF'}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={closeLabel}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/20 hover:bg-white/10 text-xs uppercase tracking-[0.15em]"
              >
                <X className="w-3.5 h-3.5" />
                {closeLabel}
              </button>
            </div>

            {/* PDF page */}
            <div
              ref={containerRef}
              className="flex-1 overflow-auto flex items-start justify-center py-6 px-4"
            >
              {error ? (
                <div className="flex flex-col items-center gap-3 text-white/80 mt-20">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-sm">{error}</p>
                </div>
              ) : (
                <Document
                  file={pdfUrl}
                  loading={
                    <div className="flex items-center gap-2 text-white/70 mt-20">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-sm">Chargement…</span>
                    </div>
                  }
                  onLoadSuccess={(d) => setNumPages(d.numPages)}
                  onLoadError={(e) => setError(e.message || 'Impossible de charger le PDF')}
                  // text + annotation layers tonen voor selecteerbaar/clickbaar
                  // — laagjes zijn klein en geven geen download-knop
                >
                  <Page
                    pageNumber={page}
                    width={pageWidth}
                    renderAnnotationLayer
                    renderTextLayer
                    className="shadow-2xl"
                  />
                </Document>
              )}
            </div>

            {/* Bottom controls — vorige / pagina-counter / volgende */}
            {numPages > 0 && !error && (
              <div className="flex items-center justify-center gap-3 py-4 border-t border-white/10 text-white">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  aria-label="Précédent"
                  className="inline-flex items-center justify-center w-10 h-10 border border-white/20 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs uppercase tracking-[0.2em] opacity-80 min-w-[60px] text-center">
                  {page} / {numPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, numPages))}
                  disabled={page >= numPages}
                  aria-label="Suivant"
                  className="inline-flex items-center justify-center w-10 h-10 border border-white/20 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  )
}
