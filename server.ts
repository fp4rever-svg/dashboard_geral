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
      let productionAnalyticsData: any[] = [];
      let logisticsData: any[] = [];
      let userPerformanceData: any[] = [];
      let announcementsData: any[] = [];

      // Fetch Server-side Context from Firebase if available
      if (db) {
        try {
          console.time("Firestore Fetch Time");
          const [
            absSnapshot,
            kbSnapshot,
            prodSnapshot,
            logSnapshot,
            userSnapshot,
            annSnapshot
          ] = await Promise.all([
            getDocs(collection(db, "absenteeism")),
            getDocs(collection(db, "ai_knowledge_base")),
            getDocs(collection(db, "production_analytics")),
            getDocs(collection(db, "logistics_data")),
            getDocs(collection(db, "user_performance")),
            getDocs(collection(db, "announcements"))
          ]);

          absSnapshot.forEach((doc: any) => {
            operationalData.push({ setor: doc.id, ...doc.data() });
          });

          kbSnapshot.forEach((doc: any) => {
            const d = doc.data();
            knowledgeDocuments.push({
              title: d.title || "",
              fileName: d.fileName || "",
              content: d.content || "",
              category: d.category || ""
            });
          });

          prodSnapshot.forEach((doc: any) => {
            productionAnalyticsData.push({ id: doc.id, ...doc.data() });
          });

          logSnapshot.forEach((doc: any) => {
            logisticsData.push({ rotas: doc.id, ...doc.data() });
          });

          userSnapshot.forEach((doc: any) => {
            userPerformanceData.push({ id: doc.id, ...doc.data() });
          });

          annSnapshot.forEach((doc: any) => {
            announcementsData.push({ id: doc.id, ...doc.data() });
          });

          console.timeEnd("Firestore Fetch Time");
        } catch (fetchErr) {
          console.warn("⚠️ Failed to fetch live data from Firestore in /api/chat. Will proceed without context. Error:", fetchErr);
        }
      }

      console.log(`Starting Gemini API request. System Instruction sizes - Docs: ${knowledgeDocuments.length}, Abs: ${operationalData.length}, Prod: ${productionAnalyticsData.length}, Log: ${logisticsData.length}`);
      console.time("Gemini API Time");
      // Initialize Google GenAI client
      const ai = new GoogleGenAI({ apiKey });

      // Build powerful system instruction anchoring operational and guideline data
      let systemInstruction = `Você é o "Assistente de Operações e Inteligência da Logística", um consultor virtual altamente qualificado integrado à central de controle operacional.
Seu objetivo é ajudar a equipe logística, gerentes, supervisores e operadores de conferência e separação a esclarecer dúvidas operacionais, realizar diagnósticos cruzados e propor soluções táticas baseando-se em TODAS as abas e dados ativos no sistema em tempo real.

Diretrizes de resposta:
1. Responda em português de forma clara, prestativa e estruturada (use markdown com negritos e marcadores se necessário).
2. Se o usuário solicitar diagnósticos, análises ou informações sobre qualquer uma das abas (Desempenho Operacional, Logística Analytics, Absenteísmo, Comunicados, Metas/Produtividade), utilize os dados das respectivas seções abaixo para fazer análises completas, cruzamento de informações, cálculos e propor recomendações estratégicas fundamentadas.
3. Priorize as regras de negócio escritas nos "Documentos Cadastrados" abaixo quando o usuário perguntar sobre manuais operacionais. Cite o título do manual correspondente se aplicável.
4. Se o usuário perguntar algo que NÃO está contemplado na base de dados ou manuais, você pode responder usando seu conhecimento de logística e WMS, deixando claro que se trata de uma recomendação geral de mercado.
5. Seja direto, evite floreios ou respostas excessivamente longas.

--- DADOS OPERACIONAIS EM TEMPO REAL (ABA GESTÃO DE ABSENTEÍSMO) ---
`;

      if (operationalData && Array.isArray(operationalData) && operationalData.length > 0) {
        systemInstruction += `Os dados abaixo refletem a escala de equipe, faltas e presenças ativas na operação atual:\n\n`;
        
        let totalFaltas = 0;
        let totalTotal = 0;

        operationalData.forEach((row: any) => {
          let leader = "Não Definido";
          if (row.setor === 'Conferencia' || row.setor === 'Conferência') leader = 'Lais';
          else if (row.setor === 'Expedição' || row.setor === 'Expedição') leader = 'Renato';
          else if (row.setor === 'Separação' || row.setor === 'Separação') leader = 'Elisangela';
          else if (row.setor === 'Controlados') leader = 'Tiago';
          else if (row.setor === 'Padrão' || row.setor === 'Padrao') leader = 'Leticia';
          else if (row.setor === 'A-frame' || row.setor === 'A-Frame') leader = 'A-FRAME';

          const faltas = row.faltas || 0;
          const total = row.total || 0;
          const pct = total > 0 ? ((faltas / total) * 100).toFixed(2) : "0.00";

          totalFaltas += faltas;
          totalTotal += total;

          systemInstruction += `- SETOR: ${row.setor} | LÍDER: ${leader} | Faltas: ${faltas} | Total Escalado: ${total} | Taxa de Absenteísmo: ${pct}%\n`;
        });

        const generalPct = totalTotal > 0 ? ((totalFaltas / totalTotal) * 100).toFixed(2) : "0.00";
        systemInstruction += `\n* RESUMO TOTAL OPERACIONAL DE ABSENTEÍSMO:\n- Total de Faltas Geral: ${totalFaltas} colaboradores ausentes\n- Total de Efetivo Programado: ${totalTotal} colaboradores escalados\n- Taxa de Absenteísmo Geral da Operação: ${generalPct}% (Alerta de criticidade alta se estiver acima de 5%)\n\n`;
      } else {
        systemInstruction += `Nenhum dado ativo de absenteísmo foi detectado.\n\n`;
      }

      // Add Section 2: Production Analytics
      systemInstruction += `\n--- DADOS DE DESEMPENHO OPERACIONAL EM TEMPO REAL (ABA DESEMPENHO OPERACIONAL / VOLUMETRIA HORÁRIA) ---\n`;
      if (productionAnalyticsData && productionAnalyticsData.length > 0) {
        systemInstruction += `Contém a volumetria de produção registrada de hora em hora para Separação Manual, Separação automatizada (A-frame/ACS), Cubagem e Conferência:\n\n`;
        
        // Sort by order/time if available
        const sortedProd = [...productionAnalyticsData].sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
          return (a.hora || "").localeCompare(b.hora || "");
        });

        sortedProd.forEach((row: any) => {
          systemInstruction += `- HORA: ${row.hora || 'N/D'} | Separação Manual (UND): ${row.separaUND || '0'} | Conferência Fracionada (UND): ${row.cFrac || '0'} | Separação A-frame (ACS): ${row.separaACS || '0'} | Cubagem: ${row.cubagem || '0'}\n`;
        });
        
        let totalSeparaUND = 0;
        let totalCFrac = 0;
        let totalSeparaACS = 0;
        let totalCubagem = 0;
        sortedProd.forEach((row: any) => {
          totalSeparaUND += parseInt(row.separaUND || '0', 10) || 0;
          totalCFrac += parseInt(row.cFrac || '0', 10) || 0;
          totalSeparaACS += parseFloat(String(row.separaACS || '0').replace(',', '.')) || 0;
          totalCubagem += parseFloat(String(row.cubagem || '0').replace(',', '.')) || 0;
        });
        systemInstruction += `\n* TOTAIS ACUMULADOS DE HOJE NO PAINEL:\n- Total de Volume Separação Manual: ${totalSeparaUND} unidades (UND)\n- Total de Volume Conferência Fracionada: ${totalCFrac} unidades (UND)\n- Total de Volume Separação A-frame: ${totalSeparaACS.toFixed(2)} ACS\n- Total de Cubagem: ${totalCubagem.toFixed(2)}\n\n`;
      } else {
        systemInstruction += `Nenhum dado ativo de desempenho operacional/volumetria horária carregado.\n\n`;
      }

      // Add Section 3: Logistics Analytics (Routes)
      systemInstruction += `\n--- DADOS DE LOGÍSTICA E EXPEDIÇÃO EM TEMPO REAL (ABA SAÚDE DA OPERAÇÃO / EXPEDIÇÃO DE ROTAS) ---\n`;
      if (logisticsData && logisticsData.length > 0) {
        systemInstruction += `Contém o status atual das rotas coletoras, quantidade de documentos (NF/Pedidos) planejados (docsIniciais) e quantos restam carregar/faturar (docsAtuais):\n\n`;
        
        let totalDocsIniciais = 0;
        let totalDocsAtuais = 0;
        
        // Sort by route code
        const sortedLog = [...logisticsData].sort((a, b) => String(a.rotas || a.id || "").localeCompare(String(b.rotas || b.id || "")));
        sortedLog.forEach((row: any) => {
          const init = parseInt(row.docsIniciais || '0', 10) || 0;
          const current = parseInt(row.docsAtuais || '0', 10) || 0;
          const status = current === 0 ? 'Concluído/Faturado' : 'Pendente';
          totalDocsIniciais += init;
          totalDocsAtuais += current;

          systemInstruction += `- ROTA (CÓDIGO): ${row.rotas || row.id} | Documentos Planejados: ${init} | Documentos Pendentes Atuais: ${current} | Status: ${status}\n`;
        });

        const progress = totalDocsIniciais > 0 ? (((totalDocsIniciais - totalDocsAtuais) / totalDocsIniciais) * 100).toFixed(2) : "0.00";
        systemInstruction += `\n* RESUMO GERAL DAS ROTAS DE EXPEDIÇÃO:\n- Total Documentos Planejados: ${totalDocsIniciais}\n- Total Documentos Pendentes: ${totalDocsAtuais}\n- Progresso Geral de Liberação/Carregamento: ${progress}%\n\n`;
      } else {
        systemInstruction += `Nenhum dado de logística e expedição de rotas disponível no momento.\n\n`;
      }

      // Add Section 4: Announcements
      systemInstruction += `\n--- COMUNICADOS E AVISOS OPERACIONAIS EM TEMPO REAL (ABA COMUNICADOS OPERACIONAIS) ---\n`;
      if (announcementsData && announcementsData.length > 0) {
        announcementsData.forEach((row: any) => {
          systemInstruction += `- COMUNICADO: "${row.title || 'Sem título'}" | Data: ${row.date || 'N/A'} | Autor: ${row.author || 'N/A'} | Mensagem: ${row.message || ''}\n`;
        });
        systemInstruction += `\n`;
      } else {
        systemInstruction += `Nenhum comunicado ativo registrado.\n\n`;
      }

      // Add Section 5: User Performance
      systemInstruction += `\n--- INDICADORES DE PRODUTIVIDADE INDIVIDUAL (ABA INDICADORES DE PRODUTIVIDADE) ---\n`;
      if (userPerformanceData && userPerformanceData.length > 0) {
        userPerformanceData.forEach((row: any) => {
          systemInstruction += `- OPERADOR: ${row.name || 'N/D'} | Setor: ${row.sector || 'N/D'} | Produção Real: ${row.actual || '0'} | Meta: ${row.target || '0'} | Eficiência: ${row.efficiency || '0'}%\n`;
        });
        systemInstruction += `\n`;
      } else {
        systemInstruction += `Nenhum dado de desempenho ou ranking individual foi importado ou inserido até o momento.\n\n`;
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
      // Gemini expects the first message to be from the 'user' and roles to alternate.
      // We filter out any leading helper/welcome messages that are from 'assistant'
      let apiMessages = messages;
      while (apiMessages.length > 0 && (apiMessages[0].role === "assistant" || apiMessages[0].role === "system")) {
        apiMessages = apiMessages.slice(1);
      }

      if (apiMessages.length === 0) {
        return res.status(400).json({ error: "Nenhuma mensagem válida do usuário enviada." });
      }

      const contents = apiMessages.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

      // Call Gemini 3.5 Flash via Stream to avoid proxy timeouts
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.25, // Lower temperature reduces hallucination and boosts precision on manual/PDF lookups
        }
      });
      console.timeEnd("Gemini API Time");

      // We will send standard text/plain chunks or just stream JSON. We can just stream plain text and let the frontend gather it.
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(chunk.text);
        }
      }
      res.end();
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
