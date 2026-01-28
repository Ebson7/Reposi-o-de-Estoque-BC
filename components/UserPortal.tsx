
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Send, AlertCircle, CheckCircle2, UserCircle, Package, Truck, Filter, Layers, MessageCircle, Trash2, ListPlus, ShoppingCart, Copy, ClipboardCheck, Calendar, X, Building2, Store, Info } from 'lucide-react';
import { Product, StockRequest, RequestType, UnitType, WhatsAppConfig } from '../types';
import { formatCurrency } from '../utils';

interface UserPortalProps {
  products: Product[];
  requests: StockRequest[];
  vendedores: string[];
  whatsappConfig: WhatsAppConfig;
  onSubmitRequest: (req: Omit<StockRequest, 'id' | 'dataSolicitacao' | 'status'>) => void;
}

interface DraftItem {
  product: Product;
  quantidade: number;
  unidade: UnitType;
  tipo: RequestType;
}

const ITEMS_PER_PAGE = 10;

export const UserPortal: React.FC<UserPortalProps> = ({ products, requests, vendedores, whatsappConfig, onSubmitRequest }) => {
  const [filterCodigo, setFilterCodigo] = useState('');
  const [filterFornecedor, setFilterFornecedor] = useState('');
  const [filterDescricao, setFilterDescricao] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [solicitante, setSolicitante] = useState('');
  const [formData, setFormData] = useState({
    quantidade: 0,
    unidade: 'Unidade' as UnitType,
    tipo: 'Teste' as RequestType
  });

  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Current Date for UI and Message
  const currentDateFormatted = useMemo(() => new Date().toLocaleDateString('pt-BR'), []);

  const hasSearch = useMemo(() => filterCodigo.length >= 2 || filterFornecedor.length >= 3 || filterDescricao.length >= 3, [filterCodigo, filterFornecedor, filterDescricao]);

  const filteredProducts = useMemo(() => {
    if (!hasSearch) return [];
    return products.filter(p => {
      const matchCodigo = filterCodigo === '' || p.codigo.toLowerCase().includes(filterCodigo.toLowerCase());
      const matchFornecedor = filterFornecedor === '' || p.fornecedor.toLowerCase().includes(filterFornecedor.toLowerCase());
      const matchDescricao = filterDescricao === '' || p.produto.toLowerCase().includes(filterDescricao.toLowerCase());
      return matchCodigo && matchFornecedor && matchDescricao;
    });
  }, [products, filterCodigo, filterFornecedor, filterDescricao, hasSearch]);

  useEffect(() => setCurrentPage(1), [filterCodigo, filterFornecedor, filterDescricao]);

  const currentItems = useMemo(() => filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [filteredProducts, currentPage]);

  const addToDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setMessage({ type: 'error', text: 'Selecione um produto primeiro.' });
      return;
    }
    if (formData.quantidade <= 0) {
      setMessage({ type: 'error', text: 'Informe a quantidade.' });
      return;
    }

    if (draftItems.length >= 10) {
      setMessage({ type: 'error', text: 'Limite de 10 itens atingido.' });
      return;
    }

    setDraftItems([...draftItems, { product: selectedProduct, ...formData }]);
    setSelectedProduct(null);
    setFormData({ ...formData, quantidade: 0, unidade: 'Unidade', tipo: 'Teste' });
    setMessage({ type: 'success', text: 'Adicionado!' });
    setTimeout(() => setMessage(null), 2000);
  };

  const removeItem = (index: number) => {
    setDraftItems(draftItems.filter((_, i) => i !== index));
  };

  const generateMessageText = () => {
    if (!solicitante) return '';
    let text = `📦 *PEDIDO MARSIL*\n📅 *Data:* ${currentDateFormatted}\n👤 *Vend:* ${solicitante}\n\n`;
    draftItems.forEach((item) => {
      text += `QTD: ${item.quantidade} - Cód: ${item.product.codigo}\n`;
    });
    text += `\nPedido Extra Boracéia`;
    return text;
  };

  const handleCopyToClipboard = async () => {
    if (!solicitante) {
      setMessage({ type: 'error', text: 'Selecione o vendedor.' });
      return;
    }
    const text = generateMessageText();
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setMessage({ type: 'success', text: 'Pedido copiado!' });
      setTimeout(() => {
        setIsCopied(false);
        setMessage(null);
      }, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao copiar.' });
    }
  };

  const handleFinalSubmit = () => {
    if (!solicitante) {
      setMessage({ type: 'error', text: 'Selecione o vendedor.' });
      return;
    }
    if (draftItems.length === 0) return;

    if (whatsappConfig.enabled && whatsappConfig.phoneNumber) {
      const text = generateMessageText();
      const url = `https://wa.me/${whatsappConfig.phoneNumber}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }

    draftItems.forEach(item => {
      const fullProductName = item.product.sabor ? `${item.product.produto} - ${item.product.sabor}` : item.product.produto;
      onSubmitRequest({
        productId: item.product.id,
        productName: fullProductName,
        productCode: item.product.codigo,
        quantidade: item.quantidade,
        unidade: item.unidade,
        tipo: item.tipo,
        solicitante: solicitante
      });
    });

    setDraftItems([]);
    setMessage({ type: 'success', text: 'Enviado!' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="max-w-4xl w-full mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Vendedor Selector & Current Date Display */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex-grow flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500 shrink-0">
            <UserCircle className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Seu Nome:</span>
          </div>
          <select 
            required 
            className="flex-grow sm:max-w-xs px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm" 
            value={solicitante} 
            onChange={(e) => setSolicitante(e.target.value)}
          >
            <option value="">SELECIONE...</option>
            {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        
        <div className="flex items-center gap-3 bg-blue-50/50 dark:bg-blue-900/20 px-4 py-2 sm:py-3 rounded-xl border border-blue-100 dark:border-blue-900/30 shrink-0 self-start sm:self-center">
          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-blue-400 dark:text-blue-600 uppercase tracking-tighter leading-none mb-0.5">Consulta Estoque</span>
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{currentDateFormatted}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Left: Search and Results */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6 order-1 lg:order-1">
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2 dark:text-white">
              <Search className="w-5 h-5 text-blue-600" /> Pesquisar Produto
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="Cód. Item" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white text-sm" 
                  value={filterCodigo} 
                  onChange={(e) => setFilterCodigo(e.target.value)} 
                />
                <input 
                  type="text" 
                  placeholder="Fornecedor" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white text-sm" 
                  value={filterFornecedor} 
                  onChange={(e) => setFilterFornecedor(e.target.value)} 
                />
              </div>
              <input 
                type="text" 
                placeholder="Nome do produto..." 
                className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white text-sm" 
                value={filterDescricao} 
                onChange={(e) => setFilterDescricao(e.target.value)} 
              />
            </div>

            {hasSearch && filteredProducts.length > 0 && (
              <div className="mt-4 max-h-[350px] sm:max-h-[300px] overflow-y-auto border border-gray-50 dark:border-slate-800 rounded-xl divide-y dark:divide-slate-800 custom-scrollbar shadow-inner">
                {currentItems.map(p => (
                  <button key={p.id} onClick={() => setSelectedProduct(p)} className={`w-full text-left p-4 hover:bg-blue-50 dark:hover:bg-slate-800/80 transition-colors flex justify-between items-center group active:bg-blue-100 ${selectedProduct?.id === p.id ? 'bg-blue-50 dark:bg-slate-800 ring-2 ring-blue-500 ring-inset' : ''}`}>
                    <div className="flex-grow pr-2">
                      <p className="font-semibold dark:text-slate-200 text-sm line-clamp-1">{p.produto}</p>
                      <p className="text-[10px] text-blue-600 font-bold uppercase">{p.codigo}</p>
                    </div>
                    <div className="flex gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-blue-600">{formatCurrency(p.estoqueMarsil)}</p>
                        <p className="text-[7px] text-gray-400 uppercase font-black">Marsil</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-emerald-600">{formatCurrency(p.estoqueBoraceia)}</p>
                        <p className="text-[7px] text-gray-400 uppercase font-black">Borac.</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {hasSearch && filteredProducts.length === 0 && (
              <div className="mt-4 p-6 text-center bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-medium">Nenhum item encontrado.</p>
                <p className="text-[10px] text-red-500 font-bold uppercase mt-2 tracking-tight">
                  Se a pesquisa não retornar nada é por que o estoque é 0 na Marsil SP
                </p>
              </div>
            )}
          </div>

          {/* Form Section - Always Visible */}
          <div className={`bg-white dark:bg-slate-900 rounded-3xl shadow-sm border-2 transition-all duration-300 overflow-hidden ${selectedProduct ? 'border-blue-500 shadow-xl' : 'border-gray-100 dark:border-slate-800 opacity-90'}`}>
            <div className={`p-4 text-white flex justify-between items-center transition-colors duration-300 ${selectedProduct ? 'bg-blue-600' : 'bg-gray-400 dark:bg-slate-800'}`}>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold uppercase opacity-75">
                  {selectedProduct ? 'Produto Selecionado:' : 'Aguardando seleção:'}
                </span>
                <h3 className="text-sm font-bold truncate pr-4">
                  {selectedProduct ? selectedProduct.produto : 'Escolha um item na busca acima'}
                </h3>
              </div>
              {selectedProduct && (
                <button onClick={() => setSelectedProduct(null)} className="hover:bg-blue-700 p-2 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Resumo de Estoque */}
            <div className="bg-gray-50 dark:bg-slate-800/50 px-5 py-3 flex justify-around border-b border-gray-100 dark:border-slate-800">
              <div className={`flex items-center gap-2 transition-opacity ${selectedProduct ? 'opacity-100' : 'opacity-30'}`}>
                <Building2 className="w-4 h-4 text-blue-500" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase text-gray-400">Marsil</span>
                  <span className="text-xs font-black dark:text-slate-200">{selectedProduct ? formatCurrency(selectedProduct.estoqueMarsil) : '-'}</span>
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-slate-700" />
              <div className={`flex items-center gap-2 transition-opacity ${selectedProduct ? 'opacity-100' : 'opacity-30'}`}>
                <Store className="w-4 h-4 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase text-gray-400">Boracéia</span>
                  <span className="text-xs font-black dark:text-slate-200">{selectedProduct ? formatCurrency(selectedProduct.estoqueBoraceia) : '-'}</span>
                </div>
              </div>
            </div>

            <form onSubmit={addToDraft} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase ml-1 block mb-1">Qtd.</label>
                  <input 
                    type="number" 
                    disabled={!selectedProduct}
                    required 
                    min="1" 
                    className={`w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 dark:text-white text-base sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all ${!selectedProduct ? 'cursor-not-allowed' : ''}`} 
                    value={formData.quantidade || ''} 
                    onChange={(e) => setFormData({...formData, quantidade: parseInt(e.target.value) || 0})} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase ml-1 block mb-1">Unidade</label>
                  <select 
                    disabled={!selectedProduct}
                    className={`w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 dark:text-white text-base sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all ${!selectedProduct ? 'cursor-not-allowed' : ''}`} 
                    value={formData.unidade} 
                    onChange={(e) => setFormData({...formData, unidade: e.target.value as UnitType})}
                  >
                    <option value="Unidade">Unidade</option>
                    <option value="Caixa">Caixa</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={!selectedProduct}
                className={`w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-xl transition-all active:scale-95 ${selectedProduct ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-400 cursor-not-allowed shadow-none'}`}
              >
                <ListPlus className="w-5 h-5" /> Adicionar à Lista
              </button>
            </form>
          </div>
        </div>

        {/* Right: Cart/List Review */}
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-2">
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 dark:text-white">
                <ShoppingCart className="w-5 h-5 text-emerald-600" /> Sua Lista
              </h2>
              <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${draftItems.length >= 10 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {draftItems.length}/10 Itens
              </span>
            </div>

            <div className="flex-grow space-y-3 mb-6">
              {draftItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300 dark:text-slate-700 opacity-50">
                  <Package className="w-16 h-16 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Lista Vazia</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {draftItems.map((item, idx) => (
                    <div key={idx} className="group relative bg-gray-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 transition-all active:scale-[0.98]">
                      <div className="flex justify-between items-start pr-8">
                        <div>
                          <p className="text-xs font-bold dark:text-slate-200 line-clamp-1">{item.product.produto}</p>
                          <p className="text-[10px] text-blue-600 font-bold mt-1.5 flex items-center gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded uppercase">QTD: {item.quantidade}</span>
                            <span className="opacity-50">•</span>
                            <span>Cód: {item.product.codigo}</span>
                          </p>
                        </div>
                        <button 
                          onClick={() => removeItem(idx)} 
                          className="absolute right-2 top-2 p-2 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-auto space-y-3 pt-6 border-t border-gray-50 dark:border-slate-800">
              <div className="grid grid-cols-1 gap-2.5">
                <button 
                  onClick={handleFinalSubmit}
                  disabled={draftItems.length === 0 || !solicitante}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">Enviar WhatsApp</span>
                </button>
                
                <button 
                  onClick={handleCopyToClipboard}
                  disabled={draftItems.length === 0 || !solicitante}
                  className="w-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-slate-200 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
                >
                  {isCopied ? <ClipboardCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {isCopied ? 'Copiado!' : 'Copiar Pedido'}
                </button>
              </div>
              
              {!solicitante && draftItems.length > 0 && (
                <p className="text-[10px] text-red-500 text-center font-bold animate-pulse uppercase tracking-tight">⚠️ Por favor, selecione seu nome acima!</p>
              )}
              
              <div className="pt-2">
                 <p className="text-[9px] text-center text-gray-400 dark:text-slate-500 font-bold italic uppercase tracking-widest">Pedido Extra Boracéia</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className={`fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 px-6 py-4 rounded-2xl text-white shadow-2xl flex items-center justify-center gap-3 z-[100] animate-in fade-in slide-in-from-bottom-8 ${message.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-bold text-sm tracking-tight">{message.text}</span>
        </div>
      )}
    </div>
  );
};
