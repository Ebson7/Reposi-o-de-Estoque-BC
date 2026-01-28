
import React, { useState, useMemo } from 'react';
import { Search, ShoppingCart, Calendar, RefreshCw, AlertTriangle, Building2, Store, ListPlus, X, Send, User, Hash, FileText, Filter, Copy, Check, Clock, History, Clipboard, ArrowRight, PlusCircle, CheckCircle2, Candy } from 'lucide-react';
import { Product, StockRequest, WhatsAppConfig, RequestType, UnitType } from '../types';

interface UserPortalProps {
  products: Product[];
  requests: StockRequest[];
  vendedores: string[];
  whatsappConfig: WhatsAppConfig;
  onSubmitRequest: (req: StockRequest) => void;
}

export const UserPortal: React.FC<UserPortalProps> = ({ products, requests, vendedores, whatsappConfig, onSubmitRequest }) => {
  const [activeView, setActiveView] = useState<'consulta' | 'historico'>('consulta');
  const [filterCodigo, setFilterCodigo] = useState('');
  const [filterDescricao, setFilterDescricao] = useState('');
  const [filterFornecedor, setFilterFornecedor] = useState('');
  
  const [selected, setSelected] = useState<Product | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'success'>('idle');
  
  // Request Form States
  const [quant, setQuant] = useState<number>(1);
  const [unit, setUnit] = useState<UnitType>('Caixa');
  const [type, setType] = useState<RequestType>('Teste');
  const [solicitante, setSolicitante] = useState(vendedores[0] || '');
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
    if (!solicitante) return requests;
    return requests.filter(r => r.solicitante === solicitante);
  }, [requests, solicitante]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(id);
      setTimeout(() => setCopySuccess(null), 2000);
    });
  };

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !solicitante) return;
    setIsSubmitting(true);

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
      dataSolicitacao: new Date().toISOString(),
      status: 'Pendente'
    };

    onSubmitRequest(newReq);
    setRequestStatus('success');

    setTimeout(() => {
      setIsSubmitting(false);
      setSelected(null);
      setRequestStatus('idle');
      setQuant(1);
    }, 1500);
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('disponível') || s.includes('ativo') || s.includes('estoque')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (s.includes('falta') || s.includes('esgotado') || s.includes('inativo')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (s.includes('chegando') || s.includes('pedido') || s.includes('trânsito')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-400';
  };

  const hasFilters = filterCodigo || filterDescricao || filterFornecedor;

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Switcher de Visão */}
      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 w-fit mx-auto sm:mx-0">
        <button 
          onClick={() => setActiveView('consulta')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'consulta' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-blue-500'}`}
        >
          <Search className="w-3.5 h-3.5" /> Consulta de Itens
        </button>
        <button 
          onClick={() => setActiveView('historico')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'historico' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-blue-500'}`}
        >
          <History className="w-3.5 h-3.5" /> Meu Carrinho / Pedidos
        </button>
      </div>

      {activeView === 'consulta' ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-base font-black flex items-center gap-2 uppercase tracking-widest dark:text-white mb-1">
                  <Filter className="w-5 h-5 text-blue-600" /> Pesquisa Avançada
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Busca refinada por Código, Descrição ou Fabricante</p>
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
                        <p className="text-[8px] font-black uppercase text-gray-400 mt-1">Marsil</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-emerald-600 leading-none">{p.estoqueBoraceia}</p>
                        <p className="text-[8px] font-black uppercase text-gray-400 mt-1">Boracéia</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelected(p)} 
                      className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-500/30 active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest"
                    >
                      <ShoppingCart className="w-4 h-4" /> Solicitar Item
                    </button>
                  </div>
                </div>
              ))}
              
              {hasFilters && filteredProducts.length === 0 && (
                <div className="text-center py-20 opacity-50 flex flex-col items-center">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest max-w-[200px] leading-relaxed">Nenhum item localizado com esses filtros.</p>
                </div>
              )}

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
          <div className="p-6 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-gray-50/20 dark:bg-slate-800/20">
            <div>
              <h3 className="text-sm font-black dark:text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" /> Histórico / Carrinho de Pedidos
              </h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Vendedor Ativo: {solicitante}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const text = myRequests.map(r => `${r.productCode} | ${r.productSabor ? r.productSabor + ' | ' : ''}${r.quantidade} ${r.unidade} | ${r.productName}`).join('\n');
                  handleCopy(text, 'hist-all');
                }}
                className="text-[9px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-4 py-2.5 rounded-xl uppercase flex items-center gap-2 hover:brightness-95 transition-all shadow-sm"
              >
                {copySuccess === 'hist-all' ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                Copiar Lista de Pedidos
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
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase">Data</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase">Item</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase">Sabor</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase">Quantidade</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {myRequests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-[10px] font-black dark:text-white">{new Date(req.dataSolicitacao).toLocaleDateString()}</p>
                        <p className="text-[8px] text-gray-400 font-bold">{new Date(req.dataSolicitacao).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-1.5 rounded uppercase">{req.productCode}</p>
                          <button onClick={() => handleCopy(`${req.productCode} - ${req.productName}`, `req-copy-${req.id}`)} className="text-gray-300 hover:text-blue-500 p-1">
                            {copySuccess === `req-copy-${req.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-[10px] font-bold dark:text-slate-300 line-clamp-1 mt-0.5">{req.productName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-pink-500 dark:text-pink-400 uppercase">{req.productSabor || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[10px] font-black dark:text-white uppercase">{req.quantidade} {req.unidade === 'Caixa' ? 'CX' : 'UN'}</p>
                        <span className="text-[8px] text-gray-400 font-bold uppercase">{req.tipo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${
                          req.status === 'Pendente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20' : 
                          req.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20' : 'bg-red-100 text-red-700 dark:bg-red-900/20'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => {
                            const p = products.find(prod => String(prod.id) === String(req.productId) || String(prod.codigo) === String(req.productCode));
                            if (p) { setSelected(p); setActiveView('consulta'); }
                          }}
                          className="p-2.5 bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-blue-600 rounded-xl transition-all shadow-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal de Solicitação - Botão Aumentado e sem WhatsApp */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-lg font-black dark:text-white uppercase leading-tight">Configurar Pedido</h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] font-bold text-blue-500 uppercase line-clamp-1">{selected.produto}</p>
                  <button onClick={() => handleCopy(`${selected.codigo} - ${selected.produto}`, 'modal-copy')} className="text-gray-400 hover:text-blue-500 p-1">
                    {copySuccess === 'modal-copy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {selected.sabor && (
                  <p className="text-[9px] font-black text-pink-500 uppercase flex items-center gap-1 mt-1">
                    <Candy className="w-2.5 h-2.5" /> Sabor: {selected.sabor}
                  </p>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleSendRequest} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 px-1">Quantidade</label>
                  <input type="number" min="1" required className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" value={quant} onChange={e => setQuant(parseInt(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 px-1">Unidade</label>
                  <select className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" value={unit} onChange={e => setUnit(e.target.value as UnitType)}>
                    <option value="Caixa">Caixa</option>
                    <option value="Unidade">Unidade</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Vendedor Responsável</label>
                <select className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" value={solicitante} onChange={e => setSolicitante(e.target.value)}>
                  <option value="" disabled>Selecione um vendedor...</option>
                  {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Natureza do Pedido</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setType('Teste')} className={`py-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${type === 'Teste' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-400 hover:bg-gray-100'}`}>Teste / Amostra</button>
                  <button type="button" onClick={() => setType('Venda Garantida')} className={`py-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${type === 'Venda Garantida' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-400 hover:bg-gray-100'}`}>Venda Garantida</button>
                </div>
              </div>

              {/* Botão Aumentado conforme solicitado (py-6 e text-sm) */}
              <button 
                disabled={isSubmitting || !solicitante} 
                type="submit" 
                className={`w-full font-black py-6 rounded-3xl flex items-center justify-center gap-3 uppercase text-sm tracking-widest shadow-2xl active:scale-95 transition-all mt-6 ${requestStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {isSubmitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : requestStatus === 'success' ? (
                  <><CheckCircle2 className="w-6 h-6" /> Adicionado com Sucesso!</>
                ) : (
                  <><PlusCircle className="w-6 h-6" /> Adicionar ao meu pedido</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
