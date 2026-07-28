import React, { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FooterProps {
  setTab: (tab: string) => void;
}

export default function Footer({ setTab }: FooterProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Quels sont les justificatifs obligatoires ?",
      a: "Chaque futur époux doit fournir une pièce d'identité officielle valide (CNI ou Passeport), un extrait d'acte de naissance de moins de 3 mois (ou moins de 6 mois si délivré à l'étranger), et un justificatif de domicile de moins de 3 mois attestant d'une résidence d'au moins un mois."
    },
    {
      q: "Quel est le délai d'instruction du dossier ?",
      a: "Une fois votre dossier civil d'E-Mariage soumis en ligne, le service d'état civil instruit et valide vos documents justificatifs dans un délai de 5 à 10 jours ouvrés. L'audition préalable de mariage valide ensuite définitivement le dossier."
    },
    {
      q: "Combien de témoins pouvons-nous choisir ?",
      a: "La loi ivoirienne exige au moins 2 témoins majeurs au total (un témoin pour chaque conjoint) pour la célébration civile. Leurs pièces d'identité ainsi que leurs renseignements doivent être fournis au moins 10 jours avant la date de la célébration."
    },
    {
      q: "Le contrat de mariage est-il obligatoire ?",
      a: "Non. Lors de la constitution du dossier, vous devez choisir d'un commun accord votre régime matrimonial : soit la 'communauté de biens', soit la 'séparation de biens'. Si vous signez un contrat de mariage devant notaire, transmettez le certificat notarié au moins 10 jours avant le mariage."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <footer className="w-full bg-[#fcfbfa] border-t border-accent/20 py-12 px-6 md:px-12 flex flex-col gap-10 pb-28 md:pb-12 text-left mt-16 transition-all duration-300">
      
      {/* Interactive FAQ Block inside footer */}
      <section className="w-full max-w-4xl mx-auto border-b border-accent/25 pb-10">
        <div className="flex items-center gap-2.5 mb-6 select-none">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/15 text-primary">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg font-bold text-slate-900">
            Foire Aux Questions Légales
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index} 
                className="glass-premium rounded-2xl overflow-hidden transition-all duration-300 border border-accent/20 shadow-sm"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 flex items-center justify-between text-left font-sans text-xs font-bold text-slate-800 hover:text-primary transition-colors gap-3 select-none cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                </button>
                
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="px-4 pb-4 font-sans text-xs text-slate-500 leading-relaxed border-t border-neutral-100 pt-3 font-medium">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
 
      {/* Main Bottom Line links & brands info */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-3">
          <img src="/logo.png" alt="Logo Mairie de Marcory" className="h-24 md:h-32 object-contain" />
          <div className="text-center md:text-left">
            <div className="font-serif text-lg font-bold text-slate-800 leading-tight">
              Mairie de Marcory
            </div>
            <p className="font-sans text-[10px] text-slate-450 font-semibold uppercase tracking-wider mt-1">
              République de Côte d'Ivoire • Portail Officiel
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <button 
            onClick={() => setTab('accueil')}
            className="font-sans text-xs font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer"
          >
            Accueil
          </button>
          <button 
            onClick={() => setTab('guide')}
            className="font-sans text-xs font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer"
          >
            Guide du Citoyen
          </button>
          <button 
            onClick={() => setTab('partners')}
            className="font-sans text-xs font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer"
          >
            Prestataires
          </button>

          <a 
            href="#"
            className="font-sans text-xs font-bold text-slate-500 hover:text-primary transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            Contact
          </a>
          <a 
            href="#"
            className="font-sans text-xs font-bold text-slate-500 hover:text-primary transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            Mentions Légales
          </a>
          <a 
            href="#"
            className="font-sans text-xs font-bold text-slate-500 hover:text-primary transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            Confidentialité
          </a>
        </div>

        <div className="font-sans text-[11px] text-slate-400 font-semibold select-none">
          &copy; {new Date().getFullYear()} E-Mariage. Ministère de l'Administration du Territoire.
        </div>
      </div>
    </footer>
  );
}
