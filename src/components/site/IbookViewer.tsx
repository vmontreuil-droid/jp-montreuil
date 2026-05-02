'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'

type Props = {
  pdfUrl: string
  title?: string
  closeLabel?: string
  /** Knop-/link-styling: class wordt aan de trigger button toegekend. */
  className?: string
  /** Inhoud van de trigger (icoon + tekst). */
  children: React.ReactNode
}

/**
 * Trigger + fullscreen modal die het PDF in een iframe toont — bezoekers
 * blijven op de site, geen download-flow.
 */
export default function IbookViewer({
  pdfUrl,
  title,
  closeLabel = 'Fermer',
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) setIframeLoaded(false)
  }, [open])

  // PDF-viewer flags zodat de browser-toolbar (Chrome) zonder download-knop
  // toont. Niet 100% afdwingbaar — gebruikers die echt willen, kunnen via
  // dev-tools de URL halen — maar weert casual download.
  const viewerSrc = `${pdfUrl}#toolbar=0&navpanes=0&statusbar=0`

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

            {/* PDF iframe */}
            <div className="flex-1 relative bg-(--color-canvas)">
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center text-white/70">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
              <iframe
                src={viewerSrc}
                title={title || 'PDF viewer'}
                className="absolute inset-0 w-full h-full"
                onLoad={() => setIframeLoaded(true)}
                // Sandbox zodat de PDF JS niet zomaar naar parent kan praten
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
