
import React, { useState } from 'react';
import { Upload, Database, FileText, CheckCircle, XCircle, Users, UserPlus, X, Globe, ArrowDownToLine, RefreshCw, AlertCircle, Phone } from 'lucide-react';
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

export const AdminPortal: React.FC<AdminPortalProps> = ({ 
  appState, 
  onUploadData, 
  onAddVendedor,
  onRemoveVendedor,
  onUpdateWhatsApp,
  onUpdateRequestStatus,
  onClearRequests
}) => {
  const [uploadStatus, setUploadStatus] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [newVendedor, setNewVendedor] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncUrl, setSyncUrl] = useState(() => localStorage.getItem('marsil_sync_url') || '');
  const [waNumber, setWaNumber] = useState(appState.whatsappConfig.phoneNumber);

  const processData = (results: any) => {
    const data = results.data;
    if (data.length < 1) throw new Error("Arquivo sem dados.");

    const findCol = (terms: string[]) => {
      return Object.keys(data[0]).find(key => 
        terms.some(term => key.toLowerCase().includes(term))
      );
    };

    const colFornecedor = findCol(['fornecedor']);
    const colCodigo = findCol(['código', 'codigo']);
    const colProduto = findCol(['produto', 'descrição', 'item']);
    const colMarsil = findCol(['marsil', 'estoque sp', 'estoque_sp']);
    const colBoraceia = findCol(['boraceia', 'boracéia', 'estoque_bor']);

    if (!colCodigo || !colProduto) {
      throw new Error("Colunas 'Código' ou 'Produto' não encontradas.");
    }

    const products: Product[] = data.map((row: any, i: number) => ({
      id: `p-${i}-${Date.now()}`,
      fornecedor: colFornecedor ? row[colFornecedor] : 'N/D',
      codigo: String(row[colCodigo] || '0'),
      situacao: row['Situação'] || row['situacao'] || '',
      comprador: row['Comprador'] || row['comprador'] || '',
      produto: row[colProduto] || 'Sem nome',
      sabor: '',
      embalagem: '',
      estoqueMarsil: parseInt(row[colMarsil]) || 0,
      estoqueBoraceia: parseInt(row[colBoraceia]) || 0,
    })).filter((p: any) => p.produto !== 'Sem nome');

    onUploadData(products);
    return products.length;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus({ message: 'Processando CSV...', type: 'info' });
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const count = processData(results);
          setUploadStatus({ message: `Sucesso! ${count} itens carregados localmente.`, type: 'success' });
          setTimeout(() => setUploadStatus(null), 5000);
        } catch (err: any) {
          setUploadStatus({ message: err.message, type: 'error' });
        }
      }
    });
  };

  const handleSyncFromUrl = async () => {
    if (!syncUrl) return;
    setIsSyncing(true);
    setUploadStatus({ message: 'Sincronizando com a nuvem...', type: 'info' });
    localStorage.setItem('marsil_sync_url', syncUrl);

    Papa.parse(syncUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const count = processData(results);
          setUploadStatus({ message: `Sincronizado! ${count} itens atualizados via link.`, type: 'success' });
          setIsSyncing(false);
          setTimeout(() => setUploadStatus(null), 5000);
        } catch (err: any) {
          setUploadStatus({ message: 'Erro: Verifique se o link CSV está correto e público.', type: 'error' });
          setIsSyncing(false);
        }
      },
      error: () => {
        setUploadStatus({ message: 'Erro de conexão com o link informado.', type: 'error' });
        setIsSyncing(false);
      }
    });
  };

  const updateWhatsApp = () => {
    onUpdateWhatsApp({ enabled: true, phoneNumber: waNumber });
    setUploadStatus({ message: 'Configuração salva!', type: 'success' });
    setTimeout(() => setUploadStatus(null), 3000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl w-full mx-auto px-2 sm:px-0 pb-12 animate-in fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard label="Itens Carregados" value={appState.products.length} icon={<Database className="w-4 h-4" />} color="bg-blue-600" />
        <StatsCard label="Equipe" value={appState.vendedores.length} icon={<Users className="w-4 h-4" />} color="bg-emerald-600" />
        <StatsCard label="Pendentes (Local)" value={appState.requests.filter(r => r.status === 'Pendente').length} icon={<RefreshCw className="w-4 h-4" />} color="bg-amber-600" />
        <StatsCard label="Histórico Local" value={appState.requests.length} icon={<FileText className="w-4 h-4" />} color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xl border-2 border-emerald-50 dark:border-emerald-900/20">
            <h3 className="text-sm font-black mb-4 flex items-center gap-2 dark:text-white uppercase tracking-wider">
              <Globe className="w-4 h-4 text-emerald-600" /> Sincronizar Google Sheets
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-4 leading-tight">
              Publique sua planilha como CSV e cole o link aqui.
            </p>
            <div className="space-y-3">
              <input 
                type="url" 
                placeholder="Link do CSV Público..." 
                className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                value={syncUrl}
                onChange={(e) => setSyncUrl(e.target.value)}
              />
              <button 
                onClick={handleSyncFromUrl}
                disabled={isSyncing || !syncUrl}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="text-[10px] uppercase font-black">Sincronizar Dados</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-black mb-4 flex items-center gap-2 dark:text-white uppercase tracking-wider">
              <ArrowDownToLine className="w-4 h-4 text-blue-600" /> Upload CSV Local
            </h3>
            <label className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer border-blue-100 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800/20 group">
              <Upload className="w-6 h-6 text-blue-300 group-hover:text-blue-500 mb-2 transition-colors" />
              <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest text-center">Selecionar do PC</p>
              <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </label>
            
            {uploadStatus && (
              <div className={`mt-4 p-3 rounded-xl flex items-center gap-3 ${
                uploadStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 
                uploadStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {uploadStatus.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <p className="text-[10px] font-bold">{uploadStatus.message}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-black mb-4 flex items-center gap-2 dark:text-white uppercase tracking-wider">
              <Phone className="w-4 h-4 text-blue-500" /> WhatsApp Destino
            </h3>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Ex: 5511999999999" 
                className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 dark:text-white text-xs outline-none"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
              />
              <button onClick={updateWhatsApp} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-[10px] uppercase">Salvar Número</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-wider">Vendedores Ativos</h3>
            </div>
            <div className="p-5 space-y-4">
              <form onSubmit={(e) => { e.preventDefault(); if (newVendedor) { onAddVendedor(newVendedor); setNewVendedor(''); } }} className="flex gap-2">
                <input type="text" placeholder="Nome do Vendedor" value={newVendedor} onChange={e => setNewVendedor(e.target.value)} className="flex-grow px-4 py-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border-none outline-none dark:text-white" />
                <button type="submit" className="px-4 bg-emerald-600 text-white rounded-xl"><UserPlus className="w-4 h-4" /></button>
              </form>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                {appState.vendedores.map(v => (
                  <div key={v} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/40 rounded-xl group border border-transparent hover:border-blue-100">
                    <span className="text-xs font-bold dark:text-slate-300 uppercase tracking-tighter">{v}</span>
                    <button onClick={() => onRemoveVendedor(v)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-wider">Histórico de Pedidos (Neste Navegador)</h3>
              {appState.requests.length > 0 && <button onClick={onClearRequests} className="text-[9px] font-black text-red-500 uppercase">Limpar</button>}
            </div>
            <div className="p-4 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase py-10">
                {appState.requests.length === 0 ? "Nenhum pedido realizado localmente." : `${appState.requests.length} pedidos registrados.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
