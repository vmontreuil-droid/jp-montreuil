'use client'

import { pdfjs } from 'react-pdf'

if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

/**
 * Render eerste pagina van een PDF naar een JPEG-File. Gebruikt pdfjs
 * (al gebundeld via react-pdf) zodat we geen extra afhankelijkheid nodig
 * hebben. Schaalt op zodat resultaat ~1600px breed is — scherp genoeg
 * als card-cover en compact genoeg om snel te uploaden.
 */
export async function extractPdfFirstPageAsJpeg(
  pdfFile: File,
  filename = 'cover.jpg'
): Promise<File | null> {
  try {
    const data = await pdfFile.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data }).promise
    const page = await pdf.getPage(1)

    const baseViewport = page.getViewport({ scale: 1 })
    const targetWidth = 1600
    const scale = Math.min(3, targetWidth / baseViewport.width)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({ canvasContext: ctx, viewport, canvas }).promise

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85)
    )
    if (!blob) return null

    return new File([blob], filename, { type: 'image/jpeg' })
  } catch {
    return null
  }
}
