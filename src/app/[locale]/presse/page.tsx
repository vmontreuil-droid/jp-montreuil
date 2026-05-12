import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, Mail, Newspaper, Camera, Award, Building2, ArrowRight } from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { localePath } from '@/lib/links'
import { pageMetadata } from '@/lib/og'

/**
 * /[locale]/presse — Press-kit & wholesale info.
 *
 * Skeleton-pagina met sections die JP zelf invult (bio, hi-res
 * photos, expo-history, contact). Voor nu hardcoded placeholder-content
 * in NL+FR; later kan dit uit de DB getrokken worden zoals about_sections.
 */

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    locale: locale as Locale,
    title: locale === 'fr' ? 'Espace presse & galeries' : 'Pers & galerijen',
    description: locale === 'fr'
      ? 'Documents presse, biographie, photos haute résolution et contact wholesale pour galeries et publications.'
      : 'Persdocumenten, biografie, hoge-resolutie foto\'s en wholesale contact voor galerijen en publicaties.',
    path: '/presse',
  })
}

export default async function PressePage({ params }: Props) {
  const { locale: localeParam } = await params
  if (!isLocale(localeParam)) notFound()
  const locale = localeParam as Locale
  const c = content[locale]

  return (
    <main className="bg-(--color-canvas)">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-12 md:pt-20 pb-12">
        <p className="text-(--color-stone) text-xs tracking-[0.3em] uppercase mb-3 inline-flex items-center gap-2">
          <Newspaper className="w-3 h-3 text-(--color-bronze)" /> {c.hero.eyebrow}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-6xl text-(--color-ink) mb-4 leading-[1.05]">
          {c.hero.title}
        </h1>
        <p className="text-lg text-(--color-charcoal) max-w-2xl leading-relaxed">
          {c.hero.subtitle}
        </p>
      </section>

      {/* Quick downloads */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2">
          {c.downloads.title}
        </h2>
        <p className="text-(--color-charcoal) mb-8 max-w-xl">{c.downloads.subtitle}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {c.downloads.items.map((d, i) => (
            <a
              key={i}
              href={d.href}
              className={`bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze) p-5 transition-colors ${
                d.href === '#' ? 'opacity-50 pointer-events-none' : ''
              }`}
              {...(d.href !== '#' ? { download: true } : {})}
            >
              <Download className="w-5 h-5 text-(--color-bronze) mb-3" />
              <h3 className="font-medium text-(--color-ink) mb-1">{d.title}</h3>
              <p className="text-xs text-(--color-charcoal)">{d.body}</p>
              {d.href === '#' && (
                <p className="text-[10px] text-(--color-stone) mt-2 italic">
                  {c.downloads.comingSoon}
                </p>
              )}
            </a>
          ))}
        </div>
      </section>

      {/* Bio kort */}
      <section className="bg-(--color-paper) border-y border-(--color-frame)">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2 inline-flex items-center gap-2">
            <Camera className="w-5 h-5 text-(--color-bronze)" /> {c.bio.title}
          </h2>
          <p className="text-(--color-charcoal) mb-6">{c.bio.subtitle}</p>
          {c.bio.paragraphs.map((p, i) => (
            <p key={i} className="text-(--color-ink) leading-relaxed mb-4">
              {p}
            </p>
          ))}
          <Link
            href={localePath(locale, '/a-propos')}
            className="inline-flex items-center gap-2 text-sm text-(--color-bronze) hover:text-(--color-bronze-dark) transition-colors"
          >
            {c.bio.fullLink} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Expositions */}
      {c.exhibitions.items.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2 inline-flex items-center gap-2">
            <Award className="w-5 h-5 text-(--color-bronze)" /> {c.exhibitions.title}
          </h2>
          <p className="text-(--color-charcoal) mb-8">{c.exhibitions.subtitle}</p>
          <ul className="space-y-3">
            {c.exhibitions.items.map((e, i) => (
              <li key={i} className="flex items-baseline gap-4 border-b border-(--color-frame) pb-3">
                <span className="font-mono text-xs text-(--color-bronze) w-12 shrink-0">{e.year}</span>
                <span className="flex-1">
                  <span className="block text-(--color-ink) font-medium">{e.title}</span>
                  {e.location && <span className="block text-xs text-(--color-stone)">{e.location}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Wholesale */}
      <section className="bg-(--color-paper) border-y border-(--color-frame)">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-(--color-ink) mb-2 inline-flex items-center gap-2">
            <Building2 className="w-5 h-5 text-(--color-bronze)" /> {c.wholesale.title}
          </h2>
          <p className="text-(--color-charcoal) mb-6 max-w-2xl">{c.wholesale.subtitle}</p>
          <ul className="space-y-2 text-sm text-(--color-ink) mb-8">
            {c.wholesale.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-(--color-bronze) mt-0.5">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-(--color-ink) mb-4">
          {c.contact.title}
        </h2>
        <p className="text-(--color-charcoal) mb-6 max-w-xl mx-auto">{c.contact.body}</p>
        <a
          href="mailto:jp@montreuil.be?subject=Demande%20presse%20%2F%20galerie"
          className="inline-flex items-center gap-2 px-7 py-4 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-[0.2em]"
        >
          <Mail className="w-4 h-4" />
          {c.contact.cta}
        </a>
        <p className="text-xs text-(--color-stone) mt-4">
          jp@montreuil.be
        </p>
      </section>
    </main>
  )
}

/* --------------------------------------------------------------------- */
/* Inhoud                                                                 */
/* --------------------------------------------------------------------- */

type Content = {
  hero: { eyebrow: string; title: string; subtitle: string }
  downloads: {
    title: string
    subtitle: string
    comingSoon: string
    items: Array<{ title: string; body: string; href: string }>
  }
  bio: { title: string; subtitle: string; paragraphs: string[]; fullLink: string }
  exhibitions: { title: string; subtitle: string; items: Array<{ year: string; title: string; location?: string }> }
  wholesale: { title: string; subtitle: string; benefits: string[] }
  contact: { title: string; body: string; cta: string }
}

const content: Record<Locale, Content> = {
  fr: {
    hero: {
      eyebrow: 'Espace presse & galeries',
      title: 'Pour journalistes, galeries et collectionneurs',
      subtitle:
        'Tout ce qu\'il faut pour parler du travail de Jean-Pierre Montreuil — biographie, photos en haute résolution, historique d\'expositions, et contact direct pour les commandes wholesale.',
    },
    downloads: {
      title: 'Téléchargements',
      subtitle: 'Documents prêts à l\'emploi pour vos publications.',
      comingSoon: 'À paraître',
      items: [
        { title: 'Dossier de presse PDF', body: 'Biographie + démarche + 5 photos en haute résolution.', href: '#' },
        { title: 'Pack photos haute résolution', body: 'Sélection de 12 œuvres représentatives, 300 DPI, libres de droits pour usage éditorial.', href: '#' },
        { title: 'Logo & charte graphique', body: 'Logo en noir, blanc et bronze (SVG + PNG).', href: '#' },
        { title: 'Portrait de l\'artiste', body: 'Photo professionnelle en couleur et noir/blanc.', href: '#' },
        { title: 'Texte court (150 mots)', body: 'Présentation pour cartel, flyer ou catalogue.', href: '#' },
        { title: 'Texte long (500 mots)', body: 'Article complet sur le parcours et la démarche.', href: '#' },
      ],
    },
    bio: {
      title: 'Biographie',
      subtitle: 'En quelques lignes — pour la version complète, voir la page À propos.',
      paragraphs: [
        // À remplir par JP — voici un placeholder
        'Jean-Pierre Montreuil est un artiste peintre belge spécialisé dans la peinture animalière. Né en 19XX, il développe son œuvre depuis l\'atelier familial à XX.',
        'Son travail explore la relation entre l\'humain et le monde animal, à travers la peinture à l\'huile et la photographie. Ses œuvres ont été exposées à XX, XX et XX.',
        'Il vit et travaille en Belgique.',
      ],
      fullLink: 'Lire la biographie complète',
    },
    exhibitions: {
      title: 'Expositions principales',
      subtitle: 'Une sélection — la liste complète est disponible sur demande.',
      items: [
        // À compléter par JP
        { year: '2025', title: 'Solo show — TBD', location: 'Galerie XX, Bruxelles' },
        { year: '2023', title: 'Group show — Wildlife', location: 'XX, XX' },
        { year: '2021', title: 'Premier solo show', location: 'XX, XX' },
      ],
    },
    wholesale: {
      title: 'Pour galeries & revendeurs',
      subtitle:
        'Vous représentez une galerie, une boutique de cadres ou un espace dédié à l\'art animalier ? Nous proposons des conditions wholesale sur les tirages photographiques.',
      benefits: [
        'Remise de 30 à 40 % sur les tirages selon volume',
        'Catalogue complet (60+ œuvres) en haute résolution',
        'Production en blanc — possibilité de packaging à votre nom',
        'Délais courts (10-14 jours) pour les formats standards',
        'Reprise des invendus après 6 mois (conditions sur demande)',
      ],
    },
    contact: {
      title: 'Une demande presse ou wholesale ?',
      body: 'Jean-Pierre répond personnellement sous 48 heures. Précisez votre publication ou structure et le contexte.',
      cta: 'Écrire à Jean-Pierre',
    },
  },

  nl: {
    hero: {
      eyebrow: 'Pers & galerijen',
      title: 'Voor journalisten, galerijen en verzamelaars',
      subtitle:
        'Alles wat u nodig heeft om het werk van Jean-Pierre Montreuil te bespreken — biografie, foto\'s in hoge resolutie, expositie-overzicht en direct contact voor wholesale-bestellingen.',
    },
    downloads: {
      title: 'Downloads',
      subtitle: 'Klare-voor-gebruik documenten voor uw publicatie.',
      comingSoon: 'Binnenkort',
      items: [
        { title: 'Persdossier PDF', body: 'Biografie + werkwijze + 5 hoge-resolutie foto\'s.', href: '#' },
        { title: 'Foto-pack hoge resolutie', body: 'Selectie van 12 representatieve werken, 300 DPI, vrij van rechten voor redactioneel gebruik.', href: '#' },
        { title: 'Logo & huisstijl', body: 'Logo in zwart, wit en brons (SVG + PNG).', href: '#' },
        { title: 'Portret van de kunstenaar', body: 'Professionele foto in kleur en zwart-wit.', href: '#' },
        { title: 'Korte tekst (150 woorden)', body: 'Presentatie voor zaalkaartje, flyer of catalogus.', href: '#' },
        { title: 'Lange tekst (500 woorden)', body: 'Volledig artikel over het parcours en de werkwijze.', href: '#' },
      ],
    },
    bio: {
      title: 'Biografie',
      subtitle: 'In het kort — voor de volledige versie, zie de Over-pagina.',
      paragraphs: [
        // In te vullen door JP — placeholder
        'Jean-Pierre Montreuil is een Belgische kunstschilder gespecialiseerd in dierenkunst. Geboren in 19XX, ontwikkelt hij zijn werk vanuit het familieatelier in XX.',
        'Zijn werk verkent de relatie tussen mens en dierenwereld, via olieverf en fotografie. Zijn werken werden tentoongesteld in XX, XX en XX.',
        'Hij woont en werkt in België.',
      ],
      fullLink: 'Lees de volledige biografie',
    },
    exhibitions: {
      title: 'Belangrijkste tentoonstellingen',
      subtitle: 'Een selectie — de volledige lijst is op aanvraag beschikbaar.',
      items: [
        { year: '2025', title: 'Solo show — TBD', location: 'Galerij XX, Brussel' },
        { year: '2023', title: 'Group show — Wildlife', location: 'XX, XX' },
        { year: '2021', title: 'Eerste solo show', location: 'XX, XX' },
      ],
    },
    wholesale: {
      title: 'Voor galerijen & wederverkopers',
      subtitle:
        'Vertegenwoordigt u een galerij, lijstwinkel of een ruimte gewijd aan dierenkunst? Wij bieden wholesale-condities op de fotoprints.',
      benefits: [
        'Korting van 30 tot 40 % op prints volgens volume',
        'Volledige catalogus (60+ werken) in hoge resolutie',
        'Witte productie — packaging op uw naam mogelijk',
        'Korte levertijden (10-14 dagen) voor standaard formaten',
        'Terugname van onverkocht na 6 maanden (voorwaarden op aanvraag)',
      ],
    },
    contact: {
      title: 'Een pers- of wholesale-vraag?',
      body: 'Jean-Pierre antwoordt persoonlijk binnen 48 uur. Vermeld uw publicatie of structuur en de context.',
      cta: 'Schrijf naar Jean-Pierre',
    },
  },
}
