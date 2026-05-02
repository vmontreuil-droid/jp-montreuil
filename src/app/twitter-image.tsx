import { ImageResponse } from 'next/og'
import { OgImageContent } from './og-image-content'

export const alt = 'Atelier Montreuil — Jean-Pierre Montreuil'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export const runtime = 'edge'

export default function Image() {
  return new ImageResponse(<OgImageContent />, size)
}
