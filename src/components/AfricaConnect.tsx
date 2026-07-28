import React, { useState } from 'react';
import { 
  Sparkles, Award, Globe, Volume2, Smartphone, Check, HelpCircle, 
  ChevronRight, RefreshCw, AlertCircle, FileCheck, CheckCircle2, Languages, Landmark,
  Camera, AlertTriangle, FileText, CheckSquare, MapPin, Search, Navigation, Building2, Phone, Compass, ArrowRight, Map as MapIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';

export interface Partner {
  id: string;
  name: string;
  type: 'mairie' | 'cultural';
  lat: number;
  lng: number;
  city: string;
  region: string;
  phone: string;
  description: string;
  cultureTip: string;
  image: string;
  distance: string;
  time: string;
}

const IVORIAN_PARTNERS: Partner[] = [
  {
    id: 'cocody',
    name: 'Mairie de Marcory',
    type: 'mairie',
    lat: 5.3484,
    lng: -3.9834,
    city: 'Abidjan',
    region: 'Lagunes',
    phone: '+225 27 22 44 88 00',
    description: 'Pionnière de la célébration civile moderne en Côte d\'Ivoire avec intégration numérique des dossiers et de la dot traditionnelle Akan.',
    cultureTip: 'S\'allie particulièrement avec le style d\'apparat Akan Baoulé. Dispose d\'un grand salon des délégations coutumières.',
    image: 'https://images.unsplash.com/photo-1596541223130-5d31a73fb6c6?auto=format&fit=crop&q=80&w=600',
    distance: '0 km (Abidjan Hub)',
    time: '0 min'
  },
  {
    id: 'plateau',
    name: 'Mairie du Plateau',
    type: 'mairie',
    lat: 5.3241,
    lng: -4.0192,
    city: 'La Cité, Abidjan',
    region: 'Lagunes',
    phone: '+225 27 20 22 11 22',
    description: 'Centre administratif de prestige. Excellente gestion des candidatures au mariage binationaux ou à option de séparation.',
    cultureTip: 'À proximité directe du Musée des Civilisations d\'Abidjan, parfait pour l\'exposition solennelle des parures d\'honneur.',
    image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=600',
    distance: '4.5 km',
    time: '12 min'
  },
  {
    id: 'yamoussoukro',
    name: 'Mairie de Yamoussoukro',
    type: 'mairie',
    lat: 6.8206,
    lng: -5.2753,
    city: 'Yamoussoukro',
    region: 'Bélier',
    phone: '+225 27 30 64 00 12',
    description: 'La mairie de la capitale politique, spécialisée dans l\'enregistrement des unions de la grande cour Baoulé.',
    cultureTip: 'Idéal pour l\'alliance coutumière baoulé sous la bénédiction solennelle des grands chefs royaux.',
    image: 'https://images.unsplash.com/photo-1547483238-f400e65ccd56?auto=format&fit=crop&q=80&w=600',
    distance: '240 km',
    time: '2h 45 min'
  },
  {
    id: 'bouake',
    name: 'Mairie de Bouaké',
    type: 'mairie',
    lat: 7.6931,
    lng: -5.0311,
    city: 'Bouaké',
    region: 'Gbêkê',
    phone: '+225 27 31 63 45 45',
    description: 'Haut lieu culturel du centre du pays, célébrant la pluralité nationale et la facilitation du dossier d\'union civile.',
    cultureTip: 'Dispose d\'une convention spéciale avec le village de tissage d\'apparat Kita de N\'Gattakro.',
    image: 'https://images.unsplash.com/photo-1563911302283-d2bc1dd0fd4f?auto=format&fit=crop&q=80&w=600',
    distance: '348 km',
    time: '4h 10 min'
  },
  {
    id: 'korhogo',
    name: 'Mairie de Korhogo',
    type: 'mairie',
    lat: 9.4580,
    lng: -5.6295,
    city: 'Korhogo',
    region: 'Poro (Nord)',
    phone: '+225 27 36 86 11 00',
    description: 'Mairie historique du Poro. Veillée au respect rigoureux de la charte matrimoniale Sénoufo.',
    cultureTip: 'Favorise les raccordements civils harmonisés avec le Tchapalo rituel et les offrandes d\'arachides du village à la commune.',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=600',
    distance: '580 km',
    time: '6h 50 min'
  },
  {
    id: 'man',
    name: 'Mairie de Man',
    type: 'mairie',
    lat: 7.4125,
    lng: -7.5536,
    city: 'Man (18 Montagnes)',
    region: 'Tonkpi',
    phone: '+225 27 33 79 14 00',
    description: 'La mairie de la région de l\'ouest montagneux, experte en alliances coutumières Dan et Yacouba.',
    cultureTip: 'Bénéficie d\'un accompagnement du conseil des sages du Tonkpi pour sceller et attester le consentement parental.',
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&q=80&w=600',
    distance: '556 km',
    time: '7h 15 min'
  },
  {
    id: 'culture_anono',
    name: 'Centre Artisanal Ebrié d\'Anono',
    type: 'cultural',
    lat: 5.3411,
    lng: -3.9610,
    city: 'Marcory, Abidjan',
    region: 'Lagunes',
    phone: '+225 07 47 12 12 34',
    description: 'Conservatoire régional du rituel Atchan & Ebrié. Certifie la valeur des dotes coutumières.',
    cultureTip: 'Fournit les parures rituelles en perles, conseille sur les cadeaux d\'alcool de palme et de sel d\'alliance.',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600',
    distance: '3.2 km',
    time: '8 min'
  },
  {
    id: 'culture_senoufo',
    name: 'Maison de la Culture Sénoufo',
    type: 'cultural',
    lat: 9.4510,
    lng: -5.6310,
    city: 'Korhogo',
    region: 'Poro',
    phone: '+225 05 05 99 88 77',
    description: 'Haut-lieu de mémoire préservant les coutumes matrimoniales sacrées des savanes du Nord.',
    cultureTip: 'Dispose de guides certifiés pour orienter les fiancés s\'unissant selon le rite Sénoufo traditionnel.',
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=600',
    distance: '578 km',
    time: '6h 45 min'
  }
];

interface AfricaConnectProps {
  addNotification: (text: string, type: 'info' | 'warning' | 'success') => void;
}

export default function AfricaConnect({ addNotification }: AfricaConnectProps) {
  const [selectedEthnoGroup, setSelectedEthnoGroup] = useState<string>('akan');
  
  // States for Dowry simulator
  const [marriageRegime, setMarriageRegime] = useState<string>('monogamy');
  const [groomName, setGroomName] = useState<string>('Koffi Touré');
  const [brideName, setBrideName] = useState<string>('Awa Koné');
  const [generatedCarnet, setGeneratedCarnet] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // States for Vocal translation
  const [selectedLanguage, setSelectedLanguage] = useState<string>('dioula');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioTranscript, setAudioTranscript] = useState<string>('');

  // States for Document Inspector
  const [docType, setDocType] = useState<string>('cni');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanResult, setScanResult] = useState<{
    score: number;
    shadowDetected: boolean;
    shadowDetail: string;
    namesMatch: boolean;
    nameStatus: string;
    ocrCorrect: boolean;
    ocrSampleText: string;
    resolutionText: string;
    contrastText: string;
    status: 'success' | 'warning' | 'error';
    correctionAdvice: string;
  } | null>(null);

  // States for Interactive Partners Map in Côte d'Ivoire
  const [activePartnerId, setActivePartnerId] = useState<string>('cocody');
  const [mapFilter, setMapFilter] = useState<'all' | 'mairie' | 'cultural'>('all');
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
  const [infoWindowOpen, setInfoWindowOpen] = useState<boolean>(false);


  const ethnoGroups = [
    {
      id: 'akan',
      name: 'Akan (Baoulé, Agni, Abron, Lagunaires)',
      pagne: 'Kita / Kenté traditionnel d\'Apparat',
      items: [
        "Pagne Kita d'apparat tissé de fils d'or",
        "Bouteille de liqueur fine ou Gin de prestige (pour la libation)",
        "Somme d'argent d'alliance symbolique (Kpotô)",
        "Noix de cola blanches et rouges cérémonielles",
        "Paire d'alliances ou bijoux en or fin"
      ],
      customaryRule: "Présentation obligatoire de la dot aux oncles maternels. Les tantes de l'épouse reçoivent des présents d'honneur ('Blé douman') pour sceller l'alliance."
    },
    {
      id: 'krou',
      name: 'Krou (Bété, Dida, Guéré, Wobé)',
      pagne: 'Pagne Écorce de bois sacré (Gloko) ou Raphia royal',
      items: [
        "Pièces de tissu d'écorce traditionnel Gloko ou raphia",
        "Grand sac de sel marin d'honneur pour la belle-mère",
        "Dot monétaire coutumière réglementaire d'alliance",
        "Boisson traditionnelle de palme (Bangui ou spiritueux fin)",
        "Bicéphale de cola médicinale et piment de bienvenue"
      ],
      customaryRule: "La cérémonie solennelle du 'Lowa' réunit les patriarches paternels pour valider la prise en charge légitime de l'épouse par son conjoint."
    },
    {
      id: 'mande',
      name: 'Mandé (Dioula, Malinké, Yacouba, Dan)',
      pagne: 'Pagne Indigo traditionnel tissé main (Kamandjê)',
      items: [
        "Double pagne Indigo lourd tissé de Danané (Kamandjê)",
        "Grande calebasse ornée remplie de noix de cola fraîches",
        "Somme d'argent prescrite (Dot matrimoniale d'honneur)",
        "Sacs de riz blancs sélectionnés et bidons d'huile de palme",
        "Parfums d'agrément et encens d'Orient pur (Thiouraye)"
      ],
      customaryRule: "Lecture solennelle de la Fatiha par l'Imam (confession musulmane) ou accord coutumier 'Gbon' sous l'arbre à palabres en présence des chefs de canton."
    },
    {
      id: 'gour',
      name: 'Gour / Voltaïque (Sénoufo, Lobi, Koulango)',
      pagne: 'Pagne Korhogo peint aux motifs ancestraux',
      items: [
        "Pagne traditionnel de Korhogo tissé et peint à la main",
        "Calebasses géantes de boisson de mil sacrée (Tchapalo)",
        "Paniers d'arachides de terre fraîches et noix de cola",
        "Sac de sel de roche de première extraction",
        "Présents d'hommage en argenterie ou cuivre rustique"
      ],
      customaryRule: "Demande officielle de bénédiction aux ancêtres sous le hangar familial sacré ('Katchiolo') et offrande de cola pour la longévité du nouveau foyer."
    }
  ];

  const languages = [
    { id: 'dioula', name: 'Dioula (Côte d\'Ivoire)', hello: 'I ni Sogo !', info: 'Le mariage civil est une union solennelle d\'amour et de respect légal.', translation: 'Civil mariya n’a fanga ye kànou ni sèbéye siri ye tounoumba sariya kora.' },
    { id: 'baoule', name: 'Baoulé (Côte d\'Ivoire)', hello: 'Mo nié, kôkô !', info: 'Rappelez-vous de désigner vos témoins 10 jours francs avant la fête.', translation: 'A mloun kpa sran moun mma bè dja klowlé kô sran n’nan nnyan ya klé dja dyé blé.' },
    { id: 'bete', name: 'Bété (Côte d\'Ivoire)', hello: 'Yéaba o !', info: 'La validation du dossier civil garantit la clarté légale de votre foyer.', translation: 'Wa gbeleyi doudou dja gnagnon sika legre tchegbo gbelé dounien dognon-wa.' },
    { id: 'senoufo', name: 'Sénoufo (Côte d\'Ivoire)', hello: 'Folié !', info: 'Vos documents doivent être certifiés conformes sans reflets.', translation: 'Folié pyen seliye tènè na n’gari djakaridja tchan’go koumbo djila.' },
    { id: 'yacouba', name: 'Yacouba / Dan (Côte d\'Ivoire)', hello: 'An dja gnan !', info: 'La mairie de Côte d\'Ivoire est heureuse d\'accompagner votre foyer.', translation: 'Kô lë doun go dja mian mian gué mënian dji lë sôgô dji dja guon yi.' }
  ];

  const selectedEthno = ethnoGroups.find(e => e.id === selectedEthnoGroup) || ethnoGroups[0];
  const selectedLang = languages.find(l => l.id === selectedLanguage) || languages[0];

  const handleGenerateCarnet = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedCarnet(true);
      addNotification(`Livret de Dot Culturelle & Équivalence IA généré pour ${brideName} & ${groomName} !`, 'success');
    }, 2000);
  };

  const handlePlayVoice = () => {
    setIsPlayingAudio(true);
    setAudioTranscript("Lecture audio en cours...");
    
    // Simulate speech tone sound
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Play a lovely double notification chime
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.9);
      
      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 1.0);
      osc2.stop(audioCtx.currentTime + 1.0);
    } catch (e) {
      // Audio context block safely caught if forbidden by sandbox
    }

    setTimeout(() => {
      setIsPlayingAudio(false);
      setAudioTranscript(`Traduit par l'IA en ${selectedLang.name} : "${selectedLang.translation}"`);
    }, 2800);
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanResult(null);
    setScanProgress(5);
    setScanStep("1. Détection automatique des bordures tridimensionnelles de l'image...");

    // Stage 1
    setTimeout(() => {
      setScanProgress(35);
      setScanStep("2. Analyse chromatique de l'éclairage municipal (vérification d'ombres de bras/mains)...");

      // Stage 2
      setTimeout(() => {
        setScanProgress(65);
        setScanStep("3. Extraction OCR sélective des blocs nominatifs et date d'expiration...");

        // Stage 3
        setTimeout(() => {
          setScanProgress(90);
          setScanStep("4. Vérification de la stricte concordance croisée avec les aînés déclarés d'E-Mariage...");

          // Stage 4 Final Resolution
          setTimeout(() => {
            setIsScanning(false);
            setScanStep("");
            setScanProgress(100);

            if (docType === 'cni') {
              setScanResult({
                score: 96,
                shadowDetected: false,
                shadowDetail: "Aucune ombre de main perturbante détectée sur les filigranes législatifs.",
                namesMatch: true,
                nameStatus: `Exacte - Recoupement à 100% avec l'époux déclaré (${groomName})`,
                ocrCorrect: true,
                ocrSampleText: `REPUBLIQUE DE COTE D'IVOIRE\nCARTE NATIONALE D'IDENTITE N° CI-02931293\nNOM DE FAMILLE: ${groomName.toUpperCase().split(' ').slice(-1)[0] || 'TOURE'}\nPRENOMS: ${groomName.toUpperCase().split(' ').slice(0, -1).join(' ') || 'KOFFI'}\nSEXE: M\nNATIONALITE: IVOIRIENNE\nVALIDE JUSQU'AU: 14/11/2032`,
                resolutionText: "Excellente (320 DPI, capteur calibré)",
                contrastText: "Optimal (Source lumineuse uniforme sans contre-jour)",
                status: 'success',
                correctionAdvice: "Diagnostic : Parfait ! La pièce d'identité remplit tous les critères d'instruction d'office en Mairie de Marcory."
              });
              addNotification(`Analyse terminée pour ${groomName} : document parfait conforme !`, 'success');
            } else if (docType === 'birth') {
              setScanResult({
                score: 74,
                shadowDetected: true,
                shadowDetail: "Ombre d'appareil photo mobile et de doigt détectée en bordure gauche.",
                namesMatch: true,
                nameStatus: `Partielle - Les noms correspondent à l'épouse déclarée (${brideName})`,
                ocrCorrect: true,
                ocrSampleText: `EXTRAIT DE REGISTRE DES ACTES DE NAISSANCE\nANNEE: 1996\nREGISTRE N° 284/CBR\nNOM DETEC: ${brideName.toUpperCase().split(' ').slice(-1)[0] || 'KONE'}\nPRENOMS DETEC: ${brideName.toUpperCase().split(' ').slice(0, -1).join(' ') || 'AWA'}\nMERE DETEC: ALIMA KONE`,
                resolutionText: "Moyenne (185 DPI, bruit thermique lié à l'exposition)",
                contrastText: "Moyen (Ombre de main projetée sur le sceau officiel de l'État Civil)",
                status: 'warning',
                correctionAdvice: "Diagnostic : Pièce intelligible, mais l'ombrage pourrait provoquer un rejet manuel d'archivage ou bloquer la reconnaissance automatique finale. Veuillez repositionner la pièce à plat sous une fenêtre."
              });
              addNotification(`Diagnostic de pièce pour ${brideName} : ombre de main détectée.`, 'info');
            } else {
              setScanResult({
                score: 35,
                shadowDetected: true,
                shadowDetail: "Ombre bloquante lourde de tiers supérieur et flou de mise au point globale.",
                namesMatch: false,
                nameStatus: `DISCORDANCE NÉGATIVE - Les informations lues ne concordent pas avec les époux d'E-Mariage`,
                ocrCorrect: false,
                ocrSampleText: `EXTRAIT ?? NAISS??CE\nNOM EXT: DIALLO (Déclaré: ${groomName.split(' ').slice(-1)[0] || 'Toure'}/${brideName.split(' ').slice(-1)[0] || 'Koffi'})\nPRENOM EXT: SEKOU-AMADOU\nLIEN DE FAMILLE DETECTE: TIERS NON DECLARE`,
                resolutionText: "Très faible (85 DPI, pixellisation due à une mauvaise compression réseau)",
                contrastText: "Insuffisant (Flou de caméra ou objectif obstrué)",
                status: 'error',
                correctionAdvice: "REJET ANTICIPÉ : La pièce scannée comporte un nom discordant ('DIALLO Sékou-Amadou') et est trop floue. Veuillez utiliser un scan net pour éviter le blocage automatique en préfecture."
              });
              addNotification("Alerte de conformité : Discordance des identités ou pièce illisible !", "warning");
            }
          }, 600);
        }, 600);
      }, 600);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-10 w-full animate-fade-in text-left">
      
      {/* Premium Hub Header with authentic African colors and premium gold hints */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-900/10 via-primary/5 to-[#fcfbfa]/5 rounded-3xl p-6 md:p-10 border border-amber-900/15 flex flex-col md:flex-row items-center gap-8">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-bl-full pointer-events-none" />
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600/10 to-primary/10 text-primary border border-amber-500/25 px-4.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            <span>Pionnier en Afrique • Propulsé par l'IA</span>
          </div>
          <h1 className="font-serif text-3xl md:text-5xl text-slate-900 font-bold leading-tight">
            Traditions &amp; <span className="text-primary italic font-light">Intelligence Artificielle</span>
          </h1>
          <p className="font-sans text-xs md:text-sm text-secondary/90 leading-relaxed max-w-2xl">
            Marier la sacralité de nos coutumes africaines ancestrales à la rigueur de l'État Civil moderne. Nous réinventons le parcours d'union en intégrant le mariage coutumier, l'accessibilité multilingue et l'audit mobile intelligent.
          </p>
        </div>
      </section>

      {/* Grid of unique African modules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Module 1: Dowry Customary Simulator (Left Column - Spans 7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6 bg-white rounded-3xl p-6 md:p-8 border border-neutral-200/70 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#fffcf5] rounded-bl-full -z-10" />
          
          <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Générateur Coutumier de Dot
              </h3>
              <p className="font-sans text-[10px] text-secondary/75">
                Harmonisez vos rituels traditionnels avec l’acte civil d’honneur
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-sans text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Région / Groupe Ethnique d'Attache
              </label>
              <select 
                value={selectedEthnoGroup}
                onChange={(e) => {
                  setSelectedEthnoGroup(e.target.value);
                  setGeneratedCarnet(false);
                }}
                className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 text-xs bg-white text-slate-800 font-medium focus:border-primary focus:outline-none"
              >
                {ethnoGroups.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-sans text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Régime du mariage civil projeté
              </label>
              <select 
                value={marriageRegime}
                onChange={(e) => setMarriageRegime(e.target.value)}
                className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 text-xs bg-white text-slate-800 font-medium focus:border-primary focus:outline-none"
              >
                <option value="monogamy">Monogamie (Biens Communs)</option>
                <option value="separation">Monogamie (Séparation de biens)</option>
                <option value="polygamy">Option Polygamie (Coutume locale)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-100 pt-4">
            <div>
              <label className="block font-sans text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Nom complet du Futur Époux
              </label>
              <input 
                type="text"
                value={groomName}
                onChange={(e) => {
                  setGroomName(e.target.value);
                  setGeneratedCarnet(false);
                }}
                className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 text-xs bg-white text-slate-800 font-medium focus:border-primary focus:outline-none"
                placeholder="Ex. Koffi Touré"
              />
            </div>

            <div>
              <label className="block font-sans text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Nom complet de la Future Épouse
              </label>
              <input 
                type="text"
                value={brideName}
                onChange={(e) => {
                  setBrideName(e.target.value);
                  setGeneratedCarnet(false);
                }}
                className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 text-xs bg-white text-slate-800 font-medium focus:border-primary focus:outline-none"
                placeholder="Ex. Awa Koné"
              />
            </div>
          </div>

          <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-500/15 space-y-3.5">
            <h4 className="font-serif text-[11px] font-bold text-amber-900 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              Dot d'Honneur : Clés et Présents Conseils (IA)
            </h4>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="font-sans text-[10px] bg-amber-600/10 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-600/15">
                Habit noble recommandé : {selectedEthno.pagne}
              </span>
            </div>
            <ul className="text-xs font-sans text-secondary space-y-1.5 pl-1 text-left list-none">
              {selectedEthno.items.map((it, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span className="text-amber-600 font-bold mt-0.5">✔</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            <p className="font-sans text-[10px] text-amber-900/80 italic leading-relaxed border-t border-amber-500/10 pt-2.5">
              💡 <strong>Règle coutumière majeure :</strong> {selectedEthno.customaryRule}
            </p>
          </div>

          <div className="flex gap-4 items-center">
            <button 
              onClick={handleGenerateCarnet}
              disabled={isGenerating}
              className="px-6 py-3 bg-primary hover:bg-primary-container text-white rounded-xl font-sans text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Calcul culturel personnalisé...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Lancer la synthèse IA et Coutume</span>
                </>
              )}
            </button>
          </div>

          {/* Render generated premium interactive scroll certificate */}
          <AnimatePresence>
            {generatedCarnet && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="mt-2 bg-gradient-to-r from-amber-50 via-white to-amber-50/20 p-6 rounded-2xl border-2 border-amber-600/20 shadow-inner text-center relative"
              >
                <div className="absolute top-2 right-2 w-14 h-14 border border-amber-600/10 rounded-full flex items-center justify-center text-amber-600 opacity-20 font-serif text-[8px] font-bold uppercase tracking-widest rotate-12">
                  Approuvé IA
                </div>
                <span className="text-2xl font-serif">📜</span>
                <h4 className="font-serif text-md font-bold text-amber-900 mt-2">
                  Carnet Traditionnel de Dot Confirmé
                </h4>
                <p className="font-sans text-[10px] text-slate-500 mt-0.5">
                  Alliance entre la coutume et l'État Civil pour <strong>{groomName} &amp; {brideName}</strong>
                </p>
                
                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-b border-amber-600/10 py-3 text-left font-sans text-[10px] text-secondary">
                  <div>
                    <span className="block text-[8px] font-bold text-slate-500">TRIBUNU DU GOUVERNEMENT</span>
                    <span className="font-semibold text-slate-800">Célébration à Cocody</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-slate-500">OPTION CIVILE CHOSIE</span>
                    <span className="font-semibold text-slate-800">{marriageRegime === 'monogamy' ? "Monogamie Unie" : marriageRegime === 'separation' ? "Séparation de biens" : "Polygamie Reconnue"}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1.5 justify-center text-[10px] text-emerald-800 font-bold font-sans">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Envoi facultatif au dossier civil d'E-Mariage disponible !</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Column Right (Spans 5 cols) - Audio translation & Document Scanner Sim */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Module 2: Dialect Voice Assistant Translation Sim */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200/70 shadow-sm text-left">
            <div className="flex items-center gap-2.5 mb-4 border-b border-neutral-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10">
                <Globe className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-slate-900">
                  IA Vocale Multilingue d'Inclusion
                </h3>
                <p className="font-sans text-[9px] text-secondary/80">
                  Expliquer les lois en langues maternelles africaines
                </p>
              </div>
            </div>

            <p className="font-sans text-[11px] text-secondary leading-relaxed mb-4">
              Pour s'assurer que parents, aînés et conjoints comprennent chaque étape officielle, sélectionnez une langue vernaculaire et simulez la voix de l'IA.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block font-sans text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Langue Maternelle de Démonstration
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {languages.map(l => (
                    <button
                      key={l.id}
                      onClick={() => {
                        setSelectedLanguage(l.id);
                        setAudioTranscript('');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-sans text-[10px] tracking-wide font-semibold border transition-all cursor-pointer ${
                        selectedLanguage === l.id 
                          ? 'bg-primary text-white border-primary' 
                          : 'bg-neutral-50 text-secondary border-neutral-200 hover:border-primary/40'
                      }`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Informative advice */}
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 font-sans text-[11px] text-slate-800">
                <p className="font-bold flex items-center gap-1.5 text-primary">
                  <Languages className="w-3.5 h-3.5" />
                  Guide Légale IA :
                </p>
                <p className="opacity-90 italic mt-0.5">"{selectedLang.info}"</p>
              </div>

              {/* Speech simulator button */}
              <button 
                onClick={handlePlayVoice}
                disabled={isPlayingAudio}
                className="w-full py-2.5 rounded-xl border border-primary/30 hover:bg-primary/5 text-primary text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Volume2 className="w-4 h-4 shrink-0" />
                <span>{isPlayingAudio ? "Dictée en cours par l'adjointe..." : `Écouter en dialecte ${selectedLang.name}`}</span>
              </button>

              {audioTranscript && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-sans text-emerald-900 italic font-medium">
                  {audioTranscript}
                </div>
              )}
            </div>
          </div>

          {/* Module 3: Shadow & Glare Mobile Document Scanner Quality Checker */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200/70 shadow-sm text-left">
            <div className="flex items-center gap-2.5 mb-4 border-b border-neutral-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <Smartphone className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-slate-900">
                  Pre-Check Intelligent Mobile
                </h3>
                <p className="font-sans text-[10px] text-secondary/80">
                  Prévention des erreurs d’ombrage, de flou et de concordance OCR
                </p>
              </div>
            </div>

            <p className="font-sans text-[11px] text-secondary leading-relaxed mb-4">
              La numérisation sous faible éclairage ou réseau fluctuant (3G) entraîne de nombreux rejets de dossiers en préfecture d’Afrique. Testez notre algorithme IA localisé qui pré-qualifie votre pièce :
            </p>

            <div className="space-y-4">
              {/* Type selector tabs */}
              <div className="grid grid-cols-3 gap-1 bg-neutral-100/70 p-1 rounded-xl">
                <button
                  onClick={() => { setDocType('cni'); setScanResult(null); }}
                  className={`py-2 rounded-lg text-[9px] font-sans font-bold cursor-pointer transition-all ${
                    docType === 'cni' 
                      ? 'bg-white text-emerald-800 shadow-sm border border-neutral-200' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  📄 CNI (Nette)
                </button>
                <button
                  onClick={() => { setDocType('birth'); setScanResult(null); }}
                  className={`py-2 rounded-lg text-[9px] font-sans font-bold cursor-pointer transition-all ${
                    docType === 'birth' 
                      ? 'bg-amber-100/55 text-amber-800 shadow-sm border border-amber-200' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  📄 Acte (Ombre)
                </button>
                <button
                  onClick={() => { setDocType('bad'); setScanResult(null); }}
                  className={`py-2 rounded-lg text-[9px] font-sans font-bold cursor-pointer transition-all ${
                    docType === 'bad' 
                      ? 'bg-red-50 text-red-800 shadow-sm border border-red-100' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  🚫 Diagnostic Flou
                </button>
              </div>

              {/* Simulated Smartphone Viewfinder Container */}
              <div className="relative border-4 border-neutral-800 bg-neutral-950 rounded-2xl p-0.5 overflow-hidden shadow-lg select-none">
                <div className="h-44 bg-slate-900 relative flex flex-col justify-between p-3 overflow-hidden text-white font-sans text-[8px]">
                  {/* Neon screen glare */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-amber-500/5 pointer-events-none" />

                  {/* Top Bar metrics */}
                  <div className="flex items-center justify-between z-10 opacity-75">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                      CAMERA LISIBLE 30fps
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="bg-black/30 px-1.5 py-0.5 rounded font-mono">
                        {docType === 'cni' ? 'ISO 400 • Lumineux' : docType === 'birth' ? 'ISO 1200 • Ombrage' : 'ISO 1600 • Flou'}
                      </span>
                      <span className="text-amber-400 font-mono">3G ( compression active )</span>
                    </div>
                  </div>

                  {/* Laser Sweeper animation */}
                  {isScanning && (
                    <motion.div 
                      initial={{ top: '0%' }}
                      animate={{ top: '100%' }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_10px_rgba(239,68,68,0.9)] z-20"
                    />
                  )}

                  {/* Center Crop Frame */}
                  <div className="absolute inset-x-6 inset-y-8 border border-white/20 rounded flex items-center justify-center">
                    {/* Corner crop indicators */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-emerald-400" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-emerald-400" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-emerald-400" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-emerald-400" />

                    {/* Document Mockup Drawing */}
                    <div className="w-full h-full bg-white/5 backdrop-blur-[1px] rounded p-2 flex flex-col justify-between relative shadow-inner overflow-hidden text-left">
                      {docType === 'cni' && (
                        <>
                          <div className="flex items-center justify-between border-b border-white/10 pb-1">
                            <span className="text-[#ff9900] font-bold text-[6px]">RÉPUBLIQUE DE CÔTE D'IVOIRE</span>
                            <span className="bg-emerald-600 h-1.5 w-2 rounded-xs" />
                          </div>
                          <div className="flex gap-2 items-center mt-2.5">
                            <div className="w-6 h-7 bg-neutral-800 rounded-sm flex items-center justify-center text-[10px] text-white/50">👤</div>
                            <div className="flex-1 space-y-1">
                              <div className="h-1.5 w-3/4 bg-emerald-400/80 rounded" />
                              <div className="h-1 w-4/5 bg-white/40 rounded" />
                              <span className="text-[5px] text-emerald-300 block mt-0.5">NOM: {groomName.toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="h-1 w-full bg-neutral-800/60 rounded-xs mt-2" />
                        </>
                      )}

                      {docType === 'birth' && (
                        <div className="relative w-full h-full">
                          {/* Radial shadow simulation */}
                          <div className="absolute -top-4 -left-6 w-20 h-20 rounded-full bg-radial from-black/85 via-black/45 to-transparent mix-blend-multiply z-10 pointer-events-none" />
                          <div className="flex items-center justify-between border-b border-white/10 pb-1">
                            <span className="text-neutral-400 font-bold text-[6px]">ACTE DE NAISSANCE CIVILE</span>
                            <span className="text-[5px] text-amber-400 font-mono">Ombre détectée ↑</span>
                          </div>
                          <div className="space-y-1.5 mt-3">
                            <div className="h-1 w-2/3 bg-white/40 rounded" />
                            <div className="h-1 w-3/4 bg-white/40 rounded" />
                            <span className="text-[5px] text-neutral-300 block font-bold">TITULAIRE: {brideName.toUpperCase()}</span>
                            <div className="h-1 w-1/2 bg-white/20 rounded" />
                          </div>
                          <div className="absolute bottom-1 right-1 w-3 h-3 border border-neutral-400 rounded-full flex items-center justify-center font-bold text-[4px] opacity-40">SCEAU</div>
                        </div>
                      )}

                      {docType === 'bad' && (
                        <div className="w-full h-full flex flex-col justify-between blur-[1px] opacity-55">
                          <div className="flex items-center justify-between border-b border-white/10 pb-1">
                            <span className="text-red-500 font-bold text-[6px]">REÇU INCORRECT OU ILLISIBLE</span>
                          </div>
                          <div className="space-y-1 mt-2 rotate-1">
                            <div className="h-1 w-11/12 bg-neutral-600 rounded" />
                            <div className="h-1 w-full bg-neutral-600 rounded" />
                            <div className="h-1.5 w-2/3 bg-red-400 rounded" />
                            <span className="text-[5px] text-red-300 block">NOM EXT: DIALLO SEKOU</span>
                          </div>
                          <p className="text-[4px] text-right font-mono text-neutral-500">FAIBLE LUMIÈRE/FLOU DE BOUGE</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive Scan Progress Modal */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center z-30 backdrop-blur-xs">
                      <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
                      <span className="font-sans text-[10px] text-emerald-300 font-bold max-w-xs">{scanStep}</span>
                      <div className="w-4/5 bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-3 max-w-[200px]">
                        <motion.div 
                          initial={{ width: '0%' }}
                          animate={{ width: `${scanProgress}%` }}
                          transition={{ duration: 0.3 }}
                          className="bg-emerald-400 h-full shadow-[0_0_8px_rgba(52,211,153,1)]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Bottom Camera UI */}
                  <div className="flex items-center justify-between z-10 font-bold text-[7px] text-neutral-400">
                    <span>9.6 Mpx local AI</span>
                    <span className="text-white/60">AUTOFOCUS ACTIF</span>
                  </div>
                </div>
              </div>

              {/* Trigger Button */}
              <button
                onClick={handleSimulateScan}
                disabled={isScanning}
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:bg-neutral-500 disabled:cursor-not-allowed"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                    <span>Calcul de l'éclairage local sous 3G...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Simuler la Prise de Vue &amp; l'Audit IA</span>
                  </>
                )}
              </button>

              {/* Results presentation panel */}
              <AnimatePresence>
                {scanResult && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`p-5 rounded-2xl border text-left font-sans text-xs space-y-4 shadow-sm ${
                      scanResult.status === 'success' 
                        ? 'bg-emerald-50/70 text-emerald-900 border-emerald-300/60' 
                        : scanResult.status === 'warning'
                          ? 'bg-amber-50/70 text-amber-900 border-amber-300/60'
                          : 'bg-red-50/70 text-red-900 border-red-200'
                    }`}>
                      
                      {/* Readability Score Gauge */}
                      <div className="flex items-center justify-between border-b border-black/5 pb-2">
                        <div className="flex items-center gap-2">
                          <CheckSquare className={`w-4 h-4 ${
                            scanResult.status === 'success' ? 'text-emerald-700' : scanResult.status === 'warning' ? 'text-amber-700' : 'text-red-700'
                          }`} />
                          <span className="font-serif font-bold text-sm">Diagnostic Civil Prévisionnel</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] uppercase tracking-wider text-black/50 font-semibold">Note de Lisibilité</span>
                          <span className={`text-lg font-bold ${
                            scanResult.status === 'success' ? 'text-emerald-700' : scanResult.status === 'warning' ? 'text-amber-700' : 'text-red-700'
                          }`}>{scanResult.score}%</span>
                        </div>
                      </div>

                      {/* Diagnostic details */}
                      <div className="space-y-3 font-sans text-[11px] leading-relaxed">
                        
                        {/* 1. Shadows */}
                        <div className="p-2.5 rounded-xl bg-white/75 border border-black/5 space-y-1">
                          <span className="font-bold text-[10px] uppercase text-slate-500 block">Éclairage &amp; Filtres d’Ombres</span>
                          <span className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${scanResult.shadowDetected ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            <strong className="text-slate-800">{scanResult.shadowDetected ? "Ombre détectée" : "Aucune ombre gênante"}</strong>
                          </span>
                          <p className="text-[10px] text-slate-600 opacity-90">{scanResult.shadowDetail}</p>
                        </div>

                        {/* 2. Civil Record Concordance */}
                        <div className="p-2.5 rounded-xl bg-white/75 border border-black/5 space-y-1">
                          <span className="font-bold text-[10px] uppercase text-slate-500 block">Concordance Nominative</span>
                          <span className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${scanResult.namesMatch ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <strong className="text-slate-800">{scanResult.namesMatch ? "Noms validés" : "Alerte de concordance"}</strong>
                          </span>
                          <p className="text-[10px] text-slate-600 opacity-90">{scanResult.nameStatus}</p>
                        </div>

                        {/* 3. Contrast / Connection */}
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="p-2 bg-white/60 rounded-lg">
                            <span className="block font-bold text-slate-500 text-[8px] uppercase">Résolution</span>
                            <span className="text-slate-800 font-medium">{scanResult.resolutionText}</span>
                          </div>
                          <div className="p-2 bg-white/60 rounded-lg">
                            <span className="block font-bold text-slate-500 text-[8px] uppercase">Rapport de contraste</span>
                            <span className="text-slate-800 font-medium">{scanResult.contrastText}</span>
                          </div>
                        </div>

                        {/* 4. Raw OCR Extracted display */}
                        <div className="space-y-1">
                          <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wide block">Données brutes lues par l'IA locale (OCR) :</span>
                          <pre className="p-3 bg-neutral-900 text-neutral-200 font-mono text-[9px] rounded-lg overflow-x-auto selection:bg-emerald-800 leading-normal max-h-24 whitespace-pre">
                            {scanResult.ocrSampleText}
                          </pre>
                        </div>
                      </div>

                      {/* Solemn guidance advice */}
                      <div className={`p-3 rounded-xl text-[11px] font-medium leading-relaxed flex items-start gap-2 ${
                        scanResult.status === 'success' 
                          ? 'bg-emerald-100 text-emerald-950' 
                          : scanResult.status === 'warning'
                            ? 'bg-amber-100/80 text-amber-950'
                            : 'bg-red-100 text-red-950'
                      }`}>
                        {scanResult.status === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-800 mt-0.5" />}
                        {scanResult.status === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0 text-amber-800 mt-0.5" />}
                        {scanResult.status === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-red-800 mt-0.5" />}
                        <span>{scanResult.correctionAdvice}</span>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* CARTE INTERACTIVE DES MAIRIES & CENTRES CULTURELS PARTENAIRES             */}
        {/* ========================================================================= */}
        <div id="interactive-partners-map" className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200/70 shadow-sm flex flex-col gap-6 text-left mt-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-50/20 rounded-bl-full pointer-events-none -z-10" />
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <MapIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                  Réseau National D'Alliance Communes &amp; Coutumes
                  <span className="text-[10px] font-sans bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">Côte d'Ivoire</span>
                </h3>
                <p className="font-sans text-[11px] text-secondary/75">
                  Visualisez les mairies connectées et centres culturels d'accompagnement en Côte d'Ivoire.
                </p>
              </div>
            </div>

            {/* Map theme / source advisor */}
            <div className="flex flex-col text-right">
              {(() => {
                const API_KEY =
                  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
                  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
                  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
                  '';
                const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';
                return (
                  <div className={`px-3.5 py-1.5 rounded-xl border text-[11px] font-sans font-semibold inline-flex items-center gap-1.5 self-start md:self-end ${
                    hasValidKey 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-amber-50 text-amber-900 border-amber-200/70'
                  }`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${hasValidKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span>
                      {hasValidKey 
                        ? "Google Maps API : Active (Production)" 
                        : "Mode Carte Vectorielle Intelligente Actif"}
                    </span>
                  </div>
                );
              })()}
              <span className="text-[9px] text-secondary/60 mt-1">Configurez GOOGLE_MAPS_PLATFORM_KEY dans les Secrets pour basculer sur l'API Live Google.</span>
            </div>
          </div>

          {/* Search bar & Category filter chips */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-200/60 shadow-inner">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Rechercher une commune, une ville, une région... (Ex. Cocody, Tonkpi, Nord...)"
                value={mapSearchQuery}
                onChange={(e) => setMapSearchQuery(e.target.value)}
                className="w-full pl-9 px-4 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setMapFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border tracking-wide transition-all whitespace-nowrap ${
                  mapFilter === 'all' 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                    : 'bg-white text-secondary border-neutral-300 hover:border-emerald-300'
                }`}
              >
                🌍 Tous
              </button>
              <button
                onClick={() => setMapFilter('mairie')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border tracking-wide transition-all whitespace-nowrap ${
                  mapFilter === 'mairie' 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                    : 'bg-white text-secondary border-neutral-300 hover:border-emerald-300'
                }`}
              >
                🏛 Mairies Partenaires
              </button>
              <button
                onClick={() => setMapFilter('cultural')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border tracking-wide transition-all whitespace-nowrap ${
                  mapFilter === 'cultural' 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                    : 'bg-white text-secondary border-neutral-300 hover:border-emerald-300'
                }`}
              >
                🌾 Centres Coutumiers
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: List of sites & detailed dossier card */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                Partenaires trouvés ({IVORIAN_PARTNERS.filter(p => {
                  const mF = mapFilter === 'all' || p.type === mapFilter;
                  const mS = p.name.toLowerCase().includes(mapSearchQuery.toLowerCase()) ||
                             p.city.toLowerCase().includes(mapSearchQuery.toLowerCase()) ||
                             p.region.toLowerCase().includes(mapSearchQuery.toLowerCase());
                  return mF && mS;
                }).length})
              </span>

              {/* Scrollable list */}
              <div className="max-h-52 overflow-y-auto border border-neutral-200 rounded-2xl p-2 bg-neutral-50/50 space-y-1.5 text-left">
                {(() => {
                  const filtered = IVORIAN_PARTNERS.filter(p => {
                    const mF = mapFilter === 'all' || p.type === mapFilter;
                    const mS = p.name.toLowerCase().includes(mapSearchQuery.toLowerCase()) ||
                               p.city.toLowerCase().includes(mapSearchQuery.toLowerCase()) ||
                               p.region.toLowerCase().includes(mapSearchQuery.toLowerCase());
                    return mF && mS;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs text-slate-400 font-sans">
                        Aucun partenaire ne correspond à vos critères de recherche.
                      </div>
                    );
                  }

                  return filtered.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActivePartnerId(p.id);
                        setInfoWindowOpen(true);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        activePartnerId === p.id 
                          ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500/25' 
                          : 'bg-white/80 border-neutral-200/70 hover:bg-white hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          p.type === 'mairie' 
                            ? 'bg-blue-50 text-blue-700 border-blue-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {p.type === 'mairie' ? (
                            <Building2 className="w-4 h-4" />
                          ) : (
                            <Compass className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-serif text-[11px] font-bold text-slate-900 truncate">{p.name}</h4>
                          <span className="font-sans text-[9px] text-slate-500 block">{p.city} • <strong className="font-medium text-slate-700">{p.region}</strong></span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activePartnerId === p.id ? 'translate-x-0.5 text-emerald-600' : 'text-slate-300'}`} />
                    </button>
                  ));
                })()}
              </div>

              {/* Detailed partner dossier */}
              {(() => {
                const partner = IVORIAN_PARTNERS.find(p => p.id === activePartnerId) || IVORIAN_PARTNERS[0];
                return (
                  <motion.div 
                    layoutId={`partner-card-${partner.id}`}
                    className="p-4 border-2 border-emerald-500/15 bg-emerald-50/15 rounded-2xl flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-neutral-200/50 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${partner.type === 'mairie' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                        <span className="font-sans text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                          {partner.type === 'mairie' ? 'Mairie de Côte d\'Ivoire' : 'Espace Traditionnel Connecté'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold bg-white px-2 py-0.5 rounded border border-neutral-100 text-slate-600">
                        📞 {partner.phone}
                      </span>
                    </div>

                    <div className="flex gap-4 items-start">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-inner border border-neutral-200 shrink-0">
                        <img 
                          src={partner.image} 
                          alt={partner.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-serif text-[13px] font-bold text-slate-900">{partner.name}</h4>
                        <p className="font-sans text-[11px] text-slate-600 leading-relaxed">
                          {partner.description}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-neutral-200/70 space-y-1.5 shadow-xs">
                      <span className="font-sans text-[8.5px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                        🌾 Intégration / Conseil Coutumier
                      </span>
                      <p className="font-sans text-[10.5px] text-slate-700 leading-relaxed font-semibold italic">
                        &ldquo;{partner.cultureTip}&rdquo;
                      </p>
                    </div>

                    {/* Dynamic travel route estimates from Cocody */}
                    {partner.id !== 'cocody' && (
                      <div className="bg-sky-50/40 p-2.5 rounded-xl border border-sky-400/10 text-[10.5px] font-sans flex items-center justify-between text-sky-950">
                        <span className="flex items-center gap-1 font-medium">
                          <Navigation className="w-3.5 h-3.5 text-sky-600 animate-pulse shrink-0" />
                          Distance estimée d'Abidjan (Cocody Hub) :
                        </span>
                        <strong className="bg-sky-100/80 px-2 py-0.5 rounded text-sky-900 text-[10px] font-bold">
                          {partner.distance} (~ {partner.time})
                        </strong>
                      </div>
                    )}
                  </motion.div>
                );
              })()}

            </div>

            {/* Right Column: Visual Map (Aesthetic Local Canvas OR Google Map APIs) */}
            <div className="lg:col-span-7 flex flex-col gap-2">
              <div className="relative h-96 md:h-full min-h-[440px] w-full border border-neutral-200 bg-neutral-50/70 rounded-3xl overflow-hidden shadow-inner flex flex-col justify-between p-4">
                
                {(() => {
                  const API_KEY =
                    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
                    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
                    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
                    '';
                  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

                  // Default center is political/cultural heart: Yamoussoukro (6.8206, -5.2753)
                  const centerLatLng = { lat: 7.0000, lng: -5.5000 };

                  if (hasValidKey) {
                    return (
                      <div className="w-full h-full absolute inset-0 z-10">
                        <APIProvider apiKey={API_KEY} version="weekly">
                          <Map
                            defaultCenter={centerLatLng}
                            defaultZoom={7}
                            mapId="CIV_UNION_MAP_ID"
                            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                            style={{ width: '100%', height: '100%' }}
                          >
                            {IVORIAN_PARTNERS.map(p => {
                              const isSelected = p.id === activePartnerId;
                              return (
                                <AdvancedMarker
                                  key={p.id}
                                  position={{ lat: p.lat, lng: p.lng }}
                                  title={p.name}
                                  onClick={() => {
                                    setActivePartnerId(p.id);
                                    setInfoWindowOpen(true);
                                  }}
                                >
                                  <Pin 
                                    background={p.type === 'mairie' ? "#2563eb" : "#d97706"}
                                    borderColor="#ffffff" 
                                    glyphColor="#ffffff"
                                    scale={isSelected ? 1.2 : 0.95} 
                                  />
                                </AdvancedMarker>
                              );
                            })}

                            {infoWindowOpen && (() => {
                              const partner = IVORIAN_PARTNERS.find(p => p.id === activePartnerId) || IVORIAN_PARTNERS[0];
                              return (
                                <InfoWindow
                                  position={{ lat: partner.lat, lng: partner.lng }}
                                  onCloseClick={() => setInfoWindowOpen(false)}
                                >
                                  <div className="p-1 font-sans text-xs max-w-xs text-left">
                                    <h4 className="font-serif font-bold text-slate-900 border-b border-neutral-100 pb-1">{partner.name}</h4>
                                    <p className="text-[10px] text-slate-600 mt-1 leading-normal">{partner.description}</p>
                                    <span className="text-[9px] text-slate-500 font-bold block mt-1">📍 {partner.city} • {partner.region}</span>
                                  </div>
                                </InfoWindow>
                              );
                            })()}
                          </Map>
                        </APIProvider>
                      </div>
                    );
                  }

                  // Else: FALLBACK HIGH-FIDELITY VECTOR DOCK MAP
                  return (
                    <div className="absolute inset-0 z-10 bg-gradient-to-tr from-amber-500/5 via-[#fcfbfa] to-emerald-500/5 flex flex-col justify-between p-4 font-sans relative overflow-hidden">
                      
                      {/* Grid overlay aesthetics */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

                      {/* Top floating legend status */}
                      <div className="flex items-center justify-between z-20 pointer-events-none">
                        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-200/85 text-[10px] font-bold text-slate-700 flex items-center gap-1.5 shadow-sm">
                          <Compass className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                          <span>CARTOGRAPHIE INTERACTIVE DES ALLIANCES IVOIRIENNES</span>
                        </div>
                        <div className="bg-neutral-900 text-[#ffb03a] font-mono text-[9px] px-2 py-0.5 rounded shadow">
                          N 7°32' W 5°32'
                        </div>
                      </div>

                      {/* Côte d'Ivoire Customized Map Outline */}
                      <div className="flex-1 w-full max-w-md mx-auto flex items-center justify-center relative my-4">
                        
                        {/* Map Outline SVG Graph */}
                        <svg viewBox="0 0 400 400" className="w-full h-full text-amber-500/10 select-none max-h-[340px]" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Outer Border Fill */}
                          <polygon 
                            points="
                              120,40 160,45 200,42 220,50 250,45 270,55 300,50 310,65 315,95 330,110
                              310,135 325,170 310,195 305,215 315,240 325,260 310,290 310,335 300,342
                              260,345 210,340 180,345 150,340 120,345 110,342 108,300 115,265 95,250
                              75,230 65,215 63,180 82,150 78,135 90,120 85,95 102,80 112,65
                            "
                            className="fill-amber-500/5 stroke-amber-500/15 stroke-[3.5] transition-all"
                          />
                          
                          {/* Inner soft regions paths for depth and geographical authority */}
                          <path d="M 120,40 C 150,120 180,240 210,340" className="stroke-neutral-300/35 stroke-1" strokeDasharray="4 4" fill="none" />
                          <path d="M 65,215 C 160,190 260,280 300,342" className="stroke-neutral-300/35 stroke-1" strokeDasharray="4 4" fill="none" />
                          <path d="M 102,80 Q 210,130 315,95" className="stroke-neutral-300/35 stroke-1" strokeDasharray="4 4" fill="none" />

                          {/* Visual Rivers / Boundary decor */}
                          <path d="M 150,40 Q 140,150 150,340" className="stroke-[#2563eb]/10 stroke-1.5" fill="none" /> {/* Sassandra river */}
                          <path d="M 220,50 Q 210,190 220,340" className="stroke-[#2563eb]/10 stroke-1.5" fill="none" /> {/* Bandama river */}

                          {/* Gulf of guinea annotation */}
                          <text x="180" y="375" fill="slate" className="text-[10px] font-sans tracking-widest font-bold opacity-30 select-none fill-slate-400">GOLFE DE GUINÉE</text>
                        </svg>

                        {/* Relative overlay coordinates calculation markers */}
                        {IVORIAN_PARTNERS.map(p => {
                          // Geographical bounds:
                          const minLng = -8.6;
                          const maxLng = -2.5;
                          const minLat = 4.3;
                          const maxLat = 10.7;

                          // Longitude percentage
                          const x = ((p.lng - minLng) / (maxLng - minLng)) * 100;
                          // Latitude percentage
                          const y = 100 - ((p.lat - minLat) / (maxLat - minLat)) * 100;

                          const isSelected = p.id === activePartnerId;

                          return (
                            <motion.button
                              key={p.id}
                              onClick={() => {
                                setActivePartnerId(p.id);
                                setInfoWindowOpen(true);
                              }}
                              style={{ left: `${x}%`, top: `${y}%` }}
                              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group cursor-pointer"
                              whileHover={{ scale: 1.15 }}
                            >
                              {/* Pulsing beacon radar */}
                              <div className={`absolute -inset-4 rounded-full transition-all duration-700 pointer-events-none scale-0 group-hover:scale-100 ${
                                isSelected 
                                  ? 'bg-emerald-500/20 ring-2 ring-emerald-500/10' 
                                  : 'bg-neutral-500/10'
                              }`} />

                              {/* Glowing signal ripple */}
                              {isSelected && (
                                <span className={`absolute -inset-2.5 rounded-full animate-ping pointer-events-none opacity-45 shrink-0 ${
                                  p.type === 'mairie' ? 'bg-blue-400' : 'bg-amber-400'
                                }`} />
                              )}

                              {/* Visual Pin Element representing partner */}
                              <div className={`relative px-2 py-1.5 rounded-xl border flex items-center justify-center gap-1 shadow-md transition-all ${
                                isSelected 
                                  ? 'bg-neutral-900 border-neutral-950 text-white font-bold scale-110' 
                                  : 'bg-white hover:bg-neutral-50 border-neutral-300 text-slate-800'
                              }`}>
                                {p.type === 'mairie' ? (
                                  <Building2 className={`w-3.5 h-3.5 p-0.5 rounded-md ${isSelected ? 'text-blue-400 bg-blue-950/40' : 'text-blue-600'}`} />
                                ) : (
                                  <Compass className={`w-3.5 h-3.5 p-0.5 rounded-md ${isSelected ? 'text-amber-400 bg-amber-950/40' : 'text-amber-600'}`} />
                                )}
                                <span className="text-[8.5px] font-sans select-none tracking-tight">{p.city}</span>
                              </div>

                              {/* Popover hovering tooltip label */}
                              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap bg-neutral-950 text-[#fff] text-[8.5px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40 shadow-sm border border-white/10`}>
                                <strong className="font-serif block text-[9.5px] border-b border-white/10 pb-0.5 mb-0.5">{p.name}</strong>
                                <span>{p.region} • {p.city}</span>
                              </div>
                            </motion.button>
                          );
                        })}

                        {/* Interactive live route visual simulation path overlay */}
                        {(() => {
                          const activePartner = IVORIAN_PARTNERS.find(p => p.id === activePartnerId) || IVORIAN_PARTNERS[0];
                          if (activePartner.id !== 'cocody') {
                            // Calculate relative center of Abidjan (Cocody)
                            const minLng = -8.6;
                            const maxLng = -2.5;
                            const minLat = 4.3;
                            const maxLat = 10.7;

                            // Abidjan coordinates
                            const ax = ((-3.9834 - minLng) / (maxLng - minLng)) * 100;
                            const ay = 100 - ((5.3484 - minLat) / (maxLat - minLat)) * 100;

                            // End calculations
                            const ex = ((activePartner.lng - minLng) / (maxLng - minLng)) * 100;
                            const ey = 100 - ((activePartner.lat - minLat) / (maxLat - minLat)) * 100;

                            return (
                              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                                {/* Flowing neon direction indicator */}
                                <motion.path
                                  d={`M ${ax}% ${ay}% Q ${(ax + ex)/2}% ${(ay + ey)/2 - 12}% ${ex}% ${ey}%`}
                                  fill="none"
                                  className="stroke-emerald-500"
                                  strokeWidth="2.5"
                                  strokeDasharray="5, 5"
                                  initial={{ strokeDashoffset: 50 }}
                                  animate={{ strokeDashoffset: 0 }}
                                  transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                                />
                                {/* Overlay glow path */}
                                <path
                                  d={`M ${ax}% ${ay}% Q ${(ax + ex)/2}% ${(ay + ey)/2 - 12}% ${ex}% ${ey}%`}
                                  fill="none"
                                  className="stroke-emerald-400 opacity-20"
                                  strokeWidth="6"
                                />
                              </svg>
                            );
                          }
                          return null;
                        })()}

                      </div>

                      {/* Floating bottom help card */}
                      <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between gap-3 text-left z-20">
                        <div className="flex items-center gap-2">
                          <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="font-sans text-[10px]">
                            <span className="font-bold text-slate-800 block">Orientation d'Alliance Locale Actuelle</span>
                            <span className="text-slate-500">Sélectionnez n'importe quel marqueur géographique pour charger ses spécificités.</span>
                          </div>
                        </div>
                        <span className="text-[9.5px] font-bold text-slate-400">Éditeur National</span>
                      </div>

                    </div>
                  );
                })()}

              </div>
            </div>

          </div>

          {/* Quick advice callout banner */}
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-500/15 flex items-start gap-3 mt-1.5">
            <Award className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1 font-sans text-xs text-amber-950">
              <span className="font-bold font-serif text-[13px] text-amber-900 block">Protocole de Raccordement Direct d'État Civil</span>
              <p className="leading-relaxed text-[11px] opacity-90">
                Nos mairies et centres culturels d'accompagnement partenaires en <strong>Côte d'Ivoire</strong> disposent de l'outil pilote de raccordement. Tout carnet de dot constitué est immédiatement indexé à votre pré-dossier civil en format numérique pour valider et accréditer formellement le respect coutumier devant le Monsieur le Maire le jour j.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

