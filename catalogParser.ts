import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Product, CatalogMeta } from './types';

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

export interface ParseResult {
  products: Product[];
  meta: CatalogMeta;
  detectedHeaders: string[];
}

/**
 * Normaliza strings para busca e comparação de cabeçalhos
 */
function cleanNorm(str: string): string {
  if (!str) return '';
  return str
    .replace(/^["']|["']$/g, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s-]+/g, ' ');
}

/**
 * Busca flexível de valores em uma linha, priorizando correspondência exata
 */
function findVal(row: any, keys: string[], excludeSubstring?: string): string {
  const rowKeys = Object.keys(row);

  // 1. Correspondência Exata
  for (const k of rowKeys) {
    if (!k) continue;
    const cleanK = cleanNorm(k);
    if (excludeSubstring && cleanK.includes(excludeSubstring)) continue;
    for (const candidate of keys) {
      const cleanCand = cleanNorm(candidate);
      if (cleanK === cleanCand) {
        const val = row[k];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).replace(/^["']|["']$/g, '').trim();
        }
      }
    }
  }

  // 2. Correspondência Parcial
  for (const k of rowKeys) {
    if (!k) continue;
    const cleanK = cleanNorm(k);
    if (excludeSubstring && cleanK.includes(excludeSubstring)) continue;
    for (const candidate of keys) {
      const cleanCand = cleanNorm(candidate);
      if (cleanK.includes(cleanCand)) {
        const val = row[k];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).replace(/^["']|["']$/g, '').trim();
        }
      }
    }
  }

  return '';
}

/**
 * Conversor numérico robusto compatível com formatos brasileiro e internacional
 */
export function parseQuantity(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  const s = String(val).trim();
  if (!s || s === '-' || s === '.' || s.toUpperCase() === 'N/A' || s.toUpperCase() === 'NULL') return 0;

  // Formato brasileiro com milhar e decimal: 1.250,50 ou 1.250
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
}

/**
 * Calcula métricas de saldo e percentual de diferença
 */
export function calculateProductMetrics(p: Partial<Product> & { codigo: string; produto: string }): Product {
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
    id: p.id || `p-${p.codigo.replace(/\s+/g, '_')}-${Math.random().toString(36).substr(2, 6)}`,
    fornecedor: (p.fornecedor || 'Geral').toUpperCase().trim(),
    novoCodigo: p.novoCodigo ? String(p.novoCodigo).trim() : undefined,
    codigo: String(p.codigo).trim(),
    situacao: (p.situacao || 'NO').toUpperCase().trim(),
    comprador: p.comprador ? p.comprador.toUpperCase().trim() : '',
    produto: String(p.produto).toUpperCase().trim(),
    sabor: p.sabor ? p.sabor.toUpperCase().trim() : '',
    embalagem: p.embalagem ? p.embalagem.toUpperCase().trim() : 'CX',
    estoqueMarsil: marsil,
    estoqueBoraceia: boraceia,
    diferencaEstoque: diff,
    percentualDiferenca: percent,
    statusEstoque: status
  };
}

/**
 * Converte um arquivo Excel (ArrayBuffer) em CSV com delimitador ';'
 */
export function excelBufferToCsv(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Nenhuma aba encontrada no arquivo Excel.');
  }
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_csv(firstSheet, { FS: ';' });
}

/**
 * Parser principal de planilhas e texto em lote
 */
export function parseCatalogBatch(inputData: string | ArrayBuffer, sourceName: string = 'Upload de Planilha'): ParseResult {
  let cleanText = '';

  if (typeof inputData !== 'string') {
    cleanText = excelBufferToCsv(inputData);
  } else {
    cleanText = inputData;
    // Se for binário do Excel (início PK\x03\x04 ou data:application)
    if (cleanText.startsWith('PK\x03\x04') || cleanText.startsWith('data:application/vnd.openxmlformats') || cleanText.includes('\x00')) {
      try {
        const wb = XLSX.read(cleanText, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        cleanText = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { FS: ';' });
      } catch (e) {
        console.warn('[Parser] Falha ao ler binário Excel, tentando como texto direto:', e);
      }
    }
  }

  // Remove BOM do UTF-8
  cleanText = cleanText.replace(/^\uFEFF/, '').trim();

  const allLines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (allLines.length === 0) {
    throw new Error('O arquivo ou texto fornecido está vazio.');
  }

  const headerKeywords = [
    'fornecedor', 'novo codigo', 'novo_codigo', 'codigo', 'código', 'cod', 'cód',
    'situacao', 'situação', 'comprador', 'produto', 'descricao', 'descrição',
    'sabor', 'embalagem', 'estoque_marsil', 'estoque marsil', 'marsil',
    'estoque_boraceia', 'estoque boraceia', 'boraceia', 'boracéia'
  ];

  // Localiza linha de cabeçalho
  let headerLineIndex = 0;
  let maxHeaderScore = 0;
  const maxSearchLines = Math.min(15, allLines.length);

  for (let i = 0; i < maxSearchLines; i++) {
    const lineLower = cleanNorm(allLines[i]);
    let score = 0;
    for (const kw of headerKeywords) {
      if (lineLower.includes(kw)) score++;
    }
    if (score > maxHeaderScore) {
      maxHeaderScore = score;
      headerLineIndex = i;
    }
  }

  const targetLines = maxHeaderScore >= 2 ? allLines.slice(headerLineIndex) : allLines;
  const sampleLine = targetLines[0] || '';

  // Detecção de delimitador
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
    throw new Error('Não foi possível extrair dados tabulares do arquivo.');
  }

  const rows = parsed.data as any[];
  const detectedHeaders = parsed.meta.fields || (rows[0] ? Object.keys(rows[0]) : []);

  const newProducts: Product[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];

    // Extração dos 10 campos padronizados
    const fornecedor = findVal(row, ['FORNECEDOR', 'FABRICANTE', 'MARCA']) || 'GERAL';
    const novoCodigo = findVal(row, ['NOVO CODIGO', 'NOVO_CODIGO', 'NOVO COD', 'COD_NOVO', 'CODIGO NOVO']);
    const codigo = findVal(row, ['CODIGO', 'CÓDIGO', 'COD', 'CÓD', 'ITEM', 'REF', 'ID', 'SKU'], 'novo');
    const situacaoRaw = findVal(row, ['SITUACAO', 'SITUAÇÃO', 'STATUS', 'SIT']);
    const comprador = findVal(row, ['COMPRADOR', 'GESTOR', 'RESPONSAVEL']);
    const produto = findVal(row, ['PRODUTO', 'DESCRICAO', 'DESCRIÇÃO', 'NOME', 'DESCRICAO DO PRODUTO', 'ITEM_DESC']);
    const sabor = findVal(row, ['SABOR', 'FRAGRANCIA', 'VARIANTE', 'TIPO']);
    const embalagem = findVal(row, ['EMBALAGEM', 'EMB', 'UNIDADE', 'UN', 'EMBAL']);
    const estoqueMarsilRaw = findVal(row, ['ESTOQUE_MARSIL', 'ESTOQUE MARSIL', 'MARSIL', 'MATRIZ', 'ESTOQUE CD MARSIL']);
    const estoqueBoraceiaRaw = findVal(row, ['ESTOQUE_BORACEIA', 'ESTOQUE BORACEIA', 'BORACEIA', 'BORACÉIA', 'FILIAL', 'ESTOQUE CD BORACEIA']);

    // Validação mínima de linha de produto
    const cleanCod = codigo || novoCodigo;
    const cleanProd = produto;

    if (!cleanCod && !cleanProd) {
      continue;
    }

    const finalCodigo = cleanCod || `P-${idx + 1}`;
    const finalProduto = cleanProd || `PRODUTO ${finalCodigo}`;

    // Normalização da situação
    let situacao = situacaoRaw.toUpperCase().trim();
    if (situacao.length > 2) {
      if (situacao.includes('PROMOCAO') || situacao.includes('PROMOÇÃO')) situacao = 'PR';
      else if (situacao.includes('VALIDADE')) situacao = 'DV';
      else if (situacao.includes('FALTA')) situacao = 'FT';
      else if (situacao.includes('PROIBIDA')) situacao = 'PC';
      else if (situacao.includes('EXTERNO')) situacao = 'EX';
      else if (situacao.includes('FORA')) situacao = 'FL';
      else situacao = 'NO';
    }
    if (!situacao || !SITUACAO_LABELS[situacao]) {
      situacao = 'NO';
    }

    const estoqueMarsil = parseQuantity(estoqueMarsilRaw);
    const estoqueBoraceia = parseQuantity(estoqueBoraceiaRaw);

    const product = calculateProductMetrics({
      id: `p-${finalCodigo.replace(/[^a-zA-Z0-9_-]/g, '_')}-${idx + 1}`,
      fornecedor,
      novoCodigo: novoCodigo || undefined,
      codigo: finalCodigo,
      situacao,
      comprador: comprador || undefined,
      produto: finalProduto,
      sabor: sabor || '',
      embalagem: embalagem || 'CX',
      estoqueMarsil,
      estoqueBoraceia
    });

    newProducts.push(product);
  }

  if (newProducts.length === 0) {
    throw new Error('Nenhum produto válido foi identificado na planilha. Verifique se os cabeçalhos contêm CODIGO ou PRODUTO.');
  }

  let comMarsil = 0;
  let comBoraceia = 0;
  let zerados = 0;

  for (const p of newProducts) {
    if (p.estoqueMarsil > 0) comMarsil++;
    if (p.estoqueBoraceia > 0) comBoraceia++;
    if (p.estoqueMarsil <= 0 && p.estoqueBoraceia <= 0) zerados++;
  }

  const meta: CatalogMeta = {
    totalProducts: newProducts.length,
    lastUpdated: new Date().toISOString(),
    sourceName,
    itensComEstoqueMarsil: comMarsil,
    itensComEstoqueBoraceia: comBoraceia,
    itensZerados: zerados
  };

  return {
    products: newProducts,
    meta,
    detectedHeaders
  };
}
