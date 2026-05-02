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
  /** Wanneer URL-hash gelijk is aan `#livre-<autoOpenForId>` opent de
   *  viewer automatisch op page-load. Gebruikt voor QR-deeplinks. */
  autoOpenForId?: string
}

export default function IbookViewer({
  pdfUrl,
  title,
  closeLabel = 'Fermer',
  className,
  children,
  autoOpenForId,
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

  // Deeplink via URL-hash: /social#livre-<id> opent automatisch de viewer.
  useEffect(() => {
    if (!autoOpenForId || typeof window === 'undefined') return
    const target = `#livre-${autoOpenForId}`
    const check = () => {
      if (window.location.hash === target) setOpen(true)
    }
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [autoOpenForId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      else if (e.key === 'ArrowRight') setPage((p) => Math.min(p + 1, numPages || p))
      else if (e.key === 'ArrowLeft') setPage((p) => Math.max(p - 1, 1))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
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
            {/* Floating Fermer-knop — altijd boven het PDF zichtbaar */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="fixed top-4 right-4 md:top-6 md:right-6 z-[60] inline-flex items-center gap-2 px-4 py-2.5 bg-black/70 hover:bg-(--color-bronze) backdrop-blur-md border border-white/20 text-white text-xs uppercase tracking-[0.15em] shadow-lg transition-colors"
            >
              <X className="w-4 h-4" />
              {closeLabel}
            </button>

            {/* Floating titel top-left (optioneel) */}
            {title && (
              <p className="fixed top-4 left-4 md:top-6 md:left-6 z-[60] max-w-[60%] truncate px-3 py-1.5 bg-black/50 backdrop-blur-md border border-white/15 text-white/90 text-sm font-[family-name:var(--font-display)]">
                {title}
              </p>
            )}

            {/* PDF page — gehele zone klikbaar voor pagina-navigatie:
                linker helft = vorige, rechter helft = volgende */}
            <div
              ref={containerRef}
              className="flex-1 overflow-auto flex items-start justify-center py-6 px-4 relative"
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
                >
                  <Page
                    pageNumber={page}
                    width={pageWidth}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    className="shadow-2xl"
                  />
                </Document>
              )}
            </div>

            {/* Side-tap regions — voor mobile vooral handig (volledige hoogte
                aan beide kanten, achter de floating controls liggend) */}
            {numPages > 0 && !error && (
              <>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  aria-label="Précédent"
                  className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-[55] w-14 h-24 items-center justify-center bg-black/40 hover:bg-(--color-bronze) backdrop-blur-md border border-white/20 border-l-0 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, numPages))}
                  disabled={page >= numPages}
                  aria-label="Suivant"
                  className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-[55] w-14 h-24 items-center justify-center bg-black/40 hover:bg-(--color-bronze) backdrop-blur-md border border-white/20 border-r-0 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </>
            )}

            {/* Floating bottom controls — altijd zichtbaar centraal onderaan,
                ook op mobile waar side-tap niet getoond wordt */}
            {numPages > 0 && !error && (
              <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-2 px-3 py-2 bg-black/70 backdrop-blur-md border border-white/20 text-white shadow-lg">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  aria-label="Précédent"
                  className="inline-flex items-center justify-center w-10 h-10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs uppercase tracking-[0.2em] opacity-90 min-w-[70px] text-center font-mono">
                  {page} / {numPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, numPages))}
                  disabled={page >= numPages}
                  aria-label="Suivant"
                  className="inline-flex items-center justify-center w-10 h-10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
