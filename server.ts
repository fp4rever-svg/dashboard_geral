import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

// Load environment variables for local testing
dotenv.config();

// Initialize Firebase on the server
let db: any = null;
try {
  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
  console.log("Firebase initialized successfully on server.");
} catch (err) {
  console.error("Failed to initialize Firebase on server:", err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON request parsing with high limit
  app.use(express.json({ limit: "15mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Secure proxy route for Gemini Chat with Server-Side context resolution
  app.post("/api/chat", async (req: express.Request, res: express.Response) => {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required." });
      }

      // Read key from backend environment
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: "A chave API do Gemini (GEMINI_API_KEY) não está configurada no servidor. Por favor, configure-a nas configurações." 
        });
      }

      let operationalData: any[] = [];
      let knowledgeDocuments: any[] = [];

      // Fetch Server-side Context from Firebase if available
      if (db) {
        try {
          console.time("Firestore Fetch Time");
          // Fetch Absenteism Real-time Data
          const absSnapshot = await getDocs(collection(db, "absenteeism"));
          absSnapshot.forEach((doc: any) => {
            operationalData.push({ setor: doc.id, ...doc.data() });
          });

          // Fetch Knowledge Base Documents
          const kbSnapshot = await getDocs(collection(db, "ai_knowledge_base"));
          kbSnapshot.forEach((doc: any) => {
            const d = doc.data();
            knowledgeDocuments.push({
              title: d.title || "",
              fileName: d.fileName || "",
              content: d.content || "",
              category: d.category || ""
            });
          });
          console.timeEnd("Firestore Fetch Time");
        } catch (fetchErr) {
          console.warn("⚠️ Failed to fetch live data from Firestore in /api/chat. Will proceed without context. Error:", fetchErr);
        }
      }

      console.log(`Starting Gemini API request. System Instruction size: ${knowledgeDocuments.length} docs, Operational data: ${operationalData.length} records.`);
      console.time("Gemini API Time");
      // Initialize Google GenAI client
      const ai = new GoogleGenAI({ apiKey });

      // Build powerful system instruction anchoring operational and guideline data
      let systemInstruction = `Você é o "Assistente de Operações e Inteligência da Logística", um consultor virtual altamente qualificado integrado à central de controle operacional.
Seu objetivo é ajudar a equipe logística, gerentes, supervisores e operadores de conferência e separação a esclarecer dúvidas operacionais com base nos documentos cadastrados e dados em tempo real da operação.

Diretrizes de resposta:
1. Responda em português de forma clara, prestativa e estruturada (use markdown com negritos e marcadores se necessário).
2. Se o usuário solicitar diagnósticos, análises ou informações sobre o absenteísmo operacional, utilize a seção de "DADOS OPERACIONAIS EM TEMPO REAL" abaixo para fazer análises completas, calcular percentuais, alertar sobre setores acima de 5% de absenteísmo e dar conselhos produtivos.
3. Priorize as regras de negócio escritas nos "Documentos Cadastrados" abaixo quando o usuário perguntar sobre manuais operacionais. Cite o título do manual correspondente se aplicável.
4. Se o usuário perguntar algo que NÃO está contemplado na base de dados ou manuais, você pode responder usando seu conhecimento de logística e WMS, deixando claro que se trata de uma recomendação geral de mercado.
5. Seja direto, evite floreios ou respostas excessivamente longas.

--- DADOS OPERACIONAIS EM TEMPO REAL (FALTAS E PRESENÇA DE HOJE) ---
`;

      if (operationalData && Array.isArray(operationalData) && operationalData.length > 0) {
        systemInstruction += `Os dados abaixo refletem a escala de equipe, faltas e presenças ativas na operação atual (integrados automaticamente da planilha e banco de dados):\n\n`;
        
        let totalFaltas = 0;
        let totalTotal = 0;

        operationalData.forEach((row: any) => {
          let leader = "Não Definido";
          if (row.setor === 'Conferencia') leader = 'Lais';
          else if (row.setor === 'Expedição') leader = 'Renato';
          else if (row.setor === 'Separação') leader = 'Elisangela';
          else if (row.setor === 'Controlados') leader = 'Tiago';
          else if (row.setor === 'Padrão') leader = 'Leticia';
          else if (row.setor === 'A-frame') leader = 'A-FRAME';

          const faltas = row.faltas || 0;
          const total = row.total || 0;
          const pct = total > 0 ? ((faltas / total) * 100).toFixed(2) : "0.00";

          totalFaltas += faltas;
          totalTotal += total;

          systemInstruction += `- SETOR: ${row.setor} | LÍDER: ${leader} | Faltas: ${faltas} | Total Escalado: ${total} | Absenteísmo: ${pct}%\n`;
        });

        const generalPct = totalTotal > 0 ? ((totalFaltas / totalTotal) * 100).toFixed(2) : "0.00";
        systemInstruction += `\n* RESUMO TOTAL OPERACIONAL DE HOJE:\n- Total de Faltas Geral: ${totalFaltas} colaboradores ausentes\n- Total de Efetivo Programado: ${totalTotal} colaboradores escalados\n- Taxa de Absenteísmo Geral da Operação: ${generalPct}% (Alerta de criticidade se estiver acima de 5%)\n\n`;
      } else {
        systemInstruction += `Nenhum dado ativo de absenteísmo foi importado ou inserido para o dia atual até o momento.\n\n`;
      }

      systemInstruction += `\nDocumentos Cadastrados na Base de Conhecimento:\n`;

      if (knowledgeDocuments && Array.isArray(knowledgeDocuments) && knowledgeDocuments.length > 0) {
        knowledgeDocuments.forEach((doc: any, index: number) => {
          systemInstruction += `\n--- [DOCUMENTO ${index + 1}]: ${doc.title} ---`;
          if (doc.category) {
            systemInstruction += `\nCategoria: ${doc.category}`;
          }
          if (doc.fileName) {
            systemInstruction += `\nArquivo original: ${doc.fileName}`;
          }
          systemInstruction += `\nConteúdo:\n${doc.content}\n-----------------------------\n`;
        });
      } else {
        systemInstruction += "\n[Atenção]: Nenhum documento ou PDF manual foi cadastrado pela equipe ainda na base de conhecimento.\n";
      }

      // Map incoming conversation to Google GenAI schema format
      const contents = messages.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

      // Call Gemini 3.5 Flash
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.25, // Lower temperature reduces hallucination and boosts precision on manual/PDF lookups
        }
      });
      console.timeEnd("Gemini API Time");

      return res.json({
        text: response.text || "Sem resposta retornada pelo modelo."
      });
    } catch (err: any) {
      console.error("Erro na API Gemini:", err);
      return res.status(500).json({ 
        error: err.message || "Erro desconhecido ao processar a requisição com o assistente de inteligência." 
      });
    }
  });

  // Vite development middleware vs Static Production bundle
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server linked as middleware.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production files from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
