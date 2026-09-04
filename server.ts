import express from "express";
import path from "path";
import { store } from "./server/store";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Suporte a payloads grandes para cargas em lote de até 50MB (mais de 100.000 linhas)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.text({ limit: "50mb", type: ["text/*", "application/csv"] }));

  // ==========================================
  // 1. STREAMING EM TEMPO REAL (Server-Sent Events)
  // ==========================================
  app.get("/api/events", (req, res) => {
    store.addSseClient(res);
  });

  // ==========================================
  // 2. STATUS GERAL E SINCRONIZAÇÃO
  // ==========================================
  app.get("/api/status", (req, res) => {
    res.json({
      status: "online",
      time: new Date().toISOString(),
      ...store.getAppState()
    });
  });

  // ==========================================
  // 3. CONSULTA DE PRODUTOS (ALTA PERFORMANCE)
  // ==========================================
  app.get("/api/products", (req, res) => {
    try {
      const { search, fornecedor, situacao, estoque, page, limit } = req.query;
      const result = store.queryProducts({
        search: search as string,
        fornecedor: fornecedor as string,
        situacao: situacao as string,
        estoque: estoque as any,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50
      });
      res.json(result);
    } catch (err: any) {
      console.error("[API Products] Erro na consulta:", err);
      res.status(500).json({ error: err.message || "Erro ao consultar produtos" });
    }
  });

  // Lista leve para cache de autocomplete
  app.get("/api/products/lite", (req, res) => {
    try {
      const items = store.getAllProductsLite();
      res.json({ items, count: items.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Consulta por código com histórico de 7 dias
  app.get("/api/products/code/:code", (req, res) => {
    const code = req.params.code;
    const product = store.getProductByCode(code);
    if (!product) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }
    const recentRequests = store.checkRecentRequests(code, 7);
    res.json({ product, recentRequests });
  });

  // ==========================================
  // 4. CARGA EM LOTE E EXPORTAÇÃO
  // ==========================================
  app.post("/api/products/batch", (req, res) => {
    try {
      let content = "";
      let sourceName = "Upload de Arquivo";

      if (typeof req.body === "string") {
        content = req.body;
      } else if (req.body && typeof req.body.csvText === "string") {
        content = req.body.csvText;
        if (req.body.sourceName) sourceName = req.body.sourceName;
      }

      if (!content || content.trim().length === 0) {
        res.status(400).json({ error: "Conteúdo do arquivo ou texto em lote está vazio." });
        return;
      }

      console.log(`[API Batch] Processando carga em lote (${Math.round(content.length / 1024)} KB)...`);
      const result = store.parseAndImportBatch(content, sourceName);
      res.json({
        success: true,
        message: `${result.count} produtos importados e sincronizados com sucesso no servidor!`,
        count: result.count,
        meta: result.meta
      });
    } catch (err: any) {
      console.error("[API Batch] Falha ao processar lote:", err);
      res.status(400).json({ error: err.message || "Falha ao processar arquivo" });
    }
  });

  // Exportação do catálogo ativo como CSV
  app.get("/api/products/export", (req, res) => {
    try {
      const csv = store.exportCatalogCsv();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=estoque_marsil_boraceia_${Date.now()}.csv`);
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sincronização via Link no Servidor (Sem problemas de CORS)
  app.post("/api/sync-url", async (req, res) => {
    const rawUrl = (req.body?.url || req.query?.url || "") as string;
    const targetUrl = rawUrl.trim();

    if (!targetUrl) {
      res.status(400).json({ error: "URL não informada" });
      return;
    }

    try {
      // Conversão automática de link do Google Sheets para exportação CSV direta
      let fetchUrl = targetUrl;
      if (targetUrl.includes("docs.google.com/spreadsheets") && !targetUrl.includes("/pub") && !targetUrl.includes("/export")) {
        const match = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          const spreadsheetId = match[1];
          const gidMatch = targetUrl.match(/[#&?]gid=([0-9]+)/);
          const gid = gidMatch ? gidMatch[1] : "0";
          fetchUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
        }
      }

      console.log(`[Server Sync] Buscando planilha em: ${fetchUrl}`);
      const response = await fetch(fetchUrl, {
        headers: {
          "User-Agent": "Marsil-Boraceia-Sync/2.0",
          "Accept": "text/csv, text/plain, */*"
        }
      });

      if (!response.ok) {
        res.status(response.status).json({ error: `Servidor remoto retornou erro: ${response.statusText}` });
        return;
      }

      const text = await response.text();
      if (!text || text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        res.status(400).json({ 
          error: "O link fornecido retornou uma página HTML em vez de um arquivo CSV. Se estiver usando Google Sheets, publique a planilha como CSV (Arquivo > Compartilhar > Publicar na Web > CSV)." 
        });
        return;
      }

      const result = store.parseAndImportBatch(text, "Sincronização por Link");
      res.json({
        success: true,
        message: `${result.count} produtos sincronizados do link com sucesso!`,
        count: result.count,
        meta: result.meta
      });
    } catch (err: any) {
      console.error("[Server Sync] Erro ao sincronizar via link:", err);
      res.status(500).json({ error: err.message || "Erro de conexão ao buscar planilha" });
    }
  });

  // ==========================================
  // 5. SOLICITAÇÕES E PEDIDOS (MULTI-ITENS)
  // ==========================================
  app.get("/api/requests", (req, res) => {
    try {
      const { status, solicitante } = req.query;
      const requests = store.getRequests(status as string, solicitante as string);
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Criação de pedido com múltiplos itens de uma só vez
  app.post("/api/orders", (req, res) => {
    try {
      const payload = req.body;
      if (!payload || !payload.solicitante) {
        res.status(400).json({ error: "Solicitante não informado." });
        return;
      }
      if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
        res.status(400).json({ error: "O pedido deve conter ao menos 1 item selecionado." });
        return;
      }

      const createdList = store.createMultiItemOrder(payload);
      res.status(201).json({
        success: true,
        pedidoId: createdList[0]?.pedidoId,
        pedidoNumero: createdList[0]?.pedidoNumero,
        count: createdList.length,
        requests: createdList
      });
    } catch (err: any) {
      console.error("[API Orders] Erro ao criar pedido:", err);
      res.status(400).json({ error: err.message || "Erro ao processar pedido multi-itens" });
    }
  });

  // Atualização em lote de status de um pedido
  app.patch("/api/orders/:pedidoId/status", (req, res) => {
    try {
      const { status, resposta } = req.body;
      if (!status) {
        res.status(400).json({ error: "Status não informado." });
        return;
      }
      const updated = store.updateOrderGroupStatus(req.params.pedidoId, status, resposta);
      res.json({ success: true, updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Exclusão de todos os itens de um pedido
  app.delete("/api/orders/:pedidoId", (req, res) => {
    try {
      const success = store.deleteOrderGroup(req.params.pedidoId);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/requests", (req, res) => {
    try {
      const data = req.body;
      if (!data.productCode || !data.productName || !data.solicitante || !data.quantidade) {
        res.status(400).json({ error: "Dados incompletos para solicitação." });
        return;
      }
      const newReq = store.addRequest(data);
      res.status(201).json(newReq);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/requests/:id", (req, res) => {
    try {
      const { status, resposta } = req.body;
      if (!status) {
        res.status(400).json({ error: "Status não informado." });
        return;
      }
      const updated = store.updateRequestStatus(req.params.id, status, resposta);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/requests/:id", (req, res) => {
    try {
      const success = store.deleteRequest(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/requests", (req, res) => {
    try {
      store.clearAllRequests();
      res.json({ success: true, message: "Todas as solicitações foram limpas." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 6. VENDEDORES
  // ==========================================
  app.get("/api/vendedores", (req, res) => {
    res.json(store.getVendedores());
  });

  app.post("/api/vendedores", (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: "Nome do vendedor é obrigatório." });
      return;
    }
    const list = store.addVendedor(name);
    res.json({ success: true, vendedores: list });
  });

  app.delete("/api/vendedores/:name", (req, res) => {
    const list = store.removeVendedor(decodeURIComponent(req.params.name));
    res.json({ success: true, vendedores: list });
  });

  // ==========================================
  // 7. CONFIGURAÇÕES
  // ==========================================
  app.get("/api/config", (req, res) => {
    res.json(store.getAppState());
  });

  app.patch("/api/config/whatsapp", (req, res) => {
    const updated = store.updateWhatsAppConfig(req.body);
    res.json(updated);
  });

  // ==========================================
  // 8. ASSISTENTE INTELIGENTE DE BUSCA (GEMINI SERVER-SIDE)
  // ==========================================
  app.post("/api/ai/parse-query", async (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== "string") {
      res.status(400).json({ error: "Consulta vazia" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(200).json({
        fallback: true,
        filters: { codigo: "", descricao: query, fornecedor: "", situacao: "" }
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analise a seguinte busca de produtos de uma distribuidora de alimentos e doces (Marsil Boracéia) e extraia os filtros necessários no formato JSON.
Busca: "${query}"

Extraia:
1. codigo: Apenas se o usuário citar um código numérico específico (ex: "item 1234").
2. descricao: O termo principal de busca (ex: "Snickers", "Bolacha", "Chocolate").
3. fornecedor: O nome da marca ou fabricante se citado (ex: "Mars", "Nestle", "Bauducco").
4. situacao: A sigla da situação se identificada: PR (Promoção), NO (Normal), EX (Preço Externo), DV (Validade Curta), FT (Falta Temporária), PC (Proibida a Compra).

Se não encontrar um filtro, deixe como string vazia.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              codigo: { type: Type.STRING },
              descricao: { type: Type.STRING },
              fornecedor: { type: Type.STRING },
              situacao: { type: Type.STRING },
            },
            required: ["codigo", "descricao", "fornecedor", "situacao"],
          },
        },
      });

      const parsedJson = JSON.parse(response.text || "{}");
      res.json({ fallback: false, filters: parsedJson });
    } catch (err: any) {
      console.warn("[Gemini API] Falha na análise inteligente, retornando fallback:", err.message);
      res.json({
        fallback: true,
        filters: { codigo: "", descricao: query, fornecedor: "", situacao: "" }
      });
    }
  });

  // Proxy legado preservado
  app.get("/api/proxy", async (req, res): Promise<void> => {
    const rawUrl = req.query.url as string;
    const targetUrl = rawUrl ? rawUrl.trim() : "";
    if (!targetUrl) {
      res.status(400).json({ error: "Faltando o parâmetro url" });
      return;
    }

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        res.status(response.status).json({ error: `Falha ao buscar a URL: ${response.statusText}` });
        return;
      }

      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("content-type", contentType);

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro interno no proxy" });
    }
  });

  // ==========================================
  // VITE MIDDLEWARE & PRODUÇÃO
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Sistema Marsil-Boraceia Ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer();
