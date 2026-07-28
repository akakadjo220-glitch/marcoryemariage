import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen, CheckCircle, Hourglass, UploadCloud, FileText,
  Trash2, AlertCircle, Sparkles, Heart, ArrowRight, Camera, Loader2, X, Check, Lock, Calendar, RefreshCw, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useVerifierDoublon } from '../utils/useVerifierDoublon';
import { ensurePhonePrefix, handlePhoneChange } from './Landing';
import { CALENDRIER_RESERVATIONS_2026, checkIsOpened, getDaysRemainingStr, validateWeddingDate } from '../utils/calendarReservationUtils';

// Security helpers — identical to Landing popup
const getDossierBordureStyle = (statut: string | null) => {
  if (!statut) return {};
  return {
    borderColor:
      statut === 'disponible' ? '#22c55e' :
        statut === 'doublon' ? '#ef4444' :
          statut === 'invalide' ? '#f97316' :
            statut === 'verification' ? '#3b82f6' : '#d1d5db',
    borderWidth: 2,
    borderStyle: 'solid'
  };
};
const getDossierIcone = (statut: string | null) =>
  statut === 'verification' ? '🔍' :
    statut === 'disponible' ? '✅' :
      statut === 'doublon' ? '❌' :
        statut === 'invalide' ? '⚠️' : '';
const getDossierMsgColor = (statut: string | null) => {
  switch (statut) {
    case 'disponible': return 'text-emerald-600';
    case 'doublon': return 'text-rose-600';
    case 'invalide': return 'text-orange-500';
    case 'verification': return 'text-blue-500';
    default: return 'text-slate-400';
  }
};
import { DocumentInfo, AiAnalysisResult } from '../types';
import { INITIAL_DOCUMENTS } from '../data';
import { SpouseProfile, DEFAULT_SPOUSE_PROFILE, getRequiredDocsForProfiles, getSavedSpouseProfiles } from '../utils/documentProfileUtils';
import {
  uploadDocumentFile,
  checkDuplicateDocumentNumber,
  runDocumentAiAnalysis,
  getAiConfig,
  checkDuplicateSpouse,
  basicEnglishToFrenchFallback,
  formatUserFriendlyAnomaly,
  getDossierById,
  updateDossierBiometrics,
  updateDossierFaceAttempts,
  comparerVisages,
  convertBlobToImageBase64,
  verifierNemotronSafety,
  downloadDocumentFile,
  DossierInfo,
  getMairies,
  getDossiers,
  updateDossierWeddingDate,
  getCapacityForDate
} from '../services/dbService';

const resizeImageForAi = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.68): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(resizedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      } else {
        resolve(file);
      }
    };
    img.onerror = () => {
      resolve(file);
    };
    img.src = URL.createObjectURL(file);
  });
};

interface DossierProps {
  documents: DocumentInfo[];
  addNotification: (text: string, type: 'info' | 'warning' | 'success') => void;
  updateDocumentStatus: (
    id: string,
    status: 'pending' | 'uploading' | 'verified' | 'rejected',
    fileName?: string,
    docNumber?: string | null,
    aiAnalysis?: AiAnalysisResult | null
  ) => void;
  setTab: (tab: string) => void;
  dossierId: string;
  spouse1Name?: string;
  spouse2Name?: string;
  spouse1Birthdate?: string;
  spouse2Birthdate?: string;
  spouse1Cni?: string;
  spouse2Cni?: string;
  spouse1CniType?: 'CNI' | 'PASSEPORT';
  spouse2CniType?: 'CNI' | 'PASSEPORT';
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
    cni2?: string,
    cniType1?: 'CNI' | 'PASSEPORT',
    cniType2?: 'CNI' | 'PASSEPORT'
  ) => void;
  activeStep: number;
  setActiveStep: (step: number) => void;
  selectedMairieId?: string | null;
  selectedMairieName?: string | null;
  weddingDate?: string;
  onWeddingDateSelected?: (dateStr: string) => void;
  onOpenParcoursStep?: (step: number) => void;
}

export default function Dossier({
  documents,
  addNotification,
  updateDocumentStatus,
  setTab,
  dossierId,
  spouse1Name = '',
  spouse2Name = '',
  spouse1Birthdate = '',
  spouse2Birthdate = '',
  spouse1Cni = '',
  spouse2Cni = '',
  spouse1CniType = 'CNI',
  spouse2CniType = 'CNI',
  onUpdateNames,
  activeStep,
  setActiveStep,
  selectedMairieId = null,
  selectedMairieName = '',
  weddingDate,
  onWeddingDateSelected,
  onOpenParcoursStep,
}: DossierProps) {
  const [dossierDetails, setDossierDetails] = useState<DossierInfo | null>(null);

  const isDossierLocked = Boolean(
    dossierDetails?.frais_reservation_paye === true ||
    dossierDetails?.status === 'approved' ||
    dossierDetails?.status === 'VALIDE' ||
    dossierDetails?.status === 'celebrated'
  );

  // States for locked screen inputs
  const [s1, setS1] = useState(spouse1Name);
  const [s2, setS2] = useState(spouse2Name);
  const [birthdate1, setBirthdate1] = useState(spouse1Birthdate);
  const [birthdate2, setBirthdate2] = useState(spouse2Birthdate);
  const [cni1, setCni1] = useState(spouse1Cni);
  const [cni2, setCni2] = useState(spouse2Cni);
  const [cniType1, setCniType1] = useState<'CNI' | 'PASSEPORT'>('CNI');
  const [cniType2, setCniType2] = useState<'CNI' | 'PASSEPORT'>('CNI');
  const [selectedTargetMonthId, setSelectedTargetMonthId] = useState<string>('07');
  const [precheckConfirmed, setPrecheckConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dossierDuplicateError, setDossierDuplicateError] = useState<string | null>(null);

  // Phone fields for the locked screen (same security as popup)
  const [phone1, setPhone1] = useState('+225 ');
  const [phone2, setPhone2] = useState('+225 ');
  const [erreurCroisement, setErreurCroisement] = useState<string | null>(null);

  // Real-time doublon checks — same as Landing popup
  const dossierMairiePhone = '+225 27 22 44 88 00';
  const dossierMairieId = dossierDetails?.mairie_id || null;
  const checkPhone1 = useVerifierDoublon(phone1, 'telephone', undefined, dossierId, dossierMairiePhone, dossierMairieId);
  const checkPhone2 = useVerifierDoublon(phone2, 'telephone', undefined, dossierId, dossierMairiePhone, dossierMairieId);
  const checkCni1 = useVerifierDoublon(cni1, 'cni', cniType1, dossierId, dossierMairiePhone, dossierMairieId);
  const checkCni2 = useVerifierDoublon(cni2, 'cni', cniType2, dossierId, dossierMairiePhone, dossierMairieId);

  // Cross-validation: same phone or same CNI between époux 1 and 2
  useEffect(() => {
    const cleanP1 = phone1.trim().replace(/\s/g, '');
    const cleanP2 = phone2.trim().replace(/\s/g, '');
    const cleanC1 = cni1.trim().toUpperCase();
    const cleanC2 = cni2.trim().toUpperCase();
    if (cleanP1 && cleanP2 && cleanP1 === cleanP2 && cleanP1 !== '+225' && cleanP2 !== '+225') {
      setErreurCroisement("❌ L'époux et l'épouse ne peuvent pas avoir le même numéro de téléphone.");
      return;
    }
    if (cleanC1 && cleanC2 && cleanC1 === cleanC2) {
      setErreurCroisement("❌ Le numéro de pièce d'identité de l'époux et de l'épouse ne peuvent pas être identiques.");
      return;
    }
    setErreurCroisement(null);
  }, [phone1, phone2, cni1, cni2]);

  // States for upload / IA
  const [showFileUploadModal, setShowFileUploadModal] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<Record<string, string>>({});

  // Custom document states for unplanned specific cases
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customDocTitle, setCustomDocTitle] = useState('');
  const [customDocFile, setCustomDocFile] = useState<File | null>(null);
  const [isSubmittingCustomDoc, setIsSubmittingCustomDoc] = useState(false);

  // Webcam (selfie) states
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [capturedSelfieBase64, setCapturedSelfieBase64] = useState<string | null>(null);
  const [isAnalyzingSelfie, setIsAnalyzingSelfie] = useState(false);
  const [selfieStatus, setSelfieStatus] = useState('');
  const [selfieError, setSelfieError] = useState<string | null>(null);
  const fileSelfieInputRef = useRef<HTMLInputElement>(null);

  const handleMobileSelfieFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSelfieError("Veuillez choisir un fichier image (JPG, PNG).");
      return;
    }

    setSelfieError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setCapturedSelfieBase64(base64);
        stopWebcam();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // CNI Recto/Verso flow states
  const [cniRectoBase64, setCniRectoBase64] = useState<string | null>(null);
  const [cniVersoBase64, setCniVersoBase64] = useState<string | null>(null);
  const [activeCaptureSide, setActiveCaptureSide] = useState<'recto' | 'verso' | null>(null);

  // Reset selected file when the upload modal closes
  useEffect(() => {
    setSelectedFile(null);
    if (!showFileUploadModal) {
      setCniRectoBase64(null);
      setCniVersoBase64(null);
      setActiveCaptureSide(null);
    }
  }, [showFileUploadModal]);

  const handleStitchCniImages = (docName: string) => {
    if (!cniRectoBase64 || !cniVersoBase64) return;

    const imgRecto = new Image();
    const imgVerso = new Image();

    let loadedCount = 0;
    const onImageLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        const canvas = document.createElement('canvas');
        const originalWidth = Math.max(imgRecto.naturalWidth || 1280, imgVerso.naturalWidth || 1280);
        const width = Math.min(originalWidth, 1600);
        const scale = width / originalWidth;
        const heightRecto = (imgRecto.naturalHeight || 720) * scale;
        const heightVerso = (imgVerso.naturalHeight || 720) * scale;

        canvas.width = width;
        canvas.height = heightRecto + heightVerso;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(imgRecto, 0, 0, width, heightRecto);
          ctx.drawImage(imgVerso, 0, heightRecto, width, heightVerso);

          canvas.toBlob((blob) => {
            if (blob) {
              const fileName = `${docName.replace(/\s+/g, '_').toLowerCase()}_complet_${Date.now()}.jpg`;
              const file = new File([blob], fileName, { type: 'image/jpeg' });
              setSelectedFile(file);
            }
          }, 'image/jpeg', 0.82);
        }
      }
    };

    imgRecto.onload = onImageLoaded;
    imgVerso.onload = onImageLoaded;
    imgRecto.src = cniRectoBase64;
    imgVerso.src = cniVersoBase64;
  };

  const closeUploadModal = () => {
    setSelectedFile(null);
    setShowFileUploadModal(null);
    setCniRectoBase64(null);
    setCniVersoBase64(null);
    setActiveCaptureSide(null);
  };

  const fileInputRectoRef = useRef<HTMLInputElement>(null);
  const fileInputVersoRef = useRef<HTMLInputElement>(null);
  const fileInputStandardRef = useRef<HTMLInputElement>(null);

  const handleCniFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'recto' | 'verso') => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingFile(true);

      const img = new Image();
      img.onload = () => {
        const targetW = 800;
        const targetH = 506; // Ratio 1.58:1 (Standard CNI/Passeport ID Card)

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Center crop calculation for exact framing
          const imgW = img.naturalWidth || img.width;
          const imgH = img.naturalHeight || img.height;
          const scale = Math.max(targetW / imgW, targetH / imgH);
          const cropW = targetW / scale;
          const cropH = targetH / scale;
          const cropX = (imgW - cropW) / 2;
          const cropY = (imgH - cropH) / 2;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

          const base64 = canvas.toDataURL('image/jpeg', 0.68); // ~50-80 KB
          if (side === 'recto') {
            setCniRectoBase64(base64);
          } else {
            setCniVersoBase64(base64);
          }
        }
        setIsUploadingFile(false);
      };
      img.onerror = () => {
        setIsUploadingFile(false);
      };
      img.src = URL.createObjectURL(file);
    }
    e.target.value = '';
  };

  const handleStandardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingFile(true);
      resizeImageForAi(file, 1000, 1000, 0.68).then(resizedFile => {
        const nameParts = file.name.split('.');
        nameParts.pop();
        const baseName = nameParts.join('.');
        const cleanFileName = `${baseName}_compressed_${Date.now()}.jpg`;

        const newFile = new File([resizedFile], cleanFileName, { type: 'image/jpeg' });
        setSelectedFile(newFile);
        setIsUploadingFile(false);
      }).catch(err => {
        console.error("Resize error:", err);
        setIsUploadingFile(false);
      });
    }
    e.target.value = '';
  };

  // Step 6 Booking states
  const [chosenDate, setChosenDate] = useState('');
  const [chosenTime, setChosenTime] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  const handleWeddingDateChange = (val: string) => {
    setChosenDate(val);
    setChosenTime(''); // Reset chosen time when date changes
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

  const [capacity, setCapacity] = useState<number>(15);
  const [allDossiers, setAllDossiers] = useState<DossierInfo[]>([]);
  const [mairies, setMairies] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Synchronize inputs
  useEffect(() => {
    setS1(spouse1Name || '');
    setS2(spouse2Name || '');
    setBirthdate1(spouse1Birthdate || '');
    setBirthdate2(spouse2Birthdate || '');
    setCni1(spouse1Cni || '');
    setCni2(spouse2Cni || '');
    setCniType1(spouse1CniType || 'CNI');
    setCniType2(spouse2CniType || 'CNI');
  }, [spouse1Name, spouse2Name, spouse1Birthdate, spouse2Birthdate, spouse1Cni, spouse2Cni, spouse1CniType, spouse2CniType]);

  // Load Dossier biometric details
  const fetchDossierDetails = async () => {
    if (!dossierId) return;
    try {
      const details = await getDossierById(dossierId);
      setDossierDetails(details);
    } catch (err) {
      console.warn("Failed to fetch dossier details:", err);
    }
  };

  useEffect(() => {
    fetchDossierDetails();
  }, [dossierId]);

  // Load all dossiers & mairies for calendar scheduling in Step 6
  useEffect(() => {
    async function loadBookingData() {
      try {
        const [dossiersList, mairiesList] = await Promise.all([
          getDossiers(),
          getMairies()
        ]);
        setAllDossiers(dossiersList);
        setMairies(mairiesList);
      } catch (err) {
        console.warn("Failed to load booking data:", err);
      }
    }
    loadBookingData();
  }, []);

  // Update capacity when date changes
  useEffect(() => {
    async function updateCapacityVal() {
      if (dossierDetails?.mairie_id && chosenDate) {
        const validation = validateWeddingDate(chosenDate);
        if (validation.isValid) {
          const cap = await getCapacityForDate(dossierDetails.mairie_id, chosenDate);
          setCapacity(cap);
        } else {
          setCapacity(0); // Set capacity to 0 if invalid
        }
      }
    }
    updateCapacityVal();
  }, [dossierDetails?.mairie_id, chosenDate]);

  // Helpers to check step progression
  const isStepCompleted = (stepId: number): boolean => {
    const doc1 = documents.find(d => d.id === 'doc1'); // CNI Epoux (Step 1)
    const doc2 = documents.find(d => d.id === 'doc2'); // Extrait Epoux (Step 3)
    const doc1_f = documents.find(d => d.id === 'doc1_f'); // CNI Epouse (Step 4)
    const doc2_f = documents.find(d => d.id === 'doc2_f'); // Extrait Epouse (Step 6)

    switch (stepId) {
      case 1: // CNI Époux
        return doc1?.status === 'verified';
      case 2: // Selfie Époux
        return !!dossierDetails?.epoux_selfie_url &&
          (dossierDetails?.epoux_identite_verifiee === true ||
            (dossierDetails?.epoux_face_attempts ?? 0) >= 3);
      case 3: // Extrait Époux
        return doc2?.status === 'verified';
      case 4: // CNI Épouse
        return doc1_f?.status === 'verified';
      case 5: // Selfie Épouse
        return !!dossierDetails?.epouse_selfie_url &&
          (dossierDetails?.epouse_identite_verifiee === true ||
            (dossierDetails?.epouse_face_attempts ?? 0) >= 3);
      case 6: // Extrait Épouse
        return doc2_f?.status === 'verified';
      case 7: {
        // Justificatifs requis calculés dynamiquement selon la situation des époux
        const savedProf = getSavedSpouseProfiles(dossierId);
        const epouxP = dossierDetails?.epoux_profile || savedProf.epouxProfile;
        const epouseP = dossierDetails?.epouse_profile || savedProf.epouseProfile;
        const requiredMetas = getRequiredDocsForProfiles(epouxP, epouseP);

        const step7Ids = requiredMetas
          .filter(d => !['doc1', 'doc2', 'doc1_f', 'doc2_f', 'selfie_epoux', 'selfie_epouse'].includes(d.id))
          .map(d => d.id);

        if (step7Ids.length === 0) return true;
        const step7Docs = documents.filter(d => step7Ids.includes(d.id));
        return step7Docs.length === step7Ids.length && step7Docs.every(d => d.status === 'verified' || !!d.fileName);
      }
      default:
        return false;
    }
  };

  const isStepUnlocked = (stepId: number): boolean => {
    if (stepId === 1) return true;
    if (stepId <= activeStep) return true; // Can always go back to previous steps
    // Can only unlock if all previous steps are completed
    for (let i = 1; i < stepId; i++) {
      if (!isStepCompleted(i)) return false;
    }
    return true;
  };

  // Initialisation à la première étape non complétée uniquement au chargement initial si aucune étape spécifique n'est demandée
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && spouse1Name && spouse2Name && dossierId) {
      hasInitializedRef.current = true;
      if (!activeStep || activeStep === 1) {
        let initialStep = 1;
        if (!isStepCompleted(1)) initialStep = 1;
        else if (!isStepCompleted(2)) initialStep = 2;
        else if (!isStepCompleted(3)) initialStep = 3;
        else if (!isStepCompleted(4)) initialStep = 4;
        else if (!isStepCompleted(5)) initialStep = 5;
        else if (!isStepCompleted(6)) initialStep = 6;
        else if (!isStepCompleted(7)) initialStep = 7;
        setActiveStep(initialStep);
      }
    }
  }, [dossierId]); // Déclenché uniquement lors du chargement initial ou changement de dossier

  const getStepStatusDotColor = (stepId: number): 'green' | 'red' | 'gray' | 'none' => {
    const doc1 = documents.find(d => d.id === 'doc1');
    const doc2 = documents.find(d => d.id === 'doc2');
    const doc1_f = documents.find(d => d.id === 'doc1_f');
    const doc2_f = documents.find(d => d.id === 'doc2_f');

    if (isStepCompleted(stepId)) return 'green';

    switch (stepId) {
      case 1:
        if (doc1?.status === 'rejected') return 'red';
        return 'none';
      case 2:
        const epouxAttempts = dossierDetails?.epoux_face_attempts ?? 0;
        if (epouxAttempts >= 3 && dossierDetails?.epoux_identite_verifiee !== true) return 'red';
        return 'none';
      case 3:
        if (doc2?.status === 'rejected') return 'red';
        return 'none';
      case 4:
        if (doc1_f?.status === 'rejected') return 'red';
        return 'none';
      case 5:
        const epouseAttempts = dossierDetails?.epouse_face_attempts ?? 0;
        if (epouseAttempts >= 3 && dossierDetails?.epouse_identite_verifiee !== true) return 'red';
        return 'none';
      case 6:
        if (doc2_f?.status === 'rejected') return 'red';
        return 'none';
      case 7: {
        const savedProf = getSavedSpouseProfiles(dossierId);
        const epouxP = dossierDetails?.epoux_profile || savedProf.epouxProfile;
        const epouseP = dossierDetails?.epouse_profile || savedProf.epouseProfile;
        const requiredMetas = getRequiredDocsForProfiles(epouxP, epouseP);

        const step7Ids = requiredMetas
          .filter(d => !['doc1', 'doc2', 'doc1_f', 'doc2_f', 'selfie_epoux', 'selfie_epouse'].includes(d.id))
          .map(d => d.id);

        const rejectedRem = documents.filter(d => step7Ids.includes(d.id) && d.status === 'rejected');
        if (rejectedRem.length > 0) return 'red';
        return 'none';
      }
      default:
        return 'none';
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

  const handleCreateDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    setDossierDuplicateError(null);
    if (s1.trim() && s2.trim() && cni1.trim() && cni2.trim() && onUpdateNames) {
      setSubmitting(true);
      try {
        const duplicateRes = await checkDuplicateSpouse(
          cni1.trim(),
          cni2.trim(),
          s1.trim(),
          s2.trim(),
          '',
          '',
          dossierId
        );
        if (duplicateRes?.exists && duplicateRes.message) {
          setDossierDuplicateError(duplicateRes.message);
          addNotification(duplicateRes.message, 'warning');
          setSubmitting(false);
          return;
        }

        await onUpdateNames(
          s1.trim(),
          s2.trim(),
          phone1.trim(),
          phone2.trim(),
          undefined,
          undefined,
          '',
          '',
          cni1.trim(),
          cni2.trim(),
          cniType1,
          cniType2
        );
        addNotification("Dossier civil initialisé !", "success");
        await fetchDossierDetails();
      } catch (err: any) {
        console.error("Dossier creation failed:", err);
        addNotification("Échec de la création du dossier civil.", 'warning');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const convertFileToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Assign stream to video element reliably
  const attachStreamToVideo = (videoEl: HTMLVideoElement, stream: MediaStream) => {
    videoEl.srcObject = stream;
    videoEl.onloadedmetadata = () => {
      videoEl.play().catch(e => console.warn("Video play() failed:", e));
    };
  };

  // Automatically attach stream to video element when active
  useEffect(() => {
    if (webcamActive && webcamStream && videoRef.current) {
      attachStreamToVideo(videoRef.current, webcamStream);
    }
  }, [webcamActive, webcamStream]);

  // Webcam capture functions for selfie (Didit-style single getUserMedia + enumerateDevices)
  const startWebcam = async () => {
    setSelfieError(null);
    setCapturedSelfieBase64(null);

    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSelfieError("L'accès à la caméra n'est pas disponible sur ce navigateur.");
      return;
    }

    try {
      let frontCameraDeviceId: string | undefined = undefined;

      // 1. Inspecter les périphériques pour cibler la caméra avant
      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          const front = videoDevices.find(d => {
            const label = d.label.toLowerCase();
            return label.includes('front') || label.includes('user') || label.includes('avant') || label.includes('selfie') || label.includes('0');
          });
          if (front && front.deviceId) {
            frontCameraDeviceId = front.deviceId;
          }
        } catch (e) {
          console.warn("Erreur enumeration caméras:", e);
        }
      }

      // 2. Requête unique et propre
      const constraints: MediaStreamConstraints = frontCameraDeviceId
        ? { video: { deviceId: { exact: frontCameraDeviceId } } }
        : { video: { facingMode: 'user' } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setWebcamStream(stream);
      setWebcamActive(true);
    } catch (err: any) {
      console.warn("Échec contrainte caméra avant, tentative flux vidéo standard:", err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setWebcamStream(fallbackStream);
        setWebcamActive(true);
      } catch (fallbackErr: any) {
        console.error("Accès caméra définitivement refusé:", fallbackErr);
        setSelfieError("Accès à la caméra refusé. Veuillez autoriser la caméra dans votre navigateur.");
      }
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setWebcamActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Redimensionnement HD haute netteté (max 800px)
      const maxDim = 800;
      let w = video.videoWidth || 800;
      let h = video.videoHeight || 600;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        // Compression JPEG 85% très nette et lumineuse
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedSelfieBase64(base64);
        stopWebcam();
      }
    }
  };

  // Verification biométrique
  const handleVerifySelfie = async (spouse: 'epoux' | 'epouse') => {
    if (!capturedSelfieBase64) return;
    setIsAnalyzingSelfie(true);
    setSelfieError(null);

    try {
      const config = getAiConfig();
      if (!config.geminiKey) {
        throw new Error("Clé API OpenRouter manquante dans les configurations.");
      }

      // 1. Nemotron Safety Check
      setSelfieStatus("🛡️ Validation de sécurité (Nemotron)...");
      const base64Clean = capturedSelfieBase64.split(',')[1] || capturedSelfieBase64;
      const safety = await verifierNemotronSafety(base64Clean, 'image/jpeg', config.geminiKey);
      if (!safety.safe) {
        setSelfieError(`Rejet de sécurité : ${safety.reason || 'Image non conforme.'}`);
        setIsAnalyzingSelfie(false);
        return;
      }

      // 2. Fetch CNI document to compare with
      setSelfieStatus("📸 Téléchargement de la pièce d'identité...");
      const cniDocId = spouse === 'epoux' ? 'doc2' : 'doc2_f';
      const cniDoc = documents.find(d => d.id === cniDocId);
      if (!cniDoc || !cniDoc.fileName) {
        throw new Error("La pièce d'identité n'a pas été trouvée ou est manquante.");
      }

      const cniBlob = await downloadDocumentFile(dossierId, cniDocId, cniDoc.fileName);
      if (!cniBlob) {
        throw new Error("Impossible de télécharger la pièce d'identité pour la comparaison.");
      }

      const cniBase64 = await convertBlobToImageBase64(cniBlob);

      // 3. Biometric Facial Comparison
      const engineName = config.useDeepFace ? "DeepFace & Liveness" : "Face++";
      setSelfieStatus(`🧬 Reconnaissance faciale biométrique (${engineName})...`);
      const result = await comparerVisages(cniBase64, base64Clean, spouse === 'epoux' ? 'EPOUX' : 'EPOUSE');

      // Save selfie file to storage
      const selfieFilename = `${spouse}_selfie.jpg`;
      const selfieBlob = await (await fetch(capturedSelfieBase64)).blob();
      await uploadDocumentFile(dossierId, `${spouse}_selfie`, selfieBlob, selfieFilename);

      if (result.valide) {
        await updateDossierBiometrics(dossierId, {
          [`${spouse}_selfie_url`]: selfieFilename,
          [`${spouse}_selfie_valide`]: true,
          [`${spouse}_face_match_score`]: result.score,
          [`${spouse}_identite_verifiee`]: true
        });
        addNotification(`Contrôle d'identité réussi pour l'${spouse === 'epoux' ? 'époux' : 'épouse'} ! Match score : ${result.score.toFixed(1)}%`, 'success');
        setCapturedSelfieBase64(null);
        await fetchDossierDetails();
      } else {
        const reasonText = result.message ? ` — ${result.message}` : ` (${result.score.toFixed(1)}% de ressemblance)`;
        setSelfieError(`La reconnaissance faciale n'a pas pu confirmer votre identité${reasonText}. Veuillez bien vous cadrer face à la caméra avec une bonne luminosité, puis réessayez.`);
        await fetchDossierDetails();
      }
    } catch (err: any) {
      console.error("Selfie verification error:", err);
      setSelfieError(err.message || "Erreur lors de la comparaison biométrique.");
    } finally {
      setIsAnalyzingSelfie(false);
      setSelfieStatus('');
    }
  };

  // Document upload submits
  const handleUploadSubmit = async () => {
    if (!showFileUploadModal || !selectedFile) return;

    const docId = showFileUploadModal;

    // MIME type check
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(selectedFile.type)) {
      addNotification("Format de fichier non supporté. Veuillez téléverser un fichier PDF, JPEG, PNG ou WEBP.", "warning");
      return;
    }

    // Size limit check
    const maxSizeBytes = 5 * 1024 * 1024;
    if (selectedFile.size > maxSizeBytes) {
      addNotification("Le fichier dépasse la taille limite autorisée de 5 Mo.", "warning");
      return;
    }

    setIsUploadingFile(true);

    try {
      let fileToUpload = selectedFile;
      if (selectedFile.type.startsWith('image/')) {
        fileToUpload = await resizeImageForAi(selectedFile, 1200, 1200);
      }
      const dbFileName = fileToUpload.name;
      const docNum = "";

      // Clean up previous rejection
      const existingDoc = documents.find(d => d.id === docId);
      if (existingDoc?.status === 'rejected' && existingDoc?.fileName) {
        updateDocumentStatus(docId, 'pending', undefined, null);
      }

      updateDocumentStatus(docId, 'uploading', dbFileName, docNum);
      await uploadDocumentFile(dossierId, docId, fileToUpload, dbFileName);
      setIsUploadingFile(false);
      closeUploadModal(); // Close modal immediately so user sees live card progress!

      const AI_ANALYZED_DOCS = ['doc1', 'doc1_f', 'doc2', 'doc2_f'];
      const requiresAiAnalysis = AI_ANALYZED_DOCS.includes(docId);
      const config = getAiConfig();

      if (requiresAiAnalysis && config.geminiKey) {
        setIsAnalyzingAi(true);
        setAnalysisStatus(prev => ({ ...prev, [docId]: '🔍 Analyse par l\'IA en cours... (Authenticité & Identité)' }));
        try {
          const isSpouse2 = docId.includes('_f');
          const declaredCniInState = isSpouse2
            ? (cni2 || dossierDetails?.spouse2_cni || spouse2Cni)
            : (cni1 || dossierDetails?.spouse1_cni || spouse1Cni);
          const docNumOverride = docNum || declaredCniInState || '';

          const aiResult = await runDocumentAiAnalysis(
            dossierId,
            docId,
            fileToUpload,
            dbFileName,
            (status) => {
              setAnalysisStatus(prev => ({ ...prev, [docId]: status }));
            },
            docNumOverride
          );

          const statusMap = {
            'VALIDER': 'verified' as const,
            'ACCEPTER': 'verified' as const,
            'REJETER': 'rejected' as const,
            'VERIFIER_MANUELLEMENT': 'verified' as const
          };
          const targetStatus = statusMap[aiResult.action_recommandee] || 'verified';
          updateDocumentStatus(docId, targetStatus, dbFileName, docNum, aiResult);

          if (targetStatus === 'rejected') {
            addNotification(`⚠️ Document rejeté : ${aiResult.motif || 'Non conforme'}.`, 'warning');
          } else if (aiResult.action_recommandee === 'VERIFIER_MANUELLEMENT') {
            addNotification(`📋 Document "${dbFileName}" téléversé avec succès. Vérification finale lors du rendez-vous physique.`, 'info');
          } else {
            addNotification(`✅ Document "${dbFileName}" validé avec succès par l'IA.`, 'success');
          }
        } catch (aiErr: any) {
          const friendlyErrMsg = (aiErr.message && !aiErr.message.includes('toLowerCase') && !aiErr.message.includes('TypeError'))
            ? aiErr.message
            : "Format du document ou analyse non conforme. Veuillez reprendre une photo bien nette.";
          updateDocumentStatus(docId, 'rejected', dbFileName, docNum, {
            type_document: 'INCONNU',
            est_lisible: false,
            est_authentique: false,
            confiance: 0,
            infos_extraites: { nom: '', prenoms: '', date_naissance: '', lieu_naissance: '', numero_document: '', date_expiration: '', nationalite: '' },
            anomalies: [friendlyErrMsg],
            action_recommandee: 'REJETER',
            motif: friendlyErrMsg
          });
          addNotification(`⚠️ Analyse du document : ${friendlyErrMsg}`, 'warning');
        } finally {
          setIsAnalyzingAi(false);
          setAnalysisStatus(prev => {
            const next = { ...prev };
            delete next[docId];
            return next;
          });
        }
      } else {
        addNotification(`📁 Document "${dbFileName}" téléversé avec succès.`, 'success');
        updateDocumentStatus(docId, 'verified', dbFileName, docNum);
      }

      closeUploadModal();
    } catch (err) {
      console.error("[DEBUG UPLOAD] handleUploadFile global catch block error:", err);
      updateDocumentStatus(docId, 'pending', undefined, null);
      addNotification("Échec du téléversement.", "warning");
      setIsUploadingFile(false);
    }
  };

  // Presentation Bypass Mode - allows fast verification for demos
  const handleBypassValidation = (docId: string) => {
    const isSpouse2 = docId.includes('_f');
    const declaredFullName = isSpouse2 ? spouse2Name : spouse1Name;
    const declaredBirthdate = isSpouse2 ? spouse2Birthdate : spouse1Birthdate;
    const declaredCni = isSpouse2 ? spouse2Cni : spouse1Cni;
    const cniType = isSpouse2 ? spouse2CniType : spouse1CniType;

    const nameParts = declaredFullName.trim().split(/\s+/);
    const nom = nameParts[nameParts.length - 1] || '';
    const prenoms = nameParts.slice(0, -1).join(' ') || declaredFullName;

    const isBirth = docId === 'doc2' || docId === 'doc2_f';
    const isId = docId === 'doc1' || docId === 'doc1_f' || docId === 'doc5' || docId === 'doc9';

    let aiResult: AiAnalysisResult | null = null;

    if (isBirth) {
      aiResult = {
        type_document: 'EXTRAIT_NAISSANCE',
        est_lisible: true,
        est_authentique: true,
        confiance: 100,
        infos_extraites: {
          nom: nom.toUpperCase(),
          prenoms: prenoms.toUpperCase(),
          date_naissance: declaredBirthdate,
          lieu_naissance: 'Cocody',
          numero_document: '',
          date_expiration: '',
          nationalite: 'Ivoirienne'
        },
        anomalies: [],
        action_recommandee: 'VALIDER',
        motif: '[Bypass Présentation] Extrait validé automatiquement.'
      };
    } else if (isId) {
      aiResult = {
        type_document: cniType,
        est_lisible: true,
        est_authentique: true,
        confiance: 100,
        infos_extraites: {
          nom: nom.toUpperCase(),
          prenoms: prenoms.toUpperCase(),
          date_naissance: declaredBirthdate,
          lieu_naissance: '',
          numero_document: declaredCni,
          date_expiration: '31/12/2035',
          nationalite: 'Ivoirienne'
        },
        anomalies: [],
        action_recommandee: 'VALIDER',
        motif: `[Bypass Présentation] ${cniType} validé automatiquement.`
      };
    }

    const mockFileName = `demo_${docId}.${isBirth ? 'pdf' : 'jpg'}`;
    updateDocumentStatus(docId, 'verified', mockFileName, declaredCni || null, aiResult);
    addNotification(`⚡ [Bypass Présentation] Document validé avec succès !`, 'success');
    closeUploadModal();
  };

  // Calendar booking submission for Step 6
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenDate || !chosenTime) return;

    try {
      const dateFormatted = new Date(chosenDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      const fullDate = `${dateFormatted} à ${chosenTime.replace(':', 'h')}`;
      await updateDossierWeddingDate(dossierId, fullDate);
      if (onWeddingDateSelected) {
        onWeddingDateSelected(fullDate);
      }
      addNotification(`Date de célébration réservée pour le : ${fullDate}`, 'success');
      await fetchDossierDetails();
    } catch (err) {
      console.error("Booking error:", err);
      addNotification("Erreur lors de la réservation de votre date.", "warning");
    }
  };

  // Custom unplanned document upload submission
  const handleAddCustomDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDocTitle.trim() || !customDocFile) {
      addNotification("Veuillez renseigner l'intitulé du document et choisir un fichier.", "warning");
      return;
    }

    setIsSubmittingCustomDoc(true);
    try {
      const customId = `custom_${Date.now()}`;
      const fileName = customDocFile.name;

      // Upload file to Supabase storage
      await uploadDocumentFile(dossierId, customId, customDocFile, fileName);

      // Update state and DB with custom document
      await updateDocumentStatus(customId, 'verified', fileName, null, null);

      addNotification(`✅ Document spécifique "${customDocTitle}" téléversé avec succès !`, 'success');
      setShowAddCustomModal(false);
      setCustomDocTitle('');
      setCustomDocFile(null);
    } catch (err) {
      console.error("Custom document upload error:", err);
      addNotification("Erreur lors du téléversement du document spécifique.", "warning");
    } finally {
      setIsSubmittingCustomDoc(false);
    }
  };

  // Generate slots for date booking
  const generateSlots = (capVal: number) => {
    const roomId = dossierDetails?.mairie_id || 'cocody_salle_prestige';
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

  const isNamesEmpty = !spouse1Name?.trim() || !spouse2Name?.trim();

  // Locked Screen
  if (isNamesEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] w-full animate-fade-in text-center px-4 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass-premium rounded-3xl p-8 border border-accent/30 shadow-xl relative w-full flex flex-col items-center gap-6 overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-[#d4af37] to-primary" />

          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative animate-pulse shadow-sm">
            <Lock className="w-7 h-7 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Dossier Civil Verrouillé
            </h2>
            <p className="font-sans text-xs md:text-sm text-slate-500 leading-relaxed font-medium">
              Pour déverrouiller l'importation de vos documents justificatifs officiels, veuillez renseigner l'identité des futurs époux ci-dessous.
            </p>
          </div>

          <form onSubmit={handleCreateDossier} className="w-full flex flex-col gap-4 text-left font-sans text-xs mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Nom complet du Futur Époux (Homme)</label>
                <input
                  type="text"
                  value={s1}
                  onChange={(e) => setS1(e.target.value.toUpperCase())}
                  placeholder="EX: KONÉ"
                  style={{ textTransform: 'uppercase' }}
                  className="border border-neutral-300 rounded-xl px-4 py-3 bg-neutral-50/55 w-full focus:outline-none focus:border-primary text-xs font-semibold shadow-inner-sm transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Nom complet de la Future Épouse (Femme)</label>
                <input
                  type="text"
                  value={s2}
                  onChange={(e) => setS2(e.target.value.toUpperCase())}
                  placeholder="EX: AMY ROSINE"
                  style={{ textTransform: 'uppercase' }}
                  className="border border-neutral-300 rounded-xl px-4 py-3 bg-neutral-50/55 w-full focus:outline-none focus:border-primary text-xs font-semibold shadow-inner-sm transition-all"
                  required
                />
              </div>

              {/* Téléphone — mêmes sécurités que le popup */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Tél. Époux</label>
                  <input
                    type="text"
                    value={phone1}
                    onChange={e => handlePhoneChange(e.target.value, setPhone1)}
                    onBlur={() => checkPhone1.triggerVerification()}
                    placeholder="+225 07 00 00 00"
                    style={getDossierBordureStyle(checkPhone1.statut)}
                    className="border border-neutral-300 rounded-xl px-4 py-3 bg-neutral-50/55 w-full focus:outline-none focus:border-primary text-xs font-semibold shadow-inner-sm transition-all"
                  />
                  {checkPhone1.message && (
                    <p className={`text-[10px] font-semibold mt-0.5 whitespace-pre-line ${getDossierMsgColor(checkPhone1.statut)}`}>
                      {getDossierIcone(checkPhone1.statut)} {checkPhone1.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Tél. Épouse</label>
                  <input
                    type="text"
                    value={phone2}
                    onChange={e => handlePhoneChange(e.target.value, setPhone2)}
                    onBlur={() => checkPhone2.triggerVerification()}
                    placeholder="+225 07 00 00 00"
                    style={getDossierBordureStyle(checkPhone2.statut)}
                    className="border border-neutral-300 rounded-xl px-4 py-3 bg-neutral-50/55 w-full focus:outline-none focus:border-primary text-xs font-semibold shadow-inner-sm transition-all"
                  />
                  {checkPhone2.message && (
                    <p className={`text-[10px] font-semibold mt-0.5 whitespace-pre-line ${getDossierMsgColor(checkPhone2.statut)}`}>
                      {getDossierIcone(checkPhone2.statut)} {checkPhone2.message}
                    </p>
                  )}
                </div>
              </div>



              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Type de pièce Époux *</label>
                  <select value={cniType1} onChange={e => setCniType1(e.target.value as any)}
                    className="border border-neutral-300 rounded-xl px-4 py-3 bg-neutral-50/55 w-full focus:outline-none focus:border-primary text-xs font-semibold transition-all">
                    <option value="CNI">CNI</option>
                    <option value="PASSEPORT">Passeport</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Type de pièce Épouse *</label>
                  <select value={cniType2} onChange={e => setCniType2(e.target.value as any)}
                    className="border border-neutral-300 rounded-xl px-4 py-3 bg-neutral-50/55 w-full focus:outline-none focus:border-primary text-xs font-semibold transition-all">
                    <option value="CNI">CNI</option>
                    <option value="PASSEPORT">Passeport</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">N° Pièce Époux *</label>
                  <input
                    type="text"
                    value={cni1}
                    onChange={(e) => {
                      setCni1(e.target.value);
                      if (dossierDuplicateError) setDossierDuplicateError(null);
                    }}
                    onBlur={() => checkCni1.triggerVerification()}
                    placeholder={cniType1 === 'PASSEPORT' ? "Ex: 12BC34567" : "Ex: CI0012345678"}
                    style={{ textTransform: 'uppercase', ...getDossierBordureStyle(checkCni1.statut) }}
                    className="border border-neutral-300 rounded-xl px-4 py-3 bg-neutral-50/55 w-full focus:outline-none focus:border-primary text-xs font-semibold shadow-inner-sm transition-all"
                    required
                  />
                  {checkCni1.message && (
                    <p className={`text-[10px] font-semibold mt-0.5 whitespace-pre-line ${getDossierMsgColor(checkCni1.statut)}`}>
                      {getDossierIcone(checkCni1.statut)} {checkCni1.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">N° Pièce Épouse *</label>
                  <input
                    type="text"
                    value={cni2}
                    onChange={(e) => {
                      setCni2(e.target.value);
                      if (dossierDuplicateError) setDossierDuplicateError(null);
                    }}
                    onBlur={() => checkCni2.triggerVerification()}
                    placeholder={cniType2 === 'PASSEPORT' ? "Ex: 12BC34567" : "Ex: CI0087654321"}
                    style={{ textTransform: 'uppercase', ...getDossierBordureStyle(checkCni2.statut) }}
                    className="border border-neutral-300 rounded-xl px-4 py-3 bg-neutral-50/55 w-full focus:outline-none focus:border-primary text-xs font-semibold shadow-inner-sm transition-all"
                    required
                  />
                  {checkCni2.message && (
                    <p className={`text-[10px] font-semibold mt-0.5 whitespace-pre-line ${getDossierMsgColor(checkCni2.statut)}`}>
                      {getDossierIcone(checkCni2.statut)} {checkCni2.message}
                    </p>
                  )}
                </div>
              </div>

              {erreurCroisement && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-sans leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Erreur de validation croisée</p>
                    <p className="mt-0.5 font-semibold text-rose-800 whitespace-pre-line">{erreurCroisement}</p>
                  </div>
                </div>
              )}

              {dossierDuplicateError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-sans leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Erreur de validation</p>
                    <p className="mt-0.5 font-semibold text-rose-800">{dossierDuplicateError}</p>
                  </div>
                </div>
              )}

              {(() => {
                const peutInitialiser =
                  checkPhone1.statut === 'disponible' &&
                  checkPhone2.statut === 'disponible' &&
                  checkCni1.statut === 'disponible' &&
                  checkCni2.statut === 'disponible' &&
                  !erreurCroisement &&
                  !submitting &&
                  s1.trim() && s2.trim() &&
                  isValidDateStr(birthdate1) && isValidDateStr(birthdate2) &&
                  cni1.trim() && cni2.trim();
                return (
                  <button
                    type="submit"
                    disabled={!peutInitialiser}
                    style={{ opacity: peutInitialiser ? 1 : 0.55, cursor: peutInitialiser ? 'pointer' : 'not-allowed' }}
                    className="w-full py-3.5 text-white font-sans text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg mt-2 flex items-center justify-center gap-2 bg-primary hover:bg-primary-container"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-accent" />
                        <span>Initialisation du dossier...</span>
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 text-accent fill-accent animate-pulse" />
                        <span>Initialiser mon dossier civil</span>
                      </>
                    )}
                  </button>
                );
              })()}
            </form>
        </motion.div>
      </div>
    );
  }

  // Helper render logic for simple CNI/passport card
  const renderCniCard = (docId: 'doc1' | 'doc1_f', label: string) => {
    const doc = documents.find(d => d.id === docId);
    const isVerified = doc?.status === 'verified';
    const isRejected = doc?.status === 'rejected';
    const isUploading = doc?.status === 'uploading';

    return (
      <div className={`p-5 rounded-2xl border ${isVerified ? 'bg-emerald-50/40 border-emerald-200' : isRejected ? 'bg-rose-50/40 border-rose-200' : 'bg-neutral-50 border-neutral-200'} flex flex-col gap-4`}>
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-serif font-bold text-slate-800 text-sm">{label}</h4>
            <p className="font-sans text-[11px] text-slate-400 mt-0.5">Veuillez téléverser votre pièce pour analyse.</p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full font-sans text-[10px] font-bold ${isVerified ? 'bg-emerald-100 text-emerald-800' : isRejected ? 'bg-rose-100 text-rose-800' : isUploading ? 'bg-amber-100 text-amber-800' : 'bg-slate-150 text-slate-500'
            }`}>
            {isVerified ? 'Validé ✓' : isRejected ? 'Rejeté ✕' : isUploading ? 'IA Analyse...' : 'Requis'}
          </span>
        </div>

        {isVerified && (
          <div className="flex justify-between items-center text-xs font-sans p-3 bg-white rounded-xl border border-neutral-100">
            <span className="font-bold text-slate-600 truncate max-w-[80%]">📄 {doc?.fileName}</span>
            {!isDossierLocked && (
              <button onClick={() => updateDocumentStatus(docId, 'pending', undefined, null)} className="text-red-500 hover:text-red-700 bg-transparent border-none outline-none cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {isDossierLocked && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                🔒 Transmis
              </span>
            )}
          </div>
        )}

        {!isVerified && !isUploading && !isDossierLocked && (
          <button onClick={() => setShowFileUploadModal(docId)} className="py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 font-sans text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
            <UploadCloud className="w-4 h-4" />
            <span>{isRejected ? 'Corriger le document' : 'Téléverser ma pièce'}</span>
          </button>
        )}

        {isDossierLocked && !isVerified && (
          <div className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-3 py-2 rounded-xl flex items-center gap-1.5 self-start border border-emerald-200">
            <span>🔒 Document verrouillé &amp; transmis</span>
          </div>
        )}

        {isUploading && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-emerald-500/10 border border-primary/20 flex flex-col gap-2.5 animate-pulse shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-slate-700 text-xs truncate max-w-[75%]">
                📄 {doc?.fileName || 'Document téléversé'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-primary text-white tracking-wider animate-pulse">
                ANALYSE IA
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-primary" />
              <span>{analysisStatus[docId] || '🔍 Analyse par l\'IA en cours...'}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary via-amber-500 to-emerald-500 animate-pulse w-full rounded-full"></div>
            </div>
          </div>
        )}

        {isRejected && doc?.aiAnalysis && (
          <div className="flex flex-col gap-2.5 p-3.5 bg-rose-50/95 border border-rose-200 rounded-xl text-left font-sans text-xs shadow-sm">
            <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {doc.aiAnalysis.anomalies && doc.aiAnalysis.anomalies.length > 1
                  ? `Document non conforme (${doc.aiAnalysis.anomalies.length} points à corriger) :`
                  : `Document non conforme :`}
              </span>
            </div>

            {/* Display specific anomalies list with friendly formatting */}
            {doc.aiAnalysis.anomalies && doc.aiAnalysis.anomalies.length > 0 ? (
              <ul className="space-y-1.5 text-[11px] text-rose-900 font-medium pl-1">
                {doc.aiAnalysis.anomalies.map((anom, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-600 font-bold">•</span>
                    <span>{formatUserFriendlyAnomaly(anom)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-rose-900 font-semibold leading-relaxed">
                {formatUserFriendlyAnomaly(doc.aiAnalysis.motif || "Document non conforme. Veuillez téléverser une photo plus nette.")}
              </p>
            )}

            {/* Display extracted vs declared summary if available */}
            {doc.aiAnalysis.infos_extraites && (doc.aiAnalysis.infos_extraites.nom || doc.aiAnalysis.infos_extraites.prenoms || doc.aiAnalysis.infos_extraites.numero_document) && (
              <div className="mt-1 p-2 bg-white/90 rounded-lg border border-rose-200/80 text-[10px] space-y-1 text-slate-700 font-mono">
                <span className="font-sans font-bold text-slate-800 block text-[9px] uppercase tracking-wider">Données lues par l'IA :</span>
                {(doc.aiAnalysis.infos_extraites.nom || doc.aiAnalysis.infos_extraites.prenoms) && (
                  <div>• Nom lu : <span className="font-bold text-rose-700">{doc.aiAnalysis.infos_extraites.prenoms} {doc.aiAnalysis.infos_extraites.nom}</span></div>
                )}
                {doc.aiAnalysis.infos_extraites.numero_document && (
                  <div>• N° Pièce lu : <span className="font-bold text-rose-700">{doc.aiAnalysis.infos_extraites.numero_document}</span></div>
                )}
                {doc.aiAnalysis.infos_extraites.date_expiration && (
                  <div>• Expiration : <span className="font-bold text-rose-700">{doc.aiAnalysis.infos_extraites.date_expiration}</span></div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper render logic for Birth Act card
  const renderBirthActCard = (docId: 'doc2' | 'doc2_f', label: string) => {
    const doc = documents.find(d => d.id === docId);
    const isVerified = doc?.status === 'verified';
    const isRejected = doc?.status === 'rejected';
    const isUploading = doc?.status === 'uploading';

    return (
      <div className={`p-5 rounded-2xl border ${isVerified ? 'bg-emerald-50/40 border-emerald-200' : isRejected ? 'bg-rose-50/40 border-rose-200' : 'bg-neutral-50 border-neutral-200'} flex flex-col gap-4`}>
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-serif font-bold text-slate-800 text-sm">{label}</h4>
            <p className="font-sans text-[11px] text-slate-400 mt-0.5">Original de moins de 3 mois (6 mois si étranger).</p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full font-sans text-[10px] font-bold ${isVerified ? 'bg-emerald-100 text-emerald-800' : isRejected ? 'bg-rose-100 text-rose-800' : isUploading ? 'bg-amber-100 text-amber-800' : 'bg-slate-150 text-slate-500'
            }`}>
            {isVerified ? 'Validé ✓' : isRejected ? 'Rejeté ✕' : isUploading ? 'IA Analyse...' : 'Requis'}
          </span>
        </div>

        {isVerified && (
          <div className="flex justify-between items-center text-xs font-sans p-3 bg-white rounded-xl border border-neutral-100">
            <span className="font-bold text-slate-600 truncate max-w-[80%]">📄 {doc?.fileName}</span>
            {!isDossierLocked && (
              <button onClick={() => updateDocumentStatus(docId, 'pending', undefined, null)} className="text-red-500 hover:text-red-700 bg-transparent border-none outline-none cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {isDossierLocked && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                🔒 Transmis
              </span>
            )}
          </div>
        )}

        {!isVerified && !isUploading && !isDossierLocked && (
          <button onClick={() => setShowFileUploadModal(docId)} className="py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 font-sans text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
            <UploadCloud className="w-4 h-4" />
            <span>{isRejected ? 'Corriger le document' : 'Téléverser mon extrait'}</span>
          </button>
        )}

        {isDossierLocked && !isVerified && (
          <div className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-3 py-2 rounded-xl flex items-center gap-1.5 self-start border border-emerald-200">
            <span>🔒 Document verrouillé &amp; transmis</span>
          </div>
        )}

        {isUploading && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-emerald-500/10 border border-primary/20 flex flex-col gap-2.5 animate-pulse shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-slate-700 text-xs truncate max-w-[75%]">
                📄 {doc?.fileName || 'Document téléversé'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-primary text-white tracking-wider animate-pulse">
                ANALYSE IA
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-primary" />
              <span>{analysisStatus[docId] || '🔍 Analyse par l\'IA en cours...'}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary via-amber-500 to-emerald-500 animate-pulse w-full rounded-full"></div>
            </div>
          </div>
        )}

        {isRejected && doc?.aiAnalysis && (
          <div className="flex flex-col gap-2.5 p-3.5 bg-rose-50/95 border border-rose-200 rounded-xl text-left font-sans text-xs shadow-sm">
            <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {doc.aiAnalysis.anomalies && doc.aiAnalysis.anomalies.length > 1
                  ? `Document non conforme (${doc.aiAnalysis.anomalies.length} points à corriger) :`
                  : `Document non conforme :`}
              </span>
            </div>

            {/* Display specific anomalies list with friendly formatting */}
            {doc.aiAnalysis.anomalies && doc.aiAnalysis.anomalies.length > 0 ? (
              <ul className="space-y-1.5 text-[11px] text-rose-900 font-medium pl-1">
                {doc.aiAnalysis.anomalies.map((anom, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-600 font-bold">•</span>
                    <span>{formatUserFriendlyAnomaly(anom)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-rose-900 font-semibold leading-relaxed">
                {formatUserFriendlyAnomaly(doc.aiAnalysis.motif || "Document non conforme. Veuillez téléverser une photo plus nette.")}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Selfie component
  const renderSelfieCaptureUI = (spouse: 'epoux' | 'epouse') => {
    const isEpoux = spouse === 'epoux';
    const selfieUrl = isEpoux ? dossierDetails?.epoux_selfie_url : dossierDetails?.epouse_selfie_url;
    const selfieValide = isEpoux ? dossierDetails?.epoux_selfie_valide : dossierDetails?.epouse_selfie_valide;
    const faceScore = isEpoux ? dossierDetails?.epoux_face_match_score : dossierDetails?.epouse_face_match_score;
    const isVerified = isEpoux ? dossierDetails?.epoux_identite_verifiee : dossierDetails?.epouse_identite_verifiee;
    const attempts = spouse === 'epoux'
      ? (dossierDetails?.epoux_face_attempts ?? 0)
      : (dossierDetails?.epouse_face_attempts ?? 0);

    return (
      <div className="flex flex-col gap-5 p-5 bg-white rounded-2xl border border-neutral-200">
        <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
          <div>
            <h4 className="font-serif font-bold text-slate-800 text-sm">Contrôle facial (Selfie en direct)</h4>
            <p className="font-sans text-[11px] text-slate-400 mt-0.5">Vérification de ressemblance avec votre pièce d'identité.</p>
          </div>
          {selfieUrl ? (
            <span className={`px-2.5 py-0.5 rounded-full font-sans text-[10px] font-bold ${isVerified === true ? 'bg-emerald-100 text-emerald-800' : isVerified === false ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
              }`}>
              {isVerified === true ? 'Identité Validée ✓' : 'Vérification Manuelle ⚠️'}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full font-sans text-[10px] font-bold bg-neutral-100 text-slate-500">
              Requis
            </span>
          )}
        </div>

        {selfieUrl ? (
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-neutral-50 p-4 rounded-xl border border-neutral-200/50">
            <img src={capturedSelfieBase64 || `http://localhost:3000/documents/${dossierId}/${spouse}_selfie.jpg`} alt="Selfie" className="w-24 h-24 object-cover rounded-xl border border-neutral-300 shrink-0" onError={(e) => {
              // Try local IndexedDB or storage fallback
              downloadDocumentFile(dossierId, `${spouse}_selfie`, `${spouse}_selfie.jpg`).then(blob => {
                if (blob) {
                  const url = URL.createObjectURL(blob);
                  (e.target as HTMLImageElement).src = url;
                }
              });
            }} />
            <div className="text-left font-sans flex-1">
              <p className="text-xs font-bold text-slate-800">Selfie officiel enregistré</p>
              {faceScore !== undefined && faceScore > 0 && (
                <p className="text-[11px] text-slate-500 mt-0.5">Taux de correspondance : <span className="font-bold text-primary">{faceScore.toFixed(1)}%</span> (seuil 76.6%)</p>
              )}
              {isVerified === false && (
                <p className="text-[10px] text-amber-700 font-semibold mt-1">⚠️ L'IA n'a pas pu valider automatiquement votre ressemblance. L'officier de la mairie procèdera à un contrôle visuel lors de votre rendez-vous.</p>
              )}
              {!isDossierLocked && (
                <button onClick={() => {
                  // Reset attempts and biometrics in DB
                  updateDossierFaceAttempts(dossierId, spouse as 'epoux' | 'epouse', 0);
                  updateDossierBiometrics(dossierId, {
                    [`${spouse}_selfie_url`]: null,
                    [`${spouse}_selfie_valide`]: null,
                    [`${spouse}_face_match_score`]: null,
                    [`${spouse}_identite_verifiee`]: null
                  }).then(() => fetchDossierDetails());
                }} className="mt-3 text-[10px] font-bold text-red-500 hover:text-red-700 bg-transparent border-none outline-none cursor-pointer flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reprendre le selfie</span>
                </button>
              )}
              {isDossierLocked && (
                <span className="mt-3 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                  🔒 Selfie biométrique verrouillé
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Camera viewport */}
            {webcamActive && (
              <div className="relative w-full max-w-[320px] rounded-2xl overflow-hidden border border-neutral-300 bg-black aspect-[4/3] flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-[3px] border-primary/20 pointer-events-none rounded-2xl" />
              </div>
            )}

            {capturedSelfieBase64 && !webcamActive && (
              <div className="relative w-full max-w-[200px] rounded-2xl overflow-hidden border border-neutral-300 aspect-square flex items-center justify-center">
                <img src={capturedSelfieBase64} alt="Captured preview" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Hidden Mobile Camera Input */}
            <input
              ref={fileSelfieInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleMobileSelfieFileChange}
            />

            {/* Error or Status banner */}
            {selfieError && (
              <div className="w-full p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-semibold leading-relaxed flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{selfieError}</span>
              </div>
            )}

            {isAnalyzingSelfie && (
              <div className="w-full p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-950 font-semibold leading-relaxed flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                <span>{selfieStatus}</span>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Main Action Buttons (Single main button for taking a selfie) */}
            <div className="flex flex-wrap gap-2.5 justify-center w-full mt-1">
              {!webcamActive && !capturedSelfieBase64 && !isAnalyzingSelfie && (
                <>
                  <button onClick={startWebcam} className="px-5 py-3 bg-primary text-white border border-primary/20 rounded-xl font-sans text-xs font-bold hover:bg-primary-container transition-all flex items-center gap-2 cursor-pointer shadow-md">
                    <Camera className="w-4 h-4 text-accent" />
                    <span>📷 Prendre mon selfie</span>
                  </button>
                  <button
                    onClick={async () => {
                      setIsAnalyzingSelfie(true);
                      setSelfieStatus("⚡ Mode Démo : Validation directe en cours...");
                      try {
                        const demoSelfieFilename = `${spouse}_selfie.jpg`;
                        const canvas = document.createElement('canvas');
                        canvas.width = 400; canvas.height = 400;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.fillStyle = '#4f46e5'; ctx.fillRect(0, 0, 400, 400);
                          ctx.fillStyle = '#ffffff'; ctx.font = '22px sans-serif';
                          ctx.fillText('SELFIE DEMO OFFICIAL', 75, 205);
                        }
                        const demoDataUrl = canvas.toDataURL('image/jpeg');
                        const blob = await (await fetch(demoDataUrl)).blob();
                        await uploadDocumentFile(dossierId, `${spouse}_selfie`, blob, demoSelfieFilename);
                        await updateDossierBiometrics(dossierId, {
                          [`${spouse}_selfie_url`]: demoSelfieFilename,
                          [`${spouse}_selfie_valide`]: true,
                          [`${spouse}_face_match_score`]: 96.4,
                          [`${spouse}_identite_verifiee`]: true
                        });
                        addNotification(`⚡ Mode Démo : Validation biométrique réussie (96.4%) !`, 'success');
                        await fetchDossierDetails();
                      } catch (e: any) {
                        setSelfieError("Erreur bypass démo : " + e.message);
                      } finally {
                        setIsAnalyzingSelfie(false);
                        setSelfieStatus('');
                      }
                    }}
                    className="px-4 py-2.5 bg-amber-500/10 text-amber-700 border border-amber-300/60 rounded-xl font-sans text-xs font-bold hover:bg-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Bouton spécial Présentation : Valider immédiatement sans webcam"
                  >
                    <Zap className="w-4 h-4 text-amber-600 fill-amber-500/20" />
                    <span>⚡ Mode Démo (Bypass Instantané)</span>
                  </button>
                </>
              )}

              {webcamActive && (
                <>
                  <button onClick={capturePhoto} className="px-5 py-2.5 bg-primary text-white border border-primary/20 rounded-xl font-sans text-xs font-bold hover:bg-primary-container transition-all flex items-center gap-1.5 cursor-pointer">
                    <Camera className="w-4 h-4 text-accent" />
                    <span>Prendre la photo 📸</span>
                  </button>
                  <button onClick={stopWebcam} className="px-4 py-2.5 border border-neutral-250 rounded-xl font-sans text-xs font-bold text-slate-600 hover:bg-neutral-50 cursor-pointer">
                    Annuler
                  </button>
                </>
              )}

              {capturedSelfieBase64 && !webcamActive && !isAnalyzingSelfie && (
                <>
                  <button onClick={() => handleVerifySelfie(spouse)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-sans text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer">
                    <Check className="w-4 h-4" />
                    <span>Valider &amp; Lancer la comparaison biométrique</span>
                  </button>
                  <button onClick={() => { setCapturedSelfieBase64(null); startWebcam(); }} className="px-4 py-2.5 border border-neutral-250 rounded-xl font-sans text-xs font-bold text-slate-655 hover:bg-neutral-50 cursor-pointer">
                    Recommencer
                  </button>
                </>
              )}
            </div>
            {attempts > 0 && !selfieUrl && (
              <p className="text-[10px] text-slate-400 font-sans font-semibold mt-1">Tentative biométrique en cours : {attempts} sur 3 maximum.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in text-left">
      {/* Title */}
      <motion.section
        className="flex flex-col gap-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-primary">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/15 text-primary">
            <FolderOpen className="w-6 h-6 shrink-0" />
          </div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Instruction biométrique du dossier
          </h2>
        </div>
        <p className="font-sans text-xs md:text-sm text-slate-500 max-w-2xl leading-relaxed mt-0.5">
          Téléversez vos pièces administratives et passez le contrôle de ressemblance faciale selfie. Suivez les 7 étapes de justificatifs pour préparer l'instruction de votre dossier.
        </p>
      </motion.section>

      {/* Banner dossier verrouillé et transmis */}
      {isDossierLocked && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950 shadow-sm animate-fade-in text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
              🔒
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm text-emerald-900">Dossier Officiel Verrouillé &amp; Transmis à l'État Civil</h4>
              <p className="font-sans text-xs text-emerald-700 mt-0.5 leading-relaxed font-semibold">
                Votre dossier a été validé et transmis à la Mairie de Marcory. Toutes les informations administratives et pièces justificatives sont désormais verrouillées en lecture seule.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-200 text-emerald-900 text-[10px] font-black rounded-full uppercase tracking-wider shrink-0 border border-emerald-300">
            Lecture Seule 🔒
          </span>
        </motion.div>
      )}

      {/* 7-step wizard stepper navigation */}
      <div className="flex items-center gap-1.5 pb-4 overflow-x-auto scrollbar-hide border-b border-accent/15 select-none">
        {[
          { id: 1, label: "CNI Époux", desc: "Pièce d'identité" },
          { id: 2, label: "Selfie Époux", desc: "Contrôle facial" },
          { id: 3, label: "Extrait Époux", desc: "Naissance" },
          { id: 4, label: "CNI Épouse", desc: "Pièce d'identité" },
          { id: 5, label: "Selfie Épouse", desc: "Contrôle facial" },
          { id: 6, label: "Extrait Épouse", desc: "Naissance" },
          { id: 7, label: "Autres docs", desc: "Justificatifs" }
        ].map((step) => {
          const isCompleted = isStepCompleted(step.id);
          const isActive = activeStep === step.id;
          const isUnlocked = isStepUnlocked(step.id);
          return (
            <button
              key={step.id}
              onClick={() => isUnlocked && setActiveStep(step.id)}
              disabled={!isUnlocked}
              className={`flex-1 min-w-[95px] flex flex-col items-center gap-1 transition-all duration-200 border-none bg-transparent ${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
            >
              <div className="relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 transition-all duration-300 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' :
                  isActive ? 'bg-primary border-primary text-white shadow-md scale-105' :
                    'bg-neutral-100 border-neutral-200 text-slate-400'
                  }`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                </div>
                {getStepStatusDotColor(step.id) === 'red' && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-rose-600 border-2 border-white rounded-full animate-pulse shadow-sm" />
                )}
              </div>
              <span className={`text-[9px] font-bold whitespace-nowrap ${isActive ? 'text-primary' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stepper Content with slide and fade animation */}
      <div className="w-full min-h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="w-full"
          >
            {/* Step 1: CNI Epoux */}
            {activeStep === 1 && (
              <div className="space-y-4">
                <div className="bg-sky-50/50 p-4 border border-sky-200 rounded-2xl">
                  <p className="font-sans text-xs text-sky-900 leading-relaxed font-semibold">
                    🤵 <strong>Étape 1 : Pièce d'identité du Futur Époux ({spouse1Name})</strong><br />
                    Veuillez fournir la photo nette de la pièce d'identité (type : {spouse1CniType}) de l'époux.
                  </p>
                </div>
                {renderCniCard('doc1', `Pièce d'identité (${spouse1CniType}) — Époux`)}
                {isStepCompleted(1) && (
                  <button onClick={() => setActiveStep(2)} className="py-3 px-6 bg-primary text-white rounded-xl font-sans text-xs font-bold hover:bg-primary-container shadow-md transition-all self-start flex items-center gap-1">
                    <span>Étape suivante : Selfie &amp; Face Match Époux</span>
                    <ArrowRight className="w-4 h-4 text-accent" />
                  </button>
                )}
              </div>
            )}

            {/* Step 2: Selfie Epoux */}
            {activeStep === 2 && (
              <div className="space-y-4">
                <div className="bg-sky-50/50 p-4 border border-sky-200 rounded-2xl">
                  <p className="font-sans text-xs text-sky-900 leading-relaxed font-semibold">
                    👤 <strong>Étape 2 : Selfie en direct &amp; Face Match biométrique du Futur Époux</strong><br />
                    Prenez une photo en direct pour vérifier votre ressemblance avec la pièce d'identité précédemment validée. Ce selfie servira de photo d'identité officielle du dossier civil.
                  </p>
                </div>
                {renderSelfieCaptureUI('epoux')}
                {isStepCompleted(2) && (
                  <button onClick={() => setActiveStep(3)} className="py-3 px-6 bg-primary text-white rounded-xl font-sans text-xs font-bold hover:bg-primary-container shadow-md transition-all self-start flex items-center gap-1">
                    <span>Étape suivante : Extrait de naissance Époux</span>
                    <ArrowRight className="w-4 h-4 text-accent" />
                  </button>
                )}
              </div>
            )}

            {/* Step 3: Extrait Epoux */}
            {activeStep === 3 && (
              <div className="space-y-4">
                <div className="bg-sky-50/50 p-4 border border-sky-200 rounded-2xl">
                  <p className="font-sans text-xs text-sky-900 leading-relaxed font-semibold">
                    📜 <strong>Étape 3 : Extrait de naissance du Futur Époux</strong><br />
                    Téléversez l'original de l'extrait de naissance de moins de 3 mois de l'époux (ou moins de 6 mois s'il est né à l'étranger).
                  </p>
                </div>
                {renderBirthActCard('doc2', "Extrait d'acte de naissance — Époux")}
                {isStepCompleted(3) && (
                  <button onClick={() => setActiveStep(4)} className="py-3 px-6 bg-primary text-white rounded-xl font-sans text-xs font-bold hover:bg-primary-container shadow-md transition-all self-start flex items-center gap-1">
                    <span>Étape suivante : Pièce d'identité de l'Épouse</span>
                    <ArrowRight className="w-4 h-4 text-accent" />
                  </button>
                )}
              </div>
            )}

            {/* Step 4: CNI Epouse */}
            {activeStep === 4 && (
              <div className="space-y-4">
                <div className="bg-sky-50/50 p-4 border border-sky-200 rounded-2xl">
                  <p className="font-sans text-xs text-sky-900 leading-relaxed font-semibold">
                    👰 <strong>Étape 4 : Pièce d'identité de la Future Épouse ({spouse2Name})</strong><br />
                    Veuillez fournir la photo nette de la pièce d'identité (type : {spouse2CniType}) de l'épouse.
                  </p>
                </div>
                {renderCniCard('doc1_f', `Pièce d'identité (${spouse2CniType}) — Épouse`)}
                {isStepCompleted(4) && (
                  <button onClick={() => setActiveStep(5)} className="py-3 px-6 bg-primary text-white rounded-xl font-sans text-xs font-bold hover:bg-primary-container shadow-md transition-all self-start flex items-center gap-1">
                    <span>Étape suivante : Selfie &amp; Face Match Épouse</span>
                    <ArrowRight className="w-4 h-4 text-accent" />
                  </button>
                )}
              </div>
            )}

            {/* Step 5: Selfie Epouse */}
            {activeStep === 5 && (
              <div className="space-y-4">
                <div className="bg-sky-50/50 p-4 border border-sky-200 rounded-2xl">
                  <p className="font-sans text-xs text-sky-900 leading-relaxed font-semibold">
                    👤 <strong>Étape 5 : Selfie en direct &amp; Face Match biométrique de la Future Épouse</strong><br />
                    Prenez une photo en direct pour vérifier votre ressemblance avec la pièce d'identité précédemment validée. Ce selfie servira de photo d'identité officielle du dossier civil.
                  </p>
                </div>
                {renderSelfieCaptureUI('epouse')}
                {isStepCompleted(5) && (
                  <button onClick={() => setActiveStep(6)} className="py-3 px-6 bg-primary text-white rounded-xl font-sans text-xs font-bold hover:bg-primary-container shadow-md transition-all self-start flex items-center gap-1">
                    <span>Étape suivante : Extrait de naissance Épouse</span>
                    <ArrowRight className="w-4 h-4 text-accent" />
                  </button>
                )}
              </div>
            )}

            {/* Step 6: Extrait Epouse */}
            {activeStep === 6 && (
              <div className="space-y-4">
                <div className="bg-sky-50/50 p-4 border border-sky-200 rounded-2xl">
                  <p className="font-sans text-xs text-sky-950 leading-relaxed font-semibold">
                    📜 <strong>Étape 6 : Extrait de naissance de la Future Épouse</strong><br />
                    Téléversez l'original de l'extrait de naissance de moins de 3 mois de l'épouse (ou moins de 6 mois si elle est née à l'étranger).
                  </p>
                </div>
                {renderBirthActCard('doc2_f', "Extrait d'acte de naissance — Épouse")}
                {isStepCompleted(6) && (
                  <button onClick={() => setActiveStep(7)} className="py-3 px-6 bg-primary text-white rounded-xl font-sans text-xs font-bold hover:bg-primary-container shadow-md transition-all self-start flex items-center gap-1">
                    <span>Étape suivante : Autres documents à fournir</span>
                    <ArrowRight className="w-4 h-4 text-accent" />
                  </button>
                )}
              </div>
            )}

            {/* Step 7: Autres documents & Cas spécifiques */}
            {activeStep === 7 && (
              <div className="space-y-6 text-left">
                <div className="bg-sky-50/50 p-4 border border-sky-200 rounded-2xl">
                  <p className="font-sans text-xs text-sky-900 leading-relaxed font-semibold">
                    📁 <strong>Étape 7 : Autres justificatifs, cas spécifiques &amp; témoins</strong><br />
                    Fournissez les justificatifs de résidence, la pièce d'identité des témoins, ou tout document propre à votre situation (veuf, divorcé, militaire, étranger, etc.).
                  </p>
                </div>

                {/* 1. Justificatifs requis selon la situation du couple */}
                {(() => {
                  const savedProf = getSavedSpouseProfiles(dossierId);
                  const epouxP = dossierDetails?.epoux_profile || savedProf.epouxProfile;
                  const epouseP = dossierDetails?.epouse_profile || savedProf.epouseProfile;
                  const requiredMetas = getRequiredDocsForProfiles(epouxP, epouseP);
                  const step7Ids = requiredMetas
                    .filter(d => !['doc1', 'doc2', 'doc1_f', 'doc2_f', 'selfie_epoux', 'selfie_epouse'].includes(d.id))
                    .map(d => d.id);

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <span>📑 Justificatifs Requis selon Profil</span>
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">
                          {step7Ids.length} pièce(s) requise(s)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {documents
                          .filter(doc => step7Ids.includes(doc.id))
                          .map(doc => {
                            const meta = requiredMetas.find(m => m.id === doc.id);
                            const isUploaded = !!doc.fileName;
                            return (
                              <div key={doc.id} className={`p-4 rounded-xl border flex flex-col gap-3 ${isUploaded ? 'bg-emerald-50/30 border-emerald-250' : 'bg-neutral-50 border-neutral-200'}`}>
                                <div className="flex justify-between items-start">
                                  <div className="text-left">
                                    <span className="font-sans font-bold text-xs text-slate-800 block">
                                      {meta?.label || doc.name} {meta?.isSpecial && <span className="text-[9px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded ml-1 font-semibold">Spécifique</span>}
                                    </span>
                                    <span className="font-sans text-[10px] text-slate-400 leading-relaxed block mt-0.5">{meta?.desc || doc.description}</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full font-sans text-[9px] font-bold shrink-0 ${isUploaded ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-slate-500'}`}>
                                    {isUploaded ? 'Téléversé ✓' : 'À fournir'}
                                  </span>
                                </div>

                                {isUploaded ? (
                                  <div className="flex justify-between items-center text-xs font-sans p-2 bg-white rounded-xl border border-neutral-100">
                                    <span className="truncate max-w-[80%] font-semibold text-slate-600">📄 {doc.fileName}</span>
                                    {!isDossierLocked ? (
                                      <button onClick={() => updateDocumentStatus(doc.id, 'pending', undefined, null)} className="text-red-500 hover:text-red-700 bg-transparent border border-none cursor-pointer">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">🔒 Transmis</span>
                                    )}
                                  </div>
                                ) : !isDossierLocked ? (
                                  <button onClick={() => setShowFileUploadModal(doc.id)} className="py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 font-sans text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                                    <UploadCloud className="w-4 h-4" />
                                    <span>Téléverser</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1.5 rounded-xl border border-emerald-200 inline-block">🔒 Verrouillé</span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Zone de téléversement libre pour cas spécifiques NON PRÉVUS */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-500/5 via-primary/5 to-amber-500/5 border border-primary/20 space-y-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Sparkles className="w-4.5 h-4.5 text-amber-600" />
                        <span>Zone d'ajout de documents spécifiques ou non prévus</span>
                      </h4>
                      <p className="font-sans text-xs text-slate-500 mt-1 leading-relaxed">
                        Si la Mairie exige une pièce complémentaire non répertoriée (ex: contrat de mariage, attestation notariée, autorisation spéciale...), ajoutez-la librement ci-dessous.
                      </p>
                    </div>
                    {!isDossierLocked && (
                      <button
                        type="button"
                        onClick={() => setShowAddCustomModal(true)}
                        className="py-2.5 px-4 bg-primary hover:bg-primary-container text-white rounded-xl font-sans text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Ajouter un document</span>
                      </button>
                    )}
                  </div>

                  {/* Dynamic list of custom uploaded documents */}
                  {documents.filter(d => d.id.startsWith('custom_')).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {documents.filter(d => d.id.startsWith('custom_')).map(doc => (
                        <div key={doc.id} className="p-3.5 rounded-xl bg-white border border-violet-200 flex items-center justify-between shadow-sm">
                          <div className="min-w-0 pr-2">
                            <span className="font-sans font-bold text-xs text-slate-800 block truncate">{doc.name}</span>
                            <span className="font-sans text-[10px] text-slate-400 block truncate mt-0.5">📄 {doc.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded-full font-sans text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              Reçu ✓
                            </span>
                            {!isDossierLocked && (
                              <button
                                type="button"
                                onClick={() => updateDocumentStatus(doc.id, 'pending', undefined, null)}
                                className="p-1 text-slate-400 hover:text-rose-600 bg-transparent border-none cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-white/50 text-center font-sans text-xs text-slate-400">
                      Aucun document spécifique supplémentaire téléversé pour le moment.
                    </div>
                  )}
                </div>

                {isStepCompleted(7) && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 shadow-sm mt-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-2xl mx-auto shadow-sm">🎉</div>
                    <h3 className="font-serif text-lg font-bold text-emerald-900">Instruction biométrique 100% complétée !</h3>
                    <p className="font-sans text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Toutes vos pièces justificatives et contrôles faciaux sont validés par l'officier civil. Vous pouvez maintenant réserver la date officielle de votre célébration.
                    </p>
                    <button
                      onClick={() => {
                        if (onOpenParcoursStep) {
                          onOpenParcoursStep(4);
                        } else {
                          setActiveStep(4);
                          setTab('accueil');
                        }
                      }}
                      className="py-3.5 px-6 bg-emerald-600 text-white rounded-xl font-sans text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
                    >
                      <span>Passer à l'étape 4 : Choix de la date de célébration →</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showFileUploadModal && (() => {
          const activeDoc = documents.find(d => d.id === showFileUploadModal);
          const canonicalDoc = INITIAL_DOCUMENTS.find(d => d.id === showFileUploadModal);
          const activeDocName = canonicalDoc ? canonicalDoc.name : (activeDoc?.name || '');
          const isIdentityDoc = activeDoc?.id === 'doc1' || activeDoc?.id === 'doc1_f';
          return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 backdrop-blur-md px-4 text-left font-sans">
              <motion.div
                className="bg-white rounded-2xl w-full max-w-md p-6 border border-neutral-200 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <h3 className="font-serif text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-primary" />
                  Téléversement : {activeDocName}
                </h3>
                <p className="text-xs text-slate-500 mb-5 font-medium leading-relaxed">
                  {isIdentityDoc
                    ? "Photographiez le recto (devant) et le verso (derrière) de votre pièce."
                    : "Prenez en photo ou déposez votre fichier justificatif pour analyse."}
                </p>

                <div className="flex flex-col gap-4">
                  {!selectedFile ? (
                    <div className="flex flex-col gap-3">
                      {isIdentityDoc ? (
                        /* CNI / Passport Special Flow */
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Recto component */}
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">En haut : Recto (Devant)</span>
                              {cniRectoBase64 ? (
                                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-neutral-300 bg-neutral-100 group shadow-sm">
                                  <img src={cniRectoBase64} alt="CNI Recto" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => fileInputRectoRef.current?.click()}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white border-0 cursor-pointer rounded-xl"
                                  >
                                    <Camera className="w-4 h-4 text-accent" />
                                    <span className="text-[10px] font-bold">Reprendre</span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => fileInputRectoRef.current?.click()}
                                  className="border border-dashed border-primary/40 hover:border-primary rounded-xl aspect-[4/3] bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
                                >
                                  <Camera className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                                  <span className="text-[10px] text-slate-700 font-bold">Photo Recto</span>
                                  <span className="text-[8px] text-slate-400 font-medium">Devant de la pièce</span>
                                </button>
                              )}
                            </div>

                            {/* Verso component */}
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">En bas : Verso (Derrière)</span>
                              {cniVersoBase64 ? (
                                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-neutral-300 bg-neutral-100 group shadow-sm">
                                  <img src={cniVersoBase64} alt="CNI Verso" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => fileInputVersoRef.current?.click()}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white border-0 cursor-pointer rounded-xl"
                                  >
                                    <Camera className="w-4 h-4 text-accent" />
                                    <span className="text-[10px] font-bold">Reprendre</span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => fileInputVersoRef.current?.click()}
                                  className="border border-dashed border-primary/40 hover:border-primary rounded-xl aspect-[4/3] bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
                                >
                                  <Camera className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                                  <span className="text-[10px] text-slate-700 font-bold">Photo Verso</span>
                                  <span className="text-[8px] text-slate-400 font-medium">Dos de la pièce</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Hidden file inputs for CNI native camera capture */}
                          <input
                            type="file"
                            ref={fileInputRectoRef}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleCniFileChange(e, 'recto')}
                          />
                          <input
                            type="file"
                            ref={fileInputVersoRef}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleCniFileChange(e, 'verso')}
                          />

                          {/* Merge and confirm button */}
                          {cniRectoBase64 && cniVersoBase64 && (
                            <button
                              type="button"
                              onClick={() => handleStitchCniImages(activeDocName || 'Piece_Identite')}
                              className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-sans text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                            >
                              <Check className="w-4 h-4 text-white animate-bounce" />
                              <span>Confirmer les deux faces</span>
                            </button>
                          )}

                          {/* presentation bypass option */}
                          <div className="mt-4 pt-3 border-t border-dashed border-slate-200 w-full">
                            <button
                              type="button"
                              onClick={() => activeDoc && handleBypassValidation(activeDoc.id)}
                              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-750 text-white rounded-xl font-sans text-[11px] font-extrabold tracking-wide uppercase shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5"
                            >
                              <Zap className="w-4 h-4 text-white animate-pulse" />
                              <span>Bypass Démo : Valider instantanément</span>
                            </button>
                            <p className="text-center text-[9px] text-amber-600 font-bold mt-1.5 animate-pulse">
                              ⚡ Présentation / Démo — Ignore l'IA et valide directement le document avec des données conformes
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Standard Document Flow */
                        <div className="flex flex-col gap-4">
                          <button
                            type="button"
                            onClick={() => fileInputStandardRef.current?.click()}
                            className="relative border border-primary/30 hover:border-primary rounded-xl p-5 bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center gap-2.5 cursor-pointer text-center group shadow-sm"
                          >
                            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform border border-accent/20">
                              <Camera className="w-5 h-5 text-primary animate-pulse" />
                            </div>
                            <span className="text-[12px] text-slate-800 font-extrabold group-hover:text-primary transition-colors">
                              Prendre la photo du document
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              Ouvre directement la caméra de votre appareil
                            </span>
                          </button>

                          <input
                            type="file"
                            ref={fileInputStandardRef}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleStandardFileChange}
                          />

                          {/* presentation bypass option */}
                          <div className="mt-2 pt-3 border-t border-dashed border-slate-200">
                            <button
                              type="button"
                              onClick={() => activeDoc && handleBypassValidation(activeDoc.id)}
                              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-750 text-white rounded-xl font-sans text-[11px] font-extrabold tracking-wide uppercase shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5"
                            >
                              <Zap className="w-4 h-4 text-white animate-pulse" />
                              <span>Bypass Démo : Valider instantanément</span>
                            </button>
                            <p className="text-center text-[9px] text-amber-600 font-bold mt-1.5 animate-pulse">
                              ⚡ Présentation / Démo — Ignore l'IA et valide directement le document avec des données conformes
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-50 border border-neutral-200 rounded-xl flex items-center justify-between text-xs font-semibold">
                      <span className="truncate max-w-[80%] text-slate-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span>{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-neutral-100 rounded-full cursor-pointer transition-colors"
                        title="Retirer ce fichier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 bg-accent/8 border border-accent/15 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    <p className="text-[10px] text-tertiary leading-relaxed font-medium">
                      <span className="font-bold">Instructions :</span> Prenez une photo bien cadrée et lumineuse de votre document.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleUploadSubmit}
                    disabled={!selectedFile || isUploadingFile || isAnalyzingAi}
                    className={`flex-1 py-3 px-4 rounded-xl font-sans text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all flex items-center justify-center gap-2 ${!selectedFile || isUploadingFile || isAnalyzingAi
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/20'
                      : 'bg-primary hover:bg-primary-container cursor-pointer border border-primary/20 hover:shadow-lg'
                      }`}
                  >
                    {isUploadingFile || isAnalyzingAi ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Veuillez patienter...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirmer et Envoyer</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={closeUploadModal}
                    disabled={isUploadingFile || isAnalyzingAi}
                    className="py-3 px-5 text-[11px] font-bold text-slate-700 hover:bg-neutral-50 rounded-xl border border-neutral-250 cursor-pointer transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Custom document modal */}
      <AnimatePresence>
        {showAddCustomModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 backdrop-blur-md px-4 text-left font-sans">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-md p-6 border border-neutral-200 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h3 className="font-serif text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Nouveau document spécifique
              </h3>
              <p className="text-xs text-slate-500 mb-5 font-medium leading-relaxed">
                Renseignez le nom du document exigé par la Mairie ou requis par votre situation, puis téléversez-le.
              </p>

              <form onSubmit={handleAddCustomDocSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Intitulé du document *</label>
                  <input
                    type="text"
                    required
                    value={customDocTitle}
                    onChange={(e) => setCustomDocTitle(e.target.value)}
                    placeholder="Ex: Contrat de mariage, Dispense consulaire, etc."
                    className="w-full border border-neutral-250 rounded-xl p-3 text-xs focus:border-primary focus:outline-none bg-neutral-50 font-sans font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Fichier justificatif *</label>
                  <div className="p-1 bg-neutral-50 rounded-xl border border-neutral-200">
                    <input
                      type="file"
                      required
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setCustomDocFile(file);
                      }}
                      className="w-full border-0 rounded-xl p-3 text-xs bg-transparent focus:outline-none text-slate-700 font-sans cursor-pointer"
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 block">Formats acceptés : PDF, JPEG, PNG (Max: 5Mo)</span>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-2 pt-3 border-t border-dashed border-slate-100">
                  <button
                    type="submit"
                    disabled={isSubmittingCustomDoc || !customDocTitle.trim() || !customDocFile}
                    className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-container text-white font-sans text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmittingCustomDoc ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Téléversage...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Ajouter &amp; Téléverser</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCustomModal(false);
                      setCustomDocTitle('');
                      setCustomDocFile(null);
                    }}
                    disabled={isSubmittingCustomDoc}
                    className="py-3 px-5 text-[11px] font-bold text-slate-700 hover:bg-neutral-50 rounded-xl border border-neutral-250 cursor-pointer transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
