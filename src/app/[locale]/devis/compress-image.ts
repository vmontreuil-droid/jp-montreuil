/**
 * Client-side foto-compressie vóór upload — kritiek voor iPhone
 * waar HEIC-foto's vlot 8-10 MB per stuk wegen. Zonder compressie:
 * 5 foto's × 8 MB = 40 MB upload, met traag mobiel netwerk → Vercel
 * function timeout → witte/zwarte error pagina.
 *
 * Strategie:
 *   1. Bitmap decoden via createImageBitmap (iOS 17+ kan HEIC native)
 *      → fallback via <img>.decode() voor oudere browsers
 *   2. Schalen tot max 1800 px lange zijde
 *   3. Re-encode naar JPEG q=0.85 via canvas.toBlob
 *
 * Resultaat: 8 MB HEIC → ~600 KB JPEG, browser-onafhankelijke MIME.
 */

const MAX_LONG_EDGE = 1800
const JPEG_QUALITY = 0.85
const SKIP_IF_SMALLER_THAN = 700 * 1024 // < 700 KB → al klein genoeg

async function decodeFile(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }> {
  // Probeer eerst createImageBitmap — sneller en behandelt EXIF-rotatie
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      }
    } catch {
      // valt door naar img-fallback
    }
  }

  // Fallback: HTMLImageElement (werkt op alle browsers, geen HEIC op
  // pre-iOS17 Safari maar dan toont Safari überhaupt geen HEIC dus dan
  // geven we het bestand ongecomprimeerd door)
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function compressImage(file: File): Promise<File> {
  // Te klein → niet hercomprimeren (vermijdt kwaliteitsverlies bij thumbnails)
  if (file.size < SKIP_IF_SMALLER_THAN) return file

  // PNG bewust ongemoeid laten — vaak transparante illustraties; en
  // jpeg-conversie van een transparente png maakt zwarte achtergrond.
  if (file.type === 'image/png') return file

  try {
    const decoded = await decodeFile(file)
    const { width, height } = decoded
    const longest = Math.max(width, height)
    const scale = longest > MAX_LONG_EDGE ? MAX_LONG_EDGE / longest : 1
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    decoded.draw(ctx, targetW, targetH)

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob) return file

    // Geen voordeel als het resultaat groter zou zijn dan het origineel
    if (blob.size >= file.size) return file

    const baseName = file.name.replace(/\.(heic|heif|jpg|jpeg|webp|png)$/i, '')
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    // Bij eender welke fout → origineel doorlaten zodat de upload niet
    // permanent geblokkeerd raakt
    return file
  }
}
