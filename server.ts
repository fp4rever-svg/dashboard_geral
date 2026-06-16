import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables for local testing
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON request parsing with high limit for document size
  app.use(express.json({ limit: "15mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Secure proxy route for Gemini Chat with Knowledge Base context
  app.post("/api/chat", async (req: express.Request, res: express.Response) => {
    try {
      const { messages, knowledgeDocuments } = req.body;

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

      // Initialize Google GenAI client
      const ai = new GoogleGenAI({ apiKey });

      // Build powerful system instruction anchoring operational and guideline data
      let systemInstruction = `Você é o "Assistente de Operações e Inteligência da Logística", um consultor virtual altamente qualificado integrado à central de controle operacional.
Seu objetivo é ajudar a equipe logística, gerentes, supervisores e operadores de conferência e separação a esclarecer dúvidas operacionais com base nos documentos que eles cadastraram.

Diretrizes de resposta:
1. Responda em português de forma clara, prestativa e estruturada (use markdown com negritos e marcadores se necessário).
2. Priorize estritamente as regras de negócio escritas nos "Documentos Cadastrados" abaixo.
3. Se a informação solicitada estiver disponível nos documentos, use-a e cite o título do documento de onde tirou.
4. Se o usuário perguntar algo que NÃO está contemplado na base fornecida, você pode responder de forma prestativa usando seu conhecimento técnico geral de logística/WMS, mas mencione amigavelmente que aquela instrução específica não consta nos manuais oficiais carregados.
5. Seja direto, evite floreios ou respostas excessivamente longas desnecessariamente.

Documentos Cadastrados na Base de Conhecimento:
`;

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
        systemInstruction += "\n[Atenção]: Nenhum documento ou PDF foi cadastrado pela equipe ainda nesta base de conhecimento. Guie o usuário a acessar a base de conhecimento de administração para carregar os PDFs operacionais correspondentes.\n";
      }

      // Map incoming conversation to Google GenAI schema format
      const contents = messages.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

      // Call Gemini 2.5 Flash
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.25, // Lower temperature reduces hallucination and boosts precision on manual/PDF lookups
        }
      });

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
