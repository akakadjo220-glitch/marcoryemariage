import React, { useState, useMemo } from 'react';
import { Lock, Unlock, AlertTriangle, X, Landmark, Award, Shield, Key } from 'lucide-react';
import { MairieInfo } from '../services/dbService';

interface LoginModalProps {
  role: 'mairie' | 'superadmin' | 'maire';
  mairies: MairieInfo[];
  onSuccess: (mairieId?: string) => void;
  onCancel: () => void;
}

export default function LoginModal({ role, mairies, onSuccess, onCancel }: LoginModalProps) {
  // Generate the list of mairies/salles to display in the dropdown (aligned with AdminDashboard)
  const dropdownMairies = useMemo(() => {
    const list: { id: string; name: string; access_code: string }[] = [];
    const hasCentralRooms = mairies.some(
      (m) => (m.id === 'cocody_salle_prestige' || m.id === 'cocody_salle_union') && m.is_active
    );

    if (hasCentralRooms) {
      list.push({
        id: 'cocody_hotel_de_ville',
        name: "Hôtel de Ville — Salle des Mariages",
        access_code: 'COCODY2026' // Central access code
      });
    }

    mairies
      .filter((m) => m.is_active && m.id !== 'cocody_salle_prestige' && m.id !== 'cocody_salle_union')
      .forEach((m) => {
        list.push({
          id: m.id,
          name: m.name,
          access_code: m.access_code || 'COCODY2026'
        });
      });

    return list;
  }, [mairies]);

  const [selectedMairieId, setSelectedMairieId] = useState<string>(() => {
    return dropdownMairies.length > 0 ? dropdownMairies[0].id : 'cocody_hotel_de_ville';
  });
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Dynamic header styling based on role
  const roleConfig = useMemo(() => {
    switch (role) {
      case 'mairie':
        return {
          title: "Portail Officier d'État Civil",
          subtitle: "Veuillez sélectionner votre commune de rattachement",
          bgIcon: "bg-rose-50 text-primary border border-rose-100",
          icon: <Landmark className="w-8 h-8" />,
          placeholder: "Code d'accès municipal (ex: COCODY2026)"
        };
      case 'maire':
        return {
          title: "Cabinet de Monsieur le Maire",
          subtitle: "Accès réservé à l'autorité municipale exécutive",
          bgIcon: "bg-amber-50 text-amber-600 border border-amber-250",
          icon: <Award className="w-8 h-8" />,
          placeholder: "Code d'accès exécutif"
        };
      case 'superadmin':
        return {
          title: "Direction de l'État Civil National",
          subtitle: "Espace d'administration globale du système",
          bgIcon: "bg-purple-50 text-purple-600 border border-purple-100",
          icon: <Shield className="w-8 h-8" />,
          placeholder: "Code de sécurité super-administrateur"
        };
      default:
        return {
          title: "Accès Sécurisé",
          subtitle: "Veuillez saisir vos identifiants de sécurité",
          bgIcon: "bg-slate-50 text-slate-700 border border-slate-200",
          icon: <Lock className="w-8 h-8" />,
          placeholder: "Code d'accès"
        };
    }
  }, [role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = accessCode.trim();

    if (role === 'mairie') {
      const activeMairie = dropdownMairies.find((m) => m.id === selectedMairieId);
      const expectedCode = activeMairie ? activeMairie.access_code : 'COCODY2026';
      
      if (code === expectedCode) {
        onSuccess(selectedMairieId);
      } else {
        setError("Code d'accès municipal incorrect. Veuillez réessayer.");
      }
    } else if (role === 'maire') {
      if (code === 'MAIRE2026') {
        onSuccess();
      } else {
        setError("Code d'accès du Cabinet du Maire incorrect. Veuillez réessayer.");
      }
    } else if (role === 'superadmin') {
      if (code === 'ADMIN2026') {
        onSuccess();
      } else {
        setError("Code de sécurité super-administrateur incorrect.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-premium w-full max-w-md rounded-2xl border border-outline-variant/35 p-6 md:p-8 flex flex-col gap-6 text-left shadow-2xl relative overflow-hidden animate-slide-in">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-750 transition-colors p-1.5 hover:bg-slate-100 rounded-full cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Icon & Role Header */}
        <div className="flex flex-col items-center gap-4 text-center mt-2 select-none">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-md ${roleConfig.bgIcon}`}>
            {roleConfig.icon}
          </div>
          <div>
            <h3 className="font-serif text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              {roleConfig.title}
            </h3>
            <p className="font-sans text-xs text-secondary/80 mt-1 max-w-[280px] mx-auto leading-relaxed">
              {roleConfig.subtitle}
            </p>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-sans text-xs mt-1">
          {/* Mairie Dropdown selector (only for Mairie role) */}
          {role === 'mairie' && dropdownMairies.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-700">Sélectionner votre mairie :</label>
              <select
                value={selectedMairieId}
                onChange={(e) => {
                  setSelectedMairieId(e.target.value);
                  setError(null);
                }}
                className="w-full border border-neutral-300 rounded-xl px-4 py-3 bg-white font-medium focus:border-primary focus:outline-none cursor-pointer text-xs transition-all shadow-sm"
              >
                {dropdownMairies.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Access Code Input */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-slate-700">Code d'accès secret :</label>
            <div className="relative flex items-center">
              <Key className="w-4 h-4 text-slate-400 absolute left-4" />
              <input
                type="password"
                required
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value);
                  setError(null);
                }}
                placeholder={roleConfig.placeholder}
                className="w-full border border-neutral-300 rounded-xl pl-11 pr-4 py-3 bg-white focus:border-primary focus:outline-none text-xs transition-all font-mono shadow-sm"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-normal text-[11px]">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-2">
            <button
              type="submit"
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-container shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer transition-all text-xs flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>S'authentifier</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl cursor-pointer transition-all text-xs text-center"
            >
              Annuler
            </button>
          </div>
        </form>

        {/* Security Warning footnote */}
        <div className="text-[10px] text-slate-400 text-center select-none pt-2 border-t border-neutral-100">
          Système national sécurisé • Session fermée à la déconnexion
        </div>
      </div>
    </div>
  );
}
