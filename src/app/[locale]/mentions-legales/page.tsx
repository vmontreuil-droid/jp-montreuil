import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isLocale, type Locale } from '@/i18n/config'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return {
    title: locale === 'fr' ? 'Mentions légales' : 'Wettelijke vermeldingen',
  }
}

export default async function LegalPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const isNL = locale === 'nl'

  return (
    <article className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl md:text-5xl text-(--color-ink)">
          {isNL ? 'Wettelijke vermeldingen' : 'Mentions légales'}
        </h1>
      </header>

      <div className="prose prose-invert max-w-none text-(--color-charcoal) space-y-8 leading-relaxed">
        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? 'Uitgever van de website' : 'Éditeur du site'}
          </h2>
          <p>
            <strong>Jean-Pierre Montreuil</strong>
            <br />
            Heuntjesstraat 6, 8570 Anzegem, {isNL ? 'België' : 'Belgique'}
            <br />
            {isNL ? 'Tel.' : 'Tél.'} :{' '}
            <a href="tel:+32475616838" className="hover:text-(--color-bronze)">
              +32 475 61 68 38
            </a>
            <br />
            E-mail :{' '}
            <a href="mailto:jp@montreuil.be" className="hover:text-(--color-bronze)">
              jp@montreuil.be
            </a>
          </p>
          <p className="text-sm text-(--color-stone) mt-2">
            {isNL
              ? 'Statuut: particulier — geen BTW-plicht, geen handelsactiviteit.'
              : 'Statut : particulier — pas d\'assujettissement TVA, aucune activité commerciale.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? 'Hosting' : 'Hébergeur'}
          </h2>
          <p>
            <strong>Vercel Inc.</strong>
            <br />
            340 S Lemon Ave #4133, Walnut, CA 91789, USA
            <br />
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-(--color-bronze)"
            >
              vercel.com
            </a>
          </p>
          <p className="text-sm text-(--color-stone) mt-2">
            {isNL
              ? 'Database en opslag: Supabase (EU regio, Frankfurt).'
              : 'Base de données et stockage : Supabase (région UE, Francfort).'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? 'Auteursrecht en gebruik van afbeeldingen' : 'Droits d\'auteur et usage des images'}
          </h2>
          <p>
            {isNL ? (
              <>
                Alle werken (schilderijen, tekeningen, bronzen, foto&apos;s) en
                hun reproducties op deze website zijn © Jean-Pierre Montreuil.
                Reproductie, kopie, downloaden of verspreiding in welke vorm
                dan ook is verboden zonder schriftelijke toestemming.
              </>
            ) : (
              <>
                Toutes les œuvres (peintures, dessins, bronzes, photographies)
                et leurs reproductions sur ce site sont © Jean-Pierre Montreuil.
                Toute reproduction, copie, téléchargement ou diffusion sous
                quelque forme que ce soit est interdit sans autorisation écrite.
              </>
            )}
          </p>
        </section>

        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? 'Aansprakelijkheid' : 'Responsabilité'}
          </h2>
          <p>
            {isNL
              ? 'De informatie op deze website wordt met zorg opgesteld. De uitgever kan echter niet aansprakelijk worden gesteld voor onnauwkeurigheden, fouten of weglatingen, noch voor de gevolgen van het gebruik van de getoonde informatie.'
              : 'Les informations présentées sur ce site sont rédigées avec soin. L\'éditeur ne peut toutefois être tenu responsable d\'inexactitudes, d\'erreurs ou d\'omissions, ni des conséquences de l\'utilisation des informations affichées.'}
          </p>
        </section>
      </div>
    </article>
  )
}
