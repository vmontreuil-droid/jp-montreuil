import { Heart } from 'lucide-react'
import { listShopPhotos } from '@/lib/shop/photos'
import FavorisGrid from './FavorisGrid'

export const dynamic = 'force-dynamic'

/**
 * /shop/favoris — privacy-first wishlist. Server fetcht alle gepubliceerde
 * foto's, client filtert obv localStorage-ids zodat we geen wishlist
 * server-side hoeven te bewaren. Maakt het ook bruikbaar zonder login.
 */
export default async function FavorisPage() {
  const photos = await listShopPhotos({ publishedOnly: true })

  return (
    <div className="bg-(--color-canvas)">
      <section className="border-b border-(--color-frame) bg-(--color-paper)/40">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <p className="text-xs uppercase tracking-[0.3em] text-(--color-bronze) mb-3 inline-flex items-center gap-2">
            <Heart className="w-3.5 h-3.5" />
            Mes favoris
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl text-(--color-ink) leading-tight mb-3">
            Vos œuvres préférées
          </h1>
          <p className="text-(--color-charcoal) text-sm md:text-base max-w-xl">
            Cliquez sur une photo pour la personnaliser, ou sur le ♡ pour la retirer.
            Vos favoris sont stockés sur cet appareil — aucun compte requis.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-10">
        <FavorisGrid photos={photos.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          alt: p.alt_text ?? p.title ?? p.slug,
          storage_path: p.storage_path,
        }))} />
      </section>
    </div>
  )
}
