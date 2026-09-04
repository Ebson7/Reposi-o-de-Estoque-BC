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
          productName: data.productName || '',
          productSabor: data.productSabor || '',
          productSituacao: data.productSituacao,
          fornecedor: data.fornecedor,
          unidade: (data.unidade as UnitType) || 'UN',
          quantidade: Number(data.quantidade) || 1,
          tipo: (data.tipo as RequestType) || 'Carga Padrão' as any,
          solicitante: data.solicitante || 'Não Identificado',
          dataSolicitacao: data.dataSolicitacao || new Date().toISOString(),
          status: (data.status as RequestStatus) || 'Pendente',
          observacoes: data.observacoes || '',
          respostaAdmin: data.respostaAdmin || '',
          isValidadeCurta: !!data.isValidadeCurta,
          estoqueMarsilMomento: data.estoqueMarsilMomento,
          estoqueBoraceiaMomento: data.estoqueBoraceiaMomento
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
      respostaAdmin: ''
    };

    await setDoc(docRef, {
      ...newRequest,
      serverTime: serverTimestamp()
    });

    return newRequest;
  },

  /**
   * Cria um pedido com múltiplos itens de forma atômica no Firestore usando WriteBatch
   */
  async createOrder(payload: CreateOrderPayload): Promise<StockRequest[]> {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const pedidoId = `ped_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pedidoNumero = `${Math.floor(100000 + Math.random() * 900000)}`;

    const createdRequests: StockRequest[] = [];

    payload.items.forEach(item => {
      const docRef = doc(collection(db, 'requests'));
      const id = docRef.id;

      const fullItem: StockRequest = {
        id,
        pedidoId,
        pedidoNumero,
        observacoesGeraisPedido: payload.observacoesGerais || '',
        productId: item.productId || item.productCode,
        productCode: item.productCode,
        productName: item.productName,
        productSabor: item.productSabor || '',
        productSituacao: item.productSituacao,
        fornecedor: item.fornecedor,
        unidade: item.unidade,
        quantidade: item.quantidade,
        tipo: item.tipo || payload.tipoGeral || 'Aposta na Venda',
        solicitante: payload.solicitante,
        dataSolicitacao: now,
        status: 'Pendente',
        observacoes: item.observacoes || payload.observacoesGerais || '',
        respostaAdmin: '',
        isValidadeCurta: !!item.isValidadeCurta,
        estoqueMarsilMomento: item.estoqueMarsilMomento,
        estoqueBoraceiaMomento: item.estoqueBoraceiaMomento
      };

      createdRequests.push(fullItem);
      batch.set(docRef, {
        ...fullItem,
        serverTime: serverTimestamp()
      });
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

      const CHUNK_SIZE = 400;
      for (let i = 0; i < products.length; i += CHUNK_SIZE) {
        const chunk = products.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach(prod => {
          const docRef = doc(db, 'products', prod.codigo || prod.id);
          batch.set(docRef, prod);
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
