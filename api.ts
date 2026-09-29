import { Product, StockRequest, WhatsAppConfig, SecurityConfig, CatalogMeta, ProductQueryParams, PaginatedProductsResponse, CreateOrderPayload, RequestStatus, AdminAuthChallenge } from './types';
import { firebaseService, DEFAULT_WHATSAPP_CONFIG, DEFAULT_CATALOG_META, DEFAULT_VENDEDORES, DEFAULT_SECURITY_CONFIG } from './firebaseService';
import { parseCatalogBatch } from './catalogParser';
import { localCatalogService } from './localCatalogService';

export const api = {
  /**
   * Status do sistema e metadados do catálogo
   */
  async getStatus(): Promise<{
    status: string;
    productsCount: number;
    catalogMeta: CatalogMeta;
    whatsappConfig: WhatsAppConfig;
    vendedores: string[];
    pendingRequestsCount: number;
  }> {
    let serverRes: any = null;
    try {
      const res = await fetch(`/api/status?_t=${Date.now()}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        serverRes = await res.json();
      }
    } catch {
      // Ambiente estático / Vercel: usa Firestore e armazenamento local
    }

    // Busca metadados em tempo real do Firestore para garantir versão mais recente
    let firestoreMeta: CatalogMeta | null = null;
    try {
      firestoreMeta = await firebaseService.getCatalogMeta();
    } catch {}

    const localMeta = await localCatalogService.getMeta();
    const localProds = await localCatalogService.getProducts();

    const latestMeta = (firestoreMeta && firestoreMeta.totalProducts > 0 && (!serverRes || !serverRes.catalogMeta || new Date(firestoreMeta.lastUpdated).getTime() >= new Date(serverRes.catalogMeta.lastUpdated || 0).getTime()))
      ? firestoreMeta
      : (serverRes?.catalogMeta || firestoreMeta || localMeta || DEFAULT_CATALOG_META);

    // Se o catálogo remoto (Firestore ou Servidor) tem uma versão mais recente que a local do dispositivo, sincroniza
    const needsSync = latestMeta && latestMeta.totalProducts > 0 && (
      localProds.length <= 10 || 
      (localMeta?.lastUpdated && latestMeta.lastUpdated && latestMeta.lastUpdated !== localMeta.lastUpdated)
    );

    if (needsSync) {
      this.syncCatalog(true).catch(() => {});
    }

    return {
      status: 'online',
      productsCount: latestMeta?.totalProducts || serverRes?.productsCount || localProds.length || 0,
      catalogMeta: latestMeta,
      whatsappConfig: serverRes?.whatsappConfig || DEFAULT_WHATSAPP_CONFIG,
      vendedores: serverRes?.vendedores || DEFAULT_VENDEDORES,
      pendingRequestsCount: serverRes?.pendingRequestsCount || 0
    };
  },

  /**
   * Força sincronização ativa do catálogo a partir do Firestore / Servidor
   */
  async syncCatalog(force = false): Promise<CatalogMeta> {
    // 1. Tenta acionar o servidor Node para garantir que o backend também sincronizou do Firestore
    try {
      await fetch(`/api/sync?_t=${Date.now()}`, { method: 'POST' });
    } catch {
      // Backend offline ou ambiente estático
    }

    // 2. Busca os metadados do Firestore
    try {
      const meta = await firebaseService.getCatalogMeta();
      const localMeta = await localCatalogService.getMeta();
      const localProds = await localCatalogService.getProducts();

      const shouldDownload = force || localProds.length <= 10 || (meta.lastUpdated && meta.lastUpdated !== localMeta?.lastUpdated);

      if (shouldDownload && meta.totalProducts > 0) {
        console.log('[API] Baixando catálogo atualizado do Firestore para sincronização client-side...');
        const firestoreProds = await firebaseService.getProductsFromFirestore();
        if (firestoreProds && firestoreProds.length > 0) {
          let comMarsil = 0;
          let comBoraceia = 0;
          let zerados = 0;
          for (const p of firestoreProds) {
            if (p.estoqueMarsil > 0) comMarsil++;
            if (p.estoqueBoraceia > 0) comBoraceia++;
            if (p.estoqueMarsil <= 0 && p.estoqueBoraceia <= 0) zerados++;
          }
          const fullMeta: CatalogMeta = {
            totalProducts: firestoreProds.length,
            lastUpdated: meta.lastUpdated || new Date().toISOString(),
            sourceName: meta.sourceName || 'Firebase Firestore',
            syncUrl: meta.syncUrl || '',
            itensComEstoqueMarsil: comMarsil,
            itensComEstoqueBoraceia: comBoraceia,
            itensZerados: zerados
          };
          await localCatalogService.setCatalog(firestoreProds, fullMeta);
          
          // Dispara evento para atualização imediata na interface sem necessidade de F5
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('marsil_catalog_refreshed', { detail: fullMeta }));
          }

          return fullMeta;
        }
      }
      return meta;
    } catch (err) {
      console.warn('[API] Falha ao sincronizar do Firestore:', err);
    }

    const localMeta = await localCatalogService.getMeta();
    return localMeta || DEFAULT_CATALOG_META;
  },

  /**
   * Consulta de produtos com busca, filtros e paginação
   * Funciona com servidor Node, PWA e Vercel (via IndexedDB e Firestore)
   */
  async queryProducts(params: ProductQueryParams): Promise<PaginatedProductsResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.fornecedor) query.set('fornecedor', params.fornecedor);
    if (params.situacao) query.set('situacao', params.situacao);
    if (params.estoque) query.set('estoque', params.estoque);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    query.set('_t', String(Date.now())); // Anti-cache para PWA e links móveis

    try {
      const res = await fetch(`/api/products?${query.toString()}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        // Se o servidor retornou catálogo real (> 10 itens)
        if (json && Array.isArray(json.items) && json.total > 10) {
          return json;
        }
      }
    } catch {
      // Backend não disponível (como na Vercel); prossegue para motor client-side
    }

    // Se já temos produtos no IndexedDB local com quantidade real
    const localProds = await localCatalogService.getProducts();
    if (localProds.length > 10) {
      return localCatalogService.queryProducts(params);
    }

    // Se não há dados locais com mais de 10 produtos, sincroniza do Firebase Firestore
    try {
      await this.syncCatalog(true);
      return localCatalogService.queryProducts(params);
    } catch (err) {
      console.warn('[API] Erro ao sincronizar catálogo do Firestore:', err);
    }

    // Retorno padrão vazio caso o catálogo ainda não tenha recebido carga
    return {
      items: [],
      total: 0,
      page: params.page || 1,
      totalPages: 1,
      totalMarsilSum: 0,
      totalBoraceiaSum: 0,
      fornecedores: [],
      situacoes: [],
      lastUpdated: new Date().toISOString()
    };
  },

  /**
   * Busca produto pelo código
   */
  async getProductByCode(code: string): Promise<{ product: Product; recentRequests: StockRequest[] }> {
    try {
      const res = await fetch(`/api/products/code/${encodeURIComponent(code)}?_t=${Date.now()}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {
      // Fallback local
    }

    const prod = localCatalogService.getProductByCode(code);
    if (!prod) {
      throw new Error('Produto não encontrado');
    }
    return { product: prod, recentRequests: [] };
  },

  /**
   * Carga em lote de planilha / CSV / Excel
   * Processa imediatamente, salva no IndexedDB, sincroniza com Firebase Firestore
   * e envia TODOS os dados para o servidor Node
   */
  async uploadBatch(
    csvTextOrData: string | ArrayBuffer | { csvText?: string; items?: Product[]; sourceName?: string },
    sourceName: string = 'Upload de Planilha'
  ): Promise<{
    success: boolean;
    message: string;
    count: number;
    meta: CatalogMeta;
  }> {
    let parsedProducts: Product[] = [];
    let parsedMeta: CatalogMeta;

    if (typeof csvTextOrData === 'object' && 'items' in csvTextOrData && Array.isArray(csvTextOrData.items)) {
      parsedProducts = csvTextOrData.items;
      let comMarsil = 0;
      let comBoraceia = 0;
      let zerados = 0;
      for (const p of parsedProducts) {
        if (p.estoqueMarsil > 0) comMarsil++;
        if (p.estoqueBoraceia > 0) comBoraceia++;
        if (p.estoqueMarsil <= 0 && p.estoqueBoraceia <= 0) zerados++;
      }
      parsedMeta = {
        totalProducts: parsedProducts.length,
        lastUpdated: new Date().toISOString(),
        sourceName: csvTextOrData.sourceName || sourceName,
        itensComEstoqueMarsil: comMarsil,
        itensComEstoqueBoraceia: comBoraceia,
        itensZerados: zerados
      };
    } else {
      // Processa e normaliza colunas (FORNECEDOR, NOVO CODIGO, CODIGO, SITUACAO, COMPRADOR, etc.)
      const input = typeof csvTextOrData === 'object' && 'csvText' in csvTextOrData
        ? (csvTextOrData.csvText || '')
        : (csvTextOrData as string | ArrayBuffer);

      const res = parseCatalogBatch(input, sourceName);
      parsedProducts = res.products;
      parsedMeta = res.meta;
    }

    // 1. Salva imediatamente no IndexedDB local para busca sem latência no dispositivo atual
    await localCatalogService.setCatalog(parsedProducts, parsedMeta);

    // 2. Persiste no Firebase Firestore para sincronização ultrarrápida com todos os usuários/PWA
    try {
      await firebaseService.saveProductsToFirestore(parsedProducts, parsedMeta);
    } catch (err: any) {
      console.warn('[Firebase] Aviso ao persistir no Firestore:', err.message);
    }

    // 3. Atualiza o backend Node com TODOS os produtos (sem truncar) e aguarda confirmação
    if (typeof window !== 'undefined') {
      try {
        const bodyPayload = typeof csvTextOrData === 'string'
          ? { csvText: csvTextOrData, sourceName }
          : { items: parsedProducts, sourceName };

        await fetch('/api/products/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });
      } catch (err: any) {
        console.warn('[Server] Aviso ao enviar produtos ao servidor Node:', err.message);
      }
    }

    // 4. Notifica a aplicação local para atualizar a visualização imediatamente
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('marsil_catalog_refreshed', { detail: parsedMeta }));
    }

    return {
      success: true,
      message: `Carga de ${parsedProducts.length.toLocaleString('pt-BR')} produtos processada e sincronizada com sucesso!`,
      count: parsedProducts.length,
      meta: parsedMeta
    };
  },

  /**
   * Sincronização via link público
   */
  async syncFromUrl(url: string): Promise<{
    success: boolean;
    message: string;
    count: number;
    meta: CatalogMeta;
  }> {
    // Tenta primeiro via endpoint backend se disponível
    try {
      const res = await fetch('/api/sync-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.meta) {
          await firebaseService.updateCatalogMeta(data.meta);
        }
        return data;
      }
    } catch {
      // Continua para tentativa direta
    }

    // Fallback: faz o download direto da URL pública no cliente (ex: Google Sheets export=csv)
    let fetchUrl = url.trim();
    if (fetchUrl.includes('docs.google.com/spreadsheets') && !fetchUrl.includes('export?format=csv')) {
      const idMatch = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (idMatch && idMatch[1]) {
        fetchUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`;
      }
    }

    const csvResponse = await fetch(fetchUrl);
    if (!csvResponse.ok) {
      throw new Error('Não foi possível obter dados da URL informada. Verifique se o link está público.');
    }

    const text = await csvResponse.text();
    return this.uploadBatch(text, 'Sincronização por Link');
  },

  // ========================================================
  // SOLICITAÇÕES E PEDIDOS: 100% PERSISTENTES NO FIREBASE
  // ========================================================

  async getRequests(status?: string, solicitante?: string): Promise<StockRequest[]> {
    try {
      const res = await fetch('/api/requests');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {}
    return [];
  },

  async createRequest(reqData: Omit<StockRequest, 'id' | 'dataSolicitacao' | 'status'>): Promise<StockRequest> {
    const firestoreRequest = await firebaseService.createRequest(reqData);

    fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreRequest)
    }).catch(() => {});

    return firestoreRequest;
  },

  async createOrder(orderData: CreateOrderPayload): Promise<StockRequest[]> {
    const createdList = await firebaseService.createOrder(orderData);

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    }).catch(() => {});

    return createdList;
  },

  async updateOrderStatus(pedidoId: string, status: RequestStatus, resposta?: string): Promise<void> {
    await firebaseService.updateOrderStatus(pedidoId, status, resposta);

    fetch(`/api/orders/${encodeURIComponent(pedidoId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, resposta })
    }).catch(() => {});
  },

  async deleteOrder(pedidoId: string): Promise<boolean> {
    await firebaseService.deleteOrder(pedidoId);

    fetch(`/api/orders/${encodeURIComponent(pedidoId)}`, {
      method: 'DELETE'
    }).catch(() => {});

    return true;
  },

  async updateRequestStatus(id: string, status: RequestStatus, resposta?: string): Promise<StockRequest> {
    await firebaseService.updateRequestStatus(id, status, resposta);

    fetch(`/api/requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, resposta })
    }).catch(() => {});

    return {
      id,
      status,
      respostaAdmin: resposta,
    } as any;
  },

  async deleteRequest(id: string): Promise<boolean> {
    await firebaseService.deleteRequest(id);

    fetch(`/api/requests/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(() => {});

    return true;
  },

  async clearRequests(): Promise<void> {
    await firebaseService.clearAllRequests();
    fetch('/api/requests', { method: 'DELETE' }).catch(() => {});
  },

  // ========================================================
  // VENDEDORES & CONFIGURAÇÃO (FIREBASE FIRESTORE)
  // ========================================================

  async getVendedores(): Promise<string[]> {
    try {
      const res = await fetch('/api/vendedores');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {}
    return DEFAULT_VENDEDORES;
  },

  async addVendedor(name: string): Promise<string[]> {
    const list = await firebaseService.addVendedor(name);

    fetch('/api/vendedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).catch(() => {});

    return list;
  },

  async removeVendedor(name: string): Promise<string[]> {
    const list = await firebaseService.removeVendedor(name);

    fetch(`/api/vendedores/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    }).catch(() => {});

    return list;
  },

  async updateWhatsAppConfig(config: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
    const updated = await firebaseService.updateWhatsAppConfig(config);

    fetch('/api/config/whatsapp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    }).catch(() => {});

    return updated;
  },

  async getSecurityConfig(): Promise<SecurityConfig> {
    return await firebaseService.getSecurityConfig();
  },

  async updateSecurityConfig(config: Partial<SecurityConfig>): Promise<SecurityConfig> {
    return await firebaseService.updateSecurityConfig(config);
  },

  async createAdminAuthChallenge(): Promise<AdminAuthChallenge> {
    return await firebaseService.createAdminAuthChallenge();
  },

  async verifyAdminAuthCode(requestId: string, inputCode: string, fallbackCode?: string): Promise<boolean> {
    return await firebaseService.verifyAdminAuthCode(requestId, inputCode, fallbackCode);
  }
};
