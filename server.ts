import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Endpoint do Proxy
  app.get("/api/proxy", async (req, res): Promise<void> => {
    const rawUrl = req.query.url as string;
    const targetUrl = rawUrl ? rawUrl.trim() : "";
    if (!targetUrl) {
      res.status(400).json({ error: "Faltando o parâmetro url" });
      return;
    }

    try {
      console.log(`[Proxy] Buscando URL: ${targetUrl}`);
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
        res.status(response.status).json({ error: `Falha ao buscar a URL: ${response.statusText}` });
        return;
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("content-type", contentType);
      }

      // Evitar erros de CORS encaminhando o arquivo como Buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (err: any) {
      console.error("[Proxy] Erro de rede ou requisição falhou:", err);
      res.status(500).json({ error: err.message || "Erro interno no proxy" });
    }
  });

  // Configuração do Vite Middleware do lado do servidor
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Ativo em http://0.0.0.0:${PORT} (Express + Vite)`);
  });
}

startServer();
