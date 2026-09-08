import { Product, CatalogMeta, ProductQueryParams, PaginatedProductsResponse } from './types';
import { SITUACAO_LABELS } from './catalogParser';

const DB_NAME = 'marsil_catalog_db';
const STORE_NAME = 'catalog_store';
const DB_VERSION = 1;

class LocalCatalogService {
  private inMemoryProducts: Product[] = [];
  private inMemoryMeta: CatalogMeta | null = null;
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private isLoadedFromStorage = false;

  constructor() {
    this.initIndexedDB();
    this.loadInitialFromStorage();
  }

  private initIndexedDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof window === 'undefined' || !window.indexedDB) {
      this.dbPromise = Promise.resolve(null);
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = (e: any) => resolve(e.target.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  private async loadInitialFromStorage(): Promise<void> {
    try {
      const db = await this.initIndexedDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const reqProds = store.get('products');
        const reqMeta = store.get('meta');

        await new Promise<void>((resolve) => {
          tx.oncomplete = () => {
            if (Array.isArray(reqProds.result) && reqProds.result.length > 0) {
              this.inMemoryProducts = reqProds.result;
              this.inMemoryMeta = reqMeta.result || null;
            }
            this.isLoadedFromStorage = true;
            resolve();
          };
          tx.onerror = () => {
            this.isLoadedFromStorage = true;
            resolve();
          };
        });
      }
    } catch {
      this.isLoadedFromStorage = true;
    }
  }

  public async setCatalog(products: Product[], meta: CatalogMeta): Promise<void> {
    this.inMemoryProducts = products;
    this.inMemoryMeta = meta;

    try {
      const db = await this.initIndexedDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(products, 'products');
        store.put(meta, 'meta');
      }
    } catch (e) {
      console.warn('[LocalCatalog] Erro ao persistir no IndexedDB:', e);
    }
  }

  public async getProducts(): Promise<Product[]> {
    if (!this.isLoadedFromStorage) {
      await this.loadInitialFromStorage();
    }
    return this.inMemoryProducts;
  }

  public async getMeta(): Promise<CatalogMeta | null> {
    if (!this.isLoadedFromStorage) {
      await this.loadInitialFromStorage();
    }
    return this.inMemoryMeta;
  }

  public hasCatalog(): boolean {
    return this.inMemoryProducts.length > 0;
  }

  private normalize(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  public queryProducts(params: ProductQueryParams): PaginatedProductsResponse {
    const searchNormalized = this.normalize(params.search || '');
    const searchWords = searchNormalized ? searchNormalized.split(/\s+/).filter(w => w.length > 0) : [];
    const filterFornecedor = this.normalize(params.fornecedor || '');
    const filterSituacao = (params.situacao || '').trim().toUpperCase();
    const estoqueFilter = params.estoque || 'todos';

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(10, Number(params.limit) || 40));

    const fornecedorCountsMap: Record<string, number> = {};
    const situacaoCountsMap: Record<string, number> = {};

    let totalMarsilSum = 0;
    let totalBoraceiaSum = 0;

    const filtered: Product[] = [];

    for (const p of this.inMemoryProducts) {
      if (p.fornecedor) {
        const fornKey = p.fornecedor.toUpperCase();
        fornecedorCountsMap[fornKey] = (fornecedorCountsMap[fornKey] || 0) + 1;
      }
      if (p.situacao) {
        const sitKey = p.situacao.toUpperCase();
        situacaoCountsMap[sitKey] = (situacaoCountsMap[sitKey] || 0) + 1;
      }

      if (filterFornecedor && !this.normalize(p.fornecedor).includes(filterFornecedor)) {
        continue;
      }

      if (filterSituacao && p.situacao.toUpperCase() !== filterSituacao) {
        continue;
      }

      if (estoqueFilter === 'marsil' && p.estoqueMarsil <= 0) continue;
      if (estoqueFilter === 'boraceia' && p.estoqueBoraceia <= 0) continue;
      if (estoqueFilter === 'ambos' && (p.estoqueMarsil <= 0 || p.estoqueBoraceia <= 0)) continue;
      if (estoqueFilter === 'zerado' && (p.estoqueMarsil > 0 || p.estoqueBoraceia > 0)) continue;

      if (searchWords.length > 0) {
        const combined = this.normalize(`${p.codigo} ${p.novoCodigo || ''} ${p.produto} ${p.sabor} ${p.fornecedor} ${p.comprador || ''}`);
        const matchesAll = searchWords.every(word => combined.includes(word));
        if (!matchesAll) continue;
      }

      totalMarsilSum += p.estoqueMarsil;
      totalBoraceiaSum += p.estoqueBoraceia;
      filtered.push(p);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    const fornecedores = Object.entries(fornecedorCountsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const situacoes = Object.entries(situacaoCountsMap)
      .map(([code, count]) => ({
        code,
        count,
        label: SITUACAO_LABELS[code] || code
      }))
      .sort((a, b) => b.count - a.count);

    return {
      items,
      total,
      page,
      totalPages,
      totalMarsilSum,
      totalBoraceiaSum,
      fornecedores,
      situacoes,
      lastUpdated: this.inMemoryMeta?.lastUpdated || new Date().toISOString()
    };
  }

  public getProductByCode(code: string): Product | undefined {
    const c = code.trim().toLowerCase();
    return this.inMemoryProducts.find(
      p => p.codigo.trim().toLowerCase() === c || (p.novoCodigo && p.novoCodigo.trim().toLowerCase() === c)
    );
  }
}

export const localCatalogService = new LocalCatalogService();
