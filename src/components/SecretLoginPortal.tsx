import React, { useState } from 'react';
import { Lock, Unlock, Mail, Key, Eye, EyeOff, Shield, Award, Landmark, ArrowLeft, Loader2, AlertCircle, Activity } from 'lucide-react';
import { authenticateStaff } from '../services/dbService';

interface SecretLoginPortalProps {
  path: string;
  onLoginSuccess: (role: 'citoyen' | 'mairie' | 'superadmin' | 'maire', mairieAgentRole?: 'agent' | 'supervisor', mairieId?: string) => void;
  onGoBack: () => void;
}

export default function SecretLoginPortal({ path, onLoginSuccess, onGoBack }: SecretLoginPortalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPortalInfo = () => {
    switch (path) {
      case '/portail-agent-civ-98':
        return {
          title: "Portail Officier d'État Civil",
          subtitle: "Commune de Marcory — Session Agent",
          description: "Accès réservé aux agents instructeurs d'état civil de Marcory pour l'audit et la validation des pièces.",
          icon: <Landmark className="w-10 h-10 text-rose-500" />,
          isStaff: true,
          staffRole: 'agent' as const
        };
      case '/portail-superviseur-civ-87':
        return {
          title: "Supervision de l'État Civil",
          subtitle: "Commune de Marcory — Cabinet Superviseur",
          description: "Accès réservé au superviseur pour le pilotage, l'audit des logs et la gestion des comptes agents.",
          icon: <Activity className="w-10 h-10 text-amber-500" />,
          isStaff: true,
          staffRole: 'supervisor' as const
        };
      case '/portail-maire-civ-76':
        return {
          title: "Cabinet de Monsieur le Maire",
          subtitle: "Commune de Marcory — Autorité Exécutive",
          description: "Accès hautement sécurisé pour la gestion de l'agenda des mariages, des quotas et de l'analyse financière.",
          icon: <Award className="w-10 h-10 text-amber-600" />,
          isStaff: false,
          placeholder: "Code d'accès exécutif"
        };
      case '/portail-admin-civ-65':
        return {
          title: "Administration Nationale",
          subtitle: "E-Mariage Côte d'Ivoire — Direction Technique",
          description: "Accès super-administrateur global pour le raccordement des mairies, les clés IA et la maintenance.",
          icon: <Shield className="w-10 h-10 text-purple-500" />,
          isStaff: false,
          placeholder: "Code de sécurité administrateur"
        };
      default:
        return null;
    }
  };

  const portal = getPortalInfo();

  if (!portal) {
    return (
      <div className="min-h-screen bg-[#fbf9f4] text-slate-800 flex flex-col items-center justify-center p-4">
        <div className="text-center flex flex-col gap-4 max-w-sm">
          <AlertCircle className="w-16 h-16 text-rose-600 mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-slate-800">Portail Introuvable</h2>
          <p className="text-slate-500 text-xs">L'adresse demandée n'existe pas ou a expiré.</p>
          <button onClick={onGoBack} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-350 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mx-auto text-slate-700 cursor-pointer shadow-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (portal.isStaff && portal.staffRole) {
        if (!email.trim() || !password.trim()) {
          setError("Veuillez remplir tous les champs.");
          setIsLoading(false);
          return;
        }
        const agent = await authenticateStaff(email.trim().toLowerCase(), password, portal.staffRole);
        if (agent) {
          onLoginSuccess('mairie', portal.staffRole, agent.mairie_id);
        } else {
          setError("Identifiants incorrects ou compte inactif. Veuillez réessayer.");
        }
      } else {
        const code = accessCode.trim();
        if (!code) {
          setError("Veuillez saisir votre code d'accès.");
          setIsLoading(false);
          return;
        }
        if (path === '/portail-maire-civ-76') {
          if (code === 'MAIRE2026') {
            onLoginSuccess('maire');
          } else {
            setError("Code d'accès incorrect.");
          }
        } else if (path === '/portail-admin-civ-65') {
          if (code === 'ADMIN2026') {
            onLoginSuccess('superadmin');
          } else {
            setError("Code de sécurité super-administrateur incorrect.");
          }
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Une erreur technique est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fbf9f4] via-[#f7f3eb] to-[#e8e0d0] text-slate-800 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/5 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md bg-white/85 backdrop-blur-md border border-[#c5a368]/25 rounded-3xl p-8 shadow-2xl relative flex flex-col gap-6 animate-fade-in text-left">
        {/* Header Back Button */}
        <button
          onClick={onGoBack}
          className="absolute top-6 left-6 text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>

        {/* Portal Icon & Headings */}
        <div className="flex flex-col items-center gap-4 text-center mt-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-md">
            {portal.icon}
          </div>
          <div>
            <h2 className="font-serif text-xl md:text-2xl font-bold tracking-tight text-slate-850">
              {portal.title}
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#d42a6a] mt-1.5 block">
              {portal.subtitle}
            </span>
            <p className="text-[11px] text-slate-500 mt-2 max-w-[280px] mx-auto leading-relaxed">
              {portal.description}
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-sans text-xs mt-2 text-left">
          {portal.isStaff ? (
            <>
              {/* Email Input */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Adresse E-mail Professionnelle</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="agent.nom@mairie.ci"
                    className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 bg-white focus:border-[#d42a6a] focus:outline-none text-xs text-slate-800 transition-all shadow-sm placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Mot de passe</label>
                <div className="relative flex items-center">
                  <Key className="w-4 h-4 text-slate-400 absolute left-4" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full border border-slate-200 rounded-xl pl-11 pr-12 py-3.5 bg-white focus:border-[#d42a6a] focus:outline-none text-xs text-slate-800 transition-all shadow-sm font-mono placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Access Code Input for Mayor / Super Admin */
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-700">Code d'accès sécurisé</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4" />
                <input
                  type="password"
                  required
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    setError(null);
                  }}
                  placeholder={portal.placeholder}
                  className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 bg-white focus:border-[#d42a6a] focus:outline-none text-xs text-slate-800 transition-all shadow-sm font-mono placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-250 rounded-xl flex items-start gap-2.5 text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-normal text-[11px]">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-[#b20052] text-white font-bold rounded-xl hover:opacity-95 shadow-lg shadow-primary/10 hover:shadow-primary/20 cursor-pointer transition-all text-xs flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authentification...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Se connecter</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-[10px] text-slate-400 text-center select-none pt-4 border-t border-slate-100 mt-2">
          Système Sécurisé d'État Civil • Côte d'Ivoire
        </div>
      </div>
    </div>
  );
}
