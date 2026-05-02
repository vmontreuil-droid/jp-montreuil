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
    login: {
      intro: 'Ontvang een login-link per e-mail. Geen wachtwoord te onthouden.',
      emailLabel: 'E-mail',
      emailPlaceholder: 'u@voorbeeld.com',
      submit: 'Stuur de link',
      hint: 'Het e-mailadres moet hetzelfde zijn dat Jean-Pierre gebruikt heeft bij het aanmaken van uw album.',
      invalidEmail: 'Ongeldig e-mailadres',
      unknownEmail: 'Er bestaat geen account met dit e-mailadres. Controleer de spelling of neem contact op met Jean-Pierre.',
      sendFailed: 'De link kan momenteel niet verstuurd worden. Probeer het over enkele ogenblikken opnieuw.',
      expired: 'De link is verlopen. Vraag hieronder een nieuwe aan.',
      sentTitle: 'Controleer uw e-mail',
      sentBody: 'Een login-link is verstuurd naar',
      sentExpiry: "Klik op de link in de e-mail om uw foto's te bekijken. De link vervalt na 1 uur.",
      retryQuestion: 'Niets ontvangen? Controleer uw spam, of',
      retryAction: 'probeer opnieuw',
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
  },
}

export default dict
