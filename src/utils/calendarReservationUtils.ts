export interface SlotReservation {
  id: string;
  moisCélébration: string;
  debutReservation: string;
  ouvertureIso: string;
  conseil: string;
}

export const CALENDRIER_RESERVATIONS_2026: SlotReservation[] = [
  {
    id: "02_03",
    moisCélébration: "Février & Mars 2026",
    debutReservation: "22 Décembre 2025",
    ouvertureIso: "2025-12-22T00:00:00",
    conseil: "Idéal pour les célébrations de la Saint-Valentin. Les créneaux s'épuisent rapidement."
  },
  {
    id: "04_05",
    moisCélébration: "Avril & Mai 2026",
    debutReservation: "02 Février 2026",
    ouvertureIso: "2026-02-02T00:00:00",
    conseil: "Pensez à anticiper les ponts fériés de mai pour le dépôt physique de vos pièces."
  },
  {
    id: "06",
    moisCélébration: "Juin 2026",
    debutReservation: "02 Mars 2026",
    ouvertureIso: "2026-03-02T00:00:00",
    conseil: "Mois extrêmement sollicité. Nous vous conseillons de réserver dès le premier jour d'ouverture."
  },
  {
    id: "07",
    moisCélébration: "Juillet 2026",
    debutReservation: "1er Avril 2026",
    ouvertureIso: "2026-04-01T00:00:00",
    conseil: "Prenez garde aux délais d'établissement de vos documents durant les congés scolaires."
  },
  {
    id: "08",
    moisCélébration: "Août 2026",
    debutReservation: "04 Mai 2026",
    ouvertureIso: "2026-05-04T00:00:00",
    conseil: "Parfait pour les mariages d'été. Planifiez bien vos témoins pour éviter les absences."
  },
  {
    id: "09",
    moisCélébration: "Septembre 2026",
    debutReservation: "1er Juin 2026",
    ouvertureIso: "2026-06-01T00:00:00",
    conseil: "Climat de rentrée idéal. L'ouverture coïncide avec le début du mois de juin."
  },
  {
    id: "10",
    moisCélébration: "Octobre 2026",
    debutReservation: "1er Juillet 2026",
    ouvertureIso: "2026-07-01T00:00:00",
    conseil: "Idéal pour les thèmes automnaux. Le dépôt s'effectue dès le début de l'été."
  },
  {
    id: "11",
    moisCélébration: "Novembre 2026",
    debutReservation: "03 Août 2026",
    ouvertureIso: "2026-08-03T00:00:00",
    conseil: "Ambiance cocooning et intime. Idéal pour devancer les festivités de fin d'année."
  },
  {
    id: "12",
    moisCélébration: "Décembre 2026",
    debutReservation: "1er Septembre 2026",
    ouvertureIso: "2026-09-01T00:00:00",
    conseil: "Période de fin d'année magique et sur-réservée. Dépôt impératif à la rentrée de septembre."
  }
];

export const checkIsOpened = (_ouvertureIso: string, _referenceDate = new Date()): boolean => {
  return true;
};

export const getDaysRemainingStr = (_ouvertureIso: string, _referenceDate = new Date()): string => {
  return '';
};

export const getSlotInfoById = (id: string): SlotReservation | undefined => {
  return CALENDRIER_RESERVATIONS_2026.find(s => s.id === id);
};

export const getIvorianHolidays = (year: number): string[] => {
  const fixed = [
    `${year}-01-01`, // Jour de l'An
    `${year}-05-01`, // Fête du Travail
    `${year}-08-07`, // Fête Nationale
    `${year}-08-15`, // Assomption
    `${year}-11-01`, // Toussaint
    `${year}-11-15`, // Journée de la Paix
    `${year}-12-25`, // Noël
  ];

  let variables: string[] = [];
  if (year === 2026) {
    variables = [
      "2026-04-06", // Lundi de Pâques
      "2026-03-20", // Ramadan
      "2026-05-14", // Ascension
      "2026-05-25", // Lundi de Pentecôte
      "2026-05-27", // Tabaski
      "2026-08-25", // Maouloud
    ];
  } else if (year === 2027) {
    variables = [
      "2027-03-29", // Lundi de Pâques
      "2027-03-10", // Ramadan
      "2027-05-06", // Ascension
      "2027-05-17", // Lundi de Pentecôte
      "2027-05-16", // Tabaski
      "2027-08-14", // Maouloud
    ];
  }

  return [...fixed, ...variables];
};

export const validateWeddingDate = (
  dateStr: string,
  referenceDate = new Date()
): { isValid: boolean; reason?: string } => {
  if (!dateStr) return { isValid: false, reason: "Veuillez sélectionner une date." };

  const chosen = new Date(dateStr);
  if (isNaN(chosen.getTime())) {
    return { isValid: false, reason: "Date invalide." };
  }

  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  const minDate = new Date(ref);
  minDate.setDate(minDate.getDate() + 30);
  
  if (chosen < minDate) {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return {
      isValid: false,
      reason: `Délai légal insuffisant. La célébration doit être programmée au moins 30 jours à l'avance pour permettre le dépôt du dossier et la publication des bans. Première date autorisée : ${minDate.toLocaleDateString('fr-FR', options)}.`
    };
  }

  const dayOfWeek = chosen.getDay(); // 0: Sunday, 1: Monday, 2: Tuesday, 3: Wednesday, 4: Thursday, 5: Friday, 6: Saturday
  if (dayOfWeek < 3 || dayOfWeek > 6) {
    return {
      isValid: false,
      reason: "Les célébrations de mariage à la Mairie de Marcory se déroulent uniquement du Mercredi au Samedi."
    };
  }

  const year = chosen.getFullYear();
  const holidays = getIvorianHolidays(year);
  if (holidays.includes(dateStr)) {
    return {
      isValid: false,
      reason: "La date choisie correspond à un jour férié officiel en Côte d'Ivoire. Les célébrations de la Mairie y sont suspendues."
    };
  }

  return { isValid: true };
};
