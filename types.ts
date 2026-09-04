
export interface Product {
  id: string;
  fornecedor: string;
  codigo: string;
  novoCodigo?: string;
  situacao: string;
  comprador: string;
  produto: string;
  sabor: string;
  embalagem: string;
  estoqueMarsil: number;
  estoqueBoraceia: number;
  diferencaEstoque?: number;
  percentualDiferenca?: number;
  statusEstoque?: 'disponivel_ambos' | 'disponivel_marsil' | 'disponivel_boraceia' | 'zerado';
}

export type RequestType = 'Aposta na Venda' | 'Venda Garantida';
export type UnitType = 'UN' | 'CX' | 'DP' | 'PCT' | 'PT' | 'SC' | 'FD';
export type RequestStatus = 'Pendente' | 'Aprovado' | 'Recusado';

export interface WhatsAppConfig {
  enabled: boolean;
  phoneNumber: string;
  mensagemPadrao?: string;
}

export interface StockRequest {
  id: string;
  pedidoId?: string; // Identificador agrupador do pedido (ex: PED-4921)
  pedidoNumero?: string;
  observacoesGeraisPedido?: string;
  productId: string;
  productName: string;
  productCode: string;
  productNovoCodigo?: string;
  productSabor: string;
  productSituacao?: string;
  fornecedor?: string;
  quantidade: number;
  unidade: UnitType;
  tipo: RequestType;
  solicitante: string;
  observacoes?: string;
  isValidadeCurta: boolean;
  dataSolicitacao: string; // ISO format
  status: RequestStatus;
  estoqueMarsilMomento?: number;
  estoqueBoraceiaMomento?: number;
  respostaAdmin?: string;
  dataResposta?: string;
}

export interface OrderItem {
  productId: string;
  productCode: string;
  productNovoCodigo?: string;
  productName: string;
  productSabor: string;
  productSituacao?: string;
  fornecedor?: string;
  embalagem?: string;
  quantidade: number;
  unidade: UnitType;
  tipo: RequestType;
  isValidadeCurta: boolean;
  observacoes?: string;
  estoqueMarsilMomento?: number;
  estoqueBoraceiaMomento?: number;
}

export interface CreateOrderPayload {
  pedidoId?: string;
  pedidoNumero?: string;
  solicitante: string;
  tipoGeral?: RequestType;
  observacoesGerais?: string;
  items: OrderItem[];
}

export interface GroupedOrder {
  pedidoId: string;
  pedidoNumero: string;
  solicitante: string;
  dataSolicitacao: string;
  status: RequestStatus;
  observacoesGerais?: string;
  items: StockRequest[];
  totalItens: number;
  totalQuantidade: number;
}

export interface CatalogMeta {
  totalProducts: number;
  lastUpdated: string;
  sourceName?: string;
  syncUrl?: string;
  itensComEstoqueMarsil: number;
  itensComEstoqueBoraceia: number;
  itensZerados: number;
}

export interface AppState {
  products: Product[];
  requests: StockRequest[];
  vendedores: string[];
  whatsappConfig: WhatsAppConfig;
  catalogMeta: CatalogMeta;
}

export interface ProductQueryParams {
  search?: string;
  fornecedor?: string;
  situacao?: string;
  estoque?: 'todos' | 'marsil' | 'boraceia' | 'ambos' | 'zerado';
  page?: number;
  limit?: number;
}

export interface PaginatedProductsResponse {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
  totalMarsilSum: number;
  totalBoraceiaSum: number;
  fornecedores: { name: string; count: number }[];
  situacoes: { code: string; count: number; label: string }[];
  lastUpdated: string;
}
