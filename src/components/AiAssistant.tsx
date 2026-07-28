import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Heart, Sparkles, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage } from '../types';
import { getAiConfig, traduireEnFrancaisSiAnglais } from '../services/dbService';

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Bonjour ! Je suis Clara, votre adjointe d'honneur virtuelle d'E-Mariage. Je suis formée aux réglementations de l'État Civil pour répondre à vos questions sur les démarches administratives de votre mariage civil (témoins, pièces, contrat...). Comment puis-je vous aider aujourd'hui ?",
      timestamp: 'À l\'instant'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isTyping]);

  const prewrittenPrompts = [
    "Justificatifs obligatoires ?",
    "Délai d'instruction ?",
    "Témoins requis ?",
    "Faut-il un contrat ?"
  ];

  // Simple local conversational engine with pre-coded smart regulations
  const getAiResponse = (userQuery: string): string => {
    const q = userQuery.toLowerCase();
    
    if (q.includes('document') || q.includes('piece') || q.includes('justificatif')) {
      return "Pour constituer votre dossier civil obligatoire de mariage, les deux futurs époux doivent fournir chacun :\n\n" +
             "1. Une pièce d'identité officielle valide (CNI ou Passeport, scan recto/verso).\n" +
             "2. Un extrait d'acte de naissance datant de moins de 3 mois (ou moins de 6 mois si l'acte a été délivré à l'étranger).\n" +
             "3. Un justificatif de domicile récent (facture d’électricité, d'eau, quittance de loyer de moins de 3 mois) prouvant un mois de résidence continue.";
    }
    
    if (q.includes('ban') || q.includes('delai') || q.includes('délai') || q.includes('combien de temps')) {
      return "Une fois votre dossier civil d'E-Mariage soumis en ligne, l'officier civil instruit les pièces justificatives dans un délai de 5 à 10 jours ouvrés.\n\nAprès validation de la conformité, vous serez conviés à l'audition préalable d'usage pour confirmer la date de votre célébration.";
    }

    if (q.includes('temoin') || q.includes('témoin') || q.includes('nombre')) {
      return "La loi ivoirienne (Loi n° 2019-570 relative au mariage) exige d'avoir au moins 2 témoins majeurs au total (un témoin pour l'époux, un témoin pour l'épouse) pour la célébration du mariage civil.\n\n" +
             "Ils doivent fournir une copie lisible de leur pièce d’identité ivoirienne (CNI, Passeport ou Attestation d'Identité) ainsi que leurs informations de profession et de domicile au moins 10 jours avant la célébration.";
    }

    if (q.includes('contrat') || q.includes('notaire') || q.includes('communaute')) {
      return "Le contrat de mariage n'est pas obligatoire. La loi ivoirienne relative au mariage vous demande de choisir expressément votre régime matrimonial : soit la 'communauté de biens', soit la 'séparation de biens', lors de la constitution de votre dossier.\n\n" +
             "Si vous signez un contrat spécifique devant un notaire, vous devez transmettre le certificat de contrat délivré par le notaire au moins 10 jours avant le mariage.";
    }

    if (q.includes('marcory') || q.includes('cocody') || q.includes('mairie')) {
      return "La Mairie de Marcory est un endroit d'exception pour célébrer votre union ! Une fois que vos documents d'identité et de domicile d'attache d'Abidjan sont validés par notre équipe, votre dossier d'état civil est instruit rapidement par notre service municipal.";
    }

    return "C'est une excellente question pour l'organisation de votre union ! Généralement, la mairie réclame un dossier scrupuleusement conforme au moins un mois et demi avant la date souhaitée. Si vous avez un cas très spécifique (résidence à l'étranger, veuvage, etc.), je vous conseille de joindre directement la mairie via l'action 'Contacter l'officier civil' de votre tableau de bord.";
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Append user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: textToSend,
      timestamp: 'À l\'instant'
    };

    setChatLog(prev => [...prev, userMsg]);
    setMessageText('');
    setIsTyping(true);

    const config = getAiConfig();
    if (config && config.groqKey) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.groqKey}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "user",
                content: config.promptFaq.replace("[QUESTION]", textToSend)
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          let responseText = data.choices?.[0]?.message?.content;
          if (responseText) {
            responseText = responseText.trim();
            try {
              responseText = await traduireEnFrancaisSiAnglais(responseText, config.geminiKey || config.groqKey || '');
            } catch (transErr) {
              console.warn("FAQ translation failed:", transErr);
            }
            const assistantMsg: ChatMessage = {
              id: Math.random().toString(),
              role: 'assistant',
              content: responseText,
              timestamp: 'À l\'instant'
            };
            setChatLog(prev => [...prev, assistantMsg]);
            setIsTyping(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Groq API call failed, falling back to local response:", err);
      }
    }

    // Fallback response with simulated typing delay
    setTimeout(() => {
      const responseText = getAiResponse(textToSend);
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'assistant',
        content: responseText,
        timestamp: 'À l\'instant'
      };
      setChatLog(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="fixed bottom-24 md:bottom-6 right-6 z-[140] text-left">
      {/* Floating Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="chat-toggle-btn"
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-14 h-14 rounded-full bg-primary hover:bg-primary-container text-white shadow-2xl flex items-center justify-center cursor-pointer border border-primary/20"
            title="Parler à l'aide administrative"
          >
            {/* Custom glowing rings */}
            <div className="absolute inset-0 rounded-full border border-primary/40 animate-ping opacity-60 pointer-events-none" />
            <div className="absolute inset-1 rounded-full border border-accent/30 animate-pulse pointer-events-none" />
            <MessageSquare className="w-6 h-6 text-accent" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="chat-window-popup"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl border border-accent/25 w-[340px] md:w-[380px] h-[520px] shadow-2xl flex flex-col overflow-hidden relative"
          >
            {/* Header */}
            <div className="bg-primary p-4 text-white flex items-center justify-between shadow-md shrink-0 border-b border-accent/15">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-accent border border-white/15">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif text-sm font-semibold tracking-tight">Adjointe d'Honneur AI</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[9px] opacity-80 font-sans uppercase tracking-widest font-bold">En ligne • Concierge</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Logs */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#fdfbf7]/50 hide-scrollbar font-sans">
              <AnimatePresence initial={false}>
                {chatLog.map((msg, index) => {
                  const isAssistant = msg.role === 'assistant';
                  return (
                    <motion.div 
                      key={msg.id} 
                      className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index === 0 ? 0 : 0.05 }}
                    >
                      <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed whitespace-pre-line shadow-sm border shrink-0 ${
                        isAssistant 
                          ? 'bg-white text-slate-800 border-accent/15 rounded-tl-none' 
                          : 'bg-primary text-white border-primary/20 rounded-tr-none'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[8px] text-slate-400 mt-1 px-1 font-semibold">{msg.timestamp}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isTyping && (
                <motion.div 
                  className="flex flex-col items-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="bg-white border border-accent/15 p-3 rounded-xl rounded-tl-none flex gap-1.5 items-center shadow-sm">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Prompt Suggestions */}
            <div className="px-3 py-2 bg-slate-50 border-t border-accent/15 flex flex-wrap gap-1.5 shrink-0 select-none">
              {prewrittenPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSendMessage(p)}
                  className="text-[10px] font-sans p-1.5 rounded-lg border border-accent/20 hover:border-primary/50 hover:bg-primary/5 text-slate-700 hover:text-primary transition-all cursor-pointer shrink-0 font-bold shadow-sm"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t border-neutral-100 bg-white flex gap-2 items-center shrink-0">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(messageText)}
                placeholder="Posez une question à l'officier civil..."
                className="flex-grow border border-neutral-300 rounded-xl px-4 py-2.5 text-xs bg-slate-50 focus:border-primary focus:outline-none font-medium font-sans"
              />
              <button
                onClick={() => handleSendMessage(messageText)}
                className="bg-primary hover:bg-primary-container text-white p-2.5 rounded-xl flex items-center justify-center shrink-0 shadow-md cursor-pointer duration-150 border border-primary/20"
              >
                <Send className="w-4 h-4 text-accent" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
