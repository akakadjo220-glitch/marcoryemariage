import React, { useState, useEffect } from 'react';
import { Home, Calendar, FolderOpen, Heart, ClipboardList } from 'lucide-react';

import { supabase } from './supabaseClient';

// Custom data and types
import {
  INITIAL_DOCUMENTS,
  INITIAL_TIMELINE_STEPS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PARTNERS
} from './data';
import { DocumentInfo, TimelineStep, AlertNotification, AiAnalysisResult } from './types';
import {
  getDocuments,
  updateDocumentInDb,
  getTimelineSteps,
  updateTimelineStepInDb,
  getNotifications,
  addNotificationToDb,
  deleteNotificationFromDb,
  getDossierById,
  createDossier,
  updateDossierSpouseNames,
  updateDossierMairie,
  updateDossierWeddingDate,
  getMairies,
  DossierInfo,
  MairieInfo,
  triggerSpouseNotifications,
  syncAiConfigFromDb
} from './services/dbService';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import Timeline from './components/Timeline';
import Dossier from './components/Dossier';
import Partners from './components/Partners';
import AiAssistant from './components/AiAssistant';
import BansList from './components/BansList';
import AdminDashboard from './components/AdminDashboard';
import MayorDashboard from './components/MayorDashboard';
import LoginModal from './components/LoginModal';
import VerifyDossier from './components/VerifyDossier';
import SecretLoginPortal from './components/SecretLoginPortal';
import Guide from './components/Guide';

const SECRET_PATHS = [
  '/portail-agent-civ-98',
  '/portail-superviseur-civ-87',
  '/portail-maire-civ-76',
  '/portail-admin-civ-65'
];

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const [currentTab, setCurrentTab] = useState<string>(() => {
    const savedRole = sessionStorage.getItem('e_mariage_logged_role');
    if (savedRole === 'mairie' || savedRole === 'superadmin') {
      return 'admin';
    } else if (savedRole === 'maire') {
      return 'maire';
    }
    return 'accueil';
  });

  const [currentRole, setRole] = useState<'citoyen' | 'mairie' | 'superadmin' | 'maire'>(() => {
    const savedRole = sessionStorage.getItem('e_mariage_logged_role');
    if (savedRole === 'mairie' || savedRole === 'superadmin' || savedRole === 'maire') {
      return savedRole as any;
    }
    return 'citoyen';
  });

  const [mairies, setMairies] = useState<MairieInfo[]>([]);
  const [authPendingRole, setAuthPendingRole] = useState<'mairie' | 'superadmin' | 'maire' | null>(null);

  // Scoped Dossier States
  const [dossierId, setDossierId] = useState<string>('');
  const [spouse1Name, setSpouse1Name] = useState<string>('');
  const [spouse2Name, setSpouse2Name] = useState<string>('');
  const [spouse1Phone, setSpouse1Phone] = useState<string>('');
  const [spouse2Phone, setSpouse2Phone] = useState<string>('');
  const [spouse1Email, setSpouse1Email] = useState<string>('');
  const [spouse2Email, setSpouse2Email] = useState<string>('');
  const [spouse1Birthdate, setSpouse1Birthdate] = useState<string>('');
  const [spouse2Birthdate, setSpouse2Birthdate] = useState<string>('');
  const [spouse1Cni, setSpouse1Cni] = useState<string>('');
  const [spouse2Cni, setSpouse2Cni] = useState<string>('');
  const [spouse1CniType, setSpouse1CniType] = useState<'CNI' | 'PASSEPORT'>('CNI');
  const [spouse2CniType, setSpouse2CniType] = useState<'CNI' | 'PASSEPORT'>('CNI');
  const [selectedMairieId, setSelectedMairieId] = useState<string | null>(null);
  const [selectedMairieName, setSelectedMairieName] = useState<string>('');
  const [dossierStatus, setDossierStatus] = useState<'under_review' | 'approved' | 'rejected' | 'celebrated'>('under_review');
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<string | null>(null);

  // Application Data States
  const [dossierDetails, setDossierDetails] = useState<DossierInfo | null>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>(INITIAL_DOCUMENTS);
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>(INITIAL_TIMELINE_STEPS);
  const [notifications, setNotifications] = useState<AlertNotification[]>(INITIAL_NOTIFICATIONS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dossierActiveStep, setDossierActiveStep] = useState<number>(1);
  const [autoOpenParcoursStep, setAutoOpenParcoursStep] = useState<number | null>(null);

  const handleOpenParcoursAtStep = (step: number) => {
    setDossierActiveStep(step);
    setAutoOpenParcoursStep(step);
    setCurrentTab('accueil');
  };

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => {
    const localId = sessionStorage.getItem('e_mariage_dossier_id');
    const demoIds = ['dossier_camille_marc', 'dossier_aicha_sekou', 'dossier_marie_pierre'];
    return Boolean(localId && !demoIds.includes(localId));
  });

  const [verifyDossierId, setVerifyDossierId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get('verify') || params.get('id');
    if (verifyId) {
      setCurrentTab('verify');
      setVerifyDossierId(verifyId);
    }
  }, []);

  // 1. Initialize anonymous citizen session on startup (delayed code generation)
  useEffect(() => {
    async function initializeSession() {
      // Sync AI Configuration from Supabase system_configs
      await syncAiConfigFromDb();

      // Load mairies
      try {
        const list = await getMairies();
        setMairies(list);
      } catch (err) {
        console.warn("Failed to load mairies list on startup:", err);
      }

      const localId = sessionStorage.getItem('e_mariage_dossier_id');
      const demoIds = ['dossier_camille_marc', 'dossier_aicha_sekou', 'dossier_marie_pierre'];

      if (localId && !demoIds.includes(localId)) {
        // Retrieve the dossier to verify if it has spouse names
        const dossier = await getDossierById(localId);
        if (dossier && dossier.spouse1_name?.trim() && dossier.spouse2_name?.trim()) {
          setDossierId(localId);
          return;
        }
      }
      // If we don't have a valid dossier ID with names filled, we wait
      setDossierId('');
      setIsInitialLoading(false);
    }
    initializeSession();
  }, []);

  // 2. Fetch scoped dossier details and assets when dossierId changes
  useEffect(() => {
    if (!dossierId) {
      setSpouse1Name('');
      setSpouse2Name('');
      setSpouse1Phone('');
      setSpouse2Phone('');
      setSpouse1Email('');
      setSpouse2Email('');
      setSpouse1Birthdate('');
      setSpouse2Birthdate('');
      setSpouse1Cni('');
      setSpouse2Cni('');
      setSpouse1CniType('CNI');
      setSpouse2CniType('CNI');
      setSelectedMairieId(null);
      setSelectedMairieName('');
      setDossierStatus('under_review');
      setWeddingDate(null);
      setAppointmentDate(null);
      setDocuments(INITIAL_DOCUMENTS);
      setTimelineSteps(INITIAL_TIMELINE_STEPS);
      setNotifications(INITIAL_NOTIFICATIONS);
      setIsInitialLoading(false);
      return;
    }

    // Reset states immediately to prevent flashing of previous citizen data
    setSpouse1Name('');
    setSpouse2Name('');
    setSpouse1Phone('');
    setSpouse2Phone('');
    setSpouse1Email('');
    setSpouse2Email('');
    setSpouse1Birthdate('');
    setSpouse2Birthdate('');
    setSpouse1Cni('');
    setSpouse2Cni('');
    setSpouse1CniType('CNI');
    setSpouse2CniType('CNI');
    setSelectedMairieId(null);
    setSelectedMairieName('');
    setDossierStatus('under_review');
    setWeddingDate(null);
    setAppointmentDate(null);
    setDocuments(INITIAL_DOCUMENTS.map(doc => ({ ...doc, status: 'pending', fileName: undefined })));
    setTimelineSteps(INITIAL_TIMELINE_STEPS.map(step => ({ ...step, status: 'upcoming' })));
    setNotifications([]);

    async function loadDossierData() {
      try {
        const dossier = await getDossierById(dossierId);
        if (dossier) {
          setDossierDetails(dossier);
          setSpouse1Name(dossier.spouse1_name);
          setSpouse2Name(dossier.spouse2_name);
          setSpouse1Phone(dossier.spouse1_phone || '');
          setSpouse2Phone(dossier.spouse2_phone || '');
          setSpouse1Email(dossier.spouse1_email || '');
          setSpouse2Email(dossier.spouse2_email || '');
          setSpouse1Birthdate(dossier.spouse1_birthdate || '');
          setSpouse2Birthdate(dossier.spouse2_birthdate || '');
          setSpouse1Cni(dossier.spouse1_cni || '');
          setSpouse2Cni(dossier.spouse2_cni || '');
          setSpouse1CniType(dossier.spouse1_cni_type || 'CNI');
          setSpouse2CniType(dossier.spouse2_cni_type || 'CNI');
          setSelectedMairieId(dossier.mairie_id);
          setDossierStatus(dossier.status);
          setWeddingDate(dossier.wedding_date);
          setAppointmentDate(dossier.appointment_date || null);

          const mairiesList = await getMairies();
          const activeMairie = mairiesList.find(m => m.id === dossier.mairie_id);
          if (activeMairie) {
            setSelectedMairieName(activeMairie.name);
          }
        }

        // Fetch scoped assets
        const [docs, steps, notifs] = await Promise.all([
          getDocuments(dossierId),
          getTimelineSteps(dossierId),
          getNotifications(dossierId)
        ]);
        setDocuments(docs);
        setTimelineSteps(steps);
        setNotifications(notifs);
      } finally {
        setIsInitialLoading(false);
      }
    }
    loadDossierData();
  }, [dossierId]);

  // Real-time document updates listener for Citizen Portal
  useEffect(() => {
    if (!dossierId) return;

    // 1. Setup Supabase Real-time postgres_changes subscription
    const channel = supabase
      .channel(`citizen-dossier-docs-${dossierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `dossier_id=eq.${dossierId}`
        },
        async (payload) => {
          console.log('Citizen: Realtime documents update received:', payload);
          const docs = await getDocuments(dossierId);
          setDocuments(docs);
        }
      )
      .subscribe();

    // 2. Setup BroadcastChannel listener for local development mock syncing
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('e_mariage_channel');
      bc.onmessage = async (event) => {
        if (event.data?.type === 'docs_changed' && event.data?.dossierId === dossierId) {
          console.log('Citizen: BroadcastChannel documents update received:', event.data);
          const docs = await getDocuments(dossierId);
          setDocuments(docs);
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported in this browser:", e);
    }

    // 3. Setup window storage listener as a secondary cross-tab fallback
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `e_mariage_documents_${dossierId}`) {
        console.log('Citizen: Storage event documents update received');
        try {
          const docs = JSON.parse(e.newValue || '[]');
          setDocuments(docs);
        } catch (err) {
          console.error("Failed to parse storage documents data:", err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 4. Periodic auto-refresh polling interval fallback (every 3 seconds)
    const interval = setInterval(async () => {
      const docs = await getDocuments(dossierId);
      setDocuments(prev => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(docs);
        return hasChanged ? docs : prev;
      });
      const steps = await getTimelineSteps(dossierId);
      setTimelineSteps(prev => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(steps);
        return hasChanged ? steps : prev;
      });
    }, 3000);

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      if (bc) {
        bc.close();
      }
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [dossierId]);

  // 2.5 Listen to automated SMS / WhatsApp / E-mail notifications events to display toast feedback
  useEffect(() => {
    const handleNotifSent = (e: any) => {
      const { whatsapp, email, spouse1_phone, spouse2_phone, spouse1_email, spouse2_email, message } = e.detail;
      let toastMsg = "";
      if (whatsapp) {
        const p1 = spouse1_phone ? `${spouse1_phone}` : '';
        const p2 = spouse2_phone ? `${spouse2_phone}` : '';
        toastMsg += `📲 [WhatsApp] Envoyé à: ${p1} ${p2 ? '& ' + p2 : ''}. `;
      }
      if (email && (spouse1_email || spouse2_email)) {
        const e1 = spouse1_email ? `${spouse1_email}` : '';
        const e2 = spouse2_email ? `${spouse2_email}` : '';
        toastMsg += `✉️ [E-mail] Envoyé à: ${e1} ${e2 ? '& ' + e2 : ''}. `;
      }
      if (toastMsg) {
        const cleanMsg = (message || '').replace(/\[CODE:\s*\d+\]/gi, '[CODE: ******]').replace(/\b\d{6}\b/g, '******');
        triggerToast(`${toastMsg}\n"${cleanMsg.slice(0, 70)}..."`);
      }
    };
    window.addEventListener('e_mariage_notif_sent', handleNotifSent);
    return () => window.removeEventListener('e_mariage_notif_sent', handleNotifSent);
  }, []);

  // 3. Spouses verification and dashboard tracking logic check
  // Removed redirection to ensure Dossier tab is always accessible for registration

  // Trigger a brief reactive toast alert on user action
  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const addNotification = async (text: string, type: 'info' | 'warning' | 'success') => {
    const newNotif: AlertNotification = {
      id: Math.random().toString(),
      text,
      time: "À l'instant",
      type
    };

    // Optimistic UI update
    setNotifications(prev => [newNotif, ...prev]);
    triggerToast(text);

    // Sync with database
    await addNotificationToDb(newNotif, dossierId);
  };

  const removeNotification = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.filter(n => n.id !== id));

    // Sync with database
    await deleteNotificationFromDb(id, dossierId);
  };

  // State utility to update files conformity mock audits
  const updateDocumentStatus = async (
    id: string,
    status: 'pending' | 'uploading' | 'verified' | 'rejected',
    fileName?: string,
    docNumber?: string | null,
    aiAnalysis?: AiAnalysisResult | null
  ) => {
    // Optimistic UI update
    setDocuments(prev => {
      const exists = prev.some(d => d.id === id);
      if (exists) {
        return prev.map(doc => {
          if (doc.id === id) {
            return {
              ...doc,
              status,
              fileName,
              docNumber: docNumber !== undefined ? docNumber : doc.docNumber,
              aiAnalysis: aiAnalysis !== undefined ? aiAnalysis : doc.aiAnalysis
            };
          }
          return doc;
        });
      } else {
        const canonical = INITIAL_DOCUMENTS.find(initDoc => initDoc.id === id);
        const newDoc: DocumentInfo = {
          id,
          name: canonical ? canonical.name : (fileName ? fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ") : "Document spécifique"),
          description: canonical ? canonical.description : "Document supplémentaire téléversé par l'utilisateur",
          status,
          fileName,
          category: 'special',
          icon: 'FileText',
          docNumber: docNumber || null,
          aiAnalysis: aiAnalysis || null
        };
        return [...prev, newDoc];
      }
    });

    // Sync with database
    await updateDocumentInDb(dossierId, id, status, fileName, undefined, docNumber, aiAnalysis);
  };

  // State utility to advance the timeline workflow progress
  const updateStepStatus = async (
    id: number,
    status: 'completed' | 'active' | 'upcoming'
  ) => {
    // Optimistic UI update
    setTimelineSteps(prev => prev.map(step => {
      if (step.id === id) {
        return { ...step, status };
      }
      // Automate preceding or subsequent steps statuses for intuitive gameplay
      if (status === 'completed' && step.id < id) {
        return { ...step, status: 'completed' };
      }
      return step;
    }));

    // Sync status updates for current and preceding steps in database
    await updateTimelineStepInDb(dossierId, id, status);
    if (status === 'completed') {
      const promises = [];
      for (let i = 1; i < id; i++) {
        promises.push(updateTimelineStepInDb(dossierId, i, 'completed'));
      }
      await Promise.all(promises);
    }
  };

  // Custom spouse names sync
  const handleUpdateNames = async (
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
  ) => {
    let activeId = dossierId;
    const isNew = !activeId;

    if (isNew) {
      // Generate random Ivorian-style dossier code
      const rand = Math.floor(1000 + Math.random() * 9000);
      activeId = `dossier_2026_${rand}`;
      sessionStorage.setItem('e_mariage_dossier_id', activeId);

      // Create dossier in database
      const newDossier: DossierInfo = {
        id: activeId,
        mairie_id: 'cocody_salle_prestige',
        spouse1_name: spouse1,
        spouse2_name: spouse2,
        spouse1_phone: phone1 || '',
        spouse2_phone: phone2 || '',
        spouse1_email: email1 || '',
        spouse2_email: email2 || '',
        spouse1_birthdate: birthdate1 || '',
        spouse2_birthdate: birthdate2 || '',
        spouse1_cni: cni1 || '',
        spouse2_cni: cni2 || '',
        spouse1_cni_type: cniType1 || 'CNI',
        spouse2_cni_type: cniType2 || 'CNI',
        wedding_date: null,
        status: 'under_review'
      };
      await createDossier(newDossier);

      // Update step 1 status to 'completed' and step 2 to 'active' in DB
      await updateTimelineStepInDb(activeId, 1, 'completed');
      await updateTimelineStepInDb(activeId, 2, 'active');

      // Update local state first to prevent any race condition
      setSpouse1Name(spouse1);
      setSpouse2Name(spouse2);
      setSpouse1Phone(phone1 || '');
      setSpouse2Phone(phone2 || '');
      setSpouse1Email(email1 || '');
      setSpouse2Email(email2 || '');
      setSpouse1Birthdate(birthdate1 || '');
      setSpouse2Birthdate(birthdate2 || '');
      setSpouse1Cni(cni1 || '');
      setSpouse2Cni(cni2 || '');
      setSpouse1CniType(cniType1 || 'CNI');
      setSpouse2CniType(cniType2 || 'CNI');
      setSelectedMairieId('cocody_salle_prestige');
      setSelectedMairieName('Hôtel de Ville — Salle des Mariages');
      setDossierStatus('under_review');
      setWeddingDate(null);
      setAppointmentDate(null);

      // Set the dossier ID state to trigger loading correct documents and steps
      setDossierId(activeId);
    } else {
      setSpouse1Name(spouse1);
      setSpouse2Name(spouse2);
      if (phone1 !== undefined) setSpouse1Phone(phone1);
      if (phone2 !== undefined) setSpouse2Phone(phone2);
      if (email1 !== undefined) setSpouse1Email(email1);
      if (email2 !== undefined) setSpouse2Email(email2);
      if (birthdate1 !== undefined) setSpouse1Birthdate(birthdate1);
      if (birthdate2 !== undefined) setSpouse2Birthdate(birthdate2);
      if (cni1 !== undefined) setSpouse1Cni(cni1);
      if (cni2 !== undefined) setSpouse2Cni(cni2);
      if (cniType1 !== undefined) setSpouse1CniType(cniType1);
      if (cniType2 !== undefined) setSpouse2CniType(cniType2);
      await updateDossierSpouseNames(activeId, spouse1, spouse2, phone1, phone2, email1, email2, birthdate1, birthdate2, cni1, cni2, cniType1, cniType2);
      if (spouse1.trim() && spouse2.trim()) {
        await updateStepStatus(1, 'completed');
        await updateStepStatus(2, 'active');
      }
    }

    // Trigger WhatsApp & Email notifications
    await triggerSpouseNotifications(activeId, 'created');

    // Add notification to notifications state & database
    const newNotif: AlertNotification = {
      id: Math.random().toString(),
      text: "Noms des futurs époux mis à jour !",
      time: "À l'instant",
      type: 'success'
    };
    setNotifications(prev => [newNotif, ...prev]);
    triggerToast("Noms des futurs époux mis à jour !");
    await addNotificationToDb(newNotif, activeId);
  };

  // Sync selected mairie from timeline selection
  const handleMairieSelected = async (mairieId: string) => {
    setSelectedMairieId(mairieId);
    await updateDossierMairie(dossierId, mairieId);

    const mairiesList = await getMairies();
    const activeM = mairiesList.find(m => m.id === mairieId);
    if (activeM) {
      setSelectedMairieName(activeM.name);
    }

    addNotification(`Mairie de célébration sélectionnée : ${activeM ? activeM.name : 'Mairie'}`, 'success');
  };

  const handleWeddingDateSelected = async (dateStr: string) => {
    setWeddingDate(dateStr);
    await updateDossierWeddingDate(dossierId, dateStr);
    await updateStepStatus(4, 'completed');
    await updateStepStatus(5, 'active');
    addNotification(`Date de célébration enregistrée : ${dateStr}`, 'success');
  };

  const handleRetrieveDossier = (retrievedId: string) => {
    sessionStorage.setItem('e_mariage_dossier_id', retrievedId);
    setDossierId(retrievedId);
  };

  const handleSecretLoginSuccess = (
    role: 'citoyen' | 'mairie' | 'superadmin' | 'maire',
    mairieAgentRole?: 'agent' | 'supervisor',
    mairieId?: string
  ) => {
    setRole(role);
    sessionStorage.setItem('e_mariage_logged_role', role);
    if (role === 'mairie' && mairieAgentRole) {
      sessionStorage.setItem('mairie_agent_role', mairieAgentRole);
    }
    if (role === 'mairie' && mairieId) {
      sessionStorage.setItem('mairie_unlocked_id', mairieId);
    }
    if (role === 'maire') {
      setTab('maire');
    } else {
      setTab('admin');
    }
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
    triggerToast(`Connexion réussie : Espace ${role === 'mairie' ? (mairieAgentRole === 'supervisor' ? 'Superviseur' : 'Agent Mairie') :
      role === 'maire' ? 'Le Maire' : 'Super Administrateur'
      } déverrouillé.`);
  };

  const handleRoleChange = (newRole: 'citoyen' | 'mairie' | 'superadmin' | 'maire') => {
    if (newRole === 'citoyen') {
      setRole('citoyen');
      setTab('dashboard');
      sessionStorage.removeItem('e_mariage_logged_role');
      sessionStorage.removeItem('mairie_unlocked_id');
      sessionStorage.removeItem('mairie_agent_role');
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
      triggerToast("Session déconnectée.");
    } else {
      const savedRole = sessionStorage.getItem('e_mariage_logged_role');
      if (savedRole === newRole) {
        setRole(newRole);
        if (newRole === 'maire') {
          setTab('maire');
        } else {
          setTab('admin');
        }
      } else {
        setAuthPendingRole(newRole);
      }
    }
  };

  // Switch tabs cleanly with page triggers
  const setTab = (tabId: string) => {
    if (tabId === 'dossier') {
      const isDocDone = (id: string) => {
        const d = documents.find(doc => doc.id === id);
        return d && d.status === 'verified';
      };

      const isEpouxFaceDone = dossierDetails?.epoux_identite_verifiee === true || (dossierDetails?.epoux_face_attempts ?? 0) >= 3;
      const isEpouseFaceDone = dossierDetails?.epouse_identite_verifiee === true || (dossierDetails?.epouse_face_attempts ?? 0) >= 3;

      let firstUnfinished = 1;
      if (!isDocDone('doc1')) firstUnfinished = 1;
      else if (!isEpouxFaceDone) firstUnfinished = 2;
      else if (!isDocDone('doc2')) firstUnfinished = 3;
      else if (!isDocDone('doc1_f')) firstUnfinished = 4;
      else if (!isEpouseFaceDone) firstUnfinished = 5;
      else if (!isDocDone('doc2_f')) firstUnfinished = 6;
      else if (!isDocDone('doc3') || !isDocDone('doc3_f') || !isDocDone('doc5') || !isDocDone('doc9')) firstUnfinished = 7;
      else firstUnfinished = 8;

      setDossierActiveStep(firstUnfinished);
    }
    setCurrentTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (SECRET_PATHS.includes(currentPath) && currentRole === 'citoyen') {
    return (
      <SecretLoginPortal
        path={currentPath}
        onLoginSuccess={handleSecretLoginSuccess}
        onGoBack={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen text-slate-900 antialiased flex flex-col font-sans bg-[#fcfbfa]">

      {/* Universal header navigation */}
      <Header
        currentTab={currentTab}
        setTab={setTab}
        openNotifications={() => {
          setCurrentTab('dashboard');
          triggerToast("Consultation de votre historique d'alertes municipales.");
        }}
        unreadNotificationsCount={notifications.length}
        currentRole={currentRole}
        setRole={handleRoleChange}
        spouse1Name={spouse1Name}
        spouse2Name={spouse2Name}
        dossierId={dossierId}
      />

      {/* Main Container with top-spacing to let header float */}
      <main className="flex-grow w-full max-w-6xl mx-auto px-4 md:px-8 pt-20 md:pt-28 pb-20 md:pb-6">

        {/* Dynamic content rendering based on active view tab / role */}
        {currentTab === 'verify' ? (
          <VerifyDossier
            dossierId={verifyDossierId || ''}
            onGoBack={() => {
              const savedRole = sessionStorage.getItem('e_mariage_logged_role');
              if (savedRole === 'mairie' || savedRole === 'superadmin') {
                setCurrentTab('admin');
              } else if (savedRole === 'maire') {
                setCurrentTab('maire');
              } else {
                setCurrentTab('accueil');
              }
              setVerifyDossierId(null);
              const url = new URL(window.location.href);
              url.search = '';
              window.history.replaceState({}, '', url.toString());
            }}
          />
        ) : currentRole === 'citoyen' ? (
          <>
            {currentTab === 'accueil' && (
              <Landing
                setTab={setTab}
                onUpdateNames={handleUpdateNames}
                onMairieSelected={handleMairieSelected}
                onWeddingDateSelected={handleWeddingDateSelected}
                dossierId={dossierId}
                spouse1Name={spouse1Name}
                spouse2Name={spouse2Name}
                spouse1Phone={spouse1Phone}
                spouse2Phone={spouse2Phone}
                spouse1Birthdate={spouse1Birthdate}
                spouse2Birthdate={spouse2Birthdate}
                spouse1Cni={spouse1Cni}
                spouse2Cni={spouse2Cni}
                spouse1CniType={spouse1CniType}
                spouse2CniType={spouse2CniType}
                selectedMairieId={selectedMairieId}
                selectedMairieName={selectedMairieName}
                weddingDate={weddingDate}
                steps={timelineSteps}
                updateStepStatus={updateStepStatus}
                documents={documents}
                onRetrieveDossier={handleRetrieveDossier}
                dossierActiveStep={dossierActiveStep}
                setDossierActiveStep={setDossierActiveStep}
                isInitialLoading={isInitialLoading}
                autoOpenParcoursStep={autoOpenParcoursStep}
                setAutoOpenParcoursStep={setAutoOpenParcoursStep}
              />
            )}

            {currentTab === 'bans' && (
              <BansList
                addNotification={triggerToast}
                currentDossierId={dossierId}
              />
            )}

            {currentTab === 'dashboard' && (
              <Dashboard
                notifications={notifications}
                setTab={setTab}
                removeNotification={removeNotification}
                documents={documents}
                spouse1Name={spouse1Name}
                spouse2Name={spouse2Name}
                dossierId={dossierId}
                onUpdateNames={handleUpdateNames}
                selectedMairieName={selectedMairieName}
                dossierStatus={dossierStatus}
                weddingDate={weddingDate}
                appointmentDate={appointmentDate}
              />
            )}



            {currentTab === 'dossier' && (
              <Dossier
                documents={documents}
                addNotification={addNotification}
                updateDocumentStatus={updateDocumentStatus}
                setTab={setTab}
                dossierId={dossierId}
                spouse1Name={spouse1Name}
                spouse2Name={spouse2Name}
                spouse1Birthdate={spouse1Birthdate}
                spouse2Birthdate={spouse2Birthdate}
                spouse1Cni={spouse1Cni}
                spouse2Cni={spouse2Cni}
                spouse1CniType={spouse1CniType}
                spouse2CniType={spouse2CniType}
                onUpdateNames={handleUpdateNames}
                activeStep={dossierActiveStep}
                setActiveStep={setDossierActiveStep}
                selectedMairieId={selectedMairieId}
                selectedMairieName={selectedMairieName}
                weddingDate={weddingDate}
                onWeddingDateSelected={handleWeddingDateSelected}
                onOpenParcoursStep={handleOpenParcoursAtStep}
              />
            )}

            {currentTab === 'partners' && (
              <Partners
                initialPartners={INITIAL_PARTNERS}
                addNotification={addNotification}
                selectedMairieId={selectedMairieId}
                selectedMairieName={selectedMairieName}
                dossierId={dossierId}
                weddingDate={weddingDate}
                spouse1Phone={spouse1Phone}
                spouse2Phone={spouse2Phone}
              />
            )}

            {currentTab === 'guide' && (
              <Guide onStartDossier={() => setCurrentTab('dashboard')} />
            )}
          </>
        ) : currentRole === 'maire' ? (
          <MayorDashboard addNotification={triggerToast} />
        ) : (
          /* Render Admin portal center */
          <AdminDashboard
            currentRole={currentRole as any}
            addNotification={triggerToast}
          />
        )}
      </main>

      {/* Floating AI Assistant in the corner */}
      <AiAssistant />

      {/* Elegant Toast notification banner */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 left-6 sm:left-auto sm:w-96 z-[250] bg-slate-950/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-amber-500/30 animate-slide-in">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
          <p className="font-sans text-xs leading-relaxed font-semibold self-start text-left text-slate-100">
            {toastMessage}
          </p>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[10px] text-slate-400 hover:text-amber-500 ml-auto cursor-pointer font-bold p-1 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Desktop footer block */}
      <Footer setTab={setTab} />

      {/* Beautiful Bottom Mobile Navigation Bar (Only shown for citizen) */}
      {currentRole === 'citoyen' && (() => {
        const isNamesEmpty = !spouse1Name?.trim() || !spouse2Name?.trim();
        return (
          <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 px-2 bg-white/95 backdrop-blur-lg rounded-t-2xl border-t border-outline-variant/30 shadow-[0px_-4px_24px_rgba(26,43,72,0.06)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <button
              onClick={() => setTab('accueil')}
              className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-300 w-16 ${currentTab === 'accueil' ? 'text-primary scale-105 font-bold' : 'text-slate-400 font-medium'
                }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-sans text-[10px] tracking-wider mt-1">Accueil</span>
            </button>

            <button
              onClick={() => handleOpenParcoursAtStep(1)}
              className="flex flex-col items-center justify-center cursor-pointer transition-all duration-300 w-16 text-slate-400 font-medium hover:text-primary"
            >
              <Calendar className="w-5 h-5" />
              <span className="font-sans text-[10px] tracking-wider mt-1">Parcours</span>
            </button>

            <button
              onClick={() => setTab('dossier')}
              className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-300 w-16 ${currentTab === 'dossier' ? 'text-primary scale-105 font-bold' : 'text-slate-400 font-medium'
                }`}
            >
              <FolderOpen className="w-5 h-5" />
              <span className="font-sans text-[10px] tracking-wider mt-1">Dossier</span>
            </button>

            <button
              onClick={() => setTab('partners')}
              className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-300 w-16 ${currentTab === 'partners' ? 'text-primary scale-105 font-bold' : 'text-slate-400 font-medium'
                }`}
            >
              <Heart className="w-5 h-5" />
              <span className="font-sans text-[10px] tracking-wider mt-1">Prestataires</span>
            </button>

            <button
              onClick={() => setTab('dashboard')}
              className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-300 w-16 ${currentTab === 'dashboard' ? 'text-primary scale-105 font-bold' : 'text-slate-400 font-medium'
                }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span className="font-sans text-[10px] tracking-wider mt-1">Suivi</span>
            </button>
          </nav>
        );
      })()}

      {authPendingRole && (
        <LoginModal
          role={authPendingRole}
          mairies={mairies}
          onSuccess={(mairieId) => {
            setRole(authPendingRole);
            sessionStorage.setItem('e_mariage_logged_role', authPendingRole);
            if (authPendingRole === 'mairie' && mairieId) {
              sessionStorage.setItem('mairie_unlocked_id', mairieId);
            }
            if (authPendingRole === 'maire') {
              setTab('maire');
            } else {
              setTab('admin');
            }
            setAuthPendingRole(null);
            triggerToast(`Connexion réussie : Espace ${authPendingRole === 'mairie' ? 'Mairie' :
              authPendingRole === 'maire' ? 'Le Maire' : 'Super Administrateur'
              } déverrouillé.`);
          }}
          onCancel={() => {
            setAuthPendingRole(null);
          }}
        />
      )}

    </div>
  );
}
