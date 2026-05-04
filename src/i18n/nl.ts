import type { Dictionary } from './fr'

const dict: Dictionary = {
  brand: 'Atelier Montreuil',
  tagline: 'De tussenpersoon tussen u en het doek',

  nav: {
    home: 'Home',
    collection: 'Gallerij',
    about: 'Over mij',
    social: 'Sociale media',
    contact: 'Contact',
    devis: 'Offerte op maat',
  },

  home: {
    intro:
      "De kunstenaar Jean-Pierre Montreuil laat zich vooral inspireren door het dierenrijk: paarden, honden, katten en vogels vormen zijn belangrijkste thema's. Ze maken deel uit van zijn dagelijks leven en komen terug in verschillende artistieke vormen. De schilder begint meestal met de ogen voordat hij zijn werk verder uitwerkt. Alles wordt op maat gemaakt.",
    seeCollection: 'Bekijk de gallerij',
  },

  contact: {
    title: 'Contact',
    name: 'Naam',
    email: 'E-mail',
    phone: 'Telefoon',
    message: 'Bericht',
    send: 'Versturen',
    success: 'Bedankt voor uw bericht. Wij beantwoorden u binnen de 48 uur.',
    error: 'Er is een fout opgetreden. Probeer het opnieuw.',
    files: "Foto's (optioneel)",
    filesHelp: "Sleep uw foto's hier of klik om ze te selecteren.",
    filesQuality: "Foto's van de beste kwaliteit mogelijk.",
    filesAdd: "Foto's toevoegen",
    removeFile: 'Verwijderen',
    responseTime: 'Wij beantwoorden u binnen de 48 uur.',
    address: 'Heuntjesstraat 6, 8570 Anzegem',
    phoneValue: '+32 475 61 68 38',
    emailValue: 'jp@montreuil.be',
  },

  about: {
    title: 'Over mij',
  },

  notFound: {
    title: 'Pagina niet gevonden',
    message: 'De pagina die u zoekt bestaat niet.',
    back: 'Terug naar de homepagina',
  },

  footer: {
    rights: 'Alle rechten voorbehouden',
  },

  og: {
    title: 'Atelier Montreuil — Jean-Pierre Montreuil',
    description:
      'De tussenpersoon tussen u en het doek. Schilderijen, portretten, bronzen — Jean-Pierre Montreuil.',
  },

  portail: {
    espaceClient: 'Klantenportaal',
    signOut: 'Afmelden',
    nav: {
      orders: 'Mijn bestellingen',
      albums: 'Mijn albums',
      account: 'Mijn account',
    },
    login: {
      titlePassword: 'Inloggen',
      titleMagic: 'Magische link',
      modePasswordLabel: 'Wachtwoord',
      modeMagicLabel: 'Magische link',
      intro: 'Log in op uw klantenportaal om uw bestelling op te volgen.',
      introMagic: 'Ontvang een login-link per e-mail. Geen wachtwoord te onthouden.',
      emailLabel: 'E-mail',
      emailPlaceholder: 'u@voorbeeld.com',
      passwordLabel: 'Wachtwoord',
      passwordPlaceholder: '••••••••',
      submit: 'Stuur de link',
      submitPassword: 'Inloggen',
      forgotPassword: 'Wachtwoord vergeten?',
      hint: 'Gebruik het e-mailadres dat aan uw bestelling of album gekoppeld is.',
      invalidEmail: 'Ongeldig e-mailadres',
      invalidCredentials: 'E-mail of wachtwoord is onjuist.',
      rateLimited: 'Te veel pogingen. Probeer binnen enkele minuten opnieuw.',
      unknownEmail: 'Er bestaat geen account met dit e-mailadres. Controleer de spelling of neem contact op met Jean-Pierre.',
      sendFailed: 'De link kan momenteel niet verstuurd worden. Probeer het over enkele ogenblikken opnieuw.',
      expired: 'De link is verlopen. Vraag hieronder een nieuwe aan.',
      wrongAccount: 'Dit dossier hoort bij een ander e-mailadres. Log in met het adres dat u bij uw aanvraag gebruikte.',
      sentTitle: 'Controleer uw e-mail',
      sentBody: 'Een login-link is verstuurd naar',
      sentExpiry: 'Klik op de link in de e-mail om uw portaal te openen. De link vervalt na 1 uur.',
      resetSentTitle: 'E-mail verzonden',
      resetSentBody: 'Een reset-link is verstuurd naar',
      resetSentExpiry: 'Klik op de link in de e-mail om een nieuw wachtwoord te kiezen. De link vervalt na 1 uur.',
      retryQuestion: 'Niets ontvangen? Controleer uw spam, of',
      retryAction: 'probeer opnieuw',
    },
    reset: {
      title: 'Kies een nieuw wachtwoord',
      lead: 'Stel een wachtwoord in voor uw klantenportaal.',
      newPasswordLabel: 'Nieuw wachtwoord',
      newPasswordPlaceholder: 'Minstens 8 tekens',
      confirmPasswordLabel: 'Wachtwoord bevestigen',
      submit: 'Bewaren',
      saving: 'Bewaren…',
      successTitle: 'Wachtwoord bewaard',
      successBody: 'U bent nu ingelogd. U kunt uw klantenportaal openen.',
      goToPortal: 'Open mijn portaal',
      errors: {
        tooShort: 'Het wachtwoord moet minstens 8 tekens bevatten.',
        mismatch: 'De twee wachtwoorden komen niet overeen.',
        notAuthenticated: 'Link verlopen. Vraag een nieuwe aan via de loginpagina.',
        server: 'Er is een fout opgetreden. Probeer opnieuw.',
      },
    },
    account: {
      title: 'Mijn account',
      emailLabel: 'E-mailadres',
      passwordSection: 'Wachtwoord wijzigen',
      currentPasswordLabel: 'Huidig wachtwoord',
      newPasswordLabel: 'Nieuw wachtwoord',
      confirmPasswordLabel: 'Nieuw wachtwoord bevestigen',
      submit: 'Bijwerken',
      saving: 'Bijwerken…',
      success: 'Wachtwoord bijgewerkt.',
      backToPortal: 'Terug naar mijn portaal',
      errors: {
        tooShort: 'Het wachtwoord moet minstens 8 tekens bevatten.',
        mismatch: 'De twee wachtwoorden komen niet overeen.',
        wrongCurrent: 'Huidig wachtwoord is onjuist.',
        server: 'Er is een fout opgetreden.',
      },
      message: {
        title: 'Een vraag voor Jean-Pierre?',
        lead: 'Schrijf hem rechtstreeks vanuit uw portaal — hij antwoordt per e-mail.',
        placeholder: 'Uw bericht…',
        submit: 'Verstuur naar Jean-Pierre',
        sending: 'Versturen…',
        success: 'Bericht verstuurd.',
        successHint: 'Jean-Pierre heeft uw bericht goed ontvangen en antwoordt per e-mail.',
      },
    },
    dashboard: {
      eyebrow: 'Atelier Montreuil',
      welcome: 'Welkom',
      lead: "Uw fotoalbums in één oogopslag.",
      empty: 'Nog geen album gedeeld met dit e-mailadres.',
      emptyHint: 'Verwachtte u een album? Neem contact op met Jean-Pierre — hij controleert het e-mailadres dat met uw account verbonden is.',
      photoSingular: 'foto',
      photoPlural: "foto's",
      seeAlbum: 'Bekijk het album',
    },
    album: {
      backToAlbums: 'Mijn albums',
      forbiddenTitle: 'Geen toegang',
      forbiddenBody: 'Dit album is niet gekoppeld aan uw e-mailadres. Denkt u dat dit een fout is, neem dan contact op met Jean-Pierre.',
      backFull: 'Terug naar mijn albums',
    },
    albumsSectionTitle: 'Mijn albums',
    albumsSectionLead: 'Uw fotoalbums in één oogopslag.',
    commissions: {
      sectionTitle: 'Mijn bestellingen',
      sectionLead: 'Opvolging van uw offertes en lopende bestellingen.',
      empty: 'Nog geen lopende bestellingen.',
      statusLabel: 'Status',
      viewDevis: 'Bekijk & onderteken offerte',
      viewStatus: 'Bekijk opvolging',
      askedFor: 'Aanvraag verzonden op',
    },
  },

  devis: {
    eyebrow: 'Atelier Montreuil',
    title: 'Offerte op maat',
    lead: 'Een uniek werk, voor u gemaakt. Kies techniek en formaat, deel uw referentiefoto’s en ontvang een offerte op maat.',
    introTitle: 'Dragers & technieken',
    introBody: [
      'Werken op aquarelpapier of linnen doek, naargelang het project.',
      'Formaten volledig op maat.',
      'Technieken: zwart-wit potlood, kleur aquarel, acryl op linnen.',
      'Inkadering mogelijk als optie.',
      'Uitvoeringstermijn: 5 tot 20 werkdagen na de aanvraag.',
      'Elke opdracht krijgt een offerte op maat. Een voorschot van 50 % wordt gevraagd ter validatie vóór de uitvoering.',
    ],

    discussModeLabel: 'Ik bespreek het liever rechtstreeks met Jean-Pierre',
    discussModeHint: 'Ideaal voor een volledig op maat gemaakt project, buiten de standaardopties. Beschrijf hieronder wat u in gedachten heeft.',

    techniqueLabel: 'Gewenste techniek',
    techniqueOptions: {
      crayon_nb: 'Zwart-wit potlood',
      aquarelle_couleur: 'Kleur aquarel',
      acrylique_toile: 'Acryl op linnen',
    },
    supportLabel: 'Drager',
    supportOptions: {
      papier_aquarelle: 'Aquarelpapier',
      toile_lin: 'Linnen doek',
    },
    sizeLabel: 'Gewenst formaat',
    formatOptions: {
      '40x60': '40 × 60 cm',
      '57x77': '57 × 77 cm',
      '60x90': '60 × 90 cm',
      '130x160': '130 × 160 cm',
      custom: 'Ander formaat',
    },
    widthLabel: 'Breedte (cm)',
    heightLabel: 'Hoogte (cm)',
    sizeHint: 'Geef exacte afmetingen voor een formaat op maat.',

    portraitCountLabel: 'Aantal portretten',
    portraitCountHint: 'Geef aan hoeveel personen of dieren op het werk staan.',

    supplementsLabel: 'Gewenste supplementen',
    supplementsHint: 'Vink aan wat van toepassing is — deze worden verwerkt in de offerte.',
    supplementOptions: {
      background: 'Bewerkte achtergrond (landschap, interieur…)',
      complex_decor: 'Complex decor',
      high_detail: 'Hoog detailniveau',
      hyperrealism: 'Hyper-realisme',
    },

    framingLabel: 'Inkadering',
    framingOptions: {
      oui: 'Ja, ik wens een inkadering',
      non: 'Nee, zonder inkadering',
    },
    frameTypeLabel: 'Inkadering',
    frameTypeOptions: {
      aucun: 'Zonder kader',
      simple: 'Met kader',
    },

    nameLabel: 'Volledige naam',
    namePlaceholder: 'Jan Jansen',
    emailLabel: 'E-mailadres',
    emailPlaceholder: 'jan@voorbeeld.be',
    phoneLabel: 'Telefoonnummer',
    phonePlaceholder: '+32 470 12 34 56',
    estimateLabel: 'Indicatieve prijs — detail',
    estimateTotal: 'Totaal',
    estimateHint: 'Schatting op basis van uw keuzes. De definitieve prijs staat in de offerte op maat die Jean-Pierre u stuurt.',
    estimateCustom: 'Op aanvraag',

    messageLabel: 'Beschrijf uw project',
    messagePlaceholder: 'Onderwerp, sfeer, gelegenheid, kleurenpalet, randvoorwaarden …',

    referencesLabel: 'Referentiefoto’s',
    referencesHint: 'Foto’s van de best mogelijke kwaliteit — een te wazige of te kleine foto kan geweigerd worden. Alle beeldformaten aanvaard, max 5, 10 MB per bestand.',
    chooseFiles: 'Sleep uw foto’s hier of klik om te selecteren.',
    removeFile: 'Verwijderen',

    sendBtn: 'Aanvraag versturen',
    sending: 'Verzenden…',
    successTitle: 'Aanvraag ontvangen',
    successBody: 'Bedankt, uw aanvraag is goed binnengekomen. Jean-Pierre stuurt u in de komende dagen een offerte op maat.',
    successCta: 'Nieuwe aanvraag',

    errors: {
      required: 'Alle velden met een * zijn verplicht.',
      email: 'Ongeldig e-mailadres.',
      phone: 'Geef een telefoonnummer op.',
      tooShort: 'Beschrijf uw project in een paar woorden.',
      tooLong: 'Bericht te lang.',
      tooManyFiles: 'Maximum 5 foto’s.',
      fileTooBig: 'Foto te groot (max 10 MB).',
      unsupportedFile: 'Niet-ondersteund formaat.',
      referencesRequired: 'Voeg minstens één referentiefoto toe.',
      server: 'Er is een fout opgetreden. Probeer het opnieuw.',
    },

    askedFields: 'Verplichte velden *',

    howItWorksTitle: 'Hoe werkt het',
    howItWorksLead: 'Van uw aanvraag tot de levering van het werk, in zes eenvoudige stappen.',
    howItWorksSteps: [
      {
        title: '1. U beschrijft uw project',
        body: 'Kies de techniek, het formaat en upload uw referentiefoto’s.',
      },
      {
        title: '2. Jean-Pierre bestudeert uw aanvraag',
        body: 'Binnen enkele dagen ontvangt u een offerte op maat per e-mail.',
      },
      {
        title: '3. U ondertekent online',
        body: 'Digitale handtekening — geen papier, geen verplaatsing nodig.',
      },
      {
        title: '4. Voorschot van 50 %',
        body: 'Via klassieke overschrijving of in één tik via QR code Bancontact.',
      },
      {
        title: '5. Uitvoering',
        body: 'Termijn van 5 tot 20 werkdagen, afhankelijk van de complexiteit.',
      },
      {
        title: '6. Levering',
        body: 'Werk persoonlijk overhandigd of verstuurd. Saldo te betalen bij levering.',
      },
    ],

    examplesTitle: 'Enkele voorbeelden',
    examplesLead: 'Een blik op eerdere realisaties — ter inspiratie.',
    examplesViewAll: 'Bekijk de volledige collectie',

    ctaTitle: 'Klaar om te bestellen?',
    ctaLead: 'Vul het formulier hieronder in. Binnen 48 uur ontvangt u uw offerte op maat.',

    statusLabels: {
      nieuw: 'Ontvangen',
      in_behandeling: 'In behandeling',
      devis_envoye: 'Offerte verzonden',
      signe: 'Offerte ondertekend',
      refuse: 'Geweigerd',
      acompte_recu: 'Voorschot ontvangen',
      en_cours: 'In uitvoering',
      livre: 'Afgeleverd',
      complete: 'Afgerond',
    },
  },

  devisSign: {
    eyebrow: 'Atelier Montreuil',
    portalTitle: 'Uw offerte',
    introTitle: 'Detail van de offerte',
    devisNumber: 'Nummer',
    issuedFor: 'Opgesteld voor',
    validUntil: 'Geldig tot',
    technique: 'Techniek',
    format: 'Formaat',
    support: 'Drager',
    framing: 'Inkadering',
    description: 'Beschrijving',
    qty: 'Aant.',
    unitPrice: 'Prijs',
    lineTotal: 'Totaal',
    subTotal: 'Subtotaal',
    total: 'Te betalen',
    acompteLabel: 'Gevraagd voorschot',
    acompteHint: 'Het voorschot wordt na ondertekening per overschrijving betaald.',
    deliveryNote: 'Uitvoeringstermijn: 5 tot 20 werkdagen na de aanvraag.',

    signTitle: 'Handtekening voor akkoord',
    signLead: 'Door te ondertekenen valideert u de offerte en geeft u groen licht voor de uitvoering.',
    signerNameLabel: 'Uw naam',
    signaturePadLabel: 'Plaats uw handtekening in het kader',
    clearSignature: 'Wissen',
    acceptTerms: 'Ik aanvaard de offerte en de uitvoeringsvoorwaarden.',
    acceptRequired: 'Aanvaard de offerte voor u tekent.',
    signBtn: 'Offerte ondertekenen',
    signing: 'Ondertekenen…',
    signedTitle: 'Bedankt voor uw vertrouwen',
    signedBody: 'Uw offerte is gevalideerd. U kunt het voorschot per overschrijving betalen met onderstaande gegevens.',

    paymentTitle: 'Betaling van het voorschot',
    paymentInstructions:
      'Maak een overschrijving met onderstaande mededeling. Zodra Jean-Pierre het ontvangt, start hij uw werk.',
    paymentBeneficiary: 'Begunstigde',
    paymentIban: 'IBAN',
    paymentAmount: 'Bedrag',
    paymentReference: 'Mededeling',
    paymentRefHint: 'Vermeld exact deze mededeling, zo wordt de betaling herkend.',

    statusTitle: 'Status van uw bestelling',
    statusHint: 'U kunt deze offerte altijd terugvinden via de link in uw e-mail, of door in te loggen op uw klantenportaal.',

    notFoundTitle: 'Offerte niet gevonden',
    notFoundBody: 'Deze link is ongeldig of verlopen. Neem contact op met Jean-Pierre als u denkt dat dit een fout is.',

    errors: {
      signerName: 'Geef uw volledige naam op.',
      signature: 'Plaats uw handtekening.',
      server: 'Er is een fout opgetreden. Probeer opnieuw.',
    },
  },
}

export default dict
