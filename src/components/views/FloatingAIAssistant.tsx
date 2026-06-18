import React, { useState, useEffect, useRef } from "react";
import { 
  Send, Bot, User, Trash2, Sparkles, Loader2, 
  ArrowRight, Database, X, Minimize2, Maximize2, RefreshCw, HelpCircle
} from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

interface AIDocument {
  id: string;
  title: string;
  fileName: string;
  content: string;
  category: string;
}

export default function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("ai_assistant_chat");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [
      {
        role: "assistant",
        content: `**Olá! Sou seu Assistente de Operações e Inteligência Logística.** 🦾🤖

Estou aqui para esclarecer qualquer dúvida de processos, metas operacionais ou fluxos de depósitos.

Nossa base de conhecimento utiliza os manuais e regras oficiais cadastrados na sua **Base de Conhecimento** no painel administrativo. O que você gostaria de consultar hoje?`
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<AIDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [absenteeismData, setAbsenteeismData] = useState<any[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Suggeston templates matching real logistics contexts and live data analysis
  const suggestionCards = [
    { title: "📊 Análise de Faltas", prompt: "Faça uma análise detalhada sobre o absenteísmo registrado hoje. Quais setores/líderes estão críticos (acima de 5%) e o que recomenda fazer?" },
    { title: "👤 Líder mais Crítico", prompt: "Qual líder de setor possui a maior taxa de absenteísmo hoje na central de controle?" },
    { title: "🕒 Regra de Turno", prompt: "Qual o horário limite para virada de turno operacional que o sistema considera nas análises diárias?" },
  ];

  // Auto scroll
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, loading, isOpen]);

  // Save conversation state
  useEffect(() => {
    localStorage.setItem("ai_assistant_chat", JSON.stringify(messages));
  }, [messages]);

  // Sync real-time absenteeism data for analytical prompt forwarding
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "absenteeism"), (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ setor: doc.id, ...doc.data() });
      });
      setAbsenteeismData(data);
    }, (err) => {
      console.warn("Could not sync absenteeism context for AI assistant:", err);
    });
    return () => unsubscribe();
  }, []);

  // Sync knowledge base doc assets
  useEffect(() => {
    const q = query(collection(db, "ai_knowledge_base"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData: AIDocument[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        docsData.push({
          id: doc.id,
          title: d.title || "",
          fileName: d.fileName || "",
          content: d.content || "",
          category: d.category || ""
        });
      });
      setDocuments(docsData);
      setDocumentsLoading(false);
    }, (err) => {
      console.error("Firestore AI knowledge sync error on floating bubble:", err);
      setDocumentsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Show friendly tooltip briefly on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = async (msgText: string) => {
    if (!msgText.trim() || loading) return;

    const userMsg: Message = { role: "user", content: msgText.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages
        })
      });

      // Handle non-OK status codes first by inspecting the raw text
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Algo deu errado durante a consulta.";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || `Erro no servidor (Código: ${response.status})`;
        }
        throw new Error(errorMessage);
      }

      // The server now streams back plain text to prevent idle timeouts
      const rawText = await response.text();
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: rawText || "Sem resposta compreensível."
      }]);
    } catch (err: any) {
      console.error("Error calling backend Gemini proxy:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ **Erro ao consultar a Inteligência:**\n\n${err.message || "Erro de conexão com o servidor de proxy da IA. Sua chave API do Gemini precisa estar configurada nos segredos."}`,
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    const initialText: Message = {
      role: "assistant",
      content: `**Olá! Sou seu Assistente de Operações e Inteligência Logística.** 🦾🤖\n\nEstou pronto para ajudar! Envie qualquer dúvida operacional ou clique em uma sugestão abaixo.`
    };
    setMessages([initialText]);
    setShowClearConfirm(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" id="floating-ai-assistant-wrapper">
      {/* Dynamic Pop-up Tooltip when collapsed */}
      <AnimatePresence>
        {!isOpen && showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-20 right-2 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700/50 max-w-[220px] text-[11px] font-black tracking-wide leading-normal uppercase text-center"
          >
            <div className="absolute right-6 bottom-[-6px] w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-slate-700/50" />
            <span className="flex items-center gap-1.5 justify-center text-amber-300">
              <Sparkles className="w-3.5 h-3.5" /> DÚVIDAS OPERACIONAIS?
            </span>
            <p className="text-slate-300 font-medium normal-case mt-1 text-[10.5px]">
              Clique aqui para me perguntar regras e manuais!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Dynamic helicoidal character button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center relative cursor-pointer overflow-hidden transition-all duration-300 ${
          isOpen ? "bg-slate-900 border-2 border-slate-700 ring-4 ring-slate-900/10" : "bg-[#0b1d33] hover:ring-4 hover:ring-blue-500/20"
        }`}
        title="Assistente de Operações Logísticas"
        id="helical-assistant-floating-btn"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close-icon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6 text-slate-300" />
            </motion.div>
          ) : (
            <motion.div
              key="helical-icon"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex items-center justify-center"
            >
              {/* Helical Spiral vector replicating the custom orange/blue spiral ribbon inside a dark glossy badge */}
              <svg 
                viewBox="0 0 100 100" 
                className="w-[85%] h-[85%] animate-pulse"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Premium Gradation Shading corresponding directly to visual attachment representation */}
                  <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="40%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                  
                  <linearGradient id="orangeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="60%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>

                  <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="80%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>

                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* S-shaped winding 3D ribbon rendering */}
                {/* Loop Backing Shadow */}
                <path 
                  d="M 50,15 C 75,18 80,38 52,43 C 25,48 20,68 48,82 C 72,90 85,80 82,75" 
                  fill="none" 
                  stroke="#081020" 
                  strokeWidth="11" 
                  strokeLinecap="round" 
                  opacity="0.4"
                />

                {/* Upper Loop segment (Blue/Teal) */}
                <path 
                  d="M 50,15 C 75,18 80,38 52,43 C 35,46 25,55 25,62" 
                  fill="none" 
                  stroke="url(#skyGrad)" 
                  strokeWidth="12" 
                  strokeLinecap="round" 
                  filter="url(#glow)"
                />

                {/* Middle transitioning spiral fold loop (Orange/Red) representing the front-facing helix curve */}
                <path 
                  d="M 45,38 C 55,40 70,45 68,58 C 65,70 45,75 35,70" 
                  fill="none" 
                  stroke="url(#orangeGrad)" 
                  strokeWidth="12" 
                  strokeLinecap="round"
                />

                {/* Lower backing loop (Royal Blue) */}
                <path 
                  d="M 28,58 C 24,68 35,80 50,82 C 68,85 78,75 75,70" 
                  fill="none" 
                  stroke="url(#blueGrad)" 
                  strokeWidth="11" 
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic status badge marker */}
        {!isOpen && documents.length > 0 && (
          <div className="absolute top-1 right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0b1d33] animate-ping" />
        )}
      </motion.button>

      {/* Floating sliding drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="absolute bottom-16 right-0 w-[92vw] sm:w-[440px] h-[80vh] max-h-[640px] bg-white rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col z-[10000]"
          >
            {/* Drawer Header with helical logo reference */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center p-0.5">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M 50,15 C 75,18 80,38 52,43 C 25,48 20,68 48,82" fill="none" stroke="url(#skyGrad)" strokeWidth="12" strokeLinecap="round" />
                    <path d="M 45,38 C 55,40 70,45 68,58 C 65,70 45,75" fill="none" stroke="url(#orangeGrad)" strokeWidth="12" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1">
                    Assistente Operacional
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  </h3>
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span>{documentsLoading ? "Sincronizando..." : `${documents.length} Manuais Lidos`}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-all"
                  title="Limpar Conversa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrolling Chat Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/55 scrollbar-thin">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={index}
                    className={`flex gap-2.5 max-w-[88%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 h-8 w-8 flex items-center justify-center border ${
                      isUser 
                        ? "bg-slate-900 border-slate-900 text-white" 
                        : msg.isError 
                          ? "bg-rose-50 border-rose-250 text-rose-500" 
                          : "bg-blue-600 border-blue-500 text-white"
                    }`}>
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-amber-300" />}
                    </div>

                    <div className={`p-3.5 rounded-2xl text-xs leading-relaxed space-y-1.5 border shadow-2xs ${
                      isUser 
                        ? "bg-slate-900 border-slate-900 text-white rounded-tr-none font-bold" 
                        : msg.isError 
                          ? "bg-rose-50 border-rose-150 text-rose-900 rounded-tl-none font-medium" 
                          : "bg-white border-slate-200 text-slate-850 rounded-tl-none font-medium"
                    }`}>
                      {msg.content.split("\n").map((para, i) => {
                        if (!para.trim()) return <div key={i} className="h-1.5" />;
                        
                        let renderedText: React.ReactNode = para;
                        if (para.includes("**")) {
                          const parts = para.split("**");
                          renderedText = parts.map((part, idx) => (
                            idx % 2 === 1 ? <strong key={idx} className="font-extrabold text-blue-600">{part}</strong> : part
                          ));
                        }

                        return (
                          <p key={i} className="whitespace-pre-line tracking-wide">
                            {renderedText}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-2.5 max-w-[85%] mr-auto">
                  <div className="p-2 rounded-xl bg-blue-600 border border-blue-500 text-white shrink-0 h-8 w-8 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-amber-300 animate-spin" />
                  </div>
                  <div className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    <span className="text-[10px] font-bold tracking-tight uppercase">Consultando regras...</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Quick Suggestion Pills */}
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
              {suggestionCards.map((pill, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(pill.prompt)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:border-blue-500 hover:bg-blue-50 text-[10px] font-bold text-slate-650 transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1"
                >
                  <span>{pill.title}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              ))}
            </div>

            {/* Footer Input Area */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputMessage);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Consulte regras de metas, conferência, etc..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || loading}
                  className="p-2.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 disabled:opacity-30 transition-all shadow-md shadow-slate-900/10"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Inner Modern Clear Chat Dialog layer */}
            <AnimatePresence>
              {showClearConfirm && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 text-center"
                >
                  <motion.div 
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    className="bg-white p-5 rounded-3xl max-w-xs w-full shadow-2xl border border-slate-200 space-y-4"
                  >
                    <div className="mx-auto w-10 h-10 bg-rose-50 border border-rose-200 text-rose-500 rounded-2xl flex items-center justify-center">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-800">Limpar Conversa?</h4>
                      <p className="text-[11px] text-slate-400 font-medium leading-normal mt-1">
                        Deseja esvaziar todo o histórico do assistente? Isso limpa a sua visualização local.
                      </p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={handleClearChat}
                        className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider shadow-md shadow-rose-600/10"
                      >
                        Limpar
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
