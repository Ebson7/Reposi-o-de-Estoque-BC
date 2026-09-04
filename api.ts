import { Product, StockRequest, WhatsAppConfig, CatalogMeta, ProductQueryParams, PaginatedProductsResponse, CreateOrderPayload, RequestStatus } from './types';
import { firebaseService } from './firebaseService';

export const api = {
  async getStatus(): Promise<{
    status: string;
    productsCount: number;
    catalogMeta: CatalogMeta;
    whatsappConfig: WhatsAppConfig;
    vendedores: string[];
    pendingRequestsCount: number;
  }> {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        return res.json();
      }
    } catch (e) {
      console.warn('[API Status] Fallback para status local');
    }

    return {
      status: 'online',
      productsCount: 0,
      catalogMeta: {
        totalProducts: 0,
        lastUpdated: new Date().toISOString(),
        sourceName: 'Firebase Firestore',
        itensComEstoqueMarsil: 0,
        itensComEstoqueBoraceia: 0,
        itensZerados: 0
      },
      whatsappConfig: {
        enabled: true,
        phoneNumber: '5511999999999',
        mensagemPadrao: 'Olá, segue nova solicitação de estoque para a Marsil Boracéia.'
      },
      vendedores: [],
      pendingRequestsCount: 0
    };
  },

  async queryProducts(params: ProductQueryParams): Promise<PaginatedProductsResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.fornecedor) query.set('fornecedor', params.fornecedor);
    if (params.situacao) query.set('situacao', params.situacao);
    if (params.estoque) query.set('estoque', params.estoque);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const res = await fetch(`/api/products?${query.toString()}`);
    if (!res.ok) {
      // Se falhar o backend, lê do Firestore
      const firestoreProds = await firebaseService.getProductsFromFirestore();
      if (firestoreProds.length > 0) {
        const page = params.page || 1;
        const limit = params.limit || 50;
        const start = (page - 1) * limit;
        return {
          items: firestoreProds.slice(start, start + limit),
          total: firestoreProds.length,
          page,
          totalPages: Math.ceil(firestoreProds.length / limit),
          totalMarsilSum: firestoreProds.reduce((acc, p) => acc + (p.estoqueMarsil || 0), 0),
          totalBoraceiaSum: firestoreProds.reduce((acc, p) => acc + (p.estoqueBoraceia || 0), 0),
          fornecedores: [],
          situacoes: [],
          lastUpdated: new Date().toISOString()
        };
      }
      throw new Error('Erro ao buscar produtos');
    }
    return res.json();
  },

  async getProductByCode(code: string): Promise<{ product: Product; recentRequests: StockRequest[] }> {
    const res = await fetch(`/api/products/code/${encodeURIComponent(code)}`);
    if (!res.ok) throw new Error('Produto não encontrado');
    return res.json();
  },

  async uploadBatch(csvTextOrData: string | { csvText?: string; items?: Product[]; sourceName?: string }, sourceName = 'Upload de Arquivo'): Promise<{
    success: boolean;
    message: string;
    count: number;
    meta: CatalogMeta;
  }> {
    const bodyPayload = typeof csvTextOrData === 'string'
      ? { csvText: csvTextOrData, sourceName }
      : { ...csvTextOrData, sourceName: csvTextOrData.sourceName || sourceName };

    const res = await fetch('/api/products/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha no upload' }));
      throw new Error(err.error || 'Erro ao processar carga em lote');
    }
    const data = await res.json();

    // Sincroniza metadados no Firebase Firestore
    try {
      if (data.meta) {
        await firebaseService.updateCatalogMeta(data.meta);
      }
    } catch (firebaseErr) {
      console.warn('[Firebase] Não foi possível atualizar meta no Firestore:', firebaseErr);
    }

    return data;
  },

  async syncFromUrl(url: string): Promise<{
    success: boolean;
    message: string;
    count: number;
    meta: CatalogMeta;
  }> {
    const res = await fetch('/api/sync-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha na sincronização' }));
      throw new Error(err.error || 'Erro ao sincronizar link');
    }
    const data = await res.json();

    // Sincroniza metadados no Firebase Firestore
    try {
      if (data.meta) {
        await firebaseService.updateCatalogMeta(data.meta);
      }
    } catch (firebaseErr) {
      console.warn('[Firebase] Não foi possível atualizar meta no Firestore:', firebaseErr);
    }

    return data;
  },

  // ========================================================
  // SOLICITAÇÕES E PEDIDOS: 100% PERSISTENTES NO FIREBASE
  // ========================================================

  async getRequests(status?: string, solicitante?: string): Promise<StockRequest[]> {
    const res = await fetch('/api/requests');
    if (res.ok) return res.json();
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
    const res = await fetch('/api/vendedores');
    if (res.ok) return res.json();
    return [];
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
  }
};
