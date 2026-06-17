import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Trash2, Plus, Search, Database, UploadCloud, 
  CheckCircle, AlertCircle, Loader2, Sparkles, HelpCircle 
} from "lucide-react";
import { collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { motion, AnimatePresence } from "motion/react";

// Helper hook to dynamically fetch & initialize PDF.js client-side
const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib || (window as any)["pdfjs-dist/build/pdf"];
      if (!pdfjsLib) {
        reject(new Error("O motor de PDFJS não pôde ser inicializado no global global (window.pdfjsLib está indefinido)."));
        return;
      }
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        resolve(pdfjsLib);
      } catch (e: any) {
        // Fallback if workerSrc cannot be set
        console.warn("Could not set workersrc directly:", e);
        resolve(pdfjsLib);
      }
    };
    script.onerror = () => reject(new Error("Falha ao carregar o motor de PDF do servidor CDN."));
    document.head.appendChild(script);
  });
};

interface AIDocument {
  id: string;
  title: string;
  fileName: string;
  content: string;
  category: string;
  uploadedBy: string;
  createdAt: string;
}

export function AIBaseManagementView() {
  const [documents, setDocuments] = useState<AIDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // New Document form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Geral");
  const [fileName, setFileName] = useState("Inserção Manual");
  const [extractionProgress, setExtractionProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories list
  const categories = ["Geral", "Conferência", "Separação", "Logística"];

  // Real-time Firestore sync of the Operations AI Knowledge Base
  useEffect(() => {
    const q = query(collection(db, "ai_knowledge_base"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData: AIDocument[] = [];
      snapshot.forEach((snapDoc) => {
        docsData.push({ id: snapDoc.id, ...snapDoc.data() } as AIDocument);
      });
      setDocuments(docsData);
      setLoading(false);
    }, (err) => {
      console.error("Firestore AI knowledge snapshot fail:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle local text or binary file reading
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage("");
    setSuccessMessage("");
    setExtractionProgress(0);
    setFileName(file.name);
    if (!title) {
      // Auto fill title with pretty filename
      const defaultTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-]/g, " ");
      setTitle(defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1));
    }

    try {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        // Load PDF.js engine and parse pages asynchronously
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const pdfjsLib = await loadPdfJs();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            
            let extractedText = "";
            const pageCount = pdf.numPages;

            for (let i = 1; i <= pageCount; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(" ");
              extractedText += `\n--- [PÁGINA ${i}] ---\n${pageText}\n`;
              setExtractionProgress(Math.floor((i / pageCount) * 100));
            }

            setContent(extractedText.trim());
            setSuccessMessage(`PDF lido com sucesso (${pageCount} páginas!). Reveja o texto gerado abaixo.`);
            setExtractionProgress(null);
          } catch (err: any) {
            console.error("Error extracting PDF pages:", err);
            setErrorMessage("Falha ao ler páginas do PDF. Verifique se o arquivo não está protegido ou corrompido.");
            setExtractionProgress(null);
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
        // General text files can be read immediately using FileReader
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setContent(text);
          setSuccessMessage("Arquivo de texto lido com sucesso! Reveja ou edite o conteúdo gerado antes de salvar.");
          setExtractionProgress(null);
        };
        reader.readAsText(file);
      } else {
        setErrorMessage("Formato de arquivo não suportado. Por favor, arraste um PDF ou arquivo .txt de texto.");
        setExtractionProgress(null);
      }
    } catch (err: any) {
      setErrorMessage("Erro inesperado ao indexar o arquivo local.");
      setExtractionProgress(null);
    }
  };

  // Upload parsed text block to Firestore Database
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMessage("Por favor, informe o título e o conteúdo textual do documento.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const emailUploader = "fp4rever@gmail.com"; // Admin email
      await addDoc(collection(db, "ai_knowledge_base"), {
        title: title.trim(),
        fileName: fileName,
        content: content.trim(),
        category: category,
        uploadedBy: emailUploader,
        createdAt: new Date().toISOString()
      });

      setSuccessMessage(`Documento "${title}" adicionado e indexado na Base IA com sucesso!`);
      // Reset form fields
      setTitle("");
      setContent("");
      setFileName("Inserção Manual");
      setCategory("Geral");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Firestore AI insert error:", err);
      setErrorMessage("Erro ao persistir documento no banco de dados.");
    } finally {
      setSaving(false);
    }
  };

  // Delete document entry from Firestore
  const handleDelete = async (id: string, docTitle: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar o manual operacioal "${docTitle}"?`)) return;

    try {
      await deleteDoc(doc(db, "ai_knowledge_base", id));
      setSuccessMessage(`Documento "${docTitle}" deletado com sucesso.`);
    } catch (err) {
      console.error("Delete doc failed:", err);
      setErrorMessage("Erro ao excluir o documento selecionado.");
    }
  };

  // Local filter
  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.content.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      doc.fileName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6" id="ai-base-management">
      {/* Dynamic Notifications Banner */}
      <AnimatePresence mode="wait">
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm font-bold shadow-sm"
          >
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 animate-bounce" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-bold shadow-sm"
          >
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Document ingestion form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Carregar Regras & PDFs</h2>
              <p className="text-xs text-slate-400">Insira as instruções, metas e regras operacionais para a IA.</p>
            </div>
          </div>

          {/* Local File Picker Drag-and-drop box */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Upload de Manual / Diretriz</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-slate-50/50 group"
            >
              <input 
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".txt,.csv,.pdf"
                onChange={handleFileChange}
              />
              <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-blue-500 mx-auto mb-2 transition-colors" />
              <p className="text-xs font-bold text-slate-600 group-hover:text-blue-600">Arraste ou clique para selecionar PDF, TXT ou CSV</p>
              <p className="text-[10px] text-slate-400 mt-1">Nós iremos transcrever e formatar o conteúdo para você em segundos.</p>
            </div>
          </div>

          {/* Process bar for extraction */}
          {extractionProgress !== null && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> Extraindo texto do PDF...</span>
                <span>{extractionProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${extractionProgress}%` }} />
              </div>
            </div>
          )}

          {/* Document configuration form */}
          <form onSubmit={handleSaveDocument} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Título de Referência</label>
              <input 
                type="text"
                placeholder="Ex: Padrão Operacional de Separação - Noite"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-850 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Categoria de IA</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-400"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Origem do Arquivo</label>
                <div className="w-full px-4 py-3 bg-slate-100/80 border border-slate-200 text-slate-500 tracking-tight rounded-xl text-xs font-bold truncate">
                  {fileName}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Conteúdo Textual Indexado</label>
              <textarea 
                placeholder="Insira as metas operacionais por hora, regras de layout de paletes, procedimentos de retrabalho ou copie e cole qualquer texto aqui..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-850 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 resize-none font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-850 transition-all font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando na Base...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Salvar e Indexar Documento
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Indexed entries preview & search */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                Base Ativa de Conhecimento
              </h2>
              <p className="text-xs text-slate-400">Total de {documents.length} manuais/documentos indexados na nuvem.</p>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p className="text-xs font-bold">Carregando base de dados Firestore...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl object-cover bg-slate-50/40 p-8">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-600 uppercase">Nenhum Documento Encontrado</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Insira documentos de metas operacionais ou faça upload de manuais logísticos à esquerda para começar.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-2">
              {filteredDocs.map((doc) => (
                <div 
                  key={doc.id}
                  className="p-4 bg-slate-50 border border-slate-150 rounded-2xl hover:border-slate-300 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="space-y-2 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="p-1 px-2.5 bg-blue-50 border border-blue-200 text-blue-700 font-extrabold rounded-lg text-[9px] uppercase tracking-wide">
                        {doc.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono tracking-wider truncate max-w-[160px]">
                        {doc.fileName}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{doc.title}</h4>
                      {/* Truncated block preview */}
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-1 leading-normal">
                        {doc.content}
                      </p>
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold">
                      Cadastrado em: {new Date(doc.createdAt).toLocaleDateString("pt-BR")} às {new Date(doc.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} • {doc.content.length.toLocaleString()} caracteres
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="p-2 border border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-lg transition-colors self-end sm:self-center"
                    title="Excluir documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
