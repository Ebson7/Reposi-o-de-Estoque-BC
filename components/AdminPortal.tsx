
import React, { useState } from 'react';
// Added Info to the lucide-react imports
import { Upload, Database, FileText, CheckCircle, Users, UserPlus, X, Globe, ArrowDownToLine, RefreshCw, AlertCircle, Phone, Share2, Copy, Check, Info } from 'lucide-react';
import { Product, StockRequest, AppState, WhatsAppConfig } from '../types';
import { StatsCard } from './StatsCard';
import Papa from 'papaparse';

interface AdminPortalProps {
  appState: AppState;
  onUploadData: (newProducts: Product[]) => void;
  onAddVendedor: (name: string) => void;
  onRemoveVendedor: (name: string) => void;
  onUpdateWhatsApp: (config: WhatsAppConfig) => void;
  onUpdateRequestStatus: (requestId: string, status: StockRequest['status']) => void;
  onClearRequests: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ appState, onUploadData }) => {
  const [syncUrl, setSyncUrl] = useState(() => localStorage.getItem('marsil_sync_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSync = async () => {
    if (!syncUrl) return;
    setIsSyncing(true);
    localStorage.setItem('marsil_sync_url', syncUrl);
    
    Papa.parse(syncUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data.map((row: any, i: number) => ({
          id: `p-${i}`,
          fornecedor: row['Fornecedor'] || 'N/D',
          codigo: String(row['Código'] || '0'),
          situacao: row['Situação'] || '',
          comprador: row['Comprador'] || '',
          produto: row['Produto'] || 'Sem nome',
          sabor: '',
          embalagem: '',
          estoqueMarsil: parseInt(row['Marsil']) || 0,
          estoqueBoraceia: parseInt(row['Boraceia']) || 0,
        })).filter((p: any) => p.produto !== 'Sem nome');
        
        onUploadData(mapped);
        localStorage.setItem('marsil_local_products', JSON.stringify(mapped));
        setIsSyncing(false);
      }
    });
  };

  const generateShareLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?s=${encodeURIComponent(syncUrl)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Produtos" value={appState.products.length} icon={<Database className="w-4 h-4" />} color="bg-blue-600" />
        <StatsCard label="Equipe" value={appState.vendedores.length} icon={<Users className="w-4 h-4" />} color="bg-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
          <h3 className="text-sm font-black mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Globe className="w-4 h-4 text-blue-600" /> Fonte de Dados (Google Sheets)
          </h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">Publique sua planilha como CSV e cole o link abaixo.</p>
          <div className="space-y-4">
            <input 
              type="url" 
              placeholder="Link do CSV Público..." 
              className="w-full px-4 py-4 rounded-2xl border bg-gray-50 dark:bg-slate-800 outline-none text-xs"
              value={syncUrl}
              onChange={(e) => setSyncUrl(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleSync}
                className="bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase shadow-lg shadow-blue-100"
              >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Sincronizar
              </button>
              <button 
                onClick={generateShareLink}
                disabled={!syncUrl}
                className="bg-emerald-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase shadow-lg shadow-emerald-100"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'Link Copiado!' : 'Gerar Link'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full mb-4">
            <Info className="w-8 h-8 text-blue-600" />
          </div>
          <h4 className="text-sm font-black uppercase mb-2">Instruções de Sincronização</h4>
          <p className="text-[10px] text-gray-500 font-bold max-w-xs leading-relaxed">
            Ao gerar o link e enviar para os vendedores, o aplicativo deles se conectará automaticamente à sua planilha. 
            Todas as manhãs, o estoque será atualizado sozinho ao abrirem o app.
          </p>
        </div>
      </div>
    </div>
  );
};
