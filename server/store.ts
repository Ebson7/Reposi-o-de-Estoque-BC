import fs from 'fs';
import path from 'path';
import type { Response } from 'express';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Product, StockRequest, WhatsAppConfig, CatalogMeta, ProductQueryParams, PaginatedProductsResponse, CreateOrderPayload, OrderItem, GroupedOrder } from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

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

export const SITUACAO_LABELS: Record<string, string> = {
  'PR': 'Promoção',
  'NO': 'Normal',
  'EX': 'Preço Externo',
  'DV': 'Promoção por Validade',
  'PC': 'Proibida a Compra',
  'EI': 'Embalagem Indisponível',
  'FT': 'Falta Temporária',
  'LJ': 'Venda somente Loja',
  'FL': 'Fora de Linha',
  'PF': 'Produto Funcional'
};

const INITIAL_SEED_PRODUCTS: Product[] = [
  {
    id: "p-seed-1",
    fornecedor: "MARS BRASIL",
    codigo: "1001",
    situacao: "NO",
    comprador: "MARCELO SILVA",
    produto: "CHOCOLATE SNICKERS ORIGINAL 45G",
    sabor: "CARAMELO E AMENDOIM",
    embalagem: "CX C/ 24 UN",
    estoqueMarsil: 350,
    estoqueBoraceia: 40,
    diferencaEstoque: 310,
    percentualDiferenca: 88,
    statusEstoque: "disponivel_ambos"
  },
  {
    id: "p-seed-2",
    fornecedor: "MARS BRASIL",
    codigo: "1002",
    situacao: "PR",
    comprador: "MARCELO SILVA",
    produto: "CHOCOLATE M&MS CHOCOLATE AO LEITE 45G",
    sabor: "AO LEITE",
    embalagem: "CX C/ 18 UN",
    estoqueMarsil: 520,
    estoqueBoraceia: 0,
    diferencaEstoque: 520,
    percentualDiferenca: 100,
    statusEstoque: "disponivel_marsil"
  },
  {
    id: "p-seed-3",
    fornecedor: "BAUDUCCO",
    codigo: "2010",
    situacao: "NO",
    comprador: "ROBERTA LIMA",
    produto: "BISCOITO RECHEADO BAUDUCCO CHOCOLATE 140G",
    sabor: "CHOCOLATE",
    embalagem: "CX C/ 30 UN",
    estoqueMarsil: 120,
    estoqueBoraceia: 120,
    diferencaEstoque: 0,
    percentualDiferenca: 0,
    statusEstoque: "disponivel_ambos"
  },
  {
    id: "p-seed-4",
    fornecedor: "BAUDUCCO",
    codigo: "2015",
    situacao: "DV",
    comprador: "ROBERTA LIMA",
    produto: "COOKIES TRADICIONAL COM GOTAS DE CHOCOLATE 100G",
    sabor: "BAUNILHA E GOTAS",
    embalagem: "CX C/ 12 UN",
    estoqueMarsil: 280,
    estoqueBoraceia: 15,
    diferencaEstoque: 265,
    percentualDiferenca: 95,
    statusEstoque: "disponivel_ambos"
  },
  {
    id: "p-seed-5",
    fornecedor: "MONDELEZ",
    codigo: "3050",
    situacao: "NO",
    comprador: "ANA PAULA",
    produto: "CHOCOLATE LACTA AO LEITE 80G",
    sabor: "AO LEITE",
    embalagem: "CX C/ 16 UN",
    estoqueMarsil: 640,
    estoqueBoraceia: 80,
    diferencaEstoque: 560,
    percentualDiferenca: 88,
    statusEstoque: "disponivel_ambos"
  },
  {
    id: "p-seed-6",
    fornecedor: "MONDELEZ",
    codigo: "3055",
    situacao: "PR",
    comprador: "ANA PAULA",
    produto: "CHICLETE TRIDENT MENTA 30.6G 5S",
    sabor: "MENTA",
    embalagem: "DP C/ 21 UN",
    estoqueMarsil: 430,
    estoqueBoraceia: 0,
    diferencaEstoque: 430,
    percentualDiferenca: 100,
    statusEstoque: "disponivel_marsil"
  },
  {
    id: "p-seed-7",
    fornecedor: "PEPSICO",
    codigo: "4012",
    situacao: "NO",
    comprador: "CARLOS SOUZA",
    produto: "SALGADINHO DORITOS QUEIJO NACHO 140G",
    sabor: "QUEIJO NACHO",
    embalagem: "FD C/ 10 UN",
    estoqueMarsil: 190,
    estoqueBoraceia: 10,
    diferencaEstoque: 180,
    percentualDiferenca: 95,
    statusEstoque: "disponivel_ambos"
  },
  {
    id: "p-seed-8",
    fornecedor: "FINI",
    codigo: "5020",
    situacao: "NO",
    comprador: "MARCELO SILVA",
    produto: "BALAS DE GELATINA FINI DENTADURAS 90G",
    sabor: "MORANGO E FRAMBOESA",
    embalagem: "CX C/ 12 UN",
    estoqueMarsil: 310,
    estoqueBoraceia: 5,
    diferencaEstoque: 305,
    percentualDiferenca: 98,
    statusEstoque: "disponivel_ambos"
  },
  {
    id: "p-seed-9",
    fornecedor: "FINI",
    codigo: "5022",
    situacao: "FT",
    comprador: "MARCELO SILVA",
    produto: "TUBES CÍTRICOS MORANGO E NATA FINI 80G",
    sabor: "MORANGO CÍTRICO",
    embalagem: "CX C/ 12 UN",
    estoqueMarsil: 0,
    estoqueBoraceia: 0,
    diferencaEstoque: 0,
    percentualDiferenca: 0,
    statusEstoque: "zerado"
  }
];

interface DatabaseSchema {
  products: Product[];
  requests: StockRequest[];
  vendedores: string[];
  whatsappConfig: WhatsAppConfig;
  catalogMeta: CatalogMeta;
}

class CentralStore {
  private products: Product[] = [];
  private requests: StockRequest[] = [];
  private vendedores: string[] = [];
  private whatsappConfig: WhatsAppConfig = {
    enabled: true,
    phoneNumber: "5511999999999",
    mensagemPadrao: "Olá, segue solicitação de transferência de estoque para Boracéia:"
  };
  private catalogMeta: CatalogMeta = {
    totalProducts: 0,
    lastUpdated: new Date().toISOString(),
    sourceName: "Carga Inicial",
    syncUrl: "",
    itensComEstoqueMarsil: 0,
    itensComEstoqueBoraceia: 0,
    itensZerados: 0
  };

  private sseClients: Set<Response> = new Set();
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDataDirectory();
    this.loadFromDisk();
    this.startKeepAlive();
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private calculateProductMetrics(p: Product): Product {
    const marsil = Number(p.estoqueMarsil) || 0;
    const boraceia = Number(p.estoqueBoraceia) || 0;
    const diff = marsil - boraceia;

    let percent = 0;
    if (marsil + boraceia > 0) {
      percent = Math.round((Math.abs(diff) / Math.max(marsil, boraceia)) * 100);
    }

    let status: Product['statusEstoque'] = 'zerado';
    if (marsil > 0 && boraceia > 0) {
      status = 'disponivel_ambos';
    } else if (marsil > 0 && boraceia <= 0) {
      status = 'disponivel_marsil';
    } else if (marsil <= 0 && boraceia > 0) {
      status = 'disponivel_boraceia';
    }

    return {
      ...p,
      estoqueMarsil: marsil,
      estoqueBoraceia: boraceia,
      diferencaEstoque: diff,
      percentualDiferenca: percent,
      statusEstoque: status
    };
  }

  private refreshCatalogMeta(sourceName?: string, syncUrl?: string): void {
    let comMarsil = 0;
    let comBoraceia = 0;
    let zerados = 0;

    for (const p of this.products) {
      if (p.estoqueMarsil > 0) comMarsil++;
      if (p.estoqueBoraceia > 0) comBoraceia++;
      if (p.estoqueMarsil <= 0 && p.estoqueBoraceia <= 0) zerados++;
    }

    this.catalogMeta = {
      totalProducts: this.products.length,
      lastUpdated: new Date().toISOString(),
      sourceName: sourceName || this.catalogMeta.sourceName || "Arquivo",
      syncUrl: syncUrl !== undefined ? syncUrl : this.catalogMeta.syncUrl,
      itensComEstoqueMarsil: comMarsil,
      itensComEstoqueBoraceia: comBoraceia,
      itensZerados: zerados
    };
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
          this.products = parsed.products.map(p => this.calculateProductMetrics(p));
          this.requests = parsed.requests || [];
          this.vendedores = Array.from(new Set([...DEFAULT_VENDEDORES, ...(parsed.vendedores || [])])).sort();
          this.whatsappConfig = parsed.whatsappConfig || this.whatsappConfig;
          this.refreshCatalogMeta(parsed.catalogMeta?.sourceName, parsed.catalogMeta?.syncUrl);
          console.log(`[Database] Carregados ${this.products.length} produtos e ${this.requests.length} solicitações do disco.`);
          return;
        }
      }
    } catch (err) {
      console.warn("[Database] Erro ao ler database.json, inicializando com dados padrão:", err);
    }

    // Inicialização com dados padrão
    this.products = INITIAL_SEED_PRODUCTS.map(p => this.calculateProductMetrics(p));
    this.vendedores = [...DEFAULT_VENDEDORES].sort();
    this.requests = [];
    this.refreshCatalogMeta("Catálogo Inicial Padrão");
    this.saveToDisk();
  }

  public saveToDisk(): void {
    try {
      this.ensureDataDirectory();
      const payload: DatabaseSchema = {
        products: this.products,
        requests: this.requests,
        vendedores: this.vendedores,
        whatsappConfig: this.whatsappConfig,
        catalogMeta: this.catalogMeta
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error("[Database] Erro ao salvar database.json:", err);
    }
  }

  // SSE Client Handling
  public addSseClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Enviar mensagem de boas-vindas / handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ 
      connected: true, 
      time: new Date().toISOString(),
      meta: this.catalogMeta,
      pendingRequests: this.requests.filter(r => r.status === 'Pendente').length
    })}\n\n`);

    this.sseClients.add(res);

    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  public broadcast(eventName: string, data: any): void {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
  }

  private startKeepAlive(): void {
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    this.keepAliveInterval = setInterval(() => {
      for (const client of this.sseClients) {
        try {
          client.write(`event: ping\ndata: {"time":"${new Date().toISOString()}"}\n\n`);
        } catch (e) {
          this.sseClients.delete(client);
        }
      }
    }, 15000);
  }

  // Normalização de busca (sem acentos e minúscula)
  private normalize(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  // Consulta de produtos paginada e com filtros rápidos
  public queryProducts(params: ProductQueryParams): PaginatedProductsResponse {
    const searchNormalized = this.normalize(params.search || '');
    const searchWords = searchNormalized ? searchNormalized.split(/\s+/).filter(w => w.length > 0) : [];
    const filterFornecedor = this.normalize(params.fornecedor || '');
    const filterSituacao = (params.situacao || '').trim().toUpperCase();
    const estoqueFilter = params.estoque || 'todos';

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(10, Number(params.limit) || 50));

    // Fornecedores e Situações no catálogo geral (para popular os filtros do frontend)
    const fornecedorCountsMap: Record<string, number> = {};
    const situacaoCountsMap: Record<string, number> = {};

    let totalMarsilSum = 0;
    let totalBoraceiaSum = 0;

    const filtered: Product[] = [];

    for (const p of this.products) {
      // Contagens para os filtros
      if (p.fornecedor) {
        const fornKey = p.fornecedor.toUpperCase();
        fornecedorCountsMap[fornKey] = (fornecedorCountsMap[fornKey] || 0) + 1;
      }
      if (p.situacao) {
        const sitKey = p.situacao.toUpperCase();
        situacaoCountsMap[sitKey] = (situacaoCountsMap[sitKey] || 0) + 1;
      }

      // Filtro de fornecedor
      if (filterFornecedor && !this.normalize(p.fornecedor).includes(filterFornecedor)) {
        continue;
      }

      // Filtro de situação
      if (filterSituacao && p.situacao.toUpperCase() !== filterSituacao) {
        continue;
      }

      // Filtro de estoque
      if (estoqueFilter === 'marsil' && p.estoqueMarsil <= 0) continue;
      if (estoqueFilter === 'boraceia' && p.estoqueBoraceia <= 0) continue;
      if (estoqueFilter === 'ambos' && (p.estoqueMarsil <= 0 || p.estoqueBoraceia <= 0)) continue;
      if (estoqueFilter === 'zerado' && (p.estoqueMarsil > 0 || p.estoqueBoraceia > 0)) continue;

      // Filtro de texto da busca geral (deve conter todas as palavras digitadas)
      if (searchWords.length > 0) {
        const combined = this.normalize(`${p.codigo} ${p.produto} ${p.sabor} ${p.fornecedor} ${p.comprador}`);
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
      lastUpdated: this.catalogMeta.lastUpdated
    };
  }

  // Obter todos os produtos de forma leve (id, codigo, produto, estoques) para autocomplete/cache
  public getAllProductsLite(): { id: string; codigo: string; produto: string; estoqueMarsil: number; estoqueBoraceia: number; fornecedor: string; situacao: string }[] {
    return this.products.map(p => ({
      id: p.id,
      codigo: p.codigo,
      produto: p.produto,
      estoqueMarsil: p.estoqueMarsil,
      estoqueBoraceia: p.estoqueBoraceia,
      fornecedor: p.fornecedor,
      situacao: p.situacao
    }));
  }

  // Obter detalhes de um produto
  public getProductByCode(code: string): Product | undefined {
    return this.products.find(p => p.codigo.trim() === code.trim());
  }

  // Processamento de Carga em Lote (CSV / TSV / Excel / Texto bruto)
  public parseAndImportBatch(inputData: string, sourceName: string = "Upload em Lote"): { count: number; meta: CatalogMeta } {
    if (!inputData || inputData.trim().length === 0) {
      throw new Error("Arquivo ou texto em lote está vazio.");
    }

    let cleanText = inputData;

    // Detectar se o conteúdo é um arquivo Excel binário ou em formato zip/xlsx
    if (cleanText.startsWith('PK\x03\x04') || cleanText.startsWith('data:application/vnd.openxmlformats') || cleanText.includes('\x00')) {
      try {
        const wb = XLSX.read(cleanText, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        cleanText = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { FS: ';' });
      } catch (e: any) {
        console.warn("[Batch Import] Tentativa de ler como Excel binary falhou, processando como texto:", e.message);
      }
    }

    // Limpar BOM do Excel UTF-8
    cleanText = cleanText.replace(/^\uFEFF/, '').trim();

    // Quebrar em linhas para detectar cabeçalho real e delimitador
    const allLines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (allLines.length === 0) {
      throw new Error("Nenhum dado legível foi encontrado no arquivo.");
    }

    // Palavras-chave de cabeçalho típicas em planilhas de estoque e distribuidores
    const headerKeywords = [
      'codigo', 'código', 'cod', 'cód', 'produto', 'descri', 'descricao', 'descrição',
      'fornecedor', 'forn', 'marca', 'fabricante', 'situacao', 'situação', 'status',
      'comprador', 'sabor', 'embalagem', 'marsil', 'boraceia', 'boracéia', 'matriz',
      'filial', 'estoque', 'saldo', 'quantidade', 'qtde', 'qtd', 'item'
    ];

    // Encontrar a linha onde realmente começa o cabeçalho (ignora relatórios com títulos no topo)
    let headerLineIndex = 0;
    let maxHeaderScore = 0;
    const maxSearchLines = Math.min(15, allLines.length);

    for (let i = 0; i < maxSearchLines; i++) {
      const lineLower = allLines[i].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let score = 0;
      for (const kw of headerKeywords) {
        if (lineLower.includes(kw)) score++;
      }
      if (score > maxHeaderScore) {
        maxHeaderScore = score;
        headerLineIndex = i;
      }
    }

    // Se encontramos um cabeçalho claro nas primeiras linhas, começamos a partir dele
    const targetLines = maxHeaderScore >= 2 ? allLines.slice(headerLineIndex) : allLines;
    const sampleLine = targetLines[0] || '';

    // Auto-detectar delimitador mais provável (; , \t |)
    let delimiter = ';';
    const semicolonCount = (sampleLine.match(/;/g) || []).length;
    const tabCount = (sampleLine.match(/\t/g) || []).length;
    const commaCount = (sampleLine.match(/,/g) || []).length;
    const pipeCount = (sampleLine.match(/\|/g) || []).length;

    if (tabCount > semicolonCount && tabCount > commaCount) {
      delimiter = '\t';
    } else if (semicolonCount >= commaCount && semicolonCount > 0) {
      delimiter = ';';
    } else if (pipeCount > semicolonCount && pipeCount > commaCount) {
      delimiter = '|';
    } else if (commaCount > 0) {
      delimiter = ',';
    }

    const contentToParse = targetLines.join('\n');
    const parsed = Papa.parse(contentToParse, {
      header: true,
      skipEmptyLines: 'greedy',
      delimiter: delimiter,
    });

    if (!parsed.data || parsed.data.length === 0) {
      throw new Error("Não foi possível extrair linhas da tabela.");
    }

    const rows = parsed.data as any[];
    const detectedHeaders = parsed.meta.fields || (rows[0] ? Object.keys(rows[0]) : []);

    const newProducts: Product[] = [];

    // Busca flexível de colunas por sinônimos
    const findVal = (row: any, keys: string[]): string => {
      const rowKeys = Object.keys(row);
      for (const k of rowKeys) {
        if (!k) continue;
        const cleanK = k.replace(/^["']|["']$/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        for (const candidate of keys) {
          const cleanCand = candidate.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (cleanK === cleanCand || cleanK.includes(cleanCand)) {
            const val = row[k];
            if (val !== undefined && val !== null) {
              return String(val).replace(/^["']|["']$/g, '').trim();
            }
          }
        }
      }
      return '';
    };

    // Parser robusto de números para formatos brasileiros e internacionais
    const parseQty = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
      const s = String(val).trim();
      if (!s || s === '-' || s === '.' || s.toUpperCase() === 'N/A' || s.toUpperCase() === 'NULL') return 0;

      // Tratar formato brasileiro: 1.250 ou 1.250,00 ou 1250,5
      if (s.includes(',') && s.includes('.')) {
        const sanitized = s.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(sanitized);
        return isNaN(num) ? 0 : Math.round(num);
      } else if (s.includes(',')) {
        const sanitized = s.replace(',', '.').replace(/[^\d.-]/g, '');
        const num = parseFloat(sanitized);
        return isNaN(num) ? 0 : Math.round(num);
      } else if (s.includes('.')) {
        const parts = s.split('.');
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
          const sanitized = s.replace(/\./g, '');
          const num = parseInt(sanitized, 10);
          return isNaN(num) ? 0 : num;
        }
        const num = parseFloat(s);
        return isNaN(num) ? 0 : Math.round(num);
      } else {
        const sanitized = s.replace(/[^\d-]/g, '');
        const num = parseInt(sanitized, 10);
        return isNaN(num) ? 0 : num;
      }
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== 'object') continue;

      let produtoNome = findVal(row, [
        'produto', 'descricao', 'descrição', 'desc', 'nome', 'mercadoria', 'material', 
        'denominacao', 'item', 'ds_produto', 'nome produto', 'descricao produto'
      ]);

      let codigo = findVal(row, [
        'codigo', 'código', 'cod', 'cód', 'cod.', 'cód.', 'item', 'ref', 'referencia', 
        'referência', 'plu', 'sku', 'id', 'cd_produto', 'cod item', 'cod_prod'
      ]);

      // Fallback posicional se o cabeçalho não bateu exatamente
      const rowVals = Object.values(row).map(v => String(v || '').trim());
      if (!produtoNome && rowVals.length >= 2) {
        // Encontrar valor de texto mais longo (provavelmente a descrição do produto)
        const textCandidates = rowVals.filter(v => v.length >= 3 && isNaN(Number(v)));
        if (textCandidates.length > 0) {
          produtoNome = textCandidates[0];
        }
      }

      if (!produtoNome) continue;

      if (!codigo) {
        // Tenta pegar primeiro campo numérico como código
        const codeCandidate = rowVals.find(v => v.length >= 1 && /^\d+$/.test(v));
        codigo = codeCandidate || String(i + 1);
      }

      const fornecedor = findVal(row, [
        'fornecedor', 'fabricante', 'marca', 'forn', 'forn.', 'razao social', 
        'fantasia', 'fornecedor/marca', 'nm_fornecedor'
      ]);

      const situacao = findVal(row, [
        'situacao', 'situação', 'status', 'sit', 'sit.', 'disponibilidade', 
        'bloqueio', 'st_produto'
      ]).toUpperCase();

      const comprador = findVal(row, [
        'comprador', 'responsavel', 'responsável', 'buyer', 'nm_comprador'
      ]);

      const sabor = findVal(row, [
        'sabor', 'gosto', 'flavor', 'variante', 'complemento', 'subgrupo', 'detalhe'
      ]);

      const embalagem = findVal(row, [
        'embalagem', 'emb', 'emb.', 'unidade', 'un', 'und', 'pack', 'cx', 'fd', 'tipo_emb'
      ]);

      const estoqueMarsil = parseQty(findVal(row, [
        'marsil', 'estoque marsil', 'est marsil', 'est. marsil', 'qtde marsil', 'qtd marsil', 
        'saldo marsil', 'matriz', 'estoque matriz', 'saldo matriz', 'sp', 'estoque sp', 
        'saldo sp', 'deposito', 'depósito', 'estoque 1', 'loja 1', 'qtde 1', 'saldo 1', 
        'marsil (sp)', 'est_marsil', 'saldo_matriz'
      ]));

      const estoqueBoraceia = parseQty(findVal(row, [
        'boraceia', 'boracéia', 'estoque boraceia', 'estoque boracéia', 'est boraceia', 
        'est. boraceia', 'qtde boraceia', 'qtd boraceia', 'saldo boraceia', 'saldo boracéia', 
        'filial', 'estoque filial', 'saldo filial', 'estoque 2', 'loja 2', 'qtde 2', 
        'saldo 2', 'boraceia (filial)', 'est_boraceia', 'saldo_filial'
      ]));

      const prod: Product = {
        id: `p-${codigo || i}-${Date.now()}`,
        fornecedor: fornecedor || 'GERAL',
        codigo: codigo || String(i + 1),
        situacao: situacao || 'NO',
        comprador: comprador || 'N/A',
        produto: produtoNome.toUpperCase(),
        sabor: sabor || '',
        embalagem: embalagem || 'UN',
        estoqueMarsil,
        estoqueBoraceia
      };

      newProducts.push(this.calculateProductMetrics(prod));
    }

    if (newProducts.length === 0) {
      const headerList = detectedHeaders.slice(0, 8).join(', ');
      throw new Error(
        `Nenhum produto válido foi identificado no arquivo. Colunas detectadas: [${headerList || 'nenhuma'}]. ` +
        `Certifique-se de que a planilha contenha ao menos o Código e a Descrição/Produto.`
      );
    }

    // Atualizar base de produtos
    this.products = newProducts;
    this.refreshCatalogMeta(sourceName);
    this.saveToDisk();

    // Notificar clientes em tempo real via SSE
    this.broadcast('catalog_updated', {
      meta: this.catalogMeta,
      count: newProducts.length,
      source: sourceName,
      time: new Date().toISOString()
    });

    console.log(`[Batch Import] Sucesso: ${newProducts.length} produtos importados via ${sourceName}.`);
    return { count: newProducts.length, meta: this.catalogMeta };
  }

  // Importação direta de lista de produtos já estruturada
  public importParsedProducts(items: Product[], sourceName: string = "Upload Direto"): { count: number; meta: CatalogMeta } {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Nenhum item fornecido para importação.");
    }

    this.products = items.map((p, idx) => this.calculateProductMetrics({
      ...p,
      id: p.id || `p-${p.codigo || idx}-${Date.now()}`
    }));

    this.refreshCatalogMeta(sourceName);
    this.saveToDisk();

    this.broadcast('catalog_updated', {
      meta: this.catalogMeta,
      count: this.products.length,
      source: sourceName,
      time: new Date().toISOString()
    });

    return { count: this.products.length, meta: this.catalogMeta };
  }

  // Exportar Catálogo Ativo como CSV
  public exportCatalogCsv(): string {
    const data = this.products.map(p => ({
      "Fornecedor": p.fornecedor,
      "Código": p.codigo,
      "Situação": p.situacao,
      "Comprador": p.comprador,
      "Produto": p.produto,
      "Sabor": p.sabor,
      "Embalagem": p.embalagem,
      "Estoque Marsil": p.estoqueMarsil,
      "Estoque Boraceia": p.estoqueBoraceia,
      "Diferença": p.diferencaEstoque,
      "% Diferença": p.percentualDiferenca ? `${p.percentualDiferenca}%` : '0%'
    }));

    return Papa.unparse(data, { delimiter: ';' });
  }

  // Solicitações (Requests)
  public getRequests(statusFilter?: string, solicitanteFilter?: string): StockRequest[] {
    let list = [...this.requests];
    if (statusFilter && statusFilter !== 'Todos') {
      list = list.filter(r => r.status === statusFilter);
    }
    if (solicitanteFilter) {
      list = list.filter(r => this.normalize(r.solicitante) === this.normalize(solicitanteFilter));
    }
    return list.sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime());
  }

  public checkRecentRequests(productCode: string, days: number = 7): StockRequest[] {
    if (!productCode) return [];
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - days);

    return this.requests.filter(r => {
      if (r.productCode !== productCode) return false;
      const reqDate = new Date(r.dataSolicitacao);
      return reqDate >= limitDate;
    });
  }

  public addRequest(reqData: Omit<StockRequest, 'id' | 'dataSolicitacao' | 'status'>): StockRequest {
    const newReq: StockRequest = {
      ...reqData,
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dataSolicitacao: new Date().toISOString(),
      status: 'Pendente'
    };

    this.requests.unshift(newReq);
    this.saveToDisk();

    this.broadcast('request_created', {
      request: newReq,
      pendingCount: this.requests.filter(r => r.status === 'Pendente').length
    });

    return newReq;
  }

  // Criação de Pedido com Múltiplos Itens
  public createMultiItemOrder(payload: CreateOrderPayload): StockRequest[] {
    if (!payload.items || payload.items.length === 0) {
      throw new Error("O pedido deve conter pelo menos 1 item.");
    }
    if (!payload.solicitante) {
      throw new Error("O solicitante/vendedor deve ser informado.");
    }

    const orderNumber = payload.pedidoNumero || `PED-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const pedidoId = payload.pedidoId || `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const createdRequests: StockRequest[] = payload.items.map((item, index) => {
      return {
        id: `req-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
        pedidoId,
        pedidoNumero: orderNumber,
        observacoesGeraisPedido: payload.observacoesGerais || '',
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        productSabor: item.productSabor || '',
        productSituacao: item.productSituacao || 'NO',
        fornecedor: item.fornecedor || '',
        quantidade: item.quantidade,
        unidade: item.unidade,
        tipo: item.tipo || payload.tipoGeral || 'Aposta na Venda',
        solicitante: payload.solicitante,
        observacoes: item.observacoes || '',
        isValidadeCurta: item.isValidadeCurta || false,
        dataSolicitacao: nowIso,
        status: 'Pendente',
        estoqueMarsilMomento: item.estoqueMarsilMomento,
        estoqueBoraceiaMomento: item.estoqueBoraceiaMomento
      };
    });

    // Inserir todos no topo da lista
    this.requests.unshift(...createdRequests);
    this.saveToDisk();

    this.broadcast('order_created', {
      pedidoId,
      pedidoNumero: orderNumber,
      solicitante: payload.solicitante,
      count: createdRequests.length,
      requests: createdRequests,
      pendingCount: this.requests.filter(r => r.status === 'Pendente').length
    });

    return createdRequests;
  }

  public updateOrderGroupStatus(pedidoId: string, status: 'Pendente' | 'Aprovado' | 'Recusado', resposta?: string): StockRequest[] {
    const updated: StockRequest[] = [];
    const nowIso = new Date().toISOString();

    for (let i = 0; i < this.requests.length; i++) {
      if (this.requests[i].pedidoId === pedidoId) {
        this.requests[i] = {
          ...this.requests[i],
          status,
          respostaAdmin: resposta !== undefined ? resposta : this.requests[i].respostaAdmin,
          dataResposta: nowIso
        };
        updated.push(this.requests[i]);
      }
    }

    if (updated.length === 0) {
      throw new Error(`Nenhum item encontrado para o pedido ${pedidoId}`);
    }

    this.saveToDisk();

    this.broadcast('order_status_changed', {
      pedidoId,
      status,
      resposta,
      updatedRequests: updated,
      pendingCount: this.requests.filter(r => r.status === 'Pendente').length
    });

    return updated;
  }

  public deleteOrderGroup(pedidoId: string): boolean {
    const initialLen = this.requests.length;
    this.requests = this.requests.filter(r => r.pedidoId !== pedidoId);
    if (this.requests.length !== initialLen) {
      this.saveToDisk();
      this.broadcast('order_deleted', { pedidoId });
      return true;
    }
    return false;
  }

  public updateRequestStatus(id: string, status: 'Pendente' | 'Aprovado' | 'Recusado', resposta?: string): StockRequest {
    const idx = this.requests.findIndex(r => r.id === id);
    if (idx === -1) {
      throw new Error("Solicitação não encontrada.");
    }

    this.requests[idx] = {
      ...this.requests[idx],
      status,
      respostaAdmin: resposta !== undefined ? resposta : this.requests[idx].respostaAdmin,
      dataResposta: new Date().toISOString()
    };

    const updated = this.requests[idx];
    this.saveToDisk();

    this.broadcast('request_status_changed', {
      request: updated,
      pendingCount: this.requests.filter(r => r.status === 'Pendente').length
    });

    return updated;
  }

  public deleteRequest(id: string): boolean {
    const initialLen = this.requests.length;
    this.requests = this.requests.filter(r => r.id !== id);
    if (this.requests.length !== initialLen) {
      this.saveToDisk();
      this.broadcast('request_deleted', { id });
      return true;
    }
    return false;
  }

  public clearAllRequests(): void {
    this.requests = [];
    this.saveToDisk();
    this.broadcast('requests_cleared', { time: new Date().toISOString() });
  }

  // Vendedores
  public getVendedores(): string[] {
    return this.vendedores;
  }

  public addVendedor(name: string): string[] {
    const trimmed = name.trim().toUpperCase();
    if (trimmed && !this.vendedores.includes(trimmed)) {
      this.vendedores.push(trimmed);
      this.vendedores.sort();
      this.saveToDisk();
      this.broadcast('vendedores_updated', { vendedores: this.vendedores });
    }
    return this.vendedores;
  }

  public removeVendedor(name: string): string[] {
    const trimmed = name.trim().toUpperCase();
    this.vendedores = this.vendedores.filter(v => v !== trimmed);
    this.saveToDisk();
    this.broadcast('vendedores_updated', { vendedores: this.vendedores });
    return this.vendedores;
  }

  // Config e Meta
  public getAppState(): {
    productsCount: number;
    catalogMeta: CatalogMeta;
    whatsappConfig: WhatsAppConfig;
    vendedores: string[];
    pendingRequestsCount: number;
  } {
    return {
      productsCount: this.products.length,
      catalogMeta: this.catalogMeta,
      whatsappConfig: this.whatsappConfig,
      vendedores: this.vendedores,
      pendingRequestsCount: this.requests.filter(r => r.status === 'Pendente').length
    };
  }

  public updateWhatsAppConfig(config: Partial<WhatsAppConfig>): WhatsAppConfig {
    this.whatsappConfig = {
      ...this.whatsappConfig,
      ...config
    };
    this.saveToDisk();
    this.broadcast('config_updated', { whatsappConfig: this.whatsappConfig });
    return this.whatsappConfig;
  }
}

// Singleton global
export const store = new CentralStore();
