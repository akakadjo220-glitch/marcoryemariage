import React, { useState, useEffect } from 'react';
import { 
  Award, Calendar, Users, Landmark, Plus, Check, Trash2, 
  ChevronRight, ArrowRight, Sparkles, Printer, UserPlus, Clock, ShieldAlert,
  Loader2
} from 'lucide-react';
import { 
  DossierInfo, MairieInfo, getDossiers, getMairies, createDossier, 
  getCapacityForDate, setCapacityForDate, getCapacityOverrides, CapacityOverride,
  updateTimelineStepInDb, getAllPayments
} from '../services/dbService';
import MarriageReceiptModal from './MarriageReceiptModal';
import { PaymentInfo } from '../types';
import { motion } from 'motion/react';


interface MayorDashboardProps {
  addNotification: (text: string, type: 'info' | 'warning' | 'success') => void;
}

export default function MayorDashboard({ addNotification }: MayorDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedSalle, setSelectedSalle] = useState<string>('cocody_salle_prestige');
  const [dossiers, setDossiers] = useState<DossierInfo[]>([]);
  const [salles, setSalles] = useState<MairieInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'agenda' | 'finance'>('agenda');
  const [allPayments, setAllPayments] = useState<PaymentInfo[]>([]);
  const [selectedReceiptDossierId, setSelectedReceiptDossierId] = useState<string | null>(null);
  const [receiptSpouse1, setReceiptSpouse1] = useState('');
  const [receiptSpouse2, setReceiptSpouse2] = useState('');
  const [receiptWeddingDate, setReceiptWeddingDate] = useState<string | null>(null);
  const [receiptMairieName, setReceiptMairieName] = useState('');

  // Capacity overrides
  const [currentCapacity, setCurrentCapacity] = useState<number>(15);
  const [newCapacityVal, setNewCapacityVal] = useState<number>(15);
  const [allOverrides, setAllOverrides] = useState<CapacityOverride[]>([]);
  const [settingCapacity, setSettingCapacity] = useState(false);

  // Manual wedding form
  const [manualSpouse1, setManualSpouse1] = useState('');
  const [manualSpouse2, setManualSpouse2] = useState('');
  const [manualPhone1, setManualPhone1] = useState('+225 ');
  const [manualPhone2, setManualPhone2] = useState('+225 ');
  const [manualTime, setManualTime] = useState('09:00');
  const [creatingWedding, setCreatingWedding] = useState(false);

  // Load dashboard data
  const loadData = async () => {
    setLoading(true);
    try {
      const [dbDossiers, dbMairies, overrides, dbPayments] = await Promise.all([
        getDossiers(),
        getMairies(),
        getCapacityOverrides(),
        getAllPayments()
      ]);
      setDossiers(dbDossiers);
      setSalles(dbMairies.filter(m => m.is_active));
      setAllOverrides(overrides);
      setAllPayments(dbPayments || []);
      
      const cap = await getCapacityForDate(selectedSalle, selectedDate);
      setCurrentCapacity(cap);
      setNewCapacityVal(cap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedSalle]);

  // Helper to check if a specific time is occupied
  const getDossierAtTime = (timeVal: string) => {
    const formattedDate = new Date(selectedDate).toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    const targetWeddingDateStr = `${formattedDate} à ${timeVal.replace(':', 'h')}`;
    
    return dossiers.find(d => 
      d.mairie_id === selectedSalle && 
      d.wedding_date === targetWeddingDateStr
    );
  };

  // Generate dynamic time slots based on capacity
  const generateSlots = (capVal: number) => {
    const slots = [];
    let currentHour = 8;
    let currentMin = 0;
    
    for (let i = 0; i < capVal; i++) {
      const timeVal = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      slots.push({
        val: timeVal,
        label: `${currentHour}h${currentMin.toString().padStart(2, '0')}`
      });
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentHour += 1;
        currentMin = 0;
      }
    }
    return slots;
  };

  const slots = generateSlots(currentCapacity);
  const bookedCount = slots.filter(s => getDossierAtTime(s.val) !== undefined).length;

  const mayorPayments = allPayments.filter(p => (p.mairieId === selectedSalle || p.mairieId === 'cocody_hotel_de_ville') && p.status === 'success');
  const totalRecettes = mayorPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalDossiersPaid = mayorPayments.length;
  const unpaidDossiersCount = dossiers.filter(d => (d.mairie_id === selectedSalle || d.mairie_id === 'cocody_hotel_de_ville') && d.status === 'approved' && !mayorPayments.some(p => p.dossierId === d.id)).length;


  const handleUpdateCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingCapacity(true);
    try {
      await setCapacityForDate(selectedSalle, selectedDate, newCapacityVal);
      setCurrentCapacity(newCapacityVal);
      addNotification(`Quota d'unions civiles ajusté à ${newCapacityVal} pour la journée.`, 'success');
      loadData();
    } catch (err) {
      addNotification("Erreur lors du paramétrage de la capacité.", "warning");
    } finally {
      setSettingCapacity(false);
    }
  };

  const handleCreateManualWedding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSpouse1.trim() || !manualSpouse2.trim() || !manualTime) return;
    
    setCreatingWedding(true);
    try {
      // Check if slot is already occupied
      const existing = getDossierAtTime(manualTime);
      if (existing) {
        addNotification("Ce créneau horaire est déjà occupé par un autre couple.", "warning");
        setCreatingWedding(false);
        return;
      }

      const formattedDate = new Date(selectedDate).toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      const targetWeddingDateStr = `${formattedDate} à ${manualTime.replace(':', 'h')}`;
      
      const rand = Math.floor(1000 + Math.random() * 9000);
      const newDossierId = `dossier_maire_${rand}`;

      const newDossier: DossierInfo = {
        id: newDossierId,
        mairie_id: selectedSalle,
        spouse1_name: manualSpouse1,
        spouse2_name: manualSpouse2,
        spouse1_phone: manualPhone1,
        spouse2_phone: manualPhone2,
        wedding_date: targetWeddingDateStr,
        status: 'approved',
        slot_reserved_at: new Date().toISOString()
      };

      await createDossier(newDossier);
      // Auto complete setup steps since it is manually registered
      await updateTimelineStepInDb(newDossierId, 1, 'completed');
      await updateTimelineStepInDb(newDossierId, 2, 'completed');
      await updateTimelineStepInDb(newDossierId, 3, 'completed');
      await updateTimelineStepInDb(newDossierId, 4, 'completed');
      await updateTimelineStepInDb(newDossierId, 5, 'active');

      addNotification(`Mariage enregistré avec succès pour ${manualSpouse1} & ${manualSpouse2} à ${manualTime} !`, 'success');
      
      // Reset form
      setManualSpouse1('');
      setManualSpouse2('');
      setManualPhone1('+225 ');
      setManualPhone2('+225 ');
      
      loadData();
    } catch (err) {
      addNotification("Une erreur s'est produite lors de l'enregistrement.", "warning");
    } finally {
      setCreatingWedding(false);
    }
  };

  const handlePrintDailyList = () => {
    window.print();
  };

  const renderMayorFinanceView = () => {
    const mayorPayments = allPayments.filter(p => (p.mairieId === selectedSalle || p.mairieId === 'cocody_hotel_de_ville') && p.status === 'success');
    const totalRecettes = mayorPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalDossiersPaid = mayorPayments.length;
    const unpaidDossiersCount = dossiers.filter(d => (d.mairie_id === selectedSalle || d.mairie_id === 'cocody_hotel_de_ville') && d.status === 'approved' && !mayorPayments.some(p => p.dossierId === d.id)).length;

    const openReceipt = (pay: PaymentInfo) => {
      const matchedDossier = dossiers.find(d => d.id === pay.dossierId);
      setSelectedReceiptDossierId(pay.dossierId);
      setReceiptSpouse1(matchedDossier?.spouse1_name || 'Époux 1');
      setReceiptSpouse2(matchedDossier?.spouse2_name || 'Époux 2');
      setReceiptWeddingDate(matchedDossier?.wedding_date || null);
      
      const matchedMairie = salles.find(s => s.id === pay.mairieId);
      setReceiptMairieName(matchedMairie?.name || 'Marcory');
    };

    // Payment methods counts
    const methodCounts: { [key: string]: number } = {
      Wave: 0, Orange: 0, MTN: 0, Moov: 0, Card: 0
    };
    mayorPayments.forEach(p => {
      const m = p.method.toLowerCase();
      if (m.includes('wave')) methodCounts.Wave++;
      else if (m.includes('orange')) methodCounts.Orange++;
      else if (m.includes('mtn')) methodCounts.MTN++;
      else if (m.includes('moov')) methodCounts.Moov++;
      else methodCounts.Card++;
    });

    const totalMethods = Math.max(Object.values(methodCounts).reduce((a, b) => a + b, 0), 1);

    return (
      <div className="flex flex-col gap-6 text-left font-sans mt-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-premium border-l-4 border-l-slate-900 rounded-2xl p-5 shadow-sm bg-white/55 backdrop-blur-md flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Recettes de la Salle</span>
            <span className="font-serif text-2xl font-extrabold text-slate-900 block mt-1">
              {totalRecettes.toLocaleString()} XOF
            </span>
            <span className="text-[11px] text-amber-600 font-semibold mt-0.5 block">
              Fonds fiscaux communaux perçus
            </span>
          </div>

          <div className="glass-premium border-l-4 border-l-emerald-500 rounded-2xl p-5 shadow-sm bg-white/55 backdrop-blur-md flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Mariages Validés (Payés)</span>
            <span className="font-serif text-2xl font-extrabold text-slate-900 block mt-1">
              {totalDossiersPaid} Unions
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">
              Droit de timbre acquitté ✅
            </span>
          </div>

          <div className="glass-premium border-l-4 border-l-sky-500 rounded-2xl p-5 shadow-sm bg-white/55 backdrop-blur-md flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">En Attente de Quittance</span>
            <span className="font-serif text-2xl font-extrabold text-slate-900 block mt-1">
              {unpaidDossiersCount} Couples
            </span>
            <span className="text-[11px] text-sky-600 font-semibold mt-0.5 block">
              Célébrations à régulariser 💰
            </span>
          </div>
        </div>

        {/* Charts & Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Operator Distribution */}
          <div className="lg:col-span-4 glass-card rounded-2xl p-6 border border-neutral-100 flex flex-col gap-4 bg-white/65 shadow-sm">
            <h4 className="font-serif text-xs uppercase font-extrabold text-slate-450 tracking-wider">Canaux Financiers</h4>
            <div className="flex flex-col gap-4 mt-2">
              {Object.keys(methodCounts).map((method, idx) => {
                const count = methodCounts[method];
                const pct = Math.round((count / totalMethods) * 100);
                return (
                  <div key={idx} className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>{method}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-slate-800 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transactions Registry */}
          <div className="lg:col-span-8 glass-card rounded-2xl p-6 border border-neutral-100 flex flex-col gap-4 bg-white/70 shadow-sm">
            <h4 className="font-serif text-xs uppercase font-extrabold text-slate-450 tracking-wider">Dernières Transactions Recouvrées</h4>
            {mayorPayments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Aucun règlement financier enregistré pour cette salle de mariage.
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[300px]">
                <table className="w-full text-xs font-sans border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-150 text-slate-400 uppercase text-[9px] font-bold text-left bg-slate-50/50">
                      <th className="py-2.5 px-2">Date</th>
                      <th className="py-2.5 px-2">Époux</th>
                      <th className="py-2.5 px-2">Référence</th>
                      <th className="py-2.5 px-2">Mode</th>
                      <th className="py-2.5 px-2">Montant</th>
                      <th className="py-2.5 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mayorPayments.map(pay => {
                      const matchedDossier = dossiers.find(d => d.id === pay.dossierId);
                      const couple = matchedDossier
                        ? `${matchedDossier.spouse1_name} & ${matchedDossier.spouse2_name}`
                        : 'Couple inconnu';
                      return (
                        <tr key={pay.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                          <td className="py-2.5 px-2 text-slate-500">{new Date(pay.date).toLocaleDateString('fr-FR')}</td>
                          <td className="py-2.5 px-2 font-bold text-slate-850">{couple}</td>
                          <td className="py-2.5 px-2 font-mono text-slate-500">{pay.reference}</td>
                          <td className="py-2.5 px-2 text-slate-600">{pay.method}</td>
                          <td className="py-2.5 px-2 font-bold text-slate-900">{pay.amount.toLocaleString()} XOF</td>
                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={() => openReceipt(pay)}
                              className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded font-bold cursor-pointer transition-colors shadow-sm text-[11px]"
                            >
                              Voir
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
      </div>
    );
  };

  return (
    <div className="w-full relative text-slate-800 text-left">
      {/* Background Presidential Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-900/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-amber-900/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header / Seal of Mairie de Marcory */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-5 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-900 text-amber-500 flex items-center justify-center border-2 border-amber-500 shadow-md">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-serif text-2xl md:text-3xl font-extrabold text-slate-950 tracking-tight">
              Monsieur le Maire de Marcory
            </h2>
            <p className="font-sans text-xs text-amber-600 font-bold uppercase tracking-widest mt-0.5">
              Cabinet d'État Civil &bull; Pilotage des Capacités
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 shrink-0">
          <button 
            onClick={handlePrintDailyList}
            className="px-4 py-2 border border-slate-350 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold font-sans flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer la feuille d'appel</span>
          </button>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold font-sans flex items-center gap-2 cursor-pointer hover:bg-slate-800 transition-colors shadow"
          >
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation for Mayor */}
      <div className="flex border-b border-neutral-200/60 font-sans text-xs mb-6 overflow-x-auto whitespace-nowrap hide-scrollbar no-print gap-2">
        <button
          onClick={() => setActiveTab('agenda')}
          className={`px-5 py-3.5 font-sans uppercase tracking-widest font-bold cursor-pointer transition-all duration-300 flex items-center gap-1.5 shrink-0 relative ${activeTab === 'agenda'
              ? 'text-primary'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <Calendar className="w-4 h-4 text-accent" />
          <span>Agenda &amp; Quotas</span>
          {activeTab === 'agenda' && (
            <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-primary to-accent rounded-full animate-fade-in" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`px-5 py-3.5 font-sans uppercase tracking-widest font-bold cursor-pointer transition-all duration-300 flex items-center gap-1.5 shrink-0 relative ${activeTab === 'finance'
              ? 'text-primary'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <Landmark className="w-4 h-4 text-accent" />
          <span>Finance &amp; Recettes</span>
          {activeTab === 'finance' && (
            <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-primary to-accent rounded-full animate-fade-in" />
          )}
        </button>
      </div>

      {activeTab === 'agenda' && (
        <>
      {/* Pilotage de l'Agenda */}
      <h3 className="font-serif text-xs uppercase font-extrabold text-slate-450 tracking-wider mb-3 select-none text-left">Suivi de la Salle &amp; Planification</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="glass-premium border-l-4 border-l-slate-900 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans tracking-wider">Salle Sélectionnée</span>
          <span className="font-serif text-base font-extrabold text-slate-900 block mt-1">
            {salles.find(s => s.id === selectedSalle)?.name || 'Chargement...'}
          </span>
          <span className="text-[11px] text-amber-600 font-sans font-semibold mt-0.5 block">
            Marcory Centrale &bull; Côte d'Ivoire
          </span>
        </div>
        
        <div className="glass-premium border-l-4 border-l-amber-500 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans tracking-wider">Quota du Jour</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-serif text-3xl font-extrabold text-slate-900">
              {bookedCount} / {currentCapacity}
            </span>
            <span className="text-xs text-slate-500 font-sans">unions civiles</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (bookedCount / currentCapacity) * 100)}%` }} 
            />
          </div>
        </div>

        <div className="glass-premium border-l-4 border-l-emerald-500 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans tracking-wider">Surcharges Actives</span>
          <span className="font-serif text-3xl font-extrabold text-slate-900 block mt-1">
            {allOverrides.length}
          </span>
          <span className="text-[11px] text-emerald-700 font-sans font-semibold mt-0.5 block">
            Dates exceptionnellement rehaussées
          </span>
        </div>
      </div>

      {/* Indicateurs Financiers */}
      <h3 className="font-serif text-xs uppercase font-extrabold text-slate-450 tracking-wider mb-3 mt-4 select-none text-left">Statistiques Financières &amp; Droits de Timbre</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-premium border-l-4 border-l-slate-950 rounded-2xl p-5 shadow-sm bg-white/55 backdrop-blur-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Recettes de la Salle</span>
          <span className="font-serif text-2xl font-extrabold text-slate-900 block mt-1">
            {totalRecettes.toLocaleString()} XOF
          </span>
          <span className="text-[11px] text-amber-600 font-semibold mt-0.5 block">
            Fonds fiscaux communaux perçus
          </span>
        </div>

        <div className="glass-premium border-l-4 border-l-emerald-600 rounded-2xl p-5 shadow-sm bg-white/55 backdrop-blur-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Mariages Validés (Payés)</span>
          <span className="font-serif text-2xl font-extrabold text-slate-900 block mt-1">
            {totalDossiersPaid} Unions
          </span>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">
            Droit de timbre acquitté ✅
          </span>
        </div>

        <div className="glass-premium border-l-4 border-l-sky-500 rounded-2xl p-5 shadow-sm bg-white/55 backdrop-blur-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">En Attente de Quittance</span>
          <span className="font-serif text-2xl font-extrabold text-slate-900 block mt-1">
            {unpaidDossiersCount} Couples
          </span>
          <span className="text-[11px] text-sky-600 font-semibold mt-0.5 block">
            Célébrations à régulariser 💰
          </span>
        </div>
      </div>

      {/* Date & Salle Selectors */}
      <div className="glass-premium rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-4 justify-between items-stretch">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 font-sans">
              Sélectionner la Salle de Célébration
            </label>
            <select
              value={selectedSalle}
              onChange={e => setSelectedSalle(e.target.value)}
              className="w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs bg-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer text-slate-800"
            >
              {salles.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 font-sans">
              Choisir la Date de Célébration
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs bg-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer text-slate-800 font-sans"
              />
            </div>
          </div>
        </div>

        {/* Capacity adjust form */}
        <form onSubmit={handleUpdateCapacity} className="flex flex-col justify-end shrink-0 border-t md:border-t-0 md:border-l border-neutral-200 pt-4 md:pt-0 md:pl-6">
          <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 font-sans">
            Surcharger la capacité d'unions (Max/Jour)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="40"
              value={newCapacityVal}
              onChange={e => setNewCapacityVal(parseInt(e.target.value) || 15)}
              className="w-24 border border-neutral-200 rounded-xl px-3 py-2 text-center text-xs font-bold focus:outline-none focus:border-amber-500 bg-white"
            />
            <button
              type="submit"
              disabled={settingCapacity || newCapacityVal === currentCapacity}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all ${
                newCapacityVal !== currentCapacity 
                  ? 'bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-sm' 
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              {settingCapacity ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Appliquer"}
            </button>
          </div>
          <span className="text-[9px] text-slate-400 mt-1 block max-w-[240px]">
            La capacité standard est de 15 mariages par jour (15 créneaux de 30 minutes de 8h00 à 15h00).
          </span>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Daily Schedule of weddings (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="glass-premium rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  <span>Cérémonies programmées</span>
                </h3>
                <p className="font-sans text-[11px] text-slate-500 mt-0.5">
                  {new Date(selectedDate).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })} &bull; {bookedCount} unions civiles enregistrées.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="font-sans text-xs">Chargement du planning...</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {slots.map(slot => {
                  const dossier = getDossierAtTime(slot.val);
                  return (
                    <div 
                      key={slot.val}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        dossier 
                          ? 'border-amber-250 bg-amber-50/25 hover:bg-amber-50/40 shadow-inner-sm' 
                          : 'border-neutral-100 bg-neutral-50/50 hover:bg-white'
                      }`}
                    >
                      {/* Slot time */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border font-bold text-xs ${
                          dossier 
                            ? 'bg-amber-600 border-amber-600 text-white shadow-sm' 
                            : 'bg-white border-neutral-200 text-slate-500'
                        }`}>
                          <Clock className="w-3.5 h-3.5 mb-0.5" />
                          <span>{slot.label}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase font-sans tracking-wide">Créneau</span>
                          <span className="text-xs font-semibold text-slate-600">
                            {dossier ? 'Occupé' : 'Libre pour réservation'}
                          </span>
                        </div>
                      </div>

                      {/* Couple Details */}
                      {dossier ? (
                        <div className="flex-1 min-w-0 text-left sm:px-4">
                          <span className="text-[9px] font-bold text-amber-650 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50 uppercase tracking-widest">
                            Union Civile #{dossier.id.replace('dossier_', '').toUpperCase()}
                          </span>
                          <h4 className="font-serif text-sm font-bold text-slate-900 mt-1 truncate">
                            {dossier.spouse1_name} &amp; {dossier.spouse2_name}
                          </h4>
                          <p className="font-sans text-[10px] text-slate-500 mt-0.5">
                            📞 {dossier.spouse1_phone} / {dossier.spouse2_phone}
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0 text-left sm:px-4 flex items-center text-slate-300 italic font-sans text-xs">
                          Aucun dossier planifié sur ce créneau.
                        </div>
                      )}

                      {/* Actions */}
                      {dossier && (
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            ✓ Confirmé
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Manual Registry Form (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-premium rounded-2xl p-5 shadow-md border-t-4 border-t-amber-500">
            <h3 className="font-serif text-base font-bold text-slate-950 flex items-center gap-2 mb-3">
              <UserPlus className="w-5 h-5 text-amber-500" />
              <span>Enregistrement Officiel Direct</span>
            </h3>
            <p className="font-sans text-[11px] text-slate-500 leading-relaxed mb-4">
              En tant que Maire ou Adjoint d'État Civil, enregistrez manuellement un mariage directement sur un créneau libre. Cette procédure contourne l'instruction citoyenne et valide d'office l'union.
            </p>

            <form onSubmit={handleCreateManualWedding} className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Futur Époux — Nom complet</label>
                <input
                  required
                  value={manualSpouse1}
                  onChange={e => setManualSpouse1(e.target.value)}
                  placeholder="Ex: Jean-Marc KOUASSI"
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none bg-neutral-50/50 font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Future Épouse — Nom complet</label>
                <input
                  required
                  value={manualSpouse2}
                  onChange={e => setManualSpouse2(e.target.value)}
                  placeholder="Ex: Marie-Claire DIALLO"
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none bg-neutral-50/50 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tél. Époux 1</label>
                  <input
                    value={manualPhone1}
                    onChange={e => setManualPhone1(e.target.value)}
                    placeholder="+225 07..."
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none bg-neutral-50/50 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tél. Époux 2</label>
                  <input
                    value={manualPhone2}
                    onChange={e => setManualPhone2(e.target.value)}
                    placeholder="+225 07..."
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none bg-neutral-50/50 font-sans"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Heure de Célébration</label>
                <select
                  value={manualTime}
                  onChange={e => setManualTime(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer text-slate-800"
                >
                  {slots.map(s => {
                    const isOccupied = getDossierAtTime(s.val) !== undefined;
                    return (
                      <option key={s.val} value={s.val} disabled={isOccupied}>
                        {s.label} {isOccupied ? '(Occupé)' : '(Libre)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingWedding || !manualSpouse1.trim() || !manualSpouse2.trim()}
                className={`w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all mt-3 ${
                  manualSpouse1.trim() && manualSpouse2.trim() && !creatingWedding
                    ? 'bg-slate-900 hover:bg-slate-800 cursor-pointer shadow-md' 
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
              >
                {creatingWedding ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Enregistrer et valider l'union"}
              </button>
            </form>
          </div>
        </div>
      </div>
      </>
      )}

      {activeTab === 'finance' && renderMayorFinanceView()}

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
