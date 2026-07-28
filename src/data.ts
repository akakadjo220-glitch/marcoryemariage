import { Partner, DocumentInfo, TimelineStep, AlertNotification } from './types';

export const HERO_COUPLE_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuC33VzOafKJ6Hhmuy4CjXlJwev_p3jt0N81TJTlQzOM-MF7crCfsQJdOYUA3ghhlyi0ozRkVcFMGaQIU8LSavREbzYKS_Bqjqd68esMQTLG1pihxP4pdZeUssma1qiyDTNg7_O7SnkQvXNJZcUC4e4LmK5C1qXeBYgtkuWi9jm2fziF52de_VfjIklpH8ayDM2P6Zj36ZVwvvPOcfbpF5tyW31ZL3g-olXOc4E8TMbc5JsAEnCTZs4Lmuspekjb9JXRIbiCG9Pfmx0";

export const AVATAR_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuDWo80x2af9wLtEz1E3QcTUSqlFGEhwMq0VwuY9huqO9Gb-iGp8RL_C3PWWpNn4ppNAp0SElKwbiOm2m5EHPWqiXgn6j_fB1QlQdNb4Ttw85Zk2JKUyRuHtGpul9oDJ9qs-tC39n2UjyF5UJUUwa8wILaC8VZRWvmL-hwvC0rgo_8q59E09PXUSToOeEQyso-8Lz3JrjcN20f4ucdCZtKLnBzBfh2M2-8EmSlIRZiz4aiMrK3V-sb8ISxwgyse9G0OxNcLStrbzmug";

export const INITIAL_PARTNERS: Partner[] = [
  {
    id: 'p1',
    name: 'Studio Lumière Douce',
    category: 'Photographes',
    description: "Capturons l'essence de votre amour à travers des clichés intemporels et élégants. Spécialistes des mariages de luxe et cérémonies civiles.",
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNtn6gGFcpGVeosFMFoECNVxRfdQaykdl7MeyPqI3f6-yLSIjjf2XoNcGKBGraUbGXYxPAk-WnpI1TTGTr3u4yD4M-D-OBLA3IboFJ6QHfWhn0eG1tDpO934theuirsQHG47KsBd-HhsuDtfi33SpP3ybn-FJrajdrARXMtXPPxOPfiqNTmcqAc359id4ZhZk8sNzTFueM63-QslayHS1P_BydQwwGPzcu5cWUmpDZFSFbOUqWr82KaD9eyphlpffSqlyz3vODstg',
    rating: 4.9,
    contacted: false
  },
  {
    id: 'p2',
    name: 'Féerie Florale & Co',
    category: 'Décoration',
    description: "Création d'ambiances florales majestueuses sur-mesure. Transformez les salons d'honneur de la mairie ou votre salle de réception en un lieu magique.",
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBBA4PNFpW7EZ2llC-HGlHyv6dFCz_t34qhUkXB8-b83ZSTgq63nB7Qw2Ot5nWttHie3pnK-YFZc0TkESFZHHNveKGr0P8n6SuPox4aT7Ik4-q3tnbrUDoymThPpfI_yJtxDTHbOlpuTUNvrqB6uInZ-JMWaWg0zYY-UjcSb_law6KnR6p6PwNc8h7n5EC1dOGDPdReNtI8gQGqegY1VweCvxA72pojcI9fCkz9E8F1dewPbeqrtQJpaxQi82Q_2KsUcrnNPWl0WnY',
    rating: 4.8,
    contacted: false
  },
  {
    id: 'p3',
    name: 'Maison Blanche Couture',
    category: 'Robes & Tenues',
    description: "Robes de mariée haute couture et costumes de cérémonie d'exception sur-mesure. Essayages privés et accompagnement haute couture.",
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6gsgaDnDghCzuU4W6uAGp1wqyLoH28Fl0foL0eeAbp-pjbknhFIEg4nq5XjhaAjtQFlHL9XtFbBsk10ZKSc6_QRzU7QcLtHaAe6kzuF1U5IbBS-teRGpCgTfNNoNBaoVWGOID17Xvn0qODuTHDs_jQJ848EuNeaOBElK816tPQnWtlxROtfJHXXokbIhORlUfoO7OD6g3Y6i4oFK5bljJNHbkOYCT4dH3rOJBFWiUD9M-4Nx_iPFitVuQ9tTtVsB4Eo5jLzG4PFk',
    rating: 5.0,
    contacted: false
  },
  {
    id: 'p4',
    name: 'Prestige Classic Cars',
    category: 'Location de Voitures',
    description: "Arrivez avec distinction. Une collection de véhicules vintages raffinés ou coupés modernes avec chauffeur pour un voyage inoubliable.",
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDej9l4XLfQJheDqci624P1tQmAUDxuQolbEyj6ff9GlHFs7MHwRq2-_FkYLIt1P4FQ8_CSHqXaso-Udp54xuOaj-XcLyK12_0NOMTP6nSJypBjeKhLXcVX-6121D3pAmDOCmH73GT1wgMyHzgGP8zaXn_Hws5BCXDa7JbYOGPVv-_y21cB3EI9QdyUp1sDVmprsI4tr2up_Tlk2wEbGPGia4a1wHQYeQJHb3QRlcpDKB9dO_5AbZ5wzjXlrBMcxtoAkhBaKEnThkk',
    rating: 4.7,
    contacted: false
  }
];

export const INITIAL_DOCUMENTS: DocumentInfo[] = [
  // --- CONDITIONS GÉNÉRALES ---
  {
    id: 'doc1',
    name: "Pièce d'identité (Époux)",
    description: "Photocopie lisible recto verso sur la même page de la pièce d'identité (CNI ou Passeport) de l'Époux (Article 20).",
    status: 'pending',
    category: 'spouses',
    icon: 'IdCard'
  },
  {
    id: 'doc2',
    name: "Extrait de naissance ou jugement supplétif (Époux)",
    description: "Acte de naissance de l'Époux (Homme), datant de moins de 3 mois à la date du mariage (Article 2 et Article 15).",
    status: 'pending',
    category: 'spouses',
    icon: 'Baby'
  },
  {
    id: 'doc3',
    name: "Certificat de résidence (Époux)",
    description: "Datant de moins de 2 mois avec mention 'en vue de mariage', l'un des futurs époux doit résider à Marcory (Article 20).",
    status: 'pending',
    category: 'spouses',
    icon: 'Home'
  },
  {
    id: 'doc1_f',
    name: "Pièce d'identité (Épouse)",
    description: "Photocopie lisible recto verso sur la même page de la pièce d'identité (CNI ou Passeport) de l'Épouse (Article 20).",
    status: 'pending',
    category: 'spouses',
    icon: 'IdCard'
  },
  {
    id: 'doc2_f',
    name: "Extrait de naissance ou jugement supplétif (Épouse)",
    description: "Acte de naissance de l'Épouse (Femme), datant de moins de 3 mois à la date du mariage (Article 2 et Article 15).",
    status: 'pending',
    category: 'spouses',
    icon: 'Baby'
  },
  {
    id: 'doc3_f',
    name: "Certificat de résidence (Épouse)",
    description: "Datant de moins de 2 mois avec mention 'en vue de mariage', l'un des futurs époux doit résider à Marcory (Article 20).",
    status: 'pending',
    category: 'spouses',
    icon: 'Home'
  },
  {
    id: 'doc5',
    name: "Pièce d'identité Témoin 1",
    description: "Photocopie lisible (CNI, passeport ou permis de conduire) du premier témoin majeur désigné.",
    status: 'pending',
    category: 'witnesses',
    icon: 'UserCheck'
  },
  {
    id: 'doc9',
    name: "Pièce d'identité Témoin 2",
    description: "Photocopie lisible (CNI, passeport ou permis de conduire) du second témoin majeur désigné.",
    status: 'pending',
    category: 'witnesses',
    icon: 'UserCheck'
  },

  // --- CONDITIONS SUPPLÉMENTAIRES POUR CERTAINES PERSONNES ---
  {
    id: 'doc_deces',
    name: "Acte de décès du conjoint (Veuf / Veuve)",
    description: "Extrait de l'acte de décès du conjoint décédé ou jugement supplétif du décès (Si applicable).",
    status: 'pending',
    category: 'special',
    icon: 'ScrollText'
  },
  {
    id: 'doc_divorce',
    name: "Acte de naissance/mariage mention divorce",
    description: "Extrait portant la mention du jugement de divorce ou d'annulation, avec attestation de non-opposition et non-appel (Si applicable, Article 3).",
    status: 'pending',
    category: 'special',
    icon: 'ScrollText'
  },
  {
    id: 'doc_dispense',
    name: "Dispense du procureur (Parents / Alliés)",
    description: "Dispense du procureur de la République levant la prohibition pour les époux parents ou alliés (Si applicable, Article 7).",
    status: 'pending',
    category: 'special',
    icon: 'ScrollText'
  },
  {
    id: 'doc_militaire_presence',
    name: "Certificat de présence au corps (Militaire)",
    description: "En lieu et place du certificat de résidence, datant de moins de 6 mois pour les militaires.",
    status: 'pending',
    category: 'special',
    icon: 'ScrollText'
  },
  {
    id: 'doc_militaire_autorisation',
    name: "Autorisation hiérarchique (Militaire)",
    description: "Autorisation donnée par le chef hiérarchique du corps et datant de moins de 6 mois pour les militaires.",
    status: 'pending',
    category: 'special',
    icon: 'ScrollText'
  },
  {
    id: 'doc_etranger_certif',
    name: "Extrait d'acte certifié conforme traduit (Étranger)",
    description: "Certifié conforme par le consulat (dispensé pour France/Mali), avec traduction française officielle par traducteur assermenté.",
    status: 'pending',
    category: 'special',
    icon: 'Languages'
  },
  {
    id: 'doc_etranger_capacite',
    name: "Certificat de capacité matrimoniale (Étranger)",
    description: "Délivré par l'officier de l'état civil de son lieu de naissance ou par le consulat/ambassade de son pays d'origine.",
    status: 'pending',
    category: 'special',
    icon: 'ScrollText'
  },
  {
    id: 'doc_etranger_sejour',
    name: "Carte de séjour ou visa (Étranger)",
    description: "Photocopie de la carte de séjour en cours de validité ou de la page du visa (Si applicable).",
    status: 'pending',
    category: 'special',
    icon: 'IdCard'
  },
  {
    id: 'doc_etranger_consulaire',
    name: "Carte consulaire ou Passeport (Étranger)",
    description: "Photocopie de la carte consulaire, de la carte d'identité ou du passeport consulaire (Si applicable).",
    status: 'pending',
    category: 'special',
    icon: 'IdCard'
  },
  {
    id: 'doc_viduite',
    name: "Décision abrogeant le délai de viduité",
    description: "Décision définitive du président du tribunal abrogeant le délai de viduité pour la femme divorcée (Si applicable).",
    status: 'pending',
    category: 'special',
    icon: 'ScrollText'
  }
];

export const INITIAL_TIMELINE_STEPS: TimelineStep[] = [
  {
    id: 1,
    title: "Création du dossier",
    description: "Saisie de l'identité des futurs époux et des témoins.",
    status: 'active',
    icon: 'UserPlus',
    details: "Saisie des noms, prénoms, contacts et informations des futurs époux pour initier le dossier."
  },
  {
    id: 2,
    title: "Choix de la mairie",
    description: "Sélection de la salle de célébration de votre choix à Marcory.",
    status: 'upcoming',
    actionLabel: "Choisir la mairie",
    icon: 'Building',
    details: "Sélectionnez votre mairie locale/salle de célébration de prédilection."
  },
  {
    id: 3,
    title: "Dépôt des documents",
    description: "Téléversement des pièces justificatives obligatoires et contrôle facial.",
    status: 'upcoming',
    actionLabel: "Déposer les pièces",
    icon: 'FolderUp',
    details: "Téléversez les CNI, extraits de naissance, justificatifs et selfies pour validation IA."
  },
  {
    id: 4,
    title: "Option de date",
    description: "Réservation provisoire de votre date et créneau horaire de célébration.",
    status: 'upcoming',
    actionLabel: "Réserver la date",
    icon: 'CalendarDays',
    details: "Choisissez un créneau horaire disponible dans le calendrier de la mairie sélectionnée."
  },
  {
    id: 5,
    title: "Confirmation & Paiement",
    description: "Règlement des frais de réservation en ligne pour confirmer définitivement le créneau.",
    status: 'upcoming',
    actionLabel: "Payer les frais",
    icon: 'CreditCard',
    details: "Réglez vos frais de confirmation en ligne (2 500 FCFA) par Mobile Money pour bloquer votre créneau."
  },
  {
    id: 6,
    title: "Célébration d'Union",
    description: "Célébration officielle de votre mariage civil en mairie.",
    status: 'upcoming',
    icon: 'HeartHandshake',
    details: "Présentation requise le Jour J munis des originaux de vos pièces et de vos témoins."
  }
];

export const INITIAL_NOTIFICATIONS: AlertNotification[] = [];
