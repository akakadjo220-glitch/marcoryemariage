import React, { useState, useEffect } from 'react';
import {
  UserPlus, Building, CalendarDays, CalendarCheck,
  FolderUp, Megaphone, HeartHandshake, CheckCircle2, ChevronDown, Check, Compass,
  CreditCard, Smartphone, QrCode, Loader2, AlertCircle, ChevronRight, LayoutGrid, HelpCircle,
  ShieldAlert, Info, Download, Heart, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TimelineStep, PaystackConfig, PaymentInfo, DocumentInfo } from '../types';
import { ensurePhonePrefix, handlePhoneChange } from './Landing';
import { useVerifierDoublon } from '../utils/useVerifierDoublon';
import { CALENDRIER_RESERVATIONS_2026, checkIsOpened, getDaysRemainingStr, validateWeddingDate, getIvorianHolidays } from '../utils/calendarReservationUtils';
import { SpouseProfile, DEFAULT_SPOUSE_PROFILE, getRequiredDocsForProfiles } from '../utils/documentProfileUtils';

// Security helpers (same as Landing popup)
const getBordureStyle = (statut: string | null) => {
  if (!statut) return {};
  return {
    borderColor:
      statut === 'disponible' ? '#22c55e' :
      statut === 'doublon'    ? '#ef4444' :
      statut === 'invalide'   ? '#f97316' :
      statut === 'verification' ? '#3b82f6' :
      '#d1d5db',
    borderWidth: 2,
    borderStyle: 'solid'
  };
};
const getIcone = (statut: string | null) =>
  statut === 'verification' ? '🔍' :
  statut === 'disponible'   ? '✅' :
  statut === 'doublon'      ? '❌' :
  statut === 'invalide'     ? '⚠️' : '';
const getMessageColor = (statut: string | null) => {
  switch (statut) {
    case 'disponible': return 'text-emerald-600';
    case 'doublon': return 'text-rose-600';
    case 'invalide': return 'text-orange-500';
    case 'verification': return 'text-blue-500';
    default: return 'text-slate-400';
  }
};
import {
  getDossiers,
  updateDossierWeddingDate,
  DossierInfo,
  getMairies,
  MairieInfo,
  getPaystackConfig,
  recordPaymentInDb,
  getPaymentForDossier,
  triggerSpouseNotifications,
  checkAndProcessExpiredSlots,
  getCapacityForDate,
  checkDuplicateSpouse,
  updateDossierWeddingBooking,
  confirmPaystackReservationPayment,
  rescheduleAppointment,
  getSystemParameters,
  genererPlanningJour,
  SlotPlanning,
  SystemParameters,
  getSalles
} from '../services/dbService';
import MarriageReceiptModal from './MarriageReceiptModal';
import { generateReceiptPdf } from '../services/receiptService';


const REQUIRED_DOCS = [
  { id: 1, icon: '🪪', label: "CNI Époux", desc: "Pièce d'identité" },
  { id: 2, icon: '📸', label: "Selfie Époux", desc: "Contrôle facial" },
  { id: 3, icon: '📜', label: "Extrait Époux", desc: "Naissance" },
  { id: 4, icon: '🪪', label: "CNI Épouse", desc: "Pièce d'identité" },
  { id: 5, icon: '📸', label: "Selfie Épouse", desc: "Contrôle facial" },
  { id: 6, icon: '📜', label: "Extrait Épouse", desc: "Naissance" },
  { id: 7, icon: '🏠', label: "Autres docs", desc: "Justificatifs et témoins" }
];

interface TimelineProps {
  steps: TimelineStep[];
  setTab: (tab: string) => void;
  updateStepStatus: (id: number, status: 'completed' | 'active' | 'upcoming') => void;
  onMairieSelected?: (mairieId: string) => void;
  dossierId: string;
  spouse1Name: string;
  spouse2Name: string;
  spouse1Phone?: string;
  spouse2Phone?: string;
  spouse1Email?: string;
  spouse2Email?: string;
  onUpdateNames?: (
    spouse1: string,
    spouse2: string,
    phone1?: string,
    phone2?: string,
    email1?: string,
    email2?: string,
    birthdate1?: string,
    birthdate2?: string,
    cni1?: string,
    cni2?: string
  ) => void;
  onWeddingDateSelected?: (dateStr: string) => void;
  selectedMairieName?: string | null;
  documents: DocumentInfo[];
  spouse1Birthdate?: string;
  spouse2Birthdate?: string;
  spouse1Cni?: string;
  spouse2Cni?: string;
  dossierActiveStep: number;
  setDossierActiveStep: (step: number) => void;
  addNotification?: (message: string) => void;
  onOpenParcoursStep?: (step: number) => void;
}

export default function Timeline({
  steps,
  setTab,
  updateStepStatus,
  onMairieSelected,
  dossierId,
  spouse1Name,
  spouse2Name,
  spouse1Phone,
  spouse2Phone,
  spouse1Email,
  spouse2Email,
  onUpdateNames,
  onWeddingDateSelected,
  selectedMairieName,
  documents,
  spouse1Birthdate = '',
  spouse2Birthdate = '',
  spouse1Cni = '',
  spouse2Cni = '',
  dossierActiveStep,
  setDossierActiveStep,
  addNotification,
  onOpenParcoursStep
}: TimelineProps) {
  const hasNames = spouse1Name.trim() && spouse2Name.trim();
  const [selectedMairie, setSelectedMairie] = useState<string | null>(selectedMairieName || null);
  const [showMairieSelector, setShowMairieSelector] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(hasNames ? 2 : 1);

  // Guided Mode vs Classic Mode states
  const [viewMode, setViewMode] = useState<'guided' | 'classic'>('guided');
  const [guidedStepId, setGuidedStepId] = useState<number>(1);
  const [prevStepId, setPrevStepId] = useState<number>(1);
  const [isMoving, setIsMoving] = useState(false);

  const [editS1, setEditS1] = useState(spouse1Name);
  const [editS2, setEditS2] = useState(spouse2Name);
  const [editPhone1, setEditPhone1] = useState(spouse1Phone ? ensurePhonePrefix(spouse1Phone) : '+225 ');
  const [editPhone2, setEditPhone2] = useState(spouse2Phone ? ensurePhonePrefix(spouse2Phone) : '+225 ');
  const [editEmail1, setEditEmail1] = useState(spouse1Email || '');
  const [editEmail2, setEditEmail2] = useState(spouse2Email || '');
  const [editBirthdate1, setEditBirthdate1] = useState(spouse1Birthdate);
  const [editBirthdate2, setEditBirthdate2] = useState(spouse2Birthdate);
  const [editCni1, setEditCni1] = useState(spouse1Cni);
  const [editCni2, setEditCni2] = useState(spouse2Cni);
  const [editCniType1, setEditCniType1] = useState<'CNI' | 'PASSEPORT'>('CNI');
  const [editCniType2, setEditCniType2] = useState<'CNI' | 'PASSEPORT'>('CNI');
  const [editTargetMonthId, setEditTargetMonthId] = useState<string>('07');
  const [precheckConfirmed, setPrecheckConfirmed] = useState(false);
  const [dossierDuplicateError, setDossierDuplicateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [erreurCroisement, setErreurCroisement] = useState<string | null>(null);

  const triggerToast = (message: string) => {
    if (addNotification) {
      addNotification(message);
    } else {
      console.log("Toast:", message);
    }
  };

  // Real-time security hooks — declared after mairies/currentDossier (see below)
  // (timelineMairiePhone, timelineMairieId, checkPhone1…checkCni2 are declared after state)

  // Cross-validation: same phone or same CNI between époux 1 and 2
  useEffect(() => {
    const cleanP1 = editPhone1.trim().replace(/\s/g, '');
    const cleanP2 = editPhone2.trim().replace(/\s/g, '');
    const cleanC1 = editCni1.trim().toUpperCase();
    const cleanC2 = editCni2.trim().toUpperCase();
    if (cleanP1 && cleanP2 && cleanP1 === cleanP2 && cleanP1 !== '+225' && cleanP2 !== '+225') {
      setErreurCroisement("❌ L'époux et l'épouse ne peuvent pas avoir le même numéro de téléphone.");
      return;
    }
    if (cleanC1 && cleanC2 && cleanC1 === cleanC2) {
      setErreurCroisement("❌ Le numéro de pièce d'identité de l'époux et de l'épouse ne peuvent pas être identiques.");
      return;
    }
    setErreurCroisement(null);
  }, [editPhone1, editPhone2, editCni1, editCni2]);

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

  const [allDossiers, setAllDossiers] = useState<DossierInfo[]>([]);
  const [currentDossier, setCurrentDossier] = useState<DossierInfo | null>(null);
  const [selectedDateVal, setSelectedDateVal] = useState<string>('');
  const [dateError, setDateError] = useState<string | null>(null);

  const handleWeddingDateChange = (val: string) => {
    setSelectedDateVal(val);
    if (!val) {
      setDateError(null);
      return;
    }
    const validation = validateWeddingDate(val);
    if (!validation.isValid) {
      setDateError(validation.reason || "Date invalide.");
    } else {
      setDateError(null);
    }
  };

  const [mairies, setMairies] = useState<MairieInfo[]>([]);
  const [capacity, setCapacity] = useState<number>(15);
  const [salles, setSalles] = useState<any[]>([]);

  const [planningSlots, setPlanningSlots] = useState<SlotPlanning[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [systemParams, setSystemParams] = useState<SystemParameters | null>(null);
  const [paymentType, setPaymentType] = useState<'reservation' | 'final' | null>(null);

  useEffect(() => {
    async function loadParams() {
      const p = await getSystemParameters();
      setSystemParams(p);
      const s = await getSalles();
      setSalles(s);
    }
    loadParams();
  }, []);

  useEffect(() => {
    async function loadSlots() {
      if (!selectedDateVal) {
        setPlanningSlots([]);
        return;
      }
      setLoadingSlots(true);
      try {
        const slots = await genererPlanningJour(selectedDateVal);
        setPlanningSlots(slots);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, [selectedDateVal, allDossiers]);

  // Dynamically get the mairie phone for doublon error messages (after mairies/currentDossier are declared)
  const timelineMairiePhone = mairies.find(m => m.id === (currentDossier?.mairie_id || ''))?.phone || '+225 27 22 44 88 00';
  const timelineMairieId = currentDossier?.mairie_id || null;

  // Real-time security hooks — same as Landing popup
  const checkPhone1 = useVerifierDoublon(editPhone1, 'telephone', undefined, dossierId, timelineMairiePhone, timelineMairieId);
  const checkPhone2 = useVerifierDoublon(editPhone2, 'telephone', undefined, dossierId, timelineMairiePhone, timelineMairieId);
  const checkCni1 = useVerifierDoublon(editCni1, 'cni', editCniType1, dossierId, timelineMairiePhone, timelineMairieId);
  const checkCni2 = useVerifierDoublon(editCni2, 'cni', editCniType2, dossierId, timelineMairiePhone, timelineMairieId);

  useEffect(() => {
    async function loadCapacity() {
      const room = currentDossier?.mairie_id || 'cocody_salle_prestige';
      if (room && selectedDateVal) {
        const validation = validateWeddingDate(selectedDateVal);
        if (validation.isValid) {
          const cap = await getCapacityForDate(room, selectedDateVal);
          setCapacity(cap);
        } else {
          setCapacity(0); // If invalid, set capacity to 0
        }
      } else {
        setCapacity(15);
      }
    }
    loadCapacity();
  }, [currentDossier?.mairie_id, selectedDateVal]);

  const generateSlots = (capVal: number) => {
    const roomId = currentDossier?.mairie_id || 'cocody_salle_prestige';
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

  // Payment configuration and checkout states
  const [paystackConfig, setPaystackConfig] = useState<PaystackConfig | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [simulatedStatusText, setSimulatedStatusText] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<number>(1);
  const [showQuittanceModal, setShowQuittanceModal] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) { }
    };
  }, []);

  useEffect(() => {
    async function loadConfigAndPayment() {
      const cfg = await getPaystackConfig();
      setPaystackConfig(cfg);
      if (dossierId) {
        const pay = await getPaymentForDossier(dossierId);
        setPaymentInfo(pay);
      }
    }
    loadConfigAndPayment();
  }, [dossierId]);

  useEffect(() => {
    async function loadMairies() {
      const dbMairies = await getMairies();
      setMairies(dbMairies.filter(m => m.is_active));
    }
    loadMairies();
  }, []);

  useEffect(() => {
    setEditS1(spouse1Name);
    setEditS2(spouse2Name);
    setEditPhone1(spouse1Phone ? ensurePhonePrefix(spouse1Phone) : '+225 ');
    setEditPhone2(spouse2Phone ? ensurePhonePrefix(spouse2Phone) : '+225 ');
    setEditEmail1(spouse1Email || '');
    setEditEmail2(spouse2Email || '');
    setEditBirthdate1(spouse1Birthdate || '');
    setEditBirthdate2(spouse2Birthdate || '');
    setEditCni1(spouse1Cni || '');
    setEditCni2(spouse2Cni || '');
  }, [spouse1Name, spouse2Name, spouse1Phone, spouse2Phone, spouse1Email, spouse2Email, spouse1Birthdate, spouse2Birthdate, spouse1Cni, spouse2Cni]);

  useEffect(() => {
    if (hasNames && expandedStep === 1) {
      setExpandedStep(2);
    }
  }, [hasNames]);

  useEffect(() => {
    if (selectedMairieName) {
      setSelectedMairie(selectedMairieName);
    }
  }, [selectedMairieName]);

  useEffect(() => {
    async function loadDossierData() {
      if (!dossierId) return;
      await checkAndProcessExpiredSlots(dossierId);
      const dbDossiers = await getDossiers();
      setAllDossiers(dbDossiers);
      const mine = dbDossiers.find(d => d.id === dossierId);
      if (mine) {
        setCurrentDossier(mine);
        if (mine.wedding_date && !selectedDateVal) {
          const parsed = parseWeddingDateForInput(mine.wedding_date);
          if (parsed) {
            setSelectedDateVal(parsed);
          }
        }
      }
    }
    loadDossierData();
    const interval = setInterval(loadDossierData, 3000);
    return () => clearInterval(interval);
  }, [dossierId]);

  // Synchronize guided step with dossier progression
  useEffect(() => {
    const active = mappedSteps.find(s => s.status === 'active')?.id || 1;
    changeGuidedStep(active);
  }, [hasNames, selectedMairie, currentDossier?.wedding_date, paymentInfo]);

  // Synchroniser avec l'étape active globale
  useEffect(() => {
    if (dossierActiveStep && dossierActiveStep !== guidedStepId) {
      setPrevStepId(guidedStepId);
      setGuidedStepId(dossierActiveStep);
    }
  }, [dossierActiveStep]);

  const changeGuidedStep = (nextId: number) => {
    if (nextId !== guidedStepId) {
      setPrevStepId(guidedStepId);
      setGuidedStepId(nextId);
      if (setDossierActiveStep) {
        setDossierActiveStep(nextId);
      }
      setIsMoving(true);
      setTimeout(() => {
        setIsMoving(false);
      }, 550);
    }
  };

  const parseWeddingDateForInput = (wDateStr: string): string | null => {
    try {
      const months: { [key: string]: string } = {
        janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05', juin: '06',
        juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12', décembre: '12'
      };
      const cleaned = wDateStr.toLowerCase().trim();
      const yearMatch = cleaned.match(/\b(20\d{2})\b/);
      const dayMatch = cleaned.match(/\b(\d{1,2})\b/);
      if (!yearMatch || !dayMatch) return null;

      let mStr = '01';
      for (const [mName, mVal] of Object.entries(months)) {
        if (cleaned.includes(mName)) {
          mStr = mVal;
          break;
        }
      }
      const dStr = dayMatch[1].padStart(2, '0');
      return `${yearMatch[1]}-${mStr}-${dStr}`;
    } catch (e) {
      return null;
    }
  };

  const formatWeddingDate = (dateStr: string, timeStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = date.toLocaleDateString('fr-FR', options);
    return `${formattedDate} à ${timeStr.replace(':', 'h')}`;
  };

  const isSlotOccupied = (dateVal: string, slotTime: string): boolean => {
    if (!currentDossier) return false;
    const formatted = formatWeddingDate(dateVal, slotTime);
    return allDossiers.some(d =>
      d.id !== dossierId &&
      d.mairie_id === currentDossier.mairie_id &&
      d.wedding_date === formatted
    );
  };

  const getDocStatusDetailed = (stepId: number): { status: 'verified' | 'rejected' | 'uploading' | 'pending'; message?: string } => {
    if (!documents || documents.length === 0) return { status: 'pending' };

    const findStatus = (id: string) => {
      const doc = documents.find(d => d.id === id);
      if (!doc) return 'pending';
      if (doc.status === 'verified') return 'verified';
      if (doc.status === 'rejected') return 'rejected';
      if (doc.fileName || doc.status === 'uploading') return 'uploading';
      return 'pending';
    };

    const getMessage = (id: string) => {
      const doc = documents.find(d => d.id === id);
      return doc?.aiAnalysis?.motif || doc?.rejectionReason || '';
    };

    switch (stepId) {
      case 1: { // CNI Époux
        const s = findStatus('doc1');
        return { status: s, message: s === 'rejected' ? getMessage('doc1') : undefined };
      }
      case 2: { // Selfie Époux
        const attempts = currentDossier?.epoux_face_attempts ?? 0;
        const verified = currentDossier?.epoux_identite_verifiee === true;
        const hasUrl = !!currentDossier?.epoux_selfie_url;
        
        if (hasUrl && (verified || attempts >= 3)) {
          return { status: 'verified' };
        }
        if (attempts >= 3 && !verified) {
          return { status: 'rejected', message: "Contrôle facial non concordant après 3 essais." };
        }
        if (hasUrl && !verified) {
          return { status: 'uploading' };
        }
        return { status: 'pending' };
      }
      case 3: { // Extrait Époux
        const s = findStatus('doc2');
        return { status: s, message: s === 'rejected' ? getMessage('doc2') : undefined };
      }
      case 4: { // CNI Épouse
        const s = findStatus('doc1_f');
        return { status: s, message: s === 'rejected' ? getMessage('doc1_f') : undefined };
      }
      case 5: { // Selfie Épouse
        const attempts = currentDossier?.epouse_face_attempts ?? 0;
        const verified = currentDossier?.epouse_identite_verifiee === true;
        const hasUrl = !!currentDossier?.epouse_selfie_url;
        
        if (hasUrl && (verified || attempts >= 3)) {
          return { status: 'verified' };
        }
        if (attempts >= 3 && !verified) {
          return { status: 'rejected', message: "Contrôle facial non concordant après 3 essais." };
        }
        if (hasUrl && !verified) {
          return { status: 'uploading' };
        }
        return { status: 'pending' };
      }
      case 6: { // Extrait Épouse
        const s = findStatus('doc2_f');
        return { status: s, message: s === 'rejected' ? getMessage('doc2_f') : undefined };
      }
      case 7: { // Autres docs (Justificatifs + Témoins)
        const s3 = findStatus('doc3');
        const s3_f = findStatus('doc3_f');
        const s5 = findStatus('doc5');
        const s9 = findStatus('doc9');
        
        const isUploaded = (s: string) => s === 'verified' || s === 'uploading';

        const allV = s3 === 'verified' && s3_f === 'verified' && s5 === 'verified' && s9 === 'verified';
        if (allV) return { status: 'verified' };
        
        if (s3 === 'rejected') return { status: 'rejected', message: `Justif Époux : ${getMessage('doc3')}` };
        if (s3_f === 'rejected') return { status: 'rejected', message: `Justif Épouse : ${getMessage('doc3_f')}` };
        if (s5 === 'rejected') return { status: 'rejected', message: `Témoin 1 : ${getMessage('doc5')}` };
        if (s9 === 'rejected') return { status: 'rejected', message: `Témoin 2 : ${getMessage('doc9')}` };
        
        const allUploaded = isUploaded(s3) && isUploaded(s3_f) && isUploaded(s5) && isUploaded(s9);
        if (allUploaded) {
          return { status: 'uploading' };
        }

        const missing: string[] = [];
        if (!isUploaded(s3)) missing.push("Justif. Époux");
        if (!isUploaded(s3_f)) missing.push("Justif. Épouse");
        if (!isUploaded(s5)) missing.push("CNI Témoin 1");
        if (!isUploaded(s9)) missing.push("CNI Témoin 2");

        return { 
          status: 'pending', 
          message: missing.length === 4 ? undefined : `Pièces manquantes (${4 - missing.length}/4 fournies) : ${missing.join(', ')}` 
        };
      }
      default:
        return { status: 'pending' };
    }
  };

  const handleDocumentAction = (stepId: number) => {
    setDossierActiveStep(stepId);
    setTab('dossier');
  };

  const getRemainingTimeText = () => {
    if (!currentDossier?.slot_reserved_at) return 'Non planifié';
    const reservedAt = new Date(currentDossier.slot_reserved_at).getTime();
    const expiryTime = reservedAt + 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const diff = expiryTime - now;
    if (diff <= 0) return 'Expiré (Libération automatique)';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 65)); // slight adjustment
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} jour(s) et ${hours} heure(s) restant(s)`;
    }
    return `${hours} heure(s) et ${mins} minute(s) restant(s)`;
  };

  const handleSelectSlot = async (slotTime: string, salleId: string) => {
    if (!dossierId || !selectedDateVal) return;
    const newDateStr = formatWeddingDate(selectedDateVal, slotTime);
    const success = await updateDossierWeddingBooking(
      dossierId,
      newDateStr,
      selectedDateVal,
      slotTime,
      salleId
    );
    if (success) {
      if (onWeddingDateSelected) {
        onWeddingDateSelected(newDateStr);
      }
      const dbDossiers = await getDossiers();
      setAllDossiers(dbDossiers);
      const mine = dbDossiers.find(d => d.id === dossierId);
      if (mine) {
        setCurrentDossier(mine);
      }

      await updateStepStatus(3, 'completed');
      await updateStepStatus(4, 'active');
      setExpandedStep(4);
      changeGuidedStep(4);
    }
  };

  const handleInitialSaveNames = async (e: React.FormEvent) => {
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
          editEmail1,
          editEmail2,
          '',
          '',
          editCni1.trim(),
          editCni2.trim()
        );
      }
      await updateStepStatus(1, 'completed');
      await updateStepStatus(2, 'active');
      setExpandedStep(2);
      changeGuidedStep(2);
    } catch (err: any) {
      console.error("Dossier creation validation failed:", err);
      setDossierDuplicateError("Échec de la validation du dossier civil.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateDocsAndPay = async () => {
    await updateStepStatus(4, 'completed');
    await updateStepStatus(5, 'active');
    setExpandedStep(5);
    changeGuidedStep(5);
    await triggerSpouseNotifications(dossierId, 'payment_required');
  };

  const handleReservationPaymentSuccess = async (ref: string, method: string) => {
    if (!dossierId) return;
    const success = await confirmPaystackReservationPayment(dossierId, ref);
    if (success) {
      triggerToast(`Frais de réservation réglés avec succès via ${method} !`);
      const dbDossiers = await getDossiers();
      setAllDossiers(dbDossiers);
      const mine = dbDossiers.find(d => d.id === dossierId);
      if (mine) {
        setCurrentDossier(mine);
      }
      await updateStepStatus(4, 'completed');
      await updateStepStatus(5, 'active');
      setExpandedStep(5);
      changeGuidedStep(5);
    }
  };

  const handlePaymentSuccess = async (reference: string, method: string) => {
    if (!dossierId) return;
    const amount = 100000;
    const currency = 'XOF';

    const payment: PaymentInfo = {
      id: `pay_${dossierId}_${Date.now()}`,
      dossierId: dossierId,
      amount: amount,
      currency: currency,
      status: 'success',
      reference: reference,
      method: method,
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      mairieId: currentDossier?.mairie_id || 'mairie_cocody'
    };

    await recordPaymentInDb(payment);
    setPaymentInfo(payment);
    setCheckoutStep(3);

    await updateStepStatus(6, 'completed');
    await updateStepStatus(7, 'active');
    setExpandedStep(7);
    changeGuidedStep(7);

    await triggerSpouseNotifications(dossierId, 'paid');
  };

  const handleRealPaystackPayment = () => {
    if (!paystackConfig || !dossierId) return;
    setPaying(true);

    const handler = (window as any).PaystackPop.setup({
      key: paystackConfig.publicKey,
      email: 'citoyen@e-mariage.ci',
      amount: (paymentType === 'reservation' ? 2500 : 100000) * 100,
      currency: 'XOF',
      ref: 'EMAR-' + Math.floor(Math.random() * 1000000000),
      callback: function (response: any) {
        setPaying(false);
        if (paymentType === 'reservation') {
          handleReservationPaymentSuccess(response.reference, 'Paystack API');
        } else {
          handlePaymentSuccess(response.reference, 'Paystack API');
        }
      },
      onClose: function () {
        setPaying(false);
      }
    });
    handler.openIframe();
  };

  const handleSimulatedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod !== 'card' && !paymentPhone) return;
    setPaying(true);
    setSimulatedStatusText("Initialisation de la transaction sécurisée...");

    setTimeout(() => {
      setSimulatedStatusText("Génération de la demande de paiement mobile...");
      setTimeout(() => {
        setSimulatedStatusText(paymentMethod === 'card'
          ? "Interrogation du réseau de carte bancaire Visa/Mastercard..."
          : `Envoi de la notification de débit sur le numéro ${paymentPhone}...`
        );
        setTimeout(() => {
          setPaying(false);
          setShowOtpPopup(true);
        }, 1200);
      }, 1200);
    }, 1000);
  };


  const startReservationPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) {
      triggerToast("Veuillez sélectionner un mode de paiement !");
      return;
    }
    if (paymentMethod !== 'card' && !paymentPhone.trim()) {
      triggerToast("Veuillez saisir votre numéro de téléphone de débit !");
      return;
    }
    setPaymentType('reservation');
    
    if (paystackConfig && paystackConfig.publicKey && paystackConfig.publicKey.startsWith('pk_')) {
      handleRealPaystackPayment();
    } else {
      handleSimulatedPayment(e);
    }
  };

  const startFinalPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentType('final');
    if (paystackConfig && paystackConfig.publicKey && paystackConfig.publicKey.startsWith('pk_')) {
      handleRealPaystackPayment();
    } else {
      setPaying(true);
      setSimulatedStatusText("Initialisation de la transaction municipale...");
      setTimeout(() => {
        setSimulatedStatusText("Génération de la quittance numérique...");
        setTimeout(() => {
          setPaying(false);
          setShowOtpPopup(true);
        }, 1200);
      }, 1000);
    }
  };

  const handleVerifyOtp = () => {
    if (!otpValue || otpValue.length < 4) return;
    setShowOtpPopup(false);
    setPaying(true);
    setSimulatedStatusText("Vérification du code de sécurité...");

    setTimeout(() => {
      setSimulatedStatusText(paymentType === 'reservation' ? "Confirmation de la réservation..." : "Validation fiscale municipale en cours...");
      setTimeout(async () => {
        setPaying(false);
        const ref = 'EMAR-SIM-' + Math.floor(10000000 + Math.random() * 90000000);
        let methodName = 'Carte Bancaire';
        if (paymentMethod === 'wave') methodName = 'Wave Mobile Money';
        if (paymentMethod === 'orange') methodName = 'Orange Money';
        if (paymentMethod === 'mtn') methodName = 'MTN Mobile Money';
        if (paymentMethod === 'moov') methodName = 'Moov Money';

        if (paymentType === 'reservation') {
          await handleReservationPaymentSuccess(ref, methodName);
        } else {
          await handlePaymentSuccess(ref, methodName);
        }
      }, 1200);
    }, 1200);
  };

  const selectMairie = (id: string, name: string) => {
    setSelectedMairie(name);
    setShowMairieSelector(false);

    if (onMairieSelected) {
      onMairieSelected(id);
    }

    updateStepStatus(2, 'completed');
    updateStepStatus(3, 'active');
    setExpandedStep(3);
    changeGuidedStep(3);
  };

  const toggleStepExpand = (id: number) => {
    setExpandedStep(expandedStep === id ? null : id);
  };

  const renderStepIcon = (iconName: string, status: string) => {
    const props = { className: 'w-5 h-5' };
    switch (iconName) {
      case 'UserPlus': return <UserPlus {...props} />;
      case 'Building': return <Building {...props} />;
      case 'CalendarDays': return <CalendarDays {...props} />;
      case 'CalendarCheck': return <CalendarCheck {...props} />;
      case 'FolderUp': return <FolderUp {...props} />;
      case 'CreditCard': return <CreditCard {...props} />;
      case 'Megaphone': return <Megaphone {...props} />;
      case 'HeartHandshake': return <HeartHandshake {...props} />;
      default: return <CheckCircle2 {...props} />;
    }
  };

  const stepStatuses = [1, 2, 3, 4, 5, 6, 7].map(stepId => getDocStatusDetailed(stepId));
  const allRequiredUploaded = stepStatuses.every(s => s.status === 'verified' || s.status === 'uploading');
  const allRequiredDocsVerified = stepStatuses.every(s => s.status === 'verified' || s.status === 'uploading');
  const missingDocsCount = stepStatuses.filter(s => s.status === 'pending' || s.status === 'rejected').length;

  const mappedSteps = steps.map(step => {
    let status = step.status;
    let desc = step.description;
    let details = step.details || '';
    let title = step.title;
    let icon = step.icon;

    if (step.id === 1) {
      title = "Création du dossier";
      icon = "UserPlus";
      status = hasNames ? ('completed' as const) : ('active' as const);
      desc = hasNames
        ? `Identité de ${spouse1Name} & ${spouse2Name} enregistrée.`
        : "Renseignez l'identité des futurs époux pour initialiser le dossier civil.";
      details = hasNames
        ? `Dossier N° ${dossierId.toUpperCase().replace('DOSSIER_', '')} initié avec succès. L'identité des futurs époux (${spouse1Name} & ${spouse2Name}) est déclarée.`
        : "Veuillez renseigner le nom des futurs époux dans votre tableau de bord de suivi pour initialiser officiellement le dossier d'union.";
    } else if (step.id === 2) {
      title = "Choix de la mairie";
      icon = "Building";
      status = hasNames
        ? (selectedMairie ? ('completed' as const) : ('active' as const))
        : ('upcoming' as const);
      desc = selectedMairie
        ? `Mairie de célébration sélectionnée : ${selectedMairieName || selectedMairie}.`
        : "Sélectionnez votre mairie de célébration.";
      details = selectedMairie
        ? `Mairie : ${selectedMairieName || selectedMairie}.`
        : "Veuillez choisir la mairie locale dans laquelle célébrer votre union civile.";
    } else if (step.id === 3) {
      title = "Dépôt des documents";
      icon = "FolderUp";
      status = selectedMairie
        ? (allRequiredDocsVerified ? ('completed' as const) : ('active' as const))
        : ('upcoming' as const);
      desc = allRequiredDocsVerified
        ? "Toutes vos pièces justificatives ont été vérifiées et validées."
        : `Dépôt des documents en cours. ${missingDocsCount} document(s) restants ou rejetés.`;
      details = allRequiredDocsVerified
        ? "Félicitations, l'IA et l'officier d'état civil ont validé toutes vos pièces."
        : "Veuillez téléverser les justificatifs requis et effectuer le contrôle de ressemblance faciale selfie.";
    } else if (step.id === 4) {
      title = "Option de date";
      icon = "CalendarDays";
      status = allRequiredDocsVerified
        ? (currentDossier?.wedding_date ? ('completed' as const) : ('active' as const))
        : ('upcoming' as const);
      desc = currentDossier?.wedding_date
        ? `Date réservée pour le ${currentDossier.wedding_date}.`
        : "Choisissez et réservez votre date de célébration.";
      details = currentDossier?.wedding_date
        ? `Célébration programmée le ${currentDossier.wedding_date}.`
        : "Sélectionnez une date libre dans le calendrier de la mairie sélectionnée.";
    } else if (step.id === 5) {
      title = "Confirmation & Paiement";
      icon = "CreditCard";
      const isReservationPaid = currentDossier?.frais_reservation_paye === true;
      const isCaissePaid = currentDossier?.frais_timbre_paye === true;
      const allStep5Complete = isReservationPaid && isCaissePaid;

      status = currentDossier?.wedding_date
        ? (allStep5Complete ? ('completed' as const) : ('active' as const))
        : ('upcoming' as const);
      desc = allStep5Complete
        ? "Frais de confirmation et droits de célébration réglés."
        : "Réglez vos frais de célébration en caisse de mairie.";
      details = allStep5Complete
        ? "Vos paiements ont été traités et votre célébration est officiellement confirmée."
        : `Veuillez régler les droits de célébration (${(systemParams?.frais_timbre_montant || 100000).toLocaleString('fr-FR')} FCFA) à la caisse de la mairie lors de votre rendez-vous.`;
    } else if (step.id === 6) {
      title = "Célébration d'Union";
      icon = "HeartHandshake";
      const isReservationPaid = currentDossier?.frais_reservation_paye === true;
      const isCaissePaid = currentDossier?.frais_timbre_paye === true;
      const allStep5Complete = isReservationPaid && isCaissePaid;

      status = allStep5Complete ? ('active' as const) : ('upcoming' as const);
      desc = "Célébration officielle de votre mariage civil en mairie.";
      details = "Présentation requise 1 heure avant la célébration avec vos témoins munis de leurs pièces d'identité.";
    }

    return {
      ...step,
      title,
      description: desc,
      icon,
      details,
      status
    };
  });

  const currentStep = mappedSteps.find(s => s.id === guidedStepId) || mappedSteps[0];
  const slideDirection = guidedStepId > prevStepId ? 1 : -1;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 50 : -50,
      opacity: 0
    })
  };

  const renderStepContent = (stepId: number) => {
    switch (stepId) {
      case 1:
        return (
          <div className="space-y-4">
            {!precheckConfirmed && !dossierId ? (
              <div className="space-y-4 font-sans text-xs text-left max-w-md mx-auto bg-white p-5 rounded-2xl border border-accent/20 shadow-sm animate-fade-in">
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

                <div className="flex flex-col gap-2.5 p-4 bg-neutral-50 border border-neutral-200 rounded-2xl shadow-inner-sm">
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wider font-sans">
                    Mois de célébration souhaité *
                  </label>

                  <select
                    value={editTargetMonthId}
                    onChange={e => setEditTargetMonthId(e.target.value)}
                    className="w-full border border-neutral-300 rounded-xl px-4 py-3 bg-white font-semibold focus:border-primary focus:outline-none cursor-pointer text-xs transition-all shadow-sm font-sans"
                  >
                    {CALENDRIER_RESERVATIONS_2026.map(slot => (
                      <option key={slot.id} value={slot.id}>
                        {slot.moisCélébration} (Réservations : dès le {slot.debutReservation})
                      </option>
                    ))}
                  </select>

                  {/* Dynamic Status Card */}
                  {(() => {
                    const item = CALENDRIER_RESERVATIONS_2026.find(c => c.id === editTargetMonthId);
                    if (!item) return null;
                    const isOpened = checkIsOpened(item.ouvertureIso);
                    const remaining = getDaysRemainingStr(item.ouvertureIso);

                    return (
                      <div className="mt-2 space-y-3">
                        <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
                          isOpened
                            ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
                            : 'bg-amber-50/95 border-amber-200 text-amber-950'
                        }`}>
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="flex items-center gap-1.5">
                              {isOpened ? '🟢 Réservations Ouvertes !' : `⏳ Réservations pas encore ouvertes`}
                            </span>
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                              isOpened ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
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
            ) : (
              <form onSubmit={handleInitialSaveNames} className="space-y-4 max-w-md bg-white p-5 rounded-2xl border border-accent/20 shadow-sm">
              {dossierId && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-violet-500 shrink-0" />
                  <p className="font-sans text-xs text-violet-700">Dossier <strong>#{dossierId.slice(-8).toUpperCase()}</strong> déjà créé. Vous pouvez modifier les informations ci-dessous.</p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 text-left">Futur époux — Prénom et Nom</label>
                  <input required value={editS1} onChange={e => setEditS1(e.target.value)} placeholder="Ex: Jean-Marc KOUASSI"
                    className="w-full border border-neutral-200 rounded-xl p-3.5 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 text-left">Future épouse — Prénom et Nom</label>
                  <input required value={editS2} onChange={e => setEditS2(e.target.value)} placeholder="Ex: Marie-Claire DIALLO"
                    className="w-full border border-neutral-200 rounded-xl p-3.5 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 text-left">Tél. Époux</label>
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
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 text-left">Tél. Épouse</label>
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
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 text-left">Type de pièce Époux *</label>
                    <select value={editCniType1} onChange={e => setEditCniType1(e.target.value as any)}
                      className="w-full border border-neutral-200 rounded-xl p-3 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans">
                      <option value="CNI">CNI</option>
                      <option value="PASSEPORT">PASSEPORT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 text-left">Type de pièce Épouse *</label>
                    <select value={editCniType2} onChange={e => setEditCniType2(e.target.value as any)}
                      className="w-full border border-neutral-200 rounded-xl p-3 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans">
                      <option value="CNI">CNI</option>
                      <option value="PASSEPORT">PASSEPORT</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 text-left">N° Pièce Époux *</label>
                    <input required value={editCni1} onChange={e => {
                      setEditCni1(e.target.value);
                      if (dossierDuplicateError) setDossierDuplicateError(null);
                    }} onBlur={() => checkCni1.triggerVerification()} placeholder={editCniType1 === 'PASSEPORT' ? 'Ex: 12BC34567' : 'Ex: CI0012345678'}
                      style={{ textTransform: 'uppercase', ...getBordureStyle(checkCni1.statut) }}
                      className="w-full border border-neutral-200 rounded-xl p-3 text-sm focus:border-primary focus:outline-none bg-neutral-50 font-sans" />
                    {checkCni1.message && (
                      <p className={`text-[10px] font-sans font-semibold mt-1 whitespace-pre-line ${getMessageColor(checkCni1.statut)}`}>
                        {getIcone(checkCni1.statut)} {checkCni1.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-widest mb-1.5 text-left">N° Pièce Épouse *</label>
                    <input required value={editCni2} onChange={e => {
                      setEditCni2(e.target.value);
                      if (dossierDuplicateError) setDossierDuplicateError(null);
                    }} onBlur={() => checkCni2.triggerVerification()} placeholder={editCniType2 === 'PASSEPORT' ? 'Ex: 12BC34567' : 'Ex: CI0087654321'}
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
                  <div className="text-left">
                    <p className="font-bold">Erreur de validation croisée</p>
                    <p className="mt-0.5 font-semibold text-rose-800 whitespace-pre-line">{erreurCroisement}</p>
                  </div>
                </div>
              )}

              {dossierDuplicateError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-sans leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-700 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-bold">Erreur de validation</p>
                    <p className="mt-0.5 font-semibold text-rose-800">{dossierDuplicateError}</p>
                  </div>
                </div>
              )}

              {(() => {
                const peutContinuer =
                  checkPhone1.statut === 'disponible' &&
                  checkPhone2.statut === 'disponible' &&
                  checkCni1.statut === 'disponible' &&
                  checkCni2.statut === 'disponible' &&
                  !erreurCroisement &&
                  !submitting &&
                  editS1.trim() && editS2.trim() &&
                  isValidDateStr(editBirthdate1) && isValidDateStr(editBirthdate2) &&
                  editCni1.trim() && editCni2.trim();
                return (
                  <button type="submit" disabled={!peutContinuer}
                    style={{ opacity: peutContinuer ? 1 : 0.5, cursor: peutContinuer ? 'pointer' : 'not-allowed' }}
                    className={`w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all mt-2 flex items-center justify-center gap-2 bg-primary hover:bg-primary-container shadow-md`}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-accent" />
                        <span>Validation en cours...</span>
                      </>
                    ) : (
                      <span>Continuer → Dépôt des documents justificatifs</span>
                    )}
                  </button>
                );
              })()}
            </form>
            )}
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            {selectedMairie ? (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-sky-500 shrink-0" />
                <p className="font-sans text-xs text-sky-700">Mairie sélectionnée : <strong>{selectedMairieName || selectedMairie}</strong>.</p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold">
                ⚠️ Veuillez sélectionner la mairie/salle de célébration de votre choix ci-dessous.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mairies.map(m => (
                <div
                  key={m.id}
                  onClick={() => selectMairie(m.id, m.name)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 text-left ${
                    (selectedMairie === m.name || currentDossier?.mairie_id === m.id)
                      ? 'border-primary bg-primary/5 shadow-sm font-bold'
                      : 'border-neutral-100 hover:border-primary/40 bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-sans font-bold text-sm text-slate-800 block">{m.name}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{m.region}</span>
                      {m.officer_name && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">Officier : {m.officer_name}</span>
                      )}
                    </div>
                    {(selectedMairie === m.name || currentDossier?.mairie_id === m.id) && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedMairie && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => changeGuidedStep(3)}
                  className="bg-primary hover:bg-primary-container text-white py-2.5 px-5 rounded-xl font-extrabold uppercase text-[10px] tracking-wider transition-all shadow-md cursor-pointer border border-primary/20 flex items-center gap-1"
                >
                  Continuer → Dépôt des documents
                </button>
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REQUIRED_DOCS.map((doc, i) => {
                const { status, message } = getDocStatusDetailed(doc.id);
                
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
                            {doc.label}
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
                    {status === 'pending' && message && (
                      <div className="p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[9.5px] font-semibold text-amber-900 leading-normal text-left font-sans shadow-sm">
                        📌 {message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setTab('dossier')}
                className="border border-neutral-300 hover:border-primary text-slate-700 hover:text-primary text-xs font-bold px-4 py-2.5 rounded-lg transition-colors bg-white font-sans cursor-pointer shadow-sm"
              >
                Aller à l'espace Dossier
              </button>

              {allRequiredUploaded ? (
                <button
                  onClick={() => {
                    if (onOpenParcoursStep) {
                      onOpenParcoursStep(4);
                    } else {
                      changeGuidedStep(4);
                    }
                  }}
                  className="bg-primary hover:bg-primary-container text-white py-2.5 px-5 rounded-xl font-extrabold uppercase text-[10px] tracking-wider transition-all shadow-md cursor-pointer border border-primary/20 flex items-center gap-1"
                >
                  Continuer → Option de date
                </button>
              ) : (
                <div className="p-3.5 bg-rose-50 border border-primary/20 text-primary rounded-xl text-xs font-semibold leading-relaxed flex items-start gap-2.5 flex-1">
                  <AlertCircle className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-bold text-primary">Dépôt incomplet</p>
                    <p className="text-primary/80 text-[11px] mt-0.5">
                      Veuillez téléverser tous les documents requis pour continuer. Il vous reste <span className="font-bold">{missingDocsCount} document(s)</span> à ajouter.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4 font-sans text-xs animate-fade-in">
            <div className="flex flex-col gap-1.5 text-left max-w-xs">
              <label className="font-bold text-slate-755">Choisissez votre date de célébration :</label>
              <input
                type="date"
                value={selectedDateVal}
                min={(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 30);
                  return d.toISOString().split('T')[0];
                })()}
                onChange={(e) => handleWeddingDateChange(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:border-primary text-xs font-medium"
              />
            </div>

            {dateError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[10px] leading-relaxed font-semibold flex items-start gap-2.5 text-left max-w-md">
                <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{dateError}</span>
              </div>
            )}

            {selectedDateVal && (() => {
              const parts = selectedDateVal.split('-');
              if (parts.length < 2) return null;
              const mNum = parseInt(parts[1], 10);
              let slotId = parts[1];
              if (mNum === 2 || mNum === 3) slotId = "02_03";
              else if (mNum === 4 || mNum === 5) slotId = "04_05";
              else if (mNum < 10 && mNum !== 2 && mNum !== 3 && mNum !== 4 && mNum !== 5) {
                slotId = `0${mNum}`;
              }
              const slotItem = CALENDRIER_RESERVATIONS_2026.find(s => s.id === slotId);
              if (!slotItem) return null;
              const isOpened = checkIsOpened(slotItem.ouvertureIso);
              const remaining = getDaysRemainingStr(slotItem.ouvertureIso);

              return (
                <div className={`p-3.5 rounded-2xl border text-xs font-sans text-left flex items-start gap-3 ${
                  isOpened
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/90 border-amber-200 text-amber-950'
                }`}>
                  <CalendarDays className={`w-5 h-5 shrink-0 mt-0.5 ${isOpened ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <div>
                    <div className="flex items-center gap-2 font-bold">
                      <span>{slotItem.moisCélébration}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                        isOpened ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                      }`}>
                        {isOpened ? '🟢 Ouvert aux réservations' : `⏳ ${remaining || 'Bientôt'}`}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium mt-1 leading-relaxed">
                      {isOpened
                        ? `Les réservations pour ce mois sont ouvertes. Vous pouvez choisir votre créneau ci-dessous.`
                        : `Attention : Les réservations officielles pour ${slotItem.moisCélébration} ouvriront le ${slotItem.debutReservation} à la Mairie.`}
                    </p>
                    <p className="text-[10px] italic opacity-85 mt-1">
                      💡 {slotItem.conseil}
                    </p>
                  </div>
                </div>
              );
            })()}

            {!dateError && selectedDateVal && (
              <div className="flex flex-col gap-2.5 text-left animate-reveal-up mt-4 font-sans text-xs">
                <label className="font-bold text-slate-755">Créneaux horaires interlacés par salle (Marcory) :</label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Chargement des créneaux en direct...</span>
                  </div>
                ) : planningSlots.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    Aucun créneau disponible pour ce jour (les célébrations ont lieu du mercredi au samedi).
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {planningSlots.map((slotObj, idx) => {
                      const displayDate = formatWeddingDate(selectedDateVal, slotObj.heure_debut);
                      const isSelected = currentDossier?.wedding_date === displayDate;
                      const isOccupied = !slotObj.disponible;

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isOccupied}
                          onClick={() => handleSelectSlot(slotObj.heure_debut, slotObj.salle_id)}
                          className={`py-3 px-4 rounded-2xl border text-xs text-left transition-all ${isOccupied
                              ? 'bg-neutral-100 border-neutral-200 text-neutral-400 line-through cursor-not-allowed opacity-60'
                              : isSelected
                                ? 'bg-primary border-primary text-white shadow-md'
                                : 'bg-white border-neutral-250 hover:border-primary hover:text-primary text-slate-700 cursor-pointer shadow-sm hover:shadow'
                            }`}
                        >
                          <div className="font-bold text-[11px]">🕒 {slotObj.heure_debut.replace(':', 'h')} - {slotObj.heure_fin.replace(':', 'h')}</div>
                          <div className={`text-[9px] mt-0.5 ${isSelected ? 'text-rose-100' : 'text-slate-455'}`}>{slotObj.salle_nom}</div>
                          {isOccupied && <div className="text-[8px] text-red-500 font-extrabold uppercase mt-1">Non dispo ({slotObj.reason})</div>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {currentDossier?.wedding_date && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => changeGuidedStep(5)}
                  className="bg-primary hover:bg-primary-container text-white py-2.5 px-5 rounded-xl font-extrabold uppercase text-[10px] tracking-wider transition-all shadow-md cursor-pointer border border-primary/20 flex items-center gap-1"
                >
                  Continuer → Confirmation & Paiement
                </button>
              </div>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-4 font-sans text-xs">
            {!currentDossier?.frais_reservation_paye ? (
              <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border border-neutral-200 rounded-2xl flex flex-col gap-4 text-left shadow-inner animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shrink-0 shadow">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif text-base font-bold text-slate-800">Frais de confirmation de réservation</h4>
                    <p className="font-sans text-xs text-slate-500 mt-1 leading-relaxed">
                      Pour verrouiller provisoirement votre créneau civil du <strong>{currentDossier?.wedding_date}</strong>, vous devez vous acquitter des frais de confirmation en ligne de <strong>2 500 FCFA</strong>.
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 flex flex-col gap-3">
                  <label className="text-[11px] font-bold text-slate-655 uppercase tracking-wider">Mode de paiement en ligne (Paystack) :</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'wave', label: 'Wave' },
                      { id: 'orange', label: 'Orange Money' },
                      { id: 'mtn', label: 'MTN Money' },
                      { id: 'card', label: 'Carte Bancaire' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`py-2 rounded-xl border text-xs font-bold text-center transition-all ${
                          paymentMethod === m.id
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-neutral-250 bg-white hover:border-slate-400 text-slate-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {paymentMethod && paymentMethod !== 'card' && (
                    <div className="flex flex-col gap-1.5 max-w-xs mt-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Numéro de téléphone de débit :</label>
                      <input
                        type="tel"
                        placeholder="Ex: 0707070707"
                        value={paymentPhone}
                        onChange={e => setPaymentPhone(e.target.value)}
                        className="w-full border border-neutral-300 rounded-xl px-3 py-2 bg-white text-xs"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => startReservationPayment(e)}
                    className="bg-primary hover:bg-primary-container text-white py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md mt-4 transition-all flex items-center justify-center gap-2 border border-primary/20"
                  >
                    <span>Payer 2 500 FCFA via Paystack</span>
                    <ChevronRight className="w-4 h-4 text-accent animate-pulse" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-[11px]">Frais de confirmation réglés (2 500 FCFA)</span>
                  </div>
                  <a
                    href={currentDossier.recu_url_pdf || '#'}
                    download={`recu_reservation_${dossierId}.pdf`}
                    onClick={async (e) => {
                      e.preventDefault();
                      const matchedSalle = salles.find(s => s.id === currentDossier.salle_id);
                      const salleNom = matchedSalle ? matchedSalle.nom : 'Salle Principale';
                      await generateReceiptPdf({
                        dossierId: currentDossier.id,
                        reference: currentDossier.frais_reservation_reference || 'EMAR-SIM-RES1234',
                        spouse1Name: currentDossier.spouse1_name,
                        spouse2Name: currentDossier.spouse2_name,
                        weddingDate: currentDossier.wedding_date || '',
                        salleNom: salleNom,
                        montant: currentDossier.frais_reservation_montant || 2500,
                        datePaiement: currentDossier.frais_reservation_date_paiement || new Date().toISOString()
                      });
                      triggerToast("Reçu de paiement téléchargé en PDF !");
                    }}
                    className="text-[10px] text-emerald-700 font-extrabold hover:underline flex items-center gap-0.5"
                  >
                    <Download className="w-3 h-3" /> Reçu PDF
                  </a>
                </div>

                {currentDossier?.status !== 'scheduled' && currentDossier?.status !== 'paid' ? (
                  <div className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-250 rounded-2xl flex flex-col gap-4 text-left shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center shrink-0 shadow">
                        <Building className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-serif text-sm font-bold text-slate-800">Dépôt du dossier physique & Rendez-vous</h4>
                        <p className="font-sans text-[11px] text-slate-500 mt-0.5 leading-relaxed font-semibold">
                          Présentation obligatoire des originaux pour instruction par l'officier civil.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-white border border-indigo-100 rounded-xl">
                      <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                        <div>
                          <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block">Date du rendez-vous</span>
                          <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                            {currentDossier?.date_rendezvous 
                              ? (() => {
                                  const parts = currentDossier.date_rendezvous.split('/');
                                  if (parts.length === 3) {
                                    const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                                    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                                  }
                                  return currentDossier.date_rendezvous;
                                })()
                              : "Non planifié"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block">Heure du rendez-vous</span>
                          <span className="font-bold text-slate-800 text-sm mt-0.5 block">🕒 {currentDossier?.heure_rendezvous || "09:00"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-3 font-sans text-xs">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-505 uppercase tracking-wider">
                        <span>Reprogrammer mon rendez-vous (Matin uniquement)</span>
                        <span className={`${
                          (currentDossier?.nombre_reprogrammations || 0) >= (systemParams?.nombre_reprogrammations_limite || 3)
                            ? 'text-rose-500 font-extrabold'
                            : 'text-indigo-600'
                        }`}>
                          {(currentDossier?.nombre_reprogrammations || 0)} / {systemParams?.nombre_reprogrammations_limite || 3} modifs
                        </span>
                      </div>

                      {(currentDossier?.nombre_reprogrammations || 0) < (systemParams?.nombre_reprogrammations_limite || 3) ? (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="date"
                            id="new-rdv-date-timeline"
                            min={new Date().toISOString().split('T')[0]}
                            className="border border-neutral-350 rounded-xl px-3 py-2 bg-white text-xs flex-1 font-semibold"
                          />
                          <select
                            id="new-rdv-time-timeline"
                            className="border border-neutral-355 rounded-xl px-3 py-2 bg-white text-xs font-semibold"
                          >
                            <option value="08:00">08:00</option>
                            <option value="08:30">08:30</option>
                            <option value="09:00">09:00</option>
                            <option value="09:30">09:30</option>
                            <option value="10:00">10:00</option>
                            <option value="10:30">10:30</option>
                            <option value="11:00">11:00</option>
                            <option value="11:30">11:30</option>
                          </select>
                          <button
                            type="button"
                            onClick={async () => {
                              const dateEl = document.getElementById('new-rdv-date-timeline') as HTMLInputElement;
                              const timeEl = document.getElementById('new-rdv-time-timeline') as HTMLSelectElement;
                              if (!dateEl?.value) {
                                triggerToast("Sélectionnez d'abord une date !");
                                return;
                              }

                              const newDateObj = new Date(dateEl.value);
                              if (isNaN(newDateObj.getTime())) {
                                triggerToast("Format de date invalide !");
                                return;
                              }

                              // Validation par rapport à la date du mariage
                              const MOIS_LOCAL: Record<string, number> = {
                                janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
                                juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11
                              };
                              let wDate = new Date();
                              let hasWDate = false;
                              const match = currentDossier?.wedding_date?.match(/^(\d{1,2})\s+([a-zéûî]+)\s+(\d{4})/i);
                              if (match) {
                                const day = parseInt(match[1], 10);
                                const monthKey = match[2].toLowerCase();
                                const year = parseInt(match[3], 10);
                                const monthIdx = MOIS_LOCAL[monthKey];
                                if (monthIdx !== undefined) {
                                  wDate = new Date(year, monthIdx, day);
                                  hasWDate = true;
                                }
                              }

                              if (hasWDate) {
                                const diffTime = wDate.getTime() - newDateObj.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                if (diffDays < 10 || diffDays > 30) {
                                  triggerToast("La date du rendez-vous doit se situer entre 10 et 30 jours avant le mariage !");
                                  return;
                                }
                              }

                              // Validation jours ouvrables (Lundi à Vendredi)
                              const dayOfWeek = newDateObj.getDay();
                              if (dayOfWeek === 0 || dayOfWeek === 6) {
                                triggerToast("Les rendez-vous de dépôt se font uniquement du Lundi au Vendredi !");
                                return;
                              }

                              // Validation jours fériés ivoiriens
                              const year = newDateObj.getFullYear();
                              const holidays = getIvorianHolidays(year);
                              const dateKey = `${newDateObj.getDate().toString().padStart(2, '0')}/${(newDateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                              const holidayNames = Object.keys(holidays);
                              const isHoliday = holidayNames.some(h => {
                                if (h.includes('/')) return h === dateKey;
                                const isoStr = newDateObj.toISOString().split('T')[0];
                                return h === isoStr;
                              });
                              if (isHoliday) {
                                triggerToast("Le jour choisi est un jour férié officiel !");
                                return;
                              }

                              // Formater au format DD/MM/YYYY
                              const dd = String(newDateObj.getDate()).padStart(2, '0');
                              const mm = String(newDateObj.getMonth() + 1).padStart(2, '0');
                              const yyyy = newDateObj.getFullYear();
                              const formattedDateStr = `${dd}/${mm}/${yyyy}`;

                              const res = await rescheduleAppointment(dossierId, formattedDateStr, timeEl.value);
                              if (res.success) {
                                triggerToast("Rendez-vous reprogrammé avec succès !");
                                const dbDossiers = await getDossiers();
                                setAllDossiers(dbDossiers);
                              } else {
                                triggerToast(res.error || "Erreur de reprogrammation.");
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer animate-pulse"
                          >
                            Valider
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-rose-500 font-semibold italic">Limite de reprogrammation atteinte. Veuillez contacter la mairie pour toute modification.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  currentDossier?.frais_timbre_paye !== true ? (
                    <div className="flex flex-col gap-4 animate-fade-in">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-[11px]">Dépôt physique validé par la Mairie</span>
                      </div>
                      
                      <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl flex flex-col gap-4 text-left shadow-sm">
                        <div className="flex items-center gap-2 text-amber-850 font-bold text-sm">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                          <span>Droits Municipaux de Célébration (Encaissement Physique)</span>
                        </div>
                        <p className="font-sans text-xs text-slate-655 leading-relaxed font-semibold">
                          Après la vérification et la validation de vos documents originaux lors de votre rendez-vous, vous devez vous acquitter des frais de célébration directement à la caisse de la mairie :
                        </p>

                        <div className="p-4 bg-white border border-amber-200/60 rounded-xl flex justify-between items-center shadow-inner-sm">
                          <div>
                            <span className="font-sans text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Montant à régler en caisse</span>
                            <span className="font-serif font-bold text-amber-700 text-lg mt-0.5 block">{(systemParams?.frais_timbre_montant || 100000).toLocaleString('fr-FR')} FCFA</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-250 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                            Attente de paiement en caisse
                          </div>
                        </div>

                        <div className="p-3.5 bg-slate-100 rounded-xl text-[10px] font-medium leading-relaxed text-slate-600">
                          <p className="font-bold text-slate-800">💡 Comment procéder ?</p>
                          <p className="mt-1">
                            L'agent d'état civil imprimera votre bulletin de caisse lors de votre visite. Présentez ce bulletin à la caisse municipale pour effectuer le règlement de {(systemParams?.frais_timbre_montant || 100000).toLocaleString('fr-FR')} FCFA. Dès encaissement par l'agent, votre dossier passera automatiquement au statut approuvé.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-250 rounded-2xl flex flex-col gap-3 text-left shadow-sm animate-fade-in">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                        <Check className="w-5 h-5 text-emerald-600 shrink-0 animate-scale-in" />
                        <span>Paiement validé par la Mairie !</span>
                      </div>
                      <p className="font-sans text-xs text-slate-655 leading-relaxed font-semibold">
                        Vos droits de célébration de {(systemParams?.frais_timbre_montant || 100000).toLocaleString('fr-FR')} FCFA ont été encaissés avec succès par la caisse municipale. Votre dossier est officiellement approuvé pour la célébration.
                      </p>
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => changeGuidedStep(6)}
                          className="bg-primary hover:bg-primary-container text-white py-2.5 px-5 rounded-xl font-extrabold uppercase text-[10px] tracking-wider transition-all shadow-md cursor-pointer border border-primary/20 flex items-center gap-1"
                        >
                          Aller à la Célébration
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <div className="p-6 bg-gradient-to-br from-primary/10 to-[#b20052]/5 border border-primary/25 rounded-3xl flex flex-col gap-4 text-left shadow-sm animate-fade-in relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 opacity-10">
                <Heart className="w-60 h-60 text-primary" />
              </div>
              
              <div className="flex items-center gap-2 text-slate-800 font-serif font-extrabold text-lg select-none">
                <Heart className="w-6 h-6 text-primary fill-primary animate-pulse" />
                <span>Le Grand Jour de Votre Union Civile</span>
              </div>

              <p className="font-sans text-xs text-slate-655 leading-relaxed font-medium">
                Toutes les conditions légales et financières ont été validées par le service de l'état civil de Marcory. Votre dossier est classé comme <strong>PRÊT POUR CÉLÉBRATION</strong>.
              </p>

              <div className="p-4 bg-white border border-primary/15 rounded-2xl space-y-3 shadow-inner-sm">
                <div className="flex justify-between items-center text-xs font-sans border-b pb-2.5 border-slate-100">
                  <span className="text-slate-400">Date d'Union</span>
                  <span className="font-bold text-slate-800">{currentDossier?.wedding_date}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-sans">
                  <span className="text-slate-400">Lieu d'Union</span>
                  <span className="font-bold text-slate-800">{selectedMairieName || selectedMairie || "Mairie de Marcory"}</span>
                </div>
              </div>

              <div className="p-3.5 bg-rose-500 text-white rounded-xl text-xs font-bold leading-normal flex items-start gap-2.5">
                <Info className="w-4.5 h-4.5 text-rose-100 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Instructions Jour J :</p>
                  <p className="font-sans text-[11px] text-rose-100 font-medium mt-1 leading-normal">
                    Présentez-vous 30 minutes avant l'heure planifiée munis de vos pièces d'identité originales ainsi que celles de vos témoins. Bon mariage !
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in text-left">

      {/* Hero Header & Segmented controller */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 max-w-3xl">
        <div>
          <span className="font-sans text-[10px] font-bold text-accent uppercase tracking-widest block mb-1">
            Votre cheminement légal
          </span>
          <h1 className="font-serif text-3xl md:text-5xl text-slate-900 font-bold mb-3 leading-tight">
            Votre parcours vers le <span className="text-rose-gradient italic font-serif font-semibold">"Oui"</span>
          </h1>
          <p className="font-sans text-xs md:text-sm text-slate-500 leading-relaxed font-medium">
            Suivez et complétez en temps réel chaque étape légale de votre dossier de mariage civil.
          </p>
        </div>

        {/* View Mode Toggle Segmented button */}
        <div className="flex bg-slate-100 p-1 rounded-full border border-accent/20 select-none shadow-inner-sm">
          <button
            onClick={() => setViewMode('guided')}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${viewMode === 'guided'
                ? 'bg-white text-primary shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Mode Guidé
          </button>
          <button
            onClick={() => setViewMode('classic')}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${viewMode === 'classic'
                ? 'bg-white text-primary shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Vue Complète
          </button>
        </div>
      </div>

      {viewMode === 'guided' ? (
        // -------------------- MODE GUIDÉ (Focus Card par Étape) --------------------
        <div className="max-w-3xl space-y-6">

          {/* Horizontal Nodes Progress Bar */}
          <div className="relative bg-white/60 backdrop-blur border border-accent/20 rounded-2xl p-4 md:p-6 shadow-sm select-none">

            {/* Track line behind nodes */}
            <div className="absolute left-[calc(1rem+18px)] md:left-[calc(1.5rem+18px)] right-[calc(1rem+18px)] md:right-[calc(1.5rem+18px)] top-[calc(1rem+18px)] md:top-[calc(1.5rem+18px)] h-[3px] -z-0 pointer-events-none overflow-hidden rounded-full">
              {/* Background track */}
              <div className="absolute inset-0 bg-slate-200/60 rounded-full" />
              {/* Animated fill line */}
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary via-[#d4437a] to-accent rounded-full origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: (guidedStepId - 1) / (mappedSteps.length - 1) }}
                transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                style={{ transformOrigin: 'left' }}
              />
            </div>

            <div className="flex items-center justify-between relative z-10">
              {mappedSteps.map((step) => {
                const isComp = step.status === 'completed';
                const isAct = step.id === guidedStepId;
                const isProg = step.status === 'active';
                const activeStepIdInDb = mappedSteps.find(s => s.status === 'active')?.id ||
                  mappedSteps.find(s => s.status === 'upcoming')?.id ||
                  7;
                const isClickable = step.id <= activeStepIdInDb;

                return (
                  <button
                    key={step.id}
                    disabled={!isClickable}
                    onClick={() => changeGuidedStep(step.id)}
                    className={`flex flex-col items-center gap-1.5 focus:outline-none group relative transition-all duration-300 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-35'
                      }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border font-sans text-xs font-extrabold transition-all duration-300 ${isComp
                        ? 'bg-accent border-accent text-white shadow-sm'
                        : isAct
                          ? 'bg-primary text-white border-primary shadow-md scale-110'
                          : isProg
                            ? 'bg-primary/10 border-primary/40 text-primary scale-105'
                            : 'bg-slate-50 border-neutral-250 text-slate-400'
                      }`}>
                      {isComp ? <Check className="w-4 h-4 text-white" /> : step.id}
                    </div>
                    <span className={`text-[8.5px] uppercase tracking-wider font-bold hidden md:inline transition-colors ${isAct ? 'text-primary' : isComp ? 'text-accent' : 'text-slate-400 group-hover:text-primary'
                      }`}>
                      {step.title.split(' ')[0]}
                    </span>

                    {/* Running Marriage Couple Indicator */}
                    {guidedStepId === step.id && (
                      <motion.div
                        layoutId="guided-marriage-indicator"
                        className="absolute -top-11 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex flex-col items-center"
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      >
                        {/* Running couple SVG */}
                        <motion.div
                          animate={isMoving ? {
                            y: [0, -5, 0, -3, 0],
                            rotate: [0, -4, 4, -2, 0],
                            transition: { duration: 0.5, ease: 'easeInOut', repeat: 0 }
                          } : {
                            y: [0, -2, 0],
                            transition: { duration: 2.4, ease: 'easeInOut', repeat: Infinity }
                          }}
                          className="relative"
                        >
                          {/* Speed lines when moving */}
                          {isMoving && (
                            <motion.div
                              className="absolute right-full top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pr-1"
                              initial={{ opacity: 0, x: 4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0 }}
                            >
                              <div className="w-3 h-[1.5px] bg-gradient-to-l from-accent/70 to-transparent rounded-full" />
                              <div className="w-2 h-[1.5px] bg-gradient-to-l from-primary/50 to-transparent rounded-full" />
                              <div className="w-3 h-[1.5px] bg-gradient-to-l from-accent/60 to-transparent rounded-full" />
                            </motion.div>
                          )}
                          <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* === GROOM (left, rose/primary) === */}
                            {/* Head */}
                            <circle cx="9" cy="5" r="3" fill="#b20052" />
                            {/* Body */}
                            <rect x="7" y="8" width="4" height="6" rx="1.5" fill="#b20052" />
                            {/* Left leg (forward) */}
                            <line x1="9" y1="14" x2="6" y2="21" stroke="#b20052" strokeWidth="1.8" strokeLinecap="round" />
                            {/* Right leg (back) */}
                            <line x1="9" y1="14" x2="12" y2="20" stroke="#b20052" strokeWidth="1.8" strokeLinecap="round" />
                            {/* Left arm (back) */}
                            <line x1="7" y1="10" x2="4" y2="15" stroke="#b20052" strokeWidth="1.5" strokeLinecap="round" />
                            {/* Right arm reaching toward bride */}
                            <line x1="11" y1="10" x2="15" y2="13" stroke="#b20052" strokeWidth="1.5" strokeLinecap="round" />

                            {/* === HEART (linking hands) === */}
                            <path d="M17.5 13.5 C17 12.5, 16 12, 16.5 13 C17 14, 18 14.5, 17.5 13.5Z" fill="#c5a368" />
                            <circle cx="17.5" cy="13" r="1.5" fill="#c5a368" opacity="0.9" />

                            {/* === BRIDE (right, gold/accent) === */}
                            {/* Head */}
                            <circle cx="27" cy="5" r="3" fill="#c5a368" />
                            {/* Veil */}
                            <path d="M24 4 Q27 1 30 4 L30.5 8 Q27 6.5 23.5 8 Z" fill="#e5d5b8" opacity="0.85" />
                            {/* Body / dress */}
                            <path d="M25 8 L29 8 L30.5 20 L23.5 20 Z" fill="#c5a368" rx="1" />
                            {/* Left leg (running forward) */}
                            <line x1="25" y1="19" x2="22" y2="26" stroke="#c5a368" strokeWidth="1.8" strokeLinecap="round" />
                            {/* Right leg */}
                            <line x1="28" y1="19" x2="31" y2="25" stroke="#c5a368" strokeWidth="1.8" strokeLinecap="round" />
                            {/* Left arm toward groom */}
                            <line x1="25" y1="10" x2="19" y2="13" stroke="#c5a368" strokeWidth="1.5" strokeLinecap="round" />
                            {/* Right arm back */}
                            <line x1="29" y1="10" x2="32" y2="15" stroke="#c5a368" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </motion.div>
                        {/* Pointer chevron */}
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-primary/40 -mt-0.5" />
                      </motion.div>
                    )}

                    {/* Glowing active node aura */}
                    {isAct && (
                      <div className="absolute inset-0 -m-1.5 rounded-full border border-primary/20 animate-pulse pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Step Focus Card Wrapper */}
          <div className="relative overflow-hidden min-h-[380px]">
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={guidedStepId}
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <div className="glass-premium rounded-3xl p-6 md:p-8 border border-accent/30 shadow-lg flex flex-col gap-6 text-left">

                  {/* Step Header */}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${currentStep.status === 'completed'
                        ? 'bg-rose-50 text-primary border-accent/20'
                        : 'bg-primary text-white border-accent/25'
                      }`}>
                      {renderStepIcon(currentStep.icon, currentStep.status)}
                    </div>
                    <div>
                      <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Étape {currentStep.id} sur 7 • {currentStep.status === 'completed' ? 'Validée' : currentStep.status === 'active' ? 'Action active' : 'À venir'}
                      </span>
                      <h2 className="font-serif text-xl md:text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">
                        {currentStep.title}
                      </h2>
                    </div>
                  </div>

                  {/* Step Details Body */}
                  <p className="font-sans text-sm text-slate-500 leading-relaxed font-medium">
                    {currentStep.details || currentStep.description}
                  </p>

                  <div className="border-t border-accent/15 pt-4">

                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      ) : (
        // -------------------- MODE CLASSIQUE (Vertical Timeline complet) --------------------
        <div className="relative max-w-3xl ml-2 md:ml-6 pb-12 mt-6">
          <div className="absolute top-4 bottom-0 left-[19px] w-[2px] bg-gradient-to-b from-primary via-accent to-slate-200" />

          <div className="space-y-8">
            {mappedSteps.map((step) => {
              const isCompleted = step.status === 'completed';
              const isActive = step.status === 'active';
              const isUpcoming = step.status === 'upcoming';
              const isExpanded = expandedStep === step.id;

              return (
                <motion.div
                  key={step.id}
                  className="relative flex items-start group"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="absolute -left-[4px] md:-left-[2px] z-10">
                    {isActive && (
                      <div className="absolute inset-0 rounded-full bg-accent/25 pulse-ring" />
                    )}

                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-[#fdfbf7] transition-all duration-300 ${isCompleted
                        ? 'bg-accent/10 text-accent border border-accent/25 shadow-sm'
                        : isActive
                          ? 'bg-primary text-white shadow-md shadow-primary/30 border border-accent/40'
                          : 'bg-white border-2 border-neutral-200 text-neutral-400'
                      }`}>
                      {renderStepIcon(step.icon, step.status)}
                    </div>
                  </div>

                  <div className="ml-14 md:ml-16 w-full flex flex-col">
                    <div
                      onClick={() => toggleStepExpand(step.id)}
                      className="flex items-center gap-2 cursor-pointer py-1 text-left select-none group/title"
                    >
                      <div>
                        <h3 className={`font-sans text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-primary' : 'text-slate-400'
                          }`}>
                          Étape {step.id} {isActive && '• En cours'} {isCompleted && '• Complétée'}
                        </h3>
                        <h4 className={`font-serif text-base md:text-lg font-bold mt-0.5 tracking-tight transition-colors group-hover/title:text-primary ${isActive ? 'text-primary' : isCompleted ? 'text-slate-800' : 'text-neutral-500'
                          }`}>
                          {step.title}
                          {step.id === 2 && selectedMairie && (
                            <span className="text-tertiary font-sans text-[10px] font-bold ml-2 bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                              ({selectedMairie})
                            </span>
                          )}
                        </h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                    </div>

                    {isExpanded && (
                      <motion.div
                        className="mt-3 w-full"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {isActive ? (
                          <div className="glass-premium rounded-2xl p-5 md:p-6 border border-accent/30 shadow-md">
                            <p className="font-sans text-xs md:text-sm text-slate-655 leading-relaxed mb-4">
                              {step.details || step.description}
                            </p>
                            {renderStepContent(step.id)}
                          </div>
                        ) : (
                          <div className="bg-white/70 rounded-xl p-4 border border-neutral-200 text-xs text-secondary leading-relaxed shadow-sm">
                            <p>{step.details || step.description}</p>
                            {isCompleted && (
                              <div className="flex items-center gap-1.5 text-accent font-bold mt-2.5 font-sans">
                                <svg viewBox="0 0 24 24" className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
                                <span>Étape validée et enregistrée.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {!isExpanded && (
                      <p className={`font-sans text-xs mt-1 line-clamp-1 opacity-70 ${isUpcoming ? 'text-neutral-400' : 'text-slate-500'
                        }`}>
                        {step.description}
                      </p>
                    )}
                  </div>

                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------- OTP POPUP MODAL -------------------- */}
      <AnimatePresence>
        {showOtpPopup && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 backdrop-blur-md px-4 text-left font-sans">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-sm p-6 border border-neutral-200 shadow-2xl relative my-auto animate-scale-up"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex flex-col gap-4 text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                  <Smartphone className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">Validation de la transaction</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Saisissez le code temporaire envoyé par SMS sur votre mobile pour confirmer le débit municipal de <span className="font-bold text-slate-800">{(paystackConfig ? paystackConfig.amount : 50000).toLocaleString()} {paystackConfig ? paystackConfig.currency : 'XOF'}</span>.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 my-3">
                  <input
                    type="password"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value)}
                    placeholder="• • • •"
                    className="w-32 mx-auto text-center tracking-[0.5em] text-xl font-bold border-2 border-neutral-300 rounded-xl py-3 focus:outline-none focus:border-primary font-mono bg-slate-50"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">
                    Demo tip : Saisissez n'importe quel code à 4 chiffres (ex: 1234)
                  </span>
                </div>

                <div className="flex gap-2 justify-end w-full mt-2 font-sans text-xs">
                  <button
                    type="button"
                    onClick={() => { setShowOtpPopup(false); setOtpValue(''); }}
                    className="flex-1 py-2.5 border border-neutral-300 rounded-xl font-bold text-secondary hover:bg-neutral-50 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={!otpValue || otpValue.length < 4}
                    onClick={handleVerifyOtp}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-white shadow-md cursor-pointer transition-colors ${otpValue.length >= 4
                        ? 'bg-primary hover:bg-primary-container shadow-primary/20'
                        : 'bg-neutral-250 text-slate-450 cursor-not-allowed border border-neutral-300'
                      }`}
                  >
                    Valider le code
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- QUITTANCE MODAL (WOW EFFECT) -------------------- */}
      <MarriageReceiptModal
        isOpen={showQuittanceModal}
        onClose={() => setShowQuittanceModal(false)}
        dossierId={dossierId}
        spouse1Name={spouse1Name}
        spouse2Name={spouse2Name}
        weddingDate={currentDossier?.wedding_date || null}
        selectedMairieName={selectedMairieName}
      />

    </div>
  );
}
