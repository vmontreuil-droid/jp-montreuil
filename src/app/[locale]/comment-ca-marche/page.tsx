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
        <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-(--color-ink) mb-4">{c.cta.title}</h2>
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
/* Iconen + visuele constanten                                            */
/* --------------------------------------------------------------------- */

const STEP_ICONS = [Camera, Layers, Ruler, Truck]
const QUALITY_ICONS = [Award, Leaf, ShieldCheck]
const SHIPPING_ICONS = [Truck, Frame, Wrench]

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
type Content = {
  hero: { eyebrow: string; title: string; subtitle: string }
  steps: { title: string; subtitle: string; items: StepItem[] }
  materials: { title: string; subtitle: string; items: MaterialItem[] }
  sizes: { title: string; subtitle: string; items: string[] }
  quality: { title: string; subtitle: string; items: QualityItem[] }
  shipping: { title: string; subtitle: string; items: ShippingItem[] }
  faq: { title: string; subtitle: string; items: FaqItem[] }
  cta: { title: string; body: string; primary: string; secondary: string }
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
      ],
    },
    cta: {
      title: 'Prêt à composer votre mur ?',
      body:
        'Parcourez la boutique, choisissez votre œuvre et votre matériau. Le prix s’affiche immédiatement.',
      primary: 'Vers la boutique',
      secondary: 'Une question ?',
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
      ],
    },
    cta: {
      title: 'Klaar om uw muur samen te stellen?',
      body:
        'Blader door de boutique, kies uw werk en uw materiaal. De prijs verschijnt meteen.',
      primary: 'Naar de boutique',
      secondary: 'Een vraag?',
    },
  },
}
