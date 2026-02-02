
export interface Product {
  id: string;
  fornecedor: string;
  codigo: string;
  situacao: string;
  comprador: string;
  produto: string;
  sabor: string;
  embalagem: string;
  estoqueMarsil: number;
  estoqueBoraceia: number;
}

export type RequestType = 'Aposta na Venda' | 'Venda Garantida';
export type UnitType = 'UN' | 'CX' | 'DP' | 'PCT' | 'PT' | 'SC' | 'FD';

export interface WhatsAppConfig {
  enabled: boolean;
  phoneNumber: string;
}

export interface UpdateLog {
  id: string;
  timestamp: string;
  fileName: string;
  recordCount: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

export interface StockRequest {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  productSabor: string;
  quantidade: number;
  unidade: UnitType;
  tipo: RequestType;
  solicitante: string;
  observacoes?: string;
  isValidadeCurta: boolean;
  dataSolicitacao: string; // ISO format
  status: 'Pendente' | 'Aprovado' | 'Recusado';
}

export interface AppState {
  products: Product[];
  requests: StockRequest[];
  vendedores: string[];
  whatsappConfig: WhatsAppConfig;
  updateHistory: UpdateLog[];
}
