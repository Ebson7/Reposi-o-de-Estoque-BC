
import React, { useState, useMemo, useCallback } from 'react';
import { Search, ShoppingCart, Calendar, RefreshCw, AlertTriangle, Building2, Store, ListPlus, X, Send, User, Hash, FileText, Filter, Copy, Check, Clock, History, Clipboard, ArrowRight, PlusCircle, CheckCircle2, Candy, Trash2, Edit3, MessageSquareText, Timer, Info } from 'lucide-react';
import { Product, StockRequest, WhatsAppConfig, RequestType, UnitType } from '../types';

interface UserPortalProps {
  products: Product[];
  requests: StockRequest[];
  vendedores: string[];
  whatsappConfig: WhatsAppConfig;
  onSubmitRequest: (req: StockRequest) => void;
  onDeleteRequest: (id: string) => void;
  onClearUserRequests: (solicitante: string) => void;
  onUpdateRequest: (req: StockRequest) => void;
  isSyncing?: boolean;
  onManualRefresh?: () => void;
  lastUpdate?: string;
}

const UNIT_OPTIONS: UnitType[] = ['UN', 'CX', 'DP', 'PCT', 'PT', 'SC', 'FD'];

export const UserPortal: React.FC<UserPortalProps> = ({ 
  products, 
  requests, 
  vendedores, 
  whatsappConfig, 
  onSubmitRequest,
  onDeleteRequest,
  onClearUserRequests,
  onUpdateRequest,
  isSyncing = false,
  onManualRefresh,
  lastUpdate
}) => {
  const [activeView, setActiveView] = useState<'consulta' | 'historico'>('consulta');
  const [filterCodigo, setFilterCodigo] = useState('');
  const [filterDescricao, setFilterDescricao] = useState('');
  const [filterFornecedor, setFilterFornecedor] = useState('');
  
  const [selected, setSelected] = useState<Product | null>(null);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'success'>('idle');
  
  // Request Form States
  const [quant, setQuant] = useState<number>(1);
  const [unit, setUnit] = useState<UnitType>('CX');
  const [type, setType] = useState<RequestType>('Aposta na Venda');
  const [solicitante, setSolicitante] = useState(() => {
    return '';
  });
  const [observacoes, setObservacoes] = useState('');
  const [isValidadeCurta, setIsValidadeCurta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtro Combinado
  const filteredProducts = useMemo(() => {
    const cod = filterCodigo.toLowerCase().trim();
    const desc = filterDescricao.toLowerCase().trim();
    const forn = filterFornecedor.toLowerCase().trim();
    
    if (!cod && !desc && !forn) return [];
    
    return products.filter(p => {
      const matchCod = !cod || String(p.codigo).toLowerCase().includes(cod);
      const matchDesc = !desc || p.produto.toLowerCase().includes(desc);
      const matchForn = !forn || p.fornecedor.toLowerCase().includes(forn);
      return matchCod && matchDesc && matchForn;
    }).slice(0, 40);
  }, [products, filterCodigo, filterDescricao, filterFornecedor]);

  // Histórico filtrado pelo solicitante atual
  const myRequests = useMemo(() => {
    if (!solicitante) return [];
    return requests.filter(r => r.solicitante === solicitante);
  }, [requests, solicitante]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(id);
      setTimeout(() => setCopySuccess(null), 2000);
    });
  };

  const handleCopyFormattedList = () => {
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const itemsStr = myRequests.map(r => 
      `QTD: ${r.quantidade} UNIDADE: ${r.unidade} - Cód: ${r.productCode}${r.productSabor ? ` (${r.productSabor})` : ''}${r.isValidadeCurta ? ' [VALIDADE CURTA]' : ''}${r.observacoes ? ` [Obs: ${r.observacoes}]` : ''}`
    ).join('\n');
    
    const fullText = `📦 PEDIDO MARSIL
📅 Data do Pedido: ${dateStr}
👤 Vendedor: ${solicitante || 'Não Identificado'}

${itemsStr}

Pedido Extra Boracéia`;
    
    handleCopy(fullText, 'hist-all');
  };

  const handleClearCart = () => {
    if (window.confirm('Deseja realmente excluir TODOS os itens do seu pedido atual?')) {
      onClearUserRequests(solicitante);
    }
  };

  const handleEditRequest = (req: StockRequest) => {
    const product = products.find(p => String(p.id) === String(req.productId) || String(p.codigo) === String(req.productCode));
    if (product) {
      setSelected(product);
      setEditingRequestId(req.id);
      setQuant(req.quantidade);
      setUnit(req.unidade);
      setType(req.tipo);
      setSolicitante(req.solicitante);
      setObservacoes(req.observacoes || '');
      setIsValidadeCurta(req.isValidadeCurta || false);
    }
  };

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !solicitante) return;
    setIsSubmitting(true);

    if (editingRequestId) {
      const originalReq = requests.find(r => String(r.id) === String(editingRequestId));
      if (originalReq) {
        const updatedReq: StockRequest = {
          ...originalReq,
          quantidade: quant,
          unidade: unit,
          tipo: type,
          solicitante: solicitante,
          observacoes: observacoes,
          isValidadeCurta: isValidadeCurta,
          productSabor: selected.sabor || ''
        };
        onUpdateRequest(updatedReq);
      }
    } else {
      const newReq: StockRequest = {
        id: `req-${Date.now()}`,
        productId: selected.id,
        productName: selected.produto,
        productCode: String(selected.codigo),
        productSabor: selected.sabor || '',
        quantidade: quant,
        unidade: unit,
        tipo: type,
        solicitante: solicitante,
        observacoes: observacoes,
        isValidadeCurta: isValidadeCurta,
        dataSolicitacao: new Date().toISOString(),
        status: 'Pendente'
      };
      onSubmitRequest(newReq);
    }

    setRequestStatus('success');

    setTimeout(() => {
      setIsSubmitting(false);
      setSelected(null);
      setEditingRequestId(null);
      setRequestStatus('idle');
      setQuant(1);
      setObservacoes('');
      setIsValidadeCurta(false);
    }, 1200);
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('disponível') || s.includes('ativo') || s.includes('estoque')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (s.includes('falta') || s.includes('esgotado') || s.includes('inativo')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (s.includes('chegando') || s.includes('pedido') || s.includes('trânsito')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-400';
  };

  const hasFilters = filterCodigo || filterDescricao || filterFornecedor;

  const lastUpdateStr = lastUpdate ? new Date(lastUpdate).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6 animate-in fade-in duration-500">
      <div className={`p-6 rounded-3xl transition-all duration-500 border ${!solicitante ? 'bg-blue-600 border-blue-500 shadow-2xl shadow-blue-500/20 text-white' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 shadow-sm'}`}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-grow space-y-2">
            <h3 className={`text-base font-black uppercase tracking-widest flex items-center gap-2 ${!solicitante ? 'text-white' : 'dark:text-white'}`}>
              <User className={`w-5 h-5 ${!solicitante ? 'text-blue-100' : 'text-blue-500'}`} /> 
              Vendedor Responsável
            </h3>
            <p className={`text-[10px] font-bold uppercase ${!solicitante ? 'text-blue-100' : 'text-gray-400'}`}>
              {!solicitante ? 'Selecione sua identificação para começar a consulta' : 'Operando como ' + solicitante}
            </p>
          </div>

          <div className="relative group w-full sm:w-80">
            <select 
              className={`w-full pl-5 pr-10 py-4 rounded-2xl outline-none text-[11px] font-black uppercase tracking-wider shadow-sm transition-all appearance-none cursor-pointer border-2 ${!solicitante ? 'bg-white text-blue-600 border-white' : 'bg-gray-50 dark:bg-slate-800 dark:text-white border-transparent focus:border-blue-500'}`}
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
            >
              <option value="" disabled>Selecione um Vendedor...</option>
              {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${!solicitante ? 'text-blue-600' : 'text-gray-400'}`}>
              <ArrowRight className="w-3 h-3 rotate-90" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 w-fit">
          <button 
            onClick={() => setActiveView('consulta')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'consulta' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-blue-500'}`}
          >
            <Search className="w-3.5 h-3.5" /> Consulta
          </button>
          <button 
            onClick={() => setActiveView('historico')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'historico' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-blue-500'}`}
          >
            <History className="w-3.5 h-3.5" /> Carrinho ({myRequests.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden xs:flex flex-col items-end">
            <p className="text-[8px] font-black text-gray-400 uppercase leading-none">Última Sincronização</p>
            <p className="text-[10px] font-bold text-blue-500 leading-tight">{lastUpdateStr}</p>
          </div>
          <button 
            onClick={onManualRefresh}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${isSyncing ? 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 text-blue-600 hover:bg-blue-50'}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Atualizar Dados'}
          </button>
        </div>
      </div>

      {activeView === 'consulta' ? (
        <div className={`space-y-6 transition-opacity duration-300 ${!solicitante ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-base font-black flex items-center gap-2 uppercase tracking-widest dark:text-white mb-1">
                  <Filter className="w-5 h-5 text-blue-600" /> Pesquisa Avançada
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Busca por Código, Descrição ou Fabricante</p>
              </div>
              {hasFilters && (
                <button onClick={() => { setFilterCodigo(''); setFilterDescricao(''); setFilterFornecedor(''); }} className="text-[10px] font-black text-red-500 uppercase hover:underline flex items-center gap-1 pb-1">
                  <X className="w-3 h-3" /> Limpar Filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                <input type="text" placeholder="Código Item" className="w-full pl-11 pr-4 py-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 outline-none text-xs font-bold dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all" value={filterCodigo} onChange={(e) => setFilterCodigo(e.target.value)} />
              </div>
              <div className="relative group">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                <input type="text" placeholder="Nome / Descrição" className="w-full pl-11 pr-4 py-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 outline-none text-xs font-bold dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all" value={filterDescricao} onChange={(e) => setFilterDescricao(e.target.value)} />
              </div>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                <input type="text" placeholder="Fornecedor" className="w-full pl-11 pr-4 py-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 outline-none text-xs font-bold dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all" value={filterFornecedor} onChange={(e) => setFilterFornecedor(e.target.value)} />
              </div>
            </div>

            <div className="mt-8 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {filteredProducts.map(p => (
                <div key={p.id} className={`group w-full p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${selected?.id === p.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20' : 'border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60'}`}>
                  <div className="text-left flex-grow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        <span className="text-[9px] font-black flex items-center gap-1 mr-2"><Hash className="w-2.5 h-2.5" /> {p.codigo}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(p.codigo, `p-cod-${p.id}`); }} className="hover:text-blue-200 transition-colors">
                          {copySuccess === `p-cod-${p.id}` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                      {p.situacao && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${getStatusColor(p.situacao)}`}>
                          {p.situacao}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-black uppercase line-clamp-2 dark:text-white leading-tight mb-2 group-hover:text-blue-600 transition-colors">{p.produto}</p>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-blue-500" /> {p.fornecedor}
                      </span>
                      {p.sabor && (
                        <span className="text-[10px] text-pink-500 dark:text-pink-400 font-bold uppercase flex items-center gap-1">
                          <Candy className="w-3 h-3" /> {p.sabor}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-4 sm:pt-0 dark:border-slate-800 items-center">
                    <div className="flex gap-4 mr-2">
                      <div className="text-right">
                        <p className="text-base font-black dark:text-white leading-none">{p.estoqueMarsil}</p>
                        <p className="text-[8px] font-black uppercase text-gray-400 mt-1">Matriz</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-emerald-600 leading-none">{p.estoqueBoraceia}</p>
                        <p className="text-[8px] font-black uppercase text-gray-400 mt-1">Boracéia</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      disabled={!solicitante}
                      onClick={() => {
                        setEditingRequestId(null);
                        setSelected(p);
                        setQuant(1);
                        setUnit('CX');
                        setType('Aposta na Venda');
                        setObservacoes('');
                        setIsValidadeCurta(false);
                      }} 
                      className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-slate-800 text-white rounded-2xl shadow-xl shadow-blue-500/30 active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest disabled:shadow-none"
                    >
                      <ShoppingCart className="w-4 h-4" /> Solicitar
                    </button>
                  </div>
                </div>
              ))}
              
              {!hasFilters && (
                <div className="text-center py-32 opacity-20 flex flex-col items-center">
                  <Search className="w-16 h-16 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">Utilize os filtros acima para pesquisar o catálogo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-right-4">
          <div className="p-6 border-b border-gray-50 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center bg-gray-50/20 dark:bg-slate-800/20 gap-4">
            <div>
              <h3 className="text-sm font-black dark:text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" /> Carrinho de Pedidos
              </h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Vendedor Ativo: {solicitante || '---'}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleClearCart}
                disabled={myRequests.length === 0}
                className="text-[9px] font-black bg-red-50 dark:bg-red-900/30 text-red-600 px-4 py-2.5 rounded-xl uppercase flex items-center gap-2 hover:brightness-95 transition-all shadow-sm disabled:opacity-30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar
              </button>
              <button 
                onClick={handleCopyFormattedList}
                disabled={myRequests.length === 0}
                className="text-[9px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-4 py-2.5 rounded-xl uppercase flex items-center gap-2 hover:brightness-95 transition-all shadow-sm disabled:opacity-30"
              >
                {copySuccess === 'hist-all' ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                Copiar Lista
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {myRequests.length === 0 ? (
              <div className="py-24 text-center opacity-30 flex flex-col items-center">
                <Clock className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Seu carrinho de solicitações está vazio.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead className="bg-gray-50/50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase">Item</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase">Solicitação</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {myRequests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-1.5 w-fit rounded uppercase">{req.productCode}</span>
                            {req.isValidadeCurta && (
                              <span className="text-[8px] font-black bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase">
                                <Timer className="w-2.5 h-2.5" /> Val. Curta
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold dark:text-slate-200 line-clamp-1">{req.productName}</p>
                          {req.productSabor && (
                             <p className="text-[9px] font-black text-pink-500 uppercase">{req.productSabor}</p>
                          )}
                          {req.observacoes && (
                            <p className="text-[9px] text-blue-500 font-medium italic mt-0.5 max-w-xs truncate">"{req.observacoes}"</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-black text-gray-700 dark:text-slate-300 uppercase">{req.quantidade} {req.unidade}</span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase">{req.tipo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-3">
                          <button 
                            type="button"
                            onClick={() => handleEditRequest(req)}
                            className="flex flex-col items-center gap-1 group/btn"
                            title="Editar"
                          >
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 group-hover/btn:bg-blue-600 group-hover/btn:text-white rounded-xl transition-all shadow-sm">
                              <Edit3 className="w-4 h-4" />
                            </div>
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Deseja realmente excluir este item do pedido?')) {
                                onDeleteRequest(req.id);
                              }
                            }}
                            className="flex flex-col items-center gap-1 group/btn"
                            title="Excluir"
                          >
                            <div className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 group-hover/btn:bg-red-600 group-hover/btn:text-white rounded-xl transition-all shadow-sm">
                              <Trash2 className="w-4 h-4" />
                            </div>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-lg font-black dark:text-white uppercase leading-tight">
                  {editingRequestId ? 'Editar Item' : 'Configurar Item'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] font-bold text-blue-500 uppercase line-clamp-1">{selected.produto}</p>
                </div>
                {selected.sabor && (
                  <p className="text-[9px] font-black text-pink-500 uppercase flex items-center gap-1 mt-1">
                    <Candy className="w-2.5 h-2.5" /> Sabor: {selected.sabor}
                  </p>
                )}
              </div>
              <button onClick={() => { setSelected(null); setEditingRequestId(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleSendRequest} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 px-1 flex items-center gap-1 group/tooltip relative">
                    Quantidade
                    <Info className="w-3 h-3 text-gray-300 cursor-help" />
                    <span className="invisible group-hover/tooltip:visible absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] font-medium rounded-lg shadow-xl z-50 normal-case tracking-normal">
                      Informe o volume desejado baseado na unidade (UN, CX, etc).
                    </span>
                  </label>
                  <input type="number" min="1" required className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" value={quant} onChange={e => setQuant(parseInt(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 px-1">Unidade</label>
                  <select className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" value={unit} onChange={e => setUnit(e.target.value as UnitType)}>
                    {UNIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1 flex items-center gap-1 group/tooltip relative">
                  Natureza do Pedido
                  <Info className="w-3 h-3 text-gray-300 cursor-help" />
                  <span className="invisible group-hover/tooltip:visible absolute bottom-full left-0 mb-2 w-56 p-2 bg-slate-800 text-white text-[9px] font-medium rounded-lg shadow-xl z-50 normal-case tracking-normal">
                    Aposta: Previsão de venda futura. <br/> Garantida: Pedido para venda já realizada.
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setType('Aposta na Venda')} className={`py-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${type === 'Aposta na Venda' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-400 hover:bg-gray-100'}`}>Aposta na Venda</button>
                  <button type="button" onClick={() => setType('Venda Garantida')} className={`py-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${type === 'Venda Garantida' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-400 hover:bg-gray-100'}`}>Venda Garantida</button>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsValidadeCurta(!isValidadeCurta)} 
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition-all ${isValidadeCurta ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-400'}`}
                >
                  <div className="flex items-center gap-3">
                    <Timer className={`w-5 h-5 ${isValidadeCurta ? 'text-orange-500' : 'text-gray-400'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Validade Curta?</span>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isValidadeCurta ? 'bg-orange-500 border-orange-500' : 'border-gray-200 dark:border-slate-700'}`}>
                    {isValidadeCurta && <Check className="w-3 h-3 text-white stroke-[4]" />}
                  </div>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1 flex items-center gap-1">
                  <MessageSquareText className="w-3 h-3 text-blue-500" /> Observações (Opcional)
                </label>
                <textarea 
                  placeholder="Ex: Urgente para amanhã..." 
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium text-xs dark:text-white outline-none border-2 border-transparent focus:border-blue-500 transition-all shadow-inner h-20 resize-none"
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                />
              </div>

              <button 
                disabled={isSubmitting || !solicitante} 
                type="submit" 
                className={`w-full font-black py-6 rounded-2xl flex items-center justify-center gap-4 uppercase text-sm tracking-[0.15em] shadow-2xl active:scale-95 transition-all mt-6 ${requestStatus === 'success' ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white ring-4 ring-blue-600/10'}`}
              >
                {isSubmitting ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : requestStatus === 'success' ? (
                  <><CheckCircle2 className="w-6 h-6" /> {editingRequestId ? 'ATUALIZADO!' : 'ADICIONADO!'}</>
                ) : (
                  <><PlusCircle className="w-6 h-6" /> {editingRequestId ? 'SALVAR ALTERAÇÕES' : 'ADICIONAR AO PEDIDO'}</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
