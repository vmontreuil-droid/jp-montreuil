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
    title: locale === 'fr' ? 'Politique de confidentialité' : 'Privacybeleid',
  }
}

export default async function PrivacyPage({ params }: Props) {
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
          {isNL ? 'Privacybeleid' : 'Politique de confidentialité'}
        </h1>
        <p className="mt-3 text-sm text-(--color-stone)">
          {isNL ? 'Conform de Algemene Verordening Gegevensbescherming (AVG/GDPR).' : 'Conforme au Règlement Général sur la Protection des Données (RGPD).'}
        </p>
      </header>

      <div className="text-(--color-charcoal) space-y-8 leading-relaxed">
        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? '1. Verantwoordelijke voor de verwerking' : '1. Responsable du traitement'}
          </h2>
          <p>
            <strong>Jean-Pierre Montreuil</strong>
            <br />
            Heuntjesstraat 6, 8570 Anzegem, {isNL ? 'België' : 'Belgique'}
            <br />
            E-mail :{' '}
            <a href="mailto:jp@montreuil.be" className="hover:text-(--color-bronze)">
              jp@montreuil.be
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? '2. Welke gegevens verzamelen wij?' : '2. Quelles données collectons-nous ?'}
          </h2>
          <p className="mb-3">
            {isNL
              ? 'Wij verzamelen alleen de strikt noodzakelijke gegevens om uw vraag te beantwoorden:'
              : 'Nous ne collectons que les données strictement nécessaires pour répondre à votre demande :'}
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>{isNL ? 'Naam' : 'Nom'}</li>
            <li>{isNL ? 'E-mailadres' : 'Adresse e-mail'}</li>
            <li>{isNL ? 'Inhoud van uw bericht' : 'Contenu de votre message'}</li>
            <li>{isNL ? 'IP-adres en browsertype (technisch, voor anti-spam)' : 'Adresse IP et type de navigateur (technique, anti-spam)'}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? '3. Doel van de verwerking' : '3. Finalité du traitement'}
          </h2>
          <p>
            {isNL
              ? 'Uw gegevens worden uitsluitend gebruikt om uw bericht te beantwoorden. Wij gebruiken ze niet voor commerciële doeleinden, marketing of nieuwsbrieven, en delen ze niet met derden voor commerciële doeleinden.'
              : 'Vos données sont utilisées uniquement pour répondre à votre message. Elles ne sont pas utilisées à des fins commerciales, marketing ou newsletter, et ne sont pas partagées avec des tiers à des fins commerciales.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? '4. Rechtsgrond' : '4. Base légale'}
          </h2>
          <p>
            {isNL
              ? 'De verwerking is gebaseerd op uw toestemming (artikel 6.1.a AVG) door het versturen van het contactformulier, en op het gerechtvaardigd belang om u een antwoord te kunnen geven.'
              : 'Le traitement est fondé sur votre consentement (article 6.1.a RGPD) en envoyant le formulaire de contact, et sur l\'intérêt légitime à pouvoir vous répondre.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? '5. Bewaartermijn' : '5. Durée de conservation'}
          </h2>
          <p>
            {isNL
              ? 'Berichten worden bewaard zolang nodig om uw vraag op te volgen, met een maximum van 3 jaar. Daarna worden ze definitief verwijderd.'
              : 'Les messages sont conservés le temps nécessaire au suivi de votre demande, avec un maximum de 3 ans. Ils sont ensuite définitivement supprimés.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? '6. Externe dienstverleners' : '6. Sous-traitants'}
          </h2>
          <p className="mb-3">
            {isNL ? 'Wij maken gebruik van:' : 'Nous faisons appel à :'}
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Vercel Inc.</strong> ({isNL ? 'hosting van de website' : 'hébergement du site'})
            </li>
            <li>
              <strong>Supabase</strong> ({isNL ? 'database en bestandsopslag, EU-regio' : 'base de données et stockage, région UE'})
            </li>
          </ul>
          <p className="mt-3">
            {isNL
              ? 'Beide dienstverleners hebben passende verwerkersovereenkomsten en bieden een AVG-conform niveau van bescherming.'
              : 'Les deux fournisseurs disposent d\'accords de sous-traitance appropriés et offrent un niveau de protection conforme au RGPD.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? '7. Cookies' : '7. Cookies'}
          </h2>
          <p>
            {isNL
              ? 'Deze website gebruikt geen tracking-cookies, geen analyse-cookies en geen marketing-cookies. Enkel technisch noodzakelijke cookies (zoals taalvoorkeur en thema-keuze) worden lokaal in uw browser opgeslagen — die worden niet doorgestuurd naar derden.'
              : 'Ce site n\'utilise aucun cookie de pistage, ni d\'analyse, ni de marketing. Seuls des cookies strictement techniques (préférence de langue, choix de thème) sont stockés localement dans votre navigateur — ils ne sont pas transmis à des tiers.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? '8. Uw rechten' : '8. Vos droits'}
          </h2>
          <p className="mb-3">
            {isNL
              ? 'In overeenstemming met de AVG heeft u het recht op:'
              : 'Conformément au RGPD, vous disposez des droits suivants :'}
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>{isNL ? 'Toegang tot uw gegevens' : 'Accès à vos données'}</li>
            <li>{isNL ? 'Rechtzetting (correctie)' : 'Rectification'}</li>
            <li>{isNL ? 'Wissing ("recht om vergeten te worden")' : 'Effacement (« droit à l\'oubli »)'}</li>
            <li>{isNL ? 'Beperking van de verwerking' : 'Limitation du traitement'}</li>
            <li>{isNL ? 'Overdraagbaarheid' : 'Portabilité'}</li>
            <li>{isNL ? 'Bezwaar tegen verwerking' : 'Opposition au traitement'}</li>
          </ul>
          <p className="mt-3">
            {isNL ? 'Stuur een e-mail naar' : 'Envoyez un e-mail à'}{' '}
            <a href="mailto:jp@montreuil.be" className="hover:text-(--color-bronze)">
              jp@montreuil.be
            </a>{' '}
            {isNL ? 'om één van deze rechten uit te oefenen.' : 'pour exercer l\'un de ces droits.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl text-(--color-ink) mb-3">
            {isNL ? '9. Klachten' : '9. Plaintes'}
          </h2>
          <p>
            {isNL ? 'U heeft het recht een klacht in te dienen bij de Belgische Gegevensbeschermingsautoriteit:' : 'Vous avez le droit d\'introduire une plainte auprès de l\'Autorité de Protection des Données belge :'}
            <br />
            <a
              href="https://www.gegevensbeschermingsautoriteit.be/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-(--color-bronze)"
            >
              gegevensbeschermingsautoriteit.be
            </a>
          </p>
        </section>
      </div>
    </article>
  )
}
