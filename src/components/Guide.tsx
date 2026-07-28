import React, { useState } from 'react';
import {
  UserPlus, FileText, CalendarDays, CreditCard, Building, CheckCircle2,
  Heart, ChevronDown, ChevronUp, AlertCircle, Info, BookOpen, Landmark
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: 1,
    title: 'Créez votre dossier',
    icon: UserPlus,
    color: 'bg-rose-500',
    light: 'bg-rose-50 border-rose-200',
    text: 'text-rose-600',
    desc:
      'Renseignez vos informations et celles de votre futur(e) époux(se) : nom, date de naissance, numéro de pièce d\'identité. L\'anti-doublon vérifie instantanément si un dossier actif existe déjà.',
  },
  {
    num: 2,
    title: 'Déposez vos documents',
    icon: FileText,
    color: 'bg-amber-500',
    light: 'bg-amber-50 border-amber-200',
    text: 'text-amber-600',
    desc:
      'Photographiez votre pièce d\'identité, prenez un selfie, et ajoutez votre extrait de naissance. La vérification IA est automatique en quelques secondes (reconnaissance faciale, OCR, authenticité).',
  },
  {
    num: 3,
    title: 'Choisissez votre date',
    icon: CalendarDays,
    color: 'bg-emerald-500',
    light: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-600',
    desc:
      'Sélectionnez le jour et l\'heure de votre mariage parmi les créneaux disponibles. Les célébrations ont lieu du mercredi au samedi. Chaque salle est décalée de 15 minutes pour éviter les attentes.',
  },
  {
    num: 4,
    title: 'Payez 2 500 FCFA',
    icon: CreditCard,
    color: 'bg-blue-500',
    light: 'bg-blue-50 border-blue-200',
    text: 'text-blue-600',
    desc:
      'Ce paiement confirme votre réservation et vous donne un reçu numérique avec QR Code. Payable par Wave, Orange Money, MTN, Moov ou carte bancaire. La date et la salle sont alors verrouillées provisoirement.',
  },
  {
    num: 5,
    title: 'Rendez-vous à la mairie',
    icon: Building,
    color: 'bg-indigo-500',
    light: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-600',
    desc:
      'Vous recevez automatiquement une date de rendez-vous (J-15 avant le mariage). Présentez-vous avec vos documents originaux et votre reçu QR Code. Une reprogrammation est possible (limitée à 3 fois).',
  },
  {
    num: 6,
    title: 'Réglez les droits de mariage',
    icon: Landmark,
    color: 'bg-purple-500',
    light: 'bg-purple-50 border-purple-200',
    text: 'text-purple-600',
    desc:
      'Sur place, l\'agent scanne votre QR Code, contrôle vos documents originaux puis vous oriente vers la caisse pour régler les droits de mariage (100 000 FCFA). Les bans sont publiés 10 jours avant la cérémonie.',
  },
  {
    num: 7,
    title: 'Votre mariage est confirmé',
    icon: Heart,
    color: 'bg-rose-500',
    light: 'bg-rose-50 border-rose-200',
    text: 'text-rose-600',
    desc:
      'Après vérification et publication des bans sans opposition, votre date est définitivement validée. Félicitations ! Vous recevrez une notification de confirmation par WhatsApp.',
  },
];

const DOCS_COMMUNS = [
  { icon: '📜', label: "Extrait de naissance", detail: "Un extrait d'acte de naissance ou un jugement supplétif datant de moins de trois mois à la date du mariage (Article 2 et Article 15)." },
  { icon: '🏠', label: "Certificat de résidence", detail: "Datant de moins de deux mois pour chacun des futurs époux avec la mention en vue de mariage, l'un des futurs époux doit résider dans la Commune de Cocody (Article 20)." },
  { icon: '🪪', label: "Pièce d'identité", detail: "La photocopie lisible recto verso sur la même page de la pièce d'identité (CNI ou attestation d'identité) (CNI, passeport ou permis de conduire)." },
  { icon: '📷', label: "Photo d'identité couleur", detail: "Une photo d'identité couleur pour chacun des futurs époux." },
];

const DOCS_TEMOINS = [
  { icon: '👥', label: "Témoins (2 majeurs)", detail: "Photocopie lisible de la pièce d'identité (CNI, passeport ou permis) des témoins majeurs, avec adresse, téléphone et profession." },
];

const CAS_PARTICULIERS = [
  { emoji: '🖤', cas: "Veuf / Veuve", docs: "Extrait de l'acte de décès du conjoint décédé ou un jugement supplétif du décès." },
  { emoji: '⚖️', cas: "Divorcé(e) / Annulé", docs: "Extrait portant mention du divorce avec attestation de non-opposition et non-appel (Article 3), plus décision abrogeant le délai de viduité pour la femme." },
  { emoji: '🎖️', cas: "Militaire", docs: "Certificat de présence au corps en lieu et place du certificat de résidence (moins de 6 mois) + Autorisation du chef hiérarchique (moins de 6 mois)." },
  { emoji: '🌍', cas: "Étranger(ère)", docs: "Extrait certifié conforme (traduit par consulat/cabinet agréé) + Certificat de capacité matrimoniale + Carte de séjour/visa + Justificatif de résidence (moins de 2 mois) + Carte consulaire/passeport." },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Guide({ onStartDossier }: { onStartDossier?: () => void }) {
  const [openDoc, setOpenDoc] = useState<'commun' | 'cas' | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30 font-sans">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-rose-700 text-white py-16 px-4 text-center">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-sm">
            <BookOpen className="w-3.5 h-3.5" />
            Guide officiel — Mairie de Marcory
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight mb-4">
            Comment réserver votre<br />
            <span className="text-accent italic">date de mariage civil</span>
          </h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-lg mx-auto">
            Un processus simple, entièrement en ligne, en 7 étapes. Accessible depuis votre téléphone,
            sans vous déplacer jusqu'au jour du rendez-vous.
          </p>
          {onStartDossier && (
            <button
              onClick={onStartDossier}
              className="mt-8 inline-flex items-center gap-2 bg-accent text-white px-8 py-3.5 rounded-2xl font-bold text-sm shadow-xl hover:bg-accent/90 transition-all hover:-translate-y-0.5"
            >
              <UserPlus className="w-4 h-4" />
              Commencer mon dossier
            </button>
          )}
        </div>
      </div>

      {/* ── Timeline Steps ── */}
      <div className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="font-serif text-2xl font-bold text-slate-800 text-center mb-10">
          Les 7 étapes du processus
        </h2>

        <div className="relative">
          {/* Vertical connector */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-rose-300 via-indigo-300 to-rose-300 hidden sm:block" />

          <div className="flex flex-col gap-6">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="relative flex gap-5 items-start">
                  {/* Number bubble */}
                  <div className={`relative z-10 w-12 h-12 ${step.color} text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content card */}
                  <div className={`flex-1 rounded-2xl border p-5 ${step.light} shadow-sm`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest ${step.text}`}>
                        Étape {step.num}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-slate-800 text-base mb-1.5">{step.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>

                    {/* Special badge for step 4 */}
                    {step.num === 4 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {['Wave', 'Orange Money', 'MTN', 'Moov', 'Carte bancaire'].map(m => (
                          <span key={m} className="text-[10px] bg-white border border-blue-200 text-blue-700 font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {m}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Days highlight for step 3 */}
                    {step.num === 3 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {['Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(d => (
                          <span key={d} className="text-[10px] bg-white border border-emerald-200 text-emerald-700 font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {d}
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
      </div>

      {/* ── Documents à fournir ── */}
      <div className="bg-white border-y border-neutral-100 py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-2xl font-bold text-slate-800 text-center mb-2">
            Documents à fournir
          </h2>
          <p className="text-center text-xs text-slate-500 mb-10">
            Pour chaque futur époux — à préparer avant de commencer votre dossier
          </p>

          {/* Common docs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {[...DOCS_COMMUNS, ...DOCS_TEMOINS].map((d, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4">
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
            onClick={() => setOpenDoc(openDoc === 'cas' ? null : 'cas')}
            className="w-full flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-left hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-bold text-sm text-slate-800">Cas particuliers (veuf, divorcé, militaire, étranger)</span>
            </div>
            {openDoc === 'cas' ? <ChevronUp className="w-4 h-4 text-amber-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-amber-600 shrink-0" />}
          </button>

          {openDoc === 'cas' && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
              {CAS_PARTICULIERS.map((c, i) => (
                <div key={i} className="flex items-start gap-3 bg-white border border-amber-100 rounded-xl p-4 shadow-sm">
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
      <div className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="font-serif text-2xl font-bold text-slate-800 text-center mb-10">
          Récapitulatif des frais
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-6 flex flex-col gap-3">
            <CreditCard className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Étape 4 — En ligne</p>
              <p className="font-serif text-3xl font-bold text-slate-800 mt-1">2 500 <span className="text-base font-normal text-slate-500">FCFA</span></p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Frais de réservation / confirmation du créneau. Non remboursables en cas d'absence injustifiée.
              </p>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {['Wave', 'Orange Money', 'MTN', 'Moov', 'Carte'].map(m => (
                <span key={m} className="text-[9px] bg-white border border-blue-200 text-blue-600 font-bold px-2 py-0.5 rounded-full">
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-rose-50 border border-purple-100 rounded-3xl p-6 flex flex-col gap-3">
            <Landmark className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Étape 6 — Sur place</p>
              <p className="font-serif text-3xl font-bold text-slate-800 mt-1">100 000 <span className="text-base font-normal text-slate-500">FCFA</span></p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Droits de mariage municipal. Réglés à la caisse de la mairie de Marcory le jour du rendez-vous physique.
              </p>
            </div>
            <span className="text-[10px] bg-white border border-purple-200 text-purple-600 font-bold px-3 py-1 rounded-full w-fit">
              Espèces / Chèque
            </span>
          </div>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div className="max-w-3xl mx-auto px-4 pb-14">
        <div className="flex gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-left">
          <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-indigo-800 mb-1">Besoin d'aide ?</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Le service d'assistance de la Mairie de Marcory est disponible du lundi au vendredi de 8h à 17h.
              Vous pouvez également vous présenter directement au guichet numérique de l'État Civil.
            </p>
          </div>
        </div>
      </div>

      {/* ── CTA bottom ── */}
      {onStartDossier && (
        <div className="sticky bottom-0 z-10 bg-white/90 border-t border-neutral-100 backdrop-blur-md py-4 px-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-sm text-slate-800">Prêt(e) à vous lancer ?</p>
              <p className="text-xs text-slate-500">Dossier 100% en ligne · Célébration du mer. au sam.</p>
            </div>
            <button
              onClick={onStartDossier}
              className="shrink-0 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5" />
              Commencer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
