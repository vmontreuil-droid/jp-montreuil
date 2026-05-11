/**
 * localStorage-helpers voor de shop. Centraliseert de keys zodat ze op
 * één plek zichtbaar zijn én een versie-suffix kunnen krijgen wanneer
 * het schema breaking-change.
 *
 * Bij een breaking change van de payload-structuur: verhoog de v-suffix
 * (bv. v1 → v2). Oude data blijft onaangeraakt in localStorage maar
 * wordt nooit meer gelezen — de browser ruimt het uiteindelijk zelf op
 * (of `cleanupOldShopKeys()` doet het bij hydration).
 */

export const SHOP_LS_KEYS = {
  // Geen v-suffix op cart — historisch zo, behoud zodat bestaande karren
  // niet wissen. Bij volgende breaking change: 'shop-cart-v2'.
  cart: 'shop-cart',
  wishlist: 'jp-wishlist-v1',
  framedPreview: 'shop:framed-preview:v1',
} as const

/**
 * Best-effort cleanup van oude key-versies. Roep aan bij app-mount in
 * een client-component. Veilig om vaak te draaien — werkt enkel op
 * keys met dezelfde prefix maar oudere versie-suffix.
 */
export function cleanupOldShopKeys() {
  if (typeof window === 'undefined') return
  try {
    const current = new Set<string>(Object.values(SHOP_LS_KEYS))
    const known: Array<{ prefix: string; current: string }> = [
      { prefix: 'shop-cart', current: SHOP_LS_KEYS.cart },
      { prefix: 'jp-wishlist', current: SHOP_LS_KEYS.wishlist },
      { prefix: 'shop:framed-preview', current: SHOP_LS_KEYS.framedPreview },
    ]
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (!k) continue
      const oldVersion = known.find((kv) => k.startsWith(kv.prefix) && k !== kv.current)
      if (oldVersion && !current.has(k)) {
        window.localStorage.removeItem(k)
      }
    }
  } catch {
    // private browsing of full storage — geen probleem
  }
}
