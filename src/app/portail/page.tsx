import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Camera, ArrowRight, Calendar, ImageIcon, Brush, CheckCircle2, Clock,
  ShoppingBag, Lock, Receipt,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDictionary } from '@/i18n/dictionaries'
import { getPortailLocale } from './locale'
import { localePath } from '@/lib/links'
import { listMyShopOrders } from '@/lib/shop/customer-portal'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'

const SIGNED_URL_TTL = 60 * 60

type AlbumRow = {
  id: string
  slug: string
  title: string
  client_name: string | null
  event_date: string | null
  is_active: boolean
  created_at: string
  cover_storage: string | null
  photos_count: number
}

export default async function PortailDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/portail/login')
  }

  const locale = await getPortailLocale()
  const t = getDictionary(locale).portail
  const dateLocale = locale === 'fr' ? 'fr-BE' : 'nl-BE'

  // Service-role om client-data op te halen — RLS bypass nodig omdat
  // we matchen op email-veld dat anders niet door RLS gefilterd wordt.
  const admin = createAdminClient()
  const { data: albumsRaw } = await admin
    .from('event_albums')
    .select(
      `id, slug, title, client_name, event_date, is_active, created_at,
       photos:event_photos(id, storage_path, sort_order)`
    )
    .ilike('client_email', user.email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const albums: AlbumRow[] = (albumsRaw ?? []).map((a) => {
    const photos = (a.photos ?? []) as { id: string; storage_path: string; sort_order: number }[]
    photos.sort((x, y) => x.sort_order - y.sort_order)
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      client_name: a.client_name,
      event_date: a.event_date,
      is_active: a.is_active,
      created_at: a.created_at,
      cover_storage: photos[0]?.storage_path ?? null,
      photos_count: photos.length,
    }
  })

  // Cover signed URLs (one per album)
  const coverUrls = new Map<string, string>()
  for (const a of albums) {
    if (!a.cover_storage) continue
    const { data: signed } = await admin.storage
      .from('events')
      .createSignedUrl(a.cover_storage, SIGNED_URL_TTL)
    if (signed?.signedUrl) coverUrls.set(a.id, signed.signedUrl)
  }

  // Commissions matched op email
  const { data: commissionsRaw } = await admin
    .from('commission_requests')
    .select(
      'id, devis_subject, technique, width_cm, height_cm, status, signature_token, signed_at, devis_total_eur, devis_acompte_eur, created_at'
    )
    .ilike('email', user.email)
    .order('created_at', { ascending: false })

  type CommissionEntry = {
    id: string
    devis_subject: string | null
    technique: string
    width_cm: number | null
    height_cm: number | null
    status: keyof typeof getDictionary extends never ? string : string
    signature_token: string | null
    signed_at: string | null
    devis_total_eur: number | null
    devis_acompte_eur: number | null
    created_at: string
  }
  const commissions = (commissionsRaw ?? []) as CommissionEntry[]
  const tDevis = getDictionary(locale).devis
  const statusLabels = tDevis.statusLabels as Record<string, string>

  // Shop-orders (publieke webshop). Zit in shop-schema, dus eigen helper.
  const shopOrders = await listMyShopOrders(user.email).catch(() => [])
  const tShop = t.shopOrders
  const fmtEur = new Intl.NumberFormat(dateLocale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {t.dashboard.eyebrow}
        </p>
        <h1 className="text-3xl md:text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          {t.dashboard.welcome}
        </h1>
        <p className="mt-2 text-sm text-(--color-charcoal)">{t.dashboard.lead}</p>
      </header>

      {/* Commissions section */}
      {commissions.length > 0 && (
        <section className="mb-12">
          <div className="mb-4">
            <h2 className="text-2xl text-(--color-ink) font-[family-name:var(--font-display)] inline-flex items-center gap-2">
              <Brush className="w-5 h-5 text-(--color-bronze)" />
              {t.commissions.sectionTitle}
            </h2>
            <p className="mt-1 text-sm text-(--color-charcoal)">{t.commissions.sectionLead}</p>
          </div>

          <ul className="space-y-3">
            {commissions.map((c) => {
              const title =
                c.devis_subject ||
                (locale === 'fr'
                  ? `Demande du ${new Date(c.created_at).toLocaleDateString(dateLocale, { dateStyle: 'long' })}`
                  : `Aanvraag van ${new Date(c.created_at).toLocaleDateString(dateLocale, { dateStyle: 'long' })}`)
              const statusLabel = statusLabels[c.status] || c.status
              // Voor klanten met een account → ga naar de detail-pagina in
              // het portaal. Voor anonymous of net aangemaakte commissies
              // zonder devis → fallback naar de signature-pagina via token.
              const linkHref = `/portail/devis/${c.id}`
              const ctaLabel = c.signed_at ? t.commissions.viewStatus : t.commissions.viewDevis
              const StatusIcon = c.signed_at ? CheckCircle2 : Clock

              const card = (
                <div className="block bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) p-5 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg text-(--color-ink) font-[family-name:var(--font-display)] mb-1">
                        {title}
                      </h3>
                      <p className="text-xs text-(--color-stone)">
                        {t.commissions.askedFor}{' '}
                        {new Date(c.created_at).toLocaleDateString(dateLocale, { dateStyle: 'long' })}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] border border-(--color-bronze)/40 bg-(--color-bronze)/10 text-(--color-ink) whitespace-nowrap shrink-0">
                      <StatusIcon className="w-3 h-3 text-(--color-bronze)" />
                      {statusLabel}
                    </span>
                  </div>
                  {linkHref && (
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-(--color-bronze) group-hover:gap-2 transition-all">
                      {ctaLabel}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              )
              return (
                <li key={c.id}>
                  {linkHref ? (
                    <Link href={linkHref} className="block group">
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Shop-orders section */}
      {shopOrders.length > 0 && (
        <section className="mb-12">
          <div className="mb-4">
            <h2 className="text-2xl text-(--color-ink) font-[family-name:var(--font-display)] inline-flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-(--color-bronze)" />
              {tShop.sectionTitle}
            </h2>
            <p className="mt-1 text-sm text-(--color-charcoal)">{tShop.sectionLead}</p>
          </div>

          <ul className="space-y-3">
            {shopOrders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/portail/commandes/${o.reference}`}
                  className="block group bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) p-5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-(--color-ink) text-base">{o.reference}</p>
                      <p className="text-xs text-(--color-stone) mt-1">
                        {tShop.orderedOn}{' '}
                        {new Date(o.created_at).toLocaleDateString(dateLocale, { dateStyle: 'long' })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] whitespace-nowrap ${ORDER_STATUS_COLORS[o.status]}`}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </span>
                      <span className="text-sm font-medium tabular-nums text-(--color-ink)">
                        {fmtEur.format(o.amount_cents / 100)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-(--color-bronze) group-hover:gap-2 transition-all">
                      {o.status === 'pending' && o.mollie_checkout_url ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          {tShop.payNow}
                        </>
                      ) : o.status === 'paid' || o.status === 'shipped' || o.status === 'fulfilled' ? (
                        <>
                          <Receipt className="w-3.5 h-3.5" />
                          {tShop.viewInvoice}
                        </>
                      ) : (
                        <>
                          {tShop.viewDetail}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {albums.length === 0 && commissions.length === 0 && shopOrders.length === 0 ? (
        <div className="bg-(--color-paper) border border-(--color-frame) p-10 text-center">
          <Camera className="w-10 h-10 mx-auto mb-4 text-(--color-stone) opacity-50" />
          <p className="text-sm text-(--color-charcoal)">{t.dashboard.empty}</p>
          <p className="mt-2 text-xs text-(--color-stone)">{t.dashboard.emptyHint}</p>
        </div>
      ) : albums.length === 0 ? null : (
        <section id="albums" className="scroll-mt-24">
          <div className="mb-4">
            <h2 className="text-2xl text-(--color-ink) font-[family-name:var(--font-display)] inline-flex items-center gap-2">
              <Camera className="w-5 h-5 text-(--color-bronze)" />
              {t.albumsSectionTitle}
            </h2>
            <p className="mt-1 text-sm text-(--color-charcoal)">{t.albumsSectionLead}</p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {albums.map((a) => (
            <li key={a.id}>
              <Link
                href={`/portail/album/${a.slug}`}
                className="card-elev card-elev-lift block bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) overflow-hidden group"
              >
                <div className="relative aspect-[4/3] bg-(--color-canvas)">
                  {coverUrls.get(a.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrls.get(a.id)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-(--color-stone)">
                      <Camera className="w-10 h-10 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-xl text-(--color-ink) font-[family-name:var(--font-display)] leading-tight mb-2 group-hover:text-(--color-bronze) transition-colors">
                    {a.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--color-stone)">
                    {a.event_date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(a.event_date).toLocaleDateString(dateLocale, {
                          dateStyle: 'long',
                        })}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {a.photos_count}{' '}
                      {a.photos_count === 1 ? t.dashboard.photoSingular : t.dashboard.photoPlural}
                    </span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-(--color-bronze) group-hover:gap-2 transition-all">
                    {t.dashboard.seeAlbum}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
          </ul>
        </section>
      )}
    </div>
  )
}
