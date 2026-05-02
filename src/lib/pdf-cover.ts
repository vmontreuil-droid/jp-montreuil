'use client'

import { pdfjs } from 'react-pdf'

if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

/**
 * Render eerste pagina van een PDF naar een JPEG-File via pdfjs (al
 * gebundeld via react-pdf). Throws bij elke fout zodat de caller een
 * concrete error-message kan tonen — eerder logden we silent return,
 * waardoor cover-extractie ongemerkt faalde.
 */
export async function extractPdfFirstPageAsJpeg(
  pdfFile: File,
  filename = 'cover.jpg'
): Promise<File> {
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
  if (!ctx) throw new Error('Canvas context indisponible')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  await page.render({ canvasContext: ctx, viewport }).promise

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85)
  )
  if (!blob) throw new Error('Conversion canvas → JPEG échouée')

  return new File([blob], filename, { type: 'image/jpeg' })
}
