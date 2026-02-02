
import React, { useState } from 'react';
import { Upload, Database, FileText, CheckCircle, XCircle, Users, UserPlus, X, Globe, ArrowDownToLine, RefreshCw, AlertCircle, Phone, Info, Clock, Check, Trash2, Share2, ClipboardList, Send, MessageSquareText, Timer, History, CheckCircle2 } from 'lucide-react';
import { Product, StockRequest, AppState, WhatsAppConfig, UpdateLog } from '../types';
import { StatsCard } from './StatsCard';
import Papa from 'papaparse';

interface AdminPortalProps {
  appState: AppState;
  onUploadData: (newProducts: Product[]) => void;
  onRegisterUpdate: (log: UpdateLog) => void;
  onAddVendedor: (name: string) => void;
  onRemoveVendedor: (name: string) => void;
  onUpdateWhatsApp: (config: WhatsAppConfig) => void;
  onUpdateRequestStatus: (requestId: string, status: StockRequest['status']) => void;
  onClearRequests: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ 
  appState, 
  onUploadData, 
  onRegisterUpdate,
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
  const [copied, setCopied] = useState(false);
  const [pasteContent, setPasteContent] = useState('');

  const mapData = (data: any[]) => {
    return data.map((row: any, i: number) => {
      const findVal = (keys: string[]) => {
        const key = Object.keys(row).find(k => 
          keys.some(s => k.trim().toLowerCase() === s.toLowerCase()) ||
          keys.some(s => k.trim().toLowerCase().includes(s.toLowerCase()))
        );
        return key ? String(row[key]).trim() : '';
      };

      return {
        id: `p-${i}-${Date.now()}`,
        fornecedor: findVal(['Fornecedor', 'Forn', 'Marca', 'Fabricante']),
        codigo: findVal(['Código', 'Cód', 'Ref', 'Cod Item', 'Item', 'codigo', 'ID', 'Referência']),
        situacao: findVal(['Situação', 'Status', 'Sit', 'Disponibilidade']),
        comprador: findVal(['Comprador', 'Responsável', 'Buyer']),
        produto: findVal(['Produto', 'Descrição', 'Nome', 'Desc', 'produto']),
        sabor: findVal(['Sabor', 'Gosto', 'Flavor', 'Variante']),
        embalagem: findVal(['Embalagem', 'Emb', 'Pack']),
        estoqueMarsil: parseInt(findVal(['Marsil', 'SP', 'Estoque Marsil', 'Matriz'])) || 0,
        estoqueBoraceia: parseInt(findVal(['Boraceia', 'Boracéia', 'Filial', 'Estoque Boraceia'])) || 0,
      };
    }).filter(p => p.produto && p.produto !== '');
  };

  const processData = (content: string, source: string) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = mapData(results.data);
        if (mapped.length === 0) {
          setUploadStatus({ message: 'Nenhum dado válido encontrado.', type: 'error' });
          onRegisterUpdate({ id: Date.now().toString(), timestamp: new Date().toISOString(), fileName: source, recordCount: 0, status: 'error', errorMessage: 'Nenhum dado válido' });
          return;
        }
        onUploadData(mapped);
        onRegisterUpdate({ id: Date.now().toString(), timestamp: new Date().toISOString(), fileName: source, recordCount: mapped.length, status: 'success' });
        setUploadStatus({ message: `Sucesso! ${mapped.length} itens carregados.`, type: 'success' });
        setPasteContent('');
        setTimeout(() => setUploadStatus(null), 5000);
      },
      error: () => {
        setUploadStatus({ message: 'Erro ao processar dados.', type: 'error' });
        onRegisterUpdate({ id: Date.now().toString(), timestamp: new Date().toISOString(), fileName: source, recordCount: 0, status: 'error', errorMessage: 'Falha no PapaParse' });
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus({ message: 'Lendo arquivo...', type: 'info' });
    const reader = new FileReader();
    reader.onload = (event) => {
      processData(event.target?.result as string, file.name);
    };
    reader.readAsText(file);
  };

  const handleSyncFromUrl = async () => {
    if (!syncUrl) return;
    setIsSyncing(true);
    setUploadStatus({ message: 'Sincronizando via link...', type: 'info' });
    localStorage.setItem('marsil_sync_url', syncUrl);
    Papa.parse(syncUrl, {
      download: true, header: true, skipEmptyLines: true,
      complete: (results) => {
        const mapped = mapData(results.data);
        if (mapped.length > 0) {
          onUploadData(mapped);
          onRegisterUpdate({ id: Date.now().toString(), timestamp: new Date().toISOString(), fileName: 'Sincronização Nuvem', recordCount: mapped.length, status: 'success' });
          setUploadStatus({ message: `Sincronizado! ${mapped.length} itens atualizados.`, type: 'success' });
        } else {
          setUploadStatus({ message: 'Nenhum dado encontrado no link.', type: 'error' });
        }
        setIsSyncing(false);
        setTimeout(() => setUploadStatus(null), 5000);
      },
      error: () => {
        setUploadStatus({ message: 'Erro ao conectar.', type: 'error' });
        setIsSyncing(false);
      }
    });
  };

  const handleGenerateShareLink = () => {
    if (!syncUrl) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const vendorsEncoded = encodeURIComponent(JSON.stringify(appState.vendedores));
    const shareUrl = `${baseUrl}?s=${encodeURIComponent(syncUrl)}&v=${vendorsEncoded}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="space-y-8 max-w-6xl w-full mx-auto pb-12 animate-in fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Itens de Estoque" value={appState.products.length} icon={<Database className="w-4 h-4" />} color="bg-blue-600" />
        <StatsCard label="Vendedores" value={appState.vendedores.length} icon={<Users className="w-4 h-4" />} color="bg-emerald-600" />
        <StatsCard label="Solicitações" value={appState.requests.length} icon={<FileText className="w-4 h-4" />} color="bg-purple-600" />
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-3">
          <History className="w-5 h-5 text-blue-500 shrink-0" />
          <p className="text-[10px] font-black uppercase text-gray-400 leading-tight">Os dados são armazenados localmente e atualizados conforme sua planilha.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-black mb-4 flex items-center gap-2 dark:text-white uppercase tracking-wider">
              <RefreshCw className="w-4 h-4 text-emerald-600" /> Sincronização Google Sheets
            </h3>
            <div className="space-y-3">
              <input type="url" placeholder="Link CSV publicado..." className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 dark:text-white text-[11px] outline-none transition-all focus:ring-2 focus:ring-emerald-500/20" value={syncUrl} onChange={(e) => setSyncUrl(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleSyncFromUrl} disabled={isSyncing || !syncUrl} className="bg-emerald-600 disabled:opacity-50 text-white font-black py-3 rounded-xl text-[9px] uppercase flex items-center justify-center gap-1 shadow-lg hover:brightness-110 active:scale-95 transition-all">{isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Sincronizar</button>
                <button onClick={handleGenerateShareLink} disabled={!syncUrl} className="bg-blue-600 disabled:opacity-50 text-white font-black py-3 rounded-xl text-[9px] uppercase flex items-center justify-center gap-1 shadow-lg hover:brightness-110 active:scale-95 transition-all">{copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />} {copied ? 'Copiado' : 'Compartilhar'}</button>
              </div>
            </div>
          </div>

          {/* NOVO: Histórico de Atualizações */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-black mb-4 flex items-center gap-2 dark:text-white uppercase tracking-wider">
              <History className="w-4 h-4 text-purple-600" /> Histórico de Atualizações
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {appState.updateHistory && appState.updateHistory.length > 0 ? (
                appState.updateHistory.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
                    <div className="mt-0.5">
                      {log.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase text-gray-800 dark:text-white truncate">{log.fileName}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(log.timestamp).toLocaleString()}</p>
                      {log.status === 'success' ? (
                        <p className="text-[9px] text-emerald-600 font-black mt-1 uppercase">{log.recordCount} itens processados</p>
                      ) : (
                        <p className="text-[9px] text-red-600 font-black mt-1 uppercase">Falha na importação</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-center text-gray-400 font-bold uppercase py-6">Sem registros recentes.</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-black mb-4 flex items-center gap-2 dark:text-white uppercase tracking-wider">
              <ClipboardList className="w-4 h-4 text-blue-600" /> Colar Dados
            </h3>
            <div className="space-y-3">
              <textarea placeholder="Cole o conteúdo do CSV aqui..." className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 dark:text-white text-[11px] outline-none transition-all focus:ring-2 focus:ring-blue-500/20 h-24 resize-none font-mono" value={pasteContent} onChange={(e) => setPasteContent(e.target.value)} />
              <button onClick={() => processData(pasteContent, 'Colagem Manual')} disabled={!pasteContent.trim()} className="w-full bg-blue-600 disabled:opacity-50 text-white font-black py-3 rounded-xl text-[9px] uppercase flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all"><Send className="w-3 h-3" /> Processar Dados Colados</button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-black mb-4 flex items-center gap-2 dark:text-white uppercase tracking-wider">
              <Upload className="w-4 h-4 text-purple-600" /> Upload de Arquivo
            </h3>
            <label className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer border-purple-100 dark:border-slate-800 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all group">
              <ArrowDownToLine className="w-6 h-6 text-purple-300 group-hover:text-purple-500 mb-2 transition-transform group-hover:translate-y-1" />
              <p className="text-[9px] text-purple-600 font-black uppercase">Importar .CSV Local</p>
              <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </label>
            {uploadStatus && (
              <div className={`mt-4 p-3 rounded-xl text-[10px] font-bold animate-in slide-in-from-top-2 ${uploadStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : uploadStatus.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'}`}>{uploadStatus.message}</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-gray-50/30 dark:bg-slate-800/20">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" /> Solicitações da Equipe
              </h3>
              {appState.requests.length > 0 && (
                <button onClick={onClearRequests} className="text-[9px] font-black text-red-500 uppercase hover:underline flex items-center gap-1 transition-all hover:scale-105 active:scale-95">
                  <Trash2 className="w-3 h-3" /> Limpar Histórico
                </button>
              )}
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              {appState.requests.length === 0 ? (
                <div className="py-24 text-center opacity-30 flex flex-col items-center">
                  <Clock className="w-12 h-12 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Aguardando solicitações...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-gray-50/50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase">Solicitante</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase">Produto / Obs</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {appState.requests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="text-xs font-black dark:text-white uppercase">{req.solicitante}</p>
                          <p className="text-[8px] text-gray-400 font-bold">{new Date(req.dataSolicitacao).toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-bold dark:text-slate-300 line-clamp-1">{req.productName}</p>
                            {req.isValidadeCurta && (
                              <span className="text-[7px] bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1 py-0.5 rounded font-black uppercase flex items-center gap-0.5"><Timer className="w-2 h-2" /> Validade Curta</span>
                            )}
                          </div>
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className="text-[8px] bg-blue-50 dark:bg-blue-900/30 text-blue-500 px-1.5 py-0.5 rounded font-black uppercase">{req.tipo}</span>
                            <span className="text-[8px] text-gray-500 font-bold">{req.quantidade} {req.unidade}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-2">
                             <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${
                              req.status === 'Pendente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' : 
                              req.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 
                              'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            }`}>{req.status}</span>
                            {req.status === 'Pendente' && (
                              <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onUpdateRequestStatus(req.id, 'Aprovado')} className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all" title="Aprovar"><Check className="w-3 h-3" /></button>
                                <button onClick={() => onUpdateRequestStatus(req.id, 'Recusado')} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all" title="Recusar"><X className="w-3 h-3" /></button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
