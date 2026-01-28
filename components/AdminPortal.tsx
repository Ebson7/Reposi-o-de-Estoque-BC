
import React, { useState } from 'react';
import { Upload, ListChecks, Database, FileText, CheckCircle, XCircle, Trash2, Users, Download, UserPlus, X, MessageSquare, Phone } from 'lucide-react';
import { Product, StockRequest, AppState, WhatsAppConfig } from '../types';
import { StatsCard } from './StatsCard';

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
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [newVendedor, setNewVendedor] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Processando...');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').filter(r => r.trim() !== '');
        const dataRows = rows.slice(1);

        const parsedProducts: Product[] = dataRows.map((row, index) => {
          const cols = row.split(/,|;/);
          return {
            id: `p-${index}-${Date.now()}`,
            fornecedor: cols[0]?.trim() || 'N/A',
            codigo: cols[2]?.trim() || '0',
            situacao: cols[3]?.trim() || '',
            comprador: cols[4]?.trim() || '',
            produto: cols[5]?.trim() || '',
            sabor: cols[6]?.trim() || '',
            embalagem: cols[7]?.trim() || '',
            estoqueMarsil: parseInt(cols[8]) || 0,
            estoqueBoraceia: parseInt(cols[9]) || 0,
          };
        });

        onUploadData(parsedProducts);
        setUploadStatus(`OK: ${parsedProducts.length} itens.`);
        setTimeout(() => setUploadStatus(null), 3000);
      } catch (err) {
        setUploadStatus('Erro no arquivo.');
      }
    };
    reader.readAsText(file);
  };

  const handleAddVendedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVendedor.trim()) {
      onAddVendedor(newVendedor.trim());
      setNewVendedor('');
    }
  };

  const exportToCSV = () => {
    if (appState.requests.length === 0) return;
    const headers = ['ID', 'Solicitante', 'Produto', 'Codigo', 'Quantidade', 'Unidade', 'Tipo', 'Data', 'Status'];
    const rows = appState.requests.map(req => [
      req.id, req.solicitante, req.productName, req.productCode, req.quantidade, req.unidade, req.tipo, new Date(req.dataSolicitacao).toLocaleString(), req.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl w-full mx-auto px-2 sm:px-0">
      {/* Dashboard Stats - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard label="Produtos" value={appState.products.length} icon={<Database className="w-4 h-4 sm:w-5 sm:h-5" />} color="bg-blue-600" />
        <StatsCard label="Vendedores" value={appState.vendedores.length} icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />} color="bg-emerald-600" />
        <StatsCard label="Pendentes" value={appState.requests.filter(r => r.status === 'Pendente').length} icon={<ListChecks className="w-4 h-4 sm:w-5 sm:h-5" />} color="bg-amber-600" />
        <StatsCard label="Total Hist." value={appState.requests.length} icon={<FileText className="w-4 h-4 sm:w-5 sm:h-5" />} color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: Configs */}
        <div className="lg:col-span-1 space-y-6">
          {/* WhatsApp Config */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="text-base sm:text-lg font-bold mb-5 flex items-center gap-2 dark:text-white">
              <MessageSquare className="w-5 h-5 text-green-600" />
              WhatsApp Admin
            </h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl">
                <span className="text-xs text-gray-600 dark:text-slate-400 font-bold uppercase tracking-wider">Habilitado</span>
                <button
                  onClick={() => onUpdateWhatsApp({ ...appState.whatsappConfig, enabled: !appState.whatsappConfig.enabled })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${appState.whatsappConfig.enabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${appState.whatsappConfig.enabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Número Destino</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    placeholder="5511999999999"
                    value={appState.whatsappConfig.phoneNumber}
                    onChange={(e) => onUpdateWhatsApp({ ...appState.whatsappConfig, phoneNumber: e.target.value.replace(/\D/g, '') })}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-green-500 outline-none text-base sm:text-sm dark:text-white"
                  />
                </div>
                <p className="text-[9px] text-gray-400 font-medium px-1">Ex: 55 + DDD + Número sem espaços.</p>
              </div>
            </div>
          </div>

          {/* Vendors Management */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="text-base sm:text-lg font-bold mb-5 flex items-center gap-2 dark:text-white">
              <Users className="w-5 h-5 text-emerald-600" />
              Equipe de Vendas
            </h3>
            <form onSubmit={handleAddVendedor} className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Nome..."
                value={newVendedor}
                onChange={(e) => setNewVendedor(e.target.value)}
                className="flex-grow px-4 py-2.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 outline-none dark:text-white text-base sm:text-sm"
              />
              <button type="submit" className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 dark:shadow-none active:scale-95 transition-all">
                <UserPlus className="w-5 h-5" />
              </button>
            </form>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {appState.vendedores.length === 0 ? (
                <p className="text-center py-4 text-xs text-gray-400 font-bold italic">Nenhum vendedor cadastrado</p>
              ) : (
                appState.vendedores.map(v => (
                  <div key={v} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 group border border-gray-100 dark:border-slate-800/50">
                    <span className="text-sm font-semibold dark:text-slate-200">{v}</span>
                    <button onClick={() => onRemoveVendedor(v)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CSV Upload */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2 dark:text-white"><Upload className="w-5 h-5 text-blue-600" /> Atualizar Planilha</h3>
            <label className="border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer border-gray-100 dark:border-slate-800 hover:border-blue-400 transition-all bg-gray-50/50 dark:bg-slate-800/30">
              <Upload className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest text-center">Selecionar CSV</p>
              <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </label>
            {uploadStatus && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-xl text-center font-bold animate-pulse">
                {uploadStatus}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Requests Table */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
            <div className="p-5 sm:p-6 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-20">
              <h3 className="text-base sm:text-lg font-bold dark:text-white">Pedidos Recebidos</h3>
              <div className="flex gap-2">
                <button 
                  onClick={exportToCSV} 
                  disabled={appState.requests.length === 0} 
                  className="px-3 py-2 text-[10px] font-bold bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Exportar
                </button>
                {appState.requests.length > 0 && (
                  <button onClick={onClearRequests} className="px-3 py-2 text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl">Limpar</button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-slate-800/80 text-left border-b border-gray-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Origem</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Itens</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Qtd</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {appState.requests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <FileText className="w-12 h-12 text-gray-100 dark:text-slate-800 mx-auto mb-2" />
                        <p className="text-sm text-gray-300 dark:text-slate-600 font-bold uppercase">Nenhum pedido histórico</p>
                      </td>
                    </tr>
                  ) : (
                    appState.requests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold dark:text-slate-200">{req.solicitante}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">{new Date(req.dataSolicitacao).toLocaleDateString()} {new Date(req.dataSolicitacao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold dark:text-slate-300 line-clamp-1">{req.productName}</p>
                          <p className="text-[10px] text-blue-500 font-mono font-bold mt-0.5">{req.productCode}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-extrabold dark:text-slate-100">{req.quantidade}</span>
                          <span className="text-[9px] text-gray-400 block font-bold uppercase">{req.unidade}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {req.status === 'Pendente' ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => onUpdateRequestStatus(req.id, 'Aprovado')} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" title="Aprovar"><CheckCircle className="w-5 h-5" /></button>
                              <button onClick={() => onUpdateRequestStatus(req.id, 'Recusado')} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all" title="Recusar"><XCircle className="w-5 h-5" /></button>
                            </div>
                          ) : (
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${req.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                              {req.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
