const dict = {
  brand: 'Atelier Montreuil',
  tagline: "L'intermédiaire entre vous et la toile",

  nav: {
    home: 'Accueil',
    collection: 'Collection',
    about: 'Réseaux sociaux',
    contact: 'Contact',
  },

  home: {
    intro:
      "L'artiste Jean-Pierre Montreuil s'inspire surtout du règne animal : les chevaux, les chiens, les chats et les oiseaux constituent les thèmes principaux. Ils font partie de sa vie de tous les jours et reviennent sous différentes formes artistiques. L'artiste peintre commence le plus souvent avec les yeux avant d'approfondir son œuvre. Tout est fait sur mesure.",
    seeCollection: 'Voir la collection',
  },

  contact: {
    title: 'Contact',
    name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    message: 'Message',
    send: 'Envoyer',
    success: 'Merci pour votre message. Nous vous répondons dans les 48 heures.',
    error: 'Une erreur est survenue. Veuillez réessayer.',
    files: 'Photos (optionnel)',
    filesHelp: 'Glissez vos photos ici ou cliquez pour les sélectionner.',
    filesQuality: 'Photos de la meilleure qualité possible.',
    filesAdd: 'Ajouter des photos',
    removeFile: 'Supprimer',
    responseTime: 'Nous vous répondons dans les 48 heures.',
    address: 'Heuntjesstraat 6, 8570 Anzegem',
    phoneValue: '+32 475 61 68 38',
    emailValue: 'jp@montreuil.be',
  },

  about: {
    title: 'À propos',
  },

  notFound: {
    title: 'Page introuvable',
    message: "La page que vous cherchez n'existe pas.",
    back: "Retour à l'accueil",
  },

  footer: {
    rights: 'Tous droits réservés',
  },

  og: {
    title: 'Atelier Montreuil — Jean-Pierre Montreuil',
    description:
      "L'intermédiaire entre vous et la toile. Peintures, portraits, bronzes — Jean-Pierre Montreuil.",
  },
}

export type Dictionary = typeof dict
export default dict
