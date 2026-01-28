
import React, { useState, useMemo } from 'react';
import { Search, ShoppingCart, Calendar, RefreshCw, AlertTriangle, Building2, Store, ListPlus, X, Send, User, Hash, FileText } from 'lucide-react';
import { Product, StockRequest, WhatsAppConfig, RequestType, UnitType } from '../types';

interface UserPortalProps {
  products: Product[];
  requests: StockRequest[];
  vendedores: string[];
  whatsappConfig: WhatsAppConfig;
  onSubmitRequest: (req: StockRequest) => void;
}

export const UserPortal: React.FC<UserPortalProps> = ({ products, requests, vendedores, whatsappConfig, onSubmitRequest }) => {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  
  // Request Form States
  const [quant, setQuant] = useState<number>(1);
  const [unit, setUnit] = useState<UnitType>('Caixa');
  const [type, setType] = useState<RequestType>('Teste');
  const [solicitante, setSolicitante] = useState(vendedores[0] || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtro aprimorado: Busca por Código, Produto (Descrição) e Fornecedor
  const filtered = useMemo(() => {
    const term = filter.toLowerCase().trim();
    if (term.length < 2) return [];
    
    return products.filter(p => 
      p.produto.toLowerCase().includes(term) || 
      p.codigo.toLowerCase().includes(term) ||
      p.fornecedor.toLowerCase().includes(term)
    ).slice(0, 30);
  }, [products, filter]);

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsSubmitting(true);

    const newReq: StockRequest = {
      id: `req-${Date.now()}`,
      productId: selected.id,
      productName: selected.produto,
      productCode: selected.codigo,
      quantidade: quant,
      unidade: unit,
      tipo: type,
      solicitante: solicitante,
      dataSolicitacao: new Date().toISOString(),
      status: 'Pendente'
    };

    onSubmitRequest(newReq);

    // WhatsApp logic
    const msg = `*SOLICITAÇÃO DE ESTOQUE*%0A---------------------------%0A*Vendedor:* ${solicitante}%0A*Produto:* ${selected.produto}%0A*Código:* ${selected.codigo}%0A*Qtd:* ${quant} ${unit}%0A*Tipo:* ${type}%0A*Data:* ${new Date().toLocaleDateString()}`;
    window.open(`https://wa.me/${whatsappConfig.phoneNumber}?text=${msg}`, '_blank');

    // Reset
    setTimeout(() => {
      setIsSubmitting(false);
      setSelected(null);
      setFilter('');
      setQuant(1);
    }, 500);
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('disponível') || s.includes('ativo') || s.includes('estoque')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (s.includes('falta') || s.includes('esgotado') || s.includes('inativo')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (s.includes('chegando') || s.includes('pedido') || s.includes('trânsito')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-400';
  };

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/20" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Consulta de Estoque Online</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Base de Dados</p>
          <p className="text-xs font-black dark:text-white">{products.length} Itens Carregados</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
        <div className="mb-6">
          <h2 className="text-base font-black flex items-center gap-2 uppercase tracking-widest dark:text-white mb-1">
            <Search className="w-5 h-5 text-blue-600" /> Pesquisar Produto
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Busque por Código, Nome ou Fornecedor</p>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Ex: 5040, Chocolate, Marsil..." 
            className="w-full pl-12 pr-5 py-5 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 outline-none text-base font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-300 dark:placeholder:text-slate-600"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {filter && (
            <button onClick={() => setFilter('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
          )}
        </div>

        {filter.length > 0 && filter.length < 2 && (
          <p className="mt-3 text-[10px] text-blue-500 font-bold text-center uppercase animate-pulse">Continue digitando para filtrar...</p>
        )}

        <div className="mt-8 space-y-3 max-h-[550px] overflow-y-auto custom-scrollbar pr-1">
          {filtered.map(p => (
            <button 
              key={p.id} 
              onClick={() => setSelected(p)}
              className={`w-full p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all group ${selected?.id === p.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20' : 'border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60'}`}
            >
              <div className="text-left flex-grow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black flex items-center gap-1"><Hash className="w-2.5 h-2.5" /> {p.codigo}</span>
                  {p.situacao && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${getStatusColor(p.situacao)}`}>
                      {p.situacao}
                    </span>
                  )}
                </div>
                <p className="text-sm font-black uppercase line-clamp-2 dark:text-white leading-tight mb-2 group-hover:text-blue-600 transition-colors">{p.produto}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                   <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase truncate max-w-[200px] flex items-center gap-1">
                     <Building2 className="w-3 h-3 text-blue-500" /> {p.fornecedor}
                   </span>
                </div>
              </div>
              
              <div className="flex justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-4 sm:pt-0 dark:border-slate-800">
                <div className="text-right">
                  <p className="text-base font-black dark:text-white leading-none">{p.estoqueMarsil}</p>
                  <p className="text-[8px] font-black uppercase text-gray-400 mt-1">Marsil (SP)</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-emerald-600 leading-none">{p.estoqueBoraceia}</p>
                  <p className="text-[8px] font-black uppercase text-gray-400 mt-1">Boracéia</p>
                </div>
                <div className="hidden sm:flex items-center pl-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"><ShoppingCart className="w-4 h-4" /></div>
                </div>
              </div>
            </button>
          ))}
          
          {filter.length >= 2 && filtered.length === 0 && (
            <div className="text-center py-20 opacity-50 flex flex-col items-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest max-w-[200px] leading-relaxed">Nenhum produto encontrado com "{filter}"</p>
            </div>
          )}

          {filter.length === 0 && (
            <div className="text-center py-32 opacity-20 flex flex-col items-center">
              <Search className="w-16 h-16 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">Inicie a busca acima</p>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-lg font-black dark:text-white uppercase leading-tight">Nova Solicitação</h3>
                <p className="text-[10px] font-bold text-blue-500 uppercase mt-0.5 line-clamp-1">{selected.produto}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleSendRequest} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 px-1">Quantidade</label>
                  <input type="number" min="1" required className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none border-2 border-transparent focus:border-blue-500 transition-all" value={quant} onChange={e => setQuant(parseInt(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 px-1">Unidade</label>
                  <select className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none border-2 border-transparent focus:border-blue-500 transition-all" value={unit} onChange={e => setUnit(e.target.value as UnitType)}>
                    <option value="Caixa">Caixa</option>
                    <option value="Unidade">Unidade</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Vendedor (Solicitante)</label>
                <select className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none border-2 border-transparent focus:border-blue-500 transition-all" value={solicitante} onChange={e => setSolicitante(e.target.value)}>
                  <option value="" disabled>Selecione um vendedor...</option>
                  {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Tipo de Pedido</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setType('Teste')} className={`py-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${type === 'Teste' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-400 hover:bg-gray-100'}`}>Teste</button>
                  <button type="button" onClick={() => setType('Venda Garantida')} className={`py-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${type === 'Venda Garantida' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-400 hover:bg-gray-100'}`}>Venda Garantida</button>
                </div>
              </div>

              <button disabled={isSubmitting || !solicitante} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-4.5 rounded-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all mt-6">
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Solicitar e Enviar WhatsApp</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
