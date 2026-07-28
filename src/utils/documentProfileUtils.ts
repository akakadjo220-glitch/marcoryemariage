export interface SpouseProfile {
  maritalStatus: 'celibataire' | 'veuf' | 'divorce';
  professionType: 'civil' | 'militaire';
  nationalityType: 'ivoirien' | 'etranger_dispense' | 'etranger_autre';
  hasParentalLink?: boolean;
}

export interface DynamicDocMeta {
  id: string;
  label: string;
  desc: string;
  icon: string;
  category?: string;
  isSpecial?: boolean;
}

export const DEFAULT_SPOUSE_PROFILE: SpouseProfile = {
  maritalStatus: 'celibataire',
  professionType: 'civil',
  nationalityType: 'ivoirien',
  hasParentalLink: false
};

export function getSavedSpouseProfiles(dossierId?: string | null): { epouxProfile: SpouseProfile; epouseProfile: SpouseProfile; isCustom: boolean } {
  if (typeof window === 'undefined') {
    return { epouxProfile: DEFAULT_SPOUSE_PROFILE, epouseProfile: DEFAULT_SPOUSE_PROFILE, isCustom: false };
  }
  try {
    let rawEpoux = (dossierId && dossierId.trim()) ? localStorage.getItem(`epoux_profile_${dossierId}`) : null;
    let rawEpouse = (dossierId && dossierId.trim()) ? localStorage.getItem(`epouse_profile_${dossierId}`) : null;

    if (!rawEpoux) rawEpoux = localStorage.getItem('e_mariage_epoux_profile_draft');
    if (!rawEpouse) rawEpouse = localStorage.getItem('e_mariage_epouse_profile_draft');

    const isCustom = Boolean(rawEpoux || rawEpouse);

    return {
      epouxProfile: rawEpoux ? { ...DEFAULT_SPOUSE_PROFILE, ...JSON.parse(rawEpoux) } : DEFAULT_SPOUSE_PROFILE,
      epouseProfile: rawEpouse ? { ...DEFAULT_SPOUSE_PROFILE, ...JSON.parse(rawEpouse) } : DEFAULT_SPOUSE_PROFILE,
      isCustom
    };
  } catch (e) {
    return { epouxProfile: DEFAULT_SPOUSE_PROFILE, epouseProfile: DEFAULT_SPOUSE_PROFILE, isCustom: false };
  }
}

export function saveSpouseProfiles(dossierId: string | null | undefined, epouxProfile: SpouseProfile, epouseProfile: SpouseProfile) {
  if (typeof window === 'undefined') return;
  try {
    const rawEpoux = JSON.stringify(epouxProfile);
    const rawEpouse = JSON.stringify(epouseProfile);
    localStorage.setItem('e_mariage_epoux_profile_draft', rawEpoux);
    localStorage.setItem('e_mariage_epouse_profile_draft', rawEpouse);
    if (dossierId && dossierId.trim()) {
      localStorage.setItem(`epoux_profile_${dossierId}`, rawEpoux);
      localStorage.setItem(`epouse_profile_${dossierId}`, rawEpouse);
      import('../supabaseClient').then(({ supabase }) => {
        supabase.from('dossiers').update({
          epoux_profile: epouxProfile as any,
          epouse_profile: epouseProfile as any
        }).eq('id', dossierId).then(({ error }) => {
          if (error) console.warn("Supabase: Error syncing spouse profiles", error);
        });
      });
    }
  } catch (e) {
    console.warn("Failed to save spouse profiles to localStorage", e);
  }
}

/**
  * Calcule la liste exacte des pièces justificatives obligatoires
  * en fonction des profils spécifiques de l'Époux et de l'Épouse (Loi N° 2019-570 Mairie de Marcory).
  */
export function getRequiredDocsForProfiles(
  epouxProfile: SpouseProfile = DEFAULT_SPOUSE_PROFILE,
  epouseProfile: SpouseProfile = DEFAULT_SPOUSE_PROFILE
): DynamicDocMeta[] {
  const docs: DynamicDocMeta[] = [];

  // --- ÉPOUX : Pièces de base ---
  docs.push({ id: 'doc1', icon: '🪪', label: "CNI / Passeport Époux", desc: "Pièce d'identité (recto/verso)" });
  docs.push({ id: 'selfie_epoux', icon: '📸', label: "Selfie Époux", desc: "Contrôle facial en direct" });
  docs.push({ id: 'doc2', icon: '📜', label: "Extrait d'acte de naissance Époux", desc: "Moins de 3 mois à la date du mariage" });

  // Époux : Résidence vs Militaire
  if (epouxProfile.professionType === 'militaire') {
    docs.push({ id: 'doc_militaire_presence', icon: '🎖️', label: "Certificat de présence au corps (Époux)", desc: "Moins de 6 mois (remplace la résidence)", isSpecial: true });
    docs.push({ id: 'doc_militaire_autorisation', icon: '🎖️', label: "Autorisation hiérarchique du Chef de Corps (Époux)", desc: "Moins de 6 mois", isSpecial: true });
  } else {
    docs.push({ id: 'doc3', icon: '🏠', label: "Certificat de résidence Époux", desc: "Datant de moins de 2 mois (avec mention en vue de mariage)" });
  }

  // Époux : Cas spécifiques
  if (epouxProfile.maritalStatus === 'veuf') {
    docs.push({ id: 'doc_deces', icon: '🕊️', label: "Acte de décès du conjoint décédé (Époux)", desc: "Acte de décès ou jugement supplétif de décès", isSpecial: true });
  } else if (epouxProfile.maritalStatus === 'divorce') {
    docs.push({ id: 'doc_divorce', icon: '⚖️', label: "Acte avec mention de divorce (Époux)", desc: "Jugement de divorce + Attestation de non-opposition et non-appel", isSpecial: true });
  }

  if (epouxProfile.nationalityType !== 'ivoirien') {
    if (epouxProfile.nationalityType === 'etranger_autre') {
      docs.push({ id: 'doc_etranger_certif', icon: '🌐', label: "Extrait certifié conforme & traduit (Époux)", desc: "Certifié par le consulat avec traduction officielle en français", isSpecial: true });
    }
    docs.push({ id: 'doc_etranger_capacite', icon: '📜', label: "Certificat de capacité matrimoniale (Époux)", desc: "Délivré par l'état civil de naissance ou le consulat", isSpecial: true });
    docs.push({ id: 'doc_etranger_sejour', icon: '🪪', label: "Carte de séjour ou Visa (Époux)", desc: "En cours de validité", isSpecial: true });
    docs.push({ id: 'doc_etranger_consulaire', icon: '🪪', label: "Carte consulaire ou Passeport (Époux)", desc: "Pièce consulaire ou passeport en cours de validité", isSpecial: true });
  }

  // --- ÉPOUSE : Pièces de base ---
  docs.push({ id: 'doc1_f', icon: '🪪', label: "CNI / Passeport Épouse", desc: "Pièce d'identité (recto/verso)" });
  docs.push({ id: 'selfie_epouse', icon: '📸', label: "Selfie Épouse", desc: "Contrôle facial en direct" });
  docs.push({ id: 'doc2_f', icon: '📜', label: "Extrait d'acte de naissance Épouse", desc: "Moins de 3 mois à la date du mariage" });

  // Épouse : Résidence vs Militaire
  if (epouseProfile.professionType === 'militaire') {
    docs.push({ id: 'doc_militaire_presence_f', icon: '🎖️', label: "Certificat de présence au corps (Épouse)", desc: "Moins de 6 mois (remplace la résidence)", isSpecial: true });
    docs.push({ id: 'doc_militaire_autorisation_f', icon: '🎖️', label: "Autorisation hiérarchique du Chef de Corps (Épouse)", desc: "Moins de 6 mois", isSpecial: true });
  } else {
    docs.push({ id: 'doc3_f', icon: '🏠', label: "Certificat de résidence Épouse", desc: "Datant de moins de 2 mois (avec mention en vue de mariage)" });
  }

  // Épouse : Cas spécifiques
  if (epouseProfile.maritalStatus === 'veuf') {
    docs.push({ id: 'doc_deces_f', icon: '🕊️', label: "Acte de décès du conjoint décédé (Épouse)", desc: "Acte de décès ou jugement supplétif de décès", isSpecial: true });
  } else if (epouseProfile.maritalStatus === 'divorce') {
    docs.push({ id: 'doc_divorce_f', icon: '⚖️', label: "Acte avec mention de divorce (Épouse)", desc: "Jugement de divorce + Attestation de non-opposition et non-appel", isSpecial: true });
    docs.push({ id: 'doc_viduite', icon: '⚖️', label: "Décision abrogeant le délai de viduité (Épouse)", desc: "Décision définitive du Président du Tribunal", isSpecial: true });
  }

  if (epouseProfile.nationalityType !== 'ivoirien') {
    if (epouseProfile.nationalityType === 'etranger_autre') {
      docs.push({ id: 'doc_etranger_certif_f', icon: '🌐', label: "Extrait certifié conforme & traduit (Épouse)", desc: "Certifié par le consulat avec traduction officielle en français", isSpecial: true });
    }
    docs.push({ id: 'doc_etranger_capacite_f', icon: '📜', label: "Certificat de capacité matrimoniale (Épouse)", desc: "Délivré par l'état civil de naissance ou le consulat", isSpecial: true });
    docs.push({ id: 'doc_etranger_sejour_f', icon: '🪪', label: "Carte de séjour ou Visa (Épouse)", desc: "En cours de validité", isSpecial: true });
    docs.push({ id: 'doc_etranger_consulaire_f', icon: '🪪', label: "Carte consulaire ou Passeport (Épouse)", desc: "Pièce consulaire ou passeport en cours de validité", isSpecial: true });
  }

  // --- PARENTS / ALLIÉS ---
  if (epouxProfile.hasParentalLink || epouseProfile.hasParentalLink) {
    docs.push({ id: 'doc_dispense', icon: '📜', label: "Dispense du Procureur de la République", desc: "Levée de prohibition (Article 7 pour parents/alliés)", isSpecial: true });
  }

  // --- TÉMOINS (Commun) ---
  docs.push({ id: 'doc5', icon: '👥', label: "Pièce d'identité Témoin 1", desc: "CNI, passeport ou permis du premier témoin majeur" });
  docs.push({ id: 'doc9', icon: '👥', label: "Pièce d'identité Témoin 2", desc: "CNI, passeport ou permis du second témoin majeur" });

  return docs;
}
