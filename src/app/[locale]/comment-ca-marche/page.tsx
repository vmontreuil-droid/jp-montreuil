import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  Camera,
  Layers,
  Ruler,
  Eye,
  ShoppingBag,
  Truck,
  Image as ImageIcon,
  Frame,
  Sparkles,
  Wrench,
  ShieldCheck,
  Leaf,
  Award,
  Mail,
  HelpCircle,
  Check,
  Home,
  Bed,
  Briefcase,
  DoorOpen,
  Sun,
  Moon,
  Sofa,
  Square as SquareIcon,
  Download,
  Share2,
  Maximize2,
  Box as BoxIcon,
  Tag,
  Star,
  MoveHorizontal,
  GitCompare,
  Save,
} from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { localePath } from '@/lib/links'
import { pageMetadata } from '@/lib/og'

/**
 * /comment-ca-marche — uitgebreide info-pagina voor bezoekers over hoe de
 * webshop / configurator werkt. Volledig in 2 talen via een inline
 * content map (geen global dict-pollutie). Niet uit de DB — pure
 * marketing-tekst, ge-port van allardphilippe en aangepast naar
 * Jean-Pierre Montreuil's atelier.
 *
 * Layout (krak hetzelfde als allardphilippe):
 *   1. Hero met intro
 *   2. 4-stappen overzicht
 *   3. Materialen-deep-dive (papier / canvas / alu / plexi)
 *   4. Maten-gids met visuele schaalvergelijking
 *   5. Kwaliteit & duurzaamheid
 *   6. Verzending & retour
 *   7. FAQ accordeon (HTML <details>)
 *   8. CTA naar /shop/boutique
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: localeParam } = await params
  if (!isLocale(localeParam)) return {}
  const c = content[localeParam as Locale]
  return pageMetadata({
    locale: localeParam as Locale,
    title: c.hero.title,
    description: c.hero.subtitle,
  })
}

export default async function CommentCaMarchePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: localeParam } = await params
  if (!isLocale(localeParam)) notFound()
  const locale = localeParam as Locale
  const c = content[locale]

  return (
    <main className="bg-(--color-canvas)">
      {/* 1 — Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-12 md:pt-20 pb-12">
        <p className="text-(--color-stone) text-xs tracking-[0.3em] uppercase mb-3 inline-flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-(--color-bronze)" /> {c.hero.eyebrow}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-6xl text-(--color-ink) mb-4 leading-[1.05]">
          {c.hero.title}
        </h1>
        <p className="text-lg text-(--color-charcoal) max-w-2xl leading-relaxed">
          {c.hero.subtitle}
        </p>
      </section>

      {/* 2 — Steps */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2">
          {c.steps.title}
        </h2>
        <p className="text-(--color-charcoal) mb-10 max-w-xl">{c.steps.subtitle}</p>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {c.steps.items.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Camera
            return (
              <li
                key={i}
                className="bg-(--color-paper) border border-(--color-frame) p-6 relative overflow-hidden"
              >
                <span className="absolute top-3 right-4 font-[family-name:var(--font-display)] text-6xl text-(--color-frame) select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Icon className="w-5 h-5 text-(--color-bronze) mb-4" />
                <h3 className="font-[family-name:var(--font-display)] text-xl text-(--color-ink) mb-2">{step.title}</h3>
                <p className="text-sm text-(--color-charcoal) leading-relaxed">{step.body}</p>
              </li>
            )
          })}
        </ol>
      </section>

      {/* 3 — Materialen */}
      <section className="bg-(--color-paper) border-y border-(--color-frame)">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2">
            {c.materials.title}
          </h2>
          <p className="text-(--color-charcoal) mb-10 max-w-xl">{c.materials.subtitle}</p>

          <div className="grid md:grid-cols-2 gap-5">
            {c.materials.items.map((m) => {
              const Icon = MATERIAL_ICONS[m.slug] ?? Frame
              return (
                <article
                  key={m.slug}
                  className="bg-(--color-canvas) border border-(--color-frame) p-6 flex gap-5"
                >
                  {/* Material-mockup tegel — kleurcode per medium */}
                  <div
                    aria-hidden
                    className="shrink-0 w-20 h-24 rounded-sm flex items-center justify-center"
                    style={{
                      backgroundColor: MATERIAL_COLORS[m.slug] ?? '#1a1815',
                      boxShadow: '0 8px 24px -10px rgba(0,0,0,0.35)',
                    }}
                  >
                    <Icon
                      className={`w-7 h-7 ${
                        m.slug === 'fine_art' ? 'text-(--color-charcoal)' : 'text-(--color-canvas)'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-[family-name:var(--font-display)] text-xl text-(--color-ink) mb-1">{m.name}</h3>
                    <p className="text-xs uppercase tracking-widest text-(--color-bronze) mb-2">
                      {m.tag}
                    </p>
                    <p className="text-sm text-(--color-charcoal) leading-relaxed mb-3">
                      {m.body}
                    </p>
                    <ul className="text-xs text-(--color-stone) space-y-1">
                      {m.specs.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-(--color-bronze) mt-0.5 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3b — Interactieve preview */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2">
          {c.preview.title}
        </h2>
        <p className="text-(--color-charcoal) mb-8 max-w-2xl">{c.preview.subtitle}</p>

        {/* Wall-themas mini-illustratie: 4 swatches */}
        <div className="flex items-end gap-3 mb-10">
          <span className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mr-2 self-center">
            {locale === 'fr' ? 'Ambiances :' : 'Sferen:'}
          </span>
          <WallSwatch icon={SquareIcon} bg="linear-gradient(180deg, #f3efe8 0%, #d8d2c8 100%)" label="Beige" />
          <WallSwatch icon={Sun} bg="linear-gradient(180deg, #ffffff 0%, #e8e7e4 100%)" label={locale === 'fr' ? 'Galerie' : 'Galerij'} />
          <WallSwatch icon={Moon} bg="linear-gradient(180deg, #2a2620 0%, #15120e 100%)" label={locale === 'fr' ? 'Sombre' : 'Donker'} dark />
          <WallSwatch icon={Sofa} bg="linear-gradient(180deg, #ede5d8 0%, #c8b89c 100%)" label="Salon" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {c.preview.items.map((it, i) => {
            const Icon = PREVIEW_ICONS[i] ?? Eye
            return (
              <div key={i} className="bg-(--color-paper) border border-(--color-frame) p-5">
                <Icon className="w-5 h-5 text-(--color-bronze) mb-3" />
                <h3 className="font-[family-name:var(--font-display)] text-base text-(--color-ink) mb-1.5">{it.title}</h3>
                <p className="text-xs text-(--color-charcoal) leading-relaxed">{it.body}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-8">
          <Link
            href="/shop/boutique"
            className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-(--color-bronze) hover:text-(--color-bronze-dark) transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            {c.preview.cta}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 3c — Room recommender */}
      <section className="bg-(--color-paper) border-y border-(--color-frame)">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2">
            {c.recommender.title}
          </h2>
          <p className="text-(--color-charcoal) mb-10 max-w-xl">{c.recommender.subtitle}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {c.recommender.rooms.map((r, i) => {
              const Icon = ROOM_ICONS[i] ?? Home
              return (
                <div
                  key={i}
                  className="bg-(--color-canvas) border border-(--color-frame) p-5 flex flex-col items-start gap-3"
                >
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-(--color-bronze)/10 text-(--color-bronze)">
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="font-[family-name:var(--font-display)] text-lg text-(--color-ink)">{r.room}</h3>
                  <p className="text-xs text-(--color-charcoal) leading-relaxed">{r.rec}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3d — Composition / wand-arrangement */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2">
          {c.composition.title}
        </h2>
        <p className="text-(--color-charcoal) mb-8 max-w-2xl">{c.composition.subtitle}</p>

        {/* Mini triptych illustratie */}
        <div className="flex justify-center gap-4 mb-10 px-6 py-8 bg-(--color-paper) border border-(--color-frame)">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              aria-hidden
              className="bg-gradient-to-br from-stone-300 to-stone-500 border border-stone-700 shadow-md"
              style={{ width: 80, height: 110 }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <Frame className="w-6 h-6 text-stone-100/70" />
              </div>
            </div>
          ))}
        </div>

        <ol className="space-y-2 text-sm text-(--color-charcoal) mb-6">
          {c.composition.items.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="font-mono text-xs text-(--color-bronze) shrink-0 mt-0.5">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <p className="bg-(--color-bronze)/10 border border-(--color-bronze)/30 rounded p-3 text-xs text-(--color-ink) inline-flex items-center gap-2 mb-6">
          <Tag className="w-3.5 h-3.5 text-(--color-bronze)" />
          <span>{c.composition.bundleNote}</span>
        </p>

        <div>
          <Link
            href="/shop/composition"
            className="inline-flex items-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-[0.2em]"
          >
            <Star className="w-4 h-4" />
            {c.composition.ctaLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 3e — Share / vergelijk / save */}
      <section className="bg-(--color-paper) border-y border-(--color-frame)">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2">
            {c.share.title}
          </h2>
          <p className="text-(--color-charcoal) mb-10 max-w-2xl">{c.share.subtitle}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.share.items.map((it, i) => {
              const Icon = SHARE_ICONS[i] ?? Share2
              return (
                <div key={i} className="bg-(--color-canvas) border border-(--color-frame) p-5">
                  <Icon className="w-5 h-5 text-(--color-bronze) mb-3" />
                  <h3 className="font-[family-name:var(--font-display)] text-lg text-(--color-ink) mb-1.5">{it.title}</h3>
                  <p className="text-xs text-(--color-charcoal) leading-relaxed">{it.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 4 — Maten */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2">
          {c.sizes.title}
        </h2>
        <p className="text-(--color-charcoal) mb-10 max-w-xl">{c.sizes.subtitle}</p>

        {/* Visuele schaalvergelijking */}
        <div className="bg-(--color-paper) border border-(--color-frame) p-8 mb-6 overflow-x-auto">
          <div className="flex items-end gap-6 min-w-max md:justify-center">
            {SIZE_VISUAL.map((s, i) => {
              const c2 = c.sizes.items[i]
              if (!c2) return null
              return (
                <div key={s.slug} className="flex flex-col items-center gap-2">
                  <div
                    className="bg-(--color-ink)/85 border border-(--color-charcoal)/40"
                    style={{
                      width: `${s.scale * 36}px`,
                      height: `${s.scale * 54}px`,
                    }}
                    aria-hidden
                  />
                  <p className="text-xs text-(--color-stone) font-medium">{s.label}</p>
                  <p className="text-[10px] text-(--color-stone)">{s.dim}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tekstueel met aanbeveling */}
        <ul className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {c.sizes.items.map((s, i) => (
            <li key={i} className="bg-(--color-paper) border border-(--color-frame) p-4">
              <p className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink)">{SIZE_VISUAL[i]?.label}</p>
              <p className="text-xs text-(--color-stone) mb-2">{SIZE_VISUAL[i]?.dim}</p>
              <p className="text-xs text-(--color-charcoal) leading-snug">{s}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 5 — Kwaliteit / Duurzaamheid */}
      <section className="bg-(--color-paper) border-y border-(--color-frame)">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2">
            {c.quality.title}
          </h2>
          <p className="text-(--color-charcoal) mb-10 max-w-xl">{c.quality.subtitle}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {c.quality.items.map((q, i) => {
              const Icon = QUALITY_ICONS[i] ?? Award
              return (
                <div key={i} className="flex gap-4 items-start">
                  <Icon className="w-6 h-6 text-(--color-bronze) shrink-0 mt-1" />
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-lg text-(--color-ink) mb-1">{q.title}</h3>
                    <p className="text-sm text-(--color-charcoal) leading-relaxed">{q.body}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 6 — Verzending & retour */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2">
          {c.shipping.title}
        </h2>
        <p className="text-(--color-charcoal) mb-10 max-w-xl">{c.shipping.subtitle}</p>
        <div className="grid md:grid-cols-3 gap-5">
          {c.shipping.items.map((s, i) => {
            const Icon = SHIPPING_ICONS[i] ?? Truck
            return (
              <div key={i} className="bg-(--color-paper) border border-(--color-frame) p-6">
                <Icon className="w-5 h-5 text-(--color-bronze) mb-3" />
                <h3 className="font-[family-name:var(--font-display)] text-lg text-(--color-ink) mb-2">{s.title}</h3>
                <p className="text-sm text-(--color-charcoal) leading-relaxed">{s.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 7 — FAQ */}
      <section className="bg-(--color-paper) border-y border-(--color-frame)">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2 inline-flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-(--color-bronze)" /> {c.faq.title}
          </h2>
          <p className="text-(--color-charcoal) mb-8">{c.faq.subtitle}</p>
          <div className="bg-(--color-canvas) border border-(--color-frame)">
            {c.faq.items.map((q, i) => (
              <details
                key={i}
                className="group border-b border-(--color-frame) last:border-b-0"
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 hover:bg-(--color-paper) transition-colors">
                  <span className="text-base font-medium text-(--color-ink)">{q.q}</span>
                  <span
                    aria-hidden
                    className="text-(--color-bronze) group-open:rotate-45 transition-transform inline-block leading-none text-2xl font-light"
                  >
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 -mt-1 text-sm text-(--color-charcoal) leading-relaxed">
                  {q.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 8 — CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-(--color-ink) mb-4" data-cta-title>{c.cta.title}</h2>
        <p className="text-(--color-charcoal) mb-8 max-w-xl mx-auto">{c.cta.body}</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/shop/boutique"
            className="inline-flex items-center gap-2 px-7 py-4 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-[0.2em]"
          >
            <ShoppingBag className="w-4 h-4" />
            {c.cta.primary}
          </Link>
          <Link
            href="/shop/composition"
            className="inline-flex items-center gap-2 px-7 py-4 bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) text-(--color-ink) transition-colors text-sm uppercase tracking-[0.2em]"
          >
            <Star className="w-4 h-4" />
            {c.cta.tertiary}
          </Link>
          <Link
            href={localePath(locale, '/contact')}
            className="inline-flex items-center gap-2 px-7 py-4 bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) text-(--color-ink) transition-colors text-sm uppercase tracking-[0.2em]"
          >
            <Mail className="w-4 h-4" />
            {c.cta.secondary}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </main>
  )
}

/* --------------------------------------------------------------------- */
/* Helpers                                                                */
/* --------------------------------------------------------------------- */

/** Mini wall-swatch tegel — gebruikt in de "interactieve preview"-sectie
 *  om de 4 muur-themas (beige/galerij/donker/salon) snel te tonen. */
function WallSwatch({
  icon: Icon,
  bg,
  label,
  dark = false,
}: {
  icon: typeof Sun
  bg: string
  label: string
  dark?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        aria-hidden
        className="w-12 h-12 rounded border border-(--color-frame) inline-flex items-center justify-center shadow-sm"
        style={{ background: bg }}
      >
        <Icon className={`w-4 h-4 ${dark ? 'text-stone-200' : 'text-stone-600'}`} />
      </div>
      <span className="text-[10px] uppercase tracking-[0.15em] text-(--color-stone)">{label}</span>
    </div>
  )
}

/* --------------------------------------------------------------------- */
/* Iconen + visuele constanten                                            */
/* --------------------------------------------------------------------- */

const STEP_ICONS = [Camera, Layers, Ruler, Truck]
const QUALITY_ICONS = [Award, Leaf, ShieldCheck]
const SHIPPING_ICONS = [Truck, Frame, Wrench]
// Iconen voor de 8 preview-feature-cards (volgorde matcht content.preview.items)
const PREVIEW_ICONS = [SquareIcon, MoveHorizontal, Sun, Frame, Eye, Maximize2, Ruler, BoxIcon]
// Iconen voor de 5 share-cards
const SHARE_ICONS = [Share2, Mail, GitCompare, Download, Save]
// Iconen + accent-kleuren voor de 4 room-kaarten
const ROOM_ICONS = [Home, Bed, Briefcase, DoorOpen]

const MATERIAL_ICONS: Record<string, typeof Frame> = {
  fine_art: ImageIcon,
  canvas: Frame,
  aluminum: Layers,
  plexi: Eye,
}

const MATERIAL_COLORS: Record<string, string> = {
  fine_art: '#f3f1ec', // créme passe-partout
  canvas: '#3d3a35',   // donker canvas-rand
  aluminum: '#8a8478', // grijs aluminium
  plexi: '#0a0a0a',    // zwart achter plexi
}

// Schaal voor de visuele maten-vergelijking. Index 0..4 = S..XXL.
// `scale` is een arbitraire factor t.o.v. een 36×54 px referentie.
const SIZE_VISUAL = [
  { slug: 's',   label: 'S',   dim: '30 × 45 cm',  scale: 0.9 },
  { slug: 'm',   label: 'M',   dim: '50 × 75 cm',  scale: 1.4 },
  { slug: 'l',   label: 'L',   dim: '70 × 100 cm', scale: 2.0 },
  { slug: 'xl',  label: 'XL',  dim: '90 × 135 cm', scale: 2.7 },
  { slug: 'xxl', label: 'XXL', dim: '120 × 180 cm', scale: 3.6 },
]

/* --------------------------------------------------------------------- */
/* Inhoud (FR / NL)                                                      */
/* --------------------------------------------------------------------- */

type StepItem = { title: string; body: string }
type MaterialItem = { slug: string; name: string; tag: string; body: string; specs: string[] }
type QualityItem = { title: string; body: string }
type ShippingItem = { title: string; body: string }
type FaqItem = { q: string; a: string }
type FeatureCard = { title: string; body: string }
type RoomReco = { room: string; rec: string }
type Content = {
  hero: { eyebrow: string; title: string; subtitle: string }
  steps: { title: string; subtitle: string; items: StepItem[] }
  materials: { title: string; subtitle: string; items: MaterialItem[] }
  // Nieuw — interactieve preview-features
  preview: { title: string; subtitle: string; items: FeatureCard[]; cta: string }
  // Nieuw — room recommender
  recommender: { title: string; subtitle: string; rooms: RoomReco[] }
  // Nieuw — wall-arrangement / composition
  composition: { title: string; subtitle: string; items: string[]; ctaLabel: string; bundleNote: string }
  // Nieuw — share / vergelijk
  share: { title: string; subtitle: string; items: FeatureCard[] }
  sizes: { title: string; subtitle: string; items: string[] }
  quality: { title: string; subtitle: string; items: QualityItem[] }
  shipping: { title: string; subtitle: string; items: ShippingItem[] }
  faq: { title: string; subtitle: string; items: FaqItem[] }
  cta: { title: string; body: string; primary: string; secondary: string; tertiary: string }
}

const content: Record<Locale, Content> = {
  fr: {
    hero: {
      eyebrow: 'Mode d’emploi',
      title: 'Comment ça marche',
      subtitle:
        'Du clic à votre mur — votre tirage personnalisé, expédié depuis l’atelier en quelques jours. Voici comment se passe une commande chez Jean-Pierre.',
    },
    steps: {
      title: 'En quatre étapes',
      subtitle:
        'Pas de chichis : chaque commande passe par les mêmes quatre choix. Le prix se met à jour à mesure que vous configurez.',
      items: [
        {
          title: 'Choisissez une œuvre',
          body:
            'Parcourez la boutique de Jean-Pierre Montreuil — portraits, paysages, scènes animales. Toutes les images publiées sont disponibles à l’impression.',
        },
        {
          title: 'Sélectionnez un matériau',
          body:
            'Quatre supports professionnels — du papier baryté archival au plexiglas brillant. Chacun donne un rendu très différent ; le configurateur affiche un aperçu adapté à votre choix.',
        },
        {
          title: 'Choisissez un format',
          body:
            'Cinq formats fixes, de S (30×45 cm) à XXL (120×180 cm). Le prix par cellule de la grille s’affiche en direct ; les combinaisons indisponibles sont grisées.',
        },
        {
          title: 'On expédie chez vous',
          body:
            'Emballage soigné, suivi de colis, livraison en 7 à 10 jours ouvrables en Belgique et en Europe. Vous recevez un e-mail à chaque étape.',
        },
      ],
    },
    materials: {
      title: 'Les quatre matériaux',
      subtitle:
        'Chaque support a sa personnalité. Voici comment les choisir selon le mur, la lumière et l’ambiance que vous visez.',
      items: [
        {
          slug: 'fine_art',
          name: 'Fine-Art papier',
          tag: 'Le classique d’art',
          body:
            'Tirage giclée sur papier baryté 310 g/m², encadré ou non. Rendu mat profond, noirs riches, blancs chauds. Idéal sous un cadre avec passe-partout pour un mur d’atelier ou de bureau.',
          specs: [
            'Papier baryté 310 g/m², qualité musée',
            'Rendu mat — pas de reflet',
            'Conservation > 100 ans à l’abri du soleil direct',
            'Léger — facile à encadrer soi-même',
          ],
        },
        {
          slug: 'canvas',
          name: 'Toile sur châssis',
          tag: 'Chaleureux & vivant',
          body:
            'Toile coton tendue sur un châssis bois de 4 cm. Bords blancs propres, prête à accrocher. La texture du tissu donne une vraie présence — parfaite au-dessus d’un canapé ou dans un salon.',
          specs: [
            'Coton 380 g/m² traité anti-UV',
            'Châssis bois 4 cm — galbé, pas de gondolement',
            'Crochets pré-installés à l’arrière',
            'Pas besoin de cadre',
          ],
        },
        {
          slug: 'aluminum',
          name: 'Aluminium dibond',
          tag: 'Moderne & durable',
          body:
            'Impression directe sur dibond 3 mm avec finition mate. Look contemporain, lignes nettes, presque pas d’épaisseur visible. Excellent dans une cuisine, une entrée, ou une pièce humide.',
          specs: [
            'Dibond 3 mm — rigidité parfaite',
            'Impression UV directe — couleurs résistantes',
            'Convient pour pièces humides (cuisine, salle de bain)',
            'Système de fixation invisible inclus',
          ],
        },
        {
          slug: 'plexi',
          name: 'Plexiglas brillant',
          tag: 'Profondeur de galerie',
          body:
            'Tirage placé sous une plaque de plexiglas 5 mm avec dos aluminium. Le verre acrylique amplifie les couleurs et donne une profondeur quasi 3D. Look galerie d’art professionnel.',
          specs: [
            'Plexiglas 5 mm + dos aluminium 2 mm',
            'Couleurs intenses, contraste maximum',
            'Fixation murale invisible (espace de 1,5 cm)',
            'Premium — recommandé pour pièces phares',
          ],
        },
      ],
    },
    preview: {
      title: 'L’aperçu interactif',
      subtitle:
        'Sur chaque fiche d’œuvre, le configurateur ne se contente pas d’une vignette : votre photo apparaît dans une vraie maquette du matériau choisi, dans le cadre que vous testez. Voici ce que vous pouvez ajuster en temps réel.',
      items: [
        {
          title: 'Aperçu mural — 4 ambiances',
          body:
            'Beige chaleureux, blanc galerie, mur sombre, ou scène de salon avec canapé. Vous voyez à quoi votre tirage ressemblera vraiment chez vous.',
        },
        {
          title: 'Hauteur d’accrochage',
          body:
            'Haut, milieu ou bas — le cadre se repositionne pour simuler une accroche basse au-dessus d’un canapé, ou un alignement à hauteur des yeux.',
        },
        {
          title: 'Spotlight déplaçable',
          body:
            'Glissez le petit soleil pour changer la source de lumière : l’ombre du cadre suit, les reflets sur le plexi aussi.',
        },
        {
          title: 'Couleur du cadre Fine-Art',
          body:
            'Quand vous choisissez le papier baryté, un sous-sélecteur apparaît : chêne, noir ou blanc — chaque option modifie la moulure visible autour du passe-partout.',
        },
        {
          title: 'Vue 3D & parallaxe',
          body:
            'Le cadre est légèrement incliné et suit votre souris — un effet « objet sur un mur » plutôt qu’une image plate. (Désactivé en mode accessibilité.)',
        },
        {
          title: 'Zoom plein écran',
          body:
            'Cliquez sur l’aperçu pour voir la photo en pleine résolution. Sur mobile : pincez pour zoomer ; les flèches ← → cyclent entre les matériaux.',
        },
        {
          title: 'Repère d’échelle (XL/XXL)',
          body:
            'Pour les grands formats, une silhouette de 170 cm apparaît à côté du cadre — vous comprenez immédiatement la taille réelle.',
        },
        {
          title: 'Aperçu AR sur mobile',
          body:
            'Bouton AR sur iPhone et Android (Quick Look + Scene Viewer) : posez virtuellement l’œuvre sur votre mur via la caméra. Les modèles 3D arrivent prochainement.',
        },
      ],
      cta: 'Essayer le configurateur',
    },
    recommender: {
      title: 'Recommandation par pièce',
      subtitle:
        'Vous hésitez sur le matériau ? Indiquez où vous voulez accrocher l’œuvre — le configurateur vous suggère le support le plus adapté.',
      rooms: [
        { room: 'Salon', rec: 'Toile sur châssis — chaleureuse, sans cadre, parfaite au-dessus d’un canapé.' },
        { room: 'Chambre', rec: 'Papier Fine-Art mat — apaisant, sans reflet, idéal pour la lumière douce.' },
        { room: 'Bureau', rec: 'Aluminium dibond — net, moderne, pas d’éclats de lumière sur l’écran.' },
        { room: 'Couloir', rec: 'Plexiglas brillant — la profondeur attire l’œil dans un espace de passage.' },
      ],
    },
    composition: {
      title: 'Composez votre mur',
      subtitle:
        'Au lieu d’une seule œuvre, créez un triptyque ou une série murale. Trois cadres côte à côte, même matériau, même format — un effet galerie immédiat.',
      items: [
        'Choisissez trois œuvres dans la boutique',
        'Sélectionnez un matériau et un format communs',
        'Vérifiez l’aperçu en triptyque (vous pouvez intervertir les œuvres à tout moment)',
        'Ajoutez les trois au panier d’un seul clic',
      ],
      ctaLabel: 'Composer mon mur',
      bundleNote:
        'Bonus : à partir de 3 tirages dans le panier, une remise de 10 % s’applique automatiquement.',
    },
    share: {
      title: 'Partagez, comparez, sauvegardez',
      subtitle:
        'Tout votre configurateur est conçu pour faciliter la décision — y compris à plusieurs.',
      items: [
        {
          title: 'Lien partageable',
          body:
            'Toute votre configuration (œuvre, matériau, format, mur, hauteur) est encodée dans l’URL. Copiez-collez-la dans un message et l’autre personne voit exactement la même chose.',
        },
        {
          title: 'Envoi par e-mail',
          body:
            'Bouton « Envoyer par mail » : tapez l’adresse d’un proche, ajoutez un petit mot, et il reçoit un aperçu soigné avec un lien direct.',
        },
        {
          title: 'Comparez deux matériaux',
          body:
            'Le bouton « Comparer matériaux » affiche votre œuvre côte à côte sur deux supports, avec les deux prix. Pratique pour trancher entre canvas et plexi.',
        },
        {
          title: 'Téléchargement PNG',
          body:
            'Bouton télécharger : exporte l’aperçu en PNG haute résolution, avec un filigrane discret « Aperçu uniquement ». Idéal pour montrer à votre architecte ou votre conjoint·e.',
        },
        {
          title: 'Vos choix mémorisés',
          body:
            'Vos derniers réglages (matériau, format, mur, cadre) sont sauvegardés localement. À votre prochaine visite, vous reprenez là où vous étiez.',
        },
      ],
    },
    sizes: {
      title: 'Quelle taille pour quel mur ?',
      subtitle:
        'Indication selon la taille du mur disponible. En cas de doute, mesurez l’espace, projetez la diagonale et faites un test au scotch.',
      items: [
        'Petit mur, bureau, couloir étroit. Parfait en duo ou en série de trois.',
        'Au-dessus d’un meuble bas, dans une chambre, en complément.',
        'Format de référence salon — bien visible sans envahir.',
        'Pièce de vie principale, espace ouvert. Devient le point focal.',
        'Grandes hauteurs sous plafond, halls, réceptions. Effet « grande galerie ».',
      ],
    },
    quality: {
      title: 'Qualité & durabilité',
      subtitle:
        'Un tirage de cette qualité doit traverser les années sans broncher. Voici ce qui en garantit la longévité.',
      items: [
        {
          title: 'Encres certifiées archivales',
          body:
            'Toutes les impressions utilisent des encres pigmentées Epson UltraChrome — résistance documentée à plus de 100 ans en intérieur.',
        },
        {
          title: 'Production locale',
          body:
            'Imprimé et emballé en Belgique, à proximité de l’atelier de Jean-Pierre. Délais courts, empreinte carbone réduite.',
        },
        {
          title: 'Œuvres vérifiées avant impression',
          body:
            'Chaque fichier est contrôlé pour vous garantir un piqué net au format choisi. Si la résolution ne suffit pas, on vous le signale avant production.',
        },
      ],
    },
    shipping: {
      title: 'Livraison & retour',
      subtitle:
        'On a soigné chaque étape pour que la photo arrive aussi belle qu’elle est sortie de l’atelier.',
      items: [
        {
          title: 'Délai de 7 à 10 jours',
          body:
            'Production sur commande à partir du paiement. Suivi en temps réel par e-mail dès l’expédition.',
        },
        {
          title: 'Emballage anti-choc',
          body:
            'Coins protégés, calage mousse, plastique recyclable. Les grands formats partent dans une caisse en bois sur mesure.',
        },
        {
          title: '14 jours pour changer d’avis',
          body:
            'Le tirage ne vous convient pas ? Vous avez deux semaines pour le renvoyer (en parfait état, dans son emballage) — remboursement intégral.',
        },
      ],
    },
    faq: {
      title: 'Questions fréquentes',
      subtitle: 'Cliquez sur une question pour ouvrir la réponse.',
      items: [
        {
          q: 'Puis-je voir un aperçu avant de commander ?',
          a: 'Oui — sur la page de configuration, l’aperçu se met à jour en temps réel selon le matériau et le format choisis. Pour un rendu encore plus précis, on vous envoie sur demande un test imprimé en petit format avant la production complète.',
        },
        {
          q: 'Le format que je veux n’existe pas — vous faites du sur-mesure ?',
          a: 'Pour un format spécial, contactez Jean-Pierre via le formulaire de contact. Il évalue la résolution de l’œuvre choisie et vous propose un devis sous 48h.',
        },
        {
          q: 'Combien de temps avant de recevoir ma commande ?',
          a: 'Comptez environ 7 à 10 jours ouvrables entre le paiement et la livraison à votre porte. Les XXL sur plexiglas peuvent demander quelques jours de plus.',
        },
        {
          q: 'Le tirage est-il livré encadré ?',
          a: 'Non — pour le papier fine-art, le tirage arrive non encadré (vous choisissez votre cadre). Le canvas, l’aluminium et le plexi sont prêts à accrocher avec leur système de fixation.',
        },
        {
          q: 'Puis-je commander la même œuvre en plusieurs exemplaires ?',
          a: 'Bien sûr — augmentez simplement la quantité dans le panier. Les remises pour multiples sont automatiquement appliquées à partir de 3 tirages identiques.',
        },
        {
          q: 'Vous proposez des emballages cadeau ?',
          a: 'Oui, à la demande, sans surcoût : papier de soie créme + ruban en lin, avec une carte manuscrite si vous le souhaitez. À cocher au moment du checkout.',
        },
        {
          q: 'Et si je veux une œuvre originale, peinte à la main ?',
          a: 'Pour une commande sur mesure (peinture à l’huile, portrait, sujet personnalisé), passez par la page « Commander une œuvre ». Jean-Pierre vous contacte pour discuter du projet et établir un devis.',
        },
        {
          q: 'Comment partager ma configuration avec quelqu’un ?',
          a: 'Deux options : copiez l’URL (bouton « Partager ») — elle contient toute votre config et la personne ouvrira la même chose. Ou utilisez « Envoyer par mail » : on envoie à votre proche un aperçu de la photo + un petit mot + un lien direct.',
        },
        {
          q: 'Puis-je voir deux matériaux côte à côte ?',
          a: 'Oui — cliquez sur « Comparer matériaux » dans le configurateur. Vous choisissez votre œuvre, un format, et l’aperçu se dédouble : papier vs canvas, ou plexi vs aluminium, avec les deux prix affichés.',
        },
        {
          q: 'Y a-t-il une remise pour plusieurs tirages ?',
          a: 'Oui : à partir de 3 tirages dans le panier (même œuvre ou différentes), une remise de 10 % s’applique automatiquement au checkout. Aucun code à entrer.',
        },
        {
          q: 'L’aperçu AR fonctionne-t-il vraiment sur mon iPhone ?',
          a: 'L’interface est en place — sur iPhone, le bouton lance Quick Look ; sur Android, Scene Viewer. Les modèles 3D pour chaque matériau × format sont en cours de production. D’ici là, vous verrez un message d’indisponibilité.',
        },
        {
          q: 'Le configurateur se souvient-il de mes choix ?',
          a: 'Oui — votre dernière configuration (matériau, format, mur, cadre) est sauvegardée sur cet appareil. Au retour, le configurateur redémarre exactement là où vous l’aviez laissé.',
        },
      ],
    },
    cta: {
      title: 'Prêt à composer votre mur ?',
      body:
        'Parcourez la boutique, choisissez votre œuvre et votre matériau. Le prix s’affiche immédiatement.',
      primary: 'Vers la boutique',
      secondary: 'Une question ?',
      tertiary: 'Composer un mur',
    },
  },

  nl: {
    hero: {
      eyebrow: 'Hoe het werkt',
      title: 'Hoe werkt het',
      subtitle:
        'Van klik tot muur — uw gepersonaliseerde print, verzonden vanuit het atelier in enkele dagen. Zo verloopt een bestelling bij Jean-Pierre.',
    },
    steps: {
      title: 'In vier stappen',
      subtitle:
        'Zonder poespas: elke bestelling doorloopt dezelfde vier keuzes. De prijs past zich live aan terwijl u configureert.',
      items: [
        {
          title: 'Kies een werk',
          body:
            'Blader door de boutique van Jean-Pierre Montreuil — portretten, landschappen, dierentaferelen. Elke gepubliceerde afbeelding kan besteld worden.',
        },
        {
          title: 'Kies een materiaal',
          body:
            'Vier professionele dragers — van archivaal baryta-papier tot glanzend plexiglas. Elk geeft een totaal andere look; de configurator past de preview aan uw keuze aan.',
        },
        {
          title: 'Kies een formaat',
          body:
            'Vijf vaste formaten, van S (30×45 cm) tot XXL (120×180 cm). De prijs per cel verschijnt onmiddellijk; niet-beschikbare combinaties zijn grijs.',
        },
        {
          title: 'Wij sturen het op',
          body:
            'Zorgvuldige verpakking, track-and-trace, levering in 7 tot 10 werkdagen in België en Europa. U krijgt een mail bij elke stap.',
        },
      ],
    },
    materials: {
      title: 'De vier materialen',
      subtitle:
        'Elk support heeft zijn eigen karakter. Zo kiest u het juiste voor de muur, het licht en de sfeer.',
      items: [
        {
          slug: 'fine_art',
          name: 'Fine-Art papier',
          tag: 'De klassieke kunstprint',
          body:
            'Giclée-print op baryta-papier 310 g/m², ingelijst of niet. Diepe matte tinten, rijke zwarten, warme witten. Ideaal achter een cadre met passe-partout voor atelier- of kantoormuur.',
          specs: [
            'Baryta-papier 310 g/m² — museumkwaliteit',
            'Mat — geen reflectie',
            'Conservatie > 100 jaar (uit direct zonlicht)',
            'Licht — eenvoudig zelf in te lijsten',
          ],
        },
        {
          slug: 'canvas',
          name: 'Canvas op spieraam',
          tag: 'Warm & levendig',
          body:
            'Katoenen doek opgespannen op een houten spieraam van 4 cm. Witte randen, klaar om op te hangen. De textuur geeft echte aanwezigheid — perfect boven een zetel of in een woonkamer.',
          specs: [
            'Katoen 380 g/m² met UV-bescherming',
            'Houten spieraam 4 cm — geen kromtrekken',
            'Ophanghaakjes voorgeïnstalleerd',
            'Geen kader nodig',
          ],
        },
        {
          slug: 'aluminum',
          name: 'Aluminium dibond',
          tag: 'Modern & duurzaam',
          body:
            'Directe print op 3 mm dibond met matte afwerking. Hedendaagse look, scherpe lijnen, vrijwel geen zichtbare dikte. Uitstekend in een keuken, hal of vochtige ruimte.',
          specs: [
            'Dibond 3 mm — perfect stijf',
            'Directe UV-print — duurzame kleuren',
            'Geschikt voor vochtige ruimtes (keuken, badkamer)',
            'Onzichtbaar ophangsysteem inbegrepen',
          ],
        },
        {
          slug: 'plexi',
          name: 'Plexiglas glanzend',
          tag: 'Galerie-diepte',
          body:
            'Print onder een plaat plexiglas 5 mm met aluminium achterzijde. Het acrylglas versterkt de kleuren en geeft een quasi 3D-diepte. Professionele galerij-look.',
          specs: [
            'Plexiglas 5 mm + 2 mm aluminium achter',
            'Intense kleuren, maximaal contrast',
            'Onzichtbare wandbevestiging (1,5 cm wandafstand)',
            'Premium — aanbevolen voor blikvanger',
          ],
        },
      ],
    },
    preview: {
      title: 'De interactieve preview',
      subtitle:
        'Op elke fotopagina toont de configurator uw foto niet als een vlak thumbnailtje, maar als een echte mockup van het gekozen materiaal in het kader dat u test. Hier is wat u live kan aanpassen.',
      items: [
        {
          title: 'Muur-preview — 4 sferen',
          body:
            'Warm beige, wit galerij, donkere muur, of woonkamerscène met sofa. U ziet meteen hoe uw print er bij u thuis uitziet.',
        },
        {
          title: 'Hang-hoogte',
          body:
            'Hoog, midden of laag — het kader verschuift om een lage ophanging boven een sofa of een ooghoogte-uitlijning te simuleren.',
        },
        {
          title: 'Verplaatsbare lichtbron',
          body:
            'Sleep het zonnetje om de lichtbron te veranderen: de schaduw van het kader volgt mee, net als de reflecties op het plexiglas.',
        },
        {
          title: 'Houtkleur Fine-Art',
          body:
            'Wanneer u baryta-papier kiest verschijnt een sub-keuze: eik, zwart of wit — elke optie verandert de zichtbare lijst rond het passe-partout.',
        },
        {
          title: '3D-perspectief & parallax',
          body:
            'Het kader staat licht gekanteld en volgt uw muis — een "object aan de muur"-effect i.p.v. een platte afbeelding. (Uit in toegankelijkheidsmodus.)',
        },
        {
          title: 'Fullscreen zoom',
          body:
            'Klik op de preview om de foto op volledige resolutie te bekijken. Op mobiel: knijp om in te zoomen ; pijlen ← → cyclen door de materialen.',
        },
        {
          title: 'Schaal-silhouet (XL/XXL)',
          body:
            'Bij grote formaten verschijnt een 170 cm-silhouet naast het kader — u snapt onmiddellijk hoe groot het werkelijk is.',
        },
        {
          title: 'AR-preview op mobiel',
          body:
            'AR-knop op iPhone en Android (Quick Look + Scene Viewer): plaats het werk virtueel op uw muur via de camera. 3D-modellen worden binnenkort toegevoegd.',
        },
      ],
      cta: 'Probeer de configurator',
    },
    recommender: {
      title: 'Aanbeveling per ruimte',
      subtitle:
        'Twijfelt u over het materiaal? Geef aan waar u het werk wil ophangen — de configurator suggereert het meest geschikte support.',
      rooms: [
        { room: 'Salon', rec: 'Canvas op spieraam — warm, zonder lijst, perfect boven een sofa.' },
        { room: 'Slaapkamer', rec: 'Fine-Art papier mat — rustgevend, geen reflectie, ideaal voor zacht licht.' },
        { room: 'Bureau', rec: 'Aluminium dibond — scherp, modern, geen lichtweerkaatsing op het scherm.' },
        { room: 'Inkomhal', rec: 'Plexiglas glanzend — de diepte trekt de aandacht in een doorgangsruimte.' },
      ],
    },
    composition: {
      title: 'Stel uw muur samen',
      subtitle:
        'In plaats van één werk, maak een triptiek of muurseries. Drie kaders naast elkaar, hetzelfde materiaal, hetzelfde formaat — een directe galerij-look.',
      items: [
        'Kies drie werken uit de boutique',
        'Selecteer een gemeenschappelijk materiaal en formaat',
        'Bekijk de preview in triptiek (u kan de werken op elk moment wisselen)',
        'Voeg de drie in één klik toe aan het winkelmandje',
      ],
      ctaLabel: 'Mijn muur samenstellen',
      bundleNote:
        'Bonus: vanaf 3 prints in het winkelmandje wordt automatisch 10 % korting toegepast.',
    },
    share: {
      title: 'Deel, vergelijk en bewaar',
      subtitle:
        'De configurator is ontworpen om beslissen makkelijker te maken — ook samen met iemand anders.',
      items: [
        {
          title: 'Deelbare link',
          body:
            'Uw volledige configuratie (werk, materiaal, formaat, muur, hoogte) zit in de URL. Plak hem in een bericht en de ander ziet exact hetzelfde.',
        },
        {
          title: 'Verzenden per e-mail',
          body:
            'Knop "Versturen per mail": typ het adres van een naaste, voeg een korte boodschap toe, en hij/zij ontvangt een verzorgde preview met directe link.',
        },
        {
          title: 'Twee materialen vergelijken',
          body:
            'De knop "Materialen vergelijken" toont uw werk naast elkaar op twee dragers, met beide prijzen. Handig om te kiezen tussen canvas en plexi.',
        },
        {
          title: 'PNG downloaden',
          body:
            'Download-knop: exporteert de preview als hoge-resolutie PNG, met discrete "Aperçu uniquement"-watermerk. Ideaal om aan uw architect of partner te tonen.',
        },
        {
          title: 'Uw keuzes onthouden',
          body:
            'Uw laatste instellingen (materiaal, formaat, muur, kader) worden lokaal bewaard. Bij uw volgend bezoek pikt u op waar u stopte.',
        },
      ],
    },
    sizes: {
      title: 'Welk formaat voor welke muur?',
      subtitle:
        'Indicatie volgens de grootte van de beschikbare muur. Bij twijfel: meet de ruimte op, projecteer de diagonaal en test met plakband.',
      items: [
        'Kleine muur, bureau, smalle gang. Mooi in duo of serie van drie.',
        'Boven een lage kast, in een slaapkamer, als aanvulling.',
        'Referentieformaat woonkamer — goed zichtbaar zonder te overheersen.',
        'Grote leefruimte, open plan. Wordt het brandpunt.',
        'Hoge plafonds, hallen, recepties. Effect "grote galerij".',
      ],
    },
    quality: {
      title: 'Kwaliteit & duurzaamheid',
      subtitle:
        'Een print van deze kwaliteit moet jaren meegaan zonder problemen. Dit garandeert de levensduur.',
      items: [
        {
          title: 'Archivaal gecertificeerde inkten',
          body:
            'Alle prints gebruiken Epson UltraChrome pigmentinkten — gedocumenteerde duurzaamheid van meer dan 100 jaar binnenshuis.',
        },
        {
          title: 'Lokale productie',
          body:
            'Gedrukt en verpakt in België, dicht bij het atelier van Jean-Pierre. Korte termijnen, lagere voetafdruk.',
        },
        {
          title: 'Werken gecontroleerd vóór druk',
          body:
            'Elk bestand wordt gecheckt zodat het op het gekozen formaat scherp blijft. Onvoldoende resolutie? We waarschuwen u vóór de productie start.',
        },
      ],
    },
    shipping: {
      title: 'Verzending & retour',
      subtitle:
        'We hebben elke stap verzorgd zodat de print thuiskomt zoals hij het atelier heeft verlaten.',
      items: [
        {
          title: 'Levertijd 7 tot 10 dagen',
          body:
            'Productie op bestelling vanaf betaling. Realtime tracking via e-mail vanaf verzending.',
        },
        {
          title: 'Schokbestendige verpakking',
          body:
            'Beschermde hoeken, schuim-bekleding, recycleerbaar plastic. Grote formaten worden in een houten kist op maat verzonden.',
        },
        {
          title: '14 dagen bedenktijd',
          body:
            'Print niet naar wens? U heeft 14 dagen om hem terug te sturen (in perfecte staat, originele verpakking) — volledige terugbetaling.',
        },
      ],
    },
    faq: {
      title: 'Veelgestelde vragen',
      subtitle: 'Klik op een vraag om het antwoord te openen.',
      items: [
        {
          q: 'Kan ik een preview zien vóór ik bestel?',
          a: 'Ja — op de configuratiepagina past de preview zich live aan aan het gekozen materiaal en formaat. Voor een nóg preciezer beeld kunnen we op aanvraag een testprint op klein formaat opsturen vóór de volledige productie.',
        },
        {
          q: 'Het formaat dat ik zoek staat er niet bij — doen jullie maatwerk?',
          a: 'Voor een speciaal formaat: contacteer Jean-Pierre via het contactformulier. Hij evalueert de resolutie van het gekozen werk en stuurt binnen 48u een offerte.',
        },
        {
          q: 'Hoe lang duurt het vóór ik mijn bestelling ontvang?',
          a: 'Reken op ongeveer 7 tot 10 werkdagen tussen betaling en levering aan huis. XXL op plexiglas kan enkele dagen extra vragen.',
        },
        {
          q: 'Komt de print ingelijst?',
          a: 'Nee — fine-art papier komt zonder cadre (kies uw eigen lijst). Canvas, aluminium en plexi zijn klaar om op te hangen met hun bevestigingssysteem.',
        },
        {
          q: 'Kan ik hetzelfde werk in meerdere exemplaren bestellen?',
          a: 'Zeker — verhoog gewoon het aantal in de winkelmand. Vanaf 3 identieke prints krijgt u automatisch een korting.',
        },
        {
          q: 'Bieden jullie cadeauverpakking aan?',
          a: 'Ja, op aanvraag en zonder meerprijs: créme zijdepapier + linnen lint, eventueel met een handgeschreven kaartje. Aan te vinken bij het afrekenen.',
        },
        {
          q: 'En als ik een origineel, met de hand geschilderd werk wil?',
          a: 'Voor een werk op maat (olieverf, portret, gepersonaliseerd onderwerp), gebruik dan de pagina "Een werk bestellen". Jean-Pierre neemt contact op om het project te bespreken en een offerte op te stellen.',
        },
        {
          q: 'Hoe deel ik mijn configuratie met iemand anders?',
          a: 'Twee mogelijkheden: kopieer de URL (knop "Delen") — ze bevat uw volledige config en de ander opent precies hetzelfde. Of gebruik "Versturen per mail": wij sturen uw naaste een preview van de foto + een korte boodschap + een directe link.',
        },
        {
          q: 'Kan ik twee materialen naast elkaar zien?',
          a: 'Ja — klik op "Materialen vergelijken" in de configurator. U kiest uw werk, een formaat, en de preview verdubbelt: papier vs canvas, of plexi vs aluminium, met beide prijzen ernaast.',
        },
        {
          q: 'Krijg ik korting bij meerdere prints?',
          a: 'Ja: vanaf 3 prints in het winkelmandje (zelfde werk of verschillende), wordt automatisch 10 % korting toegepast bij het afrekenen. Geen code nodig.',
        },
        {
          q: 'Werkt de AR-preview echt op mijn iPhone?',
          a: 'De interface staat klaar — op iPhone start de knop Quick Look ; op Android Scene Viewer. De 3D-modellen voor elk materiaal × formaat zijn nog in productie. Tot dan ziet u een onbeschikbaarheidsbericht.',
        },
        {
          q: 'Onthoudt de configurator mijn keuzes?',
          a: 'Ja — uw laatste configuratie (materiaal, formaat, muur, kader) wordt op dit toestel bewaard. Bij uw terugkeer start de configurator exact op de plek waar u stopte.',
        },
      ],
    },
    cta: {
      title: 'Klaar om uw muur samen te stellen?',
      body:
        'Blader door de boutique, kies uw werk en uw materiaal. De prijs verschijnt meteen.',
      primary: 'Naar de boutique',
      secondary: 'Een vraag?',
      tertiary: 'Een muur samenstellen',
    },
  },
}
