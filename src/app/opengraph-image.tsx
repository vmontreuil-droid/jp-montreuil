import { ImageResponse } from 'next/og'
import { OgImageContent } from './og-image-content'

export const alt = 'Atelier Montreuil — Jean-Pierre Montreuil'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export const runtime = 'edge'

/**
 * Standaard Open Graph image (1200×630) — wordt automatisch gebruikt voor
 * alle pagina's onder de root segment, tenzij de pagina zelf een eigen
 * image zet via openGraph.images in generateMetadata.
 */
export default function Image() {
  return new ImageResponse(<OgImageContent />, size)
}
