const dict = {
  brand: 'Atelier Montreuil',
  tagline: "L'intermédiaire entre vous et la toile",

  nav: {
    home: 'Accueil',
    collection: 'Collection',
    about: 'À propos',
    social: 'Réseaux sociaux',
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

  portail: {
    espaceClient: 'Espace client',
    signOut: 'Déconnexion',
    login: {
      intro: 'Recevez un lien de connexion par e-mail. Aucun mot de passe à retenir.',
      emailLabel: 'E-mail',
      emailPlaceholder: 'vous@example.com',
      submit: 'Envoyer le lien',
      hint: "L'adresse e-mail doit être celle utilisée par Jean-Pierre lors de la création de votre album.",
      invalidEmail: 'Adresse e-mail invalide',
      unknownEmail: "Aucun compte n'est associé à cette adresse. Vérifiez l'orthographe ou contactez Jean-Pierre.",
      expired: 'Le lien a expiré. Demandez-en un nouveau ci-dessous.',
      sentTitle: 'Vérifiez votre e-mail',
      sentBody: 'Un lien de connexion a été envoyé à',
      sentExpiry: "Cliquez sur le lien dans l'e-mail pour accéder à vos photos. Le lien expire après 1 heure.",
      retryQuestion: 'Pas reçu ? Vérifiez vos spams, ou',
      retryAction: 'essayez à nouveau',
    },
    dashboard: {
      eyebrow: 'Atelier Montreuil',
      welcome: 'Bienvenue',
      lead: "Vos albums photo en un coup d'œil.",
      empty: 'Aucun album partagé avec cet e-mail pour le moment.',
      emptyHint: "Si vous attendiez un album, contactez Jean-Pierre — il vérifiera l'adresse associée à votre compte.",
      photoSingular: 'photo',
      photoPlural: 'photos',
      seeAlbum: "Voir l'album",
    },
    album: {
      backToAlbums: 'Mes albums',
      forbiddenTitle: 'Accès non autorisé',
      forbiddenBody: "Cet album n'est pas associé à votre adresse e-mail. Si vous pensez qu'il s'agit d'une erreur, contactez Jean-Pierre.",
      backFull: 'Retour à mes albums',
    },
  },
}

export type Dictionary = typeof dict
export default dict
