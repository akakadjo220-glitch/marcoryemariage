import React, { useState, useEffect } from 'react';
import { Printer, X, Award, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { getPaymentForDossier } from '../services/dbService';
import { PaymentInfo } from '../types';

interface MarriageReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossierId: string;
  spouse1Name: string;
  spouse2Name: string;
  weddingDate: string | null;
  selectedMairieName: string;
}

export default function MarriageReceiptModal({
  isOpen,
  onClose,
  dossierId,
  spouse1Name,
  spouse2Name,
  weddingDate,
  selectedMairieName
}: MarriageReceiptModalProps) {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && dossierId) {
      setLoading(true);
      getPaymentForDossier(dossierId)
        .then((pay) => {
          setPaymentInfo(pay);
          setLoading(false);
          if (pay) {
            // Generate QR Code that links to verification URL
            const verifyUrl = `${window.location.origin}?verify=${dossierId}`;
            QRCode.toDataURL(verifyUrl, {
              width: 180,
              margin: 1,
              color: {
                dark: '#0f172a', // slate-900
                light: '#ffffff'
              }
            })
              .then(url => setQrUrl(url))
              .catch(err => console.error("Error generating QR Code", err));
          }
        })
        .catch(err => {
          console.error("Error loading payment info:", err);
          setLoading(false);
        });
    }
  }, [isOpen, dossierId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm no-print">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body {
                background: white !important;
                color: black !important;
              }
              body > * {
                display: none !important;
              }
              #print-quittance-container {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 40px !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
              }
              .print-quittance-modal-content {
                border: 6px double #B4975A !important;
                box-shadow: none !important;
                width: 100% !important;
                padding: 30px !important;
                background: white !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `
        }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          id="print-quittance-container"
          className="relative w-full max-w-lg bg-white/95 rounded-2xl border border-amber-500/20 shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[90vh]"
        >
          {/* Close button (only visible on screen) */}
          <button
            onClick={onClose}
            className="no-print absolute top-4 right-4 w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-slate-400 hover:text-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500 font-sans">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Chargement du reçu...</span>
            </div>
          ) : !paymentInfo ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center text-slate-500 font-sans">
              <span className="text-4xl">⚠️</span>
              <p className="font-bold text-slate-800">Aucun règlement enregistré</p>
              <p className="text-xs max-w-xs text-slate-500">Aucune quittance de paiement n'a été émise pour ce dossier civil. Veuillez procéder au règlement.</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          ) : (
            <div className="print-quittance-modal-content flex flex-col gap-5 text-center border-4 border-double border-amber-600/35 p-5 md:p-6 rounded-xl bg-amber-50/5 relative overflow-hidden font-serif">
              {/* Presidential frame corners */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-600/25"></div>
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-600/25"></div>
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-600/25"></div>
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-600/25"></div>

              {/* Cote d'Ivoire Mairie Seal Header */}
              <div className="flex flex-col items-center gap-1.5 border-b border-neutral-200/50 pb-3">
                <img src="/logo.png" alt="E-Mariage Logo" className="h-10 object-contain mb-1" />
                <span className="font-sans text-[9px] uppercase tracking-widest text-slate-500 font-bold">République de Côte d'Ivoire</span>
                <span className="font-serif text-[11px] font-bold text-slate-800 uppercase">Commune de Célébration : {selectedMairieName || 'Marcory'}</span>
                <span className="font-sans text-[7.5px] uppercase tracking-wider text-slate-400 font-bold">Direction des Recettes Municipales &amp; du Trésor</span>
              </div>

              {/* Quittance Title */}
              <div className="my-2">
                <h4 className="font-serif text-xl text-amber-800 font-bold tracking-wide uppercase">Quittance Fiscale Municipale</h4>
                <p className="font-mono text-[9px] text-slate-400 font-bold uppercase mt-0.5">N° TRANSACTION : {paymentInfo.reference}</p>
              </div>

              {/* Receipt metadata table */}
              <div className="space-y-2.5 text-xs text-left max-w-md mx-auto w-full my-1 font-sans">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-1.5">
                  <span className="text-slate-400 font-medium">Code Dossier Civil :</span>
                  <span className="font-mono font-bold text-slate-800">{dossierId.toUpperCase().replace('DOSSIER_', '')}</span>
                </div>
                <div className="flex justify-between items-start border-b border-neutral-100 pb-1.5">
                  <span className="text-slate-400 font-medium shrink-0">Futurs Époux :</span>
                  <span className="font-bold text-slate-800 text-right">{spouse1Name} &amp; {spouse2Name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-neutral-100 pb-1.5">
                  <span className="text-slate-400 font-medium">Objet du Versement :</span>
                  <span className="font-bold text-slate-800">Droits d'Enregistrement de Mariage Civil</span>
                </div>
                <div className="flex justify-between items-center border-b border-neutral-100 pb-1.5">
                  <span className="text-slate-400 font-medium">Canal de Règlement :</span>
                  <span className="font-bold text-slate-800">{paymentInfo.method}</span>
                </div>
                <div className="flex justify-between items-center border-b border-neutral-150 pb-1.5">
                  <span className="text-slate-400 font-medium">Date de Célébration :</span>
                  <span className="font-bold text-slate-800">{weddingDate || 'Non planifié'}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-800 font-bold uppercase">Montant Total Acquitté :</span>
                  <span className="font-bold text-amber-600 text-sm">{paymentInfo.amount.toLocaleString()} {paymentInfo.currency || 'XOF'}</span>
                </div>
              </div>

              {/* Bottom stamp + real QR code */}
              <div className="grid grid-cols-2 gap-4 items-center mt-4 border-t border-neutral-200/50 pt-4">
                <div className="flex flex-col items-center sm:items-start gap-1">
                  <div className="w-24 h-24 p-1.5 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                    {qrUrl ? (
                      <img src={qrUrl} alt="QR Code d'Authentification" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 animate-pulse rounded"></div>
                    )}
                  </div>
                  <span className="text-[7.5px] font-sans text-slate-400 mt-1 select-none">Scanner pour authentifier</span>
                </div>

                <div className="flex flex-col items-center gap-1 text-center font-serif text-[10px] text-slate-700">
                  <span className="font-bold underline">Le Receveur Municipal</span>
                  <span className="text-[8px] text-slate-400 italic mt-3">(Sceau &amp; Signature)</span>

                  <div className="relative flex items-center justify-center w-20 h-10 select-none">
                    <div className="absolute w-11 h-11 rounded-full border border-dashed border-amber-600/40 flex items-center justify-center text-[5.5px] text-amber-700/50 font-sans font-bold uppercase tracking-tighter text-center rotate-6 scale-90">
                      Receveur<br />Municipal
                    </div>
                    <span className="absolute font-serif text-sm text-indigo-900/80 font-bold italic -rotate-6 select-none opacity-80" style={{ fontFamily: 'Georgia, serif' }}>
                      Koffi.A
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-[7.5px] font-sans text-slate-450 leading-relaxed text-left border-t border-neutral-100 pt-2">
                Cette quittance fait foi de paiement libératoire des taxes municipales de mariage en République de Côte d'Ivoire. L'authenticité de ce document est vérifiable par signature cryptographique de la mairie émettrice en scannant le QR code.
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="no-print flex gap-3 justify-end mt-6 font-sans text-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded-lg text-slate-700 font-bold cursor-pointer transition-colors"
            >
              Fermer
            </button>
            <button
              type="button"
              disabled={loading || !paymentInfo}
              onClick={handlePrint}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4 text-amber-500" />
              Imprimer la Quittance
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
