// Twitter-card image — wrapper rond opengraph-image. Next.js Turbopack
// vereist dat `runtime` en `revalidate` letterlijk in dit bestand staan
// (geen re-export), dus we declareren ze hier opnieuw en delegeren enkel
// de render-functie naar opengraph-image.
import OgImage from './opengraph-image'

export const alt = 'Atelier Montreuil — Jean-Pierre Montreuil'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'
export const revalidate = 3600

export default function TwitterImage() {
  return OgImage()
}
