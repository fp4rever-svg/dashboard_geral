import React, { useState, useEffect, useRef } from "react";
import { 
  Send, Bot, User, Trash2, Sparkles, Loader2, 
  ArrowRight, Database, X, Minimize2, Maximize2, RefreshCw, HelpCircle,
  FileDown, Printer
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
  const [streamingText, setStreamingText] = useState("");
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

      let fullText = "";

      if (response.body && typeof response.body.getReader === "function") {
        try {
          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunkText = decoder.decode(value, { stream: true });
            fullText += chunkText;
            setStreamingText(fullText); // Display it progressively
          }
        } catch (streamErr) {
          console.warn("Streaming read failed, falling back to full text:", streamErr);
          // Fallback to text reading if stream fails mid-way
          fullText = await response.text();
        }
      } else {
        // Fallback for environments with standard buffered responses
        fullText = await response.text();
      }
      
      setStreamingText("");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: fullText.trim() || "Sem resposta compreensível."
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

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, habilite permissões de pop-up no seu navegador para exportar o relatório em PDF.");
      return;
    }

    const formattedMessages = messages
      .map((msg) => {
        const isUser = msg.role === "user";
        const sender = isUser ? "Gestor / Operador CD" : "Assistente de Inteligência Logística (Gemini AI)";
        const bg = isUser ? "bg-slate-50 border-slate-200" : "bg-blue-50/20 border-blue-100";
        const senderText = isUser ? "text-slate-700" : "text-blue-700 font-extrabold";
        
        let contentHtml = msg.content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br/>');

        return `
          <div class="p-4 rounded-2xl border ${bg} mb-4 shadow-sm break-inside-avoid">
            <span class="block text-[10px] font-black uppercase tracking-wider ${senderText} mb-1.5">${sender}</span>
            <div class="text-xs text-slate-850 leading-relaxed">${contentHtml}</div>
          </div>
        `;
      })
      .join("");

    const currentDateStr = new Date().toLocaleString("pt-BR", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const isTvMode = localStorage.getItem('tv_mode_selected_tabs') ? "Configuração Ativa" : "Padrão de Sistema";
    const currentProd = localStorage.getItem('simulation_productivity') || "150";
    const currentPenalty = localStorage.getItem('simulation_rec_falta_penalty') || "10";

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Operacional de CD - Inteligência Logística</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            background: #ffffff;
            color: #1e293b;
          }
          .title-font {
            font-family: 'Space Grotesk', sans-serif;
          }
          .mono-font {
            font-family: 'JetBrains Mono', monospace;
          }
          @media print {
            body {
              background: white;
              font-size: 11px;
              color: #000000;
            }
            .no-print {
              display: none;
            }
            .page-break {
              page-break-before: always;
            }
            .break-inside-avoid {
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body class="p-8 max-w-4xl mx-auto space-y-6">
        
        <!-- Print Trigger Bar (Non-printable) -->
        <div class="no-print bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center mb-6 shadow-xl border border-slate-700">
          <div>
            <h3 class="text-xs font-black uppercase tracking-wider text-amber-400">📄 Relatório de IA Formatado</h3>
            <p class="text-xs text-slate-400 font-medium">Pronto para imprimir ou salvar como arquivo PDF.</p>
          </div>
          <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white font-black py-2 px-5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">
            Confirmar e Salvar PDF
          </button>
        </div>

        <!-- Executive Header -->
        <div class="flex justify-between items-start border-b border-slate-200 pb-5">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded">CD CENTRAL OPERAÇÃO</span>
              <p class="text-[9px] text-slate-400 font-bold tracking-wider uppercase">LÍDER DE INTELIGÊNCIA OPERACIONAL</p>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight title-font uppercase">Relatório de Recomendações e Análises Logísticas</h1>
            <p class="text-xs text-slate-500 font-medium leading-relaxed max-w-xl">
              Análise tática para monitoramento de faturamento, metas horárias baseadas em coeficientes parametrizados e indicadores de absenteísmo consolidado por setor.
            </p>
          </div>
          <div class="text-right space-y-1 shrink-0">
            <span class="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Data de Emissão</span>
            <span class="block text-xs font-bold text-slate-800 mono-font">${currentDateStr}</span>
            <span class="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[9px] rounded-full border border-emerald-100 uppercase tracking-wide">Documento Autenticado</span>
          </div>
        </div>

        <!-- Operating Parameters Panel -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <span class="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Produtividade Alvo</span>
            <span class="text-sm font-extrabold text-slate-900 mono-font">${currentProd} caixas / hora</span>
          </div>
          <div>
            <span class="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Penalidade Rec Falta</span>
            <span class="text-sm font-extrabold text-slate-900 mono-font">+${currentPenalty} minutos / falta</span>
          </div>
          <div>
            <span class="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Filtro de Rotação CD</span>
            <span class="text-sm font-extrabold text-slate-950">${isTvMode}</span>
          </div>
        </div>

        <!-- GRAPHICS AND IMAGES OF THE REPORTS (KPIs Visuais com SVG Premium) -->
        <div class="space-y-4">
          <h2 class="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            📊 Gráficos Operacionais Correntes (Reports do CD)
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <!-- Graphic 1: Absenteísmo de Hoje por Setor -->
            <div class="border border-slate-200 p-4 rounded-2xl bg-white space-y-3 shadow-xs break-inside-avoid">
              <div>
                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Presença Operacional vs. Absenteísmo</h4>
                <p class="text-[10px] text-slate-400 font-medium">Proporção de ausências registradas por setor principal do Armazém.</p>
              </div>
              
              <!-- SVG Bar Chart -->
              <svg viewBox="0 0 400 180" class="w-full h-auto">
                <line x1="80" y1="20" x2="380" y2="20" stroke="#f1f5f9" stroke-width="1" />
                <line x1="80" y1="55" x2="380" y2="55" stroke="#f1f5f9" stroke-width="1" />
                <line x1="80" y1="90" x2="380" y2="90" stroke="#f1f5f9" stroke-width="1" />
                <line x1="80" y1="125" x2="380" y2="125" stroke="#f1f5f9" stroke-width="1" />
                
                <text x="10" y="38" font-size="10" font-weight="bold" fill="#334155" font-family="'Inter', sans-serif">Separação</text>
                <text x="10" y="73" font-size="10" font-weight="bold" fill="#334155" font-family="'Inter', sans-serif">Conferência</text>
                <text x="10" y="108" font-size="10" font-weight="bold" fill="#334155" font-family="'Inter', sans-serif">Embalagem</text>
                <text x="10" y="143" font-size="10" font-weight="bold" fill="#334155" font-family="'Inter', sans-serif">Expedição</text>
                
                <!-- Separação Range (6.8% - Crítico Red) -->
                <rect x="80" y="28" width="300" height="12" rx="4" fill="#f8fafc" />
                <rect x="80" y="28" width="220" height="12" rx="4" fill="#ef4444" />
                <text x="310" y="38" font-size="10" font-weight="bold" fill="#b91c1c" font-family="'JetBrains Mono', monospace">6.8% (Crítico)</text>
                
                <!-- Conferência (2.3% - Normal Emerald) -->
                <rect x="80" y="63" width="300" height="12" rx="4" fill="#f8fafc" />
                <rect x="80" y="63" width="110" height="12" rx="4" fill="#10b981" />
                <text x="200" y="73" font-size="10" font-weight="bold" fill="#047857" font-family="'JetBrains Mono', monospace">2.3% (Normal)</text>
                
                <!-- Embalagem (4.2% - Atenção Amber) -->
                <rect x="80" y="98" width="300" height="12" rx="4" fill="#f8fafc" />
                <rect x="80" y="98" width="165" height="12" rx="4" fill="#f59e0b" />
                <text x="255" y="108" font-size="10" font-weight="bold" fill="#b45309" font-family="'JetBrains Mono', monospace">4.2% (Alerta)</text>
                
                <!-- Expedição (1.8% - Controlado Emerald) -->
                <rect x="80" y="133" width="300" height="12" rx="4" fill="#f8fafc" />
                <rect x="80" y="133" width="75" height="12" rx="4" fill="#10b981" />
                <text x="165" y="143" font-size="10" font-weight="bold" fill="#047857" font-family="'JetBrains Mono', monospace">1.8% (Normal)</text>

                <line x1="80" y1="15" x2="80" y2="160" stroke="#cbd5e1" stroke-width="2" />
              </svg>
            </div>

            <!-- Graphic 2: Produtividade Horária vs Meta -->
            <div class="border border-slate-200 p-4 rounded-2xl bg-white space-y-3 shadow-xs break-inside-avoid">
              <div>
                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Produtividade por Turno (UPM)</h4>
                <p class="text-[10px] text-slate-400 font-medium">Acompanhamento do processamento real em caixas por homem-hora contra meta.</p>
              </div>

              <!-- SVG Line/Area Graph -->
              <svg viewBox="0 0 400 180" class="w-full h-auto">
                <line x1="40" y1="130" x2="380" y2="130" stroke="#f1f5f9" stroke-width="1" />
                <line x1="40" y1="90" x2="380" y2="90" stroke="#f1f5f9" stroke-width="1" />
                <line x1="40" y1="50" x2="380" y2="50" stroke="#f1f5f9" stroke-width="1" />
                
                <line x1="40" y1="90" x2="380" y2="90" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4 4" />
                <text x="310" y="84" font-size="9" font-weight="bold" fill="#2563eb" font-family="'Inter', sans-serif">META: 150 cx/h</text>
                
                <path d="M 40,140 Q 90,110 140,85 T 240,65 T 340,80 L 340,150 L 40,150 Z" fill="rgba(16, 185, 129, 0.08)" />
                <path d="M 40,140 Q 90,110 140,85 T 240,65 T 340,80" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" />
                
                <circle cx="140" cy="85" r="4.5" fill="#ffffff" stroke="#10b981" stroke-width="2.5" />
                <circle cx="240" cy="65" r="4.5" fill="#ffffff" stroke="#10b981" stroke-width="2.5" />
                <circle cx="340" cy="80" r="4.5" fill="#ffffff" stroke="#10b981" stroke-width="2.5" />
                
                <text x="130" y="75" font-size="9" font-weight="black" fill="#047857" font-family="'JetBrains Mono', monospace">162</text>
                <text x="230" y="55" font-size="9" font-weight="black" fill="#047857" font-family="'JetBrains Mono', monospace">185</text>
                <text x="330" y="70" font-size="9" font-weight="black" fill="#047857" font-family="'JetBrains Mono', monospace">170</text>
                
                <text x="35" y="165" font-size="8" font-weight="bold" fill="#64748b" font-family="'Inter', sans-serif">08h-11h</text>
                <text x="125" y="165" font-size="8" font-weight="bold" fill="#64748b" font-family="'Inter', sans-serif">11h-14h</text>
                <text x="225" y="165" font-size="8" font-weight="bold" fill="#64748b" font-family="'Inter', sans-serif">14h-17h</text>
                <text x="325" y="165" font-size="8" font-weight="bold" fill="#64748b" font-family="'Inter', sans-serif">17h-20h</text>

                <line x1="40" y1="15" x2="40" y2="152" stroke="#cbd5e1" stroke-width="2" />
                <line x1="38" y1="150" x2="380" y2="150" stroke="#cbd5e1" stroke-width="2" />
              </svg>
            </div>

          </div>
        </div>

        <!-- Conversation Transcription (With explicit break protection) -->
        <div class="page-break pt-6 space-y-4">
          <h2 class="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            🤖 Transcrição do Histórico de Recomendações da IA
          </h2>
          
          <div class="space-y-4 pt-1">
            ${formattedMessages}
          </div>
        </div>

        <!-- Sign-Off Area -->
        <div class="pt-16 border-t border-slate-150 flex justify-between items-end text-xs text-slate-400 font-semibold gap-10 break-inside-avoid">
          <div>
            <p>Gerado e formatado eletronicamente por meio do Agente de Inteligência Logística Integrada.</p>
            <p class="mt-1">© 2026 Central de Operações de Distribuição S.A. Todos os direitos reservados.</p>
          </div>
          <div class="text-center w-64 border-t border-slate-300 pt-3 shrink-0">
            <span class="block text-slate-800 font-bold uppercase text-[10px] tracking-wider">Assinatura do Responsável Logístico</span>
            <span class="block text-[9px] text-slate-400 mt-1 font-medium">CD Central de Operações</span>
          </div>
        </div>

        <!-- Automatically invoke print on window load -->
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
                  onClick={handleExportPDF}
                  className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  title="Exportar PDF com Imagens"
                >
                  <FileDown className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  title="Limpar Conversa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
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
                <div className="flex gap-2.5 max-w-[88%] mr-auto">
                  <div className="p-2 rounded-xl bg-blue-600 border border-blue-500 text-white shrink-0 h-8 w-8 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-amber-300 animate-spin" />
                  </div>
                  <div className="p-3 bg-white border border-slate-200 text-slate-850 rounded-2xl rounded-tl-none shadow-sm flex flex-col gap-2 font-medium text-xs leading-relaxed">
                    {streamingText ? (
                      streamingText.split("\n").map((para, i) => {
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
                      })
                    ) : (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                        <span className="text-[10px] font-bold tracking-tight uppercase text-slate-400">Consultando regras...</span>
                      </div>
                    )}
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
