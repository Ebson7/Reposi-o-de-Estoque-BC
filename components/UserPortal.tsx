
import React, { useState, useMemo } from 'react';
import { Search, ShoppingCart, Calendar, RefreshCw, AlertTriangle, Building2, Store, ListPlus } from 'lucide-react';
import { Product, StockRequest, WhatsAppConfig } from '../types';
import { formatCurrency } from '../utils';

interface UserPortalProps {
  products: Product[];
  requests: StockRequest[];
  vendedores: string[];
  whatsappConfig: WhatsAppConfig;
  onSubmitRequest: (req: any) => void;
}

export const UserPortal: React.FC<UserPortalProps> = ({ products, vendedores }) => {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    if (filter.length < 3) return [];
    return products.filter(p => 
      p.produto.toLowerCase().includes(filter.toLowerCase()) || 
      p.codigo.includes(filter)
    ).slice(0, 15);
  }, [products, filter]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estoque em Tempo Real</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-gray-400 font-bold uppercase">Última Sincronização</p>
          <p className="text-xs font-black">Hoje, {new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
        <h2 className="text-base font-black mb-4 flex items-center gap-2 uppercase tracking-widest">
          <Search className="w-5 h-5 text-blue-600" /> Consultar Produtos
        </h2>
        <input 
          type="text" 
          placeholder="Código ou Nome do Produto..." 
          className="w-full px-5 py-4 rounded-2xl border bg-gray-50 dark:bg-slate-800 outline-none text-sm font-bold mb-4"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        {filter.length > 0 && filter.length < 3 && (
          <p className="text-[9px] text-blue-500 font-bold text-center uppercase">Digite pelo menos 3 caracteres...</p>
        )}

        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
          {filtered.map(p => (
            <button 
              key={p.id} 
              onClick={() => setSelected(p)}
              className={`w-full p-4 rounded-2xl border flex justify-between items-center transition-all ${selected?.id === p.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-50 dark:border-slate-800 hover:bg-gray-50'}`}
            >
              <div className="text-left">
                <p className="text-xs font-black uppercase line-clamp-1">{p.produto}</p>
                <p className="text-[9px] text-blue-500 font-bold">CÓD: {p.codigo} • {p.fornecedor}</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-xs font-black">{p.estoqueMarsil}</p>
                  <p className="text-[7px] font-black uppercase text-gray-400">Marsil</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-600">{p.estoqueBoraceia}</p>
                  <p className="text-[7px] font-black uppercase text-gray-400">Borac.</p>
                </div>
              </div>
            </button>
          ))}
          {filter.length >= 3 && filtered.length === 0 && (
            <div className="text-center py-10 opacity-50">
              <AlertTriangle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
              <p className="text-[10px] font-black uppercase">Produto não encontrado ou sem estoque.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
