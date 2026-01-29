
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

export type RequestType = 'Teste' | 'Venda Garantida';
export type UnitType = 'Caixa' | 'Unidade';

export interface WhatsAppConfig {
  enabled: boolean;
  phoneNumber: string;
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
  dataSolicitacao: string; // ISO format
  status: 'Pendente' | 'Aprovado' | 'Recusado';
}

export interface AppState {
  products: Product[];
  requests: StockRequest[];
  vendedores: string[];
  whatsappConfig: WhatsAppConfig;
}