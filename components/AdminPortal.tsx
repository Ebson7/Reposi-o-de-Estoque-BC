import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Users, 
  Settings, 
  Download, 
  Database, 
  Trash2, 
  Clock, 
  Check, 
  MessageSquare, 
  Loader2, 
  Link as LinkIcon, 
  FileText, 
  ClipboardCheck, 
  Plus, 
  Phone, 
  Layers,
  ChevronDown,
  ChevronUp,
  List
} from 'lucide-react';
import { StockRequest, WhatsAppConfig, CatalogMeta } from '../types';
import { api } from '../api';

interface AdminPortalProps {
  requests: StockRequest[];
  vendedores: string[];
  whatsappConfig: WhatsAppConfig;
  catalogMeta: CatalogMeta;
  onUpdateRequestStatus: (id: string, status: 'Pendente' | 'Aprovado' | 'Recusado', resposta?: string) => Promise<void>;
  onUpdateOrderGroupStatus?: (pedidoId: string, status: 'Aprovado' | 'Recusado' | 'Pendente', respostaAdmin?: string) => Promise<any>;
  onDeleteRequest: (id: string) => Promise<void>;
  onDeleteOrderGroup?: (pedidoId: string) => Promise<any>;
  onClearAllRequests: () => Promise<void>;
  onAddVendedor: (name: string) => Promise<void>;
  onRemoveVendedor: (name: string) => Promise<void>;
  onUpdateWhatsApp: (config: Partial<WhatsAppConfig>) => Promise<void>;
  onBatchUploaded: (count: number, meta: CatalogMeta) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  requests,
  vendedores,
  whatsappConfig,
  catalogMeta,
  onUpdateRequestStatus,
  onUpdateOrderGroupStatus,
  onDeleteRequest,
  onDeleteOrderGroup,
  onClearAllRequests,
  onAddVendedor,
  onRemoveVendedor,
  onUpdateWhatsApp,
  onBatchUploaded
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'requests' | 'vendedores' | 'config'>('upload');

  // Upload States
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'idle'; message: string }>({ type: 'idle', message: '' });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paste Text from Excel
  const [pasteText, setPasteText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);

  // Sync URL State
  const [sheetUrl, setSheetUrl] = useState(catalogMeta.syncUrl || '');
  const [isSyncingUrl, setIsSyncingUrl] = useState(false);

  // Requests Tab Filter
  const [requestFilter, setRequestFilter] = useState<'Todos' | 'Pendente' | 'Aprovado' | 'Recusado'>('Pendente');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respostaTexto, setRespostaTexto] = useState('');

  // Vendedores Tab
  const [newVendorName, setNewVendorName] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');

  // WhatsApp Config
  const [waNumber, setWaNumber] = useState(whatsappConfig.phoneNumber);
  const [isSavingWa, setIsSavingWa] = useState(false);
  const [waSavedSuccess, setWaSavedSuccess] = useState(false);

  // View Mode for Requests tab
  const [adminViewMode, setAdminViewMode] = useState<'grouped' | 'individual'>('grouped');
  const [expandedAdminOrders, setExpandedAdminOrders] = useState<Record<string, boolean>>({});

  // ==========================================
  // CARGA EM LOTE VIA ARQUIVO (CSV / TSV / TXT)
  // ==========================================
  const handleFileProcess = async (file: File) => {
    if (!file) return;
    setIsProcessingBatch(true);
    setUploadStatus({ type: 'idle', message: '' });

    try {
      const text = await file.text();
      if (!text || text.trim().length === 0) {
        throw new Error("O arquivo selecionado está vazio.");
      }

      const res = await api.uploadBatch(text, file.name);
      setUploadStatus({
        type: 'success',
        message: `Sucesso: ${res.count.toLocaleString('pt-BR')} produtos importados e sincronizados em tempo real!`
      });
      onBatchUploaded(res.count, res.meta);
    } catch (err: any) {
      console.error("Erro na carga em lote:", err);
      setUploadStatus({
        type: 'error',
        message: err.message || "Erro ao processar o arquivo. Verifique se o formato é CSV/TSV válido."
      });
    } finally {
      setIsProcessingBatch(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Carga colada diretamente do Excel
  const handleProcessPastedText = async () => {
    if (!pasteText.trim()) return;
    setIsProcessingBatch(true);
    setUploadStatus({ type: 'idle', message: '' });

    try {
      const res = await api.uploadBatch(pasteText, "Colado do Excel");
      setUploadStatus({
        type: 'success',
        message: `Sucesso: ${res.count.toLocaleString('pt-BR')} produtos colados e importados com sucesso!`
      });
      setPasteText('');
      setShowPasteBox(false);
      onBatchUploaded(res.count, res.meta);
    } catch (err: any) {
      setUploadStatus({
        type: 'error',
        message: err.message || "Erro ao processar os dados colados."
      });
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Sincronização via link pelo servidor
  const handleSyncUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;

    setIsSyncingUrl(true);
    setUploadStatus({ type: 'idle', message: '' });

    try {
      const res = await api.syncFromUrl(sheetUrl.trim());
      setUploadStatus({
        type: 'success',
        message: `Sucesso: ${res.count.toLocaleString('pt-BR')} produtos sincronizados pelo link!`
      });
      onBatchUploaded(res.count, res.meta);
    } catch (err: any) {
      setUploadStatus({
        type: 'error',
        message: err.message || "Falha ao sincronizar link. Verifique se a planilha está pública."
      });
    } finally {
      setIsSyncingUrl(false);
    }
  };

  // Salvar WhatsApp
  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWa(true);
    try {
      await onUpdateWhatsApp({ phoneNumber: waNumber });
      setWaSavedSuccess(true);
      setTimeout(() => setWaSavedSuccess(false), 2500);
    } catch (err) {
      alert("Erro ao salvar número");
    } finally {
      setIsSavingWa(false);
    }
  };

  // Adicionar Vendedor
  const handleAddVendedorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;
    try {
      await onAddVendedor(newVendorName);
      setNewVendorName('');
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar vendedor");
    }
  };

  // Enviar feedback ao vendedor pelo WhatsApp
  const handleNotifyVendorWhatsApp = (req: StockRequest) => {
    const statusText = req.status === 'Aprovado' ? '✅ APROVADA' : '❌ NÃO APROVADA';
    const msg = encodeURIComponent(`*RETORNO DE SOLICITAÇÃO - BORACÉIA*
Olá *${req.solicitante}*, sua solicitação para o item:
📦 *${req.productName}* (Cód: ${req.productCode})
📊 *Quantidade:* ${req.quantidade} ${req.unidade}

📌 *Status:* ${statusText}
${req.respostaAdmin ? `📝 *Observação da Expedição:* ${req.respostaAdmin}` : ''}`);

    const phone = whatsappConfig.phoneNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const filteredRequests = requests.filter(r => {
    if (requestFilter === 'Todos') return true;
    return r.status === requestFilter;
  });

  const adminOrderGroups = useMemo(() => {
    const map = new Map<string, StockRequest[]>();
    filteredRequests.forEach(req => {
      const key = req.pedidoId || `single_${req.id}`;
      const list = map.get(key) || [];
      list.push(req);
      map.set(key, list);
    });

    const groups: Array<{
      pedidoId: string;
      pedidoNumero: string;
      solicitante: string;
      dataSolicitacao: string;
      tipoGeral?: string;
      observacoesGerais?: string;
      items: StockRequest[];
      totalVolumes: number;
      status: 'Pendente' | 'Aprovado' | 'Recusado' | 'Parcial';
    }> = [];

    map.forEach(items => {
      const first = items[0];
      const pedidoNumero = first.pedidoNumero || (first.pedidoId ? `PED-${first.pedidoId.slice(-6)}` : `SOL-${first.id.slice(-6)}`);
      const totalVolumes = items.reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0);

      const allApproved = items.every(it => it.status === 'Aprovado');
      const allRefused = items.every(it => it.status === 'Recusado');
      const allPending = items.every(it => it.status === 'Pendente');

      let status: 'Pendente' | 'Aprovado' | 'Recusado' | 'Parcial' = 'Pendente';
      if (allApproved) status = 'Aprovado';
      else if (allRefused) status = 'Recusado';
      else if (allPending) status = 'Pendente';
      else status = 'Parcial';

      groups.push({
        pedidoId: first.pedidoId || first.id,
        pedidoNumero,
        solicitante: first.solicitante,
        dataSolicitacao: first.dataSolicitacao,
        tipoGeral: first.tipo,
        observacoesGerais: first.observacoes,
        items,
        totalVolumes,
        status
      });
    });

    return groups.sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime());
  }, [filteredRequests]);

  const toggleAdminOrderExpand = (pedidoId: string) => {
    setExpandedAdminOrders(prev => ({
      ...prev,
      [pedidoId]: !prev[pedidoId]
    }));
  };

  const handleApproveWholeOrder = async (pedidoId: string) => {
    if (onUpdateOrderGroupStatus) {
      await onUpdateOrderGroupStatus(pedidoId, 'Aprovado');
    } else {
      const group = adminOrderGroups.find(g => g.pedidoId === pedidoId);
      if (group) {
        for (const it of group.items) {
          await onUpdateRequestStatus(it.id, 'Aprovado');
        }
      }
    }
  };

  const handleRefuseWholeOrder = async (pedidoId: string) => {
    const motivo = prompt("Motivo da recusa do pedido (opcional):", "Sem saldo disponível no momento");
    if (onUpdateOrderGroupStatus) {
      await onUpdateOrderGroupStatus(pedidoId, 'Recusado', motivo || undefined);
    } else {
      const group = adminOrderGroups.find(g => g.pedidoId === pedidoId);
      if (group) {
        for (const it of group.items) {
          await onUpdateRequestStatus(it.id, 'Recusado', motivo || undefined);
        }
      }
    }
  };

  const handleNotifyOrderWhatsApp = (group: typeof adminOrderGroups[0]) => {
    const statusText = group.status === 'Aprovado' ? '✅ APROVADO' : group.status === 'Recusado' ? '❌ NÃO APROVADO' : '📋 ' + group.status.toUpperCase();
    let msg = `*RETORNO DE PEDIDO DE ESTOQUE - BORACÉIA*\n`;
    msg += `Olá *${group.solicitante}*,\n`;
    msg += `Seu pedido *#${group.pedidoNumero}* está: *${statusText}*\n\n`;
    msg += `*Itens (${group.items.length} produtos / ${group.totalVolumes} volumes):*\n`;
    group.items.forEach((it, idx) => {
      msg += `${idx + 1}) [${it.productCode}] ${it.productName} (${it.quantidade} ${it.unidade}) - Status: ${it.status}\n`;
      if (it.respostaAdmin) msg += `   Obs: ${it.respostaAdmin}\n`;
    });
    const phone = whatsappConfig.phoneNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredVendors = vendedores.filter(v => 
    v.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveSubTab('upload')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeSubTab === 'upload'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Carga em Lote (8.000+ Linhas)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('requests')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeSubTab === 'requests'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Mural de Solicitações</span>
          {requests.filter(r => r.status === 'Pendente').length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-white">
              {requests.filter(r => r.status === 'Pendente').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('vendedores')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeSubTab === 'vendedores'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Equipe de Vendedores ({vendedores.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('config')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeSubTab === 'config'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações</span>
        </button>
      </div>

      {/* ==========================================
          TAB 1: CARGA EM LOTE (A SOLUÇÃO DEFINITIVA)
          ========================================== */}
      {activeSubTab === 'upload' && (
        <div className="space-y-6">
          
          {/* Status Alert Banner */}
          {uploadStatus.message && (
            <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
              uploadStatus.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}>
              {uploadStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="text-sm font-semibold">{uploadStatus.message}</div>
            </div>
          )}

          {/* Current Catalog KPI Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Produtos Ativos</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {catalogMeta.totalProducts.toLocaleString('pt-BR')}
              </p>
              <span className="text-[10px] text-slate-500">Origem: {catalogMeta.sourceName || 'Arquivo'}</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Com Estoque Marsil</span>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {catalogMeta.itensComEstoqueMarsil.toLocaleString('pt-BR')}
              </p>
              <span className="text-[10px] text-slate-500">Itens com saldo &gt; 0</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Com Estoque Boracéia</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {catalogMeta.itensComEstoqueBoraceia.toLocaleString('pt-BR')}
              </p>
              <span className="text-[10px] text-slate-500">Prontos p/ venda</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-100 dark:border-rose-900/40">
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">Itens Zerados</span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {catalogMeta.itensZerados.toLocaleString('pt-BR')}
              </p>
              <span className="text-[10px] text-slate-500">Sem saldo em ambas</span>
            </div>
          </div>

          {/* Direct File Drag & Drop Zone */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  1. Upload Direto do Arquivo (Recomendado para 8.000+ Linhas)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Arraste ou selecione o arquivo CSV/TSV gerado pelo seu ERP ou planilha. Processamento ultra-rápido no servidor.
                </p>
              </div>

              <a
                href="/api/products/export"
                download
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Catálogo Atual (CSV)</span>
              </a>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                dragOver 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />

              {isProcessingBatch ? (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
                  <p className="font-bold text-base text-slate-900 dark:text-white">Processando mais de 8.000 linhas...</p>
                  <p className="text-xs text-slate-500">Calculando diferenças e sincronizando em tempo real com todos os vendedores.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-bold text-base text-slate-900 dark:text-white">
                      Arraste seu arquivo CSV ou clique para selecionar
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Formatos aceitos: <strong>.csv</strong>, <strong>.tsv</strong> ou <strong>.txt</strong> delimitado por vírgula, ponto-e-vírgula ou tabulação.
                    </p>
                  </div>
                  <span className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors">
                    Escolher Arquivo do Computador
                  </span>
                </div>
              )}
            </div>

            {/* Quick Helper on Columns */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>Cabeçalhos reconhecidos automaticamente: <strong>Código</strong>, <strong>Produto</strong>, <strong>Fornecedor</strong>, <strong>Estoque Marsil</strong>, <strong>Estoque Boraceia</strong>, <strong>Situação</strong>.</span>
            </div>
          </div>

          {/* Alternative 2: Paste from Excel */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  2. Colar Diretamente do Excel (Ctrl+C e Ctrl+V)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Copie as linhas diretamente da sua planilha aberta no Excel e cole aqui.
                </p>
              </div>

              <button
                onClick={() => setShowPasteBox(!showPasteBox)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                {showPasteBox ? 'Recolher' : 'Abrir Caixa de Texto'}
              </button>
            </div>

            {showPasteBox && (
              <div className="space-y-3 pt-2">
                <textarea
                  rows={6}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Selecione tudo no Excel (Ctrl+A), copie (Ctrl+C) e cole aqui com o cabeçalho..."
                  className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleProcessPastedText}
                    disabled={isProcessingBatch || !pasteText.trim()}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-2 transition-colors"
                  >
                    {isProcessingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>Processar Dados Colados</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Alternative 3: Server-Side Sync URL */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                3. Sincronização por Link (Executada pelo Servidor)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                O backend baixa a planilha sem restrições de CORS do navegador.
              </p>
            </div>

            <form onSubmit={handleSyncUrl} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isSyncingUrl || !sheetUrl.trim()}
                className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white disabled:opacity-50 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-sm"
              >
                {isSyncingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Sincronizar Link</span>
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ==========================================
          TAB 2: MURAL DE SOLICITAÇÕES
          ========================================== */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          
          {/* Request Status Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              {(['Pendente', 'Aprovado', 'Recusado', 'Todos'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setRequestFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    requestFilter === st
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st === 'Todos' ? 'Todas' : `${st}s`} ({
                    st === 'Todos' ? requests.length : requests.filter(r => r.status === st).length
                  })
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setAdminViewMode('grouped')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  adminViewMode === 'grouped'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Por Pedido ({adminOrderGroups.length})</span>
              </button>
              <button
                onClick={() => setAdminViewMode('individual')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  adminViewMode === 'individual'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Itens Individuais ({filteredRequests.length})</span>
              </button>
            </div>

            {requests.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Tem certeza de que deseja limpar todo o histórico de solicitações?")) {
                    onClearAllRequests();
                  }
                }}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
              >
                Limpar Histórico
              </button>
            )}
          </div>

          {/* RENDER: GROUPED BY ORDER */}
          {adminViewMode === 'grouped' ? (
            <div className="space-y-4">
              {adminOrderGroups.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <ClipboardCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                    Nenhum pedido {requestFilter !== 'Todos' ? `com status ${requestFilter}` : ''}
                  </p>
                </div>
              ) : (
                adminOrderGroups.map(group => {
                  const isExpanded = expandedAdminOrders[group.pedidoId] ?? true;

                  return (
                    <div
                      key={group.pedidoId}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0 transition-all"
                    >
                      {/* Order Header */}
                      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                            <span className="font-mono text-xs font-black px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg">
                              #{group.pedidoNumero}
                            </span>
                            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                              Pedido com {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                            </span>
                            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                              {group.totalVolumes} volumes
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-slate-500">
                            <span>Vendedor: <strong className="text-slate-700 dark:text-slate-300">{group.solicitante}</strong></span>
                            <span>•</span>
                            <span>{new Date(group.dataSolicitacao).toLocaleString('pt-BR')}</span>
                            {group.tipoGeral && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">{group.tipoGeral}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 self-start sm:self-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            group.status === 'Aprovado'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : group.status === 'Recusado'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : group.status === 'Parcial'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {group.status}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleAdminOrderExpand(group.pedidoId)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={isExpanded ? 'Recolher itens' : 'Expandir itens'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Optional General Notes */}
                      {group.observacoesGerais && (
                        <div className="px-4 py-2 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-slate-700 dark:text-slate-300 border-b border-amber-100 dark:border-amber-900/30">
                          <strong>Observação Geral do Pedido:</strong> {group.observacoesGerais}
                        </div>
                      )}

                      {/* Items List */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {group.items.map((item, idx) => (
                            <div
                              key={item.id}
                              className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                            >
                              <div className="flex items-start space-x-3">
                                <span className="font-mono text-slate-400 font-bold mt-0.5">
                                  {idx + 1}.
                                </span>
                                <div>
                                  <div className="flex items-center space-x-2 flex-wrap">
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                      #{item.productCode}
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {item.productName}
                                    </span>
                                    {item.productSabor && (
                                      <span className="text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[11px]">
                                        {item.productSabor}
                                      </span>
                                    )}
                                    {item.isValidadeCurta && (
                                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                                        Validade Curta
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                                    <span>Marsil: {item.estoqueMarsilMomento ?? '-'}</span>
                                    <span>•</span>
                                    <span>Boracéia: {item.estoqueBoraceiaMomento ?? '-'}</span>
                                    {item.observacoes && (
                                      <>
                                        <span>•</span>
                                        <span>Obs: {item.observacoes}</span>
                                      </>
                                    )}
                                  </div>

                                  {item.respostaAdmin && (
                                    <div className="mt-1 text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-1.5 rounded">
                                      <strong>Resposta:</strong> {item.respostaAdmin}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0">
                                <div className="text-right">
                                  <span className="font-black text-sm text-slate-900 dark:text-white">
                                    {item.quantidade} {item.unidade}
                                  </span>
                                  <span className="block text-[10px] text-slate-400 font-medium">
                                    {item.tipo}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-1.5">
                                  <button
                                    onClick={() => onUpdateRequestStatus(item.id, 'Aprovado')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                                      item.status === 'Aprovado'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                    title="Aprovar este item"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      const motivo = prompt("Motivo da recusa do item:", "Sem saldo disponível");
                                      onUpdateRequestStatus(item.id, 'Recusado', motivo || undefined);
                                    }}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                                      item.status === 'Recusado'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                    title="Recusar este item"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Order Batch Actions Footer */}
                      <div className="p-3.5 sm:px-5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <button
                            onClick={() => handleApproveWholeOrder(group.pedidoId)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aprovar Pedido Completo ({group.items.length} itens)</span>
                          </button>

                          <button
                            onClick={() => handleRefuseWholeOrder(group.pedidoId)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Recusar Pedido</span>
                          </button>

                          <button
                            onClick={() => handleNotifyOrderWhatsApp(group)}
                            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Notificar WhatsApp</span>
                          </button>
                        </div>

                        {onDeleteOrderGroup && (
                          <button
                            onClick={() => {
                              if (confirm(`Excluir o pedido #${group.pedidoNumero} do sistema?`)) {
                                onDeleteOrderGroup(group.pedidoId);
                              }
                            }}
                            title="Excluir pedido completo"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors flex items-center space-x-1 text-xs"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Excluir Pedido</span>
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          ) : (

            /* RENDER: INDIVIDUAL ITEMS (FLAT LIST) */
            <div className="space-y-3">
              {filteredRequests.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <ClipboardCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                    Nenhuma solicitação {requestFilter !== 'Todos' ? `com status ${requestFilter}` : ''}
                  </p>
                </div>
              ) : (
                filteredRequests.map(req => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          {req.pedidoNumero && (
                            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              #{req.pedidoNumero}
                            </span>
                          )}
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                            CÓD: {req.productCode}
                          </span>
                          <span className="font-bold text-base text-slate-900 dark:text-white">
                            {req.productName}
                          </span>
                          {req.productSabor && (
                            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {req.productSabor}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                          <span>Vendedor: <strong className="text-slate-700 dark:text-slate-300">{req.solicitante}</strong></span>
                          <span>•</span>
                          <span>{new Date(req.dataSolicitacao).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          req.status === 'Aprovado'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : req.status === 'Recusado'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    </div>

                    {/* Quantity & Type Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Quantidade</span>
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {req.quantidade} {req.unidade}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Tipo</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">{req.tipo}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Estoque no Momento</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">
                          M: {req.estoqueMarsilMomento ?? '-'} | B: {req.estoqueBoraceiaMomento ?? '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Validade Curta</span>
                        <span className={req.isValidadeCurta ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                          {req.isValidadeCurta ? 'Sim (Atenção)' : 'Não'}
                        </span>
                      </div>
                    </div>

                    {req.observacoes && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50/70 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/40">
                        <strong>Obs do Vendedor:</strong> {req.observacoes}
                      </div>
                    )}

                    {req.respostaAdmin && (
                      <div className="text-xs text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-200/50">
                        <strong>Resposta da Expedição:</strong> {req.respostaAdmin}
                      </div>
                    )}

                    {/* Admin Decision Actions */}
                    <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onUpdateRequestStatus(req.id, 'Aprovado')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aprovar Solicitação</span>
                        </button>

                        <button
                          onClick={() => {
                            const motivo = prompt("Motivo da recusa (opcional):", "Sem saldo disponível no momento");
                            onUpdateRequestStatus(req.id, 'Recusado', motivo || undefined);
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Recusar</span>
                        </button>

                        <button
                          onClick={() => handleNotifyVendorWhatsApp(req)}
                          className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Notificar Vendedor WhatsApp</span>
                        </button>
                      </div>

                      <button
                        onClick={() => onDeleteRequest(req.id)}
                        title="Excluir do sistema"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      )}

      {/* ==========================================
          TAB 3: EQUIPE DE VENDEDORES
          ========================================== */}
      {activeSubTab === 'vendedores' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Vendedores Cadastrados ({vendedores.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Os nomes aqui configurados aparecem no menu de solicitação dos representantes.
              </p>
            </div>

            {/* Fast filter */}
            <input
              type="text"
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              placeholder="Filtrar vendedor..."
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Add Vendor Form */}
          <form onSubmit={handleAddVendedorSubmit} className="flex gap-2">
            <input
              type="text"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              placeholder="Nome do novo vendedor (Ex: MARCOS PAULO)..."
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newVendorName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </form>

          {/* Vendor Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {filteredVendors.map(v => (
              <div
                key={v}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <span>{v}</span>
                {v !== 'OUTRO' && (
                  <button
                    onClick={() => {
                      if (confirm(`Remover o vendedor "${v}"?`)) {
                        onRemoveVendedor(v);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ==========================================
          TAB 4: CONFIGURAÇÕES GERAIS
          ========================================== */}
      {activeSubTab === 'config' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Configurações de Notificação WhatsApp
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina o número da expedição/gerência que receberá as mensagens formatadas de solicitação de estoque.
            </p>
          </div>

          <form onSubmit={handleSaveWhatsApp} className="max-w-md space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Número de Destino (com DDD)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  placeholder="Ex: 5511999999999"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Formato internacional com DDI: Ex: 55 (Brasil) + DDD + Telefone (ex: 5511987654321)
              </span>
            </div>

            {waSavedSuccess && (
              <div className="text-xs text-emerald-600 font-bold flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Configurações salvas no Firebase Firestore com sucesso!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingWa}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              {isSavingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Salvar no Firebase</span>
            </button>
          </form>

          {/* Status do Banco de Dados Firebase */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Armazenamento em Nuvem (Firebase Cloud Firestore)
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Banco de Dados Firestore Conectado e Ativo
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Todas as solicitações de transferência, pedidos agrupados, lista de vendedores e configurações ficam gravadas permanentemente na nuvem Google Firebase Firestore. Os pedidos atualizam instantaneamente em tempo real entre todos os celulares dos vendedores e computadores da expedição.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
