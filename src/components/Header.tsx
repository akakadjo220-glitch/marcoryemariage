import React from 'react';
import { Bell, User, Heart, Shield, Landmark, Award } from 'lucide-react';
import { AVATAR_URL } from '../data';

interface HeaderProps {
  currentTab: string;
  setTab: (tab: string) => void;
  openNotifications: () => void;
  unreadNotificationsCount: number;
  currentRole: 'citoyen' | 'mairie' | 'superadmin' | 'maire';
  setRole: (role: 'citoyen' | 'mairie' | 'superadmin' | 'maire') => void;
  spouse1Name: string;
  spouse2Name: string;
  dossierId: string;
}

export default function Header({ 
  currentTab, 
  setTab, 
  openNotifications, 
  unreadNotificationsCount,
  currentRole,
  setRole,
  spouse1Name,
  spouse2Name,
  dossierId
}: HeaderProps) {
  
  const isNamesEmpty = !spouse1Name?.trim() || !spouse2Name?.trim();

  const navItems = [
    { id: 'accueil', label: 'Accueil' },
    { id: 'guide', label: 'Guide du Citoyen' },
    { id: 'bans', label: 'Bans Publics' },
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'partners', label: 'Prestataires d\'exception' },
    { id: 'dossier', label: 'Documents / Dossier' }
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 glass-premium border-b border-accent/20 shadow-sm flex items-center justify-between px-4 sm:px-8 md:px-12 h-18 md:h-22 transition-all duration-300">
      {/* Profil / User section + Brand Title (grouped left) */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-accent/35 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-transform duration-300 hover:scale-105">
          {currentRole === 'citoyen' ? (
            <div className="w-full h-full bg-neutral-50 text-slate-650 flex items-center justify-center">
              <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            </div>
          ) : currentRole === 'mairie' ? (
            <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center">
              <Landmark className="w-4 h-4 md:w-5 md:h-5 text-accent" />
            </div>
          ) : currentRole === 'maire' ? (
            <div className="w-full h-full bg-slate-900 text-amber-500 flex items-center justify-center">
              <Award className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
            </div>
          ) : (
            <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center">
              <Shield className="w-4 h-4 md:w-5 md:h-5 text-accent" />
            </div>
          )}
        </div>

        {/* Brand Logo — juste après l'icône user */}
        <div 
          onClick={() => setTab('accueil')}
          className="flex items-center cursor-pointer group"
        >
          <img src="/logo.png" alt="Logo Mairie de Marcory" className="h-14 md:h-18 object-contain group-hover:scale-105 transition-transform duration-300" />
        </div>

        <div className="hidden md:flex flex-col text-left ml-2 border-l border-neutral-200 pl-3">
          {currentRole === 'citoyen' ? (
            (spouse1Name.trim() && spouse2Name.trim()) ? (
              <>
                <span className="font-sans text-[8.5px] font-bold text-accent uppercase tracking-widest leading-none">
                  Dossier N° {dossierId.toUpperCase().replace('DOSSIER_', '')}
                </span>
                <span className="font-serif text-xs text-slate-800 font-semibold mt-0.5">{spouse1Name} &amp; {spouse2Name}</span>
              </>
            ) : (
              <>
                <span className="font-sans text-[8.5px] font-bold text-slate-400 uppercase tracking-widest leading-none">Nouvelle Union</span>
                <span className="font-serif text-[11px] text-slate-500 italic mt-0.5">Dossier en création</span>
              </>
            )
          ) : currentRole === 'mairie' ? (
            <>
              <span className="font-sans text-[8.5px] font-bold text-primary uppercase tracking-widest leading-none">Agent Municipal</span>
              <span className="font-serif text-xs text-slate-800 font-semibold mt-0.5">Service État Civil</span>
            </>
          ) : currentRole === 'maire' ? (
            <>
              <span className="font-sans text-[8.5px] font-bold text-amber-600 uppercase tracking-widest leading-none">Le Maire</span>
              <span className="font-serif text-xs text-slate-800 font-semibold mt-0.5">M. Jean-Marc Koffi</span>
            </>
          ) : (
            <>
              <span className="font-sans text-[8.5px] font-bold text-slate-800 uppercase tracking-widest leading-none">Direction Nationale</span>
              <span className="font-serif text-xs text-slate-800 font-semibold mt-0.5">Super Administrateur</span>
            </>
          )}
        </div>
      </div>

      {/* Center Nav for Desktop (Only shown for citizen) */}
      <nav className="hidden xl:flex items-center gap-8">
        {currentRole === 'citoyen' ? (
          navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`font-sans text-xs uppercase tracking-wider font-semibold transition-all duration-300 relative py-1.5 hover:text-primary ${
                  isActive ? 'text-primary' : 'text-slate-500'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-accent rounded-full transition-all" />
                )}
              </button>
            );
          })
        ) : (
          <div className="font-serif text-xs italic font-semibold text-slate-650 tracking-wide">
            Espace d'administration et de pilotage civil
          </div>
        )}
      </nav>

      {/* Right Controls: Role Switcher & Notification Bell */}
      <div className="flex items-center gap-2 md:gap-3.5">
        {/* Déconnexion button for administrative roles */}
        {currentRole !== 'citoyen' && (
          <button
            onClick={() => setRole('citoyen')}
            className="border border-rose-200 text-rose-600 rounded-xl px-2.5 py-1 md:px-4 md:py-1.5 text-[11px] md:text-xs font-bold bg-rose-50/50 hover:bg-rose-50 cursor-pointer shadow-sm hover:shadow transition-all"
          >
            Déconnexion
          </button>
        )}

        {/* Notification Bell (Only shown for citizen) */}
        {currentRole === 'citoyen' && (
          <button 
            onClick={openNotifications}
            className="relative w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full text-slate-500 hover:bg-primary/5 hover:text-primary transition-all duration-250 cursor-pointer border border-neutral-200"
            title="Centre d'alertes"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-ping" />
            )}
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}
