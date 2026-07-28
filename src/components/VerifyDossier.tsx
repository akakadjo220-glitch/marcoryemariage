import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Award, Calendar, Landmark, User, FileText, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { getDossierById, getPaymentForDossier, getMairies, MairieInfo, DossierInfo } from '../services/dbService';
import { PaymentInfo } from '../types';

interface VerifyDossierProps {
  dossierId: string;
  onGoBack: () => void;
}

export default function VerifyDossier({ dossierId, onGoBack }: VerifyDossierProps) {
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<DossierInfo | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [mairies, setMairies] = useState<MairieInfo[]>([]);
  const [mairieName, setMairieName] = useState('Marcory');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [dbDossier, dbPayment, dbMairies] = await Promise.all([
          getDossierById(dossierId),
          getPaymentForDossier(dossierId),
          getMairies()
        ]);
        setDossier(dbDossier);
        setPayment(dbPayment);
        setMairies(dbMairies);

        if (dbDossier && dbDossier.mairie_id) {
          const matched = dbMairies.find(m => m.id === dbDossier.mairie_id);
          if (matched) {
            setMairieName(matched.name);
          }
        }
      } catch (err) {
        console.error("Error verifying document:", err);
      } finally {
        setLoading(false);
      }
    }
    if (dossierId) {
      loadData();
    }
  }, [dossierId]);

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4 text-left font-sans relative">
      {/* Background President Glow */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-slate-900/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Back to main portal button (screen-only) */}
      <button
        onClick={onGoBack}
        className="no-print mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour au portail citoyen
      </button>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 bg-white/60 backdrop-blur-md border border-neutral-200/50 rounded-2xl p-8 shadow-xl">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-semibold text-sm">Vérification de la quittance en cours...</span>
        </div>
      ) : dossier && payment ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border-2 border-emerald-600/25 shadow-2xl p-6 md:p-8 overflow-hidden relative"
        >
          {/* Header Seal */}
          <div className="flex items-center gap-3 border-b border-neutral-100 pb-5 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/50">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold block">Registre National de l'État Civil</span>
              <h2 className="font-serif text-lg md:text-xl font-bold text-slate-900 leading-tight">
                Authentification de Document Civile
              </h2>
            </div>
            <div className="ml-auto w-12 h-12 rounded-full overflow-hidden border border-neutral-200/50 bg-white flex items-center justify-center shadow-md shrink-0">
              <img src="/logo.png" alt="Mairie Logo" className="w-full h-full object-contain p-1" />
            </div>
          </div>

          {/* Success Badge */}
          <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-4 mb-6 flex items-start gap-3">
            <div className="text-emerald-700 text-lg mt-0.5">✔</div>
            <div>
              <h4 className="font-bold text-emerald-800 text-sm">Quittance Fiscale Authentique &amp; Enregistrée</h4>
              <p className="text-xs text-emerald-700/85 mt-0.5 leading-relaxed">
                Ce document fiscal a été généré par les services de l'État Civil de la Commune de {mairieName}. Les fonds ont été acquittés de manière libératoire et le dossier civil correspondant est dûment valide.
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <h4 className="font-serif text-xs font-bold text-slate-400 uppercase tracking-wider">Détails de l'Enregistrement</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 border border-neutral-150 p-4 rounded-xl text-xs font-sans">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">N° Transaction (Référence)</span>
                    <span className="font-mono font-semibold text-slate-800 block text-xs">{payment.reference}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">Lieu d'Enregistrement</span>
                    <span className="font-semibold text-slate-800 block">{mairieName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">Futurs Époux</span>
                    <span className="font-bold text-slate-800 block">{dossier.spouse1_name} &amp; {dossier.spouse2_name}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">Date &amp; Heure Célébration</span>
                    <span className="font-semibold text-slate-800 block">{dossier.wedding_date || 'Non programmée'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">Montant Règlement</span>
                    <span className="font-bold text-amber-600 block">{payment.amount.toLocaleString()} {payment.currency || 'XOF'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">Date de Règlement</span>
                    <span className="font-semibold text-slate-800 block">{new Date(payment.date).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer message */}
          <div className="mt-8 pt-4 border-t border-neutral-100 text-center text-[10px] text-slate-400 font-sans leading-relaxed">
            Direction Générale de la Décentralisation et du Développement Local.
            <br />
            Signé électroniquement sous la référence sécurisée cryptographique <span className="font-mono">{dossierId.substring(0, 10)}...</span>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border-2 border-rose-600/25 shadow-2xl p-6 md:p-8 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-650 flex items-center justify-center border border-rose-200/50 mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <h2 className="font-serif text-xl font-bold text-slate-900 mb-2">
            Document Non Authentifié
          </h2>
          <p className="text-sm text-slate-550 max-w-md mx-auto mb-6 leading-relaxed">
            Le numéro de dossier civil ou la quittance référencée (<span className="font-mono font-bold text-rose-700">{dossierId}</span>) ne correspond à aucun règlement de quittance de mariage validé par la mairie dans notre système national de l'État Civil.
          </p>

          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-700 max-w-md mx-auto text-left flex items-start gap-2.5">
            <span>⚠️</span>
            <p>
              <strong>Attention :</strong> Si vous pensez qu'il s'agit d'une erreur, veuillez vérifier que le règlement a bien été complété par Paystack ou auprès du Trésor Municipal de votre mairie, et que votre dossier n'a pas été archivé ou supprimé.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-neutral-100 text-center text-[10px] text-slate-400 font-sans">
            Portail National de Sécurisation des Actes d'État Civil.
          </div>
        </motion.div>
      )}
    </div>
  );
}
