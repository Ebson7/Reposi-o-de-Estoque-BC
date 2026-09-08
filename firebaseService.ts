import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  writeBatch,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { StockRequest, WhatsAppConfig, CatalogMeta, CreateOrderPayload, Product, UnitType, RequestType, RequestStatus } from './types';

export const DEFAULT_VENDEDORES = [
  "ADALTON LUIZ",
  "AIRTON DONIZETTI",
  "ANA CAMARGO",
  "ANA PAULA",
  "CARLOS ROSEIRO",
  "DOUGLAS PITELLI",
  "EDMILSON LEAL",
  "FERNANDO APARECIDO",
  "GUSTAVO PAULINO",
  "JOAO JOSE",
  "JOAO MANUEL",
  "LEONARDO APARECIDO",
  "LUIS ALEXANDRE",
  "MARCELO SANTOS",
  "MARCO AURELIO",
  "MARCO AURELIO MARTINS FILHO",
  "LEANDRO CAETANO MAFORT",
  "JURACI SEBASTIÃO DOS REIS",
  "VALDINEI DA SILVA PEREIRA",
  "LEANDRO DA SILVA GREGIO",
  "GIANDERSON SARTORE",
  "GIAN CARLO DELVAZ",
  "NIVALDO NEVES",
  "ROSIMAR FREITAS",
  "ROZIMARA SOUZA",
  "TELMA CRISTINA",
  "WASHINGTON BELMIRO",
  "OUTRO"
];

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  enabled: true,
  phoneNumber: "5511999999999",
  mensagemPadrao: "Olá, segue nova solicitação de estoque para a Marsil Boracéia."
};

export const DEFAULT_CATALOG_META: CatalogMeta = {
  totalProducts: 0,
  lastUpdated: new Date().toISOString(),
  sourceName: "Catálogo Inicial Marsil Boracéia",
  itensComEstoqueMarsil: 0,
  itensComEstoqueBoraceia: 0,
  itensZerados: 0
};

/**
 * Remove recursivamente campos com valor 'undefined' para compatibilidade estrita com a API do Firestore
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    if (data && data.constructor && (data.constructor.name === 'FieldValue' || data.constructor.name === 'Timestamp')) {
      return data;
    }
    const clean: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean;
  }
  return data;
}

export const firebaseService = {
  // ========================================================
  // 1. SOLICITAÇÕES E PEDIDOS EM TEMPO REAL (FIRESTORE)
  // ========================================================

  /**
   * Assina em tempo real a coleção de solicitações no Firebase Firestore.
   * Notifica instantaneamente todos os navegadores/dispositivos conectados.
   */
  subscribeToRequests(callback: (requests: StockRequest[]) => void): Unsubscribe {
    const colRef = collection(db, 'requests');
    const q = query(colRef);

    return onSnapshot(q, (snapshot) => {
      const items: StockRequest[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as any;
        items.push({
          id: docSnap.id,
          pedidoId: data.pedidoId || docSnap.id,
          pedidoNumero: data.pedidoNumero || `SOL-${docSnap.id.slice(-6).toUpperCase()}`,
          observacoesGeraisPedido: data.observacoesGeraisPedido || '',
          productId: data.productId || data.productCode || docSnap.id,
          productCode: data.productCode || '',
          productNovoCodigo: data.productNovoCodigo || '',
          productName: data.productName || '',
          productSabor: data.productSabor || '',
          productSituacao: data.productSituacao || 'NO',
          fornecedor: data.fornecedor || 'GERAL',
          unidade: (data.unidade as UnitType) || 'CX',
          quantidade: Number(data.quantidade) || 1,
          tipo: (data.tipo as RequestType) || 'Aposta na Venda',
          solicitante: data.solicitante || 'Não Identificado',
          dataSolicitacao: data.dataSolicitacao || new Date().toISOString(),
          status: (data.status as RequestStatus) || 'Pendente',
          observacoes: data.observacoes || '',
          respostaAdmin: data.respostaAdmin || '',
          isValidadeCurta: !!data.isValidadeCurta,
          estoqueMarsilMomento: typeof data.estoqueMarsilMomento === 'number' ? data.estoqueMarsilMomento : 0,
          estoqueBoraceiaMomento: typeof data.estoqueBoraceiaMomento === 'number' ? data.estoqueBoraceiaMomento : 0
        });
      });

      // Ordenar localmente por data desc
      items.sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime());
      callback(items);
    }, (error) => {
      console.error('[Firebase] Erro ao escutar solicitações em tempo real:', error);
    });
  },

  /**
   * Cria uma solicitação individual no Firestore
   */
  async createRequest(reqData: Omit<StockRequest, 'id' | 'dataSolicitacao' | 'status'>): Promise<StockRequest> {
    const colRef = collection(db, 'requests');
    const docRef = doc(colRef);
    const id = docRef.id;
    const now = new Date().toISOString();
    const pedidoNumero = `SOL-${Math.floor(100000 + Math.random() * 900000)}`;

    const newRequest: StockRequest = {
      ...reqData,
      id,
      pedidoId: id,
      pedidoNumero,
      status: 'Pendente',
      dataSolicitacao: now,
      observacoes: reqData.observacoes || '',
      respostaAdmin: '',
      productSituacao: reqData.productSituacao || 'NO',
      productNovoCodigo: reqData.productNovoCodigo || '',
      productSabor: reqData.productSabor || '',
      fornecedor: reqData.fornecedor || 'GERAL',
      estoqueMarsilMomento: typeof reqData.estoqueMarsilMomento === 'number' ? reqData.estoqueMarsilMomento : 0,
      estoqueBoraceiaMomento: typeof reqData.estoqueBoraceiaMomento === 'number' ? reqData.estoqueBoraceiaMomento : 0
    };

    await setDoc(docRef, sanitizeForFirestore({
      ...newRequest,
      serverTime: serverTimestamp()
    }));

    return newRequest;
  },

  /**
   * Cria um pedido com múltiplos itens de forma atômica no Firestore usando WriteBatch
   */
  async createOrder(payload: CreateOrderPayload): Promise<StockRequest[]> {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const pedidoId = `ped_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pedidoNumero = payload.pedidoNumero || `${Math.floor(100000 + Math.random() * 900000)}`;

    const createdRequests: StockRequest[] = [];

    payload.items.forEach(item => {
      const docRef = doc(collection(db, 'requests'));
      const id = docRef.id;

      const fullItem: StockRequest = {
        id,
        pedidoId,
        pedidoNumero,
        observacoesGeraisPedido: payload.observacoesGerais || '',
        productId: item.productId || item.productCode || id,
        productCode: item.productCode || '',
        productNovoCodigo: item.productNovoCodigo || '',
        productName: item.productName || '',
        productSabor: item.productSabor || '',
        productSituacao: item.productSituacao || 'NO',
        fornecedor: item.fornecedor || 'GERAL',
        unidade: item.unidade || 'CX',
        quantidade: Number(item.quantidade) || 1,
        tipo: item.tipo || payload.tipoGeral || 'Aposta na Venda',
        solicitante: payload.solicitante || 'Não Identificado',
        dataSolicitacao: now,
        status: 'Pendente',
        observacoes: item.observacoes || payload.observacoesGerais || '',
        respostaAdmin: '',
        isValidadeCurta: !!item.isValidadeCurta,
        estoqueMarsilMomento: typeof item.estoqueMarsilMomento === 'number' ? item.estoqueMarsilMomento : 0,
        estoqueBoraceiaMomento: typeof item.estoqueBoraceiaMomento === 'number' ? item.estoqueBoraceiaMomento : 0
      };

      createdRequests.push(fullItem);
      batch.set(docRef, sanitizeForFirestore({
        ...fullItem,
        serverTime: serverTimestamp()
      }));
    });

    await batch.commit();
    return createdRequests;
  },

  /**
   * Atualiza o status de uma solicitação individual no Firestore
   */
  async updateRequestStatus(id: string, status: RequestStatus, respostaAdmin?: string): Promise<void> {
    const docRef = doc(db, 'requests', id);
    const updateData: any = { status };
    if (respostaAdmin !== undefined) {
      updateData.respostaAdmin = respostaAdmin;
    }
    await updateDoc(docRef, updateData);
  },

  /**
   * Atualiza o status de todos os itens de um pedido agrupado no Firestore
   */
  async updateOrderStatus(pedidoId: string, status: RequestStatus, respostaAdmin?: string): Promise<void> {
    const colRef = collection(db, 'requests');
    const q = query(colRef, where('pedidoId', '==', pedidoId));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    let count = 0;

    snapshot.forEach(docSnap => {
      const updateData: any = { status };
      if (respostaAdmin !== undefined) {
        updateData.respostaAdmin = respostaAdmin;
      }
      batch.update(docSnap.ref, updateData);
      count++;
    });

    // Se nenhum encontrado com pedidoId, tentar por id direto
    if (count === 0) {
      const singleDocRef = doc(db, 'requests', pedidoId);
      const singleSnap = await getDoc(singleDocRef);
      if (singleSnap.exists()) {
        const updateData: any = { status };
        if (respostaAdmin !== undefined) {
          updateData.respostaAdmin = respostaAdmin;
        }
        batch.update(singleDocRef, updateData);
      }
    }

    await batch.commit();
  },

  /**
   * Exclui uma solicitação individual do Firestore
   */
  async deleteRequest(id: string): Promise<void> {
    await deleteDoc(doc(db, 'requests', id));
  },

  /**
   * Exclui todos os itens de um pedido no Firestore
   */
  async deleteOrder(pedidoId: string): Promise<void> {
    const colRef = collection(db, 'requests');
    const q = query(colRef, where('pedidoId', '==', pedidoId));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    const singleDocRef = doc(db, 'requests', pedidoId);
    batch.delete(singleDocRef);

    await batch.commit();
  },

  /**
   * Limpa todas as solicitações do Firestore
   */
  async clearAllRequests(): Promise<void> {
    const colRef = collection(db, 'requests');
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  },

  // ========================================================
  // 2. CONFIGURAÇÕES & VENDEDORES (FIRESTORE)
  // ========================================================

  /**
   * Assina em tempo real a lista de vendedores no Firestore
   */
  subscribeToVendedores(callback: (vendedores: string[]) => void): Unsubscribe {
    const docRef = doc(db, 'config', 'vendedores');

    return onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.lista) && data.lista.length > 0) {
          callback(data.lista);
          return;
        }
      }
      try {
        await setDoc(docRef, { lista: DEFAULT_VENDEDORES }, { merge: true });
      } catch (err) {
        console.warn('[Firebase] Não foi possível gravar lista inicial de vendedores:', err);
      }
      callback(DEFAULT_VENDEDORES);
    }, (error) => {
      console.error('[Firebase] Erro ao escutar vendedores:', error);
      callback(DEFAULT_VENDEDORES);
    });
  },

  async addVendedor(name: string): Promise<string[]> {
    const docRef = doc(db, 'config', 'vendedores');
    const snap = await getDoc(docRef);
    let list: string[] = snap.exists() && Array.isArray(snap.data().lista) 
      ? snap.data().lista 
      : [...DEFAULT_VENDEDORES];

    const clean = name.trim().toUpperCase();
    if (!list.includes(clean)) {
      list.push(clean);
      list.sort((a, b) => a.localeCompare(b));
      await setDoc(docRef, { lista: list }, { merge: true });
    }
    return list;
  },

  async removeVendedor(name: string): Promise<string[]> {
    const docRef = doc(db, 'config', 'vendedores');
    const snap = await getDoc(docRef);
    let list: string[] = snap.exists() && Array.isArray(snap.data().lista) 
      ? snap.data().lista 
      : [...DEFAULT_VENDEDORES];

    const clean = name.trim().toUpperCase();
    list = list.filter(v => v !== clean);
    await setDoc(docRef, { lista: list }, { merge: true });
    return list;
  },

  /**
   * Assina em tempo real as configurações do WhatsApp
   */
  subscribeToWhatsAppConfig(callback: (cfg: WhatsAppConfig) => void): Unsubscribe {
    const docRef = doc(db, 'config', 'whatsapp');

    return onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as WhatsAppConfig);
      } else {
        try {
          await setDoc(docRef, DEFAULT_WHATSAPP_CONFIG, { merge: true });
        } catch {}
        callback(DEFAULT_WHATSAPP_CONFIG);
      }
    }, (error) => {
      console.error('[Firebase] Erro ao escutar config WhatsApp:', error);
      callback(DEFAULT_WHATSAPP_CONFIG);
    });
  },

  async updateWhatsAppConfig(cfg: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
    const docRef = doc(db, 'config', 'whatsapp');
    await setDoc(docRef, cfg, { merge: true });
    const snap = await getDoc(docRef);
    return snap.data() as WhatsAppConfig;
  },

  /**
   * Assina em tempo real metadados do catálogo no Firestore
   */
  subscribeToCatalogMeta(callback: (meta: CatalogMeta) => void): Unsubscribe {
    const docRef = doc(db, 'config', 'catalogMeta');

    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as CatalogMeta);
      }
    }, (error) => {
      console.error('[Firebase] Erro ao escutar meta do catálogo:', error);
    });
  },

  async updateCatalogMeta(meta: Partial<CatalogMeta>): Promise<void> {
    const docRef = doc(db, 'config', 'catalogMeta');
    await setDoc(docRef, meta, { merge: true });
  },

  // ========================================================
  // 3. PERSISTÊNCIA DO CATÁLOGO DE PRODUTOS NO FIRESTORE
  // ========================================================

  async saveProductsToFirestore(products: Product[], meta: CatalogMeta): Promise<void> {
    try {
      console.log(`[Firebase] Iniciando persistência de ${products.length} produtos no Firestore...`);
      await this.updateCatalogMeta(meta);

      // 1. Salvar em blocos compactos (catalog_chunks) para carregamento ultrarrápido
      const CHUNK_SIZE = 300;
      const totalChunks = Math.ceil(products.length / CHUNK_SIZE);

      const chunkBatch = writeBatch(db);
      // Salva sumário de chunks
      const metaChunksRef = doc(db, 'config', 'chunks_meta');
      chunkBatch.set(metaChunksRef, {
        totalChunks,
        totalProducts: products.length,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      for (let c = 0; c < totalChunks; c++) {
        const slice = products.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
        const chunkDocRef = doc(db, 'catalog_chunks', `chunk_${c}`);
        chunkBatch.set(chunkDocRef, sanitizeForFirestore({ items: slice, index: c }));
      }
      await chunkBatch.commit();

      // 2. Salva também individualmente em /products com IDs sanitizados
      const INDIVIDUAL_BATCH_SIZE = 250;
      for (let i = 0; i < products.length; i += INDIVIDUAL_BATCH_SIZE) {
        const chunk = products.slice(i, i + INDIVIDUAL_BATCH_SIZE);
        const batch = writeBatch(db);

        chunk.forEach((prod, pIdx) => {
          const rawId = prod.codigo || prod.novoCodigo || prod.id || `p_${i + pIdx}`;
          const safeId = String(rawId)
            .replace(/[\/\\]/g, '_')
            .replace(/\s+/g, '-')
            .slice(0, 100);
          const docRef = doc(db, 'products', safeId);
          batch.set(docRef, sanitizeForFirestore(prod), { merge: true });
        });

        await batch.commit();
      }

      console.log(`[Firebase] ${products.length} produtos persistidos com sucesso no Firestore!`);
    } catch (err) {
      console.error('[Firebase] Erro ao persistir produtos no Firestore:', err);
      throw err;
    }
  },

  async getProductsFromFirestore(): Promise<Product[]> {
    try {
      // 1. Tenta carregar primeiro por chunks compactos (muito mais rápido e consome menos cota)
      const chunksColRef = collection(db, 'catalog_chunks');
      const chunksSnap = await getDocs(chunksColRef);

      if (!chunksSnap.empty) {
        const allItems: Product[] = [];
        const sortedDocs = chunksSnap.docs.sort((a, b) => {
          const idxA = a.data().index ?? 0;
          const idxB = b.data().index ?? 0;
          return idxA - idxB;
        });

        sortedDocs.forEach(d => {
          const data = d.data();
          if (Array.isArray(data.items)) {
            allItems.push(...data.items);
          }
        });

        if (allItems.length > 0) {
          return allItems;
        }
      }

      // 2. Fallback para coleção individual /products
      const colRef = collection(db, 'products');
      const snapshot = await getDocs(colRef);
      const list: Product[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as Product);
      });
      return list;
    } catch (err) {
      console.error('[Firebase] Erro ao carregar produtos do Firestore:', err);
      return [];
    }
  }
};
