import React, { useState, useEffect, useCallback } from 'react';
import {
  Building, Plus, Eye, EyeOff, Check, X, ShieldAlert, Award, FileText,
  CheckCircle2, AlertTriangle, ClipboardList, Shield, ToggleLeft,
  ToggleRight, Settings, Users, Calendar, ArrowRight, Activity, Landmark,
  Lock, Unlock, Key, Trash2, Search, Filter, RefreshCw, Edit, LogOut, Loader2, Cpu,
  Clock, Printer, CheckSquare, QrCode, Receipt, CreditCard, Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MairieInfo, DossierInfo, getMairies, createMairie, toggleMairieActive,
  getDossiers, updateDossierStatus, getDocuments, updateDocumentInDb,
  addNotificationToDb, updateTimelineStepInDb, getTimelineSteps,
  updateMairie, deleteMairie, deleteDossier, updateDossierWeddingDate,
  updateDossierAppointmentDate, recordPaymentInDb, simulateTimePassage,
  getPartners, createPartner, updatePartner, deletePartner,
  getPartnerContacts, deletePartnerContactInDb, getPaystackConfig, savePaystackConfig,
  getSentNotificationsLog, clearSentNotificationsLog, triggerSpouseNotifications, sendOpenwaWhatsapp,
  downloadDocumentFile, getOppositions, updateOppositionStatus,
  getAiConfig, saveAiConfig, runDocumentAiAnalysis, compareDocumentsWithGemini, basicEnglishToFrenchFallback,
  testerConnexionOpenRouter, updateDossierPhysicalVerification, getPaymentForDossier, publishDossierBans,
  testerConnexionMistralEmbed, testerConnexionNemotronSafety, testerConnexionTavily, testerConnexionPaddleOcr, testerConnexionDeepFace, DEFAULT_AI_CONFIG,
  getAllPayments, updateDossierBiometrics, deletePaymentInDb,
  getDossierNotes, addDossierNote, deleteDossierNote, getActivityLogs, addActivityLog,
  approveAndNotifyCouple, computeRdvFromWeddingDate, toggleMairieExamUnlock,
  getMairieAgents, createMairieAgent, toggleMairieAgentActive, deleteMairieAgent,
  getSalles, addSalle, updateSalle, deleteSalle, getCreneauxBloques, addCreneauBloque,
  deleteCreneauBloque, getSystemParameters, updateSystemParameters, confirmMairieAppointment, recordCaissePaymentInDb,
  SystemParameters,
  getOcrFeedbackDataset, exportOcrDatasetJsonl, clearOcrFeedbackDataset
} from '../services/dbService';
import { DocumentInfo, Partner, PartnerContact, PaystackConfig, OppositionInfo, AiConfig, AiAnalysisResult, PaymentInfo } from '../types';
import { supabase } from '../supabaseClient';
import MarriageReceiptModal from './MarriageReceiptModal';

interface AdminDashboardProps {
  currentRole: 'mairie' | 'superadmin';
  addNotification: (text: string, type: 'info' | 'warning' | 'success') => void;
}

interface AuditLog {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'admin';
}

export interface ExtendedDossierInfo extends DossierInfo {
  uploadedCount?: number;
  totalRequired?: number;
  isComplete?: boolean;
}

export default function AdminDashboard({ currentRole, addNotification }: AdminDashboardProps) {
  // Common states
  const [mairies, setMairies] = useState<MairieInfo[]>([]);
  const [dossiers, setDossiers] = useState<ExtendedDossierInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Mairie agent states
  const [activeMairieId, setActiveMairieId] = useState<string>(() => {
    const saved = sessionStorage.getItem('mairie_unlocked_id');
    if (saved === 'cocody_salle_prestige' || saved === 'cocody_salle_union') {
      return 'cocody_hotel_de_ville';
    }
    return saved || 'cocody_hotel_de_ville';
  });
  const [mairieUnlockedId, setMairieUnlockedId] = useState<string | null>(() => {
    const saved = sessionStorage.getItem('mairie_unlocked_id');
    if (saved === 'cocody_salle_prestige' || saved === 'cocody_salle_union') {
      sessionStorage.setItem('mairie_unlocked_id', 'cocody_hotel_de_ville');
      return 'cocody_hotel_de_ville';
    }
    return saved;
  });
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<'all' | 'cocody_salle_prestige' | 'cocody_salle_union'>('all');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [selectedDossier, setSelectedDossier] = useState<DossierInfo | null>(null);
  const [dossierDocs, setDossierDocs] = useState<DocumentInfo[]>([]);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [isSavingReviews, setIsSavingReviews] = useState<boolean>(false);

  // New features states
  // New features states
  const mairieAgentRole = sessionStorage.getItem('mairie_agent_role') || 'agent';
  const [mairieActiveTab, setMairieActiveTab] = useState<'dossiers' | 'agenda' | 'finance' | 'settings' | 'agents' | 'logs'>('dossiers');
  const [mairieAgents, setMairieAgents] = useState<any[]>([]);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPassword, setNewAgentPassword] = useState('');
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [mairieSearchText, setMairieSearchText] = useState('');
  const [mairieStatusFilter, setMairieStatusFilter] = useState<'all' | 'under_review' | 'approved' | 'celebrated'>('all');
  const [mairieDateFilterType, setMairieDateFilterType] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [mairieStartDate, setMairieStartDate] = useState('');
  const [mairieEndDate, setMairieEndDate] = useState('');

  const [mairiePhone, setMairiePhone] = useState('');
  const [mairieOfficer, setMairieOfficer] = useState('');
  const [mairieDesc, setMairieDesc] = useState('');

  const [selectedDateVal, setSelectedDateVal] = useState('');
  const [appointmentDateInput, setAppointmentDateInput] = useState('');
  const [appointmentTimeInput, setAppointmentTimeInput] = useState('10:00');
  const [rdvDelayDays, setRdvDelayDays] = useState<number>(14);
  const [isApprovingCouple, setIsApprovingCouple] = useState(false);
  const [notesList, setNotesList] = useState<{ id: string; text: string; date: string }[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  const [showCertificateId, setShowCertificateId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentInfo | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewBlobType, setPreviewBlobType] = useState<string | null>(null);
  const [isFileLoading, setIsFileLoading] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showArchiveDossier, setShowArchiveDossier] = useState<boolean>(false);
  const [oppositions, setOppositions] = useState<OppositionInfo[]>([]);
  const [allOppositions, setAllOppositions] = useState<OppositionInfo[]>([]);
  const [selectedDossierPayment, setSelectedDossierPayment] = useState<PaymentInfo | null>(null);
  const [dossierDetailTab, setDossierDetailTab] = useState<'express_review' | 'planning'>('express_review');
  const [showAiAudit, setShowAiAudit] = useState<boolean>(true);

  // Room and Blocked slot settings state
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [blockedSlotsList, setBlockedSlotsList] = useState<any[]>([]);
  const [roomsParams, setRoomsParams] = useState<SystemParameters | null>(null);

  // Room forms state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomOffset, setNewRoomOffset] = useState<number>(0);
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(5);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Blocked slot forms state
  const [blockRoomId, setBlockRoomId] = useState('');
  const [blockDate, setBlockDate] = useState('');
  const [blockTime, setBlockTime] = useState('08:30');
  const [blockReason, setBlockReason] = useState('Réunion Mairie');

  // System parameters form state
  const [paramReservationPrice, setParamReservationPrice] = useState<number>(2500);
  const [paramTimbrePrice, setParamTimbrePrice] = useState<number>(100000);
  const [paramRescheduleLimit, setParamRescheduleLimit] = useState<number>(3);
  const [paramDailyWeddingLimit, setParamDailyWeddingLimit] = useState<number>(15);
  const [paramDailyPhysicalRdvLimit, setParamDailyPhysicalRdvLimit] = useState<number>(5);
  const [agendaSubTab, setAgendaSubTab] = useState<'celebrations' | 'rdv_physiques'>('celebrations');

  // QR Code scanner simulator state
  const [qrVerificationInput, setQrVerificationInput] = useState('');
  const [qrVerifyStatus, setQrVerifyStatus] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const handleSelectPreviewDoc = (doc: DocumentInfo | null) => {
    setPreviewDoc(doc);
    setZoomLevel(1);
    if (doc) {
      setIsFileLoading(true);
      setPreviewBlobUrl(null);
      setPreviewBlobType(null);
    } else {
      setIsFileLoading(false);
      setPreviewBlobUrl(null);
      setPreviewBlobType(null);
    }
  };

  const initializeCheckedAndReasons = (docs: DocumentInfo[], keepExisting = false) => {
    setCheckedDocs(prev => {
      const nextChecked = keepExisting ? { ...prev } : {};
      docs.forEach(d => {
        if (keepExisting && nextChecked[d.id] !== undefined) return;
        if (d.status === 'verified') {
          nextChecked[d.id] = true;
        } else if (d.status === 'rejected') {
          nextChecked[d.id] = false;
        } else if (d.fileName) {
          nextChecked[d.id] = d.aiAnalysis?.action_recommandee === 'VALIDER';
        } else {
          nextChecked[d.id] = false;
        }
      });
      return nextChecked;
    });

    setRejectionReasons(prev => {
      const nextReasons = keepExisting ? { ...prev } : {};
      docs.forEach(d => {
        if (keepExisting && nextReasons[d.id] !== undefined) return;
        if (d.status === 'rejected') {
          nextReasons[d.id] = d.rejectionReason || '';
        } else if (d.aiAnalysis?.action_recommandee === 'REJETER') {
          nextReasons[d.id] = basicEnglishToFrenchFallback(d.aiAnalysis.motif || '');
        } else {
          nextReasons[d.id] = '';
        }
      });
      return nextReasons;
    });
  };

  // Superadmin states (New Mairie Form)
  const [newMairieName, setNewMairieName] = useState('');
  const [newMairieRegion, setNewMairieRegion] = useState('');
  const [newMairieAccessCode, setNewMairieAccessCode] = useState('');

  // Superadmin Mairie Edit states
  const [editingMairieId, setEditingMairieId] = useState<string | null>(null);
  const [editMairieName, setEditMairieName] = useState('');
  const [editMairieRegion, setEditMairieRegion] = useState('');
  const [editMairieAccessCode, setEditMairieAccessCode] = useState('');

  // Superadmin National Dossier Explorer states
  const [dossierSearchText, setDossierSearchText] = useState('');
  const [dossierMairieFilter, setDossierMairieFilter] = useState('all');
  const [dossierStatusFilter, setDossierStatusFilter] = useState('all');
  const [superadminDateFilterType, setSuperadminDateFilterType] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [superadminStartDate, setSuperadminStartDate] = useState('');
  const [superadminEndDate, setSuperadminEndDate] = useState('');
  const [showBulletinCaisseDossier, setShowBulletinCaisseDossier] = useState<DossierInfo | null>(null);

  // Superadmin Partners states
  const [partners, setPartners] = useState<Partner[]>([]);
  const [superadminActiveTab, setSuperadminActiveTab] = useState<'mairies_dossiers' | 'agenda' | 'partners' | 'orders' | 'finance' | 'settings'>('mairies_dossiers');

  // Paystack / Payment Configuration States
  const [paystackMode, setPaystackMode] = useState<'test' | 'live'>('test');
  const [paystackPubKey, setPaystackPubKey] = useState('');
  const [paystackSecKey, setPaystackSecKey] = useState('');
  const [paystackCurrency, setPaystackCurrency] = useState('XOF');
  const [paystackAmount, setPaystackAmount] = useState(50000);
  const [paystackWave, setPaystackWave] = useState(true);
  const [paystackOrange, setPaystackOrange] = useState(true);
  const [paystackMtn, setPaystackMtn] = useState(true);
  const [paystackMoov, setPaystackMoov] = useState(true);
  const [paystackCard, setPaystackCard] = useState(true);

  // Notification configuration states
  const [enableEmailNotifs, setEnableEmailNotifs] = useState(false);
  const [enableWhatsappNotifs, setEnableWhatsappNotifs] = useState(false);
  const [emailApiKey, setEmailApiKey] = useState('');
  const [emailSender, setEmailSender] = useState('no-reply@e-mariage.ci');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappServerUrl, setWhatsappServerUrl] = useState('https://84.234.99.41.sslip.io');
  const [isTestingWhatsapp, setIsTestingWhatsapp] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [simTargetDossierId, setSimTargetDossierId] = useState<string | null>(null);

  const [geminiKey, setGeminiKey] = useState('');
  const [mistralKey, setMistralKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [tavilyKey, setTavilyKey] = useState('');
  const [glmKey, setGlmKey] = useState('');
  const [primaryOcrEngine, setPrimaryOcrEngine] = useState<'glm-ocr' | 'mistral-vision' | 'openrouter-vision'>('glm-ocr');
  const [fastCheckEngine, setFastCheckEngine] = useState<'internal-script' | 'groq-lpu' | 'disabled'>('internal-script');
  const [promptPrincipal, setPromptPrincipal] = useState('');
  const [promptAntiDoublon, setPromptAntiDoublon] = useState('');
  const [promptDoubleVerification, setPromptDoubleVerification] = useState('');
  const [promptFaq, setPromptFaq] = useState('');
  const [promptNemotronSafety, setPromptNemotronSafety] = useState('');
  const [openRouterModel1, setOpenRouterModel1] = useState('');
  const [openRouterModel2, setOpenRouterModel2] = useState('');
  const [openRouterModel3, setOpenRouterModel3] = useState('');
  const [openRouterModel4, setOpenRouterModel4] = useState('');
  const [openRouterModelSafety, setOpenRouterModelSafety] = useState('');
  const [faceAPIKeyEpoux, setFaceAPIKeyEpoux] = useState('');
  const [faceAPISecretEpoux, setFaceAPISecretEpoux] = useState('');
  const [faceAPIKeyEpouse, setFaceAPIKeyEpouse] = useState('');
  const [faceAPISecretEpouse, setFaceAPISecretEpouse] = useState('');
  const [usePaddleOcr, setUsePaddleOcr] = useState(false);
  const [paddleOcrToken, setPaddleOcrToken] = useState('');
  const [paddleOcrModel, setPaddleOcrModel] = useState('');
  const [paddleOcrJobUrl, setPaddleOcrJobUrl] = useState('');
  const [useDeepFace, setUseDeepFace] = useState(false);
  const [deepFaceApiUrl, setDeepFaceApiUrl] = useState('');

  // AI Diagnostics state
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResults, setAiTestResults] = useState<{
    glm?: { status: 'idle' | 'testing' | 'success' | 'failed'; message?: string };
    openRouter: {
      status: 'idle' | 'testing' | 'success' | 'failed';
      models?: { modele: string; statut: string; icone: string; message?: string }[];
      message?: string;
    };
    mistral: { status: 'idle' | 'testing' | 'success' | 'failed'; message?: string };
    groq: { status: 'idle' | 'testing' | 'success' | 'failed'; message?: string };
    mistralEmbed: { status: 'idle' | 'testing' | 'success' | 'failed'; message?: string };
    nemotronSafety: { status: 'idle' | 'testing' | 'success' | 'failed' | 'warning'; message?: string };
    tavily: { status: 'idle' | 'testing' | 'success' | 'failed'; message?: string };
    paddleOcr: { status: 'idle' | 'testing' | 'success' | 'failed'; message?: string };
    deepFace?: { status: 'idle' | 'testing' | 'success' | 'failed'; message?: string };
  } | null>(null);

  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});
  const toggleKeyVisibility = (keyName: string) => {
    setShowApiKeys(prev => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  // Calendar and Agenda States
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [superadminCalendarMairieFilter, setSuperadminCalendarMairieFilter] = useState<string>('all');

  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerCategory, setNewPartnerCategory] = useState('Photographes');
  const [newPartnerDescription, setNewPartnerDescription] = useState('');
  const [newPartnerImageUrl, setNewPartnerImageUrl] = useState('');
  const [newPartnerRating, setNewPartnerRating] = useState(5.0);
  const [newPartnerMairieId, setNewPartnerMairieId] = useState<string | null>(null);
  const [newPartnerPhone, setNewPartnerPhone] = useState('');
  const [newPartnerEmail, setNewPartnerEmail] = useState('');

  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [editPartnerName, setEditPartnerName] = useState('');
  const [editPartnerCategory, setEditPartnerCategory] = useState('');
  const [editPartnerDescription, setEditPartnerDescription] = useState('');
  const [editPartnerImageUrl, setEditPartnerImageUrl] = useState('');
  const [editPartnerRating, setEditPartnerRating] = useState(5.0);
  const [editPartnerMairieId, setEditPartnerMairieId] = useState<string | null>(null);
  const [editPartnerPhone, setEditPartnerPhone] = useState('');
  const [editPartnerEmail, setEditPartnerEmail] = useState('');

  // Partner Contacts / orders state
  const [partnerContacts, setPartnerContacts] = useState<PartnerContact[]>([]);

  // Payments and Receipt states
  const [allPayments, setAllPayments] = useState<PaymentInfo[]>([]);
  const [selectedReceiptDossierId, setSelectedReceiptDossierId] = useState<string | null>(null);
  const [receiptSpouse1, setReceiptSpouse1] = useState('');
  const [receiptSpouse2, setReceiptSpouse2] = useState('');
  const [receiptWeddingDate, setReceiptWeddingDate] = useState<string | null>(null);
  const [receiptMairieName, setReceiptMairieName] = useState('');

  // Audit Logs states
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);

  // System actions audit logger helper
  const logSystemAction = (message: string, type: 'info' | 'success' | 'warning' | 'admin' = 'info') => {
    const d = new Date();
    const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const ts = `${dateStr} à ${timeStr}`;
    const newLog: AuditLog = {
      id: Math.random().toString(),
      message,
      timestamp: ts,
      type
    };

    setActivityLogs(prev => [newLog, ...prev].slice(0, 50));
    // Persist to DB asynchronously (fire-and-forget)
    addActivityLog(message, type, ts).catch(err => console.warn('Failed to persist activity log:', err));
  };

  // Document completeness helpers
  const computeDossiersWithCounts = async (dbDossiers: DossierInfo[]) => {
    return Promise.all(
      dbDossiers.map(async (dossier) => {
        const docs = await getDocuments(dossier.id);
        const requiredDocs = docs.filter(doc => doc.category === 'spouses' || doc.category === 'witnesses');
        const uploadedCount = requiredDocs.filter(doc => doc.fileName || doc.status !== 'pending').length;
        const totalRequired = requiredDocs.length;
        return {
          ...dossier,
          uploadedCount,
          totalRequired,
          isComplete: uploadedCount === totalRequired
        };
      })
    );
  };

  const refreshDossierDocCounts = async (dossierId: string) => {
    const docs = await getDocuments(dossierId);
    const requiredDocs = docs.filter(doc => doc.category === 'spouses' || doc.category === 'witnesses');
    const uploadedCount = requiredDocs.filter(doc => doc.fileName || doc.status !== 'pending').length;
    const totalRequired = requiredDocs.length;
    
    setDossiers(prev => prev.map(d => d.id === dossierId ? {
      ...d,
      uploadedCount,
      totalRequired,
      isComplete: uploadedCount === totalRequired
    } : d));
  };

  const autoAdvanceToNextDoc = (currentDocId: string, docsList: DocumentInfo[]) => {
    if (docsList.length === 0) return;
    const requiredList = docsList.filter(d => d.category === 'spouses' || d.category === 'witnesses');
    if (requiredList.length === 0) return;
    const currentIndex = requiredList.findIndex(d => d.id === currentDocId);
    if (currentIndex === -1) return;
    
    for (let i = 1; i <= requiredList.length; i++) {
      const idx = (currentIndex + i) % requiredList.length;
      const doc = requiredList[idx];
      if (doc.status !== 'verified' && doc.status !== 'rejected') {
        handleSelectPreviewDoc(doc);
        return;
      }
    }
  };

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    const [dbMairies, dbDossiers, dbPartners, dbContacts, paystackConfig, notifLogs, dbAllOppositions, dbPayments, dbSalles, dbCreneaux, dbParams] = await Promise.all([
      getMairies(),
      getDossiers(),
      getPartners(),
      getPartnerContacts(),
      getPaystackConfig(),
      getSentNotificationsLog(),
      getOppositions(),
      getAllPayments(),
      getSalles(),
      getCreneauxBloques(),
      getSystemParameters()
    ]);
    setMairies(dbMairies);
    const countEnhancedDossiers = await computeDossiersWithCounts(dbDossiers);
    const validDossiers = countEnhancedDossiers.filter(d => d.id !== '__system_rooms_config__');
    setDossiers(validDossiers);
    setPartners(dbPartners);
    setPartnerContacts(dbContacts);
    setNotificationLogs(notifLogs);
    setAllOppositions(dbAllOppositions || []);
    setAllPayments(dbPayments || []);

    setRoomsList(dbSalles || []);
    setBlockedSlotsList(dbCreneaux || []);
    if (dbParams) {
      setRoomsParams(dbParams);
      setParamReservationPrice(dbParams.frais_reservation_montant || 2500);
      setParamTimbrePrice(dbParams.frais_timbre_montant || 100000);
      setParamRescheduleLimit(dbParams.nombre_reprogrammations_limite);
      setParamDailyWeddingLimit(dbParams.quota_max_journalier || 15);
      setParamDailyPhysicalRdvLimit(dbParams.quota_rdv_physiques_journalier || 5);
    }

    if (paystackConfig) {
      setPaystackMode(paystackConfig.mode);
      setPaystackPubKey(paystackConfig.publicKey);
      setPaystackSecKey(paystackConfig.secretKey);
      setPaystackCurrency(paystackConfig.currency);
      setPaystackAmount(paystackConfig.amount);
      setPaystackWave(paystackConfig.enableWave);
      setPaystackOrange(paystackConfig.enableOrange);
      setPaystackMtn(paystackConfig.enableMtn);
      setPaystackMoov(paystackConfig.enableMoov);
      setPaystackCard(paystackConfig.enableCard);
      setEnableEmailNotifs(paystackConfig.enableEmailNotifs || false);
      setEnableWhatsappNotifs(paystackConfig.enableWhatsappNotifs || false);
      setEmailApiKey(paystackConfig.emailApiKey || '');
      setEmailSender(paystackConfig.emailSender || 'no-reply@e-mariage.ci');
      setWhatsappToken(paystackConfig.whatsappToken || '');
      setWhatsappPhoneId(paystackConfig.whatsappPhoneId || '');
      setWhatsappServerUrl(paystackConfig.whatsappServerUrl || 'https://84.234.99.41.sslip.io');
    }

    const aiConfig = getAiConfig();
    if (aiConfig) {
      setGeminiKey(aiConfig.geminiKey || '');
      setMistralKey(aiConfig.mistralKey || '');
      setGroqKey(aiConfig.groqKey || '');
      setTavilyKey(aiConfig.tavilyKey || '');
      setGlmKey(aiConfig.glmKey || '');
      setPrimaryOcrEngine(aiConfig.primaryOcrEngine || 'glm-ocr');
      setFastCheckEngine(aiConfig.fastCheckEngine || 'internal-script');
      setPromptPrincipal(aiConfig.promptPrincipal || '');
      setPromptAntiDoublon(aiConfig.promptAntiDoublon || '');
      setPromptDoubleVerification(aiConfig.promptDoubleVerification || '');
      setPromptFaq(aiConfig.promptFaq || '');
      setPromptNemotronSafety(aiConfig.promptNemotronSafety || '');
      setOpenRouterModel1(aiConfig.openRouterModel1 || DEFAULT_AI_CONFIG.openRouterModel1 || 'google/gemini-2.0-flash:free');
      setOpenRouterModel2(aiConfig.openRouterModel2 || DEFAULT_AI_CONFIG.openRouterModel2 || 'google/gemini-2.0-flash-lite:free');
      setOpenRouterModel3(aiConfig.openRouterModel3 || DEFAULT_AI_CONFIG.openRouterModel3 || 'qwen/qwen2.5-vl-72b-instruct:free');
      setOpenRouterModel4(aiConfig.openRouterModel4 || DEFAULT_AI_CONFIG.openRouterModel4 || 'meta-llama/llama-3.2-11b-vision-instruct:free');
      setOpenRouterModelSafety(aiConfig.openRouterModelSafety || DEFAULT_AI_CONFIG.openRouterModelSafety || 'nvidia/nemotron-3.5-content-safety:free');
      setFaceAPIKeyEpoux(aiConfig.faceAPIKeyEpoux || '');
      setFaceAPISecretEpoux(aiConfig.faceAPISecretEpoux || '');
      setFaceAPIKeyEpouse(aiConfig.faceAPIKeyEpouse || '');
      setFaceAPISecretEpouse(aiConfig.faceAPISecretEpouse || '');
      setRdvDelayDays(aiConfig.rdvDelayDays ?? 14);
      setUsePaddleOcr(aiConfig.usePaddleOcr ?? false);
      setPaddleOcrToken(aiConfig.paddleOcrToken || '');
      setPaddleOcrModel(aiConfig.paddleOcrModel || 'PaddleOCR-VL-1.6');
      setPaddleOcrJobUrl(aiConfig.paddleOcrJobUrl || 'https://paddleocr.aistudio-app.com/api/v2/ocr/jobs');
      setUseDeepFace(aiConfig.useDeepFace ?? false);
      setDeepFaceApiUrl(aiConfig.deepFaceApiUrl || 'http://r8dqp05xpng1xidux3r4bu77.193.29.187.66.sslip.io');
    }

    // Set first active mairie if current is not in db
    if (dbMairies.length > 0 && activeMairieId !== 'cocody_hotel_de_ville' && !dbMairies.some(m => m.id === activeMairieId)) {
      setActiveMairieId(dbMairies[0].id);
    }
    setLoading(false);
  };

  const loadMairieAgents = useCallback(async () => {
    if (!activeMairieId) return;
    const list = await getMairieAgents(activeMairieId);
    setMairieAgents(list);
  }, [activeMairieId]);

  useEffect(() => {
    if (activeMairieId && mairieAgentRole === 'supervisor') {
      loadMairieAgents();
    }
  }, [activeMairieId, mairieAgentRole, loadMairieAgents]);

  useEffect(() => {
    loadData();
    // Load activity logs from DB on mount
    getActivityLogs().then(logs => {
      if (logs && logs.length > 0) {
        setActivityLogs(logs.map(l => ({ id: l.id, message: l.message, timestamp: l.timestamp, type: l.type as any })));
      } else {
        const todayStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const defaultLogs: AuditLog[] = [
          { id: 'l1', message: "Système : Registre d'état civil connecté et sécurisé.", timestamp: `${todayStr} à 08:15:22`, type: 'info' },
          { id: 'l2', message: "Audit : Portail de Cocody raccordé avec le code d'accès par défaut.", timestamp: `${todayStr} à 08:15:25`, type: 'success' }
        ];
        setActivityLogs(defaultLogs);
      }
    });
  }, [currentRole]);

  // Load documents and setup real-time listeners when a dossier is selected for review
  useEffect(() => {
    if (!selectedDossier) {
      setDossierDocs([]);
      setOppositions([]);
      handleSelectPreviewDoc(null);
      return;
    }

    // Reset documents and oppositions lists immediately to prevent flashing
    setDossierDocs([]);
    setOppositions([]);
    setDossierDetailTab('express_review');

    async function loadDossierDetails() {
      const [docs, opps, pay] = await Promise.all([
        getDocuments(selectedDossier!.id),
        getOppositions(selectedDossier!.id),
        getPaymentForDossier(selectedDossier!.id)
      ]);
      setDossierDocs(docs);
      setOppositions(opps);
      setSelectedDossierPayment(pay);
      initializeCheckedAndReasons(docs, false);
      refreshDossierDocCounts(selectedDossier!.id);

      // Auto-select the first unverified document for express review
      const firstUnverified = docs.find(d => d.status !== 'verified');
      if (firstUnverified) {
        handleSelectPreviewDoc(firstUnverified);
      } else if (docs.length > 0) {
        handleSelectPreviewDoc(docs[0]);
      }
    }
    loadDossierDetails();

    // 1. Setup Supabase Real-time postgres_changes subscription for documents
    const channel = supabase
      .channel(`admin-dossier-docs-${selectedDossier.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `dossier_id=eq.${selectedDossier.id}`
        },
        async (payload) => {
          console.log('Realtime documents update received:', payload);
          const docs = await getDocuments(selectedDossier!.id);
          setDossierDocs(docs);
          initializeCheckedAndReasons(docs, true);
          refreshDossierDocCounts(selectedDossier!.id);
        }
      )
      .subscribe();

    // 1b. Setup Supabase Real-time postgres_changes subscription for oppositions
    const oppsChannel = supabase
      .channel(`admin-dossier-opps-${selectedDossier.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'oppositions',
          filter: `dossier_id=eq.${selectedDossier.id}`
        },
        async (payload) => {
          console.log('Realtime oppositions update received:', payload);
          const opps = await getOppositions(selectedDossier!.id);
          setOppositions(opps);
        }
      )
      .subscribe();

    // 2. Setup BroadcastChannel listener for local development mock syncing
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('e_mariage_channel');
      bc.onmessage = async (event) => {
        if (event.data?.dossierId === selectedDossier!.id) {
          if (event.data?.type === 'docs_changed') {
            console.log('BroadcastChannel documents update received:', event.data);
            const docs = await getDocuments(selectedDossier!.id);
            setDossierDocs(docs);
            initializeCheckedAndReasons(docs, true);
            refreshDossierDocCounts(selectedDossier!.id);
          } else if (event.data?.type === 'opposition_changed') {
            console.log('BroadcastChannel oppositions update received:', event.data);
            const opps = await getOppositions(selectedDossier!.id);
            setOppositions(opps);
          }
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported in this browser:", e);
    }

    // 3. Setup window storage listener as a secondary cross-tab fallback
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === `e_mariage_documents_${selectedDossier!.id}`) {
        console.log('Storage event documents update received');
        try {
          const docs = JSON.parse(e.newValue || '[]');
          setDossierDocs(docs);
          initializeCheckedAndReasons(docs, true);
          refreshDossierDocCounts(selectedDossier!.id);
        } catch (err) {
          console.error("Failed to parse storage documents data:", err);
        }
      } else if (e.key === 'e_mariage_oppositions') {
        console.log('Storage event oppositions update received');
        const opps = await getOppositions(selectedDossier!.id);
        setOppositions(opps);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Cleanup functions
    return () => {
      channel.unsubscribe();
      oppsChannel.unsubscribe();
      supabase.removeChannel(channel);
      supabase.removeChannel(oppsChannel);
      if (bc) {
        bc.close();
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [selectedDossier?.id]);

  // Load mairie details to edit settings
  useEffect(() => {
    if (activeMairie) {
      setMairiePhone(activeMairie.phone || '');
      setMairieOfficer(activeMairie.officer_name || '');
      setMairieDesc(activeMairie.description || '');
    }
  }, [activeMairieId, mairies]);

  // Load internal notes on dossier select
  useEffect(() => {
    if (selectedDossier) {
      getDossierNotes(selectedDossier.id).then(notes => {
        setNotesList(notes.map(n => ({ id: n.id, text: n.text, date: n.date })));
      });
      setSelectedDateVal('');
      setAppointmentDateInput('');
      setAppointmentTimeInput('10:00');
    } else {
      setNotesList([]);
      setSelectedDateVal('');
      setAppointmentDateInput('');
      setAppointmentTimeInput('10:00');
    }
  }, [selectedDossier?.id]);

  // Load actual file from IndexedDB when previewDoc changes
  useEffect(() => {
    if (!previewDoc || !selectedDossier) {
      setPreviewBlobUrl(null);
      setPreviewBlobType(null);
      setIsFileLoading(false);
      return;
    }

    let isMounted = true;
    let urlToRevoke: string | null = null;

    const loadFile = async () => {
      setIsFileLoading(true);
      try {
        const blob = await downloadDocumentFile(selectedDossier.id, previewDoc.id, previewDoc.fileName || '');
        if (blob && isMounted) {
          console.log("Successfully loaded file from Supabase Storage:", previewDoc.id, blob);
          const url = URL.createObjectURL(blob);
          urlToRevoke = url;
          setPreviewBlobUrl(url);
          setPreviewBlobType(blob.type);
        } else {
          console.warn("File NOT found in Supabase Storage for:", previewDoc.id, "- Falling back to demo template.");
          if (isMounted) {
            setPreviewBlobUrl(null);
            setPreviewBlobType(null);
          }
        }
      } catch (err) {
        console.error("Error loading file from Supabase Storage:", err);
        if (isMounted) {
          setPreviewBlobUrl(null);
          setPreviewBlobType(null);
        }
      } finally {
        if (isMounted) {
          setIsFileLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      isMounted = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [previewDoc?.id, previewDoc?.fileName, selectedDossier?.id]);

  // Periodic auto-refresh to keep data synced in real-time
  useEffect(() => {
    const interval = setInterval(async () => {
      // Fetch updated mairies, dossiers, partners, contacts and notification logs
      const [dbMairies, dbDossiers, dbPartners, dbContacts, dbNotifLogs, dbPayments] = await Promise.all([
        getMairies(),
        getDossiers(),
        getPartners(),
        getPartnerContacts(),
        getSentNotificationsLog(),
        getAllPayments()
      ]);

      setMairies(prev => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(dbMairies);
        return hasChanged ? dbMairies : prev;
      });

      const countEnhancedDossiers = await computeDossiersWithCounts(dbDossiers);
      const validDossiers = countEnhancedDossiers.filter(d => d.id !== '__system_rooms_config__');

      setDossiers(prev => {
        const prevClean = prev.map(d => ({ id: d.id, status: d.status, wedding_date: d.wedding_date, isComplete: d.isComplete, mairie_exam_unlocked: d.mairie_exam_unlocked }));
        const currentClean = validDossiers.map(d => ({ id: d.id, status: d.status, wedding_date: d.wedding_date, isComplete: d.isComplete, mairie_exam_unlocked: d.mairie_exam_unlocked }));
        const hasChanged = JSON.stringify(prevClean) !== JSON.stringify(currentClean);
        return hasChanged ? validDossiers : prev;
      });

      setPartners(prev => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(dbPartners);
        return hasChanged ? dbPartners : prev;
      });

      setPartnerContacts(prev => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(dbContacts);
        return hasChanged ? dbContacts : prev;
      });

      setNotificationLogs(prev => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(dbNotifLogs);
        return hasChanged ? dbNotifLogs : prev;
      });

      setAllPayments(prev => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(dbPayments);
        return hasChanged ? dbPayments : prev;
      });

      if (activeMairieId && mairieAgentRole === 'supervisor') {
        const list = await getMairieAgents(activeMairieId);
        setMairieAgents(prev => {
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(list);
          return hasChanged ? list : prev;
        });
      }

      // Update selectedDossier properties if it changed (e.g. spouse names, wedding date, status)
      if (selectedDossier) {
        const updatedDossier = dbDossiers.find(d => d.id === selectedDossier.id);
        if (updatedDossier && JSON.stringify(updatedDossier) !== JSON.stringify(selectedDossier)) {
          setSelectedDossier(updatedDossier);
        }

        // Fetch documents for the selected dossier
        const docs = await getDocuments(selectedDossier.id);
        setDossierDocs(prev => {
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(docs);
          return hasChanged ? docs : prev;
        });
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedDossier, activeMairieId]);

  // Create new Mairie (Super Admin action)
  const handleCreateMairie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMairieName || !newMairieRegion) return;

    const id = `mairie_${newMairieName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const code = newMairieAccessCode.trim() || `${newMairieName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)}2026`;

    const newMairie: MairieInfo = {
      id,
      name: newMairieName,
      region: newMairieRegion,
      access_code: code,
      is_active: true
    };

    const success = await createMairie(newMairie);
    if (success) {
      addNotification(`Nouvelle mairie raccordée avec succès : ${newMairieName}`, 'success');
      logSystemAction(`Super Admin a raccordé la mairie : ${newMairieName} (Code: ${code})`, 'success');
      setNewMairieName('');
      setNewMairieRegion('');
      setNewMairieAccessCode('');
      loadData();
    } else {
      addNotification("Erreur lors du raccordement de la mairie.", "warning");
    }
  };

  // Toggle Mairie active state (Super Admin action)
  const handleToggleMairie = async (id: string, currentActive: boolean) => {
    const m = mairies.find(ma => ma.id === id);
    const success = await toggleMairieActive(id, !currentActive);
    if (success) {
      addNotification(`Statut de la mairie mis à jour.`, 'info');
      logSystemAction(`Super Admin a ${!currentActive ? 'activé' : 'désactivé'} la mairie : ${m?.name}`, !currentActive ? 'success' : 'warning');
      loadData();
    }
  };

  // Delete Mairie (Super Admin action)
  const handleDeleteMairie = async (id: string, name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la mairie "${name}" ? Cette action désassociera également ses dossiers.`)) {
      return;
    }

    const success = await deleteMairie(id);
    if (success) {
      addNotification(`Mairie "${name}" supprimée avec succès.`, 'info');
      logSystemAction(`Super Admin a supprimé la mairie : ${name}`, 'warning');
      loadData();
    } else {
      addNotification("Erreur lors de la suppression de la mairie.", "warning");
    }
  };

  // Inline edit mairie actions
  const handleStartEditMairie = (mairie: MairieInfo) => {
    setEditingMairieId(mairie.id);
    setEditMairieName(mairie.name);
    setEditMairieRegion(mairie.region);
    setEditMairieAccessCode(mairie.access_code);
  };

  const handleSaveMairie = async (id: string) => {
    if (!editMairieName || !editMairieRegion || !editMairieAccessCode) return;

    const updatedMairie: MairieInfo = {
      id,
      name: editMairieName,
      region: editMairieRegion,
      access_code: editMairieAccessCode.trim(),
      is_active: mairies.find(m => m.id === id)?.is_active ?? true
    };

    const success = await updateMairie(updatedMairie);
    if (success) {
      addNotification(`Mairie "${editMairieName}" mise à jour.`, 'success');
      logSystemAction(`Super Admin a modifié la mairie : ${editMairieName} (Code: ${editMairieAccessCode})`, 'admin');
      setEditingMairieId(null);
      loadData();
    } else {
      addNotification("Erreur lors de la mise à jour de la mairie.", "warning");
    }
  };

  // Partners CRUD Handlers
  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName || !newPartnerCategory) return;

    const id = `partner_${newPartnerName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const newPartner: Partner = {
      id,
      name: newPartnerName,
      category: newPartnerCategory,
      description: newPartnerDescription,
      imageUrl: newPartnerImageUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop',
      rating: newPartnerRating || 5.0,
      contacted: false,
      mairieId: newPartnerMairieId,
      contactPhone: newPartnerPhone || undefined,
      email: newPartnerEmail || undefined
    };

    const success = await createPartner(newPartner);
    if (success) {
      addNotification(`Prestataire d'exception créé : ${newPartnerName}`, 'success');
      logSystemAction(`Super Admin a créé le prestataire : ${newPartnerName} (Catégorie: ${newPartnerCategory})`, 'success');
      setNewPartnerName('');
      setNewPartnerDescription('');
      setNewPartnerImageUrl('');
      setNewPartnerRating(5.0);
      setNewPartnerMairieId(null);
      setNewPartnerPhone('');
      setNewPartnerEmail('');
      loadData();
    } else {
      addNotification("Erreur lors de la création du prestataire.", "warning");
    }
  };

  const handleStartEditPartner = (partner: Partner) => {
    setEditingPartnerId(partner.id);
    setEditPartnerName(partner.name);
    setEditPartnerCategory(partner.category);
    setEditPartnerDescription(partner.description);
    setEditPartnerImageUrl(partner.imageUrl);
    setEditPartnerRating(partner.rating);
    setEditPartnerMairieId(partner.mairieId || null);
    setEditPartnerPhone(partner.contactPhone || '');
    setEditPartnerEmail(partner.email || '');
  };

  const handleSavePartner = async (id: string) => {
    if (!editPartnerName || !editPartnerCategory) return;

    const updatedPartner: Partner = {
      id,
      name: editPartnerName,
      category: editPartnerCategory,
      description: editPartnerDescription,
      imageUrl: editPartnerImageUrl,
      rating: editPartnerRating,
      contacted: partners.find(p => p.id === id)?.contacted ?? false,
      mairieId: editPartnerMairieId,
      contactPhone: editPartnerPhone || undefined,
      email: editPartnerEmail || undefined
    };

    const success = await updatePartner(updatedPartner);
    if (success) {
      addNotification(`Prestataire "${editPartnerName}" mis à jour.`, 'success');
      logSystemAction(`Super Admin a modifié le prestataire : ${editPartnerName}`, 'admin');
      setEditingPartnerId(null);
      loadData();
    } else {
      addNotification("Erreur lors de la mise à jour du prestataire.", "warning");
    }
  };

  const handleDeletePartner = async (id: string, name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le prestataire "${name}" ?`)) {
      return;
    }

    const success = await deletePartner(id);
    if (success) {
      addNotification(`Prestataire "${name}" supprimé.`, 'info');
      logSystemAction(`Super Admin a supprimé le prestataire : ${name}`, 'warning');
      loadData();
    } else {
      addNotification("Erreur lors de la suppression du prestataire.", "warning");
    }
  };

  // Mairie Unlock action (Access Code Verification)
  const handleUnlockPortal = (e: React.FormEvent) => {
    e.preventDefault();
    let accessCode = '';
    let mName = '';

    if (activeMairieId === 'cocody_hotel_de_ville') {
      accessCode = 'COCODY2026';
      mName = "Hôtel de Ville (Salle Prestige & Salle de l'Union)";
    } else {
      const targetMairie = mairies.find(m => m.id === activeMairieId);
      if (!targetMairie) return;
      accessCode = targetMairie.access_code;
      mName = targetMairie.name;
    }

    if (accessCodeInput.trim() === accessCode) {
      setMairieUnlockedId(activeMairieId);
      sessionStorage.setItem('mairie_unlocked_id', activeMairieId);
      setUnlockError(null);
      setAccessCodeInput('');
      addNotification(`Portail déverrouillé pour la ${mName}.`, 'success');
      logSystemAction(`Officier Civil connecté à : ${mName}`, 'info');
    } else {
      setUnlockError("Code d'accès incorrect. Veuillez réessayer.");
      logSystemAction(`Échec de connexion au portail : ${mName}`, 'warning');
    }
  };

  const handleLockPortal = () => {
    setMairieUnlockedId(null);
    sessionStorage.removeItem('mairie_unlocked_id');
    addNotification("Portail d'état civil verrouillé.", "info");
  };

  const handleVerifySpouseBiometrics = async (spouse: 'epoux' | 'epouse', verified: boolean) => {
    if (!selectedDossier) return;
    if (isLocked) {
      addNotification("Action refusée : le dossier est verrouillé en raison d'une suspicion de fraude par l'IA.", "warning");
      return;
    }
    const isEpoux = spouse === 'epoux';
    const fieldPrefix = isEpoux ? 'epoux' : 'epouse';
    const updates = {
      [`${fieldPrefix}_identite_verifiee`]: verified,
      [`${fieldPrefix}_selfie_valide`]: verified
    };
    const success = await updateDossierBiometrics(selectedDossier.id, updates);
    if (success) {
      addNotification(`Statut d'identité ${isEpoux ? "de l'époux" : "de l'épouse"} mis à jour avec succès.`, 'success');
      logSystemAction(`BIOMÉTRIE : Identité ${isEpoux ? "de l'époux" : "de l'épouse"} ${verified ? "validée manuellement" : "marquée comme non validée"} par l'agent.`, verified ? 'success' : 'warning');
      
      setSelectedDossier(prev => prev ? {
        ...prev,
        ...updates
      } : null);
    } else {
      addNotification("Erreur lors de la mise à jour biométrique.", "warning");
    }
  };

  // Document approval action
  const handleApproveDoc = async (docId: string, docName: string) => {
    if (!selectedDossier) return;
    if (isLocked) {
      addNotification("Action refusée : le dossier est verrouillé en raison d'une suspicion de fraude par l'IA.", "warning");
      return;
    }

    const success = await updateDocumentInDb(selectedDossier.id, docId, 'verified');
    if (success) {
      // Send alert notification to the citizen
      await addNotificationToDb({
        id: Math.random().toString(),
        text: `Félicitations, votre document "${docName}" a été validé par l'officier d'état civil.`,
        time: "À l'instant",
        type: 'success'
      }, selectedDossier.id);

      addNotification(`Document "${docName}" validé.`, 'success');
      logSystemAction(`Document "${docName}" validé pour le dossier de ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name}`, 'success');

      // Refresh documents
      const docs = await getDocuments(selectedDossier.id);
      setDossierDocs(docs);
      autoAdvanceToNextDoc(docId, docs);
    }
  };

  // Document rejection action
  const handleRejectDoc = async (docId: string, docName: string) => {
    if (!selectedDossier || !rejectionReason) return;
    if (isLocked) {
      addNotification("Action refusée : le dossier est verrouillé en raison d'une suspicion de fraude par l'IA.", "warning");
      return;
    }

    const success = await updateDocumentInDb(selectedDossier.id, docId, 'rejected', undefined, rejectionReason);
    if (success) {
      // Send alert notification to the citizen with the reason
      await addNotificationToDb({
        id: Math.random().toString(),
        text: `Alerte : Le document "${docName}" a été refusé. Motif : ${rejectionReason}`,
        time: "À l'instant",
        type: 'warning'
      }, selectedDossier.id);

      // Trigger simulated WhatsApp alert to spouses
      await triggerSpouseNotifications(selectedDossier.id, 'rejected', {
        docName,
        reason: rejectionReason
      });

      addNotification(`Document "${docName}" refusé. Motif : ${rejectionReason}`, 'info');
      logSystemAction(`Document "${docName}" rejeté pour le dossier de ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name}. Motif : ${rejectionReason}`, 'warning');
      setRejectingDocId(null);
      setRejectionReason('');

      // Refresh documents
      const docs = await getDocuments(selectedDossier.id);
      setDossierDocs(docs);
      autoAdvanceToNextDoc(docId, docs);
    }
  };

  // Batch save and notify action
  const handleSaveAllDocReviews = async () => {
    if (!selectedDossier) return;
    if (isLocked) {
      addNotification("Action refusée : le dossier est verrouillé en raison d'une suspicion de fraude par l'IA.", "warning");
      return;
    }

    setIsSavingReviews(true);
    try {
      // 1. Iterate over all uploaded documents to save their verification status
      const promises = dossierDocs.filter(d => d.fileName).map(async (doc) => {
        const isChecked = checkedDocs[doc.id] || false;
        const targetStatus = isChecked ? 'verified' : 'rejected';
        const reason = isChecked ? undefined : (rejectionReasons[doc.id] || 'Non conforme');
        
        await updateDocumentInDb(selectedDossier.id, doc.id, targetStatus, undefined, reason);

        // Notify inside E-Mariage dashboard logs for each action (but we will send a single WhatsApp message)
        await addNotificationToDb({
          id: Math.random().toString(),
          text: isChecked 
            ? `Pièce "${doc.name}" validée par l'officier civil.` 
            : `Alerte : Pièce "${doc.name}" refusée par l'officier civil. Motif : ${reason}`,
          time: "À l'instant",
          type: isChecked ? 'success' : 'warning'
        }, selectedDossier.id);
      });

      await Promise.all(promises);

      // 2. Format a single unified WhatsApp notification detailing compliant and non-compliant docs
      const verifiedDocsList = dossierDocs.filter(d => d.fileName && checkedDocs[d.id]);
      const rejectedDocsList = dossierDocs.filter(d => d.fileName && !checkedDocs[d.id]);

      let customMessage = `💍 E-MARIAGE : Examen de votre dossier d'union civile terminé\n\n`;
      customMessage += `Bonjour, les pièces justificatives de votre dossier ont été examinées par l'officier d'état civil.\n\n`;

      if (verifiedDocsList.length > 0) {
        customMessage += `✅ Pièces validées :\n`;
        verifiedDocsList.forEach(d => {
          customMessage += ` - ${d.name}\n`;
        });
        customMessage += `\n`;
      }

      if (rejectedDocsList.length > 0) {
        customMessage += `❌ Pièces à recharger (non conformes) :\n`;
        rejectedDocsList.forEach(d => {
          const reason = rejectionReasons[d.id] || "Non conforme";
          customMessage += ` - ${d.name} (Motif : ${reason})\n`;
        });
        const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://e-mariage.ci';
        customMessage += `\nVeuillez corriger et re-téléverser ces documents directement sur la plateforme (${siteUrl}) afin que l'examen puisse reprendre.`;
      } else {
        customMessage += `🎉 Félicitations, toutes vos pièces justificatives ont été validées avec succès ! Le dossier est désormais prêt pour l'étape suivante.`;
      }

      // Send the single unified WhatsApp notification
      await triggerSpouseNotifications(selectedDossier.id, 'documents_reviewed', { customMessage });

      addNotification("Audit des documents enregistré et notification groupée envoyée !", "success");
      logSystemAction(`Examen groupé des pièces justificatives terminé pour le dossier de ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name}`, 'success');

      // Refresh documents list
      const docs = await getDocuments(selectedDossier.id);
      setDossierDocs(docs);
      initializeCheckedAndReasons(docs, false);

      // Auto-select first unverified
      const firstUnverified = docs.find(d => d.status !== 'verified');
      if (firstUnverified) {
        handleSelectPreviewDoc(firstUnverified);
      }
    } catch (err) {
      console.error("Failed to save doc reviews:", err);
      addNotification("Erreur lors de l'enregistrement des validations.", "warning");
    } finally {
      setIsSavingReviews(false);
    }
  };

  // Advance workflow steps (Timeline)
  const handleUpdateTimelineStep = async (stepId: number, status: 'completed' | 'active' | 'upcoming', stepName: string) => {
    if (!selectedDossier) return;
    if (isLocked) {
      addNotification("Action refusée : le dossier est verrouillé en raison d'une suspicion de fraude par l'IA.", "warning");
      return;
    }

    const success = await updateTimelineStepInDb(selectedDossier.id, stepId, status);
    if (success) {
      // Notify citizen
      await addNotificationToDb({
        id: Math.random().toString(),
        text: `Mairie : L'étape "${stepName}" est désormais marquée comme ${status === 'completed' ? 'validée' : 'active'}.`,
        time: "À l'instant",
        type: 'info'
      }, selectedDossier.id);

      addNotification(`Étape "${stepName}" mise à jour en : ${status}`, 'success');
      logSystemAction(`Étape "${stepName}" mise à jour en : ${status} (Dossier: ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name})`, 'info');

      // Auto-update surrounding steps in DB if completed
      if (status === 'completed') {
        for (let i = 1; i < stepId; i++) {
          await updateTimelineStepInDb(selectedDossier.id, i, 'completed');
        }
      }
    }
  };

  // Update status of a civil opposition
  const handleUpdateOppositionStatus = async (oppId: string, status: 'validated' | 'dismissed') => {
    if (isLocked) {
      addNotification("Action refusée : le dossier est verrouillé en raison d'une suspicion de fraude par l'IA.", "warning");
      return;
    }
    try {
      const success = await updateOppositionStatus(oppId, status);
      if (success) {
        setOppositions(prev => prev.map(o => o.id === oppId ? { ...o, status } : o));
        addNotification(
          status === 'validated'
            ? "L'opposition a été confirmée. Ce dossier reste suspendu."
            : "L'opposition a été rejetée et levée. Le dossier est débloqué.",
          status === 'validated' ? "warning" : "success"
        );
        logSystemAction(
          `Opposition civile (${oppId}) mise à jour avec le statut : ${status} pour le dossier ${selectedDossier?.id}`,
          status === 'validated' ? 'warning' : 'success'
        );
      } else {
        addNotification("Erreur lors de la mise à jour de l'opposition", "warning");
      }
    } catch (err) {
      console.error(err);
      addNotification("Erreur de communication", "warning");
    }
  };

  // Confirm physical document check (Condition 2)
  const handleConfirmPhysicalVerification = async () => {
    if (!selectedDossier || isLocked) return;
    const success = await updateDossierPhysicalVerification(selectedDossier.id, true);
    if (success) {
      setSelectedDossier(prev => prev ? { ...prev, physical_verified: true } : null);
      setDossiers(prev => prev.map(d => d.id === selectedDossier.id ? { ...d, physical_verified: true } : d));
      addNotification("Contrôle physique des originaux validé !", "success");
      logSystemAction(`CONTRÔLE PHYSIQUE : Originaux présentés par ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name} vérifiés et validés par l'agent.`, 'success');
    }
  };

  // Confirm/record cash payment at the mairie (Condition 3)
  const handleRecordMairiePayment = async () => {
    if (!selectedDossier || isLocked) return;
    const amount = 50000;
    const currency = 'XOF';
    const ref = 'EMAR-REC-' + Math.floor(10000000 + Math.random() * 90000000);
    const payment: PaymentInfo = {
      id: `pay_${selectedDossier.id}_${Date.now()}`,
      dossierId: selectedDossier.id,
      amount: amount,
      currency: currency,
      status: 'success',
      reference: ref,
      method: 'Trésorerie Mairie (Physique)',
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      mairieId: selectedDossier.mairie_id || 'mairie_cocody'
    };
    
    const success = await recordPaymentInDb(payment);
    if (success) {
      setSelectedDossierPayment(payment);
      
      await addNotificationToDb({
        id: Math.random().toString(),
        text: "Mairie : Droits de timbre (50 000 XOF) enregistrés avec succès.",
        time: "À l'instant",
        type: 'success'
      }, selectedDossier.id);
      
      await triggerSpouseNotifications(selectedDossier.id, 'paid');
      
      addNotification("Paiement physique des droits enregistré !", "success");
      logSystemAction(`PAIEMENT ENREGISTRÉ : Droits de timbre fiscaux réglés par ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name}.`, 'success');
    }
  };

  // Mark dossier as Approved & Publish Bans
  const handlePublishBans = async () => {
    if (!selectedDossier) return;
    if (isLocked) {
      addNotification("Action refusée : le dossier est verrouillé en raison d'une suspicion de fraude par l'IA.", "warning");
      return;
    }
    const success = await publishDossierBans(selectedDossier.id);
    if (success) {
      const nowStr = new Date().toISOString();
      await addNotificationToDb({
        id: Math.random().toString(),
        text: "Mairie : Vos bans de mariage ont été officiellement publiés pour la période légale de 10 jours.",
        time: "À l'instant",
        type: 'success'
      }, selectedDossier.id);

      // Advance timeline to step 5 (Audition & Validation completed) and unlock 6 (Celebration active)
      await updateTimelineStepInDb(selectedDossier.id, 5, 'completed');
      await updateTimelineStepInDb(selectedDossier.id, 6, 'active');

      // Trigger simulated WhatsApp congratulations and confirmations
      await triggerSpouseNotifications(selectedDossier.id, 'approved', {
        weddingDate: selectedDossier.wedding_date || undefined,
        appointmentDate: selectedDossier.appointment_date || undefined
      });

      addNotification("Les bans ont été validés et publiés avec succès !", "success");
      logSystemAction(`BANS PUBLIÉS : Affichage réglementaire lancé pour l'union de ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name}.`, 'success');
      
      setSelectedDossier(prev => prev ? { ...prev, status: 'approved', bans_published_at: nowStr } : null);
      loadData();
    }
  };

  // Mark dossier as Celebrated
  const handleCelebrateDossier = async () => {
    if (!selectedDossier) return;
    if (isLocked) {
      addNotification("Action refusée : le dossier est verrouillé en raison d'une suspicion de fraude par l'IA.", "warning");
      return;
    }
    const success = await updateDossierStatus(selectedDossier.id, 'celebrated');
    if (success) {
      await addNotificationToDb({
        id: Math.random().toString(),
        text: "FÉLICITATIONS ! Votre mariage civil a été célébré à la Mairie. Tous nos vœux de bonheur !",
        time: "À l'instant",
        type: 'success'
      }, selectedDossier.id);

      // Set all timeline steps to completed
      for (let i = 1; i <= 6; i++) {
        await updateTimelineStepInDb(selectedDossier.id, i, 'completed');
      }

      await triggerSpouseNotifications(selectedDossier.id, 'celebrated');

      addNotification("Mariage célébré officiellement ! Vive les mariés !", "success");
      logSystemAction(`MARIAGE CÉLÉBRÉ : Union civile de ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name} célébrée à la mairie.`, 'success');
      setSelectedDossier(prev => prev ? { ...prev, status: 'celebrated' } : null);
      loadData();
    }
  };

  const handleConfirmPhysicalPayment = async () => {
    if (!selectedDossier) return;
    if (isLocked) {
      addNotification("Action refusée : le dossier est verrouillé en raison d'une suspicion de fraude par l'IA.", "warning");
      return;
    }
    const success = await updateDossierStatus(selectedDossier.id, 'celebrated');
    if (success) {
      const amount = 50000;
      const currency = 'XOF';
      const ref = 'EMAR-REC-' + Math.floor(10000000 + Math.random() * 90000000);
      const payment: PaymentInfo = {
        id: `pay_${selectedDossier.id}_${Date.now()}`,
        dossierId: selectedDossier.id,
        amount: amount,
        currency: currency,
        status: 'success',
        reference: ref,
        method: 'Trésorerie Mairie (Physique)',
        date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        mairieId: selectedDossier.mairie_id || 'mairie_cocody'
      };
      
      await recordPaymentInDb(payment);

      await addNotificationToDb({
        id: Math.random().toString(),
        text: "Mairie : Droits de timbre enregistrés ! Votre célébration est confirmée et validée à tout jamais.",
        time: "À l'instant",
        type: 'success'
      }, selectedDossier.id);

      for (let i = 1; i <= 6; i++) {
        await updateTimelineStepInDb(selectedDossier.id, i, 'completed');
      }

      await triggerSpouseNotifications(selectedDossier.id, 'celebrated');

      addNotification("Paiement physique enregistré et date de mariage confirmée !", "success");
      logSystemAction(`PAIEMENT PHYSIQUE ENREGISTRÉ : Union civile de ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name} confirmée définitivement par l'officier civil.`, 'success');
      setSelectedDossier(prev => prev ? { ...prev, status: 'celebrated' } : null);
      loadData();
    }
  };

  const handleRejectPhysicalDossier = async () => {
    if (!selectedDossier) return;
    if (isLocked) {
      addNotification("Action refusée : le dossier est verrouillé en raison d'une suspicion de fraude par l'IA.", "warning");
      return;
    }
    const reason = prompt("Veuillez saisir le motif du rejet (les pièces originales non conformes) :", "Les originaux physiques présentés ne sont pas conformes aux documents téléversés.");
    if (reason === null) return;

    const success = await updateDossierStatus(selectedDossier.id, 'rejected');
    if (success) {
      await updateDossierWeddingDate(selectedDossier.id, null);

      await addNotificationToDb({
        id: Math.random().toString(),
        text: `Mairie : Votre dossier a été rejeté. Motif : ${reason}. Le créneau réservé a été libéré.`,
        time: "À l'instant",
        type: 'warning'
      }, selectedDossier.id);

      await updateTimelineStepInDb(selectedDossier.id, 3, 'completed');
      await updateTimelineStepInDb(selectedDossier.id, 4, 'active');
      await updateTimelineStepInDb(selectedDossier.id, 5, 'upcoming');
      await updateTimelineStepInDb(selectedDossier.id, 6, 'upcoming');

      await triggerSpouseNotifications(selectedDossier.id, 'rejected', { reason });

      addNotification("Dossier rejeté et créneau libéré !", "info");
      logSystemAction(`REJET DOSSIER : Dossier de ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name} rejeté par l'officier civil (Motif: ${reason}). Créneau libéré.`, 'warning');
      setSelectedDossier(prev => prev ? { ...prev, status: 'rejected', wedding_date: null, slot_reserved_at: null } : null);
      loadData();
    }
  };

  const handleSimulateTime = async (dossierId: string, days: number) => {
    await handleSimulateTimeInternal(dossierId, days);
  };

  const handleSimulateTimeInternal = async (dossierId: string, days: number) => {
    await simulateTimePassage(dossierId, days);
    addNotification(`Passage du temps simulé à J+${days} pour le dossier.`, "success");
    await loadData();
    const dbDossiers = await getDossiers();
    const updatedDossier = dbDossiers.find(d => d.id === dossierId);
    if (updatedDossier) {
      setSelectedDossier(updatedDossier);
    } else {
      setSelectedDossier(null);
    }
  };

  const handleConfirmRdv = async (dossierId: string) => {
    try {
      const res = await confirmMairieAppointment(dossierId);
      if (res) {
        addNotification("Le rendez-vous physique et le dépôt de dossier ont été confirmés !", "success");
        loadData();
      } else {
        addNotification("Erreur lors de la confirmation du rendez-vous.", "warning");
      }
    } catch (err) {
      console.error(err);
      addNotification("Une erreur est survenue.", "warning");
    }
  };

  const handlePrintCaisseReceipt = async (dossierId: string) => {
    try {
      const res = await recordCaissePaymentInDb(dossierId);
      if (res) {
        addNotification("Le paiement en caisse a été enregistré !", "success");
        await loadData();
        setTimeout(() => {
          window.print();
        }, 150);
      } else {
        addNotification("Erreur lors de l'enregistrement du paiement.", "warning");
      }
    } catch (err) {
      console.error(err);
      addNotification("Une erreur est survenue.", "warning");
    }
  };

  // Planning settings database handlers
  const handleSaveRoomsSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateSystemParameters({
      frais_reservation_montant: paramReservationPrice,
      frais_timbre_montant: paramTimbrePrice,
      nombre_reprogrammations_limite: paramRescheduleLimit,
      quota_max_journalier: paramDailyWeddingLimit,
      quota_rdv_physiques_journalier: paramDailyPhysicalRdvLimit
    });
    if (success) {
      addNotification("Paramètres tarifaires et système enregistrés !", "success");
      loadData();
    } else {
      addNotification("Erreur lors de l'enregistrement des paramètres.", "warning");
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    if (editingRoomId) {
      const success = await updateSalle(editingRoomId, {
        nom: newRoomName,
        decalage_minutes: newRoomOffset
      });
      if (success) {
        addNotification("Salle d'union mise à jour !", "success");
        setEditingRoomId(null);
        setNewRoomName('');
        setNewRoomOffset(0);
        setNewRoomCapacity(5);
        loadData();
      } else {
        addNotification("Erreur de mise à jour de la salle.", "warning");
      }
    } else {
      const result = await addSalle({
        nom: newRoomName,
        decalage_minutes: newRoomOffset,
        duree_creneau_minutes: 45,
        heure_ouverture: '08:00',
        heure_fermeture: '17:00',
        ordre_affichage: roomsList.length + 1,
        active: true
      });
      if (result) {
        addNotification("Nouvelle salle d'union ajoutée !", "success");
        setNewRoomName('');
        setNewRoomOffset(0);
        setNewRoomCapacity(5);
        loadData();
      } else {
        addNotification("Erreur lors de l'ajout de la salle.", "warning");
      }
    }
  };

  const handleToggleRoomActive = async (roomId: string, currentActive: boolean) => {
    const success = await updateSalle(roomId, { active: !currentActive });
    if (success) {
      addNotification(`Salle ${!currentActive ? 'activée' : 'désactivée'} !`, "success");
      loadData();
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette salle de célébration ?")) return;
    const success = await deleteSalle(roomId);
    if (success) {
      addNotification("Salle de célébration supprimée !", "success");
      loadData();
    } else {
      addNotification("Erreur de suppression (salle possiblement liée à des réservations).", "warning");
    }
  };

  const handleBlockSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockRoomId || !blockDate || !blockTime) {
      addNotification("Veuillez renseigner tous les champs du blocage !", "warning");
      return;
    }
    const endHour = parseInt(blockTime.split(':')[0]) + 1;
    const result = await addCreneauBloque({
      salle_id: blockRoomId,
      date_creneau: blockDate,
      heure_debut: blockTime,
      heure_fin: `${String(endHour).padStart(2, '0')}:${blockTime.split(':')[1]}`
    });
    if (result) {
      addNotification("Créneau horaire bloqué avec succès !", "success");
      setBlockReason('Réunion Mairie');
      loadData();
    } else {
      addNotification("Erreur lors du blocage du créneau.", "warning");
    }
  };

  const handleDeleteBlockedSlot = async (id: string) => {
    const success = await deleteCreneauBloque(id);
    if (success) {
      addNotification("Créneau débloqué avec succès !", "success");
      loadData();
    }
  };

  const handleVerifyQrCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrVerificationInput.trim()) return;
    setQrVerifyStatus(null);
    // confirmMairieAppointment takes a dossierId — look it up by reference first
    const allD = await getDossiers();
    const matched = allD.find(d => d.frais_reservation_reference?.toLowerCase() === qrVerificationInput.trim().toLowerCase());
    if (!matched) {
      setQrVerifyStatus({ success: false, message: 'Aucun dossier trouvé avec cette référence de réservation.' });
      return;
    }
    const ok = await confirmMairieAppointment(matched.id);
    if (ok) {
      setQrVerifyStatus({
        success: true,
        message: `Rendez-vous validé ! Actes de ${matched.spouse1_name} & ${matched.spouse2_name} contrôlés physiquement.`
      });
      addNotification("Rendez-vous validé via QR Code !", "success");
      loadData();
    } else {
      setQrVerifyStatus({ success: false, message: 'Erreur lors de la validation du rendez-vous.' });
    }
  };

  // Handlers for Mairie local settings and Notes
  const handleSaveMairieSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMairie) return;

    if (activeMairieId === 'cocody_hotel_de_ville') {
      const p1 = mairies.find(m => m.id === 'cocody_salle_prestige');
      const p2 = mairies.find(m => m.id === 'cocody_salle_union');
      const promises: Promise<boolean>[] = [];
      
      if (p1) {
        promises.push(updateMairie({
          ...p1,
          phone: mairiePhone,
          officer_name: mairieOfficer,
          description: mairieDesc
        }));
      }
      if (p2) {
        promises.push(updateMairie({
          ...p2,
          phone: mairiePhone,
          officer_name: mairieOfficer,
          description: mairieDesc
        }));
      }

      const results = await Promise.all(promises);
      if (results.every(r => r)) {
        addNotification("Paramètres de l'Hôtel de Ville enregistrés.", "success");
        logSystemAction(`Mise à jour des paramètres de l'Hôtel de Ville (Salles Prestige & Union)`, 'success');
        loadData();
      } else {
        addNotification("Erreur lors de l'enregistrement des paramètres de l'Hôtel de Ville.", "warning");
      }
    } else {
      const updated: MairieInfo = {
        ...activeMairie,
        phone: mairiePhone,
        officer_name: mairieOfficer,
        description: mairieDesc
      };

      const success = await updateMairie(updated);
      if (success) {
        addNotification("Paramètres de la mairie enregistrés.", "success");
        logSystemAction(`Mise à jour des paramètres de la mairie: ${activeMairie.name}`, 'success');
        loadData();
      } else {
        addNotification("Erreur lors de l'enregistrement des paramètres.", "warning");
      }
    }
  };

  const handleTestWhatsapp = async () => {
    const targetPhone = prompt("Entrez le numéro de téléphone pour envoyer le message de test (format international sans +, ex: 2250779604919) :", "2250779604919");
    if (!targetPhone) return;

    setIsTestingWhatsapp(true);
    try {
      const config: PaystackConfig = {
        mode: paystackMode,
        publicKey: paystackPubKey,
        secretKey: paystackSecKey,
        currency: paystackCurrency,
        amount: paystackAmount,
        enableWave: paystackWave,
        enableOrange: paystackOrange,
        enableMtn: paystackMtn,
        enableMoov: paystackMoov,
        enableCard: paystackCard,
        enableEmailNotifs: enableEmailNotifs,
        enableWhatsappNotifs: enableWhatsappNotifs,
        emailApiKey: emailApiKey,
        emailSender: emailSender,
        whatsappToken: whatsappToken,
        whatsappPhoneId: whatsappPhoneId,
        whatsappServerUrl: whatsappServerUrl
      };

      const ok = await sendOpenwaWhatsapp(config, targetPhone, "Message de test E-Mariage : Votre connexion OpenWA est opérationnelle ! 🚀");
      if (ok) {
        addNotification("Message de test WhatsApp envoyé avec succès !", "success");
      } else {
        addNotification("Échec de l'envoi du message de test WhatsApp. Vérifiez la configuration.", "warning");
      }
    } catch (e) {
      console.error(e);
      addNotification("Erreur lors du test WhatsApp.", "warning");
    } finally {
      setIsTestingWhatsapp(false);
    }
  };

  const handleSavePaystackConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const config: PaystackConfig = {
      mode: paystackMode,
      publicKey: paystackPubKey,
      secretKey: paystackSecKey,
      currency: paystackCurrency,
      amount: paystackAmount,
      enableWave: paystackWave,
      enableOrange: paystackOrange,
      enableMtn: paystackMtn,
      enableMoov: paystackMoov,
      enableCard: paystackCard,
      enableEmailNotifs: enableEmailNotifs,
      enableWhatsappNotifs: enableWhatsappNotifs,
      emailApiKey: emailApiKey,
      emailSender: emailSender,
      whatsappToken: whatsappToken,
      whatsappPhoneId: whatsappPhoneId,
      whatsappServerUrl: whatsappServerUrl
    };

    const successPaystack = await savePaystackConfig(config);
    const successSys = await updateSystemParameters({
      frais_reservation_montant: paystackAmount,
      frais_timbre_montant: paramTimbrePrice
    });

    if (successPaystack && successSys) {
      addNotification(`Tarifs enregistrés : ${(paystackAmount || 2500).toLocaleString('fr-FR')} FCFA (Plateforme) / ${(paramTimbrePrice || 100000).toLocaleString('fr-FR')} FCFA (Caisse Mairie)`, "success");
      logSystemAction(`Super Admin a mis à jour les tarifs système (Plateforme: ${paystackAmount || 2500} F, Caisse Mairie: ${paramTimbrePrice || 100000} F)`, 'admin');
      loadData();
    } else {
      addNotification("Erreur lors de l'enregistrement de la configuration de paiement.", "warning");
    }
  };

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const config: AiConfig = {
      geminiKey: geminiKey.trim(),
      mistralKey: mistralKey.trim(),
      groqKey: groqKey.trim(),
      tavilyKey: tavilyKey.trim(),
      glmKey: glmKey.trim(),
      primaryOcrEngine: primaryOcrEngine,
      fastCheckEngine: fastCheckEngine,
      promptNemotronSafety: promptNemotronSafety,
      promptPrincipal: promptPrincipal,
      promptAntiDoublon: promptAntiDoublon,
      promptDoubleVerification: promptDoubleVerification,
      promptFaq: promptFaq,
      openRouterModel1: openRouterModel1.trim(),
      openRouterModel2: openRouterModel2.trim(),
      openRouterModel3: openRouterModel3.trim(),
      openRouterModel4: openRouterModel4.trim(),
      openRouterModelSafety: openRouterModelSafety.trim(),
      faceAPIKeyEpoux: faceAPIKeyEpoux.trim(),
      faceAPISecretEpoux: faceAPISecretEpoux.trim(),
      faceAPIKeyEpouse: faceAPIKeyEpouse.trim(),
      faceAPISecretEpouse: faceAPISecretEpouse.trim(),
      rdvDelayDays: rdvDelayDays,
      usePaddleOcr: usePaddleOcr,
      paddleOcrToken: paddleOcrToken.trim(),
      paddleOcrModel: paddleOcrModel.trim(),
      paddleOcrJobUrl: paddleOcrJobUrl.trim(),
      useDeepFace: useDeepFace,
      deepFaceApiUrl: deepFaceApiUrl.trim()
    };
    saveAiConfig(config);
    addNotification("Configuration de l'IA (GLM-OCR, Mistral, Script Interne, OpenRouter) enregistrée avec succès !", "success");
    logSystemAction("Super Admin a mis à jour les clés API et les paramètres du moteur d'IA", 'admin');
    loadData();
  };

  const handleTestAiConnectivities = async () => {
    setIsTestingAi(true);
    setAiTestResults({
      glm: { status: 'testing' },
      openRouter: { status: 'testing' },
      mistral: { status: 'testing' },
      groq: { status: 'testing' },
      mistralEmbed: { status: 'testing' },
      nemotronSafety: { status: 'testing' },
      tavily: { status: 'testing' },
      paddleOcr: { status: 'testing' },
      deepFace: { status: 'testing' }
    });

    // 0. Test GLM-OCR (Layout Parsing API: model "glm-ocr")
    let glmStatus: 'success' | 'failed' = 'success';
    let glmMsg = '';
    if (!glmKey.trim()) {
      glmStatus = 'failed';
      glmMsg = "Clé API GLM-OCR / Z.AI manquante.";
    } else {
      // Minimal valid JPEG (1×1px white) that passes Z.AI format check
      const sampleJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";
      const endpoints = [
        "https://api.z.ai/api/paas/v4/layout_parsing",
        "https://open.bigmodel.cn/api/paas/v4/layout_parsing"
      ];
      let testOk = false;

      for (const endpoint of endpoints) {
        try {
          const resp = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${glmKey.trim()}`
            },
            body: JSON.stringify({
              model: "glm-ocr",
              file: sampleJpeg
            })
          });

          if (resp.ok) {
            glmMsg = "Connexion GLM-OCR réussie ! (API layout_parsing : glm-ocr OK)";
            glmStatus = 'success';
            testOk = true;
            break;
          } else {
            const errText = await resp.text();
            // Error 1214 = format OK but image too small — API is reachable and key is valid
            if (errText.includes("1214") || errText.includes("OCR仅支持")) {
              glmMsg = "Clé GLM-OCR valide ✅ (API layout_parsing joignable — image de test trop petite, normal)";
              glmStatus = 'success';
              testOk = true;
              break;
            }
            glmMsg = `Code ${resp.status} : ${errText.slice(0, 120)}`;
          }
        } catch (e: any) {
          glmMsg = e.message || "Erreur réseau GLM-OCR.";
        }
      }

      if (!testOk && glmStatus !== 'success') {
        glmStatus = 'failed';
      }
    }
    setAiTestResults(prev => ({
      ...prev!,
      glm: { status: glmStatus, message: glmMsg }
    }));

    // 1. Test OpenRouter Models
    let openRouterStatus: 'success' | 'failed' = 'success';
    let openRouterMsg = '';
    let openRouterModels: { modele: string; statut: string; icone: string; message?: string }[] = [];

    if (!geminiKey.trim()) {
      openRouterStatus = 'failed';
      openRouterMsg = "Clé OpenRouter manquante.";
    } else {
      try {
        openRouterModels = await testerConnexionOpenRouter(geminiKey.trim());
        const allFailed = openRouterModels.every(m => m.statut.includes("ERREUR") || m.statut === "INACCESSIBLE" || m.statut === "CLÉ INVALIDE");
        if (allFailed) {
          openRouterStatus = 'failed';
          openRouterMsg = "Tous les modèles OpenRouter ont échoué.";
        } else {
          openRouterStatus = 'success';
          const successCount = openRouterModels.filter(m => m.statut === "CONNECTÉ").length;
          openRouterMsg = `${successCount}/${openRouterModels.length} modèles opérationnels.`;
        }
      } catch (e: any) {
        openRouterStatus = 'failed';
        openRouterMsg = e.message || "Erreur de test OpenRouter.";
      }
    }

    setAiTestResults(prev => ({
      ...prev!,
      openRouter: {
        status: openRouterStatus,
        models: openRouterModels,
        message: openRouterMsg
      }
    }));

    // 2. Test Mistral
    let mistralStatus: 'success' | 'failed' = 'success';
    let mistralMsg = '';
    if (!mistralKey.trim()) {
      mistralStatus = 'failed';
      mistralMsg = "Clé Mistral manquante.";
    } else {
      try {
        const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${mistralKey.trim()}`
          },
          body: JSON.stringify({
            model: "mistral-small-latest",
            messages: [{ role: "user", content: "Respond with the word OK." }]
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          const reply = data.choices?.[0]?.message?.content?.trim();
          if (reply) {
            mistralMsg = `Connexion réussie ! (Réponse : "${reply}")`;
          } else {
            mistralStatus = 'failed';
            mistralMsg = "Réponse vide de Mistral.";
          }
        } else {
          mistralStatus = 'failed';
          const err = await resp.text();
          mistralMsg = `Code ${resp.status} : ${err.slice(0, 100)}`;
        }
      } catch (e: any) {
        mistralStatus = 'failed';
        mistralMsg = e.message || "Erreur de connexion.";
      }
    }
    setAiTestResults(prev => ({
      ...prev!,
      mistral: { status: mistralStatus, message: mistralMsg }
    }));

    // 3. Test Groq
    let groqStatus: 'success' | 'failed' = 'success';
    let groqMsg = '';
    if (!groqKey.trim()) {
      groqStatus = 'failed';
      groqMsg = "Clé Groq manquante.";
    } else {
      try {
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey.trim()}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Respond with the word OK." }]
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          const reply = data.choices?.[0]?.message?.content?.trim();
          if (reply) {
            groqMsg = `Connexion réussie ! (Réponse : "${reply}")`;
          } else {
            groqStatus = 'failed';
            groqMsg = "Réponse vide de Groq.";
          }
        } else {
          groqStatus = 'failed';
          const err = await resp.text();
          groqMsg = `Code ${resp.status} : ${err.slice(0, 100)}`;
        }
      } catch (e: any) {
        groqStatus = 'failed';
        groqMsg = e.message || "Erreur de connexion.";
      }
    }
    setAiTestResults(prev => ({
      ...prev!,
      groq: { status: groqStatus, message: groqMsg }
    }));

    // 4. Test Mistral Embed
    let mistralEmbedStatus: 'success' | 'failed' = 'success';
    let mistralEmbedMsg = '';
    try {
      const res = await testerConnexionMistralEmbed(mistralKey.trim());
      mistralEmbedStatus = res.status;
      mistralEmbedMsg = res.message || '';
    } catch (e: any) {
      mistralEmbedStatus = 'failed';
      mistralEmbedMsg = e.message || "Erreur de connexion.";
    }
    setAiTestResults(prev => ({
      ...prev!,
      mistralEmbed: { status: mistralEmbedStatus, message: mistralEmbedMsg }
    }));

    // 5. Test Nemotron Safety
    let nemotronSafetyStatus: 'success' | 'failed' | 'warning' = 'success';
    let nemotronSafetyMsg = '';
    try {
      const res = await testerConnexionNemotronSafety(geminiKey.trim());
      nemotronSafetyStatus = res.status;
      nemotronSafetyMsg = res.message || '';
    } catch (e: any) {
      nemotronSafetyStatus = 'failed';
      nemotronSafetyMsg = e.message || "Erreur de connexion.";
    }
    setAiTestResults(prev => ({
      ...prev!,
      nemotronSafety: { status: nemotronSafetyStatus, message: nemotronSafetyMsg }
    }));

    // 6. Test Tavily
    let tavilyStatus: 'success' | 'failed' = 'success';
    let tavilyMsg = '';
    try {
      const res = await testerConnexionTavily(tavilyKey.trim());
      tavilyStatus = res.status;
      tavilyMsg = res.message || '';
    } catch (e: any) {
      tavilyStatus = 'failed';
      tavilyMsg = e.message || "Erreur de connexion.";
    }
    setAiTestResults(prev => ({
      ...prev!,
      tavily: { status: tavilyStatus, message: tavilyMsg }
    }));

    // 7. Test PaddleOCR-VL-1.6
    let paddleOcrStatus: 'success' | 'failed' = 'success';
    let paddleOcrMsg = '';
    try {
      const res = await testerConnexionPaddleOcr(paddleOcrToken.trim(), paddleOcrJobUrl.trim());
      paddleOcrStatus = res.status;
      paddleOcrMsg = res.message || '';
    } catch (e: any) {
      paddleOcrStatus = 'failed';
      paddleOcrMsg = e.message || "Erreur de connexion.";
    }
    setAiTestResults(prev => ({
      ...prev!,
      paddleOcr: { status: paddleOcrStatus, message: paddleOcrMsg }
    }));

    // 8. Test DeepFace Biometrics & Liveness
    let deepFaceStatus: 'success' | 'failed' = 'success';
    let deepFaceMsg = '';
    try {
      const res = await testerConnexionDeepFace(deepFaceApiUrl.trim() || 'http://r8dqp05xpng1xidux3r4bu77.193.29.187.66.sslip.io');
      deepFaceStatus = res.status;
      deepFaceMsg = res.message || '';
    } catch (e: any) {
      deepFaceStatus = 'failed';
      deepFaceMsg = e.message || "Erreur de connexion.";
    }
    setAiTestResults(prev => ({
      ...prev!,
      deepFace: { status: deepFaceStatus, message: deepFaceMsg }
    }));

    setIsTestingAi(false);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedDossier) return;
    if (isLocked) {
      addNotification("Action refusée : le dossier est verrouillé en raison d'une suspicion de fraude par l'IA.", "warning");
      return;
    }

    const newNote = {
      id: `note_${selectedDossier.id}_${Date.now()}`,
      text: newNoteText.trim(),
      date: new Date().toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    const updated = [newNote, ...notesList];
    setNotesList(updated);
    // Persist to DB
    addDossierNote(selectedDossier.id, newNote.text, newNote.date).catch(err =>
      console.warn('Failed to persist note to DB:', err)
    );
    setNewNoteText('');
    addNotification("Note interne ajoutée.", "info");
    logSystemAction(`Note administrative ajoutée au dossier ${selectedDossier.id.toUpperCase().replace('DOSSIER_', '')}`, 'info');
  };

  const handleDeleteNote = (noteId: string) => {
    if (!selectedDossier) return;
    if (isLocked) {
      addNotification("Action refusée : le dossier est verrouillé en raison d'une suspicion de fraude par l'IA.", "warning");
      return;
    }
    const updated = notesList.filter(n => n.id !== noteId);
    setNotesList(updated);
    // Persist to DB
    deleteDossierNote(noteId).catch(err =>
      console.warn('Failed to delete note from DB:', err)
    );
    addNotification("Note interne supprimée.", "info");
  };

  // Super Admin actions on dossiers (Bypass status & deletion)
  const handleBypassDossierStatus = async (id: string, newStatus: any, name1: string, name2: string) => {
    const success = await updateDossierStatus(id, newStatus);
    if (success) {
      addNotification(`Statut du dossier de ${name1} & ${name2} forcé à : ${newStatus}`, 'success');
      logSystemAction(`Super Admin a bypassé le statut du dossier (${name1} & ${name2}) à : ${newStatus}`, 'admin');

      // Auto-update timeline steps in DB for interactive feedback
      if (newStatus === 'celebrated') {
        for (let i = 1; i <= 6; i++) {
          await updateTimelineStepInDb(id, i, 'completed');
        }
        await triggerSpouseNotifications(id, 'celebrated');
      } else if (newStatus === 'approved') {
        await updateTimelineStepInDb(id, 5, 'completed');
        await updateTimelineStepInDb(id, 6, 'active');
        await triggerSpouseNotifications(id, 'payment_required');
      } else {
        await updateTimelineStepInDb(id, 5, 'active');
        await updateTimelineStepInDb(id, 6, 'upcoming');
      }

      loadData();
    }
  };

  const handleDeleteDossier = async (id: string, name1: string, name2: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le dossier de mariage de ${name1} & ${name2} ?`)) {
      return;
    }

    // Optimistic update: remove immediately from UI so the dossier doesn't
    // reappear if loadData() re-fetches from Supabase before propagation.
    setDossiers(prev => prev.filter(d => d.id !== id));
    if (selectedDossier?.id === id) {
      setSelectedDossier(null);
    }

    const success = await deleteDossier(id);
    if (success) {
      addNotification(`Dossier de ${name1} & ${name2} supprimé.`, 'info');
      logSystemAction(`Super Admin a supprimé le dossier : ${name1} & ${name2} (Code: ${id})`, 'warning');
      // Reload in background to resync with Supabase without blocking the UI
      loadData();
    } else {
      // Rollback: the dossier wasn't actually deleted, bring it back
      addNotification("Erreur lors de la suppression du dossier.", "warning");
      loadData();
    }
  };

  const handleDeletePayment = async (id: string, reference: string, amount: number) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement cette transaction de ${amount.toLocaleString()} XOF (Réf: ${reference}) ?`)) {
      return;
    }

    setAllPayments(prev => prev.filter(p => p.id !== id));

    const success = await deletePaymentInDb(id);
    if (success) {
      addNotification(`Transaction ${reference} supprimée avec succès.`, 'info');
      logSystemAction(`Super Admin a supprimé la transaction financière : ${reference} (Montant: ${amount} XOF)`, 'warning');
      loadData();
    } else {
      addNotification("Erreur lors de la suppression de la transaction.", "warning");
      loadData();
    }
  };

  const parseWeddingDate = (weddingDateStr: string | null): Date | null => {
    if (!weddingDateStr) return null;
    try {
      const months: { [key: string]: number } = {
        janvier: 0, fevrier: 1, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
        juillet: 6, aout: 7, août: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11, décembre: 11
      };

      const cleaned = weddingDateStr.toLowerCase().trim();

      // Match year (e.g. 2026)
      const yearMatch = cleaned.match(/\b(20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

      // Match day (e.g. 15)
      const dayMatch = cleaned.match(/\b(\d{1,2})\b/);
      if (!dayMatch) return null;
      const day = parseInt(dayMatch[1]);

      // Match month
      let month = 0;
      let foundMonth = false;
      for (const [mName, mIdx] of Object.entries(months)) {
        if (cleaned.includes(mName)) {
          month = mIdx;
          foundMonth = true;
          break;
        }
      }

      if (!foundMonth) return null;

      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch (e) {
      return null;
    }
  };

  const isDossierMatchingDateFilter = (
    weddingDateStr: string | null,
    filterType: 'all' | 'today' | 'week' | 'month' | 'custom',
    customStart: string,
    customEnd: string
  ): boolean => {
    if (filterType === 'all') return true;

    const parsedDate = parseWeddingDate(weddingDateStr);
    if (!parsedDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterType === 'today') {
      return (
        parsedDate.getFullYear() === today.getFullYear() &&
        parsedDate.getMonth() === today.getMonth() &&
        parsedDate.getDate() === today.getDate()
      );
    }

    if (filterType === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(today);
      startOfWeek.setDate(diff);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return parsedDate >= startOfWeek && parsedDate <= endOfWeek;
    }

    if (filterType === 'month') {
      return (
        parsedDate.getFullYear() === today.getFullYear() &&
        parsedDate.getMonth() === today.getMonth()
      );
    }

    if (filterType === 'custom') {
      if (customStart) {
        const start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        if (parsedDate < start) return false;
      }
      if (customEnd) {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        if (parsedDate > end) return false;
      }
      return true;
    }

    return true;
  };

  // Helper calculations
  const activeMairie = activeMairieId === 'cocody_hotel_de_ville' ? {
    id: 'cocody_hotel_de_ville',
    name: "Hôtel de Ville (Salle Prestige & Salle de l'Union)",
    region: "Cocody central",
    access_code: 'COCODY2026',
    is_active: true,
    phone: '+225 27 22 44 88 00',
    description: "Célébrations à l'Hôtel de Ville principal (Salle Prestige et Salle de l'Union).",
    officer_name: 'M. Jean-Marc Koffi / Mme Awa Diomandé'
  } : (mairies.find(m => m.id === activeMairieId) || mairies[0]);

  const isCentralMairie = activeMairieId === 'cocody_hotel_de_ville' || activeMairieId === 'cocody_salle_prestige' || activeMairieId === 'cocody_salle_union';

  const dropdownMairies = React.useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const hasCentralRooms = mairies.some(m => (m.id === 'cocody_salle_prestige' || m.id === 'cocody_salle_union') && m.is_active);
    if (hasCentralRooms) {
      list.push({
        id: 'cocody_hotel_de_ville',
        name: "Hôtel de Ville (Salle Prestige & Salle de l'Union)"
      });
    }
    mairies.filter(m => m.is_active && m.id !== 'cocody_salle_prestige' && m.id !== 'cocody_salle_union').forEach(m => {
      list.push({
        id: m.id,
        name: m.name
      });
    });
    return list;
  }, [mairies]);

  const filteredDossiers = dossiers.filter(d => {
    if (isCentralMairie) {
      const isCentral = d.mairie_id === 'cocody_salle_prestige' || d.mairie_id === 'cocody_salle_union';
      if (!isCentral) return false;
      if (selectedRoomFilter !== 'all' && d.mairie_id !== selectedRoomFilter) return false;
      return true;
    }
    return d.mairie_id === activeMairieId;
  });

  // Mairie search & status filter
  const mairieFilteredDossiers = dossiers.filter(d => {
    if (isCentralMairie) {
      const isCentral = d.mairie_id === 'cocody_salle_prestige' || d.mairie_id === 'cocody_salle_union';
      if (!isCentral) return false;
      if (selectedRoomFilter !== 'all' && d.mairie_id !== selectedRoomFilter) return false;
    } else {
      if (d.mairie_id !== activeMairieId) return false;
    }

    const matchesSearch =
      d.id.toLowerCase().includes(mairieSearchText.toLowerCase()) ||
      d.spouse1_name.toLowerCase().includes(mairieSearchText.toLowerCase()) ||
      d.spouse2_name.toLowerCase().includes(mairieSearchText.toLowerCase());

    const matchesStatus = mairieStatusFilter === 'all'
      ? true
      : mairieStatusFilter === 'under_review'
        ? (d.status !== 'approved' && d.status !== 'celebrated' && d.status !== 'rejected')
        : d.status === mairieStatusFilter;

    const matchesDate = isDossierMatchingDateFilter(
      d.wedding_date,
      mairieDateFilterType,
      mairieStartDate,
      mairieEndDate
    );

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Dynamic Checklist & Approval Validation
  const allRequiredDocsVerified = dossierDocs.length > 0 && dossierDocs
    .filter(d => d.category === 'spouses' || d.category === 'witnesses')
    .every(d => d.status === 'verified');

  const doc7Present = dossierDocs.some(d => d.id === 'doc7' && d.status !== 'pending');
  const doc8Present = dossierDocs.some(d => d.id === 'doc8' && d.status !== 'pending');
  const doc7Verified = dossierDocs.some(d => d.id === 'doc7' && d.status === 'verified');
  const doc8Verified = dossierDocs.some(d => d.id === 'doc8' && d.status === 'verified');

  const isDateSet = !!selectedDossier?.wedding_date;
  const isAppointmentSet = !!selectedDossier?.appointment_date;

  const hasActiveOpposition = oppositions.some(o => o.status === 'pending' || o.status === 'validated');
  const canApprove = allRequiredDocsVerified && isDateSet && isAppointmentSet && !hasActiveOpposition;
  const isDossierSuspect = dossierDocs.some(doc => doc.aiAnalysis?.action_recommandee === 'REJETER');
  const isLocked = isDossierSuspect && currentRole === 'mairie' && !selectedDossier?.mairie_exam_unlocked;

  // Note: Selected dossier data and opposition loading handled by main useEffect

  // Preset time slots & format helper based on room/mairie time offset
  const getTimeSlotsForRoomOrMairie = (roomIdOrMairieId?: string): string[] => {
    if (roomIdOrMairieId === 'cocody_salle_union') {
      // 15-minute offset schedule (starts at 08:15)
      return ["08:15", "08:45", "09:15", "09:45", "10:15", "10:45", "11:15", "11:45", "12:15", "12:45", "13:15", "13:45", "14:15", "14:45", "15:15"];
    }
    if (roomIdOrMairieId === 'cocody_salle_prestige' || roomIdOrMairieId === 'cocody_salle_annexe') {
      // 30-minute offset schedule (starts at 08:30)
      return ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00"];
    }
    // Default / All: Combine standard 15-min and 30-min room offset schedules
    return [
      "08:15", "08:30", "08:45", "09:00", "09:15", "09:30", "09:45", "10:00",
      "10:15", "10:30", "10:45", "11:00", "11:15", "11:30", "11:45", "12:00",
      "12:15", "12:30", "12:45", "13:00", "13:15", "13:30", "13:45", "14:00",
      "14:15", "14:30", "14:45", "15:00", "15:15"
    ];
  };

  const timeSlots = getTimeSlotsForRoomOrMairie();
  const formatWeddingDate = (dateStr: string, timeStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = date.toLocaleDateString('fr-FR', options);
    return `${formattedDate} à ${timeStr.replace(':', 'h')}`;
  };

  // Mairie Metrics
  const mairieDossiersCount = filteredDossiers.length;
  const pendingReviewCount = filteredDossiers.filter(d => d.status !== 'approved' && d.status !== 'celebrated' && d.status !== 'rejected').length;
  const approvedDossiersCount = filteredDossiers.filter(d => d.status === 'approved').length;
  const celebratedDossiersCount = filteredDossiers.filter(d => d.status === 'celebrated').length;

  // Super Admin National Dossiers filtration
  const nationalFilteredDossiers = dossiers.filter(d => {
    const matchesSearch =
      d.id.toLowerCase().includes(dossierSearchText.toLowerCase()) ||
      d.spouse1_name.toLowerCase().includes(dossierSearchText.toLowerCase()) ||
      d.spouse2_name.toLowerCase().includes(dossierSearchText.toLowerCase());

    const matchesMairie = dossierMairieFilter === 'all' || d.mairie_id === dossierMairieFilter;
    const matchesStatus = dossierStatusFilter === 'all'
      ? true
      : dossierStatusFilter === 'under_review'
        ? (d.status !== 'approved' && d.status !== 'celebrated' && d.status !== 'rejected')
        : d.status === dossierStatusFilter;

    const matchesDate = isDossierMatchingDateFilter(
      d.wedding_date,
      superadminDateFilterType,
      superadminStartDate,
      superadminEndDate
    );

    return matchesSearch && matchesMairie && matchesStatus && matchesDate;
  });

  const [logsSearch, setLogsSearch] = useState('');
  const [logsFilterType, setLogsFilterType] = useState<'all' | 'info' | 'success' | 'warning' | 'admin'>('all');

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentEmail.trim() || !newAgentPassword.trim()) {
      addNotification("Veuillez remplir tous les champs de l'agent.", "warning");
      return;
    }
    setIsAddingAgent(true);
    const success = await createMairieAgent({
      mairie_id: activeMairieId,
      name: newAgentName.trim(),
      email: newAgentEmail.trim().toLowerCase(),
      password: newAgentPassword,
      role: 'agent',
      is_active: true
    });
    setIsAddingAgent(false);
    if (success) {
      addNotification("Agent créé avec succès !", "success");
      logSystemAction(`Superviseur a créé le compte de l'agent : ${newAgentName.trim()}`, "success");
      setNewAgentName('');
      setNewAgentEmail('');
      setNewAgentPassword('');
      loadMairieAgents();
    } else {
      addNotification("Erreur lors de la création de l'agent (l'email est peut-être déjà utilisé).", "warning");
    }
  };

  const handleToggleAgent = async (agentId: string, currentActive: boolean, name: string) => {
    const success = await toggleMairieAgentActive(agentId, !currentActive);
    if (success) {
      addNotification(`L'agent ${name} a été ${!currentActive ? 'activé' : 'désactivé'}.`, "info");
      logSystemAction(`Superviseur a ${!currentActive ? 'activé' : 'désactivé'} le compte de l'agent : ${name}`, "info");
      loadMairieAgents();
    } else {
      addNotification("Erreur lors de la mise à jour du statut de l'agent.", "warning");
    }
  };

  const handleDeleteAgent = async (agentId: string, name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'agent "${name}" ?`)) {
      return;
    }
    const success = await deleteMairieAgent(agentId);
    if (success) {
      addNotification(`L'agent ${name} a été supprimé.`, "info");
      logSystemAction(`Superviseur a supprimé le compte de l'agent : ${name}`, "warning");
      loadMairieAgents();
    } else {
      addNotification("Erreur lors de la suppression de l'agent.", "warning");
    }
  };

  const renderMairieAgentsView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left font-sans animate-fade-in w-full">
        {/* Left Form: Add Agent */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 border border-neutral-200/50 shadow flex flex-col gap-5 bg-white">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Nouvel Agent Instructeur
            </h3>
            <p className="text-slate-500 text-[11px] mt-1">
              Raccordez un nouvel officier d'état civil pour instruire les dossiers de Cocody.
            </p>
          </div>

          <form onSubmit={handleAddAgent} className="flex flex-col gap-4 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-700">Nom Complet</label>
              <input
                type="text"
                required
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="Ex: Kouamé Koffi Albert"
                className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-700">Adresse E-mail Professionnelle</label>
              <input
                type="email"
                required
                value={newAgentEmail}
                onChange={(e) => setNewAgentEmail(e.target.value)}
                placeholder="Ex: albert.kouame@mairie.ci"
                className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-700">Mot de passe temporaire</label>
              <input
                type="text"
                required
                value={newAgentPassword}
                onChange={(e) => setNewAgentPassword(e.target.value)}
                placeholder="Ex: AGENTCOCODY2026"
                className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isAddingAgent}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-container shadow-md shadow-primary/10 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isAddingAgent ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Création en cours...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Enregistrer l'agent</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right List: Agents Directory */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-neutral-200/50 shadow flex flex-col gap-5 bg-white">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Répertoire des Agents de Cocody
            </h3>
            <p className="text-slate-500 text-[11px] mt-1">
              Liste des comptes actifs autorisés à traiter et valider les dossiers d'état civil.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Nom</th>
                  <th className="py-3 px-4">Email / Identifiant</th>
                  <th className="py-3 px-4">Rôle</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 font-medium">
                {mairieAgents.length > 0 ? (
                  mairieAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-800">{agent.name}</td>
                      <td className="py-4 px-4 text-slate-600 font-mono text-[11px]">{agent.email}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                          agent.role === 'supervisor' 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {agent.role === 'supervisor' ? 'Superviseur' : 'Agent'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          agent.is_active 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${agent.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {agent.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleAgent(agent.id, agent.is_active, agent.name)}
                            disabled={agent.role === 'supervisor'}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              agent.is_active 
                                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200' 
                                : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                            title={agent.is_active ? "Désactiver le compte" : "Activer le compte"}
                          >
                            {agent.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteAgent(agent.id, agent.name)}
                            disabled={agent.role === 'supervisor'}
                            className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Supprimer l'agent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      Aucun agent d'état civil raccordé pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderMairieLogsView = () => {
    // Filter activity logs
    const filteredLogs = activityLogs.filter(log => {
      const matchesSearch = log.message.toLowerCase().includes(logsSearch.toLowerCase());
      const matchesType = logsFilterType === 'all' || log.type === logsFilterType;
      return matchesSearch && matchesType;
    });

    return (
      <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6 text-left font-sans bg-white border border-neutral-200/50 shadow w-full animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-150 pb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Registre d'Audit Civil &amp; Traçabilité
            </h3>
            <p className="text-slate-500 text-[11px] mt-1">
              Consultez l'historique complet des validations, rejets, modifications et actions de sécurité.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center text-xs">
          <div className="relative flex items-center w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={logsSearch}
              onChange={(e) => setLogsSearch(e.target.value)}
              placeholder="Rechercher une action, un dossier, un agent..."
              className="w-full border border-neutral-300 rounded-xl pl-9 pr-4 py-2 bg-slate-50 focus:bg-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {(['all', 'info', 'success', 'warning', 'admin'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setLogsFilterType(t)}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  logsFilterType === t
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'bg-white border-neutral-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t === 'all' ? 'Tous' :
                 t === 'info' ? 'Info' :
                 t === 'success' ? 'Succès' :
                 t === 'warning' ? 'Avertissement' : 'Sécurité'}
              </button>
            ))}
          </div>
        </div>

        {/* Logs table */}
        <div className="overflow-x-auto">
          <div className="bg-slate-950 text-slate-100 font-mono text-[11px] p-4 rounded-xl max-h-[480px] overflow-y-auto space-y-2.5 shadow-inner">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                let badgeColor = 'text-sky-400';
                if (log.type === 'success') badgeColor = 'text-emerald-400';
                if (log.type === 'warning') badgeColor = 'text-rose-400';
                if (log.type === 'admin') badgeColor = 'text-purple-400';
                
                return (
                  <div key={log.id} className="flex items-start gap-3 border-b border-slate-900/60 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={`${badgeColor} shrink-0 select-none font-bold tracking-wider`}>
                      [{log.type.toUpperCase()}]
                    </span>
                    <span className="text-slate-200 flex-grow leading-relaxed">{log.message}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-500 italic text-center py-8">
                Aucun log d'activité ne correspond à vos critères de recherche.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMairieFinanceView = () => {
    const mairiePayments = allPayments.filter(p => p.mairieId === activeMairieId && p.status === 'success');
    const paidCount = dossiers.filter(d => d.mairie_id === activeMairieId && d.frais_timbre_paye === true).length;
    const totalCollected = paidCount * (paramTimbrePrice || 100000);
    const pendingCount = dossiers.filter(d => d.mairie_id === activeMairieId && d.frais_timbre_paye !== true).length;

    const openReceipt = (pay: PaymentInfo) => {
      const matchedDossier = dossiers.find(d => d.id === pay.dossierId);
      setSelectedReceiptDossierId(pay.dossierId);
      setReceiptSpouse1(matchedDossier?.spouse1_name || 'Époux 1');
      setReceiptSpouse2(matchedDossier?.spouse2_name || 'Époux 2');
      setReceiptWeddingDate(matchedDossier?.wedding_date || null);
      
      const matchedMairie = mairies.find(m => m.id === pay.mairieId);
      setReceiptMairieName(matchedMairie?.name || 'Cocody');
    };

    return (
      <div className="flex flex-col gap-6 text-left font-sans">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-amber-500/20 shadow flex items-center gap-4 bg-white/55 backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Recettes Communales</span>
              <span className="text-xl font-bold text-slate-800">{totalCollected.toLocaleString()} XOF</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-emerald-500/20 shadow flex items-center gap-4 bg-white/55 backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Quittances Validées</span>
              <span className="text-xl font-bold text-slate-800">{paidCount} Dossiers</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-sky-500/20 shadow flex items-center gap-4 bg-white/55 backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">En Attente de Paiement</span>
              <span className="text-xl font-bold text-slate-800">{pendingCount} Dossiers</span>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-4 bg-white/70 backdrop-blur-lg">
          <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
            <h3 className="font-serif text-lg font-bold text-slate-800">Registre des Taxes Municipales (Mariages)</h3>
          </div>

          {mairiePayments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Aucun paiement enregistré pour cette commune actuellement.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-sans border-collapse">
                <thead>
                  <tr className="border-b border-neutral-150 text-slate-400 uppercase text-[9px] font-bold text-left bg-slate-50/50">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Futurs Époux</th>
                    <th className="py-3 px-3">Référence</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3">Montant</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mairiePayments.map(pay => {
                    const matchedDossier = dossiers.find(d => d.id === pay.dossierId);
                    const couple = matchedDossier
                      ? `${matchedDossier.spouse1_name} & ${matchedDossier.spouse2_name}`
                      : 'Couple inconnu';
                    return (
                      <tr key={pay.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="py-3 px-3 text-slate-500">{new Date(pay.date).toLocaleDateString('fr-FR')}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{couple}</td>
                        <td className="py-3 px-3 font-mono text-slate-550">{pay.reference}</td>
                        <td className="py-3 px-3 text-slate-600">{pay.method}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{pay.amount.toLocaleString()} XOF</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => openReceipt(pay)}
                            className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded font-bold cursor-pointer transition-colors shadow-sm text-[11px]"
                          >
                            Quittance
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSuperadminFinanceView = () => {
    const successfulPayments = allPayments.filter(p => p.status === 'success');
    const countPlatform = dossiers.filter(d => d.frais_reservation_paye === true).length;
    const totalPlatform = countPlatform * (paystackAmount || 2500);

    const countCaisse = dossiers.filter(d => d.frais_timbre_paye === true).length;
    const totalCaisse = countCaisse * (paramTimbrePrice || 100000);

    const totalCollectedGlobal = totalPlatform + totalCaisse;
    const totalTransactions = countPlatform + countCaisse;
    const averageTicket = totalTransactions > 0 ? Math.round(totalCollectedGlobal / totalTransactions) : 0;

    const openReceipt = (pay: PaymentInfo) => {
      const matchedDossier = dossiers.find(d => d.id === pay.dossierId);
      setSelectedReceiptDossierId(pay.dossierId);
      setReceiptSpouse1(matchedDossier?.spouse1_name || 'Époux 1');
      setReceiptSpouse2(matchedDossier?.spouse2_name || 'Époux 2');
      setReceiptWeddingDate(matchedDossier?.wedding_date || null);
      
      const matchedMairie = mairies.find(m => m.id === pay.mairieId);
      setReceiptMairieName(matchedMairie?.name || 'Cocody');
    };

    // Calculate revenue per Mairie
    const mairiesData = mairies.map(m => {
      const mDossiers = dossiers.filter(d => d.mairie_id === m.id);
      const platformCount = mDossiers.filter(d => d.frais_reservation_paye === true).length;
      const platformRec = platformCount * (paystackAmount || 2500);
      const caisseCount = mDossiers.filter(d => d.frais_timbre_paye === true).length;
      const caisseRec = caisseCount * (paramTimbrePrice || 100000);
      const total = platformRec + caisseRec;
      return {
        name: m.name,
        platformRec,
        caisseRec,
        total,
        platformCount,
        caisseCount
      };
    }).sort((a, b) => b.total - a.total);

    const maxMairieAmount = Math.max(...mairiesData.map(d => d.total), 1);

    // Calculate payment methods distribution
    const methodCounts: { [key: string]: number } = {
      Wave: 0, Orange: 0, MTN: 0, Moov: 0, Card: 0, Paystack: 0
    };
    successfulPayments.forEach(p => {
      const m = p.method.toLowerCase();
      if (m.includes('wave')) methodCounts.Wave++;
      else if (m.includes('orange')) methodCounts.Orange++;
      else if (m.includes('mtn')) methodCounts.MTN++;
      else if (m.includes('moov')) methodCounts.Moov++;
      else if (m.includes('card') || m.includes('carte') || p.method.includes('Card')) methodCounts.Card++;
      else methodCounts.Paystack++;
    });

    const totalMethods = Math.max(Object.values(methodCounts).reduce((a, b) => a + b, 0), 1);

    return (
      <div className="flex flex-col gap-8 text-left font-sans mt-4">
        {/* Metric Cards - 4 distinct categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="glass-card rounded-2xl p-5 border border-blue-500/20 shadow-sm flex items-center gap-4 bg-white/70 backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Frais en Ligne (Plateforme)</span>
              <span className="text-lg font-bold text-blue-700">{totalPlatform.toLocaleString()} XOF</span>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{countPlatform} dossier(s) réglé(s) (2 500 F)</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 shadow-sm flex items-center gap-4 bg-white/70 backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Droits de Mariage (Mairie)</span>
              <span className="text-lg font-bold text-emerald-700">{totalCaisse.toLocaleString()} XOF</span>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{countCaisse} quittance(s) municipale(s)</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-amber-500/20 shadow-sm flex items-center gap-4 bg-white/70 backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Recettes Globales Cumulées</span>
              <span className="text-lg font-bold text-amber-700">{totalCollectedGlobal.toLocaleString()} XOF</span>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">En Ligne + Droits Mairie</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-violet-500/20 shadow-sm flex items-center gap-4 bg-white/70 backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-200 shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Volume de Quittances</span>
              <span className="text-lg font-bold text-violet-700">{totalTransactions} Transactions</span>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Panier Moyen: {averageTicket.toLocaleString()} XOF</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Revenue per Mairie */}
          <div className="glass-card rounded-2xl p-6 border border-neutral-100 flex flex-col gap-4 shadow-sm bg-white/60">
            <h4 className="font-serif text-sm font-bold text-slate-800 border-b border-neutral-100 pb-2">Ventilation des Recettes par Mairie</h4>
            <div className="flex flex-col gap-4 mt-2">
              {mairiesData.map((m, idx) => {
                const percent = Math.round((m.total / maxMairieAmount) * 100);
                return (
                  <div key={idx} className="flex flex-col gap-1.5 text-xs bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{m.name}</span>
                      <span>Total: {m.total.toLocaleString()} XOF</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium mt-0.5">
                      <span className="text-blue-600">💳 En ligne: {m.platformRec.toLocaleString()} F ({m.platformCount})</span>
                      <span className="text-emerald-600">🏛️ Droits Mairie: {m.caisseRec.toLocaleString()} F ({m.caisseCount})</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex mt-1">
                      {m.total > 0 ? (
                        <>
                          <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${Math.round((m.platformRec / m.total) * percent)}%` }}
                            title={`Frais en ligne: ${m.platformRec.toLocaleString()} XOF`}
                          />
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${Math.round((m.caisseRec / m.total) * percent)}%` }}
                            title={`Droits Mairie: ${m.caisseRec.toLocaleString()} XOF`}
                          />
                        </>
                      ) : (
                        <div className="h-full bg-slate-200 w-full" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="glass-card rounded-2xl p-6 border border-neutral-100 flex flex-col gap-4 shadow-sm bg-white/60">
            <h4 className="font-serif text-sm font-bold text-slate-800 border-b border-neutral-100 pb-2">Canaux de Paiement Utilisés</h4>
            <div className="flex flex-col gap-3 mt-2">
              {Object.keys(methodCounts).map((method, idx) => {
                const count = methodCounts[method];
                const pct = Math.round((count / totalMethods) * 100);
                return (
                  <div key={idx} className="flex items-center gap-4 text-xs">
                    <span className="w-16 font-bold text-slate-650">{method}</span>
                    <div className="flex-grow h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-slate-850 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                      />
                    </div>
                    <span className="w-16 text-right text-slate-500 font-semibold">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Global Transactions Table */}
        <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-4 shadow-sm bg-white/70">
          <h3 className="font-serif text-lg font-bold text-slate-800 border-b border-neutral-100 pb-3">Flux Financier National (Transactions Détaillées)</h3>
          {successfulPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Aucune transaction financière n'a été enregistrée au niveau national.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-sans border-collapse">
                <thead>
                  <tr className="border-b border-neutral-150 text-slate-400 uppercase text-[9px] font-bold text-left bg-slate-50/50">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Mairie</th>
                    <th className="py-3 px-3">Futurs Époux</th>
                    <th className="py-3 px-3">Nature du Frais</th>
                    <th className="py-3 px-3">Référence</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3">Montant</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {successfulPayments.map(pay => {
                    const matchedDossier = dossiers.find(d => d.id === pay.dossierId);
                    const couple = matchedDossier
                      ? `${matchedDossier.spouse1_name} & ${matchedDossier.spouse2_name}`
                      : 'Couple inconnu';
                    const matchedMairie = mairies.find(m => m.id === pay.mairieId);
                    const mairieLabel = matchedMairie ? matchedMairie.name : 'Inconnu';
                    const isOnlineFee = pay.amount === 2500 || pay.method.toLowerCase().includes('paystack');

                    return (
                      <tr key={pay.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="py-3 px-3 text-slate-500">{new Date(pay.date).toLocaleDateString('fr-FR')}</td>
                        <td className="py-3 px-3 font-semibold text-slate-650">{mairieLabel}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{couple}</td>
                        <td className="py-3 px-3">
                          {isOnlineFee ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              💳 Frais en Ligne (2500 F)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🏛️ Droits Mairie / Timbres
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">{pay.reference}</td>
                        <td className="py-3 px-3 text-slate-600">{pay.method}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{pay.amount.toLocaleString()} XOF</td>
                        <td className="py-3 px-3 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => openReceipt(pay)}
                            className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded font-bold cursor-pointer transition-colors shadow-sm text-[11px]"
                          >
                            Reçu
                          </button>
                          <button
                            onClick={() => handleDeletePayment(pay.id, pay.reference, pay.amount)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Supprimer la transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render visual calendar and schedule timeline (Agenda)
  const renderAgendaView = (isSuperadmin: boolean) => {
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

    const pendingRdvPhysiquesDossiers = dossiers.filter(d => {
      const isForMairie = isSuperadmin || !activeMairieId || d.mairie_id === activeMairieId;
      const hasRdv = Boolean(d.date_rendezvous || d.appointment_date || d.frais_reservation_paye);
      const notYetVerified = d.physical_verified !== true && d.status !== 'celebrated';
      return isForMairie && hasRdv && notYetVerified;
    });
    const rdvPhysiquesCount = pendingRdvPhysiquesDossiers.length;

    const readyCelebrationsDossiers = dossiers.filter(d => {
      const isForMairie = isSuperadmin || !activeMairieId || d.mairie_id === activeMairieId;
      const hasWeddingDate = Boolean(d.wedding_date || d.date_mariage);
      const isReady = d.frais_reservation_paye === true || d.status === 'approved' || d.statut === 'VALIDE';
      const notYetCelebrated = d.status !== 'celebrated';
      return isForMairie && hasWeddingDate && isReady && notYetCelebrated;
    });
    const celebrationsCount = readyCelebrationsDossiers.length;

    const handlePrevMonth = () => {
      if (calendarMonth === 0) {
        setCalendarMonth(11);
        setCalendarYear(prev => prev - 1);
      } else {
        setCalendarMonth(prev => prev - 1);
      }
    };

    const handleNextMonth = () => {
      if (calendarMonth === 11) {
        setCalendarMonth(0);
        setCalendarYear(prev => prev + 1);
      } else {
        setCalendarMonth(prev => prev + 1);
      }
    };

    const handleToday = () => {
      const today = new Date();
      setCalendarYear(today.getFullYear());
      setCalendarMonth(today.getMonth());
      setSelectedCalendarDate(today);
    };

    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayIndex = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7; // Monday start

    // Get bookings for a specific day
    const getBookingsForDate = (date: Date) => {
      return dossiers.filter(d => {
        // Filter by mairie if agent
        if (!isSuperadmin) {
          if (isCentralMairie) {
            const isCentral = d.mairie_id === 'cocody_salle_prestige' || d.mairie_id === 'cocody_salle_union';
            if (!isCentral) return false;
            if (selectedRoomFilter !== 'all' && d.mairie_id !== selectedRoomFilter) return false;
          } else {
            if (d.mairie_id !== activeMairieId) return false;
          }
        }
        // Filter by mairie if superadmin
        if (isSuperadmin && superadminCalendarMairieFilter !== 'all' && d.mairie_id !== superadminCalendarMairieFilter) return false;

        if (!d.wedding_date) return false;
        const parsed = parseWeddingDate(d.wedding_date);
        if (!parsed) return false;

        return parsed.getFullYear() === date.getFullYear() &&
          parsed.getMonth() === date.getMonth() &&
          parsed.getDate() === date.getDate();
      });
    };

    // Helper to check if a dossier matches a slot
    const isDossierAtSlot = (d: DossierInfo, date: Date, slot: string) => {
      if (!d.wedding_date) return false;
      const parsed = parseWeddingDate(d.wedding_date);
      if (!parsed) return false;

      const sameDay = parsed.getFullYear() === date.getFullYear() &&
        parsed.getMonth() === date.getMonth() &&
        parsed.getDate() === date.getDate();
      if (!sameDay) return false;

      const cleanedDateStr = d.wedding_date.toLowerCase();
      const slotFormatted = slot.replace(':', 'h');
      const [hStr, mStr] = slot.split(':');
      const shortHour = `${parseInt(hStr, 10)}h${mStr}`;

      return cleanedDateStr.includes(slotFormatted) || cleanedDateStr.includes(slot) || cleanedDateStr.includes(shortHour);
    };

    // Handle view dossier from calendar
    const handleExamineDossier = (dossier: DossierInfo) => {
      setSelectedDossier(dossier);
      if (isSuperadmin) {
        setSuperadminActiveTab('mairies_dossiers');
      } else {
        setMairieActiveTab('dossiers');
      }
      addNotification(`Ouverture du dossier de ${dossier.spouse1_name} & ${dossier.spouse2_name}`, 'info');
    };

    // Construct grid cells
    const cells = [];
    // Add empty slots for the offset
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, date: null });
    }
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const cellDate = new Date(calendarYear, calendarMonth, i);
      cells.push({ day: i, date: cellDate });
    }

    const selectedBookings = getBookingsForDate(selectedCalendarDate);

    // Get appointments for a specific day
    const getAppointmentsForDate = (date: Date) => {
      const targetY = date.getFullYear();
      const targetM = date.getMonth();
      const targetD = date.getDate();

      return dossiers.filter(d => {
        if (!isSuperadmin) {
          if (isCentralMairie) {
            const isCentral = d.mairie_id === 'cocody_salle_prestige' || d.mairie_id === 'cocody_salle_union';
            if (!isCentral) return false;
            if (selectedRoomFilter !== 'all' && d.mairie_id !== selectedRoomFilter) return false;
          } else {
            if (d.mairie_id !== activeMairieId) return false;
          }
        }
        if (isSuperadmin && superadminCalendarMairieFilter !== 'all' && d.mairie_id !== superadminCalendarMairieFilter) return false;

        if (d.status === 'rejected' || d.statut === 'ANNULE' || d.statut === 'EXPIRE' || d.statut === 'REJETE') return false;
        
        const rdvDateStr = d.date_rendezvous || d.appointment_date;
        if (!rdvDateStr) return false;

        let year: number | null = null;
        let month: number | null = null;
        let day: number | null = null;

        if (rdvDateStr.includes('-')) {
          const parts = rdvDateStr.split('T')[0].split('-');
          if (parts.length === 3) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
          }
        } else if (rdvDateStr.includes('/')) {
          const parts = rdvDateStr.split('/');
          if (parts.length === 3) {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
          }
        } else {
          const parsed = new Date(rdvDateStr);
          if (!isNaN(parsed.getTime())) {
            year = parsed.getFullYear();
            month = parsed.getMonth();
            day = parsed.getDate();
          }
        }

        if (year === null || month === null || day === null) return false;

        return targetY === year && targetM === month && targetD === day;
      });
    };

    const renderPhysicalAppointmentsView = () => {
      const selectedRdv = getAppointmentsForDate(selectedCalendarDate);
      const maxQuota = roomsParams?.quota_rdv_physiques_journalier || 5;
      const chargePct = Math.min(100, Math.round((selectedRdv.length / maxQuota) * 100));

      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in font-sans text-xs">
          {/* Left Column: Calendar Grid */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  RDV de Dépôt : {monthNames[calendarMonth]} {calendarYear}
                </h3>
                <p className="text-secondary/70 text-[10px] font-sans mt-0.5">
                  Cliquez sur un jour pour gérer la charge de travail et confirmer les dépôts physiques.
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 border border-neutral-300 hover:bg-neutral-50 rounded-xl cursor-pointer transition-colors text-slate-655"
                >
                  &larr;
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 border border-neutral-300 hover:bg-neutral-50 rounded-xl cursor-pointer transition-colors text-slate-655"
                >
                  &rarr;
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="py-2 px-3 border border-neutral-300 hover:bg-neutral-50 rounded-xl font-bold transition-all text-slate-655"
                >
                  Aujourd'hui
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center font-bold text-slate-400 text-[10px] uppercase tracking-wider">
              {weekDays.map(d => <div key={d} className="py-1">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {cells.map((cell, cellIdx) => {
                if (cell.day === null || cell.date === null) {
                  return <div key={`empty-${cellIdx}`} className="aspect-square bg-slate-50/20 border border-transparent rounded-xl" />;
                }

                const cellDate = cell.date;
                const isSelected = selectedCalendarDate.getFullYear() === cellDate.getFullYear() &&
                  selectedCalendarDate.getMonth() === cellDate.getMonth() &&
                  selectedCalendarDate.getDate() === cellDate.getDate();

                const today = new Date();
                const isToday = today.getFullYear() === cellDate.getFullYear() &&
                  today.getMonth() === cellDate.getMonth() &&
                  today.getDate() === cellDate.getDate();

                const cellRdv = getAppointmentsForDate(cellDate);
                const hasRdv = cellRdv.length > 0;
                const isLimitReached = cellRdv.length >= maxQuota;

                return (
                  <button
                    type="button"
                    key={`day-${cell.day}`}
                    onClick={() => setSelectedCalendarDate(cellDate)}
                    className={`aspect-square rounded-xl p-1.5 flex flex-col justify-between items-stretch border transition-all cursor-pointer relative hover:scale-105 ${isSelected
                        ? 'bg-gradient-to-br from-primary to-primary-container text-white border-primary shadow-md shadow-primary/20 scale-[1.03]'
                        : isToday
                          ? 'bg-amber-50/40 border-amber-400/70 text-slate-800 font-bold'
                          : 'bg-white border-neutral-100 hover:border-primary-container text-slate-800'
                      }`}
                  >
                    <span className={`text-xs font-semibold self-start ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                      {cell.day}
                    </span>

                    {hasRdv && (
                      <div className="flex flex-col gap-0.5 items-end self-end w-full">
                        <span className={`text-[8.5px] px-1 py-0.5 rounded font-black border leading-none ${
                          isSelected
                            ? 'bg-white/20 border-white/20 text-white'
                            : isLimitReached
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}>
                          {cellRdv.length}/{maxQuota}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-[10px] text-slate-500 font-medium font-sans">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-350" />
                Sous le quota (RDV disponible)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-350" />
                Quota max atteint (Dossiers pleins)
              </span>
            </div>
          </div>

          {/* Right Column: Physical Appointments Details */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm flex flex-col gap-4">
            <div>
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">Charge de travail de l'agent</span>
              <h3 className="font-serif text-base font-bold text-slate-800 mt-0.5">
                {selectedCalendarDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-secondary/70 text-[10px] font-sans mt-0.5">
                Planning journalier des dépôts physiques de dossiers.
              </p>
            </div>

            {/* Quota Gauge Progress Bar */}
            <div className="p-3 bg-neutral-50/70 border border-neutral-200 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-655">Taux de remplissage :</span>
                <span className={selectedRdv.length >= maxQuota ? "text-rose-655" : "text-emerald-655"}>
                  {selectedRdv.length} / {maxQuota} RDV ({chargePct}%)
                </span>
              </div>
              <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    selectedRdv.length >= maxQuota
                      ? 'bg-rose-500'
                      : selectedRdv.length >= maxQuota * 0.8
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${chargePct}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-400 italic">
                {selectedRdv.length >= maxQuota 
                  ? "⚠️ Capacité maximale de travail atteinte pour aujourd'hui." 
                  : "✓ Des plages de rendez-vous physiques restent disponibles."}
              </p>
            </div>

            {/* List of Couples Convocated */}
            <div className="space-y-3 mt-1 max-h-[380px] overflow-y-auto pr-1">
              {selectedRdv.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-sans font-medium bg-neutral-50/40 border border-dashed border-neutral-250 rounded-xl">
                   Aucun dépôt de dossier physique prévu ce jour.
                </div>
              ) : (
                selectedRdv.map(rdvItem => {
                  const isConfirmed = rdvItem.rendezvous_confirme === true;
                  return (
                    <div 
                      key={rdvItem.id} 
                      className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all text-left ${
                        isConfirmed 
                          ? 'bg-emerald-50/30 border-emerald-200/60' 
                          : 'bg-white border-neutral-200 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-serif font-bold text-slate-800 text-[11.5px] leading-tight">
                            💍 {rdvItem.spouse1_name} & {rdvItem.spouse2_name}
                          </h4>
                          <span className="text-[9px] font-bold text-primary tracking-wide uppercase mt-0.5 block">
                            🕒 {rdvItem.heure_rendezvous || "09:00"}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black tracking-wide uppercase ${
                          isConfirmed 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' 
                            : 'bg-amber-100 text-amber-800 border border-amber-250'
                        }`}>
                          {isConfirmed ? "🟢 Confirmé" : "⏳ En attente"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[9.5px] text-slate-500 font-medium font-sans">
                        <div>📞 Époux: {rdvItem.spouse1_phone || 'Non spécifié'}</div>
                        <div>📞 Épouse: {rdvItem.spouse2_phone || 'Non spécifié'}</div>
                        <div className="col-span-2">🏛️ Salle: {rdvItem.mairie_id === 'cocody_salle_prestige' ? 'Salle Prestige' : rdvItem.mairie_id === 'cocody_salle_union' ? "Salle de l'Union" : 'Mairie Annexe'}</div>
                      </div>

                      <div className="flex items-center gap-2 border-t border-slate-100 pt-2 mt-0.5 justify-between">
                        <button
                          type="button"
                          onClick={() => handleExamineDossier(rdvItem)}
                          className="text-slate-655 hover:text-primary font-bold flex items-center gap-1 cursor-pointer transition-colors text-[9.5px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Examiner le dossier
                        </button>
                        
                        {!isConfirmed && (
                          <button
                            type="button"
                            onClick={() => handleConfirmRdv(rdvItem.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors text-[9.5px] shadow-sm shadow-emerald-100"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Valider le Dépôt
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Sub tab selector */}
        <div className="flex border-b border-neutral-100 pb-1 gap-4 font-sans text-xs">
          <button
            onClick={() => setAgendaSubTab('celebrations')}
            className={`pb-2.5 px-3 font-bold cursor-pointer transition-all border-b-2 flex items-center gap-2 ${
              agendaSubTab === 'celebrations'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>👰 Célébrations de Mariage</span>
            {celebrationsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse shadow-sm">
                {celebrationsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setAgendaSubTab('rdv_physiques')}
            className={`pb-2.5 px-3 font-bold cursor-pointer transition-all border-b-2 flex items-center gap-2 ${
              agendaSubTab === 'rdv_physiques'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📂 Rendez-vous Physiques (Dépôt)</span>
            {rdvPhysiquesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse shadow-sm">
                {rdvPhysiquesCount}
              </span>
            )}
          </button>
        </div>

        {agendaSubTab === 'celebrations' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in font-sans text-xs mt-4">
        {/* Left Column: Calendar Grid */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm flex flex-col gap-6">
          {/* Calendar Header */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-b border-neutral-100 pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {monthNames[calendarMonth]} {calendarYear}
              </h3>
              <p className="text-secondary/70 text-[10px] font-sans mt-0.5">
                Cliquez sur un jour pour voir le planning horaire des unions.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 border border-neutral-300 hover:bg-neutral-50 rounded-xl cursor-pointer transition-colors text-slate-650"
                title="Mois précédent"
              >
                &larr;
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3.5 py-2 border border-neutral-300 hover:bg-neutral-50 rounded-xl font-bold cursor-pointer transition-colors text-slate-700"
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 border border-neutral-300 hover:bg-neutral-50 rounded-xl cursor-pointer transition-colors text-slate-650"
                title="Mois suivant"
              >
                &rarr;
              </button>
            </div>
          </div>

          {/* Superadmin Mairie Filter */}
          {isSuperadmin && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
              <label className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                <Landmark className="w-4 h-4 text-primary" />
                Filtrer par commune :
              </label>
              <select
                value={superadminCalendarMairieFilter}
                onChange={(e) => setSuperadminCalendarMairieFilter(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3 py-1.5 bg-white font-medium focus:border-primary focus:outline-none cursor-pointer flex-grow text-xs"
              >
                <option value="all">Toutes les communes raccordées ({dossiers.filter(d => d.wedding_date).length} mariages)</option>
                {mairies.map(m => {
                  const mCount = dossiers.filter(d => d.mairie_id === m.id && d.wedding_date).length;
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} ({mCount} mariage{mCount > 1 ? 's' : ''})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Agent Room Filter in Agenda (only when isCentralMairie is true) */}
          {!isSuperadmin && isCentralMairie && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
              <label className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                <Building className="w-4 h-4 text-primary" />
                Filtrer par salle :
              </label>
              <select
                value={selectedRoomFilter}
                onChange={(e) => setSelectedRoomFilter(e.target.value as any)}
                className="border border-neutral-300 rounded-xl px-3 py-1.5 bg-white font-medium focus:border-primary focus:outline-none cursor-pointer flex-grow text-xs"
              >
                <option value="all">Toutes les salles (Salle Prestige & Salle de l'Union)</option>
                <option value="cocody_salle_prestige">Salle Prestige (Salle 1)</option>
                <option value="cocody_salle_union">Salle de l'Union (Salle 2)</option>
              </select>
            </div>
          )}

          {/* Weekdays Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-50 pb-2">
            {weekDays.map(wd => (
              <div key={wd}>{wd}</div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {cells.map((cell, idx) => {
              if (cell.day === null || cell.date === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="aspect-square bg-slate-50/30 border border-slate-100/50 rounded-xl"
                  />
                );
              }

              const cellDate = cell.date;
              const isSelected = selectedCalendarDate.getFullYear() === cellDate.getFullYear() &&
                selectedCalendarDate.getMonth() === cellDate.getMonth() &&
                selectedCalendarDate.getDate() === cellDate.getDate();

              const today = new Date();
              const isToday = today.getFullYear() === cellDate.getFullYear() &&
                today.getMonth() === cellDate.getMonth() &&
                today.getDate() === cellDate.getDate();

              const cellBookings = getBookingsForDate(cellDate);
              const hasBookings = cellBookings.length > 0;

              return (
                <button
                  type="button"
                  key={`day-${cell.day}`}
                  onClick={() => setSelectedCalendarDate(cellDate)}
                  className={`aspect-square rounded-xl p-1.5 flex flex-col justify-between items-stretch border transition-all cursor-pointer relative hover:scale-105 ${isSelected
                      ? 'bg-gradient-to-br from-primary to-primary-container text-white border-primary shadow-md shadow-primary/20 scale-[1.03]'
                      : isToday
                        ? 'bg-amber-50/40 border-amber-400/70 text-slate-800 font-bold'
                        : 'bg-white border-neutral-100 hover:border-primary-container text-slate-800'
                    }`}
                >
                  <span className={`text-xs font-semibold self-start ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                    {cell.day}
                  </span>

                  {hasBookings && (
                    <div className="flex flex-col gap-0.5 items-end self-end w-full">
                      {cellBookings.slice(0, 2).map((b, bIdx) => {
                        let colorDot = 'bg-amber-400';
                        if (b.status === 'approved') colorDot = 'bg-emerald-400';
                        if (b.status === 'celebrated') colorDot = 'bg-purple-400';

                        return (
                          <span
                            key={b.id}
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : colorDot}`}
                            title={`${b.spouse1_name} & ${b.spouse2_name}`}
                          />
                        );
                      })}
                      {cellBookings.length > 2 && (
                        <span className={`text-[7px] font-bold ${isSelected ? 'text-white/80' : 'text-primary'}`}>
                          +{cellBookings.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-[10px] text-slate-500 font-medium font-sans">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-400" />
              À réviser
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
              Approuvé / Prêt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-purple-450 bg-purple-400" />
              Célébré
            </span>
            <span className="flex items-center gap-1.5 ml-auto text-slate-400 font-normal">
              *Aujourd'hui entouré en jaune.
            </span>
          </div>
        </div>

        {/* Right Column: Time Slots List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm flex flex-col gap-4">
          <div>
            <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">Détails de la journée</span>
            <h3 className="font-serif text-base font-bold text-slate-800 mt-0.5">
              {selectedCalendarDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-secondary/70 text-[10px] font-sans mt-0.5">
              Statut des créneaux officiels de célébration.
            </p>
          </div>

          {/* Time Slots Cards */}
          <div className="space-y-3 mt-2 max-h-[460px] overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {(() => {
                const activeFilter = selectedRoomFilter !== 'all' 
                  ? selectedRoomFilter 
                  : (superadminCalendarMairieFilter !== 'all' ? superadminCalendarMairieFilter : undefined);
                
                const baseSlots = getTimeSlotsForRoomOrMairie(activeFilter);
                
                // Collect booked times for this selected date
                const bookedTimes: string[] = [];
                selectedBookings.forEach(d => {
                  if (!d.wedding_date) return;
                  const match = d.wedding_date.match(/(\d{1,2})[h:](\d{2})/i);
                  if (match) {
                    const h = match[1].padStart(2, '0');
                    const m = match[2];
                    const timeVal = `${h}:${m}`;
                    if (!bookedTimes.includes(timeVal)) {
                      bookedTimes.push(timeVal);
                    }
                  }
                });

                const combinedSlots = Array.from(new Set([...baseSlots, ...bookedTimes]));
                combinedSlots.sort((a, b) => {
                  const [ha, ma] = a.split(':').map(Number);
                  const [hb, mb] = b.split(':').map(Number);
                  return (ha * 60 + ma) - (hb * 60 + mb);
                });

                return combinedSlots.map((slot) => {
                  // Find booking for this slot
                  const booking = selectedBookings.find(d => isDossierAtSlot(d, selectedCalendarDate, slot));

                if (booking) {
                  let badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  let statusLabel = 'À réviser';
                  if (booking.status === 'approved') {
                    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    statusLabel = 'Approuvé';
                  } else if (booking.status === 'celebrated') {
                    badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                    statusLabel = 'Célébré';
                  }

                  const associatedMairie = mairies.find(m => m.id === booking.mairie_id);

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25 }}
                      key={`slot-booked-${slot}`}
                      className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all text-left shadow-sm ${booking.status === 'celebrated'
                          ? 'bg-purple-50/15 border-purple-100 hover:border-purple-200'
                          : booking.status === 'approved'
                            ? 'bg-emerald-50/10 border-emerald-100 hover:border-emerald-200'
                            : 'bg-amber-50/10 border-amber-100 hover:border-amber-200'
                        }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[13px]">
                          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                          <span>{slot.replace(':', 'h')}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${badgeColor}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 text-xs">
                        <p className="font-serif text-slate-900 font-bold text-sm">
                          {booking.spouse1_name || 'Époux'} &amp; {booking.spouse2_name || 'Épouse'}
                        </p>

                        <div className="flex flex-col gap-0.5 text-[10px] text-slate-400 font-sans">
                          <span>Code : <span className="font-mono text-slate-600 font-bold">{booking.id.toUpperCase().replace('DOSSIER_', '')}</span></span>
                          <span className="flex items-center gap-1 text-slate-500 font-medium mt-0.5">
                            <Landmark className="w-3 h-3 text-primary shrink-0" />
                            {booking.mairie_id === 'cocody_salle_union'
                              ? "Salle de l'Union (Salle 2)"
                              : booking.mairie_id === 'cocody_salle_prestige'
                                ? "Salle Prestige (Salle 1)"
                                : (associatedMairie ? associatedMairie.name : booking.mairie_id)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t border-slate-100/60 pt-2 mt-0.5 justify-between">
                        <span className="text-[9px] text-slate-400 italic">Réservé</span>
                        <button
                          type="button"
                          onClick={() => handleExamineDossier(booking)}
                          className="text-primary hover:text-primary-container font-bold flex items-center gap-1 cursor-pointer transition-colors text-[10px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Examiner le dossier
                        </button>
                      </div>
                    </motion.div>
                  );
                }

                // If vacant slot
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={`slot-free-${slot}`}
                    className="p-3.5 rounded-xl border border-dashed border-neutral-300 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-[13px]">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{slot.replace(':', 'h')}</span>
                    </div>

                    <div className="text-right flex flex-col items-end gap-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                        Disponible
                      </span>
                    </div>
                  </motion.div>
                );
              });
            })()}
            </AnimatePresence>
          </div>
        </div>
      </div>
    ) : (
      renderPhysicalAppointmentsView()
    )}
  </div>
);
};

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in text-left">

      {/* -------------------- SUPER ADMIN VIEW -------------------- */}
      {currentRole === 'superadmin' && (
        <>
          {/* Header Stats */}
          <section className="text-center max-w-2xl mx-auto py-2">
            <h2 className="font-serif text-3xl md:text-5xl text-slate-900 font-bold mb-4 tracking-tight flex items-center justify-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Direction de l'État Civil National
            </h2>
            <p className="font-sans text-sm text-secondary/95">
              Supervision nationale des mairies connectées, configuration des codes d'accès sécurisés et statistiques des unions d'état civil.
            </p>
          </section>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <span className="text-secondary/70 text-[10px] font-bold uppercase tracking-wider block">Communes Connectées</span>
                <span className="font-serif text-2xl font-bold text-slate-800">{mairies.length}</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <span className="text-secondary/70 text-[10px] font-bold uppercase tracking-wider block">Total Dossiers Civils</span>
                <span className="font-serif text-2xl font-bold text-slate-800">{dossiers.length}</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-secondary/70 text-[10px] font-bold uppercase tracking-wider block">Recettes Plateforme ({((paystackAmount || 2500)).toLocaleString('fr-FR')} F)</span>
                <span className="font-serif text-xl font-bold text-emerald-700">
                  {((dossiers.filter(d => d.frais_reservation_paye === true).length) * (paystackAmount || 2500)).toLocaleString('fr-FR')} F
                </span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-secondary/70 text-[10px] font-bold uppercase tracking-wider block">Recettes Caisse ({((paramTimbrePrice || 100000)).toLocaleString('fr-FR')} F)</span>
                <span className="font-serif text-xl font-bold text-purple-700">
                  {((dossiers.filter(d => d.frais_timbre_paye === true).length) * (paramTimbrePrice || 100000)).toLocaleString('fr-FR')} F
                </span>
              </div>
            </div>
          </div>

          {/* Analytics Visualization Section for Super Admin */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
            {/* National Status Breakdown Chart */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm flex flex-col gap-6 text-left">
              <div>
                <h3 className="font-serif text-base font-bold text-slate-800">
                  Répartition Nationale des Dossiers
                </h3>
                <p className="font-sans text-[11px] text-slate-400">Pourcentage des dossiers selon leur statut civil.</p>
              </div>

              {(() => {
                const total = dossiers.length;
                const underReview = dossiers.filter(d => d.status === 'under_review').length;
                const approved = dossiers.filter(d => d.status === 'approved').length;
                const celebrated = dossiers.filter(d => d.status === 'celebrated').length;

                const pctReview = total > 0 ? Math.round((underReview / total) * 100) : 0;
                const pctApproved = total > 0 ? Math.round((approved / total) * 100) : 0;
                const pctCelebrated = total > 0 ? Math.round((celebrated / total) * 100) : 0;

                const radius = 38;
                const circumference = 2 * Math.PI * radius; // 238.76

                return (
                  <div className="flex flex-col sm:flex-row items-center gap-6 justify-around py-2">
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                      {/* SVG Stacked Donut */}
                      <svg width="144" height="144" viewBox="0 0 100 100" className="transform -rotate-90">
                        {/* Background ring */}
                        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f1f3f4" strokeWidth="10" />

                        {/* Celebrated segment */}
                        {pctCelebrated > 0 && (
                          <motion.circle
                            cx="50" cy="50" r={radius} fill="transparent"
                            stroke="#8b5cf6" strokeWidth="10" // Purple
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: circumference - (pctCelebrated / 100) * circumference }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            strokeLinecap="round"
                          />
                        )}

                        {/* Approved segment */}
                        {pctApproved > 0 && (
                          <motion.circle
                            cx="50" cy="50" r={radius} fill="transparent"
                            stroke="#10b981" strokeWidth="10" // Emerald
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: circumference - (pctApproved / 100) * circumference }}
                            // Offset by celebrated segment
                            style={{ transform: `rotate(${(pctCelebrated / 100) * 360}deg)`, transformOrigin: '50px 50px' }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                            strokeLinecap="round"
                          />
                        )}

                        {/* Under Review segment */}
                        {pctReview > 0 && (
                          <motion.circle
                            cx="50" cy="50" r={radius} fill="transparent"
                            stroke="#f59e0b" strokeWidth="10" // Amber
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: circumference - (pctReview / 100) * circumference }}
                            // Offset by celebrated + approved segments
                            style={{ transform: `rotate(${((pctCelebrated + pctApproved) / 100) * 360}deg)`, transformOrigin: '50px 50px' }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                            strokeLinecap="round"
                          />
                        )}
                      </svg>

                      <div className="absolute flex flex-col items-center">
                        <span className="font-serif text-2xl font-bold text-slate-800">{total}</span>
                        <span className="font-sans text-[8px] font-bold text-slate-400 uppercase tracking-widest">Dossiers</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full max-w-[160px]">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />
                          <span className="text-slate-650">Célébrés</span>
                        </div>
                        <span className="font-bold text-slate-800">{pctCelebrated}%</span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                          <span className="text-slate-650">Approuvés</span>
                        </div>
                        <span className="font-bold text-slate-800">{pctApproved}%</span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                          <span className="text-slate-650">En cours</span>
                        </div>
                        <span className="font-bold text-slate-800">{pctReview}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Active Dossiers per Mairie Bar Chart */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm flex flex-col gap-6 text-left">
              <div>
                <h3 className="font-serif text-base font-bold text-slate-800">
                  Dossiers Actifs par Commune
                </h3>
                <p className="font-sans text-[11px] text-slate-400">Nombre de dossiers gérés par chaque administration municipale.</p>
              </div>

              <div className="space-y-4 py-2">
                {mairies.map((mairie, idx) => {
                  const mDossiers = dossiers.filter(d => d.mairie_id === mairie.id);
                  const count = mDossiers.length;
                  const maxCount = Math.max(...mairies.map(m => dossiers.filter(d => d.mairie_id === m.id).length), 1);
                  const pct = Math.round((count / maxCount) * 100);

                  return (
                    <div key={mairie.id} className="flex flex-col gap-1.5 font-sans">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">{mairie.name}</span>
                        <span className="font-bold text-primary">{count} dossier{count > 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1.2, ease: "easeOut", delay: idx * 0.1 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tab Navigation for Superadmin portal */}
          <div className="flex border-b border-neutral-205 font-sans text-xs mt-6 select-none overflow-x-auto whitespace-nowrap hide-scrollbar">
            <button
              onClick={() => setSuperadminActiveTab('mairies_dossiers')}
              className={`px-6 py-3 font-semibold cursor-pointer border-b-2 transition-all shrink-0 ${superadminActiveTab === 'mairies_dossiers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              Mairies &amp; Dossiers Nationaux
            </button>
            <button
              onClick={() => setSuperadminActiveTab('agenda')}
              className={`px-6 py-3 font-semibold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${superadminActiveTab === 'agenda'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Calendar className="w-4 h-4 text-primary" />
              <span>Agenda National</span>
              {(() => {
                const pendingRdvCount = dossiers.filter(d => Boolean(d.date_rendezvous || d.appointment_date || d.frais_reservation_paye) && d.physical_verified !== true && d.status !== 'celebrated').length;
                const pendingCelebrationsCount = dossiers.filter(d => Boolean(d.wedding_date || d.date_mariage) && (d.frais_reservation_paye === true || d.status === 'approved' || d.statut === 'VALIDE') && d.status !== 'celebrated').length;
                const totalAgendaBadges = pendingRdvCount + pendingCelebrationsCount;
                return totalAgendaBadges > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-600 text-white animate-pulse shadow-sm">
                    {totalAgendaBadges}
                  </span>
                ) : null;
              })()}
            </button>
            <button
              onClick={() => setSuperadminActiveTab('partners')}
              className={`px-6 py-3 font-semibold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${superadminActiveTab === 'partners'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Award className="w-4 h-4 text-primary" />
              Prestataires d'Exception ({partners.length})
            </button>
            <button
              onClick={() => setSuperadminActiveTab('orders')}
              className={`px-6 py-3 font-semibold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${superadminActiveTab === 'orders'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <ClipboardList className="w-4 h-4 text-primary" />
              Services Commandés ({partnerContacts.length})
            </button>
            <button
              onClick={() => setSuperadminActiveTab('finance')}
              className={`px-6 py-3 font-semibold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${superadminActiveTab === 'finance'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Landmark className="w-4 h-4 text-primary" />
              Finance &amp; Recettes
            </button>
            <button
              onClick={() => setSuperadminActiveTab('settings')}
              className={`px-6 py-3 font-semibold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${superadminActiveTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Settings className="w-4 h-4 text-primary" />
              Configuration Système
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={superadminActiveTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="w-full flex flex-col gap-6"
            >
              {superadminActiveTab === 'mairies_dossiers' && (
            <>
              {/* Global Financial Stats row */}
              {(() => {
                const countPlatform = dossiers.filter(d => d.frais_reservation_paye === true).length;
                const totalPlatform = countPlatform * (paystackAmount || 2500);

                const countCaisse = dossiers.filter(d => d.frais_timbre_paye === true).length;
                const totalCaisse = countCaisse * (paramTimbrePrice || 100000);

                const totalCollectedGlobal = totalPlatform + totalCaisse;
                const totalTransactions = countPlatform + countCaisse;
                const averageTicket = totalTransactions > 0 ? Math.round(totalCollectedGlobal / totalTransactions) : 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 w-full">
                    <div className="glass-card rounded-2xl p-4 border border-blue-500/20 shadow flex items-center gap-3.5 bg-white/70 backdrop-blur-md">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="text-left font-sans">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Frais en Ligne (Plateforme)</span>
                        <span className="font-sans text-base font-bold text-blue-700">{totalPlatform.toLocaleString()} XOF</span>
                        <span className="text-[9px] text-slate-400 font-medium block">{countPlatform} dossier(s) (2500 F)</span>
                      </div>
                    </div>

                    <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 shadow flex items-center gap-3.5 bg-white/70 backdrop-blur-md">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div className="text-left font-sans">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Droits de Mariage (Mairie)</span>
                        <span className="font-sans text-base font-bold text-emerald-700">{totalCaisse.toLocaleString()} XOF</span>
                        <span className="text-[9px] text-slate-400 font-medium block">{countCaisse} quittance(s)</span>
                      </div>
                    </div>

                    <div className="glass-card rounded-2xl p-4 border border-amber-500/20 shadow flex items-center gap-3.5 bg-white/70 backdrop-blur-md">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div className="text-left font-sans">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Recettes Cumulées</span>
                        <span className="font-sans text-base font-bold text-amber-700">{totalCollectedGlobal.toLocaleString()} XOF</span>
                        <span className="text-[9px] text-slate-400 font-medium block">Total général</span>
                      </div>
                    </div>

                    <div className="glass-card rounded-2xl p-4 border border-violet-500/20 shadow flex items-center gap-3.5 bg-white/70 backdrop-blur-md">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-200 shrink-0">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="text-left font-sans">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Quittances &amp; Volume</span>
                        <span className="font-sans text-base font-bold text-violet-700">{totalTransactions} Transactions</span>
                        <span className="text-[9px] text-slate-400 font-medium block">Panier: {averageTicket.toLocaleString()} F</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-6">
                {/* Connected Mairies List */}
                <div className="lg:col-span-2 glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6">
                  <h3 className="font-serif text-xl font-bold text-slate-800 border-b border-neutral-100 pb-3 flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" />
                    Mairies Raccordées &amp; Accès
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-100 text-secondary/70 font-semibold">
                          <th className="py-3 pr-4">Mairie / Commune</th>
                          <th className="py-3 px-4">Région Administrative</th>
                          <th className="py-3 px-4">Code d'accès</th>
                          <th className="py-3 px-4 text-center">Actif</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mairies.map((mairie) => {
                          const mairieDossiers = dossiers.filter(d => d.mairie_id === mairie.id);
                          const isEditing = editingMairieId === mairie.id;

                          return (
                            <tr key={mairie.id} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                              <td className="py-4 pr-4 font-bold text-slate-800">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editMairieName}
                                    onChange={(e) => setEditMairieName(e.target.value)}
                                    className="border border-neutral-300 rounded px-2 py-1 bg-white font-sans text-xs focus:outline-none"
                                  />
                                ) : (
                                  <>
                                    {mairie.name}
                                    <span className="text-[9px] text-slate-400 font-normal block mt-0.5">
                                      {mairieDossiers.length} dossiers actifs
                                    </span>
                                  </>
                                )}
                              </td>
                              <td className="py-4 px-4 text-secondary">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editMairieRegion}
                                    onChange={(e) => setEditMairieRegion(e.target.value)}
                                    className="border border-neutral-300 rounded px-2 py-1 bg-white font-sans text-xs focus:outline-none"
                                  />
                                ) : (
                                  mairie.region
                                )}
                              </td>
                              <td className="py-4 px-4 font-mono font-bold text-primary">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editMairieAccessCode}
                                    onChange={(e) => setEditMairieAccessCode(e.target.value)}
                                    className="border border-neutral-300 rounded px-2 py-1 bg-white font-sans text-xs focus:outline-none w-28"
                                  />
                                ) : (
                                  mairie.access_code
                                )}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <button
                                  onClick={() => handleToggleMairie(mairie.id, mairie.is_active)}
                                  className="cursor-pointer inline-flex items-center"
                                  title={mairie.is_active ? "Désactiver" : "Activer"}
                                >
                                  {mairie.is_active ? (
                                    <ToggleRight className="w-7 h-7 text-primary" />
                                  ) : (
                                    <ToggleLeft className="w-7 h-7 text-slate-300" />
                                  )}
                                </button>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex gap-2 justify-end">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveMairie(mairie.id)}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] cursor-pointer"
                                      >
                                        Sauver
                                      </button>
                                      <button
                                        onClick={() => setEditingMairieId(null)}
                                        className="px-2 py-1 border border-neutral-350 hover:bg-neutral-100 rounded text-slate-600 font-bold text-[10px] cursor-pointer"
                                      >
                                        Annuler
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleStartEditMairie(mairie)}
                                        className="text-slate-500 hover:text-primary cursor-pointer"
                                        title="Modifier la mairie"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMairie(mairie.id, mairie.name)}
                                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                        title="Supprimer la mairie"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Raccorder Mairie Form */}
                <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6">
                  <h3 className="font-serif text-xl font-bold text-slate-800 border-b border-neutral-100 pb-3 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Raccorder une commune
                  </h3>

                  <form onSubmit={handleCreateMairie} className="flex flex-col gap-4 font-sans text-xs">
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="font-semibold text-slate-700">Nom de la Mairie / Commune</label>
                      <input
                        type="text"
                        required
                        value={newMairieName}
                        onChange={(e) => setNewMairieName(e.target.value)}
                        placeholder="Ex: Mairie de Bouaké"
                        className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="font-semibold text-slate-700">Région / District</label>
                      <input
                        type="text"
                        required
                        value={newMairieRegion}
                        onChange={(e) => setNewMairieRegion(e.target.value)}
                        placeholder="Ex: Région de Gbêkê"
                        className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="font-semibold text-slate-700">Code d'accès Portail (Optionnel)</label>
                      <div className="relative flex items-center">
                        <Key className="w-4 h-4 text-slate-400 absolute left-4" />
                        <input
                          type="text"
                          value={newMairieAccessCode}
                          onChange={(e) => setNewMairieAccessCode(e.target.value)}
                          placeholder="Ex: BOUAKE2026 (ou généré)"
                          className="w-full border border-neutral-300 rounded-xl pl-11 pr-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="mt-2 w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-container shadow-md shadow-primary/20 cursor-pointer transition-colors"
                    >
                      Valider le Raccordement
                    </button>
                  </form>
                </div>
              </div>

              {/* National Dossier Explorer (Total Platform Control) */}
              <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6 mt-2">
                <div className="border-b border-neutral-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-slate-800 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-primary" />
                      Explorateur National des Dossiers Civils
                    </h3>
                    <p className="font-sans text-[11px] text-slate-500 mt-0.5">Recherchez, supervisez, contournez les blocages ou supprimez n'importe quel dossier à l'échelle nationale.</p>
                  </div>

                  {/* Filters & Search Toolbar */}
                  <div className="flex flex-col sm:flex-row gap-3 text-xs font-sans">
                    {/* Search Bar */}
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                      <input
                        type="text"
                        value={dossierSearchText}
                        onChange={(e) => setDossierSearchText(e.target.value)}
                        placeholder="Noms ou code dossier..."
                        className="border border-neutral-300 rounded-xl pl-9 pr-4 py-2 w-full sm:w-48 bg-white focus:outline-none focus:border-primary text-xs"
                      />
                    </div>

                    {/* Mairie Filter */}
                    <select
                      value={dossierMairieFilter}
                      onChange={(e) => setDossierMairieFilter(e.target.value)}
                      className="border border-neutral-300 rounded-xl px-3 py-2 bg-white focus:outline-none text-xs cursor-pointer"
                    >
                      <option value="all">Toutes les mairies</option>
                      {mairies.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>

                    {/* Status Filter */}
                    <select
                      value={dossierStatusFilter}
                      onChange={(e) => setDossierStatusFilter(e.target.value)}
                      className="border border-neutral-300 rounded-xl px-3 py-2 bg-white focus:outline-none text-xs cursor-pointer"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="under_review">À réviser / Sous instruction</option>
                      <option value="approved">Prêt / Approuvé</option>
                      <option value="celebrated">Célébré</option>
                    </select>
                  </div>
                </div>

                {/* Date Filters Row */}
                <div className="flex flex-wrap items-center gap-4 bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl text-xs font-sans">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <span>Célébration :</span>
                  </div>

                  <div className="flex gap-1 bg-neutral-200/50 p-1 rounded-lg">
                    {(['all', 'today', 'week', 'month', 'custom'] as const).map((type) => {
                      let label = 'Toutes les dates';
                      if (type === 'today') label = "Aujourd'hui";
                      if (type === 'week') label = 'Cette semaine';
                      if (type === 'month') label = 'Ce mois';
                      if (type === 'custom') label = 'Période personnalisée';

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSuperadminDateFilterType(type)}
                          className={`px-3 py-1.5 rounded-md transition-all font-semibold cursor-pointer ${superadminDateFilterType === type
                              ? 'bg-white text-slate-800 shadow-sm font-bold border border-slate-200/30'
                              : 'text-slate-500 hover:text-slate-850'
                            }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {superadminDateFilterType === 'custom' && (
                    <div className="flex items-center gap-2 animate-fade-in pl-2 border-l border-slate-200">
                      <span className="text-slate-500 font-medium">Du</span>
                      <input
                        type="date"
                        value={superadminStartDate}
                        onChange={(e) => setSuperadminStartDate(e.target.value)}
                        className="border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-primary text-xs"
                      />
                      <span className="text-slate-500 font-medium">au</span>
                      <input
                        type="date"
                        value={superadminEndDate}
                        onChange={(e) => setSuperadminEndDate(e.target.value)}
                        className="border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-primary text-xs"
                      />
                      {(superadminStartDate || superadminEndDate) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSuperadminStartDate('');
                            setSuperadminEndDate('');
                          }}
                          className="ml-1 text-primary hover:text-primary-container font-semibold transition-colors cursor-pointer text-xs"
                        >
                          Effacer
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {nationalFilteredDossiers.length === 0 ? (
                  <div className="text-center py-10 bg-neutral-50 rounded-xl border border-neutral-100 p-6">
                    <p className="font-sans text-secondary text-xs">Aucun dossier de mariage civil ne correspond à vos filtres.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-100 text-secondary/70 font-semibold">
                          <th className="py-3 pr-4">Code Dossier</th>
                          <th className="py-3 px-4">Mairie Assignée</th>
                          <th className="py-3 px-4">Futurs Conjoints</th>
                          <th className="py-3 px-4">Date célébration</th>
                          <th className="py-3 px-4 text-center">Frais en ligne ({((paystackAmount || 2500)).toLocaleString('fr-FR')} F)</th>
                          <th className="py-3 px-4 text-center">Bypass Statut (Contrôle Total)</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nationalFilteredDossiers.map((dossier) => {
                          const dossierMairieName = mairies.find(m => m.id === dossier.mairie_id)?.name || 'Non assigné';
                          return (
                            <tr key={dossier.id} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                              <td className="py-4 pr-4 font-mono font-bold text-slate-800">
                                {dossier.id.toUpperCase().replace('DOSSIER_', '')}
                              </td>
                              <td className="py-4 px-4 text-secondary font-medium">{dossierMairieName}</td>
                              <td className="py-4 px-4">
                                <span className="font-bold text-slate-850 block">{dossier.spouse1_name} &amp; {dossier.spouse2_name}</span>
                                {(dossier.spouse1_phone || dossier.spouse2_phone) && (
                                  <span className="text-[10px] text-slate-400 font-sans block mt-0.5 font-normal">
                                    📞 {dossier.spouse1_phone || 'N/A'} / {dossier.spouse2_phone || 'N/A'}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-secondary">{dossier.wedding_date || 'Non planifiée'}</td>
                              <td className="py-4 px-4 text-center">
                                <span className={`px-2.5 py-1 rounded-full font-sans text-[9px] font-bold block mx-auto w-fit uppercase tracking-wide border ${
                                  dossier.frais_reservation_paye === true
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}>
                                  {dossier.frais_reservation_paye === true ? '✅ Payé' : '⏳ Non payé'}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <select
                                  value={dossier.status}
                                  onChange={(e) => handleBypassDossierStatus(dossier.id, e.target.value as any, dossier.spouse1_name, dossier.spouse2_name)}
                                  className="border border-neutral-300 rounded-lg px-2 py-1 bg-white text-[10px] font-semibold text-slate-700 cursor-pointer focus:outline-none hover:border-primary transition-all block mx-auto"
                                >
                                  <option value="under_review">⚠️ Forcer à réviser</option>
                                  <option value="approved">✅ Forcer approuvé</option>
                                  <option value="celebrated">🎉 Forcer célébré</option>
                                </select>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex gap-2.5 justify-end">
                                  <button
                                    onClick={() => setSelectedDossier(dossier)}
                                    className="bg-white border border-neutral-300 hover:border-primary hover:text-primary px-2.5 py-1.5 rounded-lg font-sans font-bold flex items-center gap-1 cursor-pointer text-[10px] shadow-sm hover:shadow"
                                  >
                                    <Eye className="w-3 h-3" />
                                    Examiner
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDossier(dossier.id, dossier.spouse1_name, dossier.spouse2_name)}
                                    className="border border-neutral-300 hover:border-rose-600 hover:text-rose-600 p-1.5 rounded-lg cursor-pointer text-slate-400"
                                    title="Supprimer le dossier"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {superadminActiveTab === 'agenda' && (
            renderAgendaView(true)
          )}

          {superadminActiveTab === 'partners' && (
            /* Partners CRUD Dashboard */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-4">
              {/* List of Partners */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6">
                <h3 className="font-serif text-xl font-bold text-slate-800 border-b border-neutral-100 pb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Catalogue des Prestataires d'Exception
                </h3>

                {partners.length === 0 ? (
                  <div className="text-center py-10 bg-neutral-50 rounded-xl border border-neutral-100 p-6">
                    <p className="font-sans text-secondary text-xs">Aucun prestataire configuré sur la plateforme.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-100 text-secondary/70 font-semibold">
                          <th className="py-3 pr-4">Prestataire</th>
                          <th className="py-3 px-4">Catégorie</th>
                          <th className="py-3 px-4">Mairie Rattachée</th>
                          <th className="py-3 px-4 text-center">Note</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partners.map((partner) => {
                          const assignedMairie = mairies.find(m => m.id === partner.mairieId);
                          return (
                            <tr key={partner.id} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                              <td className="py-4 pr-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={partner.imageUrl}
                                    alt={partner.name}
                                    className="w-10 h-10 object-cover rounded-lg border border-neutral-200 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div>
                                    <span className="font-bold text-slate-850 block">{partner.name}</span>
                                    <span className="text-[10px] text-slate-450 line-clamp-1 max-w-[200px]" title={partner.description}>
                                      {partner.description}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-slate-600 font-medium">
                                {partner.category}
                              </td>
                              <td className="py-4 px-4">
                                {assignedMairie ? (
                                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-[10px]">
                                    {assignedMairie.name}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Toutes (Global)</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-center font-bold text-amber-600">
                                ⭐ {partner.rating.toFixed(1)}
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => handleStartEditPartner(partner)}
                                    className="text-slate-500 hover:text-primary cursor-pointer"
                                    title="Modifier le prestataire"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePartner(partner.id, partner.name)}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Supprimer le prestataire"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add / Edit Partner Form */}
              <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6">
                {editingPartnerId ? (
                  <>
                    <h3 className="font-serif text-xl font-bold text-slate-850 border-b border-neutral-100 pb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Edit className="w-5 h-5 text-primary" />
                        Modifier Prestataire
                      </span>
                      <button
                        onClick={() => setEditingPartnerId(null)}
                        className="text-[10px] text-slate-400 hover:text-slate-800 font-bold font-sans cursor-pointer underline"
                      >
                        Annuler
                      </button>
                    </h3>

                    <form onSubmit={(e) => { e.preventDefault(); handleSavePartner(editingPartnerId); }} className="flex flex-col gap-4 font-sans text-xs">
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Nom du Prestataire</label>
                        <input
                          type="text"
                          required
                          value={editPartnerName}
                          onChange={(e) => setEditPartnerName(e.target.value)}
                          placeholder="Ex: Maison Blanche Couture"
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Catégorie</label>
                        <select
                          value={editPartnerCategory}
                          onChange={(e) => setEditPartnerCategory(e.target.value)}
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="Photographes">Photographes</option>
                          <option value="Décoration">Décoration</option>
                          <option value="Robes &amp; Tenues">Robes &amp; Tenues</option>
                          <option value="Traiteurs">Traiteurs</option>
                          <option value="Salles de Réception">Salles de Réception</option>
                          <option value="Location de Voitures">Location de Voitures</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Note Globale (1.0 - 5.0)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="5"
                          required
                          value={editPartnerRating}
                          onChange={(e) => setEditPartnerRating(parseFloat(e.target.value))}
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Téléphone / WhatsApp Prestataire</label>
                        <input
                          type="text"
                          value={editPartnerPhone}
                          onChange={(e) => setEditPartnerPhone(e.target.value)}
                          placeholder="Ex: +225 07 08 09 10 11"
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Email du Prestataire</label>
                        <input
                          type="email"
                          value={editPartnerEmail}
                          onChange={(e) => setEditPartnerEmail(e.target.value)}
                          placeholder="Ex: contact@prestataire.ci"
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Rattaché à la Mairie</label>
                        <select
                          value={editPartnerMairieId || ''}
                          onChange={(e) => setEditPartnerMairieId(e.target.value || null)}
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="">Toutes les mairies (Global)</option>
                          {mairies.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2 text-left">
                        <label className="font-semibold text-slate-700">Image d'illustration</label>
                        <input
                          type="text"
                          value={editPartnerImageUrl}
                          onChange={(e) => setEditPartnerImageUrl(e.target.value)}
                          placeholder="URL de l'image (https://...)"
                          className="w-full border border-neutral-300 rounded-xl px-4 py-2.5 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs"
                        />
                        <label className="w-full py-2 px-3 border border-dashed border-neutral-300 hover:border-primary hover:bg-primary/5 rounded-xl cursor-pointer bg-neutral-50 text-slate-700 flex items-center justify-center gap-1.5 transition-all text-xs font-semibold">
                          <span>📷 Importer un fichier...</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEditPartnerImageUrl(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        {editPartnerImageUrl && (
                          <div className="mt-1 relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 shadow-xs">
                            <img src={editPartnerImageUrl} alt="Aperçu" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditPartnerImageUrl('')}
                              className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] cursor-pointer transition-colors"
                              title="Supprimer l'image"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Description</label>
                        <textarea
                          rows={3}
                          required
                          value={editPartnerDescription}
                          onChange={(e) => setEditPartnerDescription(e.target.value)}
                          placeholder="Présentation des services, formules de prix, etc."
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                      </div>

                      <button
                        type="submit"
                        className="mt-2 w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 shadow-md cursor-pointer transition-colors"
                      >
                        Enregistrer les Modifications
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h3 className="font-serif text-xl font-bold text-slate-800 border-b border-neutral-100 pb-3 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-primary" />
                      Créer un Prestataire
                    </h3>

                    <form onSubmit={handleCreatePartner} className="flex flex-col gap-4 font-sans text-xs">
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Nom du Prestataire</label>
                        <input
                          type="text"
                          required
                          value={newPartnerName}
                          onChange={(e) => setNewPartnerName(e.target.value)}
                          placeholder="Ex: Palais Gourmand"
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Catégorie</label>
                        <select
                          value={newPartnerCategory}
                          onChange={(e) => setNewPartnerCategory(e.target.value)}
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="Photographes">Photographes</option>
                          <option value="Décoration">Décoration</option>
                          <option value="Robes &amp; Tenues">Robes &amp; Tenues</option>
                          <option value="Traiteurs">Traiteurs</option>
                          <option value="Salles de Réception">Salles de Réception</option>
                          <option value="Location de Voitures">Location de Voitures</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Note Globale (1.0 - 5.0)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="5"
                          required
                          value={newPartnerRating}
                          onChange={(e) => setNewPartnerRating(parseFloat(e.target.value))}
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Téléphone / WhatsApp Prestataire</label>
                        <input
                          type="text"
                          value={newPartnerPhone}
                          onChange={(e) => setNewPartnerPhone(e.target.value)}
                          placeholder="Ex: +225 07 08 09 10 11"
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Email du Prestataire</label>
                        <input
                          type="email"
                          value={newPartnerEmail}
                          onChange={(e) => setNewPartnerEmail(e.target.value)}
                          placeholder="Ex: contact@prestataire.ci"
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Rattaché à la Mairie</label>
                        <select
                          value={newPartnerMairieId || ''}
                          onChange={(e) => setNewPartnerMairieId(e.target.value || null)}
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="">Toutes les mairies (Global)</option>
                          {mairies.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2 text-left">
                        <label className="font-semibold text-slate-700">Image d'illustration</label>
                        <input
                          type="text"
                          value={newPartnerImageUrl}
                          onChange={(e) => setNewPartnerImageUrl(e.target.value)}
                          placeholder="URL de l'image (https://...)"
                          className="w-full border border-neutral-300 rounded-xl px-4 py-2.5 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs"
                        />
                        <label className="w-full py-2 px-3 border border-dashed border-neutral-300 hover:border-primary hover:bg-primary/5 rounded-xl cursor-pointer bg-neutral-50 text-slate-700 flex items-center justify-center gap-1.5 transition-all text-xs font-semibold">
                          <span>📷 Importer un fichier...</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setNewPartnerImageUrl(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        {newPartnerImageUrl && (
                          <div className="mt-1 relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 shadow-xs">
                            <img src={newPartnerImageUrl} alt="Aperçu" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setNewPartnerImageUrl('')}
                              className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] cursor-pointer transition-colors"
                              title="Supprimer l'image"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="font-semibold text-slate-700">Description</label>
                        <textarea
                          rows={3}
                          required
                          value={newPartnerDescription}
                          onChange={(e) => setNewPartnerDescription(e.target.value)}
                          placeholder="Présentation des services, formules de prix, etc."
                          className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                      </div>

                      <button
                        type="submit"
                        className="mt-2 w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-container shadow-md shadow-primary/20 cursor-pointer transition-colors"
                      >
                        Valider la Création
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          {superadminActiveTab === 'orders' && (
            <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6 mt-4 w-full text-left">
              <h3 className="font-serif text-xl font-bold text-slate-800 border-b border-neutral-100 pb-3 flex items-center gap-2 select-none">
                <ClipboardList className="w-5 h-5 text-primary" />
                Demandes de Services d'Exception Reçues
              </h3>

              {partnerContacts.length === 0 ? (
                <div className="text-center py-10 bg-neutral-50 rounded-xl border border-neutral-100 p-6 select-none">
                  <p className="font-sans text-secondary text-xs">Aucune commande de service d'exception reçue pour le moment.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-100 text-secondary/70 font-semibold select-none">
                        <th className="py-3 pr-4">Prestataire / Service</th>
                        <th className="py-3 px-4">Futurs Époux</th>
                        <th className="py-3 px-4">Lieu de Célébration</th>
                        <th className="py-3 px-4">Date Demandée</th>
                        <th className="py-3 px-4">Téléphone Client</th>
                        <th className="py-3 px-4 text-center">Statut Dossier</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnerContacts.map((contact) => {
                        const partner = partners.find(p => p.id === contact.partnerId);
                        if (!partner) return null;

                        const activeDossier = dossiers.find(d => d.id === contact.dossierId);
                        const spouseNames = activeDossier ? `${activeDossier.spouse1_name} & ${activeDossier.spouse2_name}` : 'Non renseigné';
                        const dossierCode = contact.dossierId.toUpperCase().replace('DOSSIER_', '');
                        const celebrationMairieId = activeDossier?.mairie_id;
                        const celebrationMairie = mairies.find(m => m.id === celebrationMairieId);
                        const celebrationLieu = celebrationMairie ? celebrationMairie.name : 'Non spécifié';

                        let statusColor = "bg-amber-50 text-amber-700 border-amber-200/50";
                        let statusLabel = "En instruction";
                        if (activeDossier?.status === 'approved' || activeDossier?.status === 'celebrated') {
                          statusColor = "bg-emerald-50 text-emerald-700 border-emerald-250/50";
                          statusLabel = "Approuvé & Transmis";
                        } else if (activeDossier?.status === 'rejected') {
                          statusColor = "bg-red-50 text-red-700 border-red-200/50";
                          statusLabel = "Dossier suspendu";
                        }

                        const formatDateFrench = (dateStr: string | null) => {
                          if (!dateStr) return "Non spécifiée";
                          try {
                            const parts = dateStr.split('-');
                            if (parts.length === 3) {
                              const day = parseInt(parts[2], 10);
                              const monthNum = parseInt(parts[1], 10);
                              const year = parts[0];
                              const months = [
                                "janvier", "février", "mars", "avril", "mai", "juin",
                                "juillet", "août", "septembre", "octobre", "novembre", "décembre"
                              ];
                              const monthName = months[monthNum - 1] || parts[1];
                              return `${day} ${monthName} ${year}`;
                            }
                          } catch (e) { }
                          return dateStr;
                        };

                        return (
                          <tr key={contact.id} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                            <td className="py-4 pr-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={partner.imageUrl}
                                  alt={partner.name}
                                  className="w-10 h-10 object-cover rounded-lg border border-neutral-200 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <span className="font-bold text-slate-850 block">{partner.name}</span>
                                  <span className="text-[10px] text-slate-450">{partner.category}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 font-medium text-slate-700">
                              <div>
                                <span className="block font-bold">{spouseNames}</span>
                                <span className="text-[10px] text-slate-440 font-normal">Code : {dossierCode}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-slate-600 font-semibold">
                              <div className="flex items-center gap-1">
                                <Building className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>{celebrationLieu}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-slate-600 font-medium">
                              {formatDateFrench(contact.date || null)}
                            </td>
                            <td className="py-4 px-4 text-slate-600 font-bold">
                              {contact.phone || 'Non spécifié'}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              {(() => {
                                const pPhone = partner.contactPhone || contact.phone || '';
                                const cleanPPhone = pPhone.replace(/[^0-9]/g, '');
                                const formattedDate = formatDateFrench(activeDossier?.wedding_date || contact.date || null);

                                const waTemplate = `Bonjour ${partner.name}, la plateforme E-Mariage vous informe qu'une demande pour ${partner.category} (${partner.name}) a été effectuée pour le mariage civil de M. & Mme ${spouseNames} prévu le ${formattedDate} à la Mairie de ${celebrationLieu}. Contact des mariés : ${contact.phone || 'non spécifié'}. Merci de confirmer votre disponibilité.`;

                                const targetWaPhone = cleanPPhone.startsWith('225') ? cleanPPhone : cleanPPhone ? '225' + cleanPPhone : '';
                                const waLink = targetWaPhone 
                                  ? `https://wa.me/${targetWaPhone}?text=${encodeURIComponent(waTemplate)}`
                                  : `https://wa.me/?text=${encodeURIComponent(waTemplate)}`;

                                const telLink = pPhone ? `tel:${pPhone}` : `tel:${contact.phone || ''}`;
                                const mailLink = partner.email 
                                  ? `mailto:${partner.email}?subject=${encodeURIComponent('Demande de Prestation E-Mariage - Mariage ' + spouseNames)}&body=${encodeURIComponent(waTemplate)}`
                                  : null;

                                return (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <a
                                      href={waLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs"
                                      title="Notifier le prestataire par WhatsApp (Message pré-rempli)"
                                    >
                                      <span>💬</span>
                                      <span className="hidden sm:inline">WhatsApp</span>
                                    </a>

                                    <a
                                      href={telLink}
                                      className="p-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs"
                                      title={`Appeler le prestataire (${pPhone || 'N/A'})`}
                                    >
                                      <span>📞</span>
                                      <span className="hidden sm:inline">Appeler</span>
                                    </a>

                                    {mailLink && (
                                      <a
                                        href={mailLink}
                                        className="p-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs"
                                        title={`Envoyer un email au prestataire (${partner.email})`}
                                      >
                                        <span>✉️</span>
                                        <span className="hidden sm:inline">Email</span>
                                      </a>
                                    )}

                                    <button
                                      onClick={async () => {
                                        if (confirm(`Êtes-vous sûr de vouloir supprimer la demande pour ${partner.name} ?`)) {
                                          const success = await deletePartnerContactInDb(contact.partnerId, contact.dossierId);
                                          if (success) {
                                            addNotification(`Demande de service pour ${partner.name} supprimée.`, 'success');
                                            logSystemAction(`Super Admin a supprimé la demande pour ${partner.name} (Dossier: ${dossierCode})`, 'admin');
                                            loadData();
                                          } else {
                                            addNotification("Erreur lors de la suppression.", "warning");
                                          }
                                        }
                                      }}
                                      className="p-1 text-red-650 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer ml-1"
                                      title="Supprimer la demande"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {superadminActiveTab === 'finance' && (
            renderSuperadminFinanceView()
          )}

          {superadminActiveTab === 'settings' && (
            <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6 mt-4 w-full text-left">
              <div>
                <h3 className="font-serif text-xl font-bold text-slate-800">Configuration Système &amp; Paiements</h3>
                <p className="font-sans text-xs text-secondary mt-1">
                  Configurez le module de paiement des droits de timbre fiscaux municipaux. Vous pouvez relier votre compte Paystack officiel ou utiliser les modes de paiement locaux ivoiriens en simulation.
                </p>
              </div>

              <form onSubmit={handleSavePaystackConfig} className="flex flex-col gap-6 font-sans text-xs w-full max-w-3xl">
                {/* Mode de Fonctionnement Card */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-4 text-left">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" />
                    Mode de Fonctionnement
                  </h4>
                  <div className="flex gap-2 p-1 bg-neutral-200/50 rounded-lg w-fit">
                    {(['test', 'live'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaystackMode(mode)}
                        className={`px-4 py-2 rounded-md font-bold transition-all cursor-pointer ${paystackMode === mode
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        {mode === 'test' ? '🧪 Mode Test / Simulation' : '🚀 Mode Réel / Production'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    * Le mode Test simule des transactions réalistes sans débit réel, parfait pour les démonstrations de guichet municipal. Le mode Réel utilise de véritables passerelles de paiement.
                  </p>
                </div>

                {/* API Credentials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="font-semibold text-slate-700">Clé Publique Paystack (Public Key)</label>
                    <input
                      type="text"
                      value={paystackPubKey}
                      onChange={(e) => setPaystackPubKey(e.target.value)}
                      placeholder="pk_test_..."
                      className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="font-semibold text-slate-700">Clé Secrète Paystack (Secret Key)</label>
                    <input
                      type="password"
                      value={paystackSecKey}
                      onChange={(e) => setPaystackSecKey(e.target.value)}
                      placeholder="sk_test_..."
                      className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Tax & Fee parameters */}
                <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col gap-4 text-left">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 font-serif">
                    <Landmark className="w-4 h-4 text-primary" />
                    Tarification des Frais &amp; Droit de Timbre (Réglables depuis l'Admin)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="font-semibold text-slate-700 text-xs">Devise de Facturation</label>
                      <select
                        value={paystackCurrency}
                        onChange={(e) => setPaystackCurrency(e.target.value)}
                        className="border border-neutral-350 rounded-xl px-4 py-2.5 bg-white focus:border-primary focus:outline-none cursor-pointer font-medium text-xs"
                      >
                        <option value="XOF">XOF (Franc CFA de l'Afrique de l'Ouest)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="USD">USD (Dollar US)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="font-semibold text-slate-700 text-xs">1. Frais Plateforme En Ligne (Citoyen)*</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          value={paystackAmount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setPaystackAmount(val);
                            setParamReservationPrice(val);
                          }}
                          placeholder="2500"
                          className="w-full border border-neutral-350 rounded-xl pl-4 pr-12 py-2.5 bg-white focus:border-primary focus:outline-none font-bold text-emerald-700 text-xs shadow-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">FCFA</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Droits d'instruction réglés en ligne à l'Étape 8 (défaut : 2 500 FCFA)</p>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="font-semibold text-slate-700 text-xs">2. Droits Caisse Municipale (Physique)*</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          value={paramTimbrePrice}
                          onChange={(e) => setParamTimbrePrice(parseInt(e.target.value) || 0)}
                          placeholder="100000"
                          className="w-full border border-neutral-350 rounded-xl pl-4 pr-12 py-2.5 bg-white focus:border-primary focus:outline-none font-bold text-purple-700 text-xs shadow-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">FCFA</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Droits de célébration émis sur le Bulletin de Caisse à la Mairie (défaut : 100 000 FCFA)</p>
                    </div>
                  </div>
                </div>

                {/* Toggles for payment methods */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-4 text-left">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-primary" />
                    Canaux de Paiement Activés
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-2">
                    {/* Wave */}
                    <label className="flex items-center justify-between p-3.5 bg-white border border-neutral-200 rounded-xl cursor-pointer hover:border-primary/50 transition-all select-none">
                      <span className="font-bold text-slate-850 flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-cyan-500 shrink-0" />
                        Wave Mobile Money
                      </span>
                      <input
                        type="checkbox"
                        checked={paystackWave}
                        onChange={(e) => setPaystackWave(e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </label>

                    {/* Orange */}
                    <label className="flex items-center justify-between p-3.5 bg-white border border-neutral-200 rounded-xl cursor-pointer hover:border-primary/50 transition-all select-none">
                      <span className="font-bold text-slate-850 flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-orange-500 shrink-0" />
                        Orange Money
                      </span>
                      <input
                        type="checkbox"
                        checked={paystackOrange}
                        onChange={(e) => setPaystackOrange(e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </label>

                    {/* MTN */}
                    <label className="flex items-center justify-between p-3.5 bg-white border border-neutral-200 rounded-xl cursor-pointer hover:border-primary/50 transition-all select-none">
                      <span className="font-bold text-slate-850 flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-yellow-500 shrink-0" />
                        MTN Mobile Money
                      </span>
                      <input
                        type="checkbox"
                        checked={paystackMtn}
                        onChange={(e) => setPaystackMtn(e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </label>

                    {/* Moov */}
                    <label className="flex items-center justify-between p-3.5 bg-white border border-neutral-200 rounded-xl cursor-pointer hover:border-primary/50 transition-all select-none">
                      <span className="font-bold text-slate-850 flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shrink-0" />
                        Moov Money
                      </span>
                      <input
                        type="checkbox"
                        checked={paystackMoov}
                        onChange={(e) => setPaystackMoov(e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </label>

                    {/* Cards */}
                    <label className="flex items-center justify-between p-3.5 bg-white border border-neutral-200 rounded-xl cursor-pointer hover:border-primary/50 transition-all select-none">
                      <span className="font-bold text-slate-850 flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-slate-700 shrink-0" />
                        Cartes (Visa / Mastercard)
                      </span>
                      <input
                        type="checkbox"
                        checked={paystackCard}
                        onChange={(e) => setPaystackCard(e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Configuration des Notifications */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-4 text-left">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-primary" />
                    Notifications Automatiques Citoyens
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-1">
                    Configurez les canaux d'alertes automatiques pour informer les mariés en temps réel de l'instruction et de la célébration civile.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-1">
                    {/* WhatsApp */}
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 flex flex-col gap-3.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-850 flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
                          Notifications WhatsApp (SMS)
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={enableWhatsappNotifs}
                            onChange={(e) => setEnableWhatsappNotifs(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      {enableWhatsappNotifs && (
                        <div className="flex flex-col gap-2.5 pt-1.5 border-t border-slate-100 animate-fade-in">
                          <div className="flex flex-col gap-1">
                            <label className="font-semibold text-slate-600 text-[10px]">URL du serveur OpenWA</label>
                            <input
                              type="text"
                              value={whatsappServerUrl}
                              onChange={(e) => setWhatsappServerUrl(e.target.value)}
                              placeholder="https://84.234.99.41.sslip.io"
                              className="border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:border-primary focus:outline-none text-[10.5px]"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="font-semibold text-slate-600 text-[10px]">Clé API OpenWA (X-API-Key)</label>
                            <input
                              type="password"
                              value={whatsappToken}
                              onChange={(e) => setWhatsappToken(e.target.value)}
                              placeholder="Entrez votre clé API OpenWA"
                              className="border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:border-primary focus:outline-none font-mono text-[10.5px]"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="font-semibold text-slate-600 text-[10px]">ID / Nom de Session WhatsApp</label>
                            <input
                              type="text"
                              value={whatsappPhoneId}
                              onChange={(e) => setWhatsappPhoneId(e.target.value)}
                              placeholder="vmarig ou UUID de session"
                              className="border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:border-primary focus:outline-none text-[10.5px]"
                            />
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              * Les messages seront expédiés via la session OpenWA connectée.
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={isTestingWhatsapp}
                            onClick={handleTestWhatsapp}
                            className="mt-1.5 py-2 px-4 border border-emerald-500 text-emerald-600 font-bold rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5 self-start text-[10.5px]"
                          >
                            {isTestingWhatsapp ? 'Envoi du test...' : '🧪 Envoyer un message de test'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 flex flex-col gap-3.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-850 flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 shrink-0" />
                          Notifications E-mail
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={enableEmailNotifs}
                            onChange={(e) => setEnableEmailNotifs(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      {enableEmailNotifs && (
                        <div className="flex flex-col gap-2.5 pt-1.5 border-t border-slate-100 animate-fade-in">
                          <div className="flex flex-col gap-1">
                            <label className="font-semibold text-slate-600 text-[10px]">Clé API de messagerie (ex: Resend API Key)</label>
                            <input
                              type="password"
                              value={emailApiKey}
                              onChange={(e) => setEmailApiKey(e.target.value)}
                              placeholder="re_..."
                              className="border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:border-primary focus:outline-none font-mono text-[10.5px]"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="font-semibold text-slate-600 text-[10px]">Adresse E-mail Expéditeur (Sender)</label>
                            <input
                              type="email"
                              value={emailSender}
                              onChange={(e) => setEmailSender(e.target.value)}
                              placeholder="noreply@e-mariage.ci"
                              className="border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:border-primary focus:outline-none text-[10.5px]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Journal d'envoi des notifications */}
                <div className="p-5 bg-white border border-slate-200 rounded-xl flex flex-col gap-4 text-left">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-primary" />
                      Journal d'Envoi des Notifications
                    </h4>
                    <button
                      type="button"
                      onClick={async () => {
                        await clearSentNotificationsLog();
                        setNotificationLogs([]);
                        addNotification("Journal des notifications vidé avec succès !", "info");
                      }}
                      className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer"
                    >
                      Effacer l'historique
                    </button>
                  </div>

                  {notificationLogs.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Aucune notification envoyée pour le moment. Initialisez un dossier ou effectuez un paiement pour générer des alertes.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[250px] overflow-y-auto pr-1">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-250 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Destinataire</th>
                            <th className="py-2.5 px-3">Message</th>
                            <th className="py-2.5 px-3">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[10.5px]">
                          {notificationLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{log.date}</td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${log.type === 'whatsapp'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-250/50'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-250/50'
                                  }`}>
                                  {log.type.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">{log.recipient}</td>
                              <td className="py-2.5 px-3 text-slate-600 min-w-[200px]">{log.content}</td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${log.status === 'sent'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : log.status === 'failed'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                  {log.status === 'sent' ? 'Envoyé' : log.status === 'failed' ? 'Échoué (Sans clé)' : 'En attente'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    className="py-3 px-8 bg-primary text-white font-semibold rounded-xl hover:bg-primary-container shadow-md shadow-primary/20 cursor-pointer transition-colors"
                  >
                    Sauvegarder la Configuration Timbre &amp; Systèmes
                  </button>
                </div>
              </form>

              {/* AI CONFIGURATION SECTION */}
              <div className="border-t border-neutral-200 mt-8 pt-8">
                <h3 className="font-serif text-xl font-bold text-slate-800">Configuration de l'Intelligence Artificielle</h3>
                <p className="font-sans text-xs text-secondary mt-1 mb-6">
                  Configurez les clés API et personnalisez les prompts système pour la sécurité (Nemotron), l'analyse automatique des pièces (OpenRouter &amp; Mistral), la vérification internet (Tavily &amp; Groq) et l'Adjointe d'Honneur FAQ (Groq).
                </p>
                
                <form onSubmit={handleSaveAiConfig} className="flex flex-col gap-6 font-sans text-xs w-full max-w-4xl">
                  {/* API Credentials */}
                  <div className="p-6 bg-white border border-neutral-200/80 rounded-2xl flex flex-col gap-5 text-left shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 font-serif border-b border-slate-100 pb-3 mb-1">
                      <Key className="w-4 h-4 text-[#c5a368] shrink-0" />
                      Clés d'Accès API des Fournisseurs LLM &amp; Services de Vérification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {/* OpenRouter */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700 text-xs">Clé API OpenRouter (Secours Vision)*</label>
                        <div className="relative">
                          <input
                            type={showApiKeys.gemini ? "text" : "password"}
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="sk-or-v1-..."
                            className="w-full border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-[#c5a368] focus:ring-2 focus:ring-[#c5a368]/10 focus:outline-none font-mono text-xs shadow-sm transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => toggleKeyVisibility('gemini')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showApiKeys.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Mistral */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700 text-xs">Clé API Mistral (Vision HD &amp; Originalité)</label>
                        <div className="relative">
                          <input
                            type={showApiKeys.mistral ? "text" : "password"}
                            value={mistralKey}
                            onChange={(e) => setMistralKey(e.target.value)}
                            placeholder="Entrez votre clé API Mistral"
                            className="w-full border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-[#c5a368] focus:ring-2 focus:ring-[#c5a368]/10 focus:outline-none font-mono text-xs shadow-sm transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => toggleKeyVisibility('mistral')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showApiKeys.mistral ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Groq */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700 text-xs">Clé API Groq LPU (Contrôle Rapide &amp; Anti-Fraude)</label>
                        <div className="relative">
                          <input
                            type={showApiKeys.groq ? "text" : "password"}
                            value={groqKey}
                            onChange={(e) => setGroqKey(e.target.value)}
                            placeholder="gsk_..."
                            className="w-full border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-[#c5a368] focus:ring-2 focus:ring-[#c5a368]/10 focus:outline-none font-mono text-xs shadow-sm transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => toggleKeyVisibility('groq')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showApiKeys.groq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* GLM-OCR / Z.AI */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700 text-xs">Clé API GLM-OCR / Z.AI (Vision &amp; OCR)</label>
                        <div className="relative">
                          <input
                            type={showApiKeys.glm ? "text" : "password"}
                            value={glmKey}
                            onChange={(e) => setGlmKey(e.target.value)}
                            placeholder="Clé API GLM / Z.AI..."
                            className="w-full border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-[#c5a368] focus:ring-2 focus:ring-[#c5a368]/10 focus:outline-none font-mono text-xs shadow-sm transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => toggleKeyVisibility('glm')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showApiKeys.glm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Tavily */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700 text-xs">Clé API Tavily (Vérification Web Mairies)</label>
                        <div className="relative">
                          <input
                            type={showApiKeys.tavily ? "text" : "password"}
                            value={tavilyKey}
                            onChange={(e) => setTavilyKey(e.target.value)}
                            placeholder="tvly-..."
                            className="w-full border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-[#c5a368] focus:ring-2 focus:ring-[#c5a368]/10 focus:outline-none font-mono text-xs shadow-sm transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => toggleKeyVisibility('tavily')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showApiKeys.tavily ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Biometrics Engine Selector */}
                    <div className="border-t border-slate-100 pt-5 mt-3 text-left">
                      <h5 className="font-bold text-slate-800 text-xs mb-4 flex items-center gap-2 font-serif">
                        <Users className="w-4 h-4 text-[#c5a368] shrink-0" />
                        Moteur de Biométrie &amp; Contrôle Facial (Matching + Liveness)
                      </h5>
                      
                      <div className="flex flex-col gap-4 mb-5">
                        <div className="flex flex-col gap-1.5 md:w-1/2">
                          <label className="font-semibold text-slate-700 text-xs">Moteur de reconnaissance faciale principal</label>
                          <select
                            value={useDeepFace ? "deepface" : "facepp"}
                            onChange={(e) => setUseDeepFace(e.target.value === "deepface")}
                            className="w-full border border-neutral-300 rounded-xl px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-[#c5a368] focus:ring-2 focus:ring-[#c5a368]/10 focus:outline-none font-sans text-xs text-slate-800 shadow-sm transition-all"
                          >
                            <option value="facepp">Face++ (Cloud externe)</option>
                            <option value="deepface">DeepFace (Souverain local / Coolify) - Avec Liveness</option>
                          </select>
                        </div>
                      </div>

                      {!useDeepFace ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Conjoint group */}
                          <div className="p-4 bg-slate-50/55 rounded-xl border border-slate-100 flex flex-col gap-4">
                            <span className="font-semibold text-[#c5a368] text-xs">Informations Époux (Conjoint)</span>
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="font-semibold text-slate-700 text-[10px]">API Key Face++ (Époux)</label>
                                <div className="relative">
                                  <input
                                    type={showApiKeys.faceKeyEpoux ? "text" : "password"}
                                    value={faceAPIKeyEpoux}
                                    onChange={(e) => setFaceAPIKeyEpoux(e.target.value)}
                                    placeholder="Face++ API Key"
                                    className="w-full border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 bg-white focus:border-[#c5a368] focus:ring-2 focus:ring-[#c5a368]/10 focus:outline-none font-mono text-xs shadow-sm transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility('faceKeyEpoux')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                  >
                                    {showApiKeys.faceKeyEpoux ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="font-semibold text-slate-700 text-[10px]">API Secret Face++ (Époux)</label>
                                <div className="relative">
                                  <input
                                    type={showApiKeys.faceSecretEpoux ? "text" : "password"}
                                    value={faceAPISecretEpoux}
                                    onChange={(e) => setFaceAPISecretEpoux(e.target.value)}
                                    placeholder="Face++ API Secret"
                                    className="w-full border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 bg-white focus:border-[#c5a368] focus:ring-2 focus:ring-[#c5a368]/10 focus:outline-none font-mono text-xs shadow-sm transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility('faceSecretEpoux')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                  >
                                    {showApiKeys.faceSecretEpoux ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Conjointe group */}
                          <div className="p-4 bg-slate-50/55 rounded-xl border border-slate-100 flex flex-col gap-4">
                            <span className="font-semibold text-[#c5a368] text-xs">Informations Épouse (Conjointe)</span>
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="font-semibold text-slate-700 text-[10px]">API Key Face++ (Épouse)</label>
                                <div className="relative">
                                  <input
                                    type={showApiKeys.faceKeyEpouse ? "text" : "password"}
                                    value={faceAPIKeyEpouse}
                                    onChange={(e) => setFaceAPIKeyEpouse(e.target.value)}
                                    placeholder="Face++ API Key"
                                    className="w-full border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 bg-white focus:border-[#c5a368] focus:ring-2 focus:ring-[#c5a368]/10 focus:outline-none font-mono text-xs shadow-sm transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility('faceKeyEpouse')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                  >
                                    {showApiKeys.faceKeyEpouse ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="font-semibold text-slate-700 text-[10px]">API Secret Face++ (Épouse)</label>
                                <div className="relative">
                                  <input
                                    type={showApiKeys.faceSecretEpouse ? "text" : "password"}
                                    value={faceAPISecretEpouse}
                                    onChange={(e) => setFaceAPISecretEpouse(e.target.value)}
                                    placeholder="Face++ API Secret"
                                    className="w-full border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 bg-white focus:border-[#c5a368] focus:ring-2 focus:ring-[#c5a368]/10 focus:outline-none font-mono text-xs shadow-sm transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility('faceSecretEpouse')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                  >
                                    {showApiKeys.faceSecretEpouse ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50/55 rounded-xl border border-slate-100 flex flex-col gap-4">
                          <span className="font-semibold text-[#c5a368] text-xs">Configuration de l'API Souveraine DeepFace</span>
                          <div className="flex flex-col gap-1.5 md:w-2/3">
                            <label className="font-semibold text-slate-700 text-[10px]">URL de l'API DeepFace (Coolify)*</label>
                            <input
                              type="text"
                              value={deepFaceApiUrl}
                              onChange={(e) => setDeepFaceApiUrl(e.target.value)}
                              placeholder="Ex: http://r8dqp05xpng1xidux3r4bu77.193.29.187.66.sslip.io"
                              className="w-full border border-neutral-300 rounded-xl px-4 py-2.5 bg-white focus:border-[#c5a368] focus:ring-2 focus:ring-[#c5a368]/10 focus:outline-none font-mono text-xs shadow-sm"
                              required={useDeepFace}
                            />
                            <p className="text-[9px] text-slate-400 mt-1">
                              L'API DeepFace intègre à la fois la comparaison faciale (Matching ArcFace) et la détection passive de vivacité (Liveness Anti-Spoofing).
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Planification des RDV */}
                    <div className="border-t border-slate-100 pt-5 mt-3 text-left">
                      <h5 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-2 font-serif">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        Planification &amp; Équilibrage Dynamique des Rendez-vous
                      </h5>
                      <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl flex flex-col gap-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <span>✨ Algorithme d'Équilibrage Automatique (Mairie de Marcory)</span>
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Actif • Fenêtre J-30 à J-10
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Les dates de rendez-vous physiques sont automatiquement attribuées et réparties sans saturation sur la fenêtre légale (entre <strong>30 jours</strong> et <strong>10 jours avant le mariage civil</strong>), en fonction du <strong>Quota journalier de RDV physiques</strong> configuré ci-dessous.
                        </p>
                      </div>
                    </div>

                    {/* Architecture Dynamique des Moteurs d'IA (Paramètres Système) */}
                    <div className="border-t border-slate-100 pt-5 mt-3 text-left">
                      <h5 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-2 font-serif">
                        <Cpu className="w-4 h-4 text-primary shrink-0" />
                        Sélection des Moteurs IA &amp; Contrôle (Paramétrage Système)
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/50 border border-slate-200/80 rounded-2xl">
                        {/* Vision Engine Selector */}
                        <div className="flex flex-col gap-2 p-4 bg-white rounded-xl border border-slate-200/70 shadow-sm">
                          <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <span className="text-base">👁️</span>
                            <span>Moteur OCR Vision Principal (CNI / Passeport / Extrait)</span>
                          </label>
                          <select
                            value={primaryOcrEngine}
                            onChange={(e) => setPrimaryOcrEngine(e.target.value as any)}
                            className="w-full border border-neutral-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-[#c5a368] focus:outline-none text-xs font-semibold text-slate-800"
                          >
                            <option value="glm-ocr">🏆 GLM-OCR (Z.AI - Layout Parsing API)</option>
                            <option value="mistral-vision">🇫🇷 Mistral Vision (Pixtral Large &amp; 12B Direct API)</option>
                            <option value="openrouter-vision">🌐 OpenRouter Vision (Rotations Gemini / Qwen / Llama)</option>
                          </select>
                          <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                            Lit et extrait automatiquement les pièces d'identité HD, le nom, les prénoms, la date d'expiration et détecte l'originalité.
                          </p>
                        </div>

                        {/* Fast Check Engine Selector */}
                        <div className="flex flex-col gap-2 p-4 bg-white rounded-xl border border-slate-200/70 shadow-sm">
                          <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <span className="text-base">⚡</span>
                            <span>Moteur de Contrôle Rapide (Double-Check Identité)</span>
                          </label>
                          <select
                            value={fastCheckEngine}
                            onChange={(e) => setFastCheckEngine(e.target.value as any)}
                            className="w-full border border-neutral-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-[#c5a368] focus:outline-none text-xs font-semibold text-slate-800"
                          >
                            <option value="internal-script">⚙️ Script Interne Programme (Instantatif 0ms, 0$ - Recommandé)</option>
                            <option value="groq-lpu">⚡ Groq LPU (Llama 3.3 70B - &lt; 0.5s via API Groq)</option>
                            <option value="disabled">❌ Désactivé (Confiance 100% au moteur Vision)</option>
                          </select>
                          <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                            Effectue une validation croisée instantanée entre les informations lues sur le document et la déclaration du citoyen.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Active Learning & GLM-OCR Fine-Tuning Dataset Section */}
                    <div className="border-t border-slate-100 pt-5 mt-3 text-left">
                      <h5 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-2 font-serif">
                        <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                        Apprentissage Continu &amp; Dataset GLM-OCR (Fine-Tuning Souverain)
                      </h5>
                      <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-emerald-900 text-xs flex items-center gap-2">
                            <span>🧠 Boucle de Rétroaction Active</span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-mono">
                              {getOcrFeedbackDataset().length} Échantillons Validés
                            </span>
                          </span>
                          <p className="text-[10px] text-emerald-700 leading-relaxed max-w-xl">
                            Chaque acte de naissance et CNI validé alimente automatiquement un jeu de données souverain ivoirien. Les exemples validés sont réinjectés dynamiquement en Few-Shot Learning dans GLM-OCR sans aucun ralentissement.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => exportOcrDatasetJsonl()}
                            className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer transition-colors text-[11px] flex items-center gap-1.5 shadow-sm"
                          >
                            <span>📥 Exporter Dataset (JSONL Zhipu)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Réinitialiser le jeu de données d'apprentissage ?")) {
                                clearOcrFeedbackDataset();
                                alert("Dataset réinitialisé.");
                                window.location.reload();
                              }
                            }}
                            className="py-2 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-medium rounded-xl cursor-pointer transition-colors text-[11px]"
                          >
                            <span>🗑️ Vider</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Diagnostics Section */}
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-4 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                      <div>
                          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-primary shrink-0" />
                            Diagnostic &amp; Test des Connexions IA
                          </h4>
                          <p className="text-[10px] text-secondary mt-0.5">
                            Testez en temps réel la validité et la réactivité de vos clés API OpenRouter, Mistral et Groq.
                          </p>
                        </div>
                      <button
                        type="button"
                        onClick={handleTestAiConnectivities}
                        disabled={isTestingAi}
                        className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg cursor-pointer transition-colors text-[10px] flex items-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
                      >
                        {isTestingAi ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Tests en cours...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            Tester les Connexions IA
                          </>
                        )}
                      </button>
                    </div>

                    {aiTestResults ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mt-1 font-sans text-xs">
                        {/* GLM-OCR / Z.AI Result */}
                        {aiTestResults.glm && (
                          <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                            aiTestResults.glm.status === 'testing'
                              ? 'bg-amber-50/30 border-amber-200/50'
                              : aiTestResults.glm.status === 'success'
                              ? 'bg-emerald-50/30 border-emerald-250/50'
                              : 'bg-rose-50/30 border-rose-250/50'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">GLM-OCR / Z.AI</span>
                              {aiTestResults.glm.status === 'testing' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                              ) : aiTestResults.glm.status === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                              )}
                            </div>
                            <p className="text-[10px] text-secondary/80 font-medium">
                              Rôle : Moteur OCR Vision HD &amp; extraction
                            </p>
                            {aiTestResults.glm.message && (
                              <div className={`text-[10px] font-mono p-1.5 rounded-lg border mt-1 leading-relaxed break-all ${
                                aiTestResults.glm.status === 'success'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
                                  : 'bg-rose-500/10 border-rose-500/20 text-rose-800'
                              }`}>
                                {aiTestResults.glm.message}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mistral Vision Result */}
                        <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                          aiTestResults.mistral.status === 'testing'
                            ? 'bg-amber-50/30 border-amber-200/50'
                            : aiTestResults.mistral.status === 'success'
                            ? 'bg-emerald-50/30 border-emerald-250/50'
                            : 'bg-rose-50/30 border-rose-250/50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">Mistral Vision (Pixtral)</span>
                            {aiTestResults.mistral.status === 'testing' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                            ) : aiTestResults.mistral.status === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                            )}
                          </div>
                          <p className="text-[10px] text-secondary/80 font-medium">
                            Rôle : Vision HD &amp; originalité
                          </p>
                          {aiTestResults.mistral.message && (
                            <div className={`text-[10px] font-mono p-1.5 rounded-lg border mt-1 leading-relaxed break-all ${
                              aiTestResults.mistral.status === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-800'
                            }`}>
                              {aiTestResults.mistral.message}
                            </div>
                          )}
                        </div>

                        {/* Groq LPU Result */}
                        <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                          aiTestResults.groq.status === 'testing'
                            ? 'bg-amber-50/30 border-amber-200/50'
                            : aiTestResults.groq.status === 'success'
                            ? 'bg-emerald-50/30 border-emerald-250/50'
                            : 'bg-rose-50/30 border-rose-250/50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">Groq LPU (LLaMA 3.3)</span>
                            {aiTestResults.groq.status === 'testing' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                            ) : aiTestResults.groq.status === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                            )}
                          </div>
                          <p className="text-[10px] text-secondary/80 font-medium">
                            Rôle : Contrôle rapide &amp; Clara
                          </p>
                          {aiTestResults.groq.message && (
                            <div className={`text-[10px] font-mono p-1.5 rounded-lg border mt-1 leading-relaxed break-all ${
                              aiTestResults.groq.status === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-800'
                            }`}>
                              {aiTestResults.groq.message}
                            </div>
                          )}
                        </div>

                        {/* Tavily Result */}
                        <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                          aiTestResults.tavily.status === 'testing'
                            ? 'bg-amber-50/30 border-amber-200/50'
                            : aiTestResults.tavily.status === 'success'
                            ? 'bg-emerald-50/30 border-emerald-250/50'
                            : 'bg-rose-50/30 border-rose-250/50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">Tavily Search</span>
                            {aiTestResults.tavily.status === 'testing' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                            ) : aiTestResults.tavily.status === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                            )}
                          </div>
                          <p className="text-[10px] text-secondary/80 font-medium">
                            Rôle : Recherche web de vérification d'état civil
                          </p>
                          {aiTestResults.tavily.message && (
                            <div className={`text-[10px] font-mono p-1.5 rounded-lg border mt-1 leading-relaxed break-all ${
                              aiTestResults.tavily.status === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-800'
                            }`}>
                              {aiTestResults.tavily.message}
                            </div>
                          )}
                        </div>

                        {/* DeepFace Biometrics Result */}
                        {aiTestResults.deepFace && (
                          <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                            aiTestResults.deepFace.status === 'testing'
                              ? 'bg-amber-50/30 border-amber-200/50'
                              : aiTestResults.deepFace.status === 'success'
                              ? 'bg-emerald-50/30 border-emerald-250/50'
                              : 'bg-rose-50/30 border-rose-250/50'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">DeepFace &amp; Liveness</span>
                              {aiTestResults.deepFace.status === 'testing' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                              ) : aiTestResults.deepFace.status === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                              )}
                            </div>
                            <p className="text-[10px] text-secondary/80 font-medium">
                              Rôle : Reconnaissance faciale &amp; anti-spoofing
                            </p>
                            {aiTestResults.deepFace.message && (
                              <div className={`text-[10px] font-mono p-1.5 rounded-lg border mt-1 leading-relaxed break-all ${
                                aiTestResults.deepFace.status === 'success'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
                                  : 'bg-rose-500/10 border-rose-500/20 text-rose-800'
                              }`}>
                                {aiTestResults.deepFace.message}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">
                        Cliquez sur le bouton pour lancer le test de diagnostic de connectivité.
                      </p>
                    )}
                  </div>

                  {/* Custom Prompts fields */}
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-4 text-left">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      Configuration des Prompts Système (IA)
                    </h4>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700">
                          1. Prompt Principal - Extraction &amp; Analyse CNI/Actes ({primaryOcrEngine === 'glm-ocr' ? 'GLM-OCR / Z.AI' : primaryOcrEngine === 'mistral-vision' ? 'Mistral Vision' : 'OpenRouter Vision'})
                        </label>
                        <textarea
                          rows={6}
                          value={promptPrincipal}
                          onChange={(e) => setPromptPrincipal(e.target.value)}
                          className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none font-mono text-[10px]"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700">
                          2. Prompt Anti-Doublon - Comparaison de documents ({primaryOcrEngine === 'glm-ocr' ? 'GLM-OCR / Z.AI' : primaryOcrEngine === 'mistral-vision' ? 'Mistral Vision' : 'OpenRouter Vision'})
                        </label>
                        <textarea
                          rows={6}
                          value={promptAntiDoublon}
                          onChange={(e) => setPromptAntiDoublon(e.target.value)}
                          className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none font-mono text-[10px]"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700">
                          3. Prompt Double-Vérification - Cohérence d'identité ({fastCheckEngine === 'internal-script' ? 'Script Interne Programme 0ms' : fastCheckEngine === 'groq-lpu' ? 'Groq LPU (LLaMA 3.3)' : 'Désactivé'})
                        </label>
                        <textarea
                          rows={6}
                          value={promptDoubleVerification}
                          onChange={(e) => setPromptDoubleVerification(e.target.value)}
                          className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none font-mono text-[10px]"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700">4. Prompt FAQ - Concierge Citoyen Clara (Groq LLaMA 3.3)</label>
                        <textarea
                          rows={6}
                          value={promptFaq}
                          onChange={(e) => setPromptFaq(e.target.value)}
                          className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none font-mono text-[10px]"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700">5. Prompt Nemotron Safety - Filtre de Sécurité Initiale (NVIDIA Nemotron 3.5)</label>
                        <textarea
                          rows={6}
                          value={promptNemotronSafety}
                          onChange={(e) => setPromptNemotronSafety(e.target.value)}
                          className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none font-mono text-[10px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="py-3 px-8 bg-primary text-white font-semibold rounded-xl hover:bg-primary-container shadow-md shadow-primary/20 cursor-pointer transition-colors"
                    >
                      Enregistrer les Paramètres IA &amp; Prompts
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* -------------------- MAIRIE AGENT VIEW -------------------- */}
      {currentRole === 'mairie' && (
        <>
          {/* LOCKED PORTAL SCREEN */}
          {mairieUnlockedId !== activeMairieId ? (
            <div className="max-w-md mx-auto w-full py-8 text-center flex flex-col gap-6 items-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold text-slate-900">Portail Officier d'État Civil</h2>
                <p className="font-sans text-xs text-secondary mt-1.5 leading-relaxed">
                  Sélectionnez votre mairie et saisissez son code d'accès pour déverrouiller la gestion des célébrations locales.
                </p>
              </div>

              <form onSubmit={handleUnlockPortal} className="w-full glass-card p-6 md:p-8 rounded-2xl border border-neutral-250 flex flex-col gap-4 text-xs font-sans shadow-lg">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="font-bold text-slate-700">Sélectionner votre mairie :</label>
                  <select
                    value={activeMairieId}
                    onChange={(e) => {
                      setActiveMairieId(e.target.value);
                      setUnlockError(null);
                    }}
                    className="border border-neutral-300 rounded-xl px-4 py-3 bg-white font-medium focus:border-primary focus:outline-none cursor-pointer text-xs"
                  >
                    {dropdownMairies.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="font-bold text-slate-700">Saisir le Code d'accès :</label>
                  <input
                    type="password"
                    required
                    value={accessCodeInput}
                    onChange={(e) => {
                      setAccessCodeInput(e.target.value);
                      setUnlockError(null);
                    }}
                    placeholder="Code secret de la commune"
                    className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none text-xs"
                  />
                </div>

                {unlockError && (
                  <p className="text-rose-600 font-bold text-[11px] text-left flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {unlockError}
                  </p>
                )}

                <button
                  type="submit"
                  className="mt-2 w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-container shadow-md shadow-primary/20 cursor-pointer transition-colors text-xs flex items-center justify-center gap-1.5"
                >
                  <Unlock className="w-4 h-4" />
                  Déverrouiller le portail
                </button>
              </form>

              <div className="text-[10px] text-slate-400 max-w-[280px]">
                <p>*(Les codes d'accès initiaux sont configurés par le Super Administrateur National. Ex: COCODY2026)*</p>
              </div>
            </div>
          ) : (
            /* UNLOCKED PORTAL CONTENT */
            <>
              {/* Header Mairie & Selector */}
              <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-6 w-full">
                <div>
                  <h2 className="font-serif text-3xl font-bold text-slate-900 flex items-center gap-2">
                    <Landmark className="w-8 h-8 text-primary" />
                    Portail Civil : {activeMairie ? activeMairie.name : 'Mairie'}
                  </h2>
                  <p className="font-sans text-xs text-secondary mt-1">
                    {activeMairie ? activeMairie.region : ''} • Gestion des célébrations locales • Connecté.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 font-sans text-xs">
                  <div className="flex flex-col gap-1 text-left">
                    <label className="font-bold text-slate-700">Changer de commune :</label>
                    <select
                      value={activeMairieId}
                      onChange={(e) => setActiveMairieId(e.target.value)}
                      className="border border-neutral-300 rounded-xl px-4 py-2 bg-white font-medium focus:border-primary focus:outline-none cursor-pointer"
                    >
                      {dropdownMairies.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={loadData}
                    className="border border-neutral-300 hover:bg-neutral-50 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1.5 self-end bg-white"
                    title="Actualiser les données"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    Actualiser
                  </button>

                  <button
                    onClick={handleLockPortal}
                    className="border border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 px-3.5 py-2.5 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1.5 self-end bg-white"
                    title="Verrouiller le portail"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Verrouiller
                  </button>
                </div>
              </section>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-secondary/70 text-[10px] font-bold uppercase tracking-wider block">Total Dossiers</span>
                    <span className="font-serif text-2xl font-bold text-slate-800">{mairieDossiersCount}</span>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-secondary/70 text-[10px] font-bold uppercase tracking-wider block">À réviser</span>
                    <span className="font-serif text-2xl font-bold text-slate-800">{pendingReviewCount}</span>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-secondary/70 text-[10px] font-bold uppercase tracking-wider block">Approuvés / Prêts</span>
                    <span className="font-serif text-2xl font-bold text-slate-800">{approvedDossiersCount}</span>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-secondary/70 text-[10px] font-bold uppercase tracking-wider block">Célébrés</span>
                    <span className="font-serif text-2xl font-bold text-slate-800">{celebratedDossiersCount}</span>
                  </div>
                </div>
              </div>

              {/* Analytics section for Mairie Agent */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                {/* Circular Progress rate of approval */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm flex flex-col gap-6 text-left">
                  <div>
                    <h3 className="font-serif text-base font-bold text-slate-800">
                      Taux de Traitement Civil
                    </h3>
                    <p className="font-sans text-[11px] text-slate-400">Proportion des dossiers finalisés (approuvés &amp; célébrés).</p>
                  </div>

                  {(() => {
                    const total = mairieDossiersCount;
                    const closed = approvedDossiersCount + celebratedDossiersCount;
                    const pctClosed = total > 0 ? Math.round((closed / total) * 100) : 0;

                    const radius = 38;
                    const circumference = 2 * Math.PI * radius;

                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-6 justify-around py-2">
                        <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                          <svg width="128" height="128" viewBox="0 0 100 100" className="transform -rotate-90">
                            {/* Track */}
                            <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f1f3f4" strokeWidth="8" />
                            {/* Active Progress */}
                            <motion.circle
                              cx="50" cy="50" r={radius} fill="transparent"
                              stroke="url(#agentProgressGradient)" strokeWidth="8"
                              strokeDasharray={circumference}
                              initial={{ strokeDashoffset: circumference }}
                              animate={{ strokeDashoffset: circumference - (pctClosed / 100) * circumference }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              strokeLinecap="round"
                            />

                            <defs>
                              <linearGradient id="agentProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#d42a6a" />
                                <stop offset="100%" stopColor="#b20052" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="font-serif text-2xl font-bold text-slate-800">{pctClosed}%</span>
                            <span className="font-sans text-[7.5px] font-bold text-slate-400 uppercase tracking-widest">Finalisés</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2.5 text-xs text-secondary font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-700 font-bold">{closed} / {total}</span>
                            <span className="text-[10px] text-slate-400">Dossiers approuvés ou célébrés</span>
                          </div>
                          <div className="h-[1px] bg-slate-100 w-24" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-700 font-bold">{pendingReviewCount}</span>
                            <span className="text-[10px] text-slate-400">Dossiers sous instruction</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Status distribution bar chart */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm flex flex-col gap-6 text-left">
                  <div>
                    <h3 className="font-serif text-base font-bold text-slate-800">
                      Distribution Locale des Unions
                    </h3>
                    <p className="font-sans text-[11px] text-slate-400">Volume de dossiers à travers les différents jalons de l'État Civil.</p>
                  </div>

                  {(() => {
                    const maxVal = Math.max(pendingReviewCount, approvedDossiersCount, celebratedDossiersCount, 1);

                    const pctReview = Math.round((pendingReviewCount / maxVal) * 100);
                    const pctApproved = Math.round((approvedDossiersCount / maxVal) * 100);
                    const pctCelebrated = Math.round((celebratedDossiersCount / maxVal) * 100);

                    return (
                      <div className="flex justify-around items-end h-40 pt-4 pb-2 px-4 relative">
                        {/* Chart Grid Lines */}
                        <div className="absolute inset-x-4 top-4 border-t border-neutral-100" />
                        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-neutral-150/40" />
                        <div className="absolute inset-x-4 bottom-2 border-t border-neutral-200" />

                        {/* Bar 1: Under Review */}
                        <div className="flex flex-col items-center gap-2 z-10 w-20">
                          <span className="font-sans text-[10px] font-bold text-[#f59e0b]">{pendingReviewCount}</span>
                          <div className="w-8 bg-slate-100 h-28 rounded-full flex items-end overflow-hidden">
                            <motion.div
                              className="w-full bg-[#f59e0b] rounded-full"
                              initial={{ height: 0 }}
                              animate={{ height: `${pctReview}%` }}
                              transition={{ duration: 1.2, ease: "easeOut" }}
                            />
                          </div>
                          <span className="font-sans text-[10px] font-semibold text-slate-500">À réviser</span>
                        </div>

                        {/* Bar 2: Approved */}
                        <div className="flex flex-col items-center gap-2 z-10 w-20">
                          <span className="font-sans text-[10px] font-bold text-[#10b981]">{approvedDossiersCount}</span>
                          <div className="w-8 bg-slate-100 h-28 rounded-full flex items-end overflow-hidden">
                            <motion.div
                              className="w-full bg-[#10b981] rounded-full"
                              initial={{ height: 0 }}
                              animate={{ height: `${pctApproved}%` }}
                              transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
                            />
                          </div>
                          <span className="font-sans text-[10px] font-semibold text-slate-500">Approuvés</span>
                        </div>

                        {/* Bar 3: Celebrated */}
                        <div className="flex flex-col items-center gap-2 z-10 w-20">
                          <span className="font-sans text-[10px] font-bold text-[#8b5cf6]">{celebratedDossiersCount}</span>
                          <div className="w-8 bg-slate-100 h-28 rounded-full flex items-end overflow-hidden">
                            <motion.div
                              className="w-full bg-[#8b5cf6] rounded-full"
                              initial={{ height: 0 }}
                              animate={{ height: `${pctCelebrated}%` }}
                              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                            />
                          </div>
                          <span className="font-sans text-[10px] font-semibold text-slate-500">Célébrés</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Tab Navigation for Mairie portal */}
              <div className="flex border-b border-neutral-200/60 font-sans text-xs mt-6 overflow-x-auto whitespace-nowrap hide-scrollbar gap-2">
                <button
                  onClick={() => setMairieActiveTab('dossiers')}
                  className={`px-5 py-3.5 font-sans uppercase tracking-widest font-bold cursor-pointer transition-all duration-300 relative shrink-0 ${mairieActiveTab === 'dossiers'
                      ? 'text-primary'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <span>Dossiers Civils ({filteredDossiers.length})</span>
                  {mairieActiveTab === 'dossiers' && (
                    <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-primary to-accent rounded-full animate-fade-in" />
                  )}
                </button>
                <button
                  onClick={() => setMairieActiveTab('agenda')}
                  className={`px-5 py-3.5 font-sans uppercase tracking-widest font-bold cursor-pointer transition-all duration-300 flex items-center gap-1.5 shrink-0 relative ${mairieActiveTab === 'agenda'
                      ? 'text-primary'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Calendar className="w-4 h-4 text-accent" />
                  <span>Agenda</span>
                  {(() => {
                    const mDossiers = dossiers.filter(d => d.mairie_id === activeMairieId);
                    const pendingRdvCount = mDossiers.filter(d => Boolean(d.date_rendezvous || d.appointment_date || d.frais_reservation_paye) && d.physical_verified !== true && d.status !== 'celebrated').length;
                    const pendingCelebrationsCount = mDossiers.filter(d => Boolean(d.wedding_date || d.date_mariage) && (d.frais_reservation_paye === true || d.status === 'approved' || d.statut === 'VALIDE') && d.status !== 'celebrated').length;
                    const totalMairieAgendaBadges = pendingRdvCount + pendingCelebrationsCount;
                    return totalMairieAgendaBadges > 0 ? (
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-600 text-white animate-pulse shadow-sm">
                        {totalMairieAgendaBadges}
                      </span>
                    ) : null;
                  })()}
                  {mairieActiveTab === 'agenda' && (
                    <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-primary to-accent rounded-full animate-fade-in" />
                  )}
                </button>
                {mairieAgentRole === 'supervisor' && (
                  <>
                    <button
                      onClick={() => setMairieActiveTab('finance')}
                      className={`px-5 py-3.5 font-sans uppercase tracking-widest font-bold cursor-pointer transition-all duration-300 flex items-center gap-1.5 shrink-0 relative ${mairieActiveTab === 'finance'
                          ? 'text-primary'
                          : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Landmark className="w-4 h-4 text-accent" />
                      <span>Finance</span>
                      {mairieActiveTab === 'finance' && (
                        <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-primary to-accent rounded-full animate-fade-in" />
                      )}
                    </button>
                    <button
                      onClick={() => setMairieActiveTab('agents')}
                      className={`px-5 py-3.5 font-sans uppercase tracking-widest font-bold cursor-pointer transition-all duration-300 flex items-center gap-1.5 shrink-0 relative ${mairieActiveTab === 'agents'
                          ? 'text-primary'
                          : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Users className="w-4 h-4 text-accent" />
                      <span>Agents</span>
                      {mairieActiveTab === 'agents' && (
                        <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-primary to-accent rounded-full animate-fade-in" />
                      )}
                    </button>
                    <button
                      onClick={() => setMairieActiveTab('logs')}
                      className={`px-5 py-3.5 font-sans uppercase tracking-widest font-bold cursor-pointer transition-all duration-300 flex items-center gap-1.5 shrink-0 relative ${mairieActiveTab === 'logs'
                          ? 'text-primary'
                          : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Activity className="w-4 h-4 text-accent" />
                      <span>Audit Logs</span>
                      {mairieActiveTab === 'logs' && (
                        <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-primary to-accent rounded-full animate-fade-in" />
                      )}
                    </button>
                    <button
                      onClick={() => setMairieActiveTab('settings')}
                      className={`px-5 py-3.5 font-sans uppercase tracking-widest font-bold cursor-pointer transition-all duration-300 flex items-center gap-1.5 shrink-0 relative ${mairieActiveTab === 'settings'
                          ? 'text-primary'
                          : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Settings className="w-4 h-4 text-accent" />
                      <span>Paramètres</span>
                      {mairieActiveTab === 'settings' && (
                        <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-primary to-accent rounded-full animate-fade-in" />
                      )}
                    </button>
                  </>
                )}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={mairieActiveTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                  className="w-full flex flex-col gap-6"
                >
                  {mairieActiveTab === 'dossiers' && (
                <div className="flex flex-col gap-6 w-full">
                  {/* Financial Stats row */}
                  {(() => {
                    const physicalBulletinsCount = dossiers.filter(d => d.mairie_id === activeMairieId && d.frais_timbre_paye === true).length;
                    const caisseTotalEst = physicalBulletinsCount * (paramTimbrePrice || 100000);
                    
                    const onlineDossiersCount = dossiers.filter(d => d.mairie_id === activeMairieId && d.frais_reservation_paye === true).length;
                    const onlineTotalEst = onlineDossiersCount * (paystackAmount || 2500);

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-card rounded-2xl p-5 border border-amber-500/20 shadow flex items-center gap-4 bg-white/55 backdrop-blur-md">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-250 shrink-0">
                            <Landmark className="w-5 h-5" />
                          </div>
                          <div className="text-left font-sans">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Régie Caisse Municipale (Physique)</span>
                            <span className="text-base font-bold text-amber-900">{caisseTotalEst.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        </div>

                        <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 shadow flex items-center gap-4 bg-white/55 backdrop-blur-md">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-250 shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div className="text-left font-sans">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Frais Plateforme En Ligne</span>
                            <span className="text-base font-bold text-emerald-800">{onlineTotalEst.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        </div>

                        <div className="glass-card rounded-2xl p-5 border border-sky-500/20 shadow flex items-center gap-4 bg-white/55 backdrop-blur-md">
                          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-250 shrink-0">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div className="text-left font-sans">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Bulletins & Quittances Émis</span>
                            <span className="text-base font-bold text-slate-800">{physicalBulletinsCount} Bulletins</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Dossiers List */}
                  <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6">
                  {isCentralMairie && (
                    <div className="flex flex-col gap-2 border-b border-neutral-100 pb-4">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs font-sans">
                        <Building className="w-4 h-4 text-primary shrink-0" />
                        <span>Filtrer par salle de célébration :</span>
                      </div>
                      <div className="flex flex-wrap gap-1 bg-neutral-100/70 p-1 rounded-xl font-sans text-xs w-max">
                        <button
                          type="button"
                          onClick={() => setSelectedRoomFilter('all')}
                          className={`px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                            selectedRoomFilter === 'all'
                              ? 'bg-white text-slate-800 shadow-sm font-bold border border-slate-200/30'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          📋 Toutes les salles
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRoomFilter('cocody_salle_prestige')}
                          className={`px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                            selectedRoomFilter === 'cocody_salle_prestige'
                              ? 'bg-white text-slate-800 shadow-sm font-bold border border-slate-200/30'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          🏛️ Salle Prestige (Salle 1)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRoomFilter('cocody_salle_union')}
                          className={`px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                            selectedRoomFilter === 'cocody_salle_union'
                              ? 'bg-white text-slate-800 shadow-sm font-bold border border-slate-200/30'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          🏛️ Salle de l'Union (Salle 2)
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-4">
                    {/* Status Filter Tabs */}
                    <div className="flex flex-wrap gap-1 bg-neutral-100 p-1 rounded-xl font-sans text-xs">
                      {(['all', 'under_review', 'approved', 'celebrated'] as const).map((status) => {
                        let label = 'Tous';
                        if (status === 'under_review') label = 'À réviser';
                        if (status === 'approved') label = 'Approuvés';
                        if (status === 'celebrated') label = 'Célébrés';

                        const count = status === 'all'
                          ? filteredDossiers.length
                          : filteredDossiers.filter(d => d.status === status).length;

                        const isActive = mairieStatusFilter === status;
                        return (
                          <button
                            key={status}
                            onClick={() => setMairieStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-all ${isActive
                                ? 'bg-white text-slate-800 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800'
                              }`}
                          >
                            {label} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex items-center w-full sm:w-64 font-sans text-xs">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                      <input
                        type="text"
                        value={mairieSearchText}
                        onChange={(e) => setMairieSearchText(e.target.value)}
                        placeholder="Rechercher par nom ou code..."
                        className="w-full border border-neutral-300 rounded-xl pl-9 pr-4 py-2 bg-white focus:outline-none focus:border-primary text-xs"
                      />
                    </div>
                  </div>

                  {/* Date Filters Row */}
                  <div className="flex flex-col gap-2 bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl text-xs font-sans">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Calendar className="w-4 h-4 text-primary shrink-0" />
                      <span>Célébration :</span>
                    </div>

                    <div className="overflow-x-auto hide-scrollbar -mx-1 px-1">
                      <div className="flex gap-1 bg-neutral-200/50 p-1 rounded-lg w-max">
                        {(['all', 'today', 'week', 'month', 'custom'] as const).map((type) => {
                          let label = 'Toutes les dates';
                          if (type === 'today') label = "Aujourd'hui";
                          if (type === 'week') label = 'Cette semaine';
                          if (type === 'month') label = 'Ce mois';
                          if (type === 'custom') label = 'Période perso.';

                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setMairieDateFilterType(type)}
                              className={`px-3 py-1.5 rounded-md transition-all font-semibold cursor-pointer whitespace-nowrap ${mairieDateFilterType === type
                                  ? 'bg-white text-slate-800 shadow-sm font-bold border border-slate-200/30'
                                  : 'text-slate-500 hover:text-slate-850'
                                }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {mairieDateFilterType === 'custom' && (
                      <div className="flex flex-wrap items-center gap-2 animate-fade-in pt-2 border-t border-slate-200">
                        <span className="text-slate-500 font-medium">Du</span>
                        <input
                          type="date"
                          value={mairieStartDate}
                          onChange={(e) => setMairieStartDate(e.target.value)}
                          className="border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-primary text-xs"
                        />
                        <span className="text-slate-500 font-medium">Au</span>
                        <input
                          type="date"
                          value={mairieEndDate}
                          onChange={(e) => setMairieEndDate(e.target.value)}
                          className="border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-primary text-xs"
                        />
                        {(mairieStartDate || mairieEndDate) && (
                          <button
                            type="button"
                            onClick={() => {
                              setMairieStartDate('');
                              setMairieEndDate('');
                            }}
                            className="ml-1 text-primary hover:text-primary-container font-semibold transition-colors cursor-pointer text-xs"
                          >
                            Effacer
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {mairieFilteredDossiers.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 font-sans font-bold bg-slate-50/50 border border-slate-100 rounded-2xl select-none">
                      Aucun dossier de mariage civil trouvé.
                    </div>
                  ) : (
                    <>
                      {/* Mobile cards view */}
                      <div className="block sm:hidden space-y-4">
                        {mairieFilteredDossiers.map((dossier) => {
                          const hasActiveOpp = allOppositions.some(o => o.dossierId === dossier.id && (o.status === 'pending' || o.status === 'validated'));
                          const isExamDisabled = !dossier.isComplete && !dossier.mairie_exam_unlocked;
                          return (
                            <div 
                              key={dossier.id} 
                              className={`rounded-2xl p-4 flex flex-col gap-3 shadow-sm border ${
                                hasActiveOpp 
                                  ? 'bg-rose-50/30 border-rose-300 ring-2 ring-rose-100' 
                                  : 'bg-white border-neutral-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col gap-0.5 text-left">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">{dossier.id.toUpperCase().replace('DOSSIER_', '')}</span>
                                    {hasActiveOpp && <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse animate-duration-1000" />}
                                  </div>
                                  <span className="font-serif text-sm font-bold text-slate-800">{dossier.spouse1_name} &amp; {dossier.spouse2_name}</span>
                                  {(dossier.spouse1_phone || dossier.spouse2_phone) && (
                                    <span className="text-[10px] text-slate-400 font-sans font-normal">
                                      📞 {dossier.spouse1_phone || 'N/A'} / {dossier.spouse2_phone || 'N/A'}
                                    </span>
                                  )}
                                </div>
                                <span className={`shrink-0 px-2.5 py-1 rounded-full font-sans text-[10px] font-bold uppercase tracking-wide border ${
                                  hasActiveOpp
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : dossier.frais_reservation_paye !== true
                                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                                      : dossier.status === 'celebrated'
                                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                                        : dossier.status === 'approved'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  {hasActiveOpp ? 'Contesté ⚠️' : dossier.frais_reservation_paye !== true ? 'Brouillon' : dossier.status === 'celebrated' ? 'Célébré' : dossier.status === 'approved' ? 'Approuvé' : 'À réviser'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-secondary border-t border-neutral-100 pt-2 text-left">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-medium">{dossier.wedding_date || 'Non planifié'}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs border-t border-neutral-100 pt-2 select-none">
                                <span className="font-sans font-bold text-slate-400">Pièces justificatives :</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    dossier.isComplete
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {dossier.isComplete ? 'Complet' : 'Incomplet'}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-bold">
                                    {dossier.uploadedCount || 0}/{dossier.totalRequired || 10}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2 pt-1 border-t border-neutral-55">
                                {dossier.status === 'celebrated' && (
                                  <button
                                    onClick={() => { setSelectedDossier(dossier); setShowCertificateId(dossier.id); }}
                                    className="flex-1 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 px-3 py-2 rounded-xl font-sans font-bold flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    Acte Civil
                                  </button>
                                )}
                                <button
                                  disabled={isExamDisabled}
                                  onClick={() => setSelectedDossier(dossier)}
                                  className={`flex-1 px-3 py-2 rounded-xl font-sans font-bold flex items-center justify-center gap-1.5 text-[11px] transition-all ${
                                    !isExamDisabled
                                      ? 'bg-white border border-neutral-300 hover:border-primary hover:text-primary cursor-pointer'
                                      : 'bg-neutral-100 border border-neutral-200 text-slate-400 cursor-not-allowed'
                                  }`}
                                  title={
                                    !dossier.isComplete
                                      ? "Examen impossible : Toutes les pièces requises n'ont pas encore été chargées par les futurs époux."
                                      : (currentRole === 'mairie' && !dossier.mairie_exam_unlocked)
                                        ? "Examen verrouillé : L'administrateur doit débloquer l'accès pour ce dossier."
                                        : "Examiner ce dossier"
                                  }
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Examiner
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
  
                      {/* Desktop table view */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="border-b border-neutral-100 text-secondary/70 font-semibold">
                              <th className="py-3 pr-4">N° Dossier</th>
                              <th className="py-3 px-4">Futurs Conjoints</th>
                              <th className="py-3 px-4">Date de Célébration</th>
                              <th className="py-3 px-4 text-center">Statut</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mairieFilteredDossiers.map((dossier) => {
                              const hasActiveOpp = allOppositions.some(o => o.dossierId === dossier.id && (o.status === 'pending' || o.status === 'validated'));
                              const isExamDisabled = !dossier.isComplete && !dossier.mairie_exam_unlocked;
                              return (
                                <tr 
                                  key={dossier.id} 
                                  className={`border-b transition-colors hover:bg-neutral-50/50 ${
                                    hasActiveOpp ? 'bg-rose-50/30 border-rose-100' : 'border-neutral-50'
                                  }`}
                                >
                                  <td className="py-4 pr-4 font-mono font-bold text-slate-800">
                                    <div className="flex items-center gap-1.5">
                                      {dossier.id.toUpperCase().replace('DOSSIER_', '')}
                                      {hasActiveOpp && (
                                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse animate-duration-1000" title="Opposition Active" />
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-left">
                                    <span className="font-bold text-slate-850 block">{dossier.spouse1_name} &amp; {dossier.spouse2_name}</span>
                                    {(dossier.spouse1_phone || dossier.spouse2_phone) && (
                                      <span className="text-[10px] text-slate-400 font-sans block mt-0.5 font-normal">
                                        📞 {dossier.spouse1_phone || 'N/A'} / {dossier.spouse2_phone || 'N/A'}
                                      </span>
                                    )}
                                    <div className="flex items-center gap-1.5 mt-1 select-none">
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                        dossier.isComplete
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}>
                                        {dossier.isComplete ? 'Complet' : 'Incomplet'}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-bold">
                                        {dossier.uploadedCount || 0}/{dossier.totalRequired || 10} pièces
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-secondary text-left">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      {dossier.wedding_date || 'Non planifié'}
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-center">
                                    <span className={`px-2.5 py-1 rounded-full font-sans text-[10px] font-bold block mx-auto w-fit uppercase tracking-wide border ${
                                      hasActiveOpp
                                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                                        : dossier.frais_reservation_paye !== true
                                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                                          : dossier.status === 'celebrated'
                                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                                            : dossier.status === 'approved'
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                              : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}>
                                      {hasActiveOpp ? 'Contesté ⚠️' : dossier.frais_reservation_paye !== true ? 'Brouillon' : dossier.status === 'celebrated' ? 'Célébré' : dossier.status === 'approved' ? 'Prêt / Approuvé' : 'À réviser'}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                    <div className="flex gap-2 justify-end">
                                    {dossier.status === 'celebrated' && (
                                      <button
                                        onClick={() => {
                                          setSelectedDossier(dossier);
                                          setShowCertificateId(dossier.id);
                                        }}
                                        className="bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg font-sans font-bold flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition-all text-[11px]"
                                        title="Générer l'Acte de Mariage"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                        Acte Civil
                                      </button>
                                    )}
                                    <button
                                      disabled={isExamDisabled}
                                      onClick={() => setSelectedDossier(dossier)}
                                      className={`px-3 py-1.5 rounded-lg font-sans font-bold flex items-center gap-1.5 shadow-sm transition-all text-[11px] ${
                                        !isExamDisabled
                                          ? 'bg-white border border-neutral-300 hover:border-primary hover:text-primary cursor-pointer hover:shadow'
                                          : 'bg-neutral-100 border border-neutral-200 text-slate-400 cursor-not-allowed'
                                      }`}
                                      title={
                                        !dossier.isComplete
                                          ? "Examen impossible : Toutes les pièces requises n'ont pas encore été chargées par les futurs époux."
                                          : (currentRole === 'mairie' && !dossier.mairie_exam_unlocked)
                                            ? "Examen verrouillé : L'administrateur doit débloquer l'accès pour ce dossier."
                                            : "Examiner ce dossier"
                                      }
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      Examiner
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

              {mairieActiveTab === 'agenda' && (
                renderAgendaView(false)
              )}

              {mairieActiveTab === 'finance' && (
                renderMairieFinanceView()
              )}

              {mairieActiveTab === 'settings' && (
                /* Mairie Settings */
                <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6 text-left">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-slate-800">Paramètres de la Commune</h3>
                    <p className="font-sans text-xs text-secondary mt-1">Configurez les informations publiques de votre mairie et le nom du signataire officiel pour les actes de mariage.</p>
                  </div>

                  <form onSubmit={handleSaveMairieSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans text-xs max-w-2xl">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Nom de la Mairie / Commune</label>
                      <input
                        type="text"
                        disabled
                        value={activeMairie?.name || ''}
                        className="border border-neutral-200 rounded-xl px-4 py-3 bg-neutral-50 text-slate-500 cursor-not-allowed focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Région Administrative</label>
                      <input
                        type="text"
                        disabled
                        value={activeMairie?.region || ''}
                        className="border border-neutral-200 rounded-xl px-4 py-3 bg-neutral-50 text-slate-500 cursor-not-allowed focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Téléphone de Contact</label>
                      <input
                        type="text"
                        value={mairiePhone}
                        onChange={(e) => setMairiePhone(e.target.value)}
                        placeholder="Ex: +225 27 22 44 88 00"
                        className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Officier d'État Civil Signataire</label>
                      <input
                        type="text"
                        value={mairieOfficer}
                        onChange={(e) => setMairieOfficer(e.target.value)}
                        placeholder="Ex: M. Jean-Marc Koffi, Adjoint au Maire"
                        className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">Description publique / Message d'accueil</label>
                      <textarea
                        rows={4}
                        value={mairieDesc}
                        onChange={(e) => setMairieDesc(e.target.value)}
                        placeholder="Présentation de la mairie, horaires d'ouverture, etc."
                        className="border border-neutral-350 rounded-xl px-4 py-3 bg-white focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        className="py-3 px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary-container shadow-md shadow-primary/20 cursor-pointer transition-colors"
                      >
                        Enregistrer les modifications
                      </button>
                    </div>
                  </form>

                  {/* Temporal Simulation Panel */}
                  <div className="border-t border-slate-200 pt-6 mt-6 flex flex-col gap-4">
                    <div>
                      <h4 className="font-serif text-base font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Simulation Temporelle &amp; Tests (Gestion des Créneaux)
                      </h4>
                      <p className="font-sans text-xs text-secondary mt-1">
                        Permet de simuler le passage du temps sur un dossier ayant un créneau réservé pour tester les relances automatiques et les expirations (J+3, J+5, J+7).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans text-xs">
                      {/* Left: Select Dossier and Action Buttons */}
                      <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="font-bold text-slate-700">Dossier cible pour la simulation :</label>
                          <select 
                            className="border border-neutral-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:border-primary font-medium"
                            onChange={(e) => {
                              setSimTargetDossierId(e.target.value || null);
                            }}
                            value={simTargetDossierId || ''}
                          >
                            <option value="">-- Sélectionner un dossier réservé --</option>
                            {dossiers.filter(d => d.wedding_date && d.status === 'approved').map(d => (
                              <option key={d.id} value={d.id}>
                                {d.spouse1_name} &amp; {d.spouse2_name} ({d.wedding_date})
                              </option>
                            ))}
                          </select>
                        </div>

                        {simTargetDossierId ? (
                          <div className="flex flex-col gap-2 mt-1 text-left">
                            <span className="font-bold text-slate-600 block mb-1">Simuler le vieillissement du créneau :</span>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleSimulateTime(simTargetDossierId, 3)}
                                className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg cursor-pointer text-center text-[10px] uppercase transition-all shadow-sm"
                              >
                                Simuler J+3 (Rappel)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSimulateTime(simTargetDossierId, 5)}
                                className="flex-1 py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg cursor-pointer text-center text-[10px] uppercase transition-all shadow-sm"
                              >
                                Simuler J+5 (Urgent)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSimulateTime(simTargetDossierId, 7)}
                                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer text-center text-[10px] uppercase transition-all shadow-sm"
                              >
                                Simuler J+7 (Expire)
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic p-4 bg-neutral-100/60 rounded-xl text-center border border-neutral-200/40">
                            Sélectionnez un dossier ci-dessus pour activer les boutons de simulation.
                          </div>
                        )}
                      </div>

                      {/* Right: Real-time notification logs */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-left">
                          <span className="font-bold text-slate-700">Relances &amp; Messages Envoyés (SMS/WhatsApp)</span>
                          {notificationLogs.length > 0 && (
                            <button
                              type="button"
                              onClick={async () => {
                                await clearSentNotificationsLog();
                                loadData();
                              }}
                              className="text-[10px] text-red-600 hover:text-red-800 font-bold hover:underline"
                            >
                              Effacer
                            </button>
                          )}
                        </div>
                        <div className="bg-slate-900/95 font-mono text-[9px] text-slate-200 p-3.5 rounded-xl max-h-40 overflow-y-auto space-y-2 flex flex-col text-left leading-relaxed shadow-inner">
                          {notificationLogs.filter(log => !simTargetDossierId || log.dossierId === simTargetDossierId).length > 0 ? (
                            notificationLogs.filter(log => !simTargetDossierId || log.dossierId === simTargetDossierId).map((log) => (
                              <div key={log.id} className="border-b border-slate-800/30 pb-1 last:border-0">
                                <span className="text-slate-500 pr-1">[{log.date}]</span>
                                <span className="text-accent pr-1">[{log.type.toUpperCase()}]</span>
                                <span className="text-slate-105">{log.content}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-500 italic text-center my-auto">Aucun message de relance enregistré pour ce dossier.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== PLANIFICATION — SALLES D'UNION ===== */}
              {mairieActiveTab === 'settings' && (
                <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6 text-left mt-4">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Building className="w-5 h-5 text-primary" />
                      Gestion des Salles d'Union Civile
                    </h3>
                    <p className="font-sans text-xs text-secondary mt-1">
                      Configurez les salles de célébration et leurs décalages horaires pour éviter les chevauchements.
                    </p>
                  </div>

                  {/* Rooms list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roomsList.length === 0 ? (
                      <div className="col-span-full text-center py-6 text-sm text-slate-400 italic bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                        Aucune salle configurée — ajoutez votre première salle ci-dessous.
                      </div>
                    ) : roomsList.map((room: any) => (
                      <div key={room.id} className={`rounded-xl border p-4 flex flex-col gap-2 ${room.active ? 'bg-white border-emerald-200' : 'bg-neutral-50 border-neutral-200 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-800">{room.nom}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${room.active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-slate-500'}`}>
                            {room.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="font-sans text-[11px] text-slate-500">
                          Décalage : <strong>{room.offset_minutes} min</strong> · Capacité / créneau : <strong>{room.capacite_par_creneau}</strong>
                        </p>
                        <div className="flex gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => { setEditingRoomId(room.id); setNewRoomName(room.nom); setNewRoomOffset(room.offset_minutes); setNewRoomCapacity(room.capacite_par_creneau); }}
                            className="flex-1 py-1.5 text-[10px] font-bold bg-sky-50 border border-sky-200 text-sky-700 rounded-lg hover:bg-sky-100 cursor-pointer transition-colors"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleRoomActive(room.id, room.active)}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-colors border ${room.active ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}
                          >
                            {room.active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(room.id)}
                            className="py-1.5 px-2 text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-100 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add / edit room form */}
                  <form onSubmit={handleAddRoom} className="bg-slate-50 rounded-xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end font-sans text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700">Nom de la salle</label>
                      <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="Ex : Salle Prestige"
                        required
                        className="border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700">Décalage (minutes)</label>
                      <input
                        type="number"
                        value={newRoomOffset}
                        onChange={(e) => setNewRoomOffset(Number(e.target.value))}
                        min={0}
                        step={15}
                        className="border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700">Capacité / créneau</label>
                      <input
                        type="number"
                        value={newRoomCapacity}
                        onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                        min={1}
                        className="border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary-container cursor-pointer transition-colors text-[11px]"
                      >
                        {editingRoomId ? 'Mettre à jour' : '+ Ajouter'}
                      </button>
                      {editingRoomId && (
                        <button
                          type="button"
                          onClick={() => { setEditingRoomId(null); setNewRoomName(''); setNewRoomOffset(0); setNewRoomCapacity(5); }}
                          className="py-2 px-3 bg-neutral-100 border border-neutral-300 text-slate-600 font-bold rounded-lg hover:bg-neutral-200 cursor-pointer text-[11px]"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* ===== CRÉNEAUX BLOQUÉS ===== */}
              {mairieActiveTab === 'settings' && (
                <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6 text-left mt-4">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-amber-600" />
                      Créneaux Horaires Bloqués
                    </h3>
                    <p className="font-sans text-xs text-secondary mt-1">
                      Bloquez des créneaux spécifiques (jours fériés, réunions, entretien) pour empêcher toute réservation.
                    </p>
                  </div>

                  {/* Blocked slots list */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full font-sans text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-bold text-slate-600">Salle</th>
                          <th className="px-4 py-2.5 text-left font-bold text-slate-600">Date</th>
                          <th className="px-4 py-2.5 text-left font-bold text-slate-600">Heure</th>
                          <th className="px-4 py-2.5 text-left font-bold text-slate-600">Raison</th>
                          <th className="px-4 py-2.5 text-center font-bold text-slate-600">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blockedSlotsList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-6 text-slate-400 italic">
                              Aucun créneau bloqué pour le moment.
                            </td>
                          </tr>
                        ) : blockedSlotsList.map((slot: any) => {
                          const salleName = roomsList.find((r: any) => r.id === slot.salle_id)?.nom || slot.salle_id;
                          return (
                            <tr key={slot.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-medium text-slate-700">{salleName}</td>
                              <td className="px-4 py-2.5 text-slate-600">{slot.date}</td>
                              <td className="px-4 py-2.5 text-slate-600">{slot.heure}</td>
                              <td className="px-4 py-2.5 text-slate-500 italic">{slot.raison}</td>
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBlockedSlot(slot.id)}
                                  className="py-1 px-2.5 text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-100 cursor-pointer"
                                >
                                  Débloquer
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Add blocked slot form */}
                  <form onSubmit={handleBlockSlot} className="bg-amber-50 rounded-xl border border-amber-200 p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end font-sans text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700">Salle</label>
                      <select
                        value={blockRoomId}
                        onChange={(e) => setBlockRoomId(e.target.value)}
                        required
                        className="border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
                      >
                        <option value="">-- Choisir --</option>
                        {roomsList.filter((r: any) => r.active).map((r: any) => (
                          <option key={r.id} value={r.id}>{r.nom}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700">Date</label>
                      <input
                        type="date"
                        value={blockDate}
                        onChange={(e) => setBlockDate(e.target.value)}
                        required
                        className="border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700">Heure</label>
                      <input
                        type="time"
                        value={blockTime}
                        onChange={(e) => setBlockTime(e.target.value)}
                        required
                        className="border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700">Raison</label>
                      <input
                        type="text"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder="Ex : Jour férié"
                        className="border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <button
                      type="submit"
                      className="py-2 px-4 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 cursor-pointer transition-colors text-[11px]"
                    >
                      Bloquer ce créneau
                    </button>
                  </form>
                </div>
              )}

              {/* ===== PARAMÈTRES SYSTÈME DE RÉSERVATION ===== */}
              {mairieActiveTab === 'settings' && (
                <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6 text-left mt-4">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-primary" />
                      Paramètres Système — Réservation & Quotas
                    </h3>
                    <p className="font-sans text-xs text-secondary mt-1">
                      Ajustez les montants, quotas journaliers et règles de reprogrammation applicables à toutes les mairies.
                    </p>
                  </div>

                  <form onSubmit={handleSaveRoomsSettings} className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-sans text-xs max-w-2xl">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Frais de réservation (FCFA)</label>
                      <input
                        type="number"
                        value={paramReservationPrice}
                        onChange={(e) => setParamReservationPrice(Number(e.target.value))}
                        min={0}
                        step={500}
                        className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-primary"
                      />
                      <span className="text-[10px] text-slate-400">Payé lors du choix du créneau (Étape 4)</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Reprogrammations max.</label>
                      <input
                        type="number"
                        value={paramRescheduleLimit}
                        onChange={(e) => setParamRescheduleLimit(Number(e.target.value))}
                        min={0}
                        max={10}
                        className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-primary"
                      />
                      <span className="text-[10px] text-slate-400">Nombre de fois qu'un couple peut reporter</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Quota journalier (mariages)</label>
                      <input
                        type="number"
                        value={paramDailyWeddingLimit}
                        onChange={(e) => setParamDailyWeddingLimit(Number(e.target.value))}
                        min={1}
                        max={100}
                        className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-primary"
                      />
                      <span className="text-[10px] text-slate-400">Max. mariages par jour par salle</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Quota journalier (RDV Physiques)</label>
                      <input
                        type="number"
                        value={paramDailyPhysicalRdvLimit}
                        onChange={(e) => setParamDailyPhysicalRdvLimit(Number(e.target.value))}
                        min={1}
                        max={50}
                        className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-primary"
                      />
                      <span className="text-[10px] text-slate-400">Max. rendez-vous de dépôt de dossier par jour</span>
                    </div>
                    <div className="sm:col-span-3 flex justify-end">
                      <button
                        type="submit"
                        className="py-3 px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary-container shadow-md shadow-primary/20 cursor-pointer transition-colors"
                      >
                        Enregistrer les paramètres
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ===== SCANNER QR CODE — VALIDATION RENDEZ-VOUS ===== */}
              {mairieActiveTab === 'settings' && (
                <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-6 text-left mt-4">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-slate-800 flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-primary" />
                      Validation par QR Code — Rendez-vous Mairie
                    </h3>
                    <p className="font-sans text-xs text-secondary mt-1">
                      Scannez ou saisissez le code de réservation du couple pour valider leur rendez-vous physique et enregistrer la vérification des originaux.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyQrCode} className="flex flex-col sm:flex-row gap-3 items-end font-sans text-xs max-w-lg">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Code de réservation (QR / Manuel)</label>
                      <input
                        type="text"
                        value={qrVerificationInput}
                        onChange={(e) => setQrVerificationInput(e.target.value)}
                        placeholder="Ex : EMAR-RESA-A3B7C9D2"
                        className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-primary font-mono uppercase tracking-widest"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!qrVerificationInput.trim()}
                      className="py-3 px-6 bg-primary text-white font-bold rounded-xl hover:bg-primary-container shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[12px]"
                    >
                      Valider le RDV
                    </button>
                  </form>

                  {qrVerifyStatus && (
                    <div className={`flex items-start gap-3 p-4 rounded-xl border font-sans text-xs ${qrVerifyStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      {qrVerifyStatus.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      )}
                      <p className="font-medium leading-relaxed">{qrVerifyStatus.message}</p>
                    </div>
                  )}
                </div>
              )}

              {mairieActiveTab === 'agents' && mairieAgentRole === 'supervisor' && (
                renderMairieAgentsView()
              )}

              {mairieActiveTab === 'logs' && mairieAgentRole === 'supervisor' && (
                renderMairieLogsView()
              )}
            </motion.div>
          </AnimatePresence>
            </>
          )}
        </>
      )}

      {/* -------------------- AUDIT LOG EVENT FEED -------------------- */}
      {currentRole === 'superadmin' && (
        <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-4 mt-2">
          <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Journal des Événements & Audit Système
            </h3>
            <span className="text-[10px] text-slate-400 font-sans font-semibold">Temps Réel</span>
          </div>

          <div className="bg-slate-900/95 font-mono text-[10px] text-slate-200 p-4 rounded-xl max-h-48 overflow-y-auto space-y-2 flex flex-col text-left leading-relaxed shadow-inner">
            {activityLogs.map((log) => {
              let typeColor = 'text-sky-400';
              if (log.type === 'success') typeColor = 'text-emerald-400';
              if (log.type === 'warning') typeColor = 'text-amber-400';
              if (log.type === 'admin') typeColor = 'text-purple-400';

              return (
                <div key={log.id} className="flex items-start gap-2 border-b border-slate-800/30 pb-1.5 last:border-0">
                  <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                  <span className={`${typeColor} font-semibold shrink-0 uppercase tracking-wider`}>[{log.type}]</span>
                  <span className="text-slate-100">{log.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedDossier && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-md px-4 py-8 overflow-y-auto">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-6xl p-6 md:p-8 border border-outline-variant shadow-2xl relative my-auto text-left flex flex-col gap-6"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-neutral-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-primary tracking-widest uppercase block mb-0.5">Instruction d'État Civil</span>
                  <h3 className="font-serif text-2xl font-bold text-slate-900 flex items-center gap-2">
                    Dossier de Mariage : {selectedDossier.spouse1_name} &amp; {selectedDossier.spouse2_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                    <span className="font-mono text-xs text-secondary font-semibold bg-neutral-100 px-2 py-0.5 rounded">CODE DOSSIER : {selectedDossier.id.toUpperCase().replace('DOSSIER_', '')}</span>
                    {selectedDossier.spouse1_phone && (
                      <span className="text-xs text-slate-500 font-sans">📞 Conjoint: <span className="font-semibold text-slate-700">{selectedDossier.spouse1_phone}</span></span>
                    )}
                    {selectedDossier.spouse2_phone && (
                      <span className="text-xs text-slate-500 font-sans">📞 Conjointe: <span className="font-semibold text-slate-700">{selectedDossier.spouse2_phone}</span></span>
                    )}
                    {selectedDossier.spouse1_email && (
                      <span className="text-xs text-slate-500 font-sans">✉️ Conjoint: <span className="font-semibold text-slate-700">{selectedDossier.spouse1_email}</span></span>
                    )}
                    {selectedDossier.spouse2_email && (
                      <span className="text-xs text-slate-500 font-sans">✉️ Conjointe: <span className="font-semibold text-slate-700">{selectedDossier.spouse2_email}</span></span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDossier(null)}
                  className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-slate-400 hover:text-slate-800 cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {isDossierSuspect && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-2xl flex items-start gap-3 shadow-sm select-none animate-pulse">
                  <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs text-left">
                    <h4 className="font-bold text-rose-900 text-sm flex items-center gap-1.5 uppercase">
                      ⚠️ Dossier Suspect {isLocked && "& Verrouillé"}
                    </h4>
                    <p className="mt-1 font-medium leading-relaxed">
                      L'intelligence artificielle a identifié un ou plusieurs documents suspectés de fraude ou contenant des anomalies critiques dans ce dossier (recommandation IA : REJETER).
                      {isLocked ? (
                        <span className="font-bold block mt-1 text-rose-950">
                          🔒 Accès en lecture seule activé pour l'officier civil. Toute action de validation, rejet, planification ou modification est bloquée.
                        </span>
                      ) : (
                        <span className="font-bold block mt-1 text-slate-800">
                          (Mode Direction Nationale - Superadmin : Accès complet disponible)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab Navigation */}
              <div className="flex border-b border-neutral-205 font-sans text-xs">
                <button
                  type="button"
                  onClick={() => setDossierDetailTab('express_review')}
                  className={`px-6 py-2.5 font-bold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 ${dossierDetailTab === 'express_review'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <FileText className="w-4 h-4" />
                  Documents (Examen Express)
                </button>
                <button
                  type="button"
                  onClick={() => setDossierDetailTab('planning')}
                  className={`px-6 py-2.5 font-bold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 ${dossierDetailTab === 'planning'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Calendar className="w-4 h-4" />
                  Planification &amp; Décision
                </button>
              </div>

              {/* Tab Contents */}
              {dossierDetailTab === 'express_review' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[75vh] pr-2">
                  {/* Left Column: Documents list (lg:col-span-4) */}
                  <div className="lg:col-span-4 flex flex-col gap-4">
                    <h4 className="font-serif text-sm font-bold text-slate-800 flex items-center justify-between border-b border-neutral-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-primary" />
                        <span>Pièces justificatives</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (selectedDossier) {
                              const docs = await getDocuments(selectedDossier.id);
                              setDossierDocs(docs);
                              addNotification("Documents actualisés", "success");
                            }
                          }}
                          className="p-1 px-2 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/10 text-primary hover:text-primary-container transition-all cursor-pointer flex items-center gap-1 font-sans text-[9px] font-bold"
                          title="Actualiser les documents"
                        >
                          <RefreshCw className="w-3 h-3 shrink-0" />
                          <span>Actualiser</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowArchiveDossier(true)}
                          className="p-1 px-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/20 text-emerald-700 hover:text-emerald-800 transition-all cursor-pointer flex items-center gap-1 font-sans text-[9px] font-bold"
                          title="Imprimer tout le dossier"
                        >
                          <Printer className="w-3 h-3 shrink-0" />
                          <span>Imprimer tout</span>
                        </button>
                      </div>
                    </h4>

                    {/* Carte Biométrique des Conjoints */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3 text-left">
                      <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                        <Shield className="w-4 h-4 text-primary shrink-0" />
                        <span>Contrôle Biométrique (Face++)</span>
                      </h5>
                      <div className="flex flex-col gap-4">
                        {/* Époux */}
                        <div className="flex gap-3 items-start">
                          <div className="relative w-12 h-15 rounded-lg bg-slate-200 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center">
                            {selectedDossier.epoux_selfie_url ? (
                              <img
                                src={selectedDossier.epoux_selfie_url || `http://localhost:3000/documents/${selectedDossier.id}/epoux_selfie.jpg`}
                                alt="Selfie Époux"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  downloadDocumentFile(selectedDossier.id, 'epoux_selfie', 'epoux_selfie.jpg').then(blob => {
                                    if (blob) { (e.target as HTMLImageElement).src = URL.createObjectURL(blob); }
                                  });
                                }}
                              />
                            ) : (
                              <Users className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 font-sans text-[10px] space-y-0.5">
                            <span className="font-bold text-slate-800 block truncate">🤵 {selectedDossier.spouse1_name}</span>
                            <span className="text-slate-500 block">Pièce : {selectedDossier.spouse1_cni_type || 'CNI'}</span>
                            {selectedDossier.epoux_face_match_score !== undefined && selectedDossier.epoux_face_match_score > 0 ? (
                              <span className="text-slate-500 block">IA Match : <span className="font-bold text-primary">{selectedDossier.epoux_face_match_score.toFixed(1)}%</span></span>
                            ) : (
                              <span className="text-rose-500 font-semibold block">⚠️ Face++ : Aucun score</span>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                                selectedDossier.epoux_identite_verifiee === true
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : selectedDossier.epoux_identite_verifiee === false
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}>
                                {selectedDossier.epoux_identite_verifiee === true ? 'Vérifié ✓' : selectedDossier.epoux_identite_verifiee === false ? 'Manuel Requis ⚠️' : 'Non Vérifié 🛑'}
                              </span>
                              {!isLocked && (
                                <button
                                  type="button"
                                  onClick={() => handleVerifySpouseBiometrics('epoux', !(selectedDossier.epoux_identite_verifiee === true))}
                                  className={`px-1.5 py-0.5 rounded font-bold transition-all text-[8px] cursor-pointer ${
                                    selectedDossier.epoux_identite_verifiee === true
                                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                      : 'bg-primary text-white hover:bg-primary-container border border-primary'
                                  }`}
                                >
                                  {selectedDossier.epoux_identite_verifiee === true ? 'Dévalider' : 'Valider'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Épouse */}
                        <div className="flex gap-3 items-start border-t border-slate-200/60 pt-3">
                          <div className="relative w-12 h-15 rounded-lg bg-slate-200 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center">
                            {selectedDossier.epouse_selfie_url ? (
                              <img
                                src={selectedDossier.epouse_selfie_url || `http://localhost:3000/documents/${selectedDossier.id}/epouse_selfie.jpg`}
                                alt="Selfie Épouse"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  downloadDocumentFile(selectedDossier.id, 'epouse_selfie', 'epouse_selfie.jpg').then(blob => {
                                    if (blob) { (e.target as HTMLImageElement).src = URL.createObjectURL(blob); }
                                  });
                                }}
                              />
                            ) : (
                              <Users className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 font-sans text-[10px] space-y-0.5">
                            <span className="font-bold text-slate-800 block truncate">👰 {selectedDossier.spouse2_name}</span>
                            <span className="text-slate-500 block">Pièce : {selectedDossier.spouse2_cni_type || 'CNI'}</span>
                            {selectedDossier.epouse_face_match_score !== undefined && selectedDossier.epouse_face_match_score > 0 ? (
                              <span className="text-slate-500 block">IA Match : <span className="font-bold text-primary">{selectedDossier.epouse_face_match_score.toFixed(1)}%</span></span>
                            ) : (
                              <span className="text-rose-500 font-semibold block">⚠️ Face++ : Aucun score</span>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                                selectedDossier.epouse_identite_verifiee === true
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : selectedDossier.epouse_identite_verifiee === false
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}>
                                {selectedDossier.epouse_identite_verifiee === true ? 'Vérifié ✓' : selectedDossier.epouse_identite_verifiee === false ? 'Manuel Requis ⚠️' : 'Non Vérifié 🛑'}
                              </span>
                              {!isLocked && (
                                <button
                                  type="button"
                                  onClick={() => handleVerifySpouseBiometrics('epouse', !(selectedDossier.epouse_identite_verifiee === true))}
                                  className={`px-1.5 py-0.5 rounded font-bold transition-all text-[8px] cursor-pointer ${
                                    selectedDossier.epouse_identite_verifiee === true
                                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                      : 'bg-primary text-white hover:bg-primary-container border border-primary'
                                  }`}
                                >
                                  {selectedDossier.epouse_identite_verifiee === true ? 'Dévalider' : 'Valider'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
                      {dossierDocs.map((doc) => {
                        const isSelected = previewDoc?.id === doc.id;
                        const isChecked = checkedDocs[doc.id] || false;
                        return (
                          <div
                            key={doc.id}
                            onClick={() => handleSelectPreviewDoc(doc)}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm text-left ${
                              isSelected
                                ? 'bg-primary/5 border-primary shadow-md font-semibold'
                                : !doc.fileName
                                  ? 'bg-neutral-50/40 border-neutral-100 opacity-60'
                                  : isChecked
                                    ? 'bg-emerald-50/20 border-emerald-200'
                                    : 'bg-rose-50/20 border-rose-200'
                            }`}
                          >
                            <div className="flex gap-2.5 items-start min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                !doc.fileName
                                  ? 'bg-neutral-100 text-slate-400'
                                  : isChecked
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isChecked && doc.fileName ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : !isChecked && doc.fileName ? (
                                  <X className="w-3.5 h-3.5" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-sans text-[11px] font-bold text-slate-800 block truncate">{doc.name}</span>
                                <span className="text-[9px] text-slate-500 block truncate">{doc.category === 'spouses' ? 'Conjoints' : 'Témoins'}</span>
                                {doc.docNumber && (
                                  <span className="text-[9px] font-sans text-primary block truncate mt-0.5 font-bold">🆔 Numéro : {doc.docNumber}</span>
                                )}
                                {doc.fileName ? (
                                  <span className="text-[9px] font-mono text-emerald-750 block truncate mt-0.5">📂 {doc.fileName}</span>
                                ) : (
                                  <span className="text-[9px] font-sans text-rose-500 block italic mt-0.5">⚠️ Manquant</span>
                                )}
                                {doc.aiAnalysis && (
                                  <div className="mt-1">
                                    <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                                      doc.aiAnalysis.action_recommandee === 'VALIDER'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : doc.aiAnalysis.action_recommandee === 'REJETER'
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                      {doc.aiAnalysis.action_recommandee === 'VALIDER' && '✨ IA : Conforme'}
                                      {doc.aiAnalysis.action_recommandee === 'REJETER' && '⚠️ IA : Suspect'}
                                      {doc.aiAnalysis.action_recommandee === 'VERIFIER_MANUELLEMENT' && '🔍 IA : À vérifier'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Checkbox selector */}
                            <div className="flex items-center shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                              {doc.fileName ? (
                                <label className="inline-flex items-center cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (isLocked) return;
                                      setCheckedDocs(prev => ({ ...prev, [doc.id]: e.target.checked }));
                                    }}
                                    disabled={isLocked}
                                    className="w-4.5 h-4.5 text-primary rounded border-neutral-300 focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </label>
                              ) : (
                                <span className="text-[9px] font-sans text-slate-400 italic">
                                  En attente
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Batch Save & Notify Spouses */}
                    <div className="border-t border-slate-100 pt-4 mt-4 text-left font-sans">
                      <button
                        type="button"
                        onClick={handleSaveAllDocReviews}
                        disabled={isLocked || isSavingReviews || dossierDocs.length === 0}
                        className={`w-full py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                          isLocked || isSavingReviews || dossierDocs.length === 0
                            ? 'bg-neutral-250 text-slate-400 border border-neutral-300 cursor-not-allowed shadow-none'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md'
                        }`}
                      >
                        {isSavingReviews ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Notification en cours...</span>
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-4 h-4 text-accent" />
                            <span>Terminer l'examen & notifier ({dossierDocs.filter(d => d.fileName).length} pièces)</span>
                          </>
                        )}
                      </button>
                      <p className="text-[9px] text-slate-400 text-center mt-2 italic leading-relaxed">
                        Cochez les pièces conformes à gauche et décochez celles non conformes. Cliquez ci-dessus pour envoyer un bilan groupé aux futurs époux.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Visualizer Inline (lg:col-span-8) */}
                  <div className="lg:col-span-8 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-neutral-100 pt-4 lg:pt-0 lg:pl-6 text-left">
                    <h4 className="font-serif text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-neutral-100 pb-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <span>Prévisualisation interactive</span>
                    </h4>

                    {previewDoc ? (
                      <div className="flex flex-col gap-4 h-full justify-between">
                        {/* Interactive panel */}
                        <div className="border border-neutral-200 rounded-xl p-4 bg-slate-50 min-h-[550px] flex flex-col justify-between shadow-inner relative overflow-hidden font-sans text-xs">
                          {isFileLoading ? (
                            <div className="w-full h-full min-h-[510px] flex flex-col items-center justify-center gap-4 text-slate-500 font-sans text-xs">
                              <Loader2 className="w-10 h-10 animate-spin text-primary shrink-0" />
                              <div className="flex flex-col gap-1 text-center">
                                <span className="font-bold text-slate-700 animate-pulse">Chargement sécurisé...</span>
                                <span className="text-[10px] text-slate-400">Téléchargement depuis le coffre-fort d'État Civil</span>
                              </div>
                            </div>
                          ) : previewBlobUrl ? (
                            <div className="w-full h-full min-h-[510px] flex flex-col items-center justify-center relative">
                              {/* Zoom Toolbar for Image */}
                              {previewBlobType?.startsWith('image/') && (
                                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg border border-neutral-200 shadow-sm z-20">
                                  <button
                                    type="button"
                                    onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                                    className="w-6 h-6 rounded bg-white hover:bg-neutral-100 text-slate-700 flex items-center justify-center font-bold border border-neutral-300 text-xs cursor-pointer select-none transition-colors"
                                    title="Zoom arrière"
                                  >
                                    -
                                  </button>
                                  <span className="text-[9px] font-bold text-slate-650 min-w-8 text-center select-none">{Math.round(zoomLevel * 100)}%</span>
                                  <button
                                    type="button"
                                    onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                                    className="w-6 h-6 rounded bg-white hover:bg-neutral-100 text-slate-700 flex items-center justify-center font-bold border border-neutral-300 text-xs cursor-pointer select-none transition-colors"
                                    title="Zoom avant"
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setZoomLevel(1)}
                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-neutral-100 text-slate-700 font-bold border border-neutral-300 text-[8px] cursor-pointer select-none transition-colors"
                                    title="Réinitialiser"
                                  >
                                    Reset
                                  </button>
                                </div>
                              )}
                              
                              {previewBlobType?.startsWith('image/') ? (
                                <div className="w-full h-[490px] overflow-auto flex items-start justify-center p-1 bg-neutral-100/30 rounded-lg">
                                  <img
                                    src={previewBlobUrl}
                                    alt={previewDoc.name}
                                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease-out' }}
                                    className="max-w-full rounded-lg shadow-sm border border-neutral-200"
                                  />
                                </div>
                              ) : (
                                <iframe
                                  src={`${previewBlobUrl}#toolbar=1&navpanes=0&view=FitH`}
                                  title={previewDoc.name}
                                  sandbox="allow-same-origin allow-scripts"
                                  className="w-full h-[500px] rounded-lg border border-neutral-200 shadow-md bg-white"
                                />
                              )}
                            </div>
                          ) : (
                            /* Fallback templates */
                            <>
                              {/* 1. NATIONAL IDENTITY CARD PREVIEW */}
                              {(previewDoc.id.includes('doc2') || previewDoc.id.includes('doc5') || previewDoc.name.toLowerCase().includes('identité')) && (
                                <div className="flex flex-col gap-4 h-full">
                                  <div className="bg-[#009B77]/10 p-3 rounded-lg border border-[#009B77]/20 flex justify-between items-center">
                                    <div className="flex flex-col text-left">
                                      <span className="font-bold text-[#009B77] text-[10px] uppercase">République de Côte d'Ivoire</span>
                                      <span className="text-[8px] text-slate-500 font-semibold">Carte Nationale d'Identité</span>
                                    </div>
                                    <div className="flex gap-0.5">
                                      <div className="w-2.5 h-4 bg-[#FF8C00]"></div>
                                      <div className="w-2.5 h-4 bg-white border-y border-slate-200"></div>
                                      <div className="w-2.5 h-4 bg-[#009B77]"></div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-3 my-auto items-center">
                                    <div className="border border-slate-300 bg-slate-200 rounded-lg aspect-[3/4] flex items-center justify-center relative overflow-hidden shadow-sm">
                                      <Users className="w-8 h-8 text-slate-400" />
                                      <div className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-[6px] text-white text-center py-0.5 font-bold uppercase">
                                        PHOTO OFFICIELLE
                                      </div>
                                    </div>

                                    <div className="col-span-2 flex flex-col gap-2 text-left text-[9px] text-slate-700">
                                      <div>
                                        <span className="text-[7px] font-bold text-slate-400 block uppercase">Nom / Surname :</span>
                                        <span className="font-bold text-slate-800 text-[10px]">{selectedDossier?.spouse1_name || 'KOFFI'}</span>
                                      </div>
                                      <div>
                                        <span className="text-[7px] font-bold text-slate-400 block uppercase">Prénoms / Given names :</span>
                                        <span className="font-bold text-slate-800">{selectedDossier?.spouse2_name || 'Marc-Antoine'}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <span className="text-[7px] font-bold text-slate-400 block uppercase">Né(e) le :</span>
                                          <span className="font-bold text-slate-800">12/04/1998</span>
                                        </div>
                                        <div>
                                          <span className="text-[7px] font-bold text-slate-400 block uppercase">Sexe :</span>
                                          <span className="font-bold text-slate-800">M / F</span>
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-[7px] font-bold text-slate-400 block uppercase">Numéro National d'Identité :</span>
                                        <span className="font-mono font-bold text-primary">CNI-CI-0492810482</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[7px] text-slate-400">
                                    <span>Signature du Titulaire : <span className="font-serif italic font-bold text-slate-600">{selectedDossier ? `${selectedDossier.spouse2_name || 'Épouse'}/${selectedDossier.spouse1_name || 'Époux'}` : 'Épouse/Époux'}</span></span>
                                    <span className="font-mono">EXP: 12/2034</span>
                                  </div>
                                </div>
                              )}

                              {/* 2. BIRTH CERTIFICATE PREVIEW */}
                              {(previewDoc.id.includes('doc2') || previewDoc.name.toLowerCase().includes('naissance')) && (
                                <div className="flex flex-col gap-4 h-full font-serif text-slate-800">
                                  <div className="text-center flex flex-col gap-0.5 border-b border-slate-200 pb-2">
                                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">République de Côte d'Ivoire</span>
                                    <span className="text-[8px] text-slate-455 uppercase">Commune de Cocody - État Civil</span>
                                    <span className="font-sans text-[10px] font-bold text-slate-700 mt-1.5 uppercase tracking-wide">Copie Intégrale d'Acte de Naissance</span>
                                  </div>

                                  <div className="text-left text-[9px] flex flex-col gap-2 my-auto leading-relaxed">
                                    <p>
                                      L'an <span className="font-bold text-slate-900">mille neuf cent quatre-vingt-dix-huit</span>, le douzième jour du mois d'avril à six heures, est né à la maternité de Cocody :
                                    </p>
                                    <div className="p-2 bg-slate-100 rounded border border-slate-200 font-sans text-center font-bold text-slate-900 text-[10px] my-1">
                                      {selectedDossier ? `${selectedDossier.spouse1_name || 'Époux'} ou ${selectedDossier.spouse2_name || 'Épouse'}` : 'Époux / Épouse'}
                                    </div>
                                    <p>
                                      Fils/Fille de <span className="font-bold text-slate-900">KOFFI Kouamé</span>, de nationalité Ivoirienne, et de <span className="font-bold text-slate-900">ADOU Marie</span>, son épouse.
                                    </p>
                                    <p>
                                      Dressé le treize avril mil neuf cent quatre-vingt-dix-huit par nous, Officier d'État Civil.
                                    </p>
                                  </div>

                                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[7px] font-sans text-slate-400">
                                    <span>Registre N°: REG-98-COCODY-0428</span>
                                    <span className="text-emerald-700 font-bold">✓ Scanné Conforme</span>
                                  </div>
                                </div>
                              )}

                              {/* 3. PROOF OF RESIDENCE PREVIEW */}
                              {(previewDoc.id.includes('doc3') || previewDoc.name.toLowerCase().includes('domicile')) && (
                                <div className="flex flex-col gap-4 h-full font-sans text-slate-700">
                                  <div className="bg-[#FF8C00]/10 p-3 rounded-lg border border-[#FF8C00]/20 flex justify-between items-center">
                                    <div className="flex flex-col text-left">
                                      <span className="font-bold text-[#FF8C00] text-[10px] uppercase">CIE - Compagnie Ivoirienne d'Électricité</span>
                                      <span className="text-[8px] text-slate-500 font-semibold">Facture d'Électricité Municipale</span>
                                    </div>
                                    <span className="font-mono font-bold text-[9px] text-[#FF8C00]">N° 29481028-10</span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 text-left my-auto text-[9px] leading-relaxed">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[7px] text-slate-400 font-bold uppercase">Abonné / Client :</span>
                                      <span className="font-bold text-slate-800">{selectedDossier?.spouse1_name || 'Époux'} {selectedDossier?.spouse2_name || 'Épouse'}</span>
                                      <span className="text-slate-500">Adresse: Cocody Angré, Rue des Jardins, Villa 142</span>
                                    </div>

                                    <div className="flex flex-col gap-1 border-l border-slate-200 pl-3">
                                      <span className="text-[7px] text-slate-400 font-bold uppercase">Période de Facturation :</span>
                                      <span className="font-bold text-slate-800">Mars - Avril 2026</span>
                                      <span className="text-slate-500">Commune de Célébration : Cocody</span>
                                      <span className="text-[7px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 w-fit mt-1">Éligible (+1 mois de résidence)</span>
                                    </div>
                                  </div>

                                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[7px] text-slate-400">
                                    <span>Index: 49204 kWh</span>
                                    <span className="font-bold text-slate-600">Montant : 42 500 FCFA</span>
                                  </div>
                                </div>
                              )}

                              {/* 4. OTHER / GENERIC DOCUMENT PREVIEW */}
                              {(!previewDoc.id.includes('doc1') && !previewDoc.id.includes('doc2') && !previewDoc.id.includes('doc3') && !previewDoc.id.includes('doc5') && !previewDoc.name.toLowerCase().includes('naissance') && !previewDoc.name.toLowerCase().includes('identité') && !previewDoc.name.toLowerCase().includes('domicile')) && (
                                <div className="flex flex-col gap-4 h-full font-serif text-slate-800">
                                  <div className="text-center flex flex-col gap-0.5 border-b border-slate-200 pb-2 font-sans">
                                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">République de Côte d'Ivoire</span>
                                    <span className="text-[8px] text-slate-455 uppercase">Ministère de la Justice et des Droits de l'Homme</span>
                                    <span className="text-[10px] font-bold text-slate-700 mt-1 uppercase">{previewDoc.name}</span>
                                  </div>

                                  <div className="text-left text-[9px] flex flex-col gap-2 my-auto leading-relaxed font-sans text-slate-600">
                                    <p className="font-bold text-slate-800 text-[10px] mb-1">CERTIFICATION ADMINISTRATIVE</p>
                                    <p>
                                      Nous soussigné, Officier d'État Civil de la Commune de Cocody, certifions que la pièce suivante fournie au dossier de mariage :
                                    </p>
                                    <div className="p-2.5 bg-slate-100 rounded border border-slate-200 font-mono text-[9px] text-slate-800">
                                      {previewDoc.fileName}
                                    </div>
                                    <p>
                                      A été numérisée et certifiée conforme aux originaux déposés pour l'union de {selectedDossier?.spouse1_name} &amp; {selectedDossier?.spouse2_name}.
                                    </p>
                                  </div>

                                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[7px] font-sans text-slate-400">
                                    <span>Réf : {previewDoc.id.toUpperCase()}</span>
                                    <span className="text-emerald-700 font-bold">Sceau de l'État Civil</span>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Collapsible AI Audit Report Panel */}
                        {previewDoc.aiAnalysis && (
                          <div className="border border-neutral-200 bg-white rounded-xl shadow-sm overflow-hidden mt-3 font-sans text-xs">
                            <button
                              type="button"
                              onClick={() => setShowAiAudit(!showAiAudit)}
                              className="w-full flex justify-between items-center px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors border-b border-neutral-200 font-serif font-bold text-slate-800 cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                🔍 Rapport d'Audit Civil Intelligent (IA)
                              </span>
                              <span className="text-[10px] text-slate-500 font-sans font-semibold">
                                {showAiAudit ? "Masquer" : "Afficher"}
                              </span>
                            </button>

                            {showAiAudit && (
                              <div className="p-4 flex flex-col gap-3.5 bg-gradient-to-br from-amber-50/10 via-white to-amber-50/5 text-slate-700">
                                <div className="flex justify-between items-center border-b border-neutral-150 pb-2">
                                  <span className="text-[11px] font-bold text-slate-750">Recommandation Générale :</span>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                                    previewDoc.aiAnalysis.action_recommandee === "VALIDER"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : previewDoc.aiAnalysis.action_recommandee === "REJETER"
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}>
                                    {previewDoc.aiAnalysis.action_recommandee}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col text-left">
                                    <span className="text-slate-400 block font-semibold mb-0.5">Type Détecté</span>
                                    <span className="font-bold text-slate-855">{previewDoc.aiAnalysis.type_document || "Inconnu"}</span>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col text-left">
                                    <span className="text-slate-400 block font-semibold mb-0.5">Confiance Analyse</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="font-bold text-slate-855">{previewDoc.aiAnalysis.confiance}%</span>
                                      <div className="w-12 h-1.5 bg-neutral-200 rounded-full overflow-hidden shrink-0">
                                        <div 
                                          className={`h-full rounded-full ${
                                            (previewDoc.aiAnalysis.confiance >= 80) ? "bg-emerald-500" : ((previewDoc.aiAnalysis.confiance >= 50) ? "bg-amber-500" : "bg-rose-500")
                                          }`} 
                                          style={{ width: previewDoc.aiAnalysis.confiance + "%" }} 
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col text-left">
                                    <span className="text-slate-400 block font-semibold mb-0.5">Lisibilité</span>
                                    <span className={`font-bold ${previewDoc.aiAnalysis.est_lisible ? "text-emerald-700" : "text-rose-600"}`}>
                                      {previewDoc.aiAnalysis.est_lisible ? "Oui (Lisible)" : "Non (Flou)"}
                                    </span>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col text-left">
                                    <span className="text-slate-400 block font-semibold mb-0.5">Authenticité</span>
                                    <span className={`font-bold ${
                                      previewDoc.aiAnalysis.est_authentique === true 
                                        ? "text-emerald-700" 
                                        : previewDoc.aiAnalysis.est_authentique === false 
                                          ? "text-rose-600" 
                                          : "text-amber-600"
                                    }`}>
                                      {previewDoc.aiAnalysis.est_authentique === true 
                                        ? "Conforme" 
                                        : previewDoc.aiAnalysis.est_authentique === false 
                                          ? "Douteux" 
                                          : "Incertain"}
                                    </span>
                                  </div>
                                </div>

                                {/* Extracted Details Grid */}
                                <div className="bg-white border border-neutral-150 rounded-lg p-3">
                                  <span className="font-sans text-[10px] font-bold text-slate-655 uppercase tracking-wide block mb-2 text-left">Données Extrapolées par l'IA :</span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[10.5px]">
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                      <span className="text-slate-400 font-medium">Nom :</span>
                                      <span className="font-bold text-slate-800">{previewDoc.aiAnalysis.infos_extraites?.nom || "—"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                      <span className="text-slate-400 font-medium">Prénoms :</span>
                                      <span className="font-bold text-slate-855">{previewDoc.aiAnalysis.infos_extraites?.prenoms || "—"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                      <span className="text-slate-400 font-medium">Né(e) le :</span>
                                      <span className="font-bold text-slate-800">{previewDoc.aiAnalysis.infos_extraites?.date_naissance || "—"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                      <span className="text-slate-400 font-medium">Lieu de Naissance :</span>
                                      <span className="font-bold text-slate-800">{previewDoc.aiAnalysis.infos_extraites?.lieu_naissance || "—"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                      <span className="text-slate-400 font-medium">N° Document :</span>
                                      <span className="font-mono font-bold text-slate-800">{previewDoc.aiAnalysis.infos_extraites?.numero_document || "—"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                      <span className="text-slate-400 font-medium">Date Expiration :</span>
                                      <span className="font-bold text-slate-800">{previewDoc.aiAnalysis.infos_extraites?.date_expiration || "—"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                      <span className="text-slate-400 font-medium">Nationalité :</span>
                                      <span className="font-bold text-slate-800">{previewDoc.aiAnalysis.infos_extraites?.nationalite || "—"}</span>
                                    </div>
                                    {previewDoc.aiAnalysis.date_delivrance_detectee && (
                                      <div className="flex justify-between border-b border-amber-100 pb-1 bg-amber-50/30 px-1.5 py-0.5 rounded col-span-1 sm:col-span-2">
                                        <span className="text-amber-800 font-semibold">
                                          {(previewDoc.aiAnalysis.type_document === 'CNI' || previewDoc.aiAnalysis.type_document === 'PASSEPORT')
                                            ? "📅 Date d'expiration :"
                                            : "📅 Date de délivrance :"}
                                        </span>
                                        <span className="font-bold text-amber-950">{previewDoc.aiAnalysis.date_delivrance_detectee}</span>
                                      </div>
                                    )}
                                    {previewDoc.aiAnalysis.date_limite_calculee && (
                                      <div className="flex justify-between border-b border-neutral-200 pb-1 bg-neutral-50 px-1.5 py-0.5 rounded col-span-1 sm:col-span-2">
                                        <span className="text-slate-600 font-semibold">
                                          {(previewDoc.aiAnalysis.type_document === 'CNI' || previewDoc.aiAnalysis.type_document === 'PASSEPORT')
                                            ? "⏳ Seuil de validité (Aujourd'hui) :"
                                            : "⏳ Limite de validité :"}
                                        </span>
                                        <span className="font-bold text-slate-800">{previewDoc.aiAnalysis.date_limite_calculee}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Mistral Double Verification Details */}
                                {previewDoc.aiAnalysis.doubleVerification && (
                                  <div className="border border-indigo-200 bg-indigo-50/10 rounded-lg p-3 text-[10.5px] text-left">
                                    <span className="font-sans text-[10px] font-bold text-indigo-700 uppercase tracking-wide block mb-1.5 flex items-center gap-1">
                                      🔮 Double Contrôle de Cohérence (Mistral Small)
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
                                      <div className="flex justify-between">
                                        <span className="text-slate-500">Validation Première Analyse :</span>
                                        <span className={`font-bold ${previewDoc.aiAnalysis.doubleVerification.confirmation_analyse === "CONFIRME" ? "text-emerald-700" : "text-rose-700"}`}>
                                          {previewDoc.aiAnalysis.doubleVerification.confirmation_analyse}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500">Correspondance Déclarative :</span>
                                        <span className={`font-bold ${previewDoc.aiAnalysis.doubleVerification.infos_coherentes ? "text-emerald-700" : "text-rose-700"}`}>
                                          {previewDoc.aiAnalysis.doubleVerification.infos_coherentes ? "COHÉRENT" : "DIVERGENT"}
                                        </span>
                                      </div>
                                    </div>
                                    {previewDoc.aiAnalysis.doubleVerification.divergences && (previewDoc.aiAnalysis.doubleVerification.divergences.length > 0) && (
                                      <div className="mt-2 text-rose-800 bg-rose-50/50 p-2 rounded border border-rose-100">
                                        <span className="font-bold block mb-0.5">Divergences signalées :</span>
                                        <ul className="list-disc pl-4 space-y-0.5 font-medium">
                                          {previewDoc.aiAnalysis.doubleVerification.divergences.map((divergence, i) => (
                                            <li key={i}>{divergence}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Anomalies List */}
                                {(previewDoc.aiAnalysis.anomalies && previewDoc.aiAnalysis.anomalies.length > 0) ? (
                                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-rose-900 text-[10.5px] text-left">
                                    <span className="font-bold block mb-1">Anomalies détectées par l'audit :</span>
                                    <ul className="list-disc pl-4 space-y-0.5 font-medium">
                                      {previewDoc.aiAnalysis.anomalies.map((anom, idx) => (
                                        <li key={idx}>{anom}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : (
                                  <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg text-emerald-855 text-[10px] font-bold text-left">
                                    ✓ Aucune anomalie détectée sur la pièce justificative.
                                  </div>
                                )}

                                {/* Audit Motif / Verdict */}
                                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10.5px] text-left">
                                  <span className="font-bold text-slate-800 block mb-1">Justification du Verdict IA :</span>
                                  <p className="text-slate-650 leading-relaxed font-semibold italic">"{basicEnglishToFrenchFallback(previewDoc.aiAnalysis.motif || "Aucun motif renseigné")}"</p>
                                </div>
                                
                                {/* Quick Apply Button */}
                                {previewDoc.status === "pending" && (
                                  <div className="border-t border-slate-100 pt-3 flex justify-end">
                                    <button
                                      type="button"
                                      disabled={isLocked}
                                      onClick={async () => {
                                        if (isLocked) return;
                                        if (previewDoc.aiAnalysis?.action_recommandee === "VALIDER") {
                                          setCheckedDocs(prev => ({ ...prev, [previewDoc.id]: true }));
                                          addNotification("Recommandation IA (Approbation) appliquée localement.", "success");
                                        } else if (previewDoc.aiAnalysis?.action_recommandee === "REJETER") {
                                          setCheckedDocs(prev => ({ ...prev, [previewDoc.id]: false }));
                                          setRejectionReasons(prev => ({ ...prev, [previewDoc.id]: basicEnglishToFrenchFallback(previewDoc.aiAnalysis.motif || "") }));
                                          addNotification("Recommandation IA (Rejet) appliquée localement.", "info");
                                        } else {
                                          addNotification("La recommandation IA requiert un contrôle manuel approfondi.", "info");
                                        }
                                      }}
                                      className={`px-4 py-2 text-[10.5px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                        isLocked
                                          ? "bg-neutral-250 text-slate-400 border border-neutral-300 cursor-not-allowed shadow-none font-bold"
                                          : previewDoc.aiAnalysis.action_recommandee === "VALIDER"
                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                            : previewDoc.aiAnalysis.action_recommandee === "REJETER"
                                              ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                                              : "bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                                      }`}
                                    >
                                      {previewDoc.aiAnalysis.action_recommandee === 'VALIDER' && '✨ Appliquer l\'Approbation IA'}
                                      {previewDoc.aiAnalysis.action_recommandee === 'REJETER' && '⚠️ Appliquer le Rejet IA'}
                                      {previewDoc.aiAnalysis.action_recommandee === 'VERIFIER_MANUELLEMENT' && '🔍 Conserver pour contrôle manuel'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Document Verification Controls */}
                        <div className="border-t border-slate-100 pt-3 mt-2 flex flex-col gap-3 font-sans text-xs">
                          {previewBlobUrl && (
                            <div className="flex justify-start">
                              <a
                                href={previewBlobUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer no-underline text-[10px]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Plein écran
                              </a>
                            </div>
                          )}

                          <div className="w-full">
                            {previewDoc.fileName ? (
                              <div className="flex flex-col gap-2.5 w-full bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                <label className="inline-flex items-center gap-2 cursor-pointer font-sans text-[11px] font-bold text-slate-700 select-none">
                                  <input
                                    type="checkbox"
                                    checked={checkedDocs[previewDoc.id] || false}
                                    onChange={(e) => {
                                      if (isLocked) return;
                                      setCheckedDocs(prev => ({ ...prev, [previewDoc.id]: e.target.checked }));
                                    }}
                                    disabled={isLocked}
                                    className="w-4 h-4 text-primary rounded border-neutral-300 focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                                  />
                                  <span>Conforme (Valider ce document)</span>
                                </label>
                                
                                {!(checkedDocs[previewDoc.id] || false) && (
                                  <div className="flex flex-col gap-1 w-full text-left">
                                    <span className="text-[10px] font-bold text-rose-700 font-sans">Motif du rejet (transmis aux époux) :</span>
                                    <textarea
                                      value={rejectionReasons[previewDoc.id] || ''}
                                      onChange={(e) => {
                                        if (isLocked) return;
                                        setRejectionReasons(prev => ({ ...prev, [previewDoc.id]: e.target.value }));
                                      }}
                                      disabled={isLocked}
                                      placeholder="Spécifiez la raison du rejet (ex: CNI périmée, document flou...)"
                                      className="w-full text-xs font-sans border border-neutral-350 rounded-lg p-2 h-16 bg-white text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-left">
                                <span className="px-3 py-2 bg-rose-50 text-rose-800 border border-rose-100 rounded-lg text-[10px] font-semibold italic">
                                  En attente de dépôt
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-neutral-300 rounded-xl p-8 bg-neutral-50/50 text-center text-slate-400 text-xs italic min-h-[550px] flex flex-col items-center justify-center">
                        <FileText className="w-8 h-8 text-neutral-300 mb-2" />
                        Sélectionnez un document à gauche pour l'examiner ici
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Tab 2: Planning & Decision layout */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto max-h-[60vh] pr-2">
                  {/* Notes & Oppositions (lg:col-span-2) */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Internal Notes Section */}
                    <div className="flex flex-col gap-4 text-left">
                      <h4 className="font-serif text-sm font-bold text-slate-800 flex items-center gap-1.5 pb-1 border-b border-neutral-100">
                        <ClipboardList className="w-4 h-4 text-primary" />
                        Notes Administratives Internes (Officier Civil)
                      </h4>

                      <form onSubmit={handleAddNote} className="flex gap-2">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder={isLocked ? "L'ajout de note est verrouillé..." : "Ajouter une remarque interne sur ce dossier..."}
                          className="flex-1 border border-neutral-300 rounded-xl px-4 py-2 bg-white text-xs focus:border-primary focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
                        />
                        <button
                          type="submit"
                          disabled={isLocked}
                          className={`px-4 py-2 font-semibold rounded-xl text-xs transition-colors ${
                            isLocked
                              ? 'bg-neutral-250 text-neutral-400 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-slate-900 text-white cursor-pointer'
                          }`}
                        >
                          Ajouter
                        </button>
                      </form>

                      {notesList.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic text-left">Aucune note interne sur ce dossier pour le moment.</p>
                      ) : (
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                          {notesList.map((note) => (
                            <div key={note.id} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex justify-between items-start gap-3 text-left">
                              <div className="flex flex-col gap-0.5 text-xs">
                                <p className="text-slate-700 leading-normal font-medium">{note.text}</p>
                                <span className="text-[9px] text-slate-400 font-semibold">{note.date} • Officier Municipal</span>
                              </div>
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleDeleteNote(note.id)}
                                className={`p-0.5 shrink-0 transition-colors ${
                                  isLocked
                                    ? 'text-neutral-300 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-rose-600 cursor-pointer'
                                }`}
                                title={isLocked ? "Action verrouillée" : "Supprimer la note"}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Oppositions Civiles Section */}
                    <div className="flex flex-col gap-4 text-left">
                      <h4 className="font-serif text-sm font-bold text-slate-800 flex items-center gap-1.5 pb-1 border-b border-neutral-100">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        Oppositions Civiles Déposées (Mise en demeure)
                      </h4>

                      {oppositions.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic text-left">Aucune opposition civile formulée à ce jour pour cette union.</p>
                      ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                          {oppositions.map((opp) => (
                            <div 
                              key={opp.id} 
                              className={`p-4 rounded-xl border flex flex-col gap-2.5 text-left text-xs transition-all ${
                                opp.status === 'validated'
                                  ? 'bg-rose-50/50 border-rose-200 shadow-sm'
                                  : opp.status === 'dismissed'
                                    ? 'bg-emerald-50/30 border-emerald-100 opacity-75'
                                    : 'bg-amber-50/50 border-amber-200 shadow-sm'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-800">{opp.opposerName}</span>
                                  <span className="text-[10px] text-slate-500 font-semibold">{opp.opposerRole}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  opp.status === 'validated'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : opp.status === 'dismissed'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {opp.status === 'validated' ? 'Confirmée' : opp.status === 'dismissed' ? 'Levée / Rejetée' : 'En attente'}
                                </span>
                              </div>

                              <div className="bg-white/60 p-2.5 rounded-lg border border-neutral-200/50 text-[11px] text-slate-700 leading-normal">
                                <p className="font-semibold text-slate-800 text-[10px] mb-0.5">Motif : {opp.reason}</p>
                                {opp.details && <p className="text-slate-650 mt-1">{opp.details}</p>}
                              </div>

                              {opp.fileName && (
                                <div className="flex items-center justify-between text-[10px] bg-white/40 p-2 rounded-lg border border-neutral-200/40">
                                  <span className="text-slate-550 truncate max-w-[200px]">📄 {opp.fileName}</span>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const blob = await downloadDocumentFile('oppositions', opp.id, opp.fileName || '');
                                        if (blob) {
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = opp.fileName || 'justificatif_opposition.pdf';
                                          a.click();
                                          URL.revokeObjectURL(url);
                                        } else {
                                          addNotification("Fichier introuvable", "warning");
                                        }
                                      } catch (err) {
                                        console.error("Failed to download file:", err);
                                        addNotification("Erreur de téléchargement", "warning");
                                      }
                                    }}
                                    className="text-primary hover:text-primary-container font-bold cursor-pointer underline shrink-0"
                                  >
                                    Télécharger la pièce
                                  </button>
                                </div>
                              )}

                              {opp.status === 'pending' && (
                                <div className="flex gap-2 justify-end pt-1.5 border-t border-neutral-200/50">
                                  <button
                                    type="button"
                                    disabled={isLocked}
                                    onClick={() => handleUpdateOppositionStatus(opp.id, 'dismissed')}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                      isLocked
                                        ? 'bg-neutral-250 text-neutral-400 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                    }`}
                                  >
                                    Rejeter &amp; Lever
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isLocked}
                                    onClick={() => handleUpdateOppositionStatus(opp.id, 'validated')}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                      isLocked
                                        ? 'bg-neutral-250 text-neutral-400 cursor-not-allowed'
                                        : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                                    }`}
                                  >
                                    Confirmer l'Opposition
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decision, Planification, Audition and Timeline (lg:col-span-1) */}
                  <div className="flex flex-col gap-6">
                    {/* Status & Decision Banner */}
                    <div className="glass-card rounded-xl p-5 border border-primary/25 bg-primary/5 flex flex-col gap-3">
                      <h5 className="font-serif text-sm font-bold text-slate-800">Décision d'État Civil</h5>

                      {hasActiveOpposition && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] flex items-start gap-2 select-none leading-relaxed text-left my-1 animate-pulse">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-bold text-rose-900">Union Suspendue</p>
                            <p className="text-[10px] text-rose-800/90 leading-tight">
                              Une opposition civile active bloque ce dossier.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 font-sans text-xs">
                        <span className="font-semibold text-secondary">Statut :</span>
                        <span className="font-bold uppercase text-primary">{selectedDossier.status.replace('_', ' ')}</span>
                      </div>

                      {selectedDossier.status === 'under_review' && (
                        <div className="flex flex-col gap-3 mt-1.5 text-left">
                          <span className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contrôles Pré-Publication</span>
                          
                          {/* Condition 1: Validation IA */}
                          <div className="flex flex-col gap-1 p-2.5 bg-white border border-neutral-150 rounded-xl text-left shadow-sm">
                            <div className="flex items-center gap-2">
                              {allRequiredDocsVerified ? (
                                <span className="text-emerald-650 font-bold">✅</span>
                              ) : (
                                <span className="text-amber-500 font-bold">⚠️</span>
                              )}
                              <div className="flex flex-col">
                                <span className="font-bold text-[10.5px] text-slate-800">1. Validation IA (OpenRouter + Mistral)</span>
                                <span className="text-[9.5px] text-slate-500 font-semibold">
                                  {allRequiredDocsVerified ? "Tous les documents obligatoires validés" : "En attente de la validation des documents"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Condition 2: Contrôle Physique */}
                          <div className="flex flex-col gap-1 p-2.5 bg-white border border-neutral-150 rounded-xl text-left shadow-sm">
                            <div className="flex items-start gap-2">
                              {selectedDossier.physical_verified ? (
                                <span className="text-emerald-650 font-bold mt-0.5">✅</span>
                              ) : (
                                <span className="text-amber-500 font-bold mt-0.5">⚠️</span>
                              )}
                              <div className="flex flex-col w-full">
                                <span className="font-bold text-[10.5px] text-slate-800">2. Contrôle Physique des Originaux</span>
                                <span className="text-[9.5px] text-slate-500 font-semibold mb-1">
                                  {selectedDossier.physical_verified ? "Vérification des pièces physiques effectuée" : "Présentation physique des pièces requise"}
                                </span>
                                {!selectedDossier.physical_verified && (
                                  <button
                                    type="button"
                                    disabled={isLocked || hasActiveOpposition}
                                    onClick={handleConfirmPhysicalVerification}
                                    className={`py-1.5 px-3 rounded-lg font-bold text-[9px] w-fit text-center transition-all ${
                                      (isLocked || hasActiveOpposition)
                                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                                        : 'bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer border border-primary/20'
                                    }`}
                                  >
                                    Confirmer la vérification des originaux
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Condition 3: Paiement des droits */}
                          <div className="flex flex-col gap-1 p-2.5 bg-white border border-neutral-150 rounded-xl text-left shadow-sm">
                            <div className="flex items-start gap-2">
                              {(selectedDossierPayment?.status === 'success') ? (
                                <span className="text-emerald-650 font-bold mt-0.5">✅</span>
                              ) : (
                                <span className="text-amber-500 font-bold mt-0.5">⚠️</span>
                              )}
                              <div className="flex flex-col w-full">
                                <span className="font-bold text-[10.5px] text-slate-800">3. Droits de Timbre Municipaux</span>
                                <span className="text-[9.5px] text-slate-500 font-semibold mb-1">
                                  {(selectedDossierPayment?.status === 'success')
                                    ? `Acquitté (50 000 XOF - ${selectedDossierPayment.method})`
                                    : "Paiement de 50 000 XOF requis"
                                  }
                                </span>
                                {!(selectedDossierPayment?.status === 'success') && (
                                  <button
                                    type="button"
                                    disabled={isLocked || hasActiveOpposition}
                                    onClick={handleRecordMairiePayment}
                                    className={`py-1.5 px-3 rounded-lg font-bold text-[9px] w-fit text-center transition-all ${
                                      (isLocked || hasActiveOpposition)
                                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer border border-emerald-200'
                                    }`}
                                  >
                                    Enregistrer le paiement physique
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Button: Publish Bans */}
                          <button
                            onClick={handlePublishBans}
                            disabled={!(allRequiredDocsVerified && selectedDossier.physical_verified && selectedDossierPayment?.status === 'success') || isLocked || hasActiveOpposition}
                            className={`mt-2 w-full py-2.5 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 ${
                              (allRequiredDocsVerified && selectedDossier.physical_verified && selectedDossierPayment?.status === 'success' && !isLocked && !hasActiveOpposition)
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer hover:shadow-md'
                                : 'bg-neutral-250 text-slate-400 cursor-not-allowed border border-neutral-300'
                            }`}
                            title={
                              isLocked 
                                ? "Dossier verrouillé en raison d'une suspicion de fraude par l'IA" 
                                : hasActiveOpposition 
                                  ? "Action bloquée par une opposition civile active" 
                                  : !(allRequiredDocsVerified && selectedDossier.physical_verified && selectedDossierPayment?.status === 'success') 
                                    ? "Les 3 conditions réglementaires doivent être remplies pour publier les bans." 
                                    : "Valider et publier les bans de mariage"
                            }
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Valider et Publier les Bans
                          </button>
                        </div>
                      )}

                      {selectedDossier.status === 'approved' && (
                        <div className="flex flex-col gap-3.5 mt-1 text-left">
                          <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 font-sans text-xs flex flex-col gap-1.5 shadow-sm leading-relaxed">
                            <span className="font-bold text-indigo-900 flex items-center gap-1.5 text-[12px]">
                              📢 Bans Publics Publiés
                            </span>
                            <span>La période légale d'affichage obligatoire de 10 jours est en cours.</span>
                            {selectedDossier.bans_published_at && (
                              <span className="text-[10px] text-indigo-700 font-semibold font-mono block mt-1">
                                Publié le : {new Date(selectedDossier.bans_published_at).toLocaleDateString('fr-FR')} (Délai légal en cours)
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={handleCelebrateDossier}
                            disabled={hasActiveOpposition || isLocked}
                            className={`w-full py-3 font-sans text-xs font-bold uppercase tracking-wider rounded-xl shadow transition-all flex items-center justify-center gap-1.5 ${
                              (hasActiveOpposition || isLocked)
                                ? 'bg-neutral-250 text-slate-400 cursor-not-allowed border border-neutral-300 shadow-none'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-lg'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4 text-accent" />
                            Célébrer le Mariage &amp; Clôturer les Bans
                          </button>
                          
                          <button
                            onClick={handleRejectPhysicalDossier}
                            disabled={hasActiveOpposition || isLocked}
                            className={`w-full py-2.5 font-sans text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                              (hasActiveOpposition || isLocked)
                                ? 'bg-neutral-250 text-slate-400 cursor-not-allowed border border-neutral-300 shadow-none'
                                : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                            }`}
                          >
                            <X className="w-4 h-4" />
                            Annuler le dossier (Retirer les bans)
                          </button>
                        </div>
                      )}

                      {selectedDossier.status === 'celebrated' && (
                        <div className="flex flex-col gap-2">
                          <div className="p-3 bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5">
                            🎉 Mariage Célébré
                          </div>
                          <button
                            onClick={() => setShowCertificateId(selectedDossier.id)}
                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-1.5"
                          >
                            <FileText className="w-4 h-4" />
                            Acte de Mariage
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Instruction Checklist */}
                    <div className="glass-card rounded-xl p-5 border border-neutral-250 flex flex-col gap-3">
                      <h5 className="font-serif text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-primary" />
                        Checklist d'Instruction
                      </h5>

                      <div className="flex flex-col gap-2 font-sans text-xs">
                        {dossierDocs.map((doc) => {
                          const isVerified = doc.status === 'verified';
                          return (
                            <div key={doc.id} className="flex items-center gap-2 text-left">
                              <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${isVerified ? 'bg-primary border-primary text-white' : 'border-neutral-300 bg-white'
                                }`}>
                                {isVerified && <Check className="w-3 h-3 text-accent font-bold" />}
                              </div>
                              <span className={isVerified ? 'text-slate-500 line-through font-medium' : 'text-slate-700 font-semibold'}>
                                {doc.name}
                              </span>
                            </div>
                          );
                        })}

                        {/* wedding_date */}
                        <div className="flex items-center gap-2 text-left border-t border-neutral-100 pt-2 mt-1">
                          <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${isDateSet ? 'bg-primary border-primary text-white' : 'border-neutral-300 bg-white'
                            }`}>
                            {isDateSet && <Check className="w-3 h-3 text-accent font-bold" />}
                          </div>
                          <span className={isDateSet ? 'text-slate-500 line-through font-medium' : 'text-slate-700 font-semibold'}>
                            Célébration planifiée
                          </span>
                        </div>

                        {/* appointment_date */}
                        <div className="flex items-center gap-2 text-left">
                          <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${isAppointmentSet ? 'bg-primary border-primary text-white' : 'border-neutral-300 bg-white'
                            }`}>
                            {isAppointmentSet && <Check className="w-3 h-3 text-accent font-bold" />}
                          </div>
                          <span className={isAppointmentSet ? 'text-slate-500 line-through font-medium' : 'text-slate-700 font-semibold'}>
                            Rendez-vous physique fixé
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* === BLOC : Accès Agent de Mairie (Admin uniquement) === */}
                    {currentRole !== 'mairie' && (
                      <div className={`rounded-xl p-4 border flex flex-col gap-3 ${
                        selectedDossier.mairie_exam_unlocked
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-slate-50 border-neutral-250'
                      }`}>
                        <h5 className="font-serif text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          {selectedDossier.mairie_exam_unlocked
                            ? <Unlock className="w-4 h-4 text-emerald-600" />
                            : <Lock className="w-4 h-4 text-slate-500" />
                          }
                          Accès de l'Agent de Mairie
                        </h5>

                        <div className="flex items-start gap-2 text-xs text-slate-600 font-sans">
                          {selectedDossier.mairie_exam_unlocked ? (
                            <span className="text-emerald-700 font-semibold">
                              ✅ L'agent de mairie est actuellement <strong>autorisé</strong> à examiner ce dossier.
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              🔒 L'agent de mairie ne peut pas encore examiner ce dossier. Cliquez sur le bouton ci-dessous pour lui donner accès temporairement.
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedDossier) return;
                            const newValue = !selectedDossier.mairie_exam_unlocked;
                            const ok = await toggleMairieExamUnlock(selectedDossier.id, newValue);
                            if (ok) {
                              setSelectedDossier(prev => prev ? { ...prev, mairie_exam_unlocked: newValue } : null);
                              setDossiers(prev => prev.map(d => d.id === selectedDossier.id ? { ...d, mairie_exam_unlocked: newValue } : d));
                              addNotification(
                                newValue
                                  ? `✅ Accès "Examiner" débloqué pour l'agent de mairie.`
                                  : `🔒 Accès "Examiner" re-bloqué pour l'agent de mairie.`,
                                newValue ? 'success' : 'warning'
                              );
                              logSystemAction(
                                `${newValue ? 'Déblocage' : 'Blocage'} de l'accès examen mairie pour le dossier de ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name}`,
                                newValue ? 'success' : 'warning'
                              );
                            }
                          }}
                          className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border ${
                            selectedDossier.mairie_exam_unlocked
                              ? 'bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 cursor-pointer'
                              : 'bg-emerald-600 border-emerald-700/20 text-white hover:bg-emerald-700 cursor-pointer shadow-sm'
                          }`}
                        >
                          {selectedDossier.mairie_exam_unlocked ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              Re-bloquer l'accès de l'agent
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              Débloquer l'accès de l'agent de mairie
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Calendrier de Planification */}
                    <div className="glass-card rounded-xl p-5 border border-neutral-250 flex flex-col gap-5">
                      {/* Part A: Célébration de Mariage */}
                      <div className="flex flex-col gap-3">
                        <h5 className="font-serif text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-neutral-100 pb-1.5">
                          <Calendar className="w-4 h-4 text-primary" />
                          Planification de la Célébration
                        </h5>

                        <div className="flex flex-col gap-3 font-sans text-xs">
                          {selectedDossier.status !== 'celebrated' ? (
                            currentRole === 'mairie' && selectedDossier.wedding_date ? (
                              <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-xl text-left text-amber-800 text-[10px] flex items-start gap-1.5 font-sans">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <span>La date de célébration a déjà été planifiée. Seul le Super Administrateur peut la modifier pour éviter toute fraude.</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-col gap-1 text-left">
                                  <label className="font-semibold text-slate-700">Choisir une date de mariage :</label>
                                  <input
                                    type="date"
                                    disabled={isLocked}
                                    value={selectedDateVal}
                                    onChange={(e) => setSelectedDateVal(e.target.value)}
                                    className="border border-neutral-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-primary text-xs disabled:bg-neutral-50 disabled:text-slate-400 disabled:border-neutral-200"
                                  />
                                </div>

                                {selectedDateVal && (
                                  <div className="flex flex-col gap-1 text-left animate-fade-in">
                                    <label className="font-semibold text-slate-700">Créneaux horaires disponibles :</label>
                                    <div className="grid grid-cols-3 gap-2 mt-1">
                                      {timeSlots.map((slot) => {
                                        const displayDate = formatWeddingDate(selectedDateVal, slot);
                                        const isSelected = selectedDossier?.wedding_date === displayDate;
                                        const isOccupied = dossiers.some(d =>
                                          d.id !== selectedDossier?.id &&
                                          d.mairie_id === selectedDossier?.mairie_id &&
                                          d.wedding_date === displayDate
                                        );

                                        return (
                                          <button
                                            key={slot}
                                            type="button"
                                            disabled={isOccupied || isLocked}
                                            onClick={async () => {
                                              if (!selectedDossier || isLocked) return;
                                              const newDateStr = displayDate;
                                              const success = await updateDossierWeddingDate(selectedDossier.id, newDateStr);
                                              if (success) {
                                                // Automatically calculate and save appointment date
                                                const computedRdv = computeRdvFromWeddingDate(newDateStr, rdvDelayDays);
                                                if (computedRdv) {
                                                  await updateDossierAppointmentDate(selectedDossier.id, computedRdv);
                                                }
                                                setSelectedDossier(prev => prev ? { ...prev, wedding_date: newDateStr, appointment_date: computedRdv } : null);
                                                setDossiers(prev => prev.map(d => d.id === selectedDossier.id ? { ...d, wedding_date: newDateStr, appointment_date: computedRdv } : d));
                                                addNotification(`Célébration planifiée au ${newDateStr} et rendez-vous calculé automatiquement !`, 'success');
                                                logSystemAction(`Date de célébration fixée au ${newDateStr} et RDV calculé au ${computedRdv} pour ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name}`, 'success');
                                              }
                                            }}
                                            className={`py-2 px-1 rounded-lg border text-[10px] text-center font-bold transition-all ${
                                              (isOccupied || isLocked)
                                                ? 'bg-neutral-100 border-neutral-200 text-neutral-400 line-through cursor-not-allowed'
                                                : isSelected
                                                  ? 'bg-primary border-primary text-white shadow-sm font-bold cursor-pointer'
                                                  : 'bg-white border-neutral-205 hover:border-primary hover:text-primary text-slate-700 cursor-pointer'
                                            }`}
                                            title={isLocked ? "Dossier suspecté et verrouillé" : isOccupied ? "Créneau déjà occupé par un autre mariage" : undefined}
                                          >
                                            {slot.replace(':', 'h')} {(isOccupied && !isLocked) && " (Occupé)"}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </>
                            )
                          ) : (
                            <p className="text-[10px] text-slate-500 italic text-left">Le mariage a été célébré, la date n'est plus modifiable.</p>
                          )}

                          {selectedDossier?.wedding_date && (
                            <div className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg flex items-center gap-1.5 text-left">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              Planifié le : {selectedDossier.wedding_date}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Part B: Rendez-vous d'audition en Mairie */}
                      <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4">
                        <h5 className="font-serif text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-neutral-100 pb-1.5">
                          <Clock className="w-4 h-4 text-accent" />
                          Rendez-vous obligatoire en Mairie
                        </h5>

                        <div className="flex flex-col gap-3 font-sans text-xs">
                          {selectedDossier.status !== 'celebrated' ? (
                            currentRole === 'mairie' && selectedDossier.appointment_date ? (
                              <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-xl text-left text-amber-800 text-[10px] flex items-start gap-1.5 font-sans">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <span>Le rendez-vous obligatoire a déjà été fixé automatiquement. Seul le Super Administrateur peut le modifier pour éviter toute fraude.</span>
                              </div>
                            ) : (
                              <>
                                {selectedDossier.wedding_date ? (
                                  <div className="p-3.5 bg-emerald-50/40 border border-emerald-250/30 rounded-xl flex flex-col gap-2.5 text-left">
                                    {/* Info : calcul automatique */}
                                    <div className="flex items-start gap-2">
                                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                                      </div>
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Calcul Automatique du Rendez-vous</span>
                                        <span className="text-[11px] text-slate-600 font-sans">
                                          Le RDV est fixé <span className="font-bold text-emerald-700">{rdvDelayDays} jours avant</span> la date de célébration.
                                        </span>
                                        <span className="text-[12px] text-emerald-800 font-bold font-sans mt-0.5">
                                          📅 {computeRdvFromWeddingDate(selectedDossier.wedding_date, rdvDelayDays) || 'Date invalide'}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Bouton validation */}
                                    <button
                                      type="button"
                                      disabled={isApprovingCouple || isLocked}
                                      onClick={async () => {
                                        if (!selectedDossier || isLocked) return;
                                        setIsApprovingCouple(true);
                                        const result = await approveAndNotifyCouple(selectedDossier.id, rdvDelayDays);
                                        if (result.success && result.appointmentDate) {
                                          setSelectedDossier(prev => prev ? { ...prev, appointment_date: result.appointmentDate } : null);
                                          setDossiers(prev => prev.map(d => d.id === selectedDossier.id ? { ...d, appointment_date: result.appointmentDate } : d));
                                          addNotification(`Dossier validé et RDV planifié le ${result.appointmentDate} !`, 'success');
                                          logSystemAction(`Dossier validé automatiquement, RDV fixé le ${result.appointmentDate} pour ${selectedDossier.spouse1_name} & ${selectedDossier.spouse2_name}`, 'success');
                                        } else {
                                          addNotification(`Erreur lors de la validation : ${result.error || 'Erreur inconnue'}`, 'warning');
                                        }
                                        setIsApprovingCouple(false);
                                      }}
                                      className={`py-2.5 px-3 rounded-xl border font-bold text-center text-xs transition-all flex items-center justify-center gap-1.5 ${
                                        !isLocked
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer border-emerald-700/20 shadow-sm'
                                          : 'bg-neutral-100 border-neutral-250 text-neutral-400 cursor-not-allowed'
                                      }`}
                                    >
                                      {isApprovingCouple ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          Calcul &amp; Notification en cours...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          Valider &amp; Notifier le couple
                                        </>
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-amber-50/80 border border-amber-200/50 rounded-xl text-left text-amber-800 text-[10px] flex items-start gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                    <span>Fixez d'abord la date de célébration du mariage pour que le rendez-vous en mairie soit calculé automatiquement.</span>
                                  </div>
                                )}
                              </>
                            )
                          ) : (
                            <p className="text-[10px] text-slate-500 italic text-left">Le mariage a été célébré, le rendez-vous n'est plus modifiable.</p>
                          )}

                          {selectedDossier?.appointment_date && (
                            <div className="text-[10px] text-primary font-semibold bg-rose-50 border border-primary/20 p-2.5 rounded-lg flex items-center gap-1.5 text-left">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              RDV fixé le : {selectedDossier.appointment_date}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Workflow Advancement Panel */}
                    <div className="glass-card rounded-xl p-5 flex flex-col gap-4">
                      <h5 className="font-serif text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Settings className="w-4 h-4 text-slate-400" />
                        Avancer le Parcours
                      </h5>

                      <div className="flex flex-col gap-2.5 font-sans text-[10px]">
                        <button
                          disabled={isLocked}
                          onClick={() => {
                            if (isLocked) return;
                            handleUpdateTimelineStep(2, 'completed', 'Choix de la mairie');
                          }}
                          className={`w-full text-left py-2 px-3 border rounded-lg font-semibold transition-colors ${
                            isLocked
                              ? 'bg-neutral-50 border-neutral-200 text-neutral-300 cursor-not-allowed'
                              : 'bg-white border-neutral-200 hover:border-primary cursor-pointer'
                          }`}
                        >
                          1. Valider Choix de la Mairie
                        </button>

                        <button
                          disabled={isLocked}
                          onClick={() => {
                            if (isLocked) return;
                            handleUpdateTimelineStep(3, 'completed', 'Option de date');
                          }}
                          className={`w-full text-left py-2 px-3 border rounded-lg font-semibold transition-colors ${
                            isLocked
                              ? 'bg-neutral-50 border-neutral-200 text-neutral-300 cursor-not-allowed'
                              : 'bg-white border-neutral-200 hover:border-primary cursor-pointer'
                          }`}
                        >
                          2. Confirmer l'Option de Date
                        </button>

                        <button
                          disabled={isLocked}
                          onClick={() => {
                            if (isLocked) return;
                            handleUpdateTimelineStep(4, 'completed', 'Dépôt des documents');
                          }}
                          className={`w-full text-left py-2 px-3 border rounded-lg font-semibold transition-colors ${
                            isLocked
                              ? 'bg-neutral-50 border-neutral-200 text-neutral-300 cursor-not-allowed'
                              : 'bg-white border-neutral-200 hover:border-primary cursor-pointer'
                          }`}
                        >
                          3. Valider le Dépôt de Dossier
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- REJECTION REASON MODAL -------------------- */}
      <AnimatePresence>
        {rejectingDocId && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 backdrop-blur-md px-4 text-left">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-md p-6 border border-outline-variant shadow-2xl relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h3 className="font-serif text-lg font-bold text-rose-900 border-b border-neutral-100 pb-3 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Motif de rejet du document
              </h3>

              <p className="font-sans text-xs text-secondary mb-4 leading-relaxed">
                Veuillez indiquer précisément au citoyen pourquoi cette pièce jointe est jugée non conforme par l'officier civil :
              </p>

              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Le document fourni est trop flou et illisible. Veuillez numériser l'acte de naissance complet avec filiation."
                className="w-full text-xs p-3.5 border border-neutral-300 rounded-xl bg-white mb-6 focus:border-rose-500 focus:outline-none"
              />

              <div className="flex gap-3 justify-end font-sans text-xs">
                <button
                  onClick={() => { setRejectingDocId(null); setRejectionReason(''); }}
                  className="px-4 py-2 border border-neutral-300 rounded-lg font-medium text-secondary hover:bg-neutral-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const doc = dossierDocs.find(d => d.id === rejectingDocId);
                    if (doc) handleRejectDoc(rejectingDocId, doc.name);
                  }}
                  className="px-5 py-2.5 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 shadow-md cursor-pointer"
                >
                  Refuser le Document
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- ACTE DE MARIAGE MODAL (WOW EFFECT) -------------------- */}
      <AnimatePresence>
        {showCertificateId && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/65 backdrop-blur-md px-4 py-8 overflow-y-auto print-certificate-modal-overlay">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-2xl p-6 md:p-8 border border-neutral-200 shadow-2xl relative my-auto print-certificate-modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {/* CSS Print Styles specific to this layout */}
              <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body {
                    background: white !important;
                    color: black !important;
                  }
                  .print-certificate-modal-overlay {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: white !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    display: block !important;
                    z-index: 99999 !important;
                  }
                  .print-certificate-modal-content {
                    border: 8px double #B4975A !important; /* Gold double border */
                    box-shadow: none !important;
                    width: 100% !important;
                    height: 100% !important;
                    margin: 0 !important;
                    padding: 40px !important;
                    background: white !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}} />

              {/* Close Button (no-print) */}
              <button
                onClick={() => setShowCertificateId(null)}
                className="no-print absolute top-4 right-4 w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-slate-400 hover:text-slate-800 cursor-pointer transition-colors"
              >
                ✕
              </button>

              {/* Certificate Inner Container (printable) */}
              <div className="flex flex-col gap-6 text-center border-4 border-double border-amber-600/40 p-6 md:p-8 rounded-xl bg-amber-50/10 min-h-[550px] relative overflow-hidden select-none">
                {/* Gold Watermark / Ornate Background Corner Accents */}
                <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-600/30"></div>
                <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-600/30"></div>
                <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-600/30"></div>
                <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-600/30"></div>

                {/* Sceau de la République (Header section) */}
                <div className="flex flex-col items-center gap-2">
                  <span className="font-serif text-[10px] uppercase tracking-widest text-slate-500 font-bold">République de Côte d'Ivoire</span>
                  <div className="flex items-center gap-1.5 my-1">
                    <div className="w-10 h-0.5 bg-[#FF8C00]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <div className="w-10 h-0.5 bg-[#009B77]"></div>
                  </div>
                  <span className="font-serif text-[9px] uppercase tracking-wider text-slate-400 font-bold">Union - Discipline - Travail</span>
                </div>

                <div className="mt-4 flex flex-col gap-1">
                  <h4 className="font-serif text-2xl md:text-3xl text-amber-800 font-bold tracking-wide uppercase">Acte de Mariage</h4>
                  <p className="font-mono text-[10px] text-slate-400 font-bold uppercase">Extrait des Registres de l'État Civil</p>
                </div>

                {/* Body details */}
                <div className="flex flex-col gap-4 text-xs font-serif text-slate-800 mt-6 leading-relaxed max-w-lg mx-auto">
                  <p className="text-left">
                    Devant nous, <span className="font-bold text-slate-900">{activeMairie?.officer_name || "l'Officier d'État Civil"}</span>, dûment habilité pour la commune de <span className="font-bold text-slate-900">{activeMairie?.name || "Cocody"}</span> ({activeMairie?.region || "Abidjan"}),
                  </p>

                  <p className="text-left">
                    Ont comparu publiquement et ont déclaré vouloir se prendre pour époux :
                  </p>

                  <div className="my-2 p-4 bg-amber-50/30 rounded-lg border border-amber-600/10 flex flex-col gap-3 font-sans text-left text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 block uppercase tracking-wider">Le Conjoint :</span>
                      <span className="font-bold text-slate-900 text-sm">{selectedDossier?.spouse1_name}</span>
                    </div>
                    <div className="border-t border-amber-600/10 pt-2.5">
                      <span className="text-[10px] font-bold text-amber-800 block uppercase tracking-wider">La Conjointe :</span>
                      <span className="font-bold text-slate-900 text-sm">{selectedDossier?.spouse2_name}</span>
                    </div>
                  </div>

                  <p className="text-left">
                    En présence des témoins majeurs requis, nous avons prononcé, au nom de la Loi, que les dits comparants sont unis par le mariage le <span className="font-bold text-slate-900 underline decoration-amber-600/30">{selectedDossier?.wedding_date || "date planifiée"}</span>.
                  </p>
                </div>

                {/* Footer signatures */}
                <div className="mt-8 grid grid-cols-2 gap-4 text-xs font-serif text-slate-700">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="font-bold underline">Les Époux</span>
                    <span className="text-[9px] text-slate-400 italic mt-4">(Signatures)</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-bold underline">L'Officier d'État Civil</span>
                    <span className="text-[9px] text-slate-800 font-sans font-bold italic mt-1">{activeMairie?.officer_name || "Le Maire"}</span>

                    {/* Simulated Signature & Seal */}
                    <div className="relative mt-2 flex items-center justify-center w-28 h-12">
                      {/* Round Stamp */}
                      <div className="absolute w-14 h-14 rounded-full border border-dashed border-emerald-600/40 flex items-center justify-center text-[7px] text-emerald-700/60 font-sans font-bold uppercase tracking-tighter text-center select-none rotate-12 scale-90">
                        Mairie de<br />{activeMairie?.name?.replace('Mairie de ', '') || "Cocody"}
                      </div>
                      {/* Handwritten Cursive Signature overlay */}
                      <span className="absolute font-serif text-lg text-indigo-700 font-bold italic -rotate-6 select-none opacity-80" style={{ fontFamily: 'Georgia, serif' }}>
                        {activeMairie?.officer_name?.split(' ').slice(-1)[0] || "Signé"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Official Stamp text */}
                <div className="mt-12 text-[8px] font-sans text-slate-400">
                  Document officiel d'état civil généré by E-Mariage Côte d'Ivoire. Certifié authentique et enregistré numériquement.
                </div>
              </div>

              {/* Action Print Button (no-print) */}
              <div className="no-print flex gap-3 justify-end mt-6 font-sans text-xs">
                <button
                  onClick={() => setShowCertificateId(null)}
                  className="px-4 py-2 border border-neutral-350 hover:bg-neutral-100 rounded-lg text-slate-700 font-bold cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-md hover:shadow cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  Imprimer l'Acte
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- DOCUMENT PREVIEW MODAL (WOW EFFECT) -------------------- */}
      <AnimatePresence>
        {previewDoc && !selectedDossier && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 py-8 overflow-y-auto">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-lg p-6 border border-neutral-200 shadow-2xl relative my-auto text-left"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {/* Close Button */}
              <button
                onClick={() => setPreviewDoc(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-slate-400 hover:text-slate-800 cursor-pointer transition-colors"
              >
                ✕
              </button>

              <h3 className="font-serif text-lg font-bold text-slate-900 border-b border-neutral-100 pb-3 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Visualisation du document
              </h3>

              {/* Document Simulator Container */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-slate-50 min-h-[380px] flex flex-col justify-between shadow-inner relative overflow-hidden font-sans text-xs">

                {isFileLoading ? (
                  <div className="w-full h-full min-h-[360px] flex flex-col items-center justify-center gap-4 text-slate-500 font-sans text-xs">
                    <Loader2 className="w-10 h-10 animate-spin text-primary shrink-0" />
                    <div className="flex flex-col gap-1 text-center">
                      <span className="font-bold text-slate-700 animate-pulse">Chargement sécurisé du document...</span>
                      <span className="text-[10px] text-slate-400">Téléchargement depuis le coffre-fort d'État Civil</span>
                    </div>
                  </div>
                ) : previewBlobUrl ? (
                  <div className="w-full h-full min-h-[360px] flex flex-col items-center justify-center p-2">
                    {previewBlobType?.startsWith('image/') ? (
                      <img
                        src={previewBlobUrl}
                        alt={previewDoc.name}
                        className="max-w-full max-h-[380px] object-contain rounded-lg shadow-md border border-neutral-200"
                      />
                    ) : (
                      <iframe
                        src={previewBlobUrl}
                        title={previewDoc.name}
                        sandbox="allow-same-origin allow-scripts"
                        className="w-full h-[380px] rounded-lg border border-neutral-200 shadow-md bg-white"
                      />
                    )}
                  </div>
                ) : (
                  <>
                    {/* 1. NATIONAL IDENTITY CARD PREVIEW */}
                    {(previewDoc.id.includes('doc2') || previewDoc.id.includes('doc5') || previewDoc.name.toLowerCase().includes('identité')) && (
                      <div className="flex flex-col gap-4 h-full">
                        {/* Header */}
                        <div className="bg-[#009B77]/10 p-3 rounded-lg border border-[#009B77]/20 flex justify-between items-center">
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-[#009B77] text-[10px] uppercase">République de Côte d'Ivoire</span>
                            <span className="text-[8px] text-slate-500 font-semibold">Carte Nationale d'Identité</span>
                          </div>
                          <div className="flex gap-0.5">
                            <div className="w-2.5 h-4 bg-[#FF8C00]"></div>
                            <div className="w-2.5 h-4 bg-white border-y border-slate-200"></div>
                            <div className="w-2.5 h-4 bg-[#009B77]"></div>
                          </div>
                        </div>

                        {/* ID Details */}
                        <div className="grid grid-cols-3 gap-3 my-auto items-center">
                          {/* Photo Placeholder */}
                          <div className="border border-slate-300 bg-slate-200 rounded-lg aspect-[3/4] flex items-center justify-center relative overflow-hidden shadow-sm">
                            <Users className="w-8 h-8 text-slate-400" />
                            <div className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-[6px] text-white text-center py-0.5 font-bold uppercase">
                              PHOTO OFFICIELLE
                            </div>
                          </div>

                          {/* Text info */}
                          <div className="col-span-2 flex flex-col gap-2 text-left text-[9px] text-slate-700">
                            <div>
                              <span className="text-[7px] font-bold text-slate-400 block uppercase">Nom / Surname :</span>
                              <span className="font-bold text-slate-800 text-[10px]">{selectedDossier?.spouse1_name || 'KOFFI'}</span>
                            </div>
                            <div>
                              <span className="text-[7px] font-bold text-slate-400 block uppercase">Prénoms / Given names :</span>
                              <span className="font-bold text-slate-800">{selectedDossier?.spouse2_name || 'Marc-Antoine'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-[7px] font-bold text-slate-400 block uppercase">Né(e) le :</span>
                                <span className="font-bold text-slate-800">12/04/1998</span>
                              </div>
                              <div>
                                <span className="text-[7px] font-bold text-slate-400 block uppercase">Sexe :</span>
                                <span className="font-bold text-slate-800">M / F</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-[7px] font-bold text-slate-400 block uppercase">Numéro National d'Identité :</span>
                              <span className="font-mono font-bold text-primary">CNI-CI-0492810482</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[7px] text-slate-400">
                          <span>Signature du Titulaire : <span className="font-serif italic font-bold text-slate-600">{selectedDossier ? `${selectedDossier.spouse2_name || 'Épouse'}/${selectedDossier.spouse1_name || 'Époux'}` : 'Épouse/Époux'}</span></span>
                          <span className="font-mono">EXP: 12/2034</span>
                        </div>
                      </div>
                    )}

                    {/* 2. BIRTH CERTIFICATE PREVIEW */}
                    {(previewDoc.id.includes('doc2') || previewDoc.name.toLowerCase().includes('naissance')) && (
                      <div className="flex flex-col gap-4 h-full font-serif text-slate-800">
                        <div className="text-center flex flex-col gap-0.5 border-b border-slate-200 pb-2">
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">République de Côte d'Ivoire</span>
                          <span className="text-[8px] text-slate-450 uppercase">Commune de Cocody - État Civil</span>
                          <span className="font-sans text-[10px] font-bold text-slate-700 mt-1.5 uppercase tracking-wide">Copie Intégrale d'Acte de Naissance</span>
                        </div>

                        <div className="text-left text-[9px] flex flex-col gap-2 my-auto leading-relaxed">
                          <p>
                            L'an <span className="font-bold text-slate-900">mille neuf cent quatre-vingt-dix-huit</span>, le douzième jour du mois d'avril à six heures, est né à la maternité de Cocody :
                          </p>

                          <div className="p-2 bg-slate-100 rounded border border-slate-200 font-sans text-center font-bold text-slate-900 text-[10px] my-1">
                            {selectedDossier ? `${selectedDossier.spouse1_name || 'Époux'} ou ${selectedDossier.spouse2_name || 'Épouse'}` : 'Époux / Épouse'}
                          </div>

                          <p>
                            Fils/Fille de <span className="font-bold text-slate-900">KOFFI Kouamé</span>, de nationalité Ivoirienne, et de <span className="font-bold text-slate-900">ADOU Marie</span>, son épouse.
                          </p>
                          <p>
                            Dressé le treize avril mil neuf cent quatre-vingt-dix-huit par nous, Officier d'État Civil.
                          </p>
                        </div>

                        <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[7px] font-sans text-slate-400">
                          <span>Registre N°: REG-98-COCODY-0428</span>
                          <span className="text-emerald-700 font-bold">✓ Scanné Conforme</span>
                        </div>
                      </div>
                    )}

                    {/* 3. PROOF OF RESIDENCE PREVIEW */}
                    {(previewDoc.id.includes('doc3') || previewDoc.name.toLowerCase().includes('domicile')) && (
                      <div className="flex flex-col gap-4 h-full font-sans text-slate-700">
                        <div className="bg-[#FF8C00]/10 p-3 rounded-lg border border-[#FF8C00]/20 flex justify-between items-center">
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-[#FF8C00] text-[10px] uppercase">CIE - Compagnie Ivoirienne d'Électricité</span>
                            <span className="text-[8px] text-slate-500 font-semibold">Facture d'Électricité Municipale</span>
                          </div>
                          <span className="font-mono font-bold text-[9px] text-[#FF8C00]">N° 29481028-10</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-left my-auto text-[9px] leading-relaxed">
                          <div className="flex flex-col gap-1">
                            <span className="text-[7px] text-slate-400 font-bold uppercase">Abonné / Client :</span>
                            <span className="font-bold text-slate-800">{selectedDossier?.spouse1_name || 'Époux'} {selectedDossier?.spouse2_name || 'Épouse'}</span>
                            <span className="text-slate-500">Adresse: Cocody Angré, Rue des Jardins, Villa 142</span>
                          </div>

                          <div className="flex flex-col gap-1 border-l border-slate-200 pl-3">
                            <span className="text-[7px] text-slate-400 font-bold uppercase">Période de Facturation :</span>
                            <span className="font-bold text-slate-800">Mars - Avril 2026</span>
                            <span className="text-slate-500">Commune de Célébration : Cocody</span>
                            <span className="text-[7px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 w-fit mt-1">Éligible (+1 mois de résidence)</span>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[7px] text-slate-400">
                          <span>Index: 49204 kWh</span>
                          <span className="font-bold text-slate-600">Montant : 42 500 FCFA</span>
                        </div>
                      </div>
                    )}

                    {/* 4. OTHER / GENERIC DOCUMENT PREVIEW */}
                    {(!previewDoc.id.includes('doc1') && !previewDoc.id.includes('doc2') && !previewDoc.id.includes('doc3') && !previewDoc.id.includes('doc5') && !previewDoc.name.toLowerCase().includes('naissance') && !previewDoc.name.toLowerCase().includes('identité') && !previewDoc.name.toLowerCase().includes('domicile')) && (
                      <div className="flex flex-col gap-4 h-full font-serif text-slate-800">
                        <div className="text-center flex flex-col gap-0.5 border-b border-slate-200 pb-2 font-sans">
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">République de Côte d'Ivoire</span>
                          <span className="text-[8px] text-slate-450 uppercase">Ministère de la Justice et des Droits de l'Homme</span>
                          <span className="text-[10px] font-bold text-slate-700 mt-1 uppercase">{previewDoc.name}</span>
                        </div>

                        <div className="text-left text-[9px] flex flex-col gap-2 my-auto leading-relaxed font-sans text-slate-600">
                          <p className="font-bold text-slate-800 text-[10px] mb-1">CERTIFICATION ADMINISTRATIVE</p>
                          <p>
                            Nous soussigné, Officier d'État Civil de la Commune de Cocody, certifions que la pièce suivante fournie au dossier de mariage :
                          </p>
                          <div className="p-2.5 bg-slate-100 rounded border border-slate-200 font-mono text-[9px] text-slate-800">
                            {previewDoc.fileName}
                          </div>
                          <p>
                            A été numérisée et certifiée conforme aux originaux déposés pour l'instruction civile de l'union civile de {selectedDossier?.spouse1_name} &amp; {selectedDossier?.spouse2_name}.
                          </p>
                        </div>

                        <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[7px] font-sans text-slate-400">
                          <span>Réf : {previewDoc.id.toUpperCase()}</span>
                          <span className="text-emerald-700 font-bold">Sceau de l'État Civil</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center mt-6 font-sans text-xs">
                {previewBlobUrl ? (
                  <a
                    href={previewBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer no-underline"
                  >
                    <Eye className="w-4 h-4" />
                    Ouvrir en plein écran
                  </a>
                ) : (
                  <div />
                )}
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg shadow cursor-pointer transition-colors"
                >
                  Fermer la visualisation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- ARCHIVE DOSSIER PRINT MODAL -------------------- */}
      <AnimatePresence>
        {showArchiveDossier && selectedDossier && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/65 backdrop-blur-md px-4 py-8 overflow-y-auto print-archive-modal-overlay">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-4xl p-6 md:p-8 border border-neutral-200 shadow-2xl relative my-auto print-archive-modal-content flex flex-col gap-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {/* CSS Print Styles specific to this layout */}
              <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  /* Hide all UI elements, layout wrappers, sidebars */
                  body {
                    background: white !important;
                    color: black !important;
                  }
                  #root > div {
                    display: none !important;
                  }
                  body > div:not(.print-archive-modal-overlay) {
                    display: none !important;
                  }
                  .print-archive-modal-overlay {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    background: white !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    display: block !important;
                    z-index: 99999 !important;
                    overflow: visible !important;
                  }
                  .print-archive-modal-content {
                    box-shadow: none !important;
                    border: none !important;
                    width: 100% !important;
                    height: auto !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  .page-break {
                    page-break-before: always !important;
                    break-before: page !important;
                  }
                }
              `}} />

              {/* Close Button (no-print) */}
              <button
                onClick={() => setShowArchiveDossier(false)}
                className="no-print absolute top-4 right-4 w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-slate-400 hover:text-slate-800 cursor-pointer transition-colors"
                title="Fermer"
              >
                ✕
              </button>

              {/* Header Info */}
              <div className="no-print flex justify-between items-center border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="font-serif text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Printer className="w-5 h-5 text-primary" />
                    Archivage & Impression Complète
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    Générez une impression complète du dossier de mariage et de toutes ses pièces justificatives au format papier.
                  </p>
                </div>
              </div>

              {/* Dossier Content - Printable Section */}
              <div className="flex flex-col gap-6 text-left p-6 border border-neutral-200 rounded-xl bg-slate-50/30 overflow-y-auto max-h-[70vh] print:max-h-none print:overflow-visible print:p-0 print:border-0 print:bg-white">
                
                {/* Republican Seal & Official Title */}
                <div className="flex flex-col items-center text-center gap-2 border-b-2 border-slate-900 pb-6">
                  <span className="font-serif text-xs uppercase tracking-widest text-slate-600 font-bold">République de Côte d'Ivoire</span>
                  <div className="flex items-center gap-2 my-1">
                    <div className="w-16 h-0.5 bg-[#FF8C00]"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                    <div className="w-16 h-0.5 bg-[#009B77]"></div>
                  </div>
                  <span className="font-serif text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3">Union - Discipline - Travail</span>
                  
                  <span className="font-serif text-sm uppercase tracking-wide text-slate-700 font-bold">Mairie de {activeMairie?.name?.replace('Mairie de ', '') || "Cocody"}</span>
                  <span className="font-serif text-xs text-slate-500">Région : {activeMairie?.region || "Abidjan"}</span>
                  
                  <h2 className="font-serif text-2xl text-slate-900 font-bold tracking-tight uppercase mt-6 border-2 border-slate-900 px-6 py-3 bg-white/50">
                    Dossier d'Archivage Civil de Mariage
                  </h2>
                  <p className="font-mono text-xs text-slate-500 font-bold uppercase mt-1">
                    CODE DOSSIER : {selectedDossier.id.toUpperCase().replace('DOSSIER_', '')}
                  </p>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    Généré le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Section: Conjoints */}
                <div className="flex flex-col gap-3">
                  <h3 className="font-serif text-sm font-bold text-slate-900 border-b border-slate-300 pb-1.5 uppercase">
                    1. Renseignements sur les Futurs Époux
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Epoux */}
                    <div className="p-4 bg-white border border-neutral-200 rounded-lg flex flex-col gap-2">
                      <span className="font-sans text-[10px] font-bold text-primary uppercase tracking-wider">Le Conjoint (Époux)</span>
                      <div className="flex gap-4 items-start">
                        <div className="border border-slate-300 bg-slate-100 rounded-lg w-16 h-20 flex items-center justify-center shrink-0 overflow-hidden relative shadow-sm">
                          {selectedDossier.epoux_selfie_url ? (
                            <img
                              src={selectedDossier.epoux_selfie_url || `http://localhost:3000/documents/${selectedDossier.id}/epoux_selfie.jpg`}
                              alt="Selfie Époux"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                downloadDocumentFile(selectedDossier.id, 'epoux_selfie', 'epoux_selfie.jpg').then(blob => {
                                  if (blob) { (e.target as HTMLImageElement).src = URL.createObjectURL(blob); }
                                });
                              }}
                            />
                          ) : (
                            <Users className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="text-xs text-slate-800 space-y-1">
                          <p>Nom & Prénoms : <span className="font-bold text-slate-900">{selectedDossier.spouse1_name}</span></p>
                          <p>Type de pièce : <span className="font-semibold">{selectedDossier.spouse1_cni_type || 'CNI'}</span></p>
                          <p>Téléphone : <span className="font-semibold">{selectedDossier.spouse1_phone || 'Non renseigné'}</span></p>
                          <p>Email : <span className="font-semibold">{selectedDossier.spouse1_email || 'Non renseigné'}</span></p>
                          {selectedDossier.epoux_face_match_score !== undefined && selectedDossier.epoux_face_match_score > 0 && (
                            <p className="text-[10px] text-slate-500 font-medium">IA Match : <span className="font-bold text-emerald-700">{selectedDossier.epoux_face_match_score.toFixed(1)}%</span></p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Epouse */}
                    <div className="p-4 bg-white border border-neutral-200 rounded-lg flex flex-col gap-2">
                      <span className="font-sans text-[10px] font-bold text-[#b20052] uppercase tracking-wider">La Conjointe (Épouse)</span>
                      <div className="flex gap-4 items-start">
                        <div className="border border-slate-300 bg-slate-100 rounded-lg w-16 h-20 flex items-center justify-center shrink-0 overflow-hidden relative shadow-sm">
                          {selectedDossier.epouse_selfie_url ? (
                            <img
                              src={selectedDossier.epouse_selfie_url || `http://localhost:3000/documents/${selectedDossier.id}/epouse_selfie.jpg`}
                              alt="Selfie Épouse"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                downloadDocumentFile(selectedDossier.id, 'epouse_selfie', 'epouse_selfie.jpg').then(blob => {
                                  if (blob) { (e.target as HTMLImageElement).src = URL.createObjectURL(blob); }
                                });
                              }}
                            />
                          ) : (
                            <Users className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="text-xs text-slate-800 space-y-1">
                          <p>Nom & Prénoms : <span className="font-bold text-slate-900">{selectedDossier.spouse2_name}</span></p>
                          <p>Type de pièce : <span className="font-semibold">{selectedDossier.spouse2_cni_type || 'CNI'}</span></p>
                          <p>Téléphone : <span className="font-semibold">{selectedDossier.spouse2_phone || 'Non renseigné'}</span></p>
                          <p>Email : <span className="font-semibold">{selectedDossier.spouse2_email || 'Non renseigné'}</span></p>
                          {selectedDossier.epouse_face_match_score !== undefined && selectedDossier.epouse_face_match_score > 0 && (
                            <p className="text-[10px] text-slate-500 font-medium">IA Match : <span className="font-bold text-emerald-700">{selectedDossier.epouse_face_match_score.toFixed(1)}%</span></p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Planification et Décision */}
                <div className="flex flex-col gap-3">
                  <h3 className="font-serif text-sm font-bold text-slate-900 border-b border-slate-300 pb-1.5 uppercase">
                    2. Statut Civil & Planification
                  </h3>
                  <div className="p-4 bg-white border border-neutral-200 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Statut du Dossier :</span>
                      <span className="font-bold uppercase text-primary text-sm">{selectedDossier.status.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Date de la Célébration :</span>
                      <span className="font-bold text-slate-800">{selectedDossier.wedding_date || 'Non planifiée'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Rendez-vous Audition :</span>
                      <span className="font-bold text-slate-800">{selectedDossier.appointment_date || 'Non fixé'}</span>
                    </div>
                  </div>
                </div>

                {/* Section: Affichage des Bans */}
                <div className="flex flex-col gap-3">
                  <h3 className="font-serif text-sm font-bold text-slate-900 border-b border-slate-300 pb-1.5 uppercase">
                    3. Rapport d'Affichage Légal des Bans
                  </h3>
                  <div className="p-4 bg-white border border-neutral-200 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Période légale d'affichage :</span>
                      <span className="font-semibold text-slate-800">
                        Du {new Date((selectedDossier as any).created_at || Date.now() - 4*24*3600*1000).toLocaleDateString('fr-FR')} au {new Date(((selectedDossier as any).created_at ? new Date((selectedDossier as any).created_at).getTime() : Date.now() - 4*24*3600*1000) + 10*24*3600*1000).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Certification de conformité (Délai légal de 10 jours) :</span>
                      {(() => {
                        const creationDate = (selectedDossier as any).created_at ? new Date((selectedDossier as any).created_at) : new Date(Date.now() - 4 * 24 * 3600 * 1000);
                        const remaining = 10 - Math.floor((Date.now() - creationDate.getTime()) / (24 * 3600 * 1000));
                        const hasOpps = oppositions.some(o => o.status === 'pending' || o.status === 'validated');
                        
                        if (hasOpps) {
                          return <span className="font-bold text-rose-700 uppercase">⚠️ Non conforme (Opposition active bloquante)</span>;
                        } else if (remaining <= 0) {
                          return <span className="font-bold text-emerald-700 uppercase">✓ Conforme (Délai légal purgé sans opposition)</span>;
                        } else {
                          return <span className="font-bold text-indigo-700 uppercase font-sans">En cours d'affichage ({remaining} jours restants)</span>;
                        }
                      })()}
                    </div>
                  </div>
                </div>

                {/* Section: Pièces justificatives */}
                <div className="flex flex-col gap-3">
                  <h3 className="font-serif text-sm font-bold text-slate-900 border-b border-slate-300 pb-1.5 uppercase">
                    4. Rapport d'Instruction des Pièces Justificatives
                  </h3>
                  <table className="w-full text-xs text-left border-collapse border border-neutral-200 bg-white">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-200">
                        <th className="p-2.5 border border-neutral-200 font-bold text-slate-700">Document requis</th>
                        <th className="p-2.5 border border-neutral-200 font-bold text-slate-700">Catégorie</th>
                        <th className="p-2.5 border border-neutral-200 font-bold text-slate-700">Nom du fichier</th>
                        <th className="p-2.5 border border-neutral-200 font-bold text-slate-700">Statut de validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossierDocs.map((doc) => (
                        <tr key={doc.id} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                          <td className="p-2.5 border border-neutral-200 font-medium">
                            <div>{doc.name}</div>
                            <div className="text-[9px] text-slate-450 leading-tight mt-0.5">{doc.description}</div>
                          </td>
                          <td className="p-2.5 border border-neutral-200 capitalize text-slate-600">
                            {doc.category === 'spouses' ? 'Futurs Conjoints' : doc.category === 'witnesses' ? 'Témoins' : 'Spécial / Optionnel'}
                          </td>
                          <td className="p-2.5 border border-neutral-200 font-mono text-[10px] text-slate-700">
                            {doc.fileName || <span className="text-slate-400 italic">Non téléversé</span>}
                          </td>
                          <td className="p-2.5 border border-neutral-200">
                            <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                              doc.status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : doc.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}>
                              {doc.status === 'verified' ? 'Validé' : doc.status === 'rejected' ? 'Rejeté' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section: Notes internes */}
                {notesList.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h3 className="font-serif text-sm font-bold text-slate-900 border-b border-slate-300 pb-1.5 uppercase">
                      5. Notes et Remarques Administratives
                    </h3>
                    <div className="space-y-2">
                      {notesList.map((note) => (
                        <div key={note.id} className="p-3 bg-white border border-neutral-200 rounded-lg text-xs leading-normal">
                          <p className="font-medium text-slate-800">{note.text}</p>
                          <span className="text-[9px] text-slate-400 block mt-1 font-semibold">{note.date} — Rapporteur Municipal</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section: signatures et approbation */}
                <div className="mt-8 grid grid-cols-2 gap-8 text-xs font-serif text-slate-800 border-t border-slate-300 pt-6">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="font-bold underline">Officier Civil d'Instruction</span>
                    <span className="text-[10px] text-slate-800 font-sans font-bold italic mt-2">{activeMairie?.officer_name || "Le Maire"}</span>
                    <div className="relative mt-2 flex items-center justify-center w-28 h-12">
                      <div className="absolute w-14 h-14 rounded-full border border-dashed border-emerald-600/40 flex items-center justify-center text-[7px] text-emerald-700/60 font-sans font-bold uppercase tracking-tighter text-center select-none rotate-12 scale-90">
                        Mairie de<br />{activeMairie?.name?.replace('Mairie de ', '') || "Cocody"}
                      </div>
                      <span className="absolute font-serif text-lg text-indigo-700 font-bold italic -rotate-6 select-none opacity-80" style={{ fontFamily: 'Georgia, serif' }}>
                        {activeMairie?.officer_name?.split(' ').slice(-1)[0] || "Signé"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="font-bold underline">Visa de validation</span>
                    <span className="text-[10px] text-slate-450 italic mt-6">(Signature et cachet du chef de service)</span>
                  </div>
                </div>

                {/* Section: Pièces jointes - Images Inline */}
                <div className="page-break flex flex-col gap-6">
                  <h3 className="font-serif text-sm font-bold text-slate-900 border-b border-slate-300 pb-1.5 uppercase">
                    6. Pièces Jointes Certifiées (Images)
                  </h3>
                  
                  {dossierDocs.filter(doc => {
                    if (!doc.fileName) return false;
                    const fileExt = doc.fileName.split('.').pop()?.toLowerCase() || '';
                    return ['png', 'jpg', 'jpeg', 'webp'].includes(fileExt);
                  }).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Aucun document au format image n'a été téléversé pour ce dossier.</p>
                  ) : (
                    <div className="flex flex-col gap-8">
                      {dossierDocs.filter(doc => {
                        if (!doc.fileName) return false;
                        const fileExt = doc.fileName.split('.').pop()?.toLowerCase() || '';
                        return ['png', 'jpg', 'jpeg', 'webp'].includes(fileExt);
                      }).map((doc) => {
                        const fileExt = doc.fileName!.split('.').pop()?.toLowerCase() || '';
                        const filePath = `${selectedDossier.id}/${doc.id}.${fileExt}`;
                        const publicUrl = supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;

                        return (
                          <div key={doc.id} className="page-break flex flex-col gap-3 bg-white p-4 border border-neutral-200 rounded-xl">
                            <div className="border-b border-neutral-200 pb-2 flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-800 uppercase tracking-wide">Document : {doc.name}</span>
                              <span className="font-mono text-slate-555 text-[10px]">{doc.fileName}</span>
                            </div>
                            <div className="flex justify-center items-center p-2 bg-slate-100 rounded-lg min-h-[300px] max-h-[90vh]">
                              <img
                                src={publicUrl}
                                alt={doc.name}
                                className="max-w-full max-h-[80vh] object-contain rounded-md shadow-md border border-neutral-200"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section: Pièces jointes - Fichiers PDF */}
                <div className="page-break flex flex-col gap-4">
                  <h3 className="font-serif text-sm font-bold text-slate-900 border-b border-slate-300 pb-1.5 uppercase">
                    7. Pièces Jointes Certifiées (PDF)
                  </h3>
                  
                  {dossierDocs.filter(doc => {
                    if (!doc.fileName) return false;
                    const fileExt = doc.fileName.split('.').pop()?.toLowerCase() || '';
                    return fileExt === 'pdf';
                  }).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Aucun document au format PDF n'a été téléversé pour ce dossier.</p>
                  ) : (
                    <div className="space-y-4">
                      {dossierDocs.filter(doc => {
                        if (!doc.fileName) return false;
                        const fileExt = doc.fileName.split('.').pop()?.toLowerCase() || '';
                        return fileExt === 'pdf';
                      }).map((doc) => {
                        const filePath = `${selectedDossier.id}/${doc.id}.pdf`;
                        const publicUrl = supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;

                        return (
                          <div key={doc.id} className="p-4 border border-neutral-200 rounded-xl bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left">
                            <div className="flex gap-3 items-start">
                              <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="text-xs text-slate-800">
                                <span className="font-bold block text-slate-900">{doc.name}</span>
                                <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{doc.description}</span>
                                <span className="text-[10px] font-mono text-slate-450 block mt-1 font-bold">Fichier : {doc.fileName}</span>
                              </div>
                            </div>
                            
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="no-print shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm text-center no-underline cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                              Ouvrir le PDF pour impression
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Action Buttons (no-print) */}
              <div className="no-print flex flex-wrap gap-3 justify-end mt-4 border-t border-neutral-100 pt-4 font-sans text-xs">
                <button
                  onClick={() => setShowArchiveDossier(false)}
                  className="px-4 py-2.5 border border-neutral-300 hover:bg-neutral-100 rounded-lg text-slate-700 font-bold cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  onClick={() => setShowBulletinCaisseDossier(selectedDossier)}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="w-4 h-4 shrink-0" />
                  Générer Bulletin de Caisse (Encaissement Physique)
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md hover:shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  Lancer l'Impression Physique du Dossier
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- BULLETIN DE CAISSE MUNICIPAL MODAL -------------------- */}
      <AnimatePresence>
        {showBulletinCaisseDossier && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-8 overflow-y-auto print-bulletin-caisse-overlay">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-2xl p-6 md:p-8 border border-neutral-300 shadow-2xl relative my-auto text-left flex flex-col gap-6 print-bulletin-caisse-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {/* CSS Print Styles */}
              <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body { background: white !important; color: black !important; }
                  #root > div, body > div:not(.print-bulletin-caisse-overlay) { display: none !important; }
                  .print-bulletin-caisse-overlay {
                    position: absolute !important; left: 0 !important; top: 0 !important;
                    width: 100% !important; height: auto !important; background: white !important;
                    padding: 0 !important; margin: 0 !important; display: block !important;
                  }
                  .print-bulletin-caisse-content {
                    box-shadow: none !important; border: none !important; width: 100% !important;
                    margin: 0 !important; padding: 0 !important; background: white !important;
                  }
                  .no-print { display: none !important; }
                }
              `}} />

              {/* Close Button (no-print) */}
              <button
                onClick={() => setShowBulletinCaisseDossier(null)}
                className="no-print absolute top-4 right-4 w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-slate-400 hover:text-slate-800 cursor-pointer transition-colors"
              >
                ✕
              </button>

              {/* Printable Cashier Bulletin Content */}
              <div className="border-2 border-slate-900 rounded-xl p-6 flex flex-col gap-5 bg-white text-slate-900">
                {/* Header Republic Seal */}
                <div className="flex flex-col items-center text-center gap-1.5 border-b-2 border-slate-900 pb-4">
                  <span className="font-serif text-xs uppercase tracking-widest font-bold text-slate-700">RÉPUBLIQUE DE CÔTE D'IVOIRE</span>
                  <div className="flex items-center gap-2 my-0.5">
                    <div className="w-12 h-0.5 bg-[#FF8C00]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <div className="w-12 h-0.5 bg-[#009B77]"></div>
                  </div>
                  <span className="font-serif text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Union - Discipline - Travail</span>
                  <span className="font-serif text-xs font-bold uppercase text-slate-800 mt-2">COMMUNE DE COCODY — DIRECTION DES SERVICES D'ÉTAT CIVIL</span>
                  <span className="text-[10px] text-slate-500 font-mono">RÉGIE RECETTES DE L'ÉTAT CIVIL & CAISSE MUNICIPALE</span>
                </div>

                {/* Title */}
                <div className="text-center bg-slate-900 text-white p-3 rounded-lg shadow-sm">
                  <h2 className="font-serif text-lg font-bold uppercase tracking-wide">BULLETIN D'ENCAISSEMENT EN CAISSE MUNICIPALE</h2>
                  <p className="font-mono text-[10px] uppercase text-amber-400 tracking-wider mt-0.5">
                    RÉFÉRENCE TRACABILITÉ : BC-COCODY-{(showBulletinCaisseDossier.id || '').toUpperCase()}-{Date.now().toString().slice(-6)}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs border border-slate-200 p-4 rounded-lg bg-slate-50">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">N° Dossier Civil :</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{showBulletinCaisseDossier.id.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Date d'Émission :</span>
                    <span className="font-bold text-slate-800">{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Époux (Conjoint) :</span>
                    <span className="font-bold text-slate-900">{showBulletinCaisseDossier.spouse1_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Épouse (Conjointe) :</span>
                    <span className="font-bold text-slate-900">{showBulletinCaisseDossier.spouse2_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Date du Rendez-vous Civil :</span>
                    <span className="font-bold text-emerald-800">{showBulletinCaisseDossier.wedding_date || showBulletinCaisseDossier.appointment_date || 'Fixée au guichet'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Statut Dossier :</span>
                    <span className="font-bold text-amber-700 uppercase">En cours d'instruction (Rendez-vous)</span>
                  </div>
                </div>

                {/* Prestation Details */}
                <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                  <div className="bg-slate-200 px-3 py-2 font-bold text-slate-800 flex justify-between border-b border-slate-300">
                    <span>NATURE DE LA PRESTATION À ENCAISSER (CAISSE MUNICIPALE)</span>
                    <span>MONTANT RÉGIE</span>
                  </div>
                  <div className="p-3 flex justify-between items-center border-b border-slate-200">
                    <div>
                      <p className="font-bold text-slate-900">Droits de Célébration du Mariage &amp; Timbres Municipaux d'État Civil</p>
                      <p className="text-[10px] text-slate-500">Encaissement physique en caisse communale (Frais plateforme en ligne de {(paystackAmount || 2500).toLocaleString('fr-FR')} FCFA déjà acquittés)</p>
                    </div>
                    <span className="font-mono font-bold text-slate-900 text-sm">{(paramTimbrePrice || 100000).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="p-3 bg-amber-50/60 flex justify-between items-center font-bold text-slate-900">
                    <span>TOTAL À PAYER À LA CAISSE MUNICIPALE :</span>
                    <span className="font-mono text-base text-amber-900">{(paramTimbrePrice || 100000).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>

                {/* Note for Cashier & Agent Stamp */}
                <div className="grid grid-cols-2 gap-4 text-[10px] pt-2 border-t border-slate-200 text-slate-600">
                  <div>
                    <p className="font-bold text-slate-800 uppercase">Instruction à l'Usager :</p>
                    <p className="mt-0.5 leading-relaxed">
                      L'usager doit se présenter muni de ce bulletin physiquement à la Caisse Municipale pour s'acquitter des droits de célébration avant la célébration du mariage.
                    </p>
                  </div>
                  <div className="text-right flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-slate-800 uppercase">Visat Agent d'État Civil :</p>
                      <p className="italic text-slate-500 mt-0.5">Certifié conforme au dossier physique</p>
                    </div>
                    <div className="mt-8 border-t border-dashed border-slate-400 pt-1 font-mono text-[9px] text-slate-400">
                      Cachet & Signature réservés
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons (no-print) */}
              <div className="no-print flex gap-3 justify-end border-t border-neutral-100 pt-4 font-sans text-xs">
                <button
                  onClick={() => setShowBulletinCaisseDossier(null)}
                  className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded-lg text-slate-700 font-bold cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  onClick={() => handlePrintCaisseReceipt(showBulletinCaisseDossier.id)}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-md hover:shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  Imprimer le Bulletin de Caisse (Physique)
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MarriageReceiptModal
        isOpen={selectedReceiptDossierId !== null}
        onClose={() => {
          setSelectedReceiptDossierId(null);
          setReceiptSpouse1('');
          setReceiptSpouse2('');
          setReceiptWeddingDate(null);
          setReceiptMairieName('');
        }}
        dossierId={selectedReceiptDossierId || ''}
        spouse1Name={receiptSpouse1}
        spouse2Name={receiptSpouse2}
        weddingDate={receiptWeddingDate}
        selectedMairieName={receiptMairieName}
      />
    </div>
  );
}
