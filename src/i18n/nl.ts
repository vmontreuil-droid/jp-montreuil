import type { Dictionary } from './fr'

const dict: Dictionary = {
  brand: 'Atelier Montreuil',
  tagline: 'De tussenpersoon tussen u en het doek',

  nav: {
    home: 'Home',
    collection: 'Gallerij',
    about: 'Over mij',
    contact: 'Contact',
  },

  home: {
    intro:
      'Kunstenaar Jean-Pierre Montreuil laat zich vooral inspireren door het dierenrijk: paarden, honden, katten en vogels vormen de hoofdthema\'s.',
    seeCollection: 'Bekijk de gallerij',
  },

  contact: {
    title: 'Contact',
    name: 'Naam',
    email: 'E-mail',
    message: 'Bericht',
    send: 'Versturen',
    success: 'Bedankt voor uw bericht. Het is verzonden.',
    error: 'Er is een fout opgetreden. Probeer het opnieuw.',
    address: 'Heuntjesstraat 6, 8570 Anzegem',
    phone: '+32 475 61 68 38',
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
}

export default dict
