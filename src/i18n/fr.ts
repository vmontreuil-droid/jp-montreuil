const dict = {
  brand: 'Atelier Montreuil',
  tagline: "L'intermédiaire entre vous et la toile",

  nav: {
    home: 'Accueil',
    collection: 'Collection',
    about: 'À propos',
    social: 'Réseaux sociaux',
    contact: 'Contact',
    devis: 'Devis sur mesure',
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
      sendFailed: "Impossible d'envoyer le lien pour le moment. Réessayez dans quelques instants.",
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

  devis: {
    eyebrow: 'Atelier Montreuil',
    title: 'Devis sur mesure',
    lead: "Une œuvre unique, faite pour vous. Choisissez la technique et le format, partagez vos photos de référence et recevez un devis personnalisé.",
    introTitle: 'Supports & techniques',
    introBody: [
      'Réalisations sur papier aquarelle ou toile de lin, selon la nature du projet.',
      'Formats entièrement personnalisés.',
      'Techniques : crayon noir & blanc, aquarelle couleur, acrylique sur toile.',
      'Encadrement possible en option.',
      'Chaque commande fait l’objet d’un devis sur mesure. Un acompte est demandé pour validation avant exécution.',
    ],

    techniqueLabel: 'Technique souhaitée',
    techniqueOptions: {
      crayon_nb: 'Crayon noir & blanc',
      aquarelle_couleur: 'Aquarelle couleur',
      acrylique_toile: 'Acrylique sur toile',
      autre: 'À discuter',
    },
    supportLabel: 'Support',
    supportOptions: {
      papier_aquarelle: 'Papier aquarelle',
      toile_lin: 'Toile de lin',
      peu_importe: 'Peu importe — à discuter',
    },
    sizeLabel: 'Format souhaité',
    widthLabel: 'Largeur (cm)',
    heightLabel: 'Hauteur (cm)',
    sizeHint: 'Optionnel — laissez vide si vous hésitez encore, nous en discuterons ensemble.',

    framingLabel: 'Encadrement',
    framingOptions: {
      oui: 'Oui, je souhaite un encadrement',
      non: 'Non, sans encadrement',
      peu_importe: 'À discuter',
    },

    nameLabel: 'Nom complet',
    namePlaceholder: 'Jean Dupont',
    emailLabel: 'Adresse e-mail',
    emailPlaceholder: 'jean@exemple.be',
    phoneLabel: 'Numéro de téléphone',
    phonePlaceholder: '+32 470 12 34 56',
    budgetLabel: 'Budget indicatif (optionnel)',
    budgetPlaceholder: 'Ex. 500–800 €',

    messageLabel: 'Décrivez votre projet',
    messagePlaceholder: 'Sujet, ambiance, occasion, palette de couleurs, contraintes …',

    referencesLabel: 'Photos de référence',
    referencesHint: 'Photo d’une personne, d’un lieu ou d’une inspiration. JPG/PNG/WEBP — 5 max, 10 Mo par fichier.',
    chooseFiles: 'Glissez vos photos ici ou cliquez pour les sélectionner.',
    removeFile: 'Supprimer',

    sendBtn: 'Envoyer la demande',
    sending: 'Envoi en cours…',
    successTitle: 'Demande reçue',
    successBody: 'Merci, votre demande est bien arrivée. Jean-Pierre vous répond avec un devis sur mesure dans les jours qui suivent.',
    successCta: 'Nouvelle demande',

    errors: {
      required: 'Tous les champs marqués d’un * sont obligatoires.',
      email: 'Adresse e-mail invalide.',
      tooShort: 'Décrivez votre projet en quelques mots.',
      tooLong: 'Message trop long.',
      tooManyFiles: 'Maximum 5 photos.',
      fileTooBig: 'Photo trop volumineuse (max 10 Mo).',
      unsupportedFile: 'Format non supporté.',
      server: 'Une erreur est survenue. Veuillez réessayer.',
    },

    askedFields: 'Champs requis *',
  },
}

export type Dictionary = typeof dict
export default dict
