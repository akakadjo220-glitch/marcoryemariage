import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, UploadCloud, CreditCard, ChevronRight, Heart, CalendarCheck, Sparkles, Check, Loader2, Search, X, AlertCircle, UserPlus, FileText, Building, CheckCircle2, Landmark, ChevronUp, ChevronDown, BookOpen, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getMairies, MairieInfo, getDossiers, findDossierByQuery, getPaystackConfig, confirmPaystackReservationPayment, sendOpenwaWhatsapp, DossierInfo, getCapacityForDate, checkDuplicateSpouse, logDuplicateAttempt, updateDossierWeddingDate, getSystemParameters, SystemParameters } from '../services/dbService';
import { TimelineStep, DocumentInfo } from '../types';
import { SpouseProfile, DEFAULT_SPOUSE_PROFILE, getRequiredDocsForProfiles, getSavedSpouseProfiles, saveSpouseProfiles } from '../utils/documentProfileUtils';
import { supabase } from '../supabaseClient';

export const ensurePhonePrefix = (val: string): string => {
  if (!val) return '+225 ';
  const trimmed = val.trim();
  if (!trimmed.startsWith('+225')) {
    const digits = trimmed.replace(/[^0-9]/g, '');
    if (digits.startsWith('225')) {
      return '+225 ' + digits.substring(3);
    }
    return '+225 ' + digits;
  }

  let rest = trimmed.substring(4);
  if (rest && !rest.startsWith(' ')) {
    rest = ' ' + rest;
  }
  return '+225' + rest;
};

export const handlePhoneChange = (val: string, setter: (v: string) => void) => {
  if (val.length < 4) {
    setter('+225');
    return;
  }
  setter(ensurePhonePrefix(val));
};

interface LandingProps {
  setTab: (tab: string) => void;
  onUpdateNames?: (
    s1: string,
    s2: string,
    p1?: string,
    p2?: string,
    e1?: string,
    e2?: string,
    birthdate1?: string,
    birthdate2?: string,
    cni1?: string,
    cni2?: string,
    cniType1?: 'CNI' | 'PASSEPORT',
    cniType2?: 'CNI' | 'PASSEPORT'
  ) => void;
  onMairieSelected?: (mairieId: string) => void;
  onWeddingDateSelected?: (dateStr: string) => void;
  // Données existantes du dossier
  dossierId?: string;
  spouse1Name?: string;
  spouse2Name?: string;
  spouse1Phone?: string;
  spouse2Phone?: string;
  spouse1Birthdate?: string;
  spouse2Birthdate?: string;
  spouse1Cni?: string;
  spouse2Cni?: string;
  spouse1CniType?: 'CNI' | 'PASSEPORT';
  spouse2CniType?: 'CNI' | 'PASSEPORT';
  selectedMairieId?: string | null;
  selectedMairieName?: string;
  weddingDate?: string | null;
  steps?: TimelineStep[];
  updateStepStatus?: (id: number, status: 'completed' | 'active' | 'upcoming') => Promise<void>;
  documents?: DocumentInfo[];
  onRetrieveDossier?: (id: string) => void;
  dossierActiveStep?: number;
  setDossierActiveStep?: (step: number) => void;
  isInitialLoading?: boolean;
  autoOpenParcoursStep?: number | null;
  setAutoOpenParcoursStep?: (step: number | null) => void;
}

const STEPS_META = [
  { id: 1, icon: '👤', label: 'Création du dossier', short: 'Dossier' },
  { id: 2, icon: '🏛️', label: 'Choix de la mairie', short: 'Mairie' },
  { id: 3, icon: '📁', label: 'Dépôt des documents', short: 'Documents' },
  { id: 4, icon: '📅', label: 'Option de date', short: 'Date' },
  { id: 5, icon: '💳', label: 'Paiement & Envoi du dossier', short: 'Paiement' },
];

const HORAIRES = [
  { val: '09:00', label: '09h00', desc: "Matinée", icon: '🌅' },
  { val: '10:00', label: '10h00', desc: "Créneau d'Honneur", icon: '☀️' },
  { val: '11:00', label: '11h00', desc: "Méridienne", icon: '🌤️' },
  { val: '14:00', label: '14h00', desc: "Après-midi", icon: '🌤️' },
  { val: '15:00', label: '15h00', desc: "Fin d'après-midi", icon: '🌇' },
  { val: '16:00', label: '16h00', desc: "Coucher du soleil", icon: '🌇' },
];

const REQUIRED_DOCS = [
  { id: 1, icon: '🪪', label: "CNI Époux", desc: "Pièce d'identité" },
  { id: 2, icon: '📸', label: "Selfie Époux", desc: "Contrôle facial" },
  { id: 3, icon: '📜', label: "Extrait Époux", desc: "Naissance" },
  { id: 4, icon: '🪪', label: "CNI Épouse", desc: "Pièce d'identité" },
  { id: 5, icon: '📸', label: "Selfie Épouse", desc: "Contrôle facial" },
  { id: 6, icon: '📜', label: "Extrait Épouse", desc: "Naissance" },
  { id: 7, icon: '🏠', label: "Autres docs", desc: "Justificatifs et témoins" }
];

/** Détermine la première étape active selon l'état du dossier */
function getInitialStep(hasNames: boolean, hasMairie: boolean, isApproved: boolean, hasDate: boolean, isReservationPaid: boolean, isFinalPaid: boolean): number {
  if (!hasNames) return 1;
  if (!hasMairie) return 2;
  if (!isApproved) return 3;
  if (!hasDate) return 4;
  return 5;
}

import { useVerifierDoublon } from '../utils/useVerifierDoublon';

/** Détermine les étapes déjà complétées selon l'état du dossier */
function getInitialCompletedSteps(hasNames: boolean, hasMairie: boolean, isApproved: boolean, hasDate: boolean, isReservationPaid: boolean, isFinalPaid: boolean): number[] {
  const done: number[] = [];
  if (hasNames) done.push(1);
  if (hasMairie) done.push(2);
  if (isApproved) done.push(3);
  if (hasDate) done.push(4);
  if (isReservationPaid && isFinalPaid) done.push(5);
  return done;
}

const getBordureStyle = (statut: string | null) => {
  if (!statut) return {};
  return {
    borderColor:
      statut === 'disponible' ? '#22c55e' :
        statut === 'doublon' ? '#ef4444' :
          statut === 'invalide' ? '#f97316' :
            statut === 'verification' ? '#3b82f6' :
              '#d1d5db',
    borderWidth: 2,
    borderStyle: 'solid'
  };
};

const getIcone = (statut: string | null) =>
  statut === 'verification' ? '🔍' :
    statut === 'disponible' ? '✅' :
      statut === 'doublon' ? '❌' :
        statut === 'invalide' ? '⚠️' : '';

const getMessageColor = (statut: string | null) => {
  switch (statut) {
    case 'disponible': return 'text-emerald-600';
    case 'doublon': return 'text-rose-600';
    case 'invalide': return 'text-orange-500';
    case 'verification': return 'text-blue-500';
    default: return 'text-slate-400';
  }
};

import { CALENDRIER_RESERVATIONS_2026, checkIsOpened, getDaysRemainingStr, validateWeddingDate } from '../utils/calendarReservationUtils';
export { CALENDRIER_RESERVATIONS_2026, checkIsOpened, getDaysRemainingStr, validateWeddingDate };

export default function Landing({
  setTab,
  onUpdateNames,
  onMairieSelected,
  onWeddingDateSelected,
  dossierId = '',
  spouse1Name = '',
  spouse2Name = '',
  spouse1Phone = '',
  spouse2Phone = '',
  spouse1Birthdate = '',
  spouse2Birthdate = '',
  spouse1Cni = '',
  spouse2Cni = '',
  spouse1CniType = 'CNI',
  spouse2CniType = 'CNI',
  selectedMairieId = null,
  selectedMairieName = '',
  weddingDate = null,
  steps,
  updateStepStatus,
  documents = [],
  onRetrieveDossier,
  dossierActiveStep,
  setDossierActiveStep,
  isInitialLoading = false,
  autoOpenParcoursStep,
  setAutoOpenParcoursStep,
}: LandingProps) {
  const [showParcours, setShowParcours] = useState(false);
  const [simulatedReservationPaid, setSimulatedReservationPaid] = useState(false);
  const [openDocSection, setOpenDocSection] = useState<'commun' | 'cas' | null>(null);
  const [selectedMonthSim, setSelectedMonthSim] = useState<string>('07');
  const hasExistingNames = Boolean(spouse1Name?.trim() || spouse2Name?.trim() || dossierId);
  const [precheckConfirmed, setPrecheckConfirmed] = useState(hasExistingNames);
  const [profileConfirmed, setProfileConfirmed] = useState(hasExistingNames);

  const checkIsOpened = (ouvertureIso: string) => {
    const openingDate = new Date(ouvertureIso);
    const now = new Date();
    return now >= openingDate;
  };

  const getDaysRemainingStr = (ouvertureIso: string) => {
    const openingDate = new Date(ouvertureIso);
    const now = new Date();
    const diffTime = openingDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return '';
    return `Ouvre dans ${diffDays} j.`;
  };

  // États de récupération de dossier avec sécurité OTP
  const [showRetrieveModal, setShowRetrieveModal] = useState(false);
  const [retrieveQuery, setRetrieveQuery] = useState('');
  const [retrieveError, setRetrieveError] = useState<string | null>(null);
  const [retrieving, setRetrieving] = useState(false);

  const [otpStep, setOtpStep] = useState<'search' | 'verify'>('search');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [matchedDossier, setMatchedDossier] = useState<DossierInfo | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpTargetPhone, setOtpTargetPhone] = useState('');
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<string>('Wave');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  const handlePaystackPayment = async () => {
    setIsProcessingPayment(true);
    try {
      const config = await getPaystackConfig();
      const amount = systemParams?.frais_reservation_montant || 2500;
      const pubKey = config?.publicKey?.trim() || 'pk_test_093aa2de57ef6fc763d5ec2bbd715dd231ab98c2';

      // S'assurer que le SDK PaystackPop est présent dans le DOM
      if (!(window as any).PaystackPop) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://js.paystack.co/v1/inline.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Erreur lors du chargement du module Paystack'));
          document.body.appendChild(script);
        });
      }

      const userEmail = 'citoyen@e-mariage.ci';
      const reference = 'EMAR_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

      const handleSuccess = function (response: any) {
        console.log('✅ Paiement Paystack confirmé :', response);
        const ref = response?.reference || response?.trxref || reference;

        const executePaymentConfirmation = async () => {
          if (dossierId) {
            await confirmPaystackReservationPayment(dossierId, ref);
            const freshDossiers = await getDossiers();
            setAllDossiers(freshDossiers);
          }
          setIsProcessingPayment(false);
          setSimulatedReservationPaid(true);
          completeStep(5);
          setActiveStep(6);
        };

        executePaymentConfirmation().catch((err) => {
          console.warn('Erreur lors de la confirmation en DB:', err);
          setIsProcessingPayment(false);
          setSimulatedReservationPaid(true);
          completeStep(5);
          setActiveStep(6);
        });
      };

      const handleClose = function () {
        console.log('❌ Modal de paiement Paystack fermé par l’usager');
        setIsProcessingPayment(false);
      };

      const handler = (window as any).PaystackPop.setup({
        key: pubKey,
        email: userEmail,
        amount: amount * 100, // Montant en sous-unités pour Paystack (2500 FCFA = 250000 kobo)
        currency: config?.currency || 'XOF',
        ref: reference,
        metadata: {
          custom_fields: [
            { display_name: "Dossier N°", variable_name: "dossier_id", value: dossierId || "DEMO" },
            { display_name: "Époux 1", variable_name: "spouse1", value: spouse1Name || "Époux" },
            { display_name: "Époux 2", variable_name: "spouse2", value: spouse2Name || "Épouse" }
          ]
        },
        callback: handleSuccess,
        onSuccess: handleSuccess,
        onClose: handleClose,
        onCancel: handleClose
      });

      handler.openIframe();
    } catch (err) {
      console.error('Erreur lors de l’initialisation de Paystack :', err);
      setIsProcessingPayment(false);
    }
  };

  const handleCloseModal = () => {
    setShowRetrieveModal(false);
    setRetrieveQuery('');
    setRetrieveError(null);
    setOtpStep('search');
    setMatchedDossier(null);
    setGeneratedOtp('');
    setEnteredOtp('');
    setOtpError(null);
    setOtpTargetPhone('');
  };

  const handleRetrieveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retrieveQuery.trim()) return;
    setRetrieving(true);
    setRetrieveError(null);
    try {
      const found = await findDossierByQuery(retrieveQuery.trim());
      if (found) {
        // Déterminer le numéro cible unique
        const cleanQuery = retrieveQuery.trim().replace(/[^0-9]/g, '');
        const cleanP2 = (found.spouse2_phone || '').replace(/[^0-9]/g, '');
        let targetNum = '';
        if (cleanQuery.length >= 8 && cleanP2 && cleanP2.includes(cleanQuery)) {
          targetNum = found.spouse2_phone || '';
        } else {
          targetNum = found.spouse1_phone || found.spouse2_phone || '';
        }
        setOtpTargetPhone(targetNum);

        // Générer un code OTP à 6 chiffres
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(code);
        setMatchedDossier(found);
        setEnteredOtp('');
        setOtpError(null);
        setOtpStep('verify');

        // Récupérer la configuration et envoyer la notification WhatsApp
        const config = await getPaystackConfig();
        const messageText = `🔑 [CODE: ${code}] E-MARIAGE : Votre code de sécurité temporaire pour récupérer votre dossier civil 💍 (#${found.id.replace('dossier_', '').toUpperCase()}).`;

        // Envoi asynchrone via OpenWA au numéro cible uniquement
        if (config.enableWhatsappNotifs && targetNum) {
          sendOpenwaWhatsapp(config, targetNum, messageText);
        }

        // Événement personnalisé pour afficher le Toast réactif sans révéler le code secret à l'écran
        const maskedToastMessage = messageText.replace(/\[CODE:\s*\d+\]/gi, '[CODE: ******]');
        const customEvent = new CustomEvent('e_mariage_notif_sent', {
          detail: {
            whatsapp: true,
            spouse1_phone: targetNum,
            message: maskedToastMessage
          }
        });
        window.dispatchEvent(customEvent);
      } else {
        setRetrieveError("Aucun dossier correspondant trouvé. Veuillez vérifier le code ou le numéro de téléphone.");
      }
    } catch (err) {
      setRetrieveError("Une erreur est survenue lors de la recherche. Veuillez réessayer.");
    } finally {
      setRetrieving(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredOtp.trim() || !matchedDossier) return;
    setOtpError(null);

    if (enteredOtp.trim() === generatedOtp) {
      if (onRetrieveDossier) {
        onRetrieveDossier(matchedDossier.id);
      }
      setShowRetrieveModal(false);
      setRetrieveQuery('');
      setOtpStep('search');
      setMatchedDossier(null);
      setGeneratedOtp('');
      setEnteredOtp('');
      setOtpTargetPhone('');
      alert(`Dossier #${matchedDossier.id.replace('dossier_', '').toUpperCase()} récupéré avec succès ! Bienvenue à ${matchedDossier.spouse1_name} & ${matchedDossier.spouse2_name}.`);
    } else {
      setOtpError("Le code de validation saisi est incorrect. Veuillez réessayer.");
    }
  };

  const handleResendOtp = async () => {
    if (!matchedDossier || !otpTargetPhone) return;
    setOtpError(null);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setEnteredOtp('');

      const config = await getPaystackConfig();
      const messageText = `🔑 [CODE: ${code}] E-MARIAGE : Nouveau code de sécurité temporaire pour récupérer votre dossier 💍.`;

      if (config.enableWhatsappNotifs) {
        sendOpenwaWhatsapp(config, otpTargetPhone, messageText);
      }

      const maskedToastMessage = messageText.replace(/\[CODE:\s*\d+\]/gi, '[CODE: ******]');
      const customEvent = new CustomEvent('e_mariage_notif_sent', {
        detail: {
          whatsapp: true,
          spouse1_phone: otpTargetPhone,
          message: maskedToastMessage
        }
      });
      window.dispatchEvent(customEvent);

      alert("Un nouveau code de validation a été envoyé par WhatsApp !");
    } catch (err) {
      setOtpError("Une erreur est survenue lors de la réexpédition du code.");
    }
  };

  // États du wizard
  const [localActiveStep, setLocalActiveStep] = useState(1);
  const activeStep = Math.min(Math.max(localActiveStep || 1, 1), 6);
  const setActiveStep = (step: number | ((prev: number) => number)) => {
    const nextStep = typeof step === 'function' ? step(activeStep) : step;
    const clamped = Math.min(Math.max(nextStep, 1), 6);
    setLocalActiveStep(clamped);
    if (setDossierActiveStep) {
      setDossierActiveStep(clamped);
    }
  };
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [epouxProfile, setEpouxProfile] = useState<SpouseProfile>(DEFAULT_SPOUSE_PROFILE);
  const [epouseProfile, setEpouseProfile] = useState<SpouseProfile>(DEFAULT_SPOUSE_PROFILE);

  // Données Step 1 - Noms
  const [editS1, setEditS1] = useState('');
  const [editS2, setEditS2] = useState('');
  const [editPhone1, setEditPhone1] = useState('+225 ');
  const [editPhone2, setEditPhone2] = useState('+225 ');
  const [editBirthdate1, setEditBirthdate1] = useState('');
  const [editBirthdate2, setEditBirthdate2] = useState('');
  const [editCni1, setEditCni1] = useState('');
  const [editCni2, setEditCni2] = useState('');
  const [editCniType1, setEditCniType1] = useState<'CNI' | 'PASSEPORT'>('CNI');
  const [editCniType2, setEditCniType2] = useState<'CNI' | 'PASSEPORT'>('CNI');
  const [dossierDuplicateError, setDossierDuplicateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Données Step 2 - Mairie
  const [mairies, setMairies] = useState<MairieInfo[]>([]);
  const [mairiesLoading, setMairiesLoading] = useState(false);
  const [selectedMairie, setSelectedMairie] = useState<string | null>(null);

  // Données Step 3 - Date & Heure
  const [chosenDate, setChosenDate] = useState('');
  const [chosenTime, setChosenTime] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [allDossiers, setAllDossiers] = useState<any[]>([]);

  const handleWeddingDateChange = (val: string) => {
    setChosenDate(val);
    if (!val) {
      setDateError(null);
      return;
    }
    const validation = validateWeddingDate(val);
    if (!validation.isValid) {
      setDateError(validation.reason || "Date non disponible.");
    } else {
      setDateError(null);
    }
  };

  // Dynamically check selected mairie phone number
  const selectedMairiePhone = mairies.find(m => m.id === selectedMairie)?.phone || '+225 27 22 44 88 00';

  const checkPhone1 = useVerifierDoublon(editPhone1, 'telephone', undefined, dossierId, selectedMairiePhone, selectedMairie);
  const checkPhone2 = useVerifierDoublon(editPhone2, 'telephone', undefined, dossierId, selectedMairiePhone, selectedMairie);
  const checkCni1 = useVerifierDoublon(editCni1, 'cni', editCniType1, dossierId, selectedMairiePhone, selectedMairie);
  const checkCni2 = useVerifierDoublon(editCni2, 'cni', editCniType2, dossierId, selectedMairiePhone, selectedMairie);

  const [erreurCroisement, setErreurCroisement] = useState<string | null>(null);

  useEffect(() => {
    const cleanP1 = editPhone1.trim().replace(/\s/g, '');
    const cleanP2 = editPhone2.trim().replace(/\s/g, '');
    const cleanC1 = editCni1.trim().toUpperCase();
    const cleanC2 = editCni2.trim().toUpperCase();

    if (cleanP1 && cleanP2 && cleanP1 === cleanP2 && cleanP1 !== '+225' && cleanP2 !== '+225' && cleanP1 !== '+225 ' && cleanP2 !== '+225 ') {
      setErreurCroisement(
        "❌ L'époux et l'épouse ne peuvent pas avoir le même numéro de téléphone."
      );
      return;
    }

    if (cleanC1 && cleanC2 && cleanC1 === cleanC2) {
      setErreurCroisement(
        "❌ Le numéro de pièce d'identité de l'époux et de l'épouse ne peuvent pas être identiques."
      );
      return;
    }

    setErreurCroisement(null);
  }, [editPhone1, editPhone2, editCni1, editCni2]);

  // État final
  const [allDone, setAllDone] = useState(false);
  const [capacity, setCapacity] = useState<number>(15);
  const [systemParams, setSystemParams] = useState<SystemParameters | null>(null);

  useEffect(() => {
    async function loadCapacity() {
      if (selectedMairie && chosenDate) {
        const cap = await getCapacityForDate(selectedMairie, chosenDate);
        setCapacity(cap);
      } else {
        setCapacity(15);
      }
    }
    loadCapacity();
  }, [selectedMairie, chosenDate]);

  const generateSlots = (capVal: number) => {
    const roomId = selectedMairie || 'cocody_salle_prestige';
    const slots = [];

    if (roomId === 'cocody_salle_union') {
      // Union Room: 30-minute slots starting at 8h15 and ending at 15h15 (up to 14 slots)
      let currentHour = 8;
      let currentMin = 15;
      const maxSlots = Math.min(capVal, 14);
      for (let i = 0; i < maxSlots; i++) {
        let endHour = currentHour;
        let endMin = currentMin + 30;
        if (endMin >= 60) {
          endHour += 1;
          endMin -= 60;
        }

        const startStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
        const endStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        const timeVal = startStr;
        const label = `${currentHour}h${currentMin.toString().padStart(2, '0')} - ${endHour}h${endMin.toString().padStart(2, '0')}`;

        slots.push({
          val: timeVal,
          label: label,
          desc: currentHour < 12 ? "Matinée" : currentHour < 14 ? "Méridienne" : "Après-midi",
          icon: currentHour < 12 ? "🌅" : "☀️"
        });

        currentHour = endHour;
        currentMin = endMin;
      }
    } else {
      // Prestige or Annexe: 30-minute slots starting at 8h30 and ending at 15h00 (up to 13 slots)
      let currentHour = 8;
      let currentMin = 30;
      const maxSlots = Math.min(capVal, 13);
      for (let i = 0; i < maxSlots; i++) {
        let endHour = currentHour;
        let endMin = currentMin + 30;
        if (endMin >= 60) {
          endHour += 1;
          endMin -= 60;
        }

        const startStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
        const endStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        const timeVal = startStr;
        const label = `${currentHour}h${currentMin.toString().padStart(2, '0')} - ${endHour}h${endMin.toString().padStart(2, '0')}`;

        slots.push({
          val: timeVal,
          label: label,
          desc: currentHour < 12 ? "Matinée" : currentHour < 14 ? "Méridienne" : "Après-midi",
          icon: currentHour < 12 ? "🌅" : "☀️"
        });

        currentHour = endHour;
        currentMin = endMin;
      }
    }
    return slots;
  };

  const getDocStatusById = (id: string): { status: 'verified' | 'rejected' | 'uploading' | 'pending'; message?: string } => {
    const currentDossier = allDossiers.find(d => d.id === dossierId);

    if (id === 'selfie_epoux') {
      const attempts = currentDossier?.epoux_face_attempts ?? 0;
      const verified = currentDossier?.epoux_identite_verifiee === true;
      const hasUrl = !!currentDossier?.epoux_selfie_url;
      if (hasUrl && (verified || attempts >= 3)) return { status: 'verified' };
      if (attempts >= 3 && !verified) return { status: 'rejected', message: "Contrôle facial non concordant après 3 essais." };
      if (hasUrl && !verified) return { status: 'uploading' };
      return { status: 'pending' };
    }

    if (id === 'selfie_epouse') {
      const attempts = currentDossier?.epouse_face_attempts ?? 0;
      const verified = currentDossier?.epouse_identite_verifiee === true;
      const hasUrl = !!currentDossier?.epouse_selfie_url;
      if (hasUrl && (verified || attempts >= 3)) return { status: 'verified' };
      if (attempts >= 3 && !verified) return { status: 'rejected', message: "Contrôle facial non concordant après 3 essais." };
      if (hasUrl && !verified) return { status: 'uploading' };
      return { status: 'pending' };
    }

    if (id === 'doc1' && (currentDossier?.epoux_cni_url || currentDossier?.epoux_cni_valide)) {
      return { status: 'verified' };
    }
    if (id === 'doc2' && (currentDossier?.epoux_extrait_url || currentDossier?.epoux_extrait_valide)) {
      return { status: 'verified' };
    }
    if (id === 'doc1_f' && (currentDossier?.epouse_cni_url || currentDossier?.epouse_cni_valide)) {
      return { status: 'verified' };
    }
    if (id === 'doc2_f' && (currentDossier?.epouse_extrait_url || currentDossier?.epouse_extrait_valide)) {
      return { status: 'verified' };
    }

    if (!documents || documents.length === 0) return { status: 'pending' };
    const doc = documents.find(d => d.id === id);
    if (!doc) return { status: 'pending' };
    if (doc.status === 'verified') return { status: 'verified' };
    if (doc.status === 'rejected') return { status: 'rejected', message: doc.aiAnalysis?.motif || doc.rejectionReason || '' };
    if (doc.fileName || doc.status === 'uploading') return { status: 'uploading' };
    return { status: 'pending' };
  };

  const getDocStatusDetailed = (stepId: number) => {
    if (stepId === 1) return getDocStatusById('doc1');
    if (stepId === 2) return getDocStatusById('selfie_epoux');
    if (stepId === 3) return getDocStatusById('doc2');
    if (stepId === 4) return getDocStatusById('doc1_f');
    if (stepId === 5) return getDocStatusById('selfie_epouse');
    if (stepId === 6) return getDocStatusById('doc2_f');
    return getDocStatusById('doc3');
  };

  const handleDocumentAction = (stepIdOrDocId: number | string) => {
    if (setDossierActiveStep) {
      if (typeof stepIdOrDocId === 'number') {
        setDossierActiveStep(stepIdOrDocId);
      } else {
        if (stepIdOrDocId === 'doc1') setDossierActiveStep(1);
        else if (stepIdOrDocId === 'selfie_epoux') setDossierActiveStep(2);
        else if (stepIdOrDocId === 'doc2') setDossierActiveStep(3);
        else if (stepIdOrDocId === 'doc1_f') setDossierActiveStep(4);
        else if (stepIdOrDocId === 'selfie_epouse') setDossierActiveStep(5);
        else if (stepIdOrDocId === 'doc2_f') setDossierActiveStep(6);
        else setDossierActiveStep(7);
      }
    }
    setTab('dossier');
    if (typeof setShowParcours === 'function') {
      setShowParcours(false);
    }
  };

  const handleDepositNow = () => {
    const firstUnfinishedDoc = dynamicRequiredDocs.find(doc => {
      const { status } = getDocStatusById(doc.id);
      return status !== 'verified';
    });

    const targetStep = firstUnfinishedDoc ? 7 : 1;

    if (setDossierActiveStep) {
      setDossierActiveStep(targetStep);
    }
    setTab('dossier');
    if (typeof setShowParcours === 'function') {
      setShowParcours(false);
    }
  };

  const dynamicRequiredDocs = getRequiredDocsForProfiles(epouxProfile, epouseProfile);

  const allRequiredUploaded = dynamicRequiredDocs.every(doc => {
    const s = getDocStatusById(doc.id).status;
    return s === 'verified' || s === 'uploading';
  });
  const missingDocsCount = dynamicRequiredDocs.filter(doc => {
    const s = getDocStatusById(doc.id).status;
    return s === 'pending' || s === 'rejected';
  }).length;

  // Sync automatic completedSteps whenever documents or dossier state updates
  useEffect(() => {
    if (showParcours) {
      const targetDossier = allDossiers.find(d => d.id === dossierId);

      const s1Name = spouse1Name?.trim() || targetDossier?.spouse1_name?.trim() || editS1.trim();
      const s2Name = spouse2Name?.trim() || targetDossier?.spouse2_name?.trim() || editS2.trim();
      const hasNames = Boolean((s1Name && s2Name) || dossierId);

      const mId = selectedMairieId || targetDossier?.mairie_id || selectedMairie;
      const hasMairie = Boolean(mId);

      const wDate = weddingDate || targetDossier?.wedding_date || chosenDate;
      const hasDate = Boolean(wDate);

      const isReservationPaid = targetDossier?.frais_reservation_paye === true;
      const isFinalPaid = targetDossier?.status === 'scheduled' || targetDossier?.status === 'paid';

      const isApproved = dynamicRequiredDocs.every(doc => {
        const s = getDocStatusById(doc.id).status;
        return s === 'verified' || s === 'uploading';
      });

      const done = getInitialCompletedSteps(hasNames, hasMairie, isApproved, hasDate, isReservationPaid, isFinalPaid);
      setCompletedSteps(done);
    }
  }, [showParcours, documents, allDossiers, selectedMairieId, weddingDate, spouse1Name, spouse2Name, dossierId, epouxProfile, epouseProfile]);

  // Charger les mairies réelles, dossiers et paramètres système depuis la DB au montage
  useEffect(() => {
    async function loadMairiesAndDossiers() {
      setMairiesLoading(true);
      try {
        const [mairiesData, dossiersData, paramsData] = await Promise.all([
          getMairies(),
          getDossiers(),
          getSystemParameters()
        ]);
        setMairies(mairiesData.filter(m => m.is_active));
        setAllDossiers(dossiersData);
        setSystemParams(paramsData);
      } catch (err) {
        console.warn("Failed to load mairies/dossiers/parameters", err);
      } finally {
        setMairiesLoading(false);
      }
    }
    loadMairiesAndDossiers();
  }, [dossierId]);

  useEffect(() => {
    const saved = getSavedSpouseProfiles(dossierId);
    const targetDossier = dossierId ? allDossiers.find(d => d.id === dossierId) : null;
    if (targetDossier?.epoux_profile) {
      setEpouxProfile(targetDossier.epoux_profile);
    } else if (saved.isCustom) {
      setEpouxProfile(saved.epouxProfile);
    }
    if (targetDossier?.epouse_profile) {
      setEpouseProfile(targetDossier.epouse_profile);
    } else if (saved.isCustom) {
      setEpouseProfile(saved.epouseProfile);
    }
    if (targetDossier?.frais_reservation_paye) {
      setSimulatedReservationPaid(true);
      completeStep(5);
    }
  }, [dossierId, allDossiers]);

  const parseWeddingDate = (wDateStr: string) => {
    if (!wDateStr) return { date: '', time: '' };

    let timeVal = '';
    const timeMatch = wDateStr.match(/à\s+(\d{1,2})h(\d{2})/i);
    if (timeMatch) {
      timeVal = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }

    let dateVal = '';
    try {
      const months: { [key: string]: string } = {
        janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05', juin: '06',
        juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12', décembre: '12'
      };
      const cleaned = wDateStr.toLowerCase().trim();
      const yearMatch = cleaned.match(/\b(20\d{2})\b/);
      const dayMatch = cleaned.match(/\b(\d{1,2})\b/);
      if (yearMatch && dayMatch) {
        let mStr = '01';
        for (const [mName, mVal] of Object.entries(months)) {
          if (cleaned.includes(mName)) {
            mStr = mVal;
            break;
          }
        }
        const dStr = dayMatch[1].padStart(2, '0');
        dateVal = `${yearMatch[1]}-${mStr}-${dStr}`;
      }
    } catch (e) {
      console.error(e);
    }

    return { date: dateVal, time: timeVal };
  };

  // Initialiser le wizard selon l'état réel du dossier à chaque ouverture du popup
  const openParcours = (overrideStep?: number) => {
    const targetDossier = allDossiers.find(d => d.id === dossierId);

    const s1Name = spouse1Name?.trim() || targetDossier?.spouse1_name?.trim() || editS1.trim();
    const s2Name = spouse2Name?.trim() || targetDossier?.spouse2_name?.trim() || editS2.trim();
    const hasNames = Boolean((s1Name && s2Name) || dossierId);

    const mId = selectedMairieId || targetDossier?.mairie_id || selectedMairie;
    const hasMairie = Boolean(mId);

    const wDate = weddingDate || targetDossier?.wedding_date || chosenDate;
    const hasDate = Boolean(wDate);

    const isReservationPaid = targetDossier?.frais_reservation_paye === true;
    const isFinalPaid = targetDossier?.status === 'scheduled' || targetDossier?.status === 'paid';

    const isApproved = dynamicRequiredDocs.every(doc => {
      const s = getDocStatusById(doc.id).status;
      return s === 'verified' || s === 'uploading';
    });



    // Pré-remplir avec les données existantes
    const s1 = spouse1Name || targetDossier?.spouse1_name || '';
    const s2 = spouse2Name || targetDossier?.spouse2_name || '';
    const p1 = spouse1Phone || targetDossier?.spouse1_phone || '';
    const p2 = spouse2Phone || targetDossier?.spouse2_phone || '';
    const b1 = spouse1Birthdate || targetDossier?.spouse1_birthdate || '';
    const b2 = spouse2Birthdate || targetDossier?.spouse2_birthdate || '';
    const c1 = spouse1Cni || targetDossier?.spouse1_cni || '';
    const c2 = spouse2Cni || targetDossier?.spouse2_cni || '';
    const ctype1 = spouse1CniType || targetDossier?.spouse1_cni_type || 'CNI';
    const ctype2 = spouse2CniType || targetDossier?.spouse2_cni_type || 'CNI';

    setEditS1(s1);
    setEditS2(s2);
    setEditPhone1(p1 ? ensurePhonePrefix(p1) : '+225 ');
    setEditPhone2(p2 ? ensurePhonePrefix(p2) : '+225 ');
    setEditBirthdate1(b1);
    setEditBirthdate2(b2);
    setEditCni1(c1);
    setEditCni2(c2);
    setEditCniType1(ctype1);
    setEditCniType2(ctype2);
    setSelectedMairie(mId || null);

    // Pré-remplir la date et l'heure
    const parsed = parseWeddingDate(wDate || '');
    setChosenDate(parsed.date);
    if (parsed.time) setChosenTime(parsed.time);

    // Initialiser étapes complétées et étape active selon avancement réel
    const done = getInitialCompletedSteps(hasNames, hasMairie, isApproved, hasDate, isReservationPaid, isFinalPaid);
    const requestedStep = typeof overrideStep === 'number' ? overrideStep : undefined;
    const startStep = requestedStep || getInitialStep(hasNames, hasMairie, isApproved, hasDate, isReservationPaid, isFinalPaid);
    const safeStartStep = Math.min(Math.max(startStep, 1), 6);



    // Pré-remplir les profils d'état civil
    const savedProf = getSavedSpouseProfiles(dossierId);
    const epouxP = targetDossier?.epoux_profile || savedProf.epouxProfile;
    const epouseP = targetDossier?.epouse_profile || savedProf.epouseProfile;
    if (epouxP) setEpouxProfile(epouxP);
    if (epouseP) setEpouseProfile(epouseP);

    if (dossierId) {
      setPrecheckConfirmed(true);
      setProfileConfirmed(true);
    }

    // Si le paiement et l'envoi ont déjà été effectués, diriger directement vers le Tableau de bord
    if (targetDossier?.frais_reservation_paye || simulatedReservationPaid) {
      setShowParcours(false);
      setTab('dashboard');
      const event = new CustomEvent('e_mariage_toast', {
        detail: {
          message: '📋 Votre dossier est déjà transmis à la Mairie. Retrouvez vos convocations et dates ci-dessous.',
          type: 'info'
        }
      });
      window.dispatchEvent(event);
      return;
    }

    setCompletedSteps(done);
    setActiveStep(safeStartStep);

    setShowParcours(true);
  };

  useEffect(() => {
    if (autoOpenParcoursStep !== null && autoOpenParcoursStep !== undefined) {
      openParcours(autoOpenParcoursStep);
      if (setAutoOpenParcoursStep) {
        setAutoOpenParcoursStep(null);
      }
    }
  }, [autoOpenParcoursStep]);

  const completeStep = (step: number) => {
    setCompletedSteps(prev => prev.includes(step) ? prev : [...prev, step]);
    if (updateStepStatus) {
      updateStepStatus(step, 'completed');
      updateStepStatus(step + 1, 'active');
    }
  };

  const isValidDateStr = (dateStr: string): boolean => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateStr)) return false;
    const [d, m, y] = dateStr.split('/').map(Number);
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    return true;
  };

  const handleDateChange = (val: string, setter: (v: string) => void) => {
    let clean = val.replace(/[^0-9/]/g, '');
    if (clean.length === 2 && !clean.includes('/')) {
      clean = clean + '/';
    } else if (clean.length === 5 && clean.split('/').length === 2) {
      clean = clean + '/';
    }
    if (clean.length <= 10) {
      setter(clean);
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDossierDuplicateError(null);
    if (!editS1.trim() || !editS2.trim() || !editCni1.trim() || !editCni2.trim()) return;

    setSubmitting(true);
    try {
      const duplicateRes = await checkDuplicateSpouse(
        editCni1.trim(),
        editCni2.trim(),
        editS1.trim(),
        editS2.trim(),
        '',
        '',
        dossierId
      );
      if (duplicateRes?.exists && duplicateRes.message) {
        setDossierDuplicateError(duplicateRes.message);
        setSubmitting(false);
        return;
      }

      if (onUpdateNames) {
        await onUpdateNames(
          editS1.trim(),
          editS2.trim(),
          editPhone1,
          editPhone2,
          undefined,
          undefined,
          '',
          '',
          editCni1.trim(),
          editCni2.trim(),
          editCniType1,
          editCniType2
        );
      }
      completeStep(1);
      setActiveStep(2);
    } catch (err: any) {
      console.error("Dossier creation validation failed:", err);
      setDossierDuplicateError("Échec de la validation du dossier civil.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2Submit = () => {
    if (!selectedMairie) return;
    if (onMairieSelected) {
      onMairieSelected(selectedMairie);
    }
    completeStep(2);
    setActiveStep(3);
  };

  const handleStep3Submit = () => {
    completeStep(3);
    setActiveStep(4);
  };

  const handleStep4Submit = async () => {
    if (!chosenDate || !chosenTime || dateError) return;
    const dateFormatted = new Date(chosenDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const fullDate = `${dateFormatted} à ${chosenTime.replace(':', 'h')}`;
    if (dossierId) {
      await updateDossierWeddingDate(dossierId, fullDate);
    }
    if (onWeddingDateSelected) {
      onWeddingDateSelected(fullDate);
    }
    completeStep(4);
    setActiveStep(5);
  };

  const handleFinishAndGo = () => {
    setShowParcours(false);
    setTab('timeline');
  };

  // Badge couleur selon région
  const getMairieBadgeColor = (region: string): string => {
    if (region.toLowerCase().includes('abidjan') || region.toLowerCase().includes('cocody')) return 'text-rose-600 bg-rose-50';
    if (region.toLowerCase().includes('paris')) return 'text-violet-600 bg-violet-50';
    if (region.toLowerCase().includes('nice') || region.toLowerCase().includes('azur')) return 'text-sky-600 bg-sky-50';
    if (region.toLowerCase().includes('lyon')) return 'text-amber-600 bg-amber-50';
    return 'text-slate-600 bg-slate-50';
  };

  const currentMairieName = mairies.find(m => m.id === selectedMairie)?.name
    || (selectedMairie === selectedMairieId ? selectedMairieName : '');

  return (
    <div className="flex flex-col items-center w-full relative">
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <section className="w-full relative min-h-[500px] flex items-center justify-center overflow-hidden px-6 lg:px-12 py-12 rounded-3xl mt-2 select-none border border-[#c5a368]/30 bg-white/60 backdrop-blur-md shadow-lg text-left transition-all duration-300">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-20 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left Column: Easy instructions & prominent buttons */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 bg-[#fdfbf7] border border-[#c5a368]/40 text-primary px-4 py-1.5 rounded-full w-fit shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#b20052]">Service d'État Civil Officiel — Marcory</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-5xl lg:text-6.5xl text-slate-900 leading-tight tracking-tight font-bold">
              Votre mariage civil <br />
              <span className="text-rose-gradient italic font-semibold">simple et rapide</span> en ligne.
            </h2>

            <p className="font-sans text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
              Pas besoin de vous déplacer pour réserver ! Remplissez votre dossier en ligne en quelques minutes, déposez vos pièces d'identité et choisissez l'heure qui vous convient le mieux.
            </p>

            {/* Bandeau dossier existant si détecté ou Chargement en cours */}
            {isInitialLoading ? (
              <div className="bg-[#fdfbf7]/90 border border-[#c5a368]/35 rounded-2xl p-4 flex items-center justify-between shadow-sm max-w-xl backdrop-blur-sm animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#c5a368]/20 flex items-center justify-center text-base shrink-0 animate-spin">
                    💍
                  </div>
                  <div className="space-y-1.5 text-left">
                    <div className="h-3.5 w-44 bg-slate-200 rounded animate-pulse" />
                    <div className="h-2.5 w-28 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-8 w-24 bg-[#c5a368]/20 rounded-xl animate-pulse" />
              </div>
            ) : dossierId && spouse1Name && spouse2Name ? (
              <div className="bg-[#fdfbf7]/80 border border-[#c5a368]/35 rounded-2xl p-4 flex items-center justify-between shadow-sm max-w-xl backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-lg shadow-md border border-white/20">
                    💍
                  </div>
                  <div>
                    <p className="font-sans text-xs font-bold text-slate-800">{spouse1Name} & {spouse2Name}</p>
                    <p className="font-sans text-[10px] text-slate-400">Dossier en cours · {selectedMairieName || 'Mairie de Marcory'}</p>
                  </div>
                </div>
                <button
                  onClick={openParcours}
                  className="bg-primary hover:bg-primary-container text-white text-[10px] font-extrabold uppercase px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1 shrink-0 cursor-pointer border border-primary/20"
                >
                  OUVRIR <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}

            {/* Primary Action Panel: Simplified choices */}
            {!isInitialLoading && !dossierId && (
              <div className="flex flex-col gap-3.5 max-w-lg mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Choice 1: Start new */}
                  <button
                    onClick={openParcours}
                    className="bg-primary hover:bg-[#900042] text-white py-4 px-6 rounded-2xl font-bold uppercase text-[11px] tracking-wider transition-all shadow-[0_10px_35px_rgba(178,0,82,0.22)] hover:shadow-[0_12px_45px_rgba(178,0,82,0.35)] hover:-translate-y-0.5 border border-primary/30 flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full translate-x-2 -translate-y-2 group-hover:scale-150 transition-transform duration-500" />
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <UserPlus className="w-4 h-4 text-accent animate-bounce" />
                    </div>
                    <span className="font-bold tracking-widest block">1. NOUVEAU DOSSIER</span>
                    <span className="text-[9px] text-rose-100 font-normal normal-case block">Commencer ici (Gratuit)</span>
                  </button>

                  {/* Choice 2: Find existing */}
                  <button
                    onClick={() => setShowRetrieveModal(true)}
                    className="bg-white border border-[#c5a368]/45 hover:border-[#c5a368] text-slate-800 py-4 px-6 rounded-2xl font-bold uppercase text-[11px] tracking-wider transition-all shadow-sm hover:shadow-[0_10px_30px_rgba(197,163,104,0.15)] hover:-translate-y-0.5 flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#fdfbf7] border border-[#c5a368]/20 flex items-center justify-center shrink-0">
                      <Search className="w-4 h-4 text-slate-500" />
                    </div>
                    <span className="font-bold tracking-widest block text-slate-800">2. RETROUVER MON DOSSIER</span>
                    <span className="text-[9px] text-slate-400 font-normal normal-case block">Pour modifier ou payer</span>
                  </button>

                </div>

                <div className="flex items-center justify-center sm:justify-start gap-1 text-[10px] text-slate-400 font-medium">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Prend moins de 5 minutes · Accessible sur tous les téléphones</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Beautiful image illustration */}
          <div className="lg:col-span-5 flex items-center justify-center relative mt-6 lg:mt-0 select-none">
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-400/20 to-amber-300/20 rounded-3xl blur-2xl opacity-75 scale-95 pointer-events-none" />

            <div className="relative border-4 border-white bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-sm aspect-[4/3] lg:aspect-square">
              <img
                src="/accueil_mc.webp"
                alt="Mariage civil Cocody"
                className="w-full h-full object-cover object-top hover:scale-103 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />

              {/* Overlay Badge */}
              <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md border border-white/20 text-white rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-lg">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs">
                  🏛️
                </div>
                <div className="text-left font-sans">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">Hôtel de Ville</p>
                  <p className="text-[10px] font-bold text-white mt-0.5">Commune de Cocody</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>



      {/* ===== SECTION GUIDE : COMMENT ÇA MARCHE ===== */}
      <section className="w-full max-w-3xl px-4 py-12 border-t border-neutral-150 mt-8 text-left font-sans">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-primary/20 text-primary px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            Guide Officiel du Citoyen — Mairie de Marcory
          </div>
          <h3 className="font-serif text-3xl font-bold text-slate-900 leading-tight">
            Comment réserver votre date de mariage
          </h3>
          <p className="font-sans text-xs text-slate-500 mt-2 leading-relaxed">
            Un processus simple, entièrement en ligne, en 7 étapes. Accessible depuis votre téléphone, sans vous déplacer jusqu'au jour du rendez-vous.
          </p>
        </div>

        {/* ── Timeline Steps ── */}
        <div className="relative mb-14">
          {/* Vertical connector progress line */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-rose-300 via-indigo-300 to-rose-300 hidden sm:block" />

          <div className="flex flex-col gap-6">
            {[
              {
                num: 1,
                title: 'Créez votre dossier',
                icon: UserPlus,
                color: 'bg-rose-500',
                light: 'bg-rose-50 border-rose-200',
                text: 'text-rose-600',
                desc: 'Renseignez vos informations et celles de votre futur(e) époux(se) : nom, date de naissance, numéro de pièce d\'identité. L\'anti-doublon vérifie instantanément si un dossier actif existe déjà.',
              },
              {
                num: 2,
                title: 'Choisissez votre mairie',
                icon: Building,
                color: 'bg-indigo-500',
                light: 'bg-indigo-50 border-indigo-200',
                text: 'text-indigo-600',
                desc: 'Sélectionnez la mairie de célébration pour votre union civile. L\'accès est instantané.',
              },
              {
                num: 3,
                title: 'Déposez vos documents',
                icon: FileText,
                color: 'bg-amber-500',
                light: 'bg-amber-50 border-amber-200',
                text: 'text-amber-600',
                desc: 'Photographiez votre pièce d\'identité, prenez un selfie, et ajoutez votre extrait de naissance. La vérification IA est automatique en quelques secondes (reconnaissance faciale, OCR, authenticité).',
              },
              {
                num: 4,
                title: 'Choisissez votre date & heure',
                icon: Calendar,
                color: 'bg-emerald-500',
                light: 'bg-emerald-50 border-emerald-200',
                text: 'text-emerald-600',
                desc: 'Sélectionnez le jour et l\'heure de votre mariage parmi les créneaux disponibles. Les célébrations ont lieu du mercredi au samedi.',
                badges: ['Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
                badgeColor: 'border-emerald-200 text-emerald-700'
              },
              {
                num: 5,
                title: `Paiement en ligne (${(systemParams?.frais_reservation_montant || 2500).toLocaleString('fr-FR')} FCFA)`,
                icon: CreditCard,
                color: 'bg-blue-500',
                light: 'bg-blue-50 border-blue-200',
                text: 'text-blue-600',
                desc: `Réglez les frais plateforme de réservation de ${(systemParams?.frais_reservation_montant || 2500).toLocaleString('fr-FR')} FCFA. Dès le paiement validé, le système vous attribue automatiquement votre rendez-vous physique.`,
                badges: ['Wave', 'Orange Money', 'MTN', 'Moov', 'Carte bancaire'],
                badgeColor: 'border-blue-200 text-blue-700'
              },
              {
                num: 6,
                title: 'Rendez-vous physique & Célébration',
                icon: Heart,
                color: 'bg-purple-500',
                light: 'bg-purple-50 border-purple-200',
                text: 'text-purple-600',
                desc: `Présentez-vous le jour de votre rendez-vous pour faire valider vos originaux physiques et régler les droits municipaux de célébration (${(systemParams?.frais_timbre_montant || 100000).toLocaleString('fr-FR')} FCFA) à la caisse de la mairie avant le jour J.`,
              }
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="relative flex gap-5 items-start fade-in-up" style={{ animationDelay: `${step.num * 0.1}s` }}>
                  {/* Number bubble */}
                  <div className={`relative z-10 w-12 h-12 ${step.color} text-white rounded-2xl flex items-center justify-center shrink-0 shadow-[0_6px_20px_rgba(0,0,0,0.08)] border border-white/10`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content card */}
                  <div className={`flex-1 rounded-2xl border p-5 ${step.light} shadow-sm hover:shadow-md transition-all duration-300 text-left`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest ${step.text}`}>
                        Étape {step.num}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-slate-800 text-base mb-1.5">{step.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>

                    {step.badges && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {step.badges.map(b => (
                          <span key={b} className={`text-[10px] bg-white border ${step.badgeColor} font-bold px-2.5 py-0.5 rounded-full shadow-sm`}>
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Calendrier Officiel des Réservations 2026 ── */}
        <div className="w-full bg-white/40 border-y border-[#c5a368]/15 py-10 px-6 mb-10 rounded-2xl backdrop-blur-sm text-left font-sans mt-10">
          <div className="max-w-3xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <div className="inline-flex items-center gap-2 bg-[#c5a368]/10 border border-[#c5a368]/30 text-[#c5a368] px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-3">
                <Calendar className="w-3.5 h-3.5" />
                Calendrier Officiel des Réservations 2026
              </div>
              <h3 className="font-serif text-2xl font-bold text-slate-900 leading-tight">
                Quand devez-vous réserver ?
              </h3>
              <p className="font-sans text-xs text-slate-500 mt-2 leading-relaxed">
                Les réservations de date de mariage à la Mairie de Marcory ouvrent selon un calendrier strict fixé par le service mariage. Utilisez le simulateur pour connaître votre date d'ouverture.
              </p>
            </div>

            {/* Simulator Box */}
            <div className="bg-[#fdfbf7] border border-[#c5a368]/30 rounded-2xl p-5 mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-left">
                <label className="block text-[11px] font-extrabold text-[#c5a368] uppercase tracking-wider mb-2">
                  1. Choisissez votre mois de célébration :
                </label>
                <select
                  value={selectedMonthSim}
                  onChange={(e) => setSelectedMonthSim(e.target.value)}
                  className="w-full border border-neutral-300 rounded-xl px-4 py-3 bg-white font-medium focus:border-primary focus:outline-none cursor-pointer text-xs transition-all shadow-sm"
                >
                  <option value="02_03">Février & Mars 2026</option>
                  <option value="04_05">Avril & Mai 2026</option>
                  <option value="06">Juin 2026</option>
                  <option value="07">Juillet 2026</option>
                  <option value="08">Août 2026</option>
                  <option value="09">Septembre 2026</option>
                  <option value="10">Octobre 2026</option>
                  <option value="11">Novembre 2026</option>
                  <option value="12">Décembre 2026</option>
                </select>
              </div>

              {/* Simulation Result */}
              <AnimatePresence mode="wait">
                {(() => {
                  const item = CALENDRIER_RESERVATIONS_2026.find(c => c.id === selectedMonthSim);
                  if (!item) return null;
                  const isOpened = checkIsOpened(item.ouvertureIso);
                  const remaining = getDaysRemainingStr(item.ouvertureIso);

                  return (
                    <motion.div
                      key={selectedMonthSim}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 w-full bg-white border border-[#c5a368]/15 rounded-xl p-4 shadow-inner flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Ouverture des réservations :</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isOpened
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                          {isOpened ? '🟢 Ouvertes' : `⏳ Bientôt (${remaining || 'Fermé'})`}
                        </span>
                      </div>
                      <p className="font-serif text-lg font-bold text-slate-800">
                        {item.debutReservation}
                      </p>
                      <p className="text-[10px] text-slate-500 italic leading-relaxed">
                        💡 {item.conseil}
                      </p>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>

            {/* Full Grid Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {CALENDRIER_RESERVATIONS_2026.map((slot) => {
                const isOpened = checkIsOpened(slot.ouvertureIso);
                const remaining = getDaysRemainingStr(slot.ouvertureIso);
                const isSelected = selectedMonthSim === slot.id;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedMonthSim(slot.id)}
                    className={`text-left rounded-xl p-4 border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[120px] shadow-sm hover:shadow-md ${isSelected
                      ? 'bg-white border-[#c5a368] ring-2 ring-[#c5a368]/20'
                      : 'bg-white/80 hover:bg-white border-[#c5a368]/20 hover:border-[#c5a368]/50'
                      }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-serif font-bold text-slate-800 text-xs sm:text-sm">
                          {slot.moisCélébration}
                        </h4>
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border whitespace-nowrap ${isOpened
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-amber-50 border-amber-250 text-amber-600'
                          }`}>
                          {isOpened ? 'Ouvert' : remaining || 'Bientôt'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#c5a368] font-bold mt-1">
                        Dès le {slot.debutReservation.replace(' 25', '')}
                      </p>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-3 leading-relaxed line-clamp-2">
                      {slot.conseil}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Stamp / Legend footnote */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500 border-t border-neutral-100 pt-4">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-3.5 h-3.5 text-[#c5a368]" />
                <span>Horaires : Dépôts physiques du lundi au vendredi, de 08h00 à 12h00.</span>
              </div>
              <span className="font-bold text-[#c5a368] uppercase tracking-wider">
                Le Service Mariage — Mairie de Marcory
              </span>
            </div>
          </div>
        </div>

        {/* ── Documents à fournir ── */}
        <div className="bg-white/40 border-y border-[#c5a368]/15 py-10 px-1 mb-10 rounded-2xl backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-2xl font-bold text-slate-800 text-center mb-2">
              Documents à fournir
            </h2>
            <p className="text-center text-xs text-slate-500 mb-8">
              Pour chaque futur époux — à préparer avant de commencer votre dossier
            </p>

            {/* Common docs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[
                { icon: '📜', label: "Extrait de naissance", detail: "Un extrait d'acte de naissance ou un jugement supplétif datant de moins de trois mois à la date du mariage (Article 2 et Article 15)." },
                { icon: '🏠', label: "Certificat de résidence", detail: "Datant de moins de deux mois pour chacun des futurs époux avec la mention en vue de mariage, l'un des futurs époux doit résider dans la Commune de Marcory (Article 20)." },
                { icon: '🪪', label: "Pièce d'identité", detail: "La photocopie lisible recto verso sur la même page de la pièce d'identité (CNI ou attestation d'identité) (CNI, passeport ou permis de conduire)." },
                { icon: '📷', label: "Photo d'identité couleur", detail: "Une photo d'identité couleur pour chacun des futurs époux." },
                { icon: '👥', label: "Témoins (2 majeurs)", detail: "Photocopie de la pièce d'identité (CNI, passeport ou permis) des témoins majeurs, avec adresse, téléphone et profession." }
              ].map((d) => (
                <div key={d.label} className="flex items-start gap-3 bg-[#fdfbf7]/80 border border-[#c5a368]/20 hover:border-[#c5a368]/50 rounded-2xl p-4 shadow-sm hover:shadow transition-all duration-300 text-left">
                  <span className="text-2xl shrink-0 mt-0.5">{d.icon}</span>
                  <div>
                    <p className="font-bold text-sm text-slate-800">{d.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{d.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Cas particuliers accordion */}
            <button
              onClick={() => setOpenDocSection(openDocSection === 'cas' ? null : 'cas')}
              className="w-full flex items-center justify-between bg-[#fdfbf7] border border-[#c5a368]/30 rounded-2xl px-5 py-4 text-left hover:bg-[#c5a368]/5 hover:border-[#c5a368] transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#c5a368] shrink-0" />
                <span className="font-bold text-sm text-slate-800 font-sans">Cas particuliers (veuf, divorcé, militaire, étranger)</span>
              </div>
              {openDocSection === 'cas' ? <ChevronUp className="w-4 h-4 text-[#c5a368] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#c5a368] shrink-0" />}
            </button>

            {openDocSection === 'cas' && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                {[
                  { emoji: '🖤', cas: "Veuf / Veuve", docs: "Extrait de l'acte de décès du conjoint décédé ou un jugement supplétif du décès." },
                  { emoji: '⚖️', cas: "Divorcé(e) / Annulé", docs: "Extrait portant mention du divorce avec attestation de non-opposition et non-appel (Article 3), plus décision abrogeant le délai de viduité pour la femme." },
                  { emoji: '🎖️', cas: "Militaire", docs: "Certificat de présence au corps en lieu et place du certificat de résidence (moins de 6 mois) + Autorisation du chef hiérarchique (moins de 6 mois)." },
                  { emoji: '🌍', cas: "Étranger(ère)", docs: "Extrait certifié conforme (traduit par consulat/cabinet agréé) + Certificat de capacité matrimoniale + Carte de séjour/visa + Justificatif de résidence (moins de 2 mois) + Carte consulaire/passeport." }
                ].map((c) => (
                  <div key={c.cas} className="flex items-start gap-3 bg-white/80 border border-[#c5a368]/20 rounded-2xl p-4 shadow-sm hover:border-[#c5a368]/45 transition-all text-left">
                    <span className="text-xl shrink-0">{c.emoji}</span>
                    <div>
                      <p className="font-bold text-sm text-slate-800">{c.cas}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{c.docs}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Frais ── */}
        <div className="max-w-3xl mx-auto mb-6 text-left">
          <h2 className="font-serif text-2xl font-bold text-slate-800 text-center mb-8">
            Récapitulatif des frais
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-[#fdfbf7]/80 border border-[#c5a368]/30 rounded-3xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
              <CreditCard className="w-8 h-8 text-[#c5a368]" />
              <div>
                <p className="text-xs text-[#c5a368] uppercase tracking-wider font-bold">Étape 4 — En ligne</p>
                <p className="font-serif text-3xl font-bold text-slate-800 mt-1">{(systemParams?.frais_reservation_montant || 2500).toLocaleString('fr-FR')} <span className="text-base font-normal text-slate-500">FCFA</span></p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Frais de réservation / confirmation du créneau. Non remboursables en cas d'absence injustifiée.
                </p>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {['Wave', 'Orange Money', 'MTN', 'Moov', 'Carte'].map(m => (
                  <span key={m} className="text-[9px] bg-white border border-[#c5a368]/20 text-[#c5a368] font-bold px-2 py-0.5 rounded-full">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-[#fdfbf7]/80 border border-primary/20 rounded-3xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
              <Landmark className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-primary uppercase tracking-wider font-bold">Étape 6 — Sur place</p>
                <p className="font-serif text-3xl font-bold text-slate-800 mt-1">{(systemParams?.frais_timbre_montant || 100000).toLocaleString('fr-FR')} <span className="text-base font-normal text-slate-500">FCFA</span></p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Droits de mariage municipal. Réglés à la caisse de la mairie de Marcory le jour du rendez-vous physique.
                </p>
              </div>
              <span className="text-[10px] bg-white border border-primary/25 text-primary font-bold px-3 py-1 rounded-full w-fit">
                Espèces / Chèque
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Info Section (Pourquoi choisir E-Mariage ?) */}
      <section className="w-full max-w-3xl px-4 py-12 border-t border-neutral-150 mt-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="text-left py-4">
          <span className="font-serif text-primary text-sm font-semibold italic flex items-center gap-1.5 select-none">
            <Heart className="w-4 h-4 text-accent inline" /> Un parcours d'excellence
          </span>
          <h3 className="font-serif text-3xl md:text-4xl text-slate-900 font-bold tracking-tight mt-2 leading-tight">Pourquoi choisir E-Mariage ?</h3>
          <p className="font-sans text-sm text-secondary/90 leading-relaxed mt-4">
            Auparavant, la constitution d'un dossier civil imposait de nombreuses visites physiques contraignantes à la mairie. Notre plateforme digitalise ce protocole de manière transparente et sécurisée.
          </p>
          <div className="mt-8 space-y-5">
            {[
              { n: 1, title: 'Zéro déplacement inutile', desc: 'Toutes les pièces justificatives sont vérifiées au préalable en ligne.' },
              { n: 2, title: 'Calendrier en temps réel', desc: 'Évitez les déconvenues en choisissant des créneaux officiellement disponibles.' },
              { n: 3, title: 'Validation proactive', desc: 'Notre IA et nos agents municipaux vous accompagnent pour assurer la conformité légale.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/25">{n}</span>
                <div>
                  <h4 className="font-sans font-semibold text-slate-800 text-sm">{title}</h4>
                  <p className="font-sans text-xs text-secondary/80 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-8 glass-premium rounded-3xl border border-accent/30 text-left relative overflow-hidden flex flex-col justify-between min-h-[340px] shadow-lg">
          <div className="absolute top-0 right-0 w-36 h-36 bg-primary/5 rounded-full -mr-12 -mt-12 blur-xl" />
          <div>
            <Sparkles className="w-10 h-10 text-accent animate-pulse" />
            <h4 className="font-serif text-xl font-bold text-slate-900 mt-4">Une adjointe virtuelle dédiée</h4>
            <p className="font-sans text-xs md:text-sm text-secondary/90 leading-relaxed mt-2.5">
              Utilisez notre <strong>Adjointe Virtuelle d'Honneur AI</strong> accessible en bas à droite. Elle répond à vos questions juridiques sur les témoins, les pièces justificatives ou la rédaction des contrats de communauté d'union !
            </p>
          </div>
          <button onClick={() => setTab('dossier')} className="mt-6 font-sans text-xs font-bold text-primary hover:text-primary-container flex items-center gap-1.5 group select-none cursor-pointer self-start">
            <span>Consulter la liste de documents officiels</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>


      {/* ===== POPUP PARCOURS ÉTAPE PAR ÉTAPE (données réelles) ===== */}
      <AnimatePresence>
        {showParcours && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!allDone) setShowParcours(false); }} />

            {/* Sheet */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle mobile */}
              <div className="flex justify-center pt-3 pb-0 sm:hidden shrink-0">
                <div className="w-10 h-1 rounded-full bg-neutral-200" />
              </div>

              {/* Header */}
              <div className="px-5 pt-4 pb-0 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-slate-900">
                      {dossierId ? 'Continuer votre parcours' : 'Votre parcours de mariage'}
                    </h3>
                    <p className="font-sans text-xs text-slate-400 mt-0.5">
                      {dossierId && spouse1Name ? (
                        <span className="font-medium text-primary">{spouse1Name} & {spouse2Name}</span>
                      ) : (
                        `Étape ${activeStep} sur ${STEPS_META.length} — ${activeStep === 2 ? 'Choix de la salle' : (STEPS_META[Math.min(Math.max(activeStep - 1, 0), STEPS_META.length - 1)]?.label || '')}`
                      )}
                    </p>
                  </div>
                  {!allDone && (
                    <button onClick={() => setShowParcours(false)} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-slate-500 cursor-pointer text-xs font-bold transition-all">✕</button>
                  )}
                </div>

                {/* Stepper avec curseur animé du couple */}
                <div className="relative pt-8 pb-2 px-1">
                  {/* Curseur animé du couple au-dessus de l'étape active */}
                  <motion.div
                    className="absolute top-0 flex flex-col items-center pointer-events-none z-20"
                    initial={false}
                    animate={{
                      left: `${((activeStep - 1) / (STEPS_META.length - 1)) * 100}%`
                    }}
                    transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                    style={{ translateX: '-50%' }}
                  >
                    {/* Icône du couple exactement comme le modèle */}
                    <div className="flex items-center justify-center drop-shadow-sm select-none">
                      <svg className="w-8 h-7" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Époux (Bordeaux/Magenta) */}
                        <circle cx="11" cy="5" r="3" fill="#be185d" />
                        <path d="M11 9L7 16M11 9L15 16M11 9V17M11 17L8 25M11 17L14 25" stroke="#be185d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        
                        {/* Épouse (Beige/Doré) avec robe */}
                        <circle cx="25" cy="5" r="3" fill="#c5a368" />
                        <path d="M25 9L21 16M25 9L29 16M25 9V15M25 15L21 25M25 15L29 25" stroke="#c5a368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 16L25 11L29 16Z" fill="#c5a368" />
                        
                        {/* Mains jointes au milieu */}
                        <path d="M15 13.5L21 13.5" stroke="#be185d" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    {/* Mini triangle pointeur sous le couple */}
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-rose-600 -mt-0.5" />
                  </motion.div>

                  {/* Pistes d'étapes (Stepper d'origine conservé à l'identique) */}
                  <div className="flex items-center justify-between relative z-10">
                    {STEPS_META.map((s, idx) => {
                      const isDone = completedSteps.includes(s.id);
                      const isActive = activeStep === s.id;
                      return (
                        <React.Fragment key={s.id}>
                          <button
                            onClick={() => (isDone || s.id <= activeStep) && setActiveStep(s.id)}
                            className={`flex flex-col items-center gap-1 shrink-0 transition-all duration-200 ${isDone || s.id <= activeStep ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition-all duration-300 ${
                              isActive ? 'bg-primary border-primary text-white shadow-md scale-110' :
                              isDone ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' :
                              'bg-neutral-100 border-neutral-200 text-slate-400'
                            }`}>
                              {isActive ? <span className="text-xs font-bold">{s.id}</span> : isDone ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{s.id}</span>}
                            </div>
                            <span className={`text-[8px] font-bold whitespace-nowrap ${isActive ? 'text-primary' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {s.short}
                            </span>
                          </button>
                          {idx < STEPS_META.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-500 ${completedSteps.includes(s.id) ? 'bg-emerald-400' : 'bg-neutral-200'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="w-full h-1 bg-neutral-100 rounded-full mt-1">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${(completedSteps.length / STEPS_META.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Contenu scrollable */}
              <div className="overflow-y-auto overflow-x-hidden flex-1 px-5 py-5">

                {/* Succès final */}
                {allDone ? (
                  <div className="py-10 text-center flex flex-col items-center gap-5" style={{ animation: 'bounceIn 0.5s ease' }}>
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-300 shadow-xl">
                      <span className="text-4xl">💍</span>
                    </div>
                    <div>
                      <h4 className="font-serif text-2xl font-bold text-emerald-800">Dossier initialisé !</h4>
                      <p className="font-sans text-sm text-slate-500 mt-2">Votre parcours de mariage est en cours. Rendez-vous dans l'onglet Parcours pour continuer.</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left w-full space-y-2.5">
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-slate-500">Futur Époux</span>
                        <span className="font-bold text-slate-800">{editS1 || spouse1Name}</span>
                      </div>
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-slate-500">Future Épouse</span>
                        <span className="font-bold text-slate-800">{editS2 || spouse2Name}</span>
                      </div>
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-slate-500">Mairie</span>
                        <span className="font-bold text-slate-800">{currentMairieName}</span>
                      </div>
                      {chosenDate && (
                        <div className="flex justify-between text-xs font-sans">
                          <span className="text-slate-500">Date souhaitée</span>
                          <span className="font-bold text-slate-800">{new Date(chosenDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à {chosenTime}</span>
                        </div>
                      )}
                    </div>
                    <button onClick={handleFinishAndGo} className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-container text-white font-sans text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg hover:shadow-xl">
                      <span>Voir mon parcours complet</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* ── ÉTAPE 1 : Création du dossier ── */}
                    {activeStep === 1 && (
                      !precheckConfirmed && !dossierId ? (
                        <div className="space-y-4 font-sans text-xs text-left" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
                          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500/10 via-primary/10 to-emerald-500/10 border border-[#c5a368]/30 rounded-2xl">
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl shrink-0 shadow-sm border border-[#c5a368]/20">
                              🗓️
                            </div>
                            <div>
                              <h4 className="font-serif font-bold text-slate-900 text-base">Vérification de disponibilité</h4>
                              <p className="font-sans text-xs text-slate-500 mt-0.5">
                                Sélectionnez votre mois de célébration pour vérifier si les réservations sont ouvertes à la Mairie.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2.5 p-4 bg-white border border-neutral-200 rounded-2xl shadow-sm">
                            <label className="font-bold text-slate-800 text-xs uppercase tracking-wider font-sans">
                              Mois de célébration souhaité *
                            </label>

                            <select
                              value={selectedMonthSim}
                              onChange={e => setSelectedMonthSim(e.target.value)}
                              className="w-full border border-neutral-300 rounded-xl px-4 py-3 bg-neutral-50 font-semibold focus:border-primary focus:outline-none cursor-pointer text-xs transition-all shadow-inner-sm font-sans"
                            >
                              {CALENDRIER_RESERVATIONS_2026.map(slot => (
                                <option key={slot.id} value={slot.id}>
                                  {slot.moisCélébration} (Réservations : dès le {slot.debutReservation})
                                </option>
                              ))}
                            </select>

                            {/* Dynamic Status Card */}
                            {(() => {
                              const item = CALENDRIER_RESERVATIONS_2026.find(c => c.id === selectedMonthSim);
                              if (!item) return null;
                              const isOpened = checkIsOpened(item.ouvertureIso);
                              const remaining = getDaysRemainingStr(item.ouvertureIso);

                              return (
                                <div className="mt-2 space-y-3">
                                  <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${isOpened
                                    ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
                                    : 'bg-amber-50/95 border-amber-200 text-amber-950'
                                    }`}>
                                    <div className="flex items-center justify-between font-bold text-xs">
                                      <span className="flex items-center gap-1.5">
                                        {isOpened ? '🟢 Réservations Ouvertes !' : `⏳ Réservations pas encore ouvertes`}
                                      </span>
                                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${isOpened ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                                        }`}>
                                        {isOpened ? 'Disponible' : remaining || 'Bientôt'}
                                      </span>
                                    </div>

                                    <p className="text-xs font-medium leading-relaxed mt-0.5">
                                      {isOpened
                                        ? `Bonne nouvelle ! Les réservations de mariage civil pour ${item.moisCélébration} sont ouvertes à la Mairie. Vous pouvez remplir votre dossier dès maintenant.`
                                        : `Attention : Les réservations pour ${item.moisCélébration} n'ouvriront officiellement que le ${item.debutReservation} à la Mairie de Marcory.`}
                                    </p>

                                    <p className="text-[11px] italic opacity-85 mt-0.5">
                                      💡 {item.conseil}
                                    </p>
                                  </div>

                                  {/* Action Buttons */}
                                  {isOpened ? (
                                    <button
                                      type="button"
                                      onClick={() => setPrecheckConfirmed(true)}
                                      className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-lg"
                                    >
                                      <span>Poursuivre la création du dossier →</span>
                                    </button>
                                  ) : (
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700 font-sans">
                                      <p className="font-bold text-slate-800">Options disponibles :</p>
                                      <div className="flex flex-col gap-1.5 text-[11px] text-slate-600">
                                        <p>• <strong>Sélectionnez un autre mois ouvert</strong> ci-dessus pour continuer tout de suite (ex: Juillet, Août, Septembre, Octobre).</p>
                                        <p>• <strong>Patientez jusqu'au {item.debutReservation}</strong> pour ouvrir votre dossier pour {item.moisCélébration}.</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ) : !profileConfirmed ? (
                        /* ── Sous-étape 2 : Situation & Statut des futur(e)s époux (Fenetre dédiée épurée) ── */
                        <div className="space-y-4" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl shrink-0">⚖️</div>
                            <div className="text-left">
                              <h4 className="font-serif font-bold text-slate-900 text-base">Situation &amp; Statut des futur(e)s époux</h4>
                              <p className="font-sans text-xs text-slate-400">Déclarez le statut civil et professionnel pour préparer automatiquement la liste exacte de vos pièces requises.</p>
                            </div>
                          </div>

                          {/* Cadre identique au design de la maquette utilisateur */}
                          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3 font-sans text-left shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <span>⚖️ SITUATION &amp; STATUT DES FUTUR(E)S ÉPOUX</span>
                              </span>
                              <span className="text-[10.5px] text-slate-400">Ajuste les pièces requises</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {/* Profil Époux */}
                              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                                <span className="font-bold text-slate-800 text-[11px] block truncate">🧑 Époux ({spouse1Name || editS1 || 'Époux'})</span>
                                <div className="grid grid-cols-3 gap-1.5 text-[9.5px]">
                                  <div>
                                    <label className="block text-[8.5px] text-slate-400 mb-1">État civil</label>
                                    <select value={epouxProfile.maritalStatus} onChange={e => {
                                      const updated = { ...epouxProfile, maritalStatus: e.target.value as any };
                                      setEpouxProfile(updated);
                                      saveSpouseProfiles(dossierId, updated, epouseProfile);
                                    }} className="w-full p-1.5 border rounded-lg bg-slate-50 font-bold text-slate-700 focus:outline-none focus:border-primary">
                                      <option value="celibataire">Célibataire</option>
                                      <option value="veuf">Veuf</option>
                                      <option value="divorce">Divorcé</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[8.5px] text-slate-400 mb-1">Statut pro</label>
                                    <select value={epouxProfile.professionType} onChange={e => {
                                      const updated = { ...epouxProfile, professionType: e.target.value as any };
                                      setEpouxProfile(updated);
                                      saveSpouseProfiles(dossierId, updated, epouseProfile);
                                    }} className="w-full p-1.5 border rounded-lg bg-slate-50 font-bold text-slate-700 focus:outline-none focus:border-primary">
                                      <option value="civil">Civil</option>
                                      <option value="militaire">Militaire / Force de l'ordre</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[8.5px] text-slate-400 mb-1">Nationalité</label>
                                    <select value={epouxProfile.nationalityType} onChange={e => {
                                      const updated = { ...epouxProfile, nationalityType: e.target.value as any };
                                      setEpouxProfile(updated);
                                      saveSpouseProfiles(dossierId, updated, epouseProfile);
                                    }} className="w-full p-1.5 border rounded-lg bg-slate-50 font-bold text-slate-700 focus:outline-none focus:border-primary">
                                      <option value="ivoirien">Ivoirien</option>
                                      <option value="etranger_dispense">Étranger (FR/ML)</option>
                                      <option value="etranger_autre">Étranger (Autre)</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Profil Épouse */}
                              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                                <span className="font-bold text-slate-800 text-[11px] block truncate">👩 Épouse ({spouse2Name || editS2 || 'Épouse'})</span>
                                <div className="grid grid-cols-3 gap-1.5 text-[9.5px]">
                                  <div>
                                    <label className="block text-[8.5px] text-slate-400 mb-1">État civil</label>
                                    <select value={epouseProfile.maritalStatus} onChange={e => {
                                      const updated = { ...epouseProfile, maritalStatus: e.target.value as any };
                                      setEpouseProfile(updated);
                                      saveSpouseProfiles(dossierId, epouxProfile, updated);
                                    }} className="w-full p-1.5 border rounded-lg bg-slate-50 font-bold text-slate-700 focus:outline-none focus:border-primary">
                                      <option value="celibataire">Célibataire</option>
                                      <option value="veuf">Veuve</option>
                                      <option value="divorce">Divorcée</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[8.5px] text-slate-400 mb-1">Statut pro</label>
                                    <select value={epouseProfile.professionType} onChange={e => {
                                      const updated = { ...epouseProfile, professionType: e.target.value as any };
                                      setEpouseProfile(updated);
                                      saveSpouseProfiles(dossierId, epouxProfile, updated);
                                    }} className="w-full p-1.5 border rounded-lg bg-slate-50 font-bold text-slate-700 focus:outline-none focus:border-primary">
                                      <option value="civil">Civile</option>
                                      <option value="militaire">Militaire / Force de l'ordre</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[8.5px] text-slate-400 mb-1">Nationalité</label>
                                    <select value={epouseProfile.nationalityType} onChange={e => {
                                      const updated = { ...epouseProfile, nationalityType: e.target.value as any };
                                      setEpouseProfile(updated);
                                      saveSpouseProfiles(dossierId, epouxProfile, updated);
                                    }} className="w-full p-1.5 border rounded-lg bg-slate-50 font-bold text-slate-700 focus:outline-none focus:border-primary">
                                      <option value="ivoirien">Ivoirienne</option>
                                      <option value="etranger_dispense">Étrangère (FR/ML)</option>
                                      <option value="etranger_autre">Étrangère (Autre)</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setPrecheckConfirmed(false)}
                              className="px-4 py-3.5 border border-neutral-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-neutral-50 cursor-pointer transition-all"
                            >
                              ← Retour
                            </button>
                            <button
                              type="button"
                              onClick={() => setProfileConfirmed(true)}
                              className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-lg"
                            >
                              <span>Continuer vers les identités →</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleStep1Submit} className="space-y-4" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl shrink-0">👤</div>
                            <div className="flex-1 flex items-center justify-between">
                              <div>
                                <h4 className="font-serif font-bold text-slate-900 text-base">Création du dossier</h4>
                                <p className="font-sans text-xs text-slate-400">Renseignez l'identité des futurs époux pour initialiser le dossier civil.</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setProfileConfirmed(false)}
                                className="text-[10.5px] font-semibold text-primary hover:underline bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/20 cursor-pointer shrink-0"
                              >
                                ⚙️ Modifier situation
                              </button>
                            </div>
                          </div>

                          {/* Bandeau si dossier déjà existant */}
                          {dossierId && (
                            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center gap-2">
                              <Check className="w-4 h-4 text-violet-500 shrink-0" />
                              <p className="font-sans text-xs text-violet-700">Dossier <strong>#{dossierId.slice(-8).toUpperCase()}</strong> déjà créé. Vous pouvez modifier les informations ci-dessous.</p>
                            </div>
                          )}

                          <div className="space-y-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Futur époux — Prénom et Nom</label>
                              <input required value={editS1} onChange={e => setEditS1(e.target.value.toUpperCase())} placeholder="EX: KONÉ"
                                style={{ textTransform: 'uppercase' }}
                                className="w-full border border-neutral-200 rounded-xl p-3.5 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Future épouse — Prénom et Nom</label>
                              <input required value={editS2} onChange={e => setEditS2(e.target.value.toUpperCase())} placeholder="EX: AMY ROSINE"
                                style={{ textTransform: 'uppercase' }}
                                className="w-full border border-neutral-200 rounded-xl p-3.5 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Tél. Époux</label>
                                <input value={editPhone1} onChange={e => handlePhoneChange(e.target.value, setEditPhone1)} onBlur={() => checkPhone1.triggerVerification()} placeholder="+225 07 00 00 00"
                                  style={getBordureStyle(checkPhone1.statut)}
                                  className="w-full border border-neutral-200 rounded-xl p-3 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans" />
                                {checkPhone1.message && (
                                  <p className={`text-[10px] font-sans font-semibold mt-1 whitespace-pre-line ${getMessageColor(checkPhone1.statut)}`}>
                                    {getIcone(checkPhone1.statut)} {checkPhone1.message}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Tél. Épouse</label>
                                <input value={editPhone2} onChange={e => handlePhoneChange(e.target.value, setEditPhone2)} onBlur={() => checkPhone2.triggerVerification()} placeholder="+225 07 00 00 00"
                                  style={getBordureStyle(checkPhone2.statut)}
                                  className="w-full border border-neutral-200 rounded-xl p-3 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans" />
                                {checkPhone2.message && (
                                  <p className={`text-[10px] font-sans font-semibold mt-1 whitespace-pre-line ${getMessageColor(checkPhone2.statut)}`}>
                                    {getIcone(checkPhone2.statut)} {checkPhone2.message}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Type de pièce Époux *</label>
                                <select value={editCniType1} onChange={e => setEditCniType1(e.target.value as any)}
                                  className="w-full border border-neutral-200 rounded-xl p-3.5 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans">
                                  <option value="CNI">CNI</option>
                                  <option value="PASSEPORT">PASSEPORT</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Type de pièce Épouse *</label>
                                <select value={editCniType2} onChange={e => setEditCniType2(e.target.value as any)}
                                  className="w-full border border-neutral-200 rounded-xl p-3.5 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans">
                                  <option value="CNI">CNI</option>
                                  <option value="PASSEPORT">PASSEPORT</option>
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">N° Pièce Époux *</label>
                                <input required value={editCni1} onChange={e => {
                                  setEditCni1(e.target.value);
                                  if (dossierDuplicateError) setDossierDuplicateError(null);
                                }} onBlur={() => checkCni1.triggerVerification()} placeholder={editCniType1 === 'PASSEPORT' ? "Ex: 12BC34567" : "Ex: C012345678"}
                                  style={{ textTransform: 'uppercase', ...getBordureStyle(checkCni1.statut) }}
                                  className="w-full border border-neutral-200 rounded-xl p-3 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans" />
                                {checkCni1.message && (
                                  <p className={`text-[10px] font-sans font-semibold mt-1 whitespace-pre-line ${getMessageColor(checkCni1.statut)}`}>
                                    {getIcone(checkCni1.statut)} {checkCni1.message}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">N° Pièce Épouse *</label>
                                <input required value={editCni2} onChange={e => {
                                  setEditCni2(e.target.value);
                                  if (dossierDuplicateError) setDossierDuplicateError(null);
                                }} onBlur={() => checkCni2.triggerVerification()} placeholder={editCniType2 === 'PASSEPORT' ? "Ex: 12BC34567" : "Ex: C087654321"}
                                  style={{ textTransform: 'uppercase', ...getBordureStyle(checkCni2.statut) }}
                                  className="w-full border border-neutral-200 rounded-xl p-3 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans" />
                                {checkCni2.message && (
                                  <p className={`text-[10px] font-sans font-semibold mt-1 whitespace-pre-line ${getMessageColor(checkCni2.statut)}`}>
                                    {getIcone(checkCni2.statut)} {checkCni2.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {erreurCroisement && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-sans leading-relaxed flex items-start gap-2.5">
                              <AlertCircle className="w-4.5 h-4.5 text-rose-700 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold">Erreur de validation croisée</p>
                                <p className="mt-0.5 font-semibold text-rose-800 whitespace-pre-line">{erreurCroisement}</p>
                              </div>
                            </div>
                          )}

                          {dossierDuplicateError && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-sans leading-relaxed flex items-start gap-2.5">
                              <AlertCircle className="w-4.5 h-4.5 text-rose-700 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold">Erreur de validation</p>
                                <p className="mt-0.5 font-semibold text-rose-800">{dossierDuplicateError}</p>
                              </div>
                            </div>
                          )}

                          {(() => {
                            const peutContinuer =
                              checkPhone1.statut === 'disponible' &&
                              checkCni1.statut === 'disponible' &&
                              checkPhone2.statut === 'disponible' &&
                              checkCni2.statut === 'disponible' &&
                              !erreurCroisement &&
                              !submitting;
                            return (
                              <button type="submit" disabled={!peutContinuer}
                                style={{
                                  opacity: peutContinuer ? 1 : 0.5,
                                  cursor: peutContinuer ? 'pointer' : 'not-allowed'
                                }}
                                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all mt-2 flex items-center justify-center gap-2 bg-primary hover:bg-primary-container shadow-md">
                                {submitting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                                    <span>Validation en cours...</span>
                                  </>
                                ) : (
                                  <span>Continuer → Choisir la salle de célébration</span>
                                )}
                              </button>
                            );
                          })()}
                        </form>
                      )
                    )}

                    {/* ── ÉTAPE 2 : Choix de la mairie (données réelles) ── */}
                    {activeStep === 2 && (
                      <div className="space-y-4" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-2xl shrink-0">🏛️</div>
                          <div>
                            <h4 className="font-serif font-bold text-slate-900 text-base">Choix de la salle</h4>
                            <p className="font-sans text-xs text-slate-400">Sélectionnez la salle où vous souhaitez célébrer votre mariage civil.</p>
                          </div>
                        </div>

                        {/* Mairie déjà sélectionnée */}
                        {selectedMairieId && selectedMairieName && (
                          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-2">
                            <Check className="w-4 h-4 text-sky-500 shrink-0" />
                            <p className="font-sans text-xs text-sky-700">Salle actuelle : <strong>{selectedMairieName}</strong>. Vous pouvez modifier ci-dessous.</p>
                          </div>
                        )}

                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest">Salle de célébration</label>

                        {mairiesLoading ? (
                          <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="font-sans text-sm">Chargement des salles...</span>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {mairies.map(m => (
                              <div
                                key={m.id}
                                onClick={() => setSelectedMairie(m.id)}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${selectedMairie === m.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-neutral-100 hover:border-primary/40 bg-white hover:shadow-sm'
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <span className="font-sans font-bold text-sm text-slate-800 block">{m.name}</span>
                                    <span className="text-[11px] text-slate-400">{m.region}</span>
                                    {m.officer_name && (
                                      <span className="text-[10px] text-slate-300 block">Officier : {m.officer_name}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${getMairieBadgeColor(m.region)}`}>
                                      {m.region.split('-')[0].trim()}
                                    </span>
                                    {selectedMairie === m.id && <Check className="w-4 h-4 text-primary" />}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {mairies.length === 0 && (
                              <p className="text-center text-xs text-slate-400 py-3">Aucune salle disponible.</p>
                            )}
                          </div>
                        )}

                        <p className="text-[10px] text-slate-400 italic">ℹ️ La loi requiert que l'un des époux y réside depuis au moins 1 mois.</p>

                        <div className="flex gap-3">
                          <button onClick={() => setActiveStep(1)} className="px-4 py-3 border border-neutral-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-neutral-50 cursor-pointer transition-all">← Retour</button>
                          <button disabled={!selectedMairie} onClick={handleStep2Submit}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all ${selectedMairie ? 'bg-primary hover:bg-primary-container cursor-pointer shadow-md' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}>
                            Continuer → Dépôt des documents
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── ÉTAPE 3 : Dépôt des documents ── */}
                    {activeStep === 3 && (
                      <div className="space-y-4" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl shrink-0">📁</div>
                          <div>
                            <h4 className="font-serif font-bold text-slate-900 text-base">Dépôt des documents</h4>
                            <p className="font-sans text-xs text-slate-400">Téléversez vos pièces justificatives obligatoires pour instruction par l'officier civil.</p>
                          </div>
                        </div>

                        <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-widest text-left">Documents requis selon profil</label>
                        <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                          {dynamicRequiredDocs.map((doc, i) => {
                            const { status, message } = getDocStatusById(doc.id);

                            let cardBg = "bg-neutral-50 border-neutral-200 hover:border-primary/45 hover:bg-neutral-50/80";
                            let badgeBg = "bg-neutral-250 text-slate-500";
                            let badgeText = "À fournir";

                            if (status === 'verified') {
                              cardBg = "bg-emerald-50/20 border-emerald-200 hover:bg-emerald-50/40 hover:border-emerald-300";
                              badgeBg = "bg-emerald-100 text-emerald-800";
                              badgeText = "Vérifié ✓";
                            } else if (status === 'rejected') {
                              cardBg = "bg-rose-50/25 border-rose-200 hover:bg-rose-50/50 hover:border-rose-300";
                              badgeBg = "bg-rose-100 text-rose-800";
                              badgeText = "Rejeté ❌";
                            } else if (status === 'uploading') {
                              cardBg = "bg-sky-50/20 border-sky-200 hover:bg-sky-50/40 hover:border-sky-300";
                              badgeBg = "bg-sky-100 text-sky-850";
                              badgeText = "Reçu / Transmis 📄";
                            }

                            return (
                              <div
                                key={i}
                                onClick={() => handleDocumentAction(doc.id)}
                                className={`flex flex-col gap-1.5 p-3 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm group ${cardBg}`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-base shrink-0 group-hover:scale-110 transition-transform">{doc.icon}</span>
                                    <div className="text-left min-w-0">
                                      <span className={`font-sans font-bold text-[11px] block leading-tight ${status === 'verified' ? 'text-emerald-950 line-through decoration-emerald-500/40' : 'text-slate-800'}`}>
                                        {doc.label} {doc.isSpecial && <span className="text-[9px] text-amber-700 bg-amber-100 px-1 py-0.2 rounded ml-1 font-semibold">Spécifique</span>}
                                      </span>
                                      <span className="font-sans text-[10px] text-slate-400 block mt-0.5 leading-normal truncate">{doc.desc}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`px-1.5 py-0.5 rounded-lg font-sans text-[8.5px] font-bold ${badgeBg}`}>
                                      {badgeText}
                                    </span>
                                    {status === 'verified' ? (
                                      <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm animate-scale-in">
                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                      </div>
                                    ) : status === 'rejected' ? (
                                      <div className="w-4.5 h-4.5 rounded-full bg-rose-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                                        <AlertCircle className="w-3.5 h-3.5" strokeWidth={3} />
                                      </div>
                                    ) : status === 'uploading' ? (
                                      <div className="w-4.5 h-4.5 rounded-full bg-sky-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                                        <FileText className="w-2.5 h-2.5" />
                                      </div>
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                    )}
                                  </div>
                                </div>

                                {status === 'rejected' && message && (
                                  <div className="p-1.5 bg-white/95 border border-rose-200 rounded-lg text-[9.5px] font-semibold text-rose-800 leading-normal text-left font-sans shadow-sm">
                                    ⚠️ Motif : {message}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {!allRequiredUploaded && (
                          <div className="p-3 bg-rose-50 border border-primary/20 text-primary rounded-xl text-xs font-medium leading-relaxed flex items-start gap-2.5">
                            <span className="text-sm shrink-0 mt-0.5">⚠️</span>
                            <div className="text-left">
                              <p className="font-bold">Dépôt incomplet</p>
                              <p className="text-primary/80 text-[11px] mt-0.5">
                                Il vous reste <span className="font-bold">{missingDocsCount} document(s)</span> à ajouter dans l'onglet **Dossier** pour pouvoir déverrouiller la date et le paiement.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button onClick={() => setActiveStep(2)} className="px-4 py-3 border border-neutral-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-neutral-50 cursor-pointer transition-all">← Retour</button>
                          <button
                            disabled={!allRequiredUploaded}
                            onClick={handleStep3Submit}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-1.5 ${allRequiredUploaded
                              ? 'bg-primary hover:bg-primary-container cursor-pointer shadow-md'
                              : 'bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300/20'
                              }`}
                          >
                            {!allRequiredUploaded && <span className="text-[10px]">🔒</span>}
                            <span>Continuer → Option de date</span>
                          </button>
                        </div>

                        <button onClick={handleDepositNow}
                          className="w-full py-2.5 rounded-xl border border-primary/30 text-primary text-xs font-bold hover:bg-primary/5 cursor-pointer transition-all">
                          📤 Déposer mes documents maintenant
                        </button>
                      </div>
                    )}

                    {/* ── ÉTAPE 4 : Option de date ── */}
                    {activeStep === 4 && (
                      <div className="space-y-4" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">📅</div>
                          <div>
                            <h4 className="font-serif font-bold text-slate-900 text-base">Option de date</h4>
                            <p className="font-sans text-xs text-slate-400">Consultez les créneaux libres et posez une option de réservation.</p>
                          </div>
                        </div>

                        {weddingDate && (
                          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            <p className="font-sans text-xs text-primary">Date actuelle : <strong>{weddingDate}</strong>. Vous pouvez modifier ci-dessous.</p>
                          </div>
                        )}

                        {currentMairieName && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-100">
                            <span className="text-sm">🏛️</span>
                            <span className="font-sans text-xs text-slate-600 font-medium">{currentMairieName}</span>
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Date souhaitée</label>
                          <div className="p-1 bg-neutral-50 rounded-2xl border border-neutral-200">
                            <input
                              type="date"
                              value={chosenDate}
                              onChange={e => handleWeddingDateChange(e.target.value)}
                              min={(() => {
                                const d = new Date();
                                d.setDate(d.getDate() + 30);
                                return d.toISOString().split('T')[0];
                              })()}
                              className="w-full border-0 rounded-xl p-3.5 text-sm bg-transparent focus:outline-none text-slate-800 font-sans cursor-pointer font-bold"
                            />
                          </div>
                          {dateError && (
                            <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[10px] leading-relaxed font-semibold flex items-start gap-2 text-left">
                              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                              <span>{dateError}</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">Créneau horaire</label>
                          <div className="grid grid-cols-3 gap-2.5">
                            {generateSlots(capacity).map(time => {
                              const isOccupied = chosenDate && selectedMairie ? allDossiers.some(d =>
                                d.id !== dossierId &&
                                d.mairie_id === selectedMairie &&
                                d.wedding_date === `${new Date(chosenDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${time.val.replace(':', 'h')}`
                              ) : false;

                              return (
                                <button
                                  key={time.val}
                                  disabled={isOccupied}
                                  onClick={() => !isOccupied && setChosenTime(time.val)}
                                  type="button"
                                  className={`p-1.5 rounded-xl border flex flex-col items-center gap-0.5 text-center cursor-pointer transition-all ${isOccupied
                                    ? 'bg-neutral-100 border-neutral-200 text-neutral-400 line-through cursor-not-allowed'
                                    : chosenTime === time.val
                                      ? 'border-primary bg-primary/5 shadow-sm font-bold scale-[1.02]'
                                      : 'border-neutral-100 hover:border-primary/20 bg-white'
                                    }`}
                                >
                                  <span className="font-sans font-bold text-xs text-slate-800">
                                    {time.label} {isOccupied && " (Occupé)"}
                                  </span>
                                  <span className="text-[8px] text-slate-400">
                                    {isOccupied ? "Non disponible" : time.desc}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button onClick={() => setActiveStep(3)} className="px-4 py-3 border border-neutral-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-neutral-50 cursor-pointer transition-all">← Retour</button>
                          <button disabled={!chosenDate || !chosenTime || !!dateError} onClick={handleStep4Submit}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all ${chosenDate && chosenTime && !dateError ? 'bg-primary hover:bg-primary-container cursor-pointer shadow-md' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}>
                            Confirmer l'option ✓
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── ÉTAPE 5 : Confirmation & Paiement ── */}
                    {activeStep === 5 && (
                      <div className="space-y-4 text-left font-sans text-xs animate-fade-in" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl shrink-0">💳</div>
                          <div>
                            <h4 className="font-serif font-bold text-slate-900 text-base">Confirmation &amp; Paiement en ligne</h4>
                            <p className="font-sans text-xs text-slate-400">Règlement des frais plateforme pour valider votre créneau.</p>
                          </div>
                        </div>

                        {!simulatedReservationPaid ? (
                          <div className="space-y-4">
                            <div className="p-4 bg-slate-50 border border-neutral-200 rounded-2xl flex flex-col gap-3">
                              <p className="font-sans text-xs text-slate-600 leading-relaxed font-semibold">
                                Pour verrouiller provisoirement votre créneau de célébration civile du <strong>{chosenDate ? new Date(chosenDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'programmé'}</strong>, veuillez vous acquitter des frais de confirmation :
                              </p>
                              <div className="flex justify-between items-center text-xs font-sans border-t border-neutral-200 pt-2.5">
                                <span className="font-bold text-slate-700">Frais de réservation (en ligne)</span>
                                <span className="font-serif font-bold text-primary">{(systemParams?.frais_reservation_montant || 2500).toLocaleString('fr-FR')} FCFA</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mode de paiement en ligne :</label>
                              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                                {['Orange Money', 'Wave', 'MTN Money', 'Carte Bancaire'].map((m, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedPaymentChannel(m)}
                                    className={`p-2.5 border rounded-xl text-center font-bold text-xs cursor-pointer transition-all ${
                                      selectedPaymentChannel === m
                                        ? 'border-primary bg-primary/5 text-primary shadow-sm font-extrabold ring-2 ring-primary/20'
                                        : 'border-neutral-200 text-slate-700 bg-white hover:bg-neutral-50'
                                    }`}
                                  >
                                    {m}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button onClick={() => setActiveStep(4)} disabled={isProcessingPayment} className="px-4 py-3 border border-neutral-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-neutral-50 cursor-pointer transition-all disabled:opacity-50">← Retour</button>
                              <button
                                onClick={handlePaystackPayment}
                                disabled={isProcessingPayment}
                                className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white bg-primary hover:bg-primary-container cursor-pointer shadow-md transition-all text-center flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {isProcessingPayment ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                    <span>Connexion à Paystack...</span>
                                  </>
                                ) : (
                                  <span>Payer {(systemParams?.frais_reservation_montant || 2500).toLocaleString('fr-FR')} FCFA</span>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl flex items-center gap-2 text-emerald-800">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-semibold text-[11px]">Frais de confirmation réglés ({(systemParams?.frais_reservation_montant || 2500).toLocaleString('fr-FR')} FCFA)</span>
                            </div>

                            <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-2xl flex flex-col gap-3">
                              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                                <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span>Votre Rendez-vous Physique Attribué</span>
                              </div>
                              <p className="font-sans text-xs text-slate-600 leading-relaxed font-semibold">
                                Présentez-vous à la mairie pour la vérification physique des documents originaux :
                              </p>
                              <div className="bg-white border border-indigo-100 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs font-sans">
                                <div>
                                  <span className="text-slate-400 text-[9px] font-bold block uppercase tracking-wider">Date du rendez-vous</span>
                                  <span className="font-bold text-slate-800 block mt-0.5">
                                    {chosenDate ? (() => {
                                      const testDate = new Date(chosenDate);
                                      testDate.setDate(testDate.getDate() - 15);
                                      if (testDate.getDay() === 0) testDate.setDate(testDate.getDate() - 2);
                                      if (testDate.getDay() === 6) testDate.setDate(testDate.getDate() - 1);
                                      return testDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                                    })() : "24 Octobre 2026"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[9px] font-bold block uppercase tracking-wider">Heure du rendez-vous</span>
                                  <span className="font-bold text-slate-800 block mt-0.5">09h30</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 bg-amber-50 border border-amber-250 rounded-2xl flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Droits de Célébration (Caisse Physique)</span>
                              </div>
                              <p className="font-sans text-xs text-slate-600 leading-relaxed font-semibold">
                                Remarque importante : Lors de ce rendez-vous physique, après validation de vos documents par l'agent, vous devrez vous acquitter des frais suivants :
                              </p>
                              <div className="bg-white border border-amber-200/50 rounded-xl p-3 flex justify-between items-center text-xs font-sans shadow-sm">
                                <span className="font-bold text-slate-700">Frais à régler en caisse physique</span>
                                <span className="font-serif font-bold text-amber-700">{(systemParams?.frais_timbre_montant || 100000).toLocaleString('fr-FR')} FCFA</span>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <button onClick={() => setSimulatedReservationPaid(false)} className="px-4 py-3 border border-neutral-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-neutral-50 cursor-pointer transition-all">← Retour</button>
                              <button onClick={() => { 
                                  completeStep(5); 
                                  setShowParcours(false); 
                                  setTab('dashboard'); 
                                  const event = new CustomEvent('e_mariage_toast', {
                                    detail: {
                                      message: '🚀 Dossier transmis avec succès à la Mairie ! Retrouvez vos détails et convocations ci-dessous.',
                                      type: 'success'
                                    }
                                  });
                                  window.dispatchEvent(event);
                                }}
                                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-md transition-all flex items-center justify-center gap-2">
                                <span>🚀 Envoyer et finaliser mon dossier</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <button onClick={() => { setShowParcours(false); setTab('dossier'); }}
                          className="w-full py-2.5 rounded-xl border border-primary/30 text-primary text-xs font-bold hover:bg-primary/5 cursor-pointer transition-all">
                          📁 Consulter mes documents et pièces justificatives
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer : Dossier & Documents */}
              {!allDone && (
                <div className="px-5 pb-5 pt-3 border-t border-neutral-100 shrink-0">
                  <button onClick={() => { setShowParcours(false); setTab('dossier'); }}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all">
                    <span>Consulter mes pièces et documents officiels</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de récupération de dossier */}
      <AnimatePresence>
        {showRetrieveModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 backdrop-blur-md px-4 text-left font-sans">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-md p-6 border border-neutral-200 shadow-2xl relative my-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-slate-400 hover:text-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {otpStep === 'search' ? (
                <>
                  <h3 className="font-serif text-xl font-bold text-slate-900 border-b border-neutral-100 pb-3 mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    Retrouver un dossier existant
                  </h3>

                  <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium">
                    Si vous avez changé de téléphone ou de navigateur, saisissez votre **Code de dossier** (ex: `dossier_2026_5432`) ou l'un de vos **Numéros de téléphone** (ex: `+225 07 00 00 00 00`) pour reprendre votre parcours.
                  </p>

                  <form onSubmit={handleRetrieveSearch} className="space-y-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[10px] uppercase tracking-wider block">
                        Code dossier ou Numéro de téléphone
                      </label>
                      <input
                        type="text"
                        required
                        value={retrieveQuery}
                        onChange={(e) => setRetrieveQuery(e.target.value)}
                        placeholder="Ex: dossier_2026_1234 ou +225 07 00 00..."
                        className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50 focus:border-primary focus:outline-none"
                      />
                    </div>

                    {retrieveError && (
                      <div className="p-3 bg-rose-50 border border-primary/20 text-primary rounded-xl text-[11px] font-semibold leading-relaxed">
                        ⚠️ {retrieveError}
                      </div>
                    )}

                    <div className="flex gap-3 justify-end pt-3 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="flex-1 py-2.5 border border-neutral-350 rounded-xl text-xs font-bold text-slate-700 hover:bg-neutral-50 cursor-pointer transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={retrieving || !retrieveQuery.trim()}
                        className={`flex-1 py-2.5 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all border flex items-center justify-center gap-1.5 ${retrieving || !retrieveQuery.trim()
                          ? 'bg-neutral-200 text-neutral-400 border-neutral-300/20 cursor-not-allowed'
                          : 'bg-primary hover:bg-primary-container border-primary/20 cursor-pointer shadow-md'
                          }`}
                      >
                        {retrieving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Recherche...</span>
                          </>
                        ) : (
                          <span>Retrouver</span>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <h3 className="font-serif text-xl font-bold text-slate-900 border-b border-neutral-100 pb-3 mb-4 flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-600 border border-emerald-200 rounded-full p-0.5 bg-emerald-50" />
                    Vérification de sécurité
                  </h3>

                  <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium">
                    Un code de sécurité à 6 chiffres a été généré pour le dossier de <strong>{matchedDossier?.spouse1_name} & {matchedDossier?.spouse2_name}</strong> et envoyé par WhatsApp au numéro associé :
                  </p>

                  <div className="bg-slate-50 border border-neutral-200 rounded-xl p-3.5 mb-4 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Numéro de réception
                    </span>
                    <div className="font-mono font-bold text-slate-700 text-sm mt-1">
                      {otpTargetPhone ? (
                        `${otpTargetPhone.slice(0, 8)} •••• ${otpTargetPhone.slice(-3)}`
                      ) : (
                        "Aucun numéro disponible"
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[10px] uppercase tracking-wider block text-left">
                        Code de sécurité reçu (6 chiffres)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        pattern="[0-9]{6}"
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Saisir les 6 chiffres (ex: 123456)"
                        className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50 focus:border-primary focus:outline-none text-center font-mono text-base tracking-widest font-semibold"
                      />
                    </div>

                    {otpError && (
                      <div className="p-3 bg-rose-50 border border-primary/20 text-primary rounded-xl text-[11px] font-semibold leading-relaxed text-left">
                        ⚠️ {otpError}
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5 pt-3 border-t border-neutral-100">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => { setOtpStep('search'); setOtpError(null); }}
                          className="flex-1 py-2.5 border border-neutral-350 rounded-xl text-xs font-bold text-slate-700 hover:bg-neutral-50 cursor-pointer transition-colors"
                        >
                          Retour
                        </button>
                        <button
                          type="submit"
                          disabled={enteredOtp.length !== 6}
                          className={`flex-1 py-2.5 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all border flex items-center justify-center gap-1.5 ${enteredOtp.length !== 6
                            ? 'bg-neutral-200 text-neutral-400 border-neutral-300/20 cursor-not-allowed'
                            : 'bg-primary hover:bg-primary-container border-primary/20 cursor-pointer shadow-md'
                            }`}
                        >
                          Valider
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-[10px] text-slate-500 hover:text-primary transition-all duration-200 cursor-pointer text-center underline font-semibold bg-transparent border-none outline-none mt-1"
                      >
                        Renvoyer le code par WhatsApp
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeSlideIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bounceIn { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
