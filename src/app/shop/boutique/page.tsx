import Link from 'next/link'
import { Calendar, ShoppingBag } from 'lucide-react'
import { listShopPhotos, shopPhotoUrl, photoAlt } from '@/lib/shop/photos'
import { listShopProducts, formatPrice } from '@/lib/shop/products'
import {
  listActiveMedia,
  listActiveSizes,
  listAvailablePrices,
  mediumName,
} from '@/lib/shop/print-shop'

type SearchParams = Promise<{ tab?: string }>

/**
 * /shop/boutique — publieke landing met 2 tabs:
 *   [Personnaliser une photo]  ← klikt naar /shop/boutique/photo/[slug]
 *   [Calendriers]              ← klassieke kalender-producten
 *
 * Klant klikt foto/product → detail-pagina met configurator/variant-picker.
 */
export default async function ShopBoutiquePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const tab = sp.tab === 'calendars' ? 'calendars' : 'photos'

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <header className="mb-8">
        <p className="text-stone-500 text-xs tracking-[0.3em] uppercase mb-2">Boutique</p>
        <h1 className="text-4xl md:text-5xl mb-2 font-semibold">Boutique en ligne</h1>
        <p className="text-stone-600 text-sm">
          Choisissez une photo et personnalisez son tirage, ou découvrez les calendriers de l&apos;atelier.
        </p>
      </header>

      <nav className="flex gap-2 mb-10 border-b border-stone-200">
        <TabLink href="/shop/boutique" active={tab === 'photos'}>
          <ShoppingBag size={14} className="inline -mt-0.5 mr-1" />
          Personnaliser une photo
        </TabLink>
        <TabLink href="/shop/boutique?tab=calendars" active={tab === 'calendars'}>
          <Calendar size={14} className="inline -mt-0.5 mr-1" />
          Calendriers
        </TabLink>
      </nav>

      {tab === 'photos' ? <PhotosTab /> : <CalendarsTab />}
    </main>
  )
}

async function PhotosTab() {
  const [photos, media, sizes, prices] = await Promise.all([
    listShopPhotos({ publishedOnly: true }),
    listActiveMedia(),
    listActiveSizes(),
    listAvailablePrices(),
  ])

  const minCents = prices.length > 0 ? Math.min(...prices.map((p) => p.price_cents)) : null
  const cheapestMedium = (() => {
    if (!minCents || media.length === 0) return null
    const cell = prices.find((p) => p.price_cents === minCents)
    if (!cell) return null
    return media.find((m) => m.id === cell.media_id) ?? null
  })()

  if (photos.length === 0) {
    return (
      <p className="py-16 text-center text-stone-500">
        Pas encore de photos. Ajoutez-en via{' '}
        <Link href="/shop/admin/photos" className="underline hover:text-stone-900">
          /shop/admin/photos
        </Link>
        .
      </p>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 text-sm text-stone-700">
        <p>{photos.length} photo{photos.length === 1 ? '' : 's'} disponible{photos.length === 1 ? '' : 's'}</p>
        {minCents && cheapestMedium && (
          <p className="text-xs text-stone-500">
            À partir de <strong className="text-stone-900">{formatPrice(minCents)}</strong>
            {' '}({mediumName(cheapestMedium, 'fr')}, {sizes[0]?.label})
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((p) => (
          <Link
            key={p.id}
            href={`/shop/boutique/photo/${p.slug}`}
            className="block group"
          >
            <div className="aspect-square bg-stone-100 border border-stone-200 rounded overflow-hidden mb-2 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shopPhotoUrl(p.storage_path)}
                alt={photoAlt(p)}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 px-2 py-2 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white text-xs truncate">{p.title ?? p.slug}</p>
                <p className="text-white/70 text-[10px] tracking-wider uppercase">Personnaliser</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}

async function CalendarsTab() {
  const products = await listShopProducts({ publishedOnly: true, kind: 'calendar' })

  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-stone-500">
        Pas encore de calendriers. Créez-en via{' '}
        <Link href="/shop/admin/products/nieuw" className="underline hover:text-stone-900">
          /shop/admin/products
        </Link>
        .
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {products.map((p) => (
        <Link
          key={p.id}
          href={`/shop/boutique/${p.slug}`}
          className="block group"
        >
          <div className="aspect-[4/5] bg-stone-100 border border-stone-200 rounded overflow-hidden mb-3" />
          <p className="font-medium">{p.title_fr}</p>
          {p.price_cents != null && (
            <p className="text-sm text-stone-500">{formatPrice(p.price_cents)}</p>
          )}
        </Link>
      ))}
    </div>
  )
}

function TabLink({
  href, active, children,
}: {
  href: string; active: boolean; children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm transition-colors -mb-px ${
        active
          ? 'text-stone-900 border-b-2 border-stone-900 font-medium'
          : 'text-stone-500 hover:text-stone-900'
      }`}
    >
      {children}
    </Link>
  )
}
