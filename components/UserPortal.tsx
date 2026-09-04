import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Package, 
  AlertTriangle, 
  Building2, 
  Send, 
  Copy, 
  Check, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Loader2, 
  LayoutGrid, 
  List, 
  Store, 
  TrendingUp, 
  Tag, 
  MessageSquare, 
  User, 
  Calendar,
  ShoppingBag,
  Plus,
  Minus,
  CheckSquare,
  Square
} from 'lucide-react';
import { Product, StockRequest, WhatsAppConfig, RequestType, UnitType, PaginatedProductsResponse, OrderItem, CreateOrderPayload } from '../types';
import { api } from '../api';
import { parseSearchQueryWithGemini } from './geminiService';
import { OrderDrawerModal } from './OrderDrawerModal';

interface UserPortalProps {
  requests: StockRequest[];
  vendedores: string[];
  whatsappConfig: WhatsAppConfig;
  onSubmitRequest: (req: Omit<StockRequest, 'id' | 'dataSolicitacao' | 'status'>) => Promise<StockRequest>;
  onSubmitOrder?: (payload: CreateOrderPayload, sendWhatsApp: boolean) => Promise<StockRequest[]>;
  activeVendor: string;
  onSelectVendor: (vendor: string) => void;
  lastUpdated?: string;
  onViewRequests?: () => void;
}

const UNIT_OPTIONS: UnitType[] = ['CX', 'UN', 'DP', 'PCT', 'PT', 'SC', 'FD'];

const SITUACAO_BADGES: Record<string, { label: string; color: string; border: string }> = {
  'PR': { label: 'Promoção', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  'DV': { label: 'Validade Curta', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  'FT': { label: 'Falta Temporária', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  'PC': { label: 'Proibida Compra', color: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  'NO': { label: 'Normal', color: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
  'EX': { label: 'Preço Externo', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  'FL': { label: 'Fora de Linha', color: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' }
};

export const UserPortal: React.FC<UserPortalProps> = ({
  requests,
  vendedores,
  whatsappConfig,
  onSubmitRequest,
  onSubmitOrder,
  activeVendor,
  onSelectVendor,
  lastUpdated,
  onViewRequests
}) => {
  // Search parameters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFornecedor, setSelectedFornecedor] = useState('');
  const [selectedSituacao, setSelectedSituacao] = useState('');
  const [selectedEstoque, setSelectedEstoque] = useState<'todos' | 'marsil' | 'boraceia' | 'ambos' | 'zerado'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Multi-Item Order (Cart) State
  const [orderItems, setOrderItems] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('marsil_order_cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);

  // Sync cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem('marsil_order_cart_items', JSON.stringify(orderItems));
    } catch {}
  }, [orderItems]);

  // Order item helpers
  const isItemInOrder = useCallback((productId: string) => {
    return orderItems.some(item => item.productId === productId);
  }, [orderItems]);

  const getOrderItem = useCallback((productId: string) => {
    return orderItems.find(item => item.productId === productId);
  }, [orderItems]);

  const handleToggleAddToOrder = useCallback((prod: Product) => {
    setOrderItems(prev => {
      const exists = prev.find(item => item.productId === prod.id);
      if (exists) {
        return prev.filter(item => item.productId !== prod.id);
      } else {
        const newItem: OrderItem = {
          productId: prod.id,
          productCode: prod.codigo,
          productNovoCodigo: prod.novoCodigo,
          productName: prod.produto,
          productSabor: prod.sabor,
          fornecedor: prod.fornecedor,
          quantidade: 1,
          unidade: (prod.embalagem && UNIT_OPTIONS.includes(prod.embalagem as UnitType)) ? prod.embalagem as UnitType : 'CX',
          tipo: 'Aposta na Venda',
          estoqueMarsilMomento: prod.estoqueMarsil,
          estoqueBoraceiaMomento: prod.estoqueBoraceia,
          isValidadeCurta: prod.situacao === 'DV'
        };
        return [...prev, newItem];
      }
    });
  }, []);

  const handleUpdateItemQty = useCallback((productId: string, delta: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, (Number(item.quantidade) || 1) + delta);
        return { ...item, quantidade: newQty };
      }
      return item;
    }));
  }, []);

  const handleSetItemQty = useCallback((productId: string, qty: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantidade: Math.max(1, qty) };
      }
      return item;
    }));
  }, []);

  const handleSetItemUnit = useCallback((productId: string, unit: UnitType) => {
    setOrderItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, unidade: unit };
      }
      return item;
    }));
  }, []);

  const handleSetItemTipo = useCallback((productId: string, tipo: RequestType) => {
    setOrderItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, tipo };
      }
      return item;
    }));
  }, []);

  const handleToggleItemValidade = useCallback((productId: string) => {
    setOrderItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, isValidadeCurta: !item.isValidadeCurta };
      }
      return item;
    }));
  }, []);

  const handleSetItemNotes = useCallback((productId: string, notes: string) => {
    setOrderItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, observacoes: notes };
      }
      return item;
    }));
  }, []);

  const handleRemoveItem = useCallback((productId: string) => {
    setOrderItems(prev => prev.filter(item => item.productId !== productId));
  }, []);

  const handleClearOrder = useCallback(() => {
    setOrderItems([]);
  }, []);

  const totalVolumesInOrder = useMemo(() => {
    return orderItems.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0);
  }, [orderItems]);

  // Query Results State
  const [queryResult, setQueryResult] = useState<PaginatedProductsResponse>({
    items: [],
    total: 0,
    page: 1,
    totalPages: 1,
    totalMarsilSum: 0,
    totalBoraceiaSum: 0,
    fornecedores: [],
    situacoes: [],
    lastUpdated: lastUpdated || new Date().toISOString()
  });
  const [isSearching, setIsSearching] = useState(false);

  // Smart Search Assistant
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Modal Solicitação
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [unidade, setUnidade] = useState<UnitType>('CX');
  const [tipo, setTipo] = useState<RequestType>('Aposta na Venda');
  const [solicitante, setSolicitante] = useState(activeVendor || (vendedores[0] || 'ADALTON LUIZ'));
  const [observacoes, setObservacoes] = useState('');
  const [isValidadeCurta, setIsValidadeCurta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Keep solicitante synced with activeVendor
  useEffect(() => {
    if (activeVendor) {
      setSolicitante(activeVendor);
    }
  }, [activeVendor]);

  // Execute Search Function
  const runSearch = useCallback(async (pageToLoad = 1) => {
    setIsSearching(true);
    try {
      const res = await api.queryProducts({
        search: searchTerm,
        fornecedor: selectedFornecedor,
        situacao: selectedSituacao,
        estoque: selectedEstoque,
        page: pageToLoad,
        limit: 40
      });
      setQueryResult(res);
      setCurrentPage(res.page);
    } catch (err) {
      console.error("Erro ao pesquisar produtos:", err);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, selectedFornecedor, selectedSituacao, selectedEstoque]);

  // Debounced search on term/filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [runSearch]);

  // Handle Smart AI Search
  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);

    try {
      const filters = await parseSearchQueryWithGemini(aiPrompt);
      if (filters.codigo) {
        setSearchTerm(filters.codigo);
      } else if (filters.descricao) {
        setSearchTerm(filters.descricao);
      }
      if (filters.fornecedor) {
        setSelectedFornecedor(filters.fornecedor.toUpperCase());
      }
      if (filters.situacao) {
        setSelectedSituacao(filters.situacao.toUpperCase());
      }
      setShowAiSearch(false);
      setAiPrompt('');
    } catch (err) {
      console.warn("Erro ao processar busca com IA:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Check recent requests for a product in last 7 days
  const getRecentRequest = useCallback((productCode: string): StockRequest | undefined => {
    if (!productCode) return undefined;
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 7);

    return requests.find(r => {
      if (r.productCode !== productCode) return false;
      return new Date(r.dataSolicitacao) >= limitDate;
    });
  }, [requests]);

  // Open modal for request
  const handleOpenRequestModal = (prod: Product) => {
    setSelectedProduct(prod);
    setQuantidade(1);
    setUnidade('CX');
    setTipo('Aposta na Venda');
    setObservacoes('');
    setIsValidadeCurta(prod.situacao === 'DV');
    setRequestSuccess(false);
    setCopiedMsg(false);
  };

  // Submit Request
  const handleSubmitRequest = async (e: React.FormEvent, sendWhatsApp = false) => {
    e.preventDefault();
    if (!selectedProduct || quantidade <= 0 || !solicitante) return;

    setIsSubmitting(true);
    try {
      const saved = await onSubmitRequest({
        productId: selectedProduct.id,
        productCode: selectedProduct.codigo,
        productName: selectedProduct.produto,
        productSabor: selectedProduct.sabor,
        productSituacao: selectedProduct.situacao,
        fornecedor: selectedProduct.fornecedor,
        quantidade,
        unidade,
        tipo,
        solicitante,
        observacoes,
        isValidadeCurta,
        estoqueMarsilMomento: selectedProduct.estoqueMarsil,
        estoqueBoraceiaMomento: selectedProduct.estoqueBoraceia
      });

      setRequestSuccess(true);
      onSelectVendor(solicitante);

      if (sendWhatsApp) {
        const msg = encodeURIComponent(`*SOLICITAÇÃO DE ESTOQUE - BORACÉIA*
📦 *Produto:* ${selectedProduct.produto}
🔢 *Código:* ${selectedProduct.codigo}
🍓 *Sabor:* ${selectedProduct.sabor || 'Padrão'}
📊 *Quantidade:* ${quantidade} ${unidade}
🎯 *Tipo:* ${tipo}
👤 *Solicitante:* ${solicitante}
${isValidadeCurta ? '⚠️ *ATENÇÃO:* Validade Curta\n' : ''}${observacoes ? `📝 *Obs:* ${observacoes}\n` : ''}🏢 *Estoque Marsil:* ${selectedProduct.estoqueMarsil} | *Boracéia:* ${selectedProduct.estoqueBoraceia}`);

        const phone = whatsappConfig.phoneNumber.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
      }

      setTimeout(() => {
        setSelectedProduct(null);
        setRequestSuccess(false);
      }, 1500);
    } catch (err: any) {
      alert(`Erro ao enviar solicitação: ${err.message || 'Falha de conexão'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyModalMessage = () => {
    if (!selectedProduct) return;
    const msg = `*SOLICITAÇÃO DE ESTOQUE - BORACÉIA*
📦 *Produto:* ${selectedProduct.produto}
🔢 *Código:* ${selectedProduct.codigo}
🍓 *Sabor:* ${selectedProduct.sabor || 'Padrão'}
📊 *Quantidade:* ${quantidade} ${unidade}
🎯 *Tipo:* ${tipo}
👤 *Solicitante:* ${solicitante}
${isValidadeCurta ? '⚠️ *ATENÇÃO:* Validade Curta\n' : ''}${observacoes ? `📝 *Obs:* ${observacoes}\n` : ''}🏢 *Estoque Marsil:* ${selectedProduct.estoqueMarsil} | *Boracéia:* ${selectedProduct.estoqueBoraceia}`;

    navigator.clipboard.writeText(msg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Search Header & Main Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Main Search Input */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite código, nome do produto, sabor ou marca (Ex: 1001, Snickers, Fini)..."
              className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAiSearch(!showAiSearch)}
            className={`inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              showAiSearch
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Busca Inteligente</span>
          </button>
        </div>

        {/* AI Natural Language Search Prompt */}
        {showAiSearch && (
          <form onSubmit={handleAiSearch} className="bg-blue-50/70 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-3 animate-fade-in">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-800 dark:text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Digite em linguagem natural o que procura:</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: 'Quero ver biscoitos Bauducco em promoção' ou 'Chocolates com estoque em Marsil'..."
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isAiLoading || !aiPrompt.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center space-x-1.5 transition-colors"
              >
                {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Buscar</span>}
              </button>
            </div>
          </form>
        )}

        {/* Quick Filter Chips */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1 max-w-full custom-scrollbar">
            <button
              onClick={() => setSelectedEstoque('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedEstoque === 'todos'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Todos ({queryResult.total})
            </button>

            <button
              onClick={() => setSelectedEstoque('marsil')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedEstoque === 'marsil'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
              }`}
            >
              Com Estoque Marsil
            </button>

            <button
              onClick={() => setSelectedEstoque('boraceia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedEstoque === 'boraceia'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              Com Estoque Boracéia
            </button>

            <button
              onClick={() => setSelectedEstoque('ambos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedEstoque === 'ambos'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Disponível em Ambos
            </button>

            <button
              onClick={() => setSelectedEstoque('zerado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedEstoque === 'zerado'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              Zerados
            </button>
          </div>

          {/* View mode toggle & Cart button */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('cards')}
                title="Visualização em Cards"
                className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Visualização em Tabela Compacta"
                className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Pedido Atual Quick Button */}
            <button
              onClick={() => setIsOrderDrawerOpen(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                orderItems.length > 0
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Abrir detalhes do pedido consolidado"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Pedido ({orderItems.length})</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters (Fornecedor & Situação) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filtrar por Marca / Fornecedor</label>
            <select
              value={selectedFornecedor}
              onChange={(e) => setSelectedFornecedor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os Fornecedores ({queryResult.fornecedores.length})</option>
              {queryResult.fornecedores.map(f => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filtrar por Situação</label>
            <select
              value={selectedSituacao}
              onChange={(e) => setSelectedSituacao(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as Situações</option>
              {queryResult.situacoes.map(s => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.label} ({s.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Clear Bar */}
        {(searchTerm || selectedFornecedor || selectedSituacao || selectedEstoque !== 'todos') && (
          <div className="flex items-center justify-between text-xs bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400">
            <span>Filtros ativos aplicados</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedFornecedor('');
                setSelectedSituacao('');
                setSelectedEstoque('todos');
              }}
              className="text-rose-600 dark:text-rose-400 hover:underline font-bold"
            >
              Limpar Todos os Filtros
            </button>
          </div>
        )}

      </div>

      {/* Results Summary Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {isSearching ? 'Consultando banco de dados...' : `${queryResult.total.toLocaleString('pt-BR')} produtos encontrados`}
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline text-blue-600 dark:text-blue-400 font-semibold">
            Estoque Marsil: {queryResult.totalMarsilSum.toLocaleString('pt-BR')}
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-semibold">
            Estoque Boracéia: {queryResult.totalBoraceiaSum.toLocaleString('pt-BR')}
          </span>
        </div>

        <span className="font-medium">
          Página {queryResult.page} de {queryResult.totalPages}
        </span>
      </div>

      {/* Results Grid / Table */}
      {isSearching ? (
        <div className="p-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Consultando estoque em tempo real...</p>
        </div>
      ) : queryResult.items.length === 0 ? (
        <div className="p-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhum produto encontrado</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não encontramos itens com os critérios informados. Experimente buscar por outro código, reduzir os filtros ou limpar a busca.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queryResult.items.map(prod => {
            const recent = getRecentRequest(prod.codigo);
            const situacaoBadge = SITUACAO_BADGES[prod.situacao] || {
              label: prod.situacao,
              color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
              border: 'border-slate-200 dark:border-slate-700'
            };

            const marsilZero = prod.estoqueMarsil <= 0;
            const boraceiaZero = prod.estoqueBoraceia <= 0;

            const inOrder = isItemInOrder(prod.id);
            const cartItem = getOrderItem(prod.id);

            return (
              <div
                key={prod.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                  inOrder
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/15 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/80'
                }`}
              >
                <div className="space-y-3">
                  
                  {/* Header: Code, Checkbox & Situacao */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAddToOrder(prod)}
                        className={`p-1 rounded-lg transition-colors ${
                          inOrder 
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80' 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={inOrder ? 'Remover do pedido' : 'Adicionar ao pedido'}
                      >
                        {inOrder ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                      </button>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-extrabold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-blue-700 dark:text-blue-400 rounded-lg">
                          CÓD: {prod.codigo}
                        </span>
                        {prod.novoCodigo && prod.novoCodigo !== prod.codigo && (
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800" title="Novo Código do Produto">
                            NOVO: {prod.novoCodigo}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${situacaoBadge.color} ${situacaoBadge.border}`}>
                      {prod.situacao} - {situacaoBadge.label}
                    </span>
                  </div>

                  {/* Product Title */}
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {prod.produto}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{prod.fornecedor}</span>
                      {prod.sabor && (
                        <>
                          <span>•</span>
                          <span>{prod.sabor}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 7-Day Recent Request Warning Banner */}
                  {recent && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-2.5 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Já solicitado nos últimos 7 dias:</strong>
                        <p className="mt-0.5">
                          Por <strong>{recent.solicitante}</strong> ({recent.quantidade} {recent.unidade} - {recent.tipo})
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Stock Comparison Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80">
                      <span className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        Estoque Marsil
                      </span>
                      <span className={`text-lg sm:text-xl font-black ${marsilZero ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {prod.estoqueMarsil.toLocaleString('pt-BR')}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{prod.embalagem || 'UN'}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80">
                      <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Estoque Boracéia
                      </span>
                      <span className={`text-lg sm:text-xl font-black ${boraceiaZero ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {prod.estoqueBoraceia.toLocaleString('pt-BR')}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{prod.embalagem || 'UN'}</span>
                    </div>
                  </div>

                  {/* Stock Difference Indicator */}
                  <div className="flex items-center justify-between text-xs px-1 text-slate-500">
                    <span>Balanço:</span>
                    {prod.estoqueMarsil > 0 && prod.estoqueBoraceia <= 0 ? (
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        Disponível em Marsil ({prod.estoqueMarsil} CX)
                      </span>
                    ) : prod.estoqueMarsil > prod.estoqueBoraceia ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        +{prod.percentualDiferenca}% em Marsil
                      </span>
                    ) : prod.estoqueMarsil === 0 && prod.estoqueBoraceia === 0 ? (
                      <span className="font-bold text-rose-500">Esgotado em ambos</span>
                    ) : (
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Equilibrado</span>
                    )}
                  </div>

                </div>

                {/* Action Area: In-Order Controls or Quick Add */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {inOrder ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/50 p-2 rounded-xl border border-blue-200 dark:border-blue-900/60">
                        <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>No Pedido ({cartItem?.unidade || 'CX'})</span>
                        </span>

                        {/* Stepper */}
                        <div className="flex items-center border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(prod.id, -1)}
                            className="p-1 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-700 dark:text-blue-300"
                            title="Diminuir"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={cartItem?.quantidade || 1}
                            onChange={(e) => handleSetItemQty(prod.id, Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-10 text-center text-xs font-black bg-transparent border-none focus:outline-none text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(prod.id, 1)}
                            className="p-1 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-700 dark:text-blue-300"
                            title="Aumentar"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsOrderDrawerOpen(true)}
                          className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition-colors"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Ver Pedido ({orderItems.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(prod.id)}
                          className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
                          title="Remover deste pedido"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAddToOrder(prod)}
                        className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar ao Pedido</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenRequestModal(prod)}
                        className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1"
                        title="Fazer pedido individual avulso"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Individual</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (

        /* Compact Table View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">Sel.</th>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Produto / Sabor</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4 text-center">Marsil</th>
                  <th className="py-3 px-4 text-center">Boracéia</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {queryResult.items.map(prod => {
                  const recent = getRecentRequest(prod.codigo);
                  const inOrder = isItemInOrder(prod.id);
                  const cartItem = getOrderItem(prod.id);

                  return (
                    <tr 
                      key={prod.id} 
                      className={`transition-colors ${
                        inOrder 
                          ? 'bg-blue-50/40 dark:bg-blue-950/20' 
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAddToOrder(prod)}
                          className="p-1 text-slate-400 hover:text-blue-600"
                        >
                          {inOrder ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                          {prod.codigo}
                        </span>
                        {prod.novoCodigo && prod.novoCodigo !== prod.codigo && (
                          <span className="block font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                            Novo: {prod.novoCodigo}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{prod.produto}</div>
                        {prod.sabor && <div className="text-xs text-slate-400">{prod.sabor}</div>}
                        {recent && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                            ⚠️ Solicitado há 7d por {recent.solicitante}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {prod.fornecedor}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {prod.situacao}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-blue-700 dark:text-blue-400">
                        {prod.estoqueMarsil}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-emerald-700 dark:text-emerald-400">
                        {prod.estoqueBoraceia}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {inOrder ? (
                          <div className="inline-flex items-center space-x-1">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-lg">
                              {cartItem?.quantidade} {cartItem?.unidade}
                            </span>
                            <button
                              onClick={() => handleRemoveItem(prod.id)}
                              className="px-2 py-1 text-slate-400 hover:text-rose-600 text-xs font-bold"
                              title="Remover do pedido"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleToggleAddToOrder(prod)}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center space-x-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Pedido</span>
                            </button>
                            <button
                              onClick={() => handleOpenRequestModal(prod)}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
                              title="Pedir avulso"
                            >
                              Avulso
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {queryResult.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => runSearch(currentPage - 1)}
            disabled={currentPage <= 1 || isSearching}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1.5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <span className="text-xs text-slate-500 font-medium">
            Página {currentPage} de {queryResult.totalPages}
          </span>

          <button
            onClick={() => runSearch(currentPage + 1)}
            disabled={currentPage >= queryResult.totalPages || isSearching}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1.5 transition-colors"
          >
            <span>Próxima</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal: Solicitar Transferência de Estoque */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                  CÓD: {selectedProduct.codigo}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedProduct.produto}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={(e) => handleSubmitRequest(e, false)} className="p-6 space-y-4">
              
              {/* Current Stocks Display */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl text-center text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Estoque Marsil:</span>
                  <span className="font-black text-sm block text-blue-600 dark:text-blue-400">
                    {selectedProduct.estoqueMarsil} {selectedProduct.embalagem}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Estoque Boracéia:</span>
                  <span className="font-black text-sm block text-emerald-600 dark:text-emerald-400">
                    {selectedProduct.estoqueBoraceia} {selectedProduct.embalagem}
                  </span>
                </div>
              </div>

              {/* Solicitante (Vendedor) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Quem está solicitando? (Vendedor)
                </label>
                <select
                  value={solicitante}
                  onChange={(e) => setSolicitante(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {vendedores.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Quantidade & Unidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Quantidade Desejada
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Unidade
                  </label>
                  <select
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value as UnitType)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {UNIT_OPTIONS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tipo de Demanda */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Finalidade da Solicitação
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo('Aposta na Venda')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      tipo === 'Aposta na Venda'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Aposta na Venda (Teste Giro)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipo('Venda Garantida')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      tipo === 'Venda Garantida'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Venda Garantida (Pedido Fechado)
                  </button>
                </div>
              </div>

              {/* Validade Curta Checkbox */}
              <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isValidadeCurta}
                  onChange={(e) => setIsValidadeCurta(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Marcar como Validade Curta (Atenção logística)
                </span>
              </label>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações adicionais (opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Cliente aguardando entrega na segunda-feira..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {requestSuccess ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 p-4 rounded-xl text-center space-y-1 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                  <p className="font-bold text-sm">Solicitação registrada com sucesso!</p>
                  <p className="text-xs">Sincronizada em tempo real com a administração.</p>
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition-colors"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Registrar no Sistema</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleSubmitRequest(e, true)}
                      disabled={isSubmitting}
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-colors"
                      title="Registrar e abrir WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">Enviar WhatsApp</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={copyModalMessage}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    {copiedMsg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMsg ? 'Mensagem Copiada!' : 'Copiar texto para WhatsApp'}</span>
                  </button>
                </div>
              )}

            </form>

          </div>
        </div>
      )}

      {/* FLOATING ORDER DOCK (WHEN ITEMS ARE SELECTED) */}
      {orderItems.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[94%] bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-3 sm:p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 text-white font-black text-[10px] rounded-full flex items-center justify-center border-2 border-slate-900">
                {orderItems.length}
              </span>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-white">
                Pedido com {orderItems.length} {orderItems.length === 1 ? 'produto' : 'produtos'}
              </p>
              <p className="text-[11px] text-slate-300">
                Total de <strong className="text-emerald-400 font-bold">{totalVolumesInOrder}</strong> volumes selecionados
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleClearOrder}
              className="py-2 px-3 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setIsOrderDrawerOpen(true)}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition-colors"
            >
              <span>Revisar e Finalizar Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MULTI-ITEM ORDER MODAL */}
      <OrderDrawerModal
        isOpen={isOrderDrawerOpen}
        onClose={() => setIsOrderDrawerOpen(false)}
        orderItems={orderItems}
        onUpdateItemQty={handleUpdateItemQty}
        onSetItemQty={handleSetItemQty}
        onSetItemUnit={handleSetItemUnit}
        onSetItemTipo={handleSetItemTipo}
        onToggleItemValidade={handleToggleItemValidade}
        onSetItemNotes={handleSetItemNotes}
        onRemoveItem={handleRemoveItem}
        onClearOrder={handleClearOrder}
        vendedores={vendedores}
        activeVendor={activeVendor}
        onSelectVendor={onSelectVendor}
        whatsappConfig={whatsappConfig}
        onSubmitOrder={onSubmitOrder || (async (payload, sendWa) => {
          return api.createOrder(payload);
        })}
        onViewRequests={onViewRequests}
      />

    </div>
  );
};
